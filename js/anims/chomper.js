// Retro arcade maze: a hungry yellow chomper munches a long snaking trail of dots.
// Progress = how far along the dot trail it has eaten. At the end a ghost in a bib is waiting with cutlery.
Minutka.register({
  id: 'chomper',
  name: 'Dot Muncher',
  emoji: '🟡',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;

    // Finale timeline (seconds after time-up), shared by the drawing and the sound.
    const TL = { lunge: 0.25, vanish: 1.0, shrivelEnd: 2.45, poofEnd: 2.9, gameOver: 3.1, dance: 4.3 };

    // Tiny 5x7 bitmap font, only the letters we need.
    const FONT = {
      A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
      C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
      E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
      G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
      H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
      I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
      M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
      N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
      O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
      R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
      S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
      T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
      U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
      V: ['10001', '10001', '01010', '01010', '01010', '00100', '00100'],
      Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
      '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
    };
    const chaserColors = ['#ffb8ff', '#00e5ff', '#ffb852'];

    let D = null, key = '';
    let freezeT = -1;

    // ------------------------------------------------------------ geometry
    // A rectilinear serpentine corridor with filleted corners; segments are lines and quarter arcs.
    function build() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const mx = Math.max(10, 36 * s), my = Math.max(16, 40 * s);
      const rows = Math.max(3, Math.round((H - 2 * my) / (W * 0.33)));
      const rs = (H - 2 * my) / rows;
      const cw = Math.min(rs * 0.6, W * 0.18);
      const wall = Math.max(2, cw * 0.07);
      const xL = mx + cw / 2 + wall, xR = W - mx - cw / 2 - wall;
      const rc = cw * 0.55;

      const pts = [[xL, my + rs * 0.5]];
      for (let i = 0; i < rows; i++) {
        const y = my + rs * (i + 0.5);
        const right = i % 2 === 0, last = i === rows - 1;
        const x = last ? (right ? W - mx - 2.2 * cw : mx + 2.2 * cw) : (right ? xR : xL);
        pts.push([x, y]);
        if (!last) pts.push([x, y + rs]);
      }

      const segs = [];
      const line = (a, b) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        segs.push({ arc: false, x0: a[0], y0: a[1], x1: b[0], y1: b[1], len, ux: (b[0] - a[0]) / len, uy: (b[1] - a[1]) / len });
      };
      let cur = pts[0];
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k];
        const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const u = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1];
        if (k < pts.length - 1) {
          const c = pts[k + 1];
          const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
          const v = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
          const end = [b[0] - u[0] * rc, b[1] - u[1] * rc];
          line(cur, end);
          const cx = end[0] + v[0] * rc, cy = end[1] + v[1] * rc;
          const dir = Math.sign(u[0] * v[1] - u[1] * v[0]);
          segs.push({ arc: true, cx, cy, r: rc, a0: Math.atan2(end[1] - cy, end[0] - cx), dir, len: rc * Math.PI / 2 });
          cur = [b[0] + v[0] * rc, b[1] + v[1] * rc];
        } else line(cur, b);
      }
      const L = segs.reduce((a, q) => a + q.len, 0);
      D = { W, H, s, cw, wall, rows, segs, L, cr: cw * 0.44, gr: cw * 0.43 };

      // dots, with two power pellets and a cherry swapped in
      const n = Math.max(12, Math.round(L / (cw * 0.5)));
      const pel = [Math.round(n * 0.24), Math.round(n * 0.62)], cherry = Math.round(n * 0.5);
      D.dots = Array.from({ length: n }, (_, i) => {
        const d = (i + 0.5) * L / n;
        const q = pointAt(d);
        return { d, x: q.x, y: q.y, kind: pel.includes(i) ? 'pellet' : i === cherry ? 'cherry' : 'dot' };
      });
      D.pellets = D.dots.filter(o => o.kind === 'pellet').map(o => o.d);
      D.cherryD = D.dots[cherry].d;
    }

    // Point and heading at arc-length d (extrapolates straight beyond both ends).
    function pointAt(d) {
      const S = D.segs;
      if (d <= 0) { const q = S[0]; return { x: q.x0 + q.ux * d, y: q.y0 + q.uy * d, a: Math.atan2(q.uy, q.ux) }; }
      for (let i = 0; i < S.length; i++) {
        const q = S[i];
        if (d <= q.len || i === S.length - 1) {
          if (!q.arc) return { x: q.x0 + q.ux * d, y: q.y0 + q.uy * d, a: Math.atan2(q.uy, q.ux) };
          const an = q.a0 + q.dir * d / q.r;
          return { x: q.cx + Math.cos(an) * q.r, y: q.cy + Math.sin(an) * q.r, a: an + q.dir * Math.PI / 2 };
        }
        d -= q.len;
      }
      return { x: 0, y: 0, a: 0 };
    }

    // ------------------------------------------------------------ drawing
    function tracePath() {
      const S = D.segs;
      const st = pointAt(-D.W);
      g.beginPath();
      g.moveTo(st.x, st.y);
      S.forEach(q => {
        if (q.arc) g.arc(q.cx, q.cy, q.r, q.a0, q.a0 + q.dir * Math.PI / 2, q.dir < 0);
        else g.lineTo(q.x1, q.y1);
      });
      const en = pointAt(D.L + D.cw * 1.6);
      g.lineTo(en.x, en.y);
    }

    function maze(p, ta) {
      g.fillStyle = '#05051a';
      g.fillRect(0, 0, D.W, D.H);
      const k = U.range(p, 0.85, 1) * (0.5 + 0.5 * Math.sin(ta * 7));
      const hue = U.lerp(232, 345, k);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      tracePath();
      g.strokeStyle = `hsla(${hue}, 100%, 60%, 0.16)`;
      g.lineWidth = D.cw + D.wall * 6;
      g.stroke();
      g.strokeStyle = `hsl(${hue}, 100%, 62%)`;
      g.lineWidth = D.cw + D.wall * 2;
      g.stroke();
      g.strokeStyle = '#000';
      g.lineWidth = D.cw;
      g.stroke();
    }

    function cherry(x, y, r, ta) {
      g.save();
      g.translate(x, y);
      g.rotate(Math.sin(ta * 2.2) * 0.18);
      g.strokeStyle = '#3fbf3f';
      g.lineWidth = r * 0.22;
      g.beginPath();
      g.moveTo(-r * 0.55, r * 0.3); g.quadraticCurveTo(-r * 0.2, -r * 0.6, r * 0.5, -r * 1.05);
      g.moveTo(r * 0.55, r * 0.45); g.quadraticCurveTo(r * 0.5, -r * 0.3, r * 0.5, -r * 1.05);
      g.stroke();
      g.fillStyle = '#ff1f3a';
      g.beginPath(); g.arc(-r * 0.55, r * 0.45, r * 0.55, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(r * 0.55, r * 0.6, r * 0.55, 0, U.TAU); g.fill();
      g.fillStyle = '#fff';
      g.fillRect(-r * 0.8, r * 0.2, r * 0.2, r * 0.2);
      g.fillRect(r * 0.3, r * 0.35, r * 0.2, r * 0.2);
      g.restore();
    }

    function dots(dC, ta) {
      const ds = Math.max(5, D.cw * 0.25);
      g.fillStyle = '#ffc9b8';
      D.dots.forEach(o => {
        if (o.d < dC || o.kind !== 'dot') return;
        g.fillRect(o.x - ds / 2, o.y - ds / 2, ds, ds);
      });
      D.dots.forEach(o => {
        if (o.d < dC) return;
        if (o.kind === 'pellet') {
          const on = Math.floor(ta * 3.5) % 2 === 0;
          g.fillStyle = on ? '#ffd9cc' : '#c98f80';
          g.beginPath(); g.arc(o.x, o.y, D.cw * (on ? 0.25 : 0.2), 0, U.TAU); g.fill();
        } else if (o.kind === 'cherry') cherry(o.x, o.y, D.cw * 0.3, ta);
      });
    }

    function pixText(str, cx, cy, px, color, shadow, offs) {
      const wu = str.length * 6 - 1;
      const x0 = cx - wu * px / 2, y0 = cy - 3.5 * px;
      const pass = (col, dx, dy) => {
        g.fillStyle = col;
        for (let i = 0; i < str.length; i++) {
          const gl = FONT[str[i]];
          if (!gl) continue;
          const oy = offs ? offs(i) : 0;
          if (oy == null) continue;
          for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 5; c++) {
              if (gl[r][c] === '1') g.fillRect(x0 + (i * 6 + c) * px + dx, y0 + r * px + oy + dy, px + 0.6, px + 0.6);
            }
          }
        }
      };
      if (shadow) pass(shadow, px * 0.5, px * 0.5);
      pass(color, 0, 0);
    }

    function bubble(x, y, str, px) {
      const w = (str.length * 6 - 1) * px + px * 6, h = 13 * px;
      const bx = U.clamp(x, w / 2 + 4, D.W - w / 2 - 4);
      const by = Math.max(h / 2 + 4, y - h / 2);
      g.fillStyle = '#fff';
      g.beginPath();
      g.roundRect(bx - w / 2, by - h / 2, w, h, px * 2);
      g.fill();
      g.beginPath();
      g.moveTo(x - px * 2, by + h / 2 - 1); g.lineTo(x + px * 2, by + h / 2 - 1); g.lineTo(x, by + h / 2 + px * 4);
      g.fill();
      pixText(str, bx, by, px, '#111');
    }

    // Classic ghost. mode: 0 normal, 1 frightened (blue), 2 frightened blinking white.
    function ghost(x, y, r, color, ta, ph, lx, ly, mode) {
      y += Math.sin(ta * 4 + ph) * r * 0.08;
      const body = mode === 1 ? '#2a2aff' : mode === 2 ? '#f4f4ff' : color;
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(x - r, y + r * 0.9);
      g.lineTo(x - r, y);
      g.arc(x, y, r, Math.PI, 0);
      g.lineTo(x + r, y + r * 0.9);
      const f = Math.floor(ta * 7 + ph) % 2;
      for (let j = 1; j <= 8; j++) {
        g.lineTo(x + r - j * r / 4, y + r * 0.9 - ((j + f) % 2) * r * 0.3);
      }
      g.closePath();
      g.fill();
      if (mode) {
        const fc = mode === 1 ? '#ffd0c0' : '#ff2020';
        g.fillStyle = fc;
        g.fillRect(x - r * 0.42, y - r * 0.25, r * 0.24, r * 0.24);
        g.fillRect(x + r * 0.18, y - r * 0.25, r * 0.24, r * 0.24);
        g.strokeStyle = fc;
        g.lineWidth = r * 0.1;
        g.beginPath();
        for (let j = 0; j <= 6; j++) g.lineTo(x - r * 0.6 + j * r * 0.2, y + r * 0.35 + (j % 2 ? -r * 0.12 : 0));
        g.stroke();
        return;
      }
      [-1, 1].forEach(sd => {
        const ex = x + sd * r * 0.38, ey = y - r * 0.12;
        g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(ex, ey, r * 0.27, r * 0.35, 0, 0, U.TAU); g.fill();
        g.fillStyle = '#2121de';
        g.beginPath(); g.arc(ex + lx * r * 0.13, ey + ly * r * 0.16, r * 0.15, 0, U.TAU); g.fill();
      });
    }

    // The ghost waiting at the end of the trail: bib, fork and knife, licking its lips.
    function bossGhost(x, y, r, ta, hunger, lx, ly, gotcha) {
      // cutlery drumming on either side
      const tap = Math.abs(Math.sin(ta * (3 + hunger * 9))) * r * 0.35 * (0.3 + hunger);
      g.fillStyle = '#d9dee8';
      g.fillRect(x - r * 1.45, y - r * 0.55 - tap, r * 0.12, r * 1.2);
      g.beginPath(); g.roundRect(x - r * 1.5, y - r * 1.15 - tap, r * 0.22, r * 0.7, [r * 0.15, r * 0.15, 0, 0]); g.fill();
      const tap2 = Math.abs(Math.sin(ta * (3 + hunger * 9) + 1.6)) * r * 0.35 * (0.3 + hunger);
      g.fillRect(x + r * 1.33, y - r * 0.55 - tap2, r * 0.12, r * 1.2);
      for (let k = 0; k < 3; k++) g.fillRect(x + r * 1.22 + k * r * 0.13, y - r * 1.05 - tap2, r * 0.07, r * 0.45);
      g.fillRect(x + r * 1.22, y - r * 0.65 - tap2, r * 0.34, r * 0.1);

      ghost(x, y, r, '#ff2a2a', ta, 0.7, lx, ly, 0);
      const by = y + Math.sin(ta * 4 + 0.7) * r * 0.08;
      // angry brows
      g.strokeStyle = '#5a0000';
      g.lineWidth = r * 0.12;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - r * 0.68, by - r * 0.62); g.lineTo(x - r * 0.15, by - r * 0.45 - hunger * r * 0.08);
      g.moveTo(x + r * 0.68, by - r * 0.62); g.lineTo(x + r * 0.15, by - r * 0.45 - hunger * r * 0.08);
      g.stroke();
      // bib
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(x - r * 0.55, by + r * 0.42); g.lineTo(x + r * 0.55, by + r * 0.42); g.lineTo(x, by + r * 1.05);
      g.fill();
      g.fillStyle = '#ff2a2a';
      [[-0.22, 0.55], [0.18, 0.6], [0, 0.82]].forEach(([dx, dy]) => g.fillRect(x + dx * r, by + dy * r, r * 0.1, r * 0.1));
      // mouth with tongue
      const mw = r * (0.35 + hunger * 0.25 + (gotcha ? 0.2 : 0));
      g.fillStyle = '#3a0010';
      g.beginPath(); g.ellipse(x, by + r * 0.3, mw, r * (0.08 + hunger * 0.1 + (gotcha ? 0.15 : 0)), 0, 0, U.TAU); g.fill();
      if (hunger > 0.05) {
        g.fillStyle = '#ff7aa8';
        g.beginPath(); g.arc(x + Math.sin(ta * 5) * mw * 0.6, by + r * 0.3, r * 0.1 + hunger * r * 0.06, 0, U.TAU); g.fill();
      }
      // drool
      if (hunger > 0.4) {
        const dl = (0.5 + 0.5 * Math.sin(ta * 2.3)) * r * 0.5 * hunger;
        g.fillStyle = '#9fe8ff';
        g.fillRect(x + mw * 0.7, by + r * 0.32, r * 0.08, dl);
        g.beginPath(); g.arc(x + mw * 0.7 + r * 0.04, by + r * 0.32 + dl, r * 0.08, 0, U.TAU); g.fill();
      }
    }

    function chomperBody(x, y, r, heading, mouth, worry, scared) {
      g.save();
      g.translate(x, y);
      if (Math.cos(heading) < -0.1) { g.scale(-1, 1); g.rotate(Math.PI - heading); } else g.rotate(heading);
      const m = Math.min(mouth, Math.PI - 0.01);
      g.fillStyle = '#ffe600';
      g.beginPath();
      g.moveTo(-r * 0.12, 0);
      g.arc(0, 0, r, m, U.TAU - m);
      g.closePath();
      g.fill();
      if (m < 1.55) {
        if (scared) {
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(-r * 0.08, -r * 0.5, r * 0.22, 0, U.TAU); g.fill();
          g.fillStyle = '#111';
          g.beginPath(); g.arc(-r * 0.05, -r * 0.5, r * 0.08, 0, U.TAU); g.fill();
        } else {
          g.fillStyle = '#111';
          g.beginPath(); g.arc(-r * 0.05, -r * 0.52, r * 0.11, 0, U.TAU); g.fill();
        }
        if (worry > 0.05) {
          g.strokeStyle = '#7a5a00';
          g.lineWidth = r * 0.09;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(-r * 0.32, -r * 0.72 + worry * r * 0.06);
          g.lineTo(r * 0.16, -r * 0.8 - worry * r * 0.12);
          g.stroke();
        }
      }
      g.restore();
    }

    function sweat(x, y, r, heading, k, ta) {
      if (k <= 0) return;
      const back = Math.cos(heading) < -0.1 ? 1 : -1;
      g.fillStyle = `rgba(140, 230, 255, ${Math.min(1, k * 1.5)})`;
      for (let i = 0; i < 3; i++) {
        const ph = (ta * (1.2 + k) + i / 3) % 1;
        const sx = x + back * r * (0.3 + ph * 1.1) + i * r * 0.1;
        const sy = y - r * 0.85 - Math.sin(ph * Math.PI) * r * 0.7 + ph * r * 0.6;
        const dr = r * 0.2 * (1 - ph * 0.4);
        g.beginPath();
        g.moveTo(sx, sy - dr * 2);
        g.quadraticCurveTo(sx + dr, sy, sx, sy + dr);
        g.quadraticCurveTo(sx - dr, sy, sx, sy - dr * 2);
        g.fill();
      }
    }

    function angel(x, y, r, k, ta) {
      const flap = 0.5 + 0.5 * Math.sin(ta * 12);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      [-1, 1].forEach(sd => {
        g.beginPath(); g.ellipse(x + sd * r * 1.1, y - r * 0.2, r * 0.75, r * (0.25 + flap * 0.3), sd * 0.5, 0, U.TAU); g.fill();
      });
      chomperBody(x, y, r, 0, 0.1 + 0.5 * Math.abs(Math.sin(ta * 6)), 0, false);
      g.strokeStyle = '#ffe98a';
      g.lineWidth = r * 0.18;
      g.beginPath(); g.ellipse(x, y - r * 1.35, r * 0.6, r * 0.18, 0, 0, U.TAU); g.stroke();
    }

    function poof(x, y, r, k) {
      g.strokeStyle = '#ffe600';
      g.lineWidth = r * 0.14;
      g.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = i * U.TAU / 10;
        const r0 = r * (0.3 + k * 1.4), r1 = r0 + r * 0.5 * (1 - k) + r * 0.1;
        g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke();
      }
    }

    function scanlines() {
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 0; y < D.H; y += 4) g.fillRect(0, y, D.W, 1.5);
    }

    function gameOverScreen(ft, ta) {
      const W = D.W, H = D.H;
      g.fillStyle = `rgba(0,0,10,${0.62 * U.range(ft, TL.gameOver - 0.4, TL.gameOver + 0.2)})`;
      g.fillRect(0, 0, W, H);
      if (ft < TL.gameOver) return;
      const portrait = W < H;
      const lines = portrait ? ['GAME', 'OVER'] : ['GAME OVER'];
      const units = lines[0].length * 6 - 1;
      const px = Math.floor(Math.min(W * 0.84 / units, H * (portrait ? 0.11 : 0.17) / 7));
      const cy = H * (portrait ? 0.3 : 0.34);
      let idx = 0;
      lines.forEach((ln, li) => {
        const base = idx;
        const y = cy + (li - (lines.length - 1) / 2) * px * 9.5;
        pixText(ln, W / 2, y, px, '#ff2a2a', '#5a0010', i => {
          const k = U.range(ft, TL.gameOver + (base + i) * 0.07, TL.gameOver + (base + i) * 0.07 + 0.45);
          if (k <= 0) return null;
          return -(1 - U.easeOutBack(k)) * H * 0.5;
        });
        idx += ln.length;
      });
      const textBottom = cy + (lines.length / 2) * px * 9.5;

      // the ghosts come back and do a victory dance
      if (ft > TL.dance) {
        const r = D.gr * (portrait ? 0.95 : 1.1);
        const cols = [...chaserColors, '#ff2a2a'];
        const sp = Math.min(r * 3, W * 0.9 / 4);
        const gy = textBottom + (H - textBottom) * (portrait ? 0.3 : 0.38);
        cols.forEach((c, i) => {
          const k = U.easeOutBack(U.range(ft, TL.dance + i * 0.12, TL.dance + i * 0.12 + 0.4));
          if (k <= 0) return;
          const x = W / 2 + (i - 1.5) * sp + Math.sin(ta * 3 + i) * r * 0.3;
          const y = gy - Math.abs(Math.sin(ta * 6 + i * 1.3)) * r * 0.9 + (1 - k) * H * 0.5;
          if (i === 3) bossGhost(x, y, r, ta, 0.6, Math.sin(ta * 4), -0.5, true);
          else ghost(x, y, r, c, ta, i, Math.sin(ta * 4 + i), -0.6, 0);
        });
      }
      if (ft > TL.dance + 0.8 && Math.floor(ta * 2) % 2 === 0) {
        const cpx = Math.max(2, Math.floor(Math.min(W * 0.55 / 65, H * 0.05 / 7)));
        pixText('INSERT COIN', W / 2, H - Math.max(cpx * 8, H * 0.08), cpx, '#ffe600', '#5a4a00');
      }
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const k2 = cv.w + 'x' + cv.h;
        if (k2 !== key) { key = k2; build(); }
        if (ft >= 0 && freezeT < 0) freezeT = t;
        const frozen = ft >= 0 && ft < TL.vanish;
        const ta = frozen ? freezeT : t;
        const cw = D.cw, L = D.L;
        const dC = p * L;
        const danger = U.range(p, 0.6, 1);
        const shake = U.range(p, 0.88, 1) * (ft < 0 ? 1 : 0);

        maze(p, ta);
        dots(dC, ta);

        // chomper position
        const C = pointAt(dC);
        C.x += Math.sin(t * 47) * cw * 0.025 * shake;
        C.y += Math.cos(t * 39) * cw * 0.025 * shake;

        // chasing ghosts, scared for a while after a power pellet
        let fright = 0, retreat = 0;
        D.pellets.forEach(pd => {
          const since = dC - pd, win = cw * 3;
          if (since > 0 && since < win) {
            fright = Math.max(fright, 1 - since / win);
            retreat = Math.max(retreat, Math.sin(Math.PI * since / win));
          }
        });
        const lunge = ft < 0 ? 0 : U.easeOut(U.range(ft, 0, TL.lunge));
        if (ft < TL.vanish) {
          for (let k = chaserColors.length - 1; k >= 0; k--) {
            const gap = cw * (2.0 + 1.3 * k) * (1 - 0.5 * U.easeInOut(danger)) + retreat * cw * 3;
            let d = dC - gap + Math.sin(ta * 1.3 + k * 2.1) * cw * 0.35;
            d = Math.max(d, -cw * (0.95 + 1.05 * k)); // not born yet: peek out of the tunnel
            d = U.lerp(d, L - cw * (0.9 + 0.8 * k), lunge);
            const q = pointAt(d);
            const lx = C.x - q.x, ly = C.y - q.y, ll = Math.hypot(lx, ly) || 1;
            const mode = fright > 0 ? (fright < 0.3 && Math.floor(ta * 6) % 2 ? 2 : 1) : 0;
            ghost(q.x, q.y, D.gr, chaserColors[k], ta, k * 1.7, lx / ll, ly / ll, ft >= 0 ? 0 : mode);
          }
          // the waiting ghost
          const B = pointAt(L + cw * U.lerp(1.05, 0.55, lunge));
          const lx = C.x - B.x, ly = C.y - B.y, ll = Math.hypot(lx, ly) || 1;
          bossGhost(B.x, B.y, D.gr, ta, ft >= 0 ? 1 : U.range(p, 0.45, 1), lx / ll, ly / ll, ft >= 0);
          if (ft >= 0) bubble(B.x, B.y - D.gr * 3, 'GOTCHA!', Math.max(2, cw * 0.06));
          else if (p > 0.85 && Math.floor(t * 1.5) % 2 === 0) bubble(B.x, B.y - D.gr * 3, 'YUM', Math.max(2, cw * 0.06));
        }

        // the chomper itself
        if (ft < TL.shrivelEnd) {
          let heading = C.a, mouth = 0.08 + 0.72 * Math.abs(Math.sin(t * (8 + danger * 4)));
          if (ft >= 0) mouth = 0.12;
          if (ft >= TL.vanish) {
            heading = -Math.PI / 2;
            mouth = U.lerp(0.12, Math.PI, U.range(ft, TL.vanish, TL.shrivelEnd));
          }
          if (mouth < Math.PI - 0.03) chomperBody(C.x, C.y, D.cr, heading, mouth, ft >= 0 ? 1 : danger, ft >= 0 && ft < TL.vanish);
          if (ft < 0) sweat(C.x, C.y, D.cr, heading, U.range(p, 0.65, 1), t);
          if (ft >= TL.lunge && ft < TL.vanish) pixText('!', C.x, C.y - D.cr * 1.9, Math.max(2, cw * 0.07), '#fff', '#a00');
        } else if (ft < TL.poofEnd) {
          poof(C.x, C.y, D.cr, U.range(ft, TL.shrivelEnd, TL.poofEnd));
        }

        // munch text after the cherry
        const sinceCherry = dC - D.cherryD;
        if (ft < 0 && sinceCherry > 0 && sinceCherry < cw * 3) {
          const k = sinceCherry / (cw * 3);
          g.globalAlpha = 1 - k;
          pixText('NOM', C.x, C.y - D.cr * 1.6 - k * cw * 0.6, Math.max(2, cw * 0.055), '#ff7aa8', '#400');
          g.globalAlpha = 1;
        }

        if (ft >= 0) {
          gameOverScreen(ft, t);
          if (ft > TL.poofEnd) {
            const k = ft - TL.poofEnd;
            g.globalAlpha = 1 - U.range(ft, 7, 8.5);
            if (g.globalAlpha > 0) angel(C.x + Math.sin(k * 2) * D.cr * 0.8, C.y - k * cw * 0.4, D.cr * 0.75, k, t);
            g.globalAlpha = 1;
          }
        }
        scanlines();
      },

      finale() {
        // caught!
        sfx.tone({ f: 1400, to: 300, type: 'square', dur: 0.14, vol: 0.08, filter: 'lowpass', ff: 3500 });
        // the classic descending warble while the chomper shrivels
        const n = 11, seg = (TL.shrivelEnd - TL.vanish) / n;
        for (let i = 0; i < n; i++) {
          const at = TL.vanish + i * seg, f = 980 * Math.pow(0.9, i);
          sfx.tone({ f: f * 0.8, to: f * 1.12, glide: seg * 0.3, type: 'square', at, dur: seg * 0.32, vol: 0.07, attack: 0.004, release: 0.01, filter: 'lowpass', ff: 3200 });
          sfx.tone({ f: f * 1.12, to: f * 0.55, glide: seg * 0.62, type: 'square', at: at + seg * 0.3, dur: seg * 0.65, vol: 0.07, attack: 0.004, release: 0.03, filter: 'lowpass', ff: 3200 });
          sfx.tone({ f: f * 0.5, to: f * 0.3, type: 'triangle', at, dur: seg * 0.95, vol: 0.12, attack: 0.004, release: 0.03 });
        }
        // two little bloops
        [0.05, 0.25].forEach(o => {
          sfx.tone({ f: 160, to: 900, type: 'square', at: TL.shrivelEnd + o, dur: 0.13, vol: 0.08, attack: 0.003, release: 0.03, filter: 'lowpass', ff: 3000 });
          sfx.tone({ f: 80, to: 450, type: 'triangle', at: TL.shrivelEnd + o, dur: 0.13, vol: 0.12, attack: 0.003, release: 0.03 });
        });
        // GAME OVER: sad chiptune "wah wah wah waaah"
        [['G3', 0.3], ['F#3', 0.3], ['F3', 0.3], ['E3', 1.1]].reduce((at, [nm, dur], i) => {
          const f = sfx.note(nm), last = i === 3;
          const vib = last ? { rate: 6, depth: 5 } : undefined;
          sfx.tone({ f, type: 'square', at, dur, vol: 0.09, attack: 0.02, release: last ? 0.4 : 0.06, filter: 'lowpass', ff: 350, ffTo: 1800, q: 4, vib });
          sfx.tone({ f: f / 2, type: 'triangle', at, dur, vol: 0.16, attack: 0.02, release: last ? 0.4 : 0.06, vib });
          return at + dur + 0.04;
        }, TL.gameOver + 0.15);
      },

      resize() { key = ''; },
      destroy() {},
    };
  },
});
