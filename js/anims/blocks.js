// Falling-block puzzle well: tetrominoes with faces fall and stack up; the stack's height is the progress.
// Placements are pre-planned (greedy, no line clears) so the stack only ever grows, smoothly, to the rim.
Minutka.register({
  id: 'blocks',
  name: 'Stack Overflow',
  emoji: '🧱',
  create(stage, sfx) {
    const U = Minutka.util;
    const TAU = U.TAU;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(1234);

    const COLS = 10, ROWS = 20, DANGER_ROW = 17, SPAWN_X = 3;
    // Finale timeline, shared by the visuals and the sound.
    const GREY_START = 0.35, GREY_STEP = 0.09;
    const GAMEOVER_AT = GREY_START + ROWS * GREY_STEP + 0.25;
    const COLLAPSE_AT = GAMEOVER_AT + 2.1;
    const COIN_AT = COLLAPSE_AT + 2.4;
    const GREY = '#80859a', INK = '#1a1030';

    const TYPES = {
      I: { color: '#36d6f0', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
      O: { color: '#ffd23f', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      T: { color: '#b45cf0', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
      S: { color: '#4fd65a', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
      Z: { color: '#f2475a', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
      J: { color: '#3f7cf2', cells: [[0, 0], [1, 0], [2, 0], [0, 1]] },
      L: { color: '#ff9b2f', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
    };

    // Unique rotations of each shape, normalized to start at (0,0).
    function rotations(cells) {
      const out = [], keys = new Set();
      let cur = cells;
      for (let i = 0; i < 4; i++) {
        const mx = Math.min(...cur.map(c => c[0])), my = Math.min(...cur.map(c => c[1]));
        const norm = cur.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const key = norm.join(';');
        if (!keys.has(key)) { keys.add(key); out.push(norm); }
        cur = cur.map(([x, y]) => [y, -x]);
      }
      return out;
    }
    const ROT = {};
    Object.keys(TYPES).forEach(k => { ROT[k] = rotations(TYPES[k].cells); });
    const widthOf = cells => 1 + Math.max(...cells.map(c => c[0]));

    // ------------------------------------------------------------ pre-planned game
    const bag = [];
    function nextType() {
      if (!bag.length) {
        const b = 'IOTSZJL'.split('');
        for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
        bag.push(...b);
      }
      return bag.shift();
    }

    const plan = [];
    const rowFullAt = new Array(ROWS).fill(-1);
    (function simulate() {
      const heights = new Array(COLS).fill(0);
      const rowCount = new Array(ROWS + 4).fill(0);
      for (let guard = 0; guard < 120; guard++) {
        const type = nextType();
        let best = null;
        ROT[type].forEach((cells, rot) => {
          const w = widthOf(cells);
          for (let x = 0; x + w <= COLS; x++) {
            let y = 0;
            cells.forEach(([cx, cy]) => { y = Math.max(y, heights[x + cx] - cy); });
            const top = y + Math.max(...cells.map(c => c[1])) + 1;
            if (top > ROWS) continue;
            const h2 = heights.slice();
            const lowest = {};
            cells.forEach(([cx, cy]) => {
              h2[x + cx] = Math.max(h2[x + cx], y + cy + 1);
              lowest[x + cx] = Math.min(lowest[x + cx] == null ? 99 : lowest[x + cx], y + cy);
            });
            let holes = 0;
            Object.keys(lowest).forEach(c => { holes += lowest[c] - heights[c]; });
            let agg = 0, bump = 0, maxH = 0;
            for (let c = 0; c < COLS; c++) {
              agg += h2[c]; maxH = Math.max(maxH, h2[c]);
              if (c) bump += Math.abs(h2[c] - h2[c - 1]);
            }
            const score = -0.51 * agg - 1.4 * holes - 0.3 * bump - 0.4 * maxH + R() * 0.2;
            if (!best || score > best.score) best = { score, rot, x, y, cells };
          }
        });
        if (!best) break;
        const abs = best.cells.map(([cx, cy]) => [best.x + cx, best.y + cy]);
        abs.forEach(([c, r]) => { heights[c] = Math.max(heights[c], r + 1); rowCount[r]++; });
        abs.forEach(([, r]) => { if (rowCount[r] === COLS && rowFullAt[r] < 0) rowFullAt[r] = plan.length + 1; });
        // face sits on the piece cell closest to the centroid
        const mx = abs.reduce((a, c) => a + c[0], 0) / 4, my = abs.reduce((a, c) => a + c[1], 0) / 4;
        let fc = abs[0];
        abs.forEach(c => { if (Math.hypot(c[0] - mx, c[1] - my) < Math.hypot(fc[0] - mx, fc[1] - my)) fc = c; });
        const stackH = Math.max(...heights);
        plan.push({
          type, rot: best.rot, x: best.x, y: best.y, cells: abs, color: TYPES[type].color,
          fx: (fc[0] + mx) / 2 + 0.5, fy: (fc[1] + my) / 2 + 0.5,
          top: Math.max(...abs.map(c => c[1])) + 1, stackH, ph: R(),
        });
        if (stackH >= ROWS) break;
      }
    })();
    const N = plan.length;
    // Mean column height after each piece; p is mapped through it so the visible height grows linearly.
    const MEAN = [0];
    (function () {
      const h = new Array(COLS).fill(0);
      plan.forEach(P => {
        P.cells.forEach(([c, r]) => { h[c] = Math.max(h[c], r + 1); });
        MEAN.push(Math.max(MEAN[MEAN.length - 1] + 1e-3, h.reduce((a, b) => a + b, 0) / COLS));
      });
    })();
    function pieceProgress(p) {
      const m = p * MEAN[N];
      let i = 0;
      while (i < N - 1 && MEAN[i + 1] <= m) i++;
      return Math.min(N, i + U.clamp((m - MEAN[i]) / (MEAN[i + 1] - MEAN[i])));
    }
    const stuckType = 'T'; // the one piece that does not fit any more
    const occ = new Uint8Array(COLS * (ROWS + 6));

    // Static decoration.
    const floaters = Array.from({ length: 8 }, (_, i) => ({
      type: 'IOTSZJL'[i % 7], x: R(), y: R() * 1.4, k: 0.7 + R() * 1.2, v: 0.01 + R() * 0.015, a: R() * TAU, va: (R() - 0.5) * 0.3,
    }));
    const stars = Array.from({ length: 70 }, () => ({ x: R(), y: R(), r: 0.6 + R() * 1.6, ph: R() * TAU, sp: 1 + R() * 3 }));

    const debris = [];
    const dust = [];
    let pile = null, collapsed = false;
    const DR = U.rng(99);

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const portrait = W < H * 0.9;
      const cell = portrait ? Math.min(H * 0.8 / (ROWS + 2), W * 0.8 / COLS) : Math.min(H * 0.84 / ROWS, W * 0.5 / COLS);
      const ww = cell * COLS, wh = cell * ROWS;
      const wx = (W - ww) / 2, wy = H - H * 0.045 - wh;
      return { W, H, s, portrait, cell, ww, wh, wx, wy };
    }
    const cellX = (G, c) => G.wx + c * G.cell;
    const cellY = (G, r) => G.wy + (ROWS - 1 - r) * G.cell;

    // ------------------------------------------------------------ drawing
    function drawCell(x, y, sz, color) {
      g.fillStyle = color;
      g.fillRect(x, y, sz, sz);
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.fillRect(x, y, sz, sz * 0.14);
      g.fillRect(x, y, sz * 0.14, sz);
      g.fillStyle = 'rgba(0,0,0,0.32)';
      g.fillRect(x, y + sz * 0.86, sz, sz * 0.14);
      g.fillRect(x + sz * 0.86, y, sz * 0.14, sz);
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.fillRect(x + sz * 0.22, y + sz * 0.22, sz * 0.16, sz * 0.16);
    }

    // o: { mood, lx, ly, blink, brow, sweat (phase or -1) }
    function face(x, y, sz, o) {
      const e = sz * 0.25, er = sz * 0.15, m = o.mood;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = INK;
      g.lineWidth = Math.max(1.5, sz * 0.075);
      if (m === 'dead') {
        g.beginPath();
        [-1, 1].forEach(sd => {
          const ex = x + sd * e, k = er * 0.8;
          g.moveTo(ex - k, y - k); g.lineTo(ex + k, y + k);
          g.moveTo(ex + k, y - k); g.lineTo(ex - k, y + k);
        });
        g.stroke();
      } else if (m === 'squish') {
        g.beginPath();
        g.moveTo(x - e - er * 0.8, y - er * 0.7); g.lineTo(x - e + er * 0.6, y); g.lineTo(x - e - er * 0.8, y + er * 0.7);
        g.moveTo(x + e + er * 0.8, y - er * 0.7); g.lineTo(x + e - er * 0.6, y); g.lineTo(x + e + er * 0.8, y + er * 0.7);
        g.stroke();
      } else if (o.blink) {
        g.beginPath();
        g.moveTo(x - e - er, y); g.lineTo(x - e + er, y);
        g.moveTo(x + e - er, y); g.lineTo(x + e + er, y);
        g.stroke();
      } else {
        const big = m === 'scream' ? 1.3 : 1;
        g.fillStyle = '#fff';
        g.beginPath();
        g.moveTo(x - e + er * big, y); g.arc(x - e, y, er * big, 0, TAU);
        g.moveTo(x + e + er * big, y); g.arc(x + e, y, er * big, 0, TAU);
        g.fill();
        g.fillStyle = INK;
        const px = (o.lx || 0) * er * 0.45, py = (o.ly || 0) * er * 0.45, pr = er * (m === 'scream' ? 0.35 : 0.55);
        g.beginPath();
        g.moveTo(x - e + px + pr, y + py); g.arc(x - e + px, y + py, pr, 0, TAU);
        g.moveTo(x + e + px + pr, y + py); g.arc(x + e + px, y + py, pr, 0, TAU);
        g.fill();
      }
      if (o.brow) {
        // worried: inner ends up; evil: inner ends down
        const inner = y - er * 1.6 + (o.brow === 'worried' ? -1 : 1) * er * 0.7;
        g.beginPath();
        g.moveTo(x - e - er, y - er * 1.6); g.lineTo(x - e + er, inner);
        g.moveTo(x + e + er, y - er * 1.6); g.lineTo(x + e - er, inner);
        g.stroke();
      }
      const my = y + sz * 0.27;
      g.fillStyle = INK;
      g.beginPath();
      if (m === 'happy') {
        g.arc(x, my - sz * 0.1, sz * 0.14, 0.2 * Math.PI, 0.8 * Math.PI);
        g.stroke();
      } else if (m === 'wheee') {
        g.moveTo(x + sz * 0.15, my - sz * 0.05);
        g.arc(x, my - sz * 0.05, sz * 0.15, 0, Math.PI);
        g.closePath();
        g.fill();
      } else if (m === 'evil') {
        g.moveTo(x - sz * 0.2, my - sz * 0.06);
        g.quadraticCurveTo(x, my + sz * 0.16, x + sz * 0.2, my - sz * 0.06);
        g.closePath();
        g.fillStyle = '#fff';
        g.fill();
        g.stroke();
      } else if (m === 'scream') {
        g.ellipse(x, my, sz * 0.1, sz * 0.13, 0, 0, TAU);
        g.fill();
      } else {
        // wobbly line: nervous, squished or dead
        const n = 4, wv = sz * (m === 'nervous' ? 0.05 : 0.03), hw = sz * (m === 'squish' ? 0.11 : 0.16);
        for (let i = 0; i <= n; i++) {
          const xx = x - hw + (2 * hw * i) / n, yy = my - sz * 0.02 + (i % 2 ? wv : -wv);
          if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy);
        }
        g.stroke();
      }
      if (o.sweat >= 0) {
        const sx = x + sz * 0.45, sy = y - sz * 0.15 + o.sweat * sz * 0.45;
        g.fillStyle = '#8fdcff';
        g.beginPath();
        g.moveTo(sx, sy - sz * 0.13);
        g.quadraticCurveTo(sx + sz * 0.08, sy, sx, sy + sz * 0.05);
        g.quadraticCurveTo(sx - sz * 0.08, sy, sx, sy - sz * 0.13);
        g.fill();
      }
    }

    function shapeCells(G, type, cx, cy, sz, color) {
      const cells = ROT[type][0];
      const w = widthOf(cells), h = 1 + Math.max(...cells.map(c => c[1]));
      cells.forEach(([x, y]) => drawCell(cx - (w * sz) / 2 + x * sz, cy + (h * sz) / 2 - (y + 1) * sz, sz, color));
      return { w, h };
    }

    function background(G, t, p, ft) {
      const grd = g.createLinearGradient(0, 0, 0, G.H);
      grd.addColorStop(0, '#170c38');
      grd.addColorStop(1, '#3b1452');
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.H);
      stars.forEach(st => {
        const a = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph));
        g.fillStyle = `rgba(255,255,255,${a})`;
        g.fillRect(st.x * G.W, st.y * G.H, st.r * G.s * 1.5, st.r * G.s * 1.5);
      });
      // ghostly tetrominoes drift upward
      floaters.forEach(f => {
        const y = (((f.y - t * f.v) % 1.4) + 1.4) % 1.4 - 0.2;
        g.save();
        g.translate(f.x * G.W, y * G.H);
        g.rotate(f.a + t * f.va);
        g.globalAlpha = 0.09;
        const sz = 34 * G.s * f.k;
        ROT[f.type][0].forEach(([x, yy]) => { g.fillStyle = TYPES[f.type].color; g.fillRect(x * sz - sz, -yy * sz, sz * 0.92, sz * 0.92); });
        g.restore();
      });
      // red alarm vignette near the end
      const danger = ft >= 0 ? 0 : U.range(p, 0.8, 1);
      if (danger > 0) {
        const a = danger * (0.25 + 0.2 * Math.sin(t * 10));
        const vg = g.createRadialGradient(G.W / 2, G.H / 2, Math.min(G.W, G.H) * 0.3, G.W / 2, G.H / 2, Math.max(G.W, G.H) * 0.75);
        vg.addColorStop(0, 'rgba(255,0,40,0)');
        vg.addColorStop(1, `rgba(255,0,40,${a})`);
        g.fillStyle = vg;
        g.fillRect(0, 0, G.W, G.H);
      }
    }

    function wellBack(G) {
      g.fillStyle = '#0c0920';
      g.fillRect(G.wx, G.wy, G.ww, G.wh);
      g.strokeStyle = 'rgba(255,255,255,0.06)';
      g.lineWidth = 1;
      g.beginPath();
      for (let c = 1; c < COLS; c++) { g.moveTo(G.wx + c * G.cell, G.wy); g.lineTo(G.wx + c * G.cell, G.wy + G.wh); }
      for (let r = 1; r < ROWS; r++) { g.moveTo(G.wx, G.wy + r * G.cell); g.lineTo(G.wx + G.ww, G.wy + r * G.cell); }
      g.stroke();
    }

    function wall(x, y, w, h, tint) {
      g.fillStyle = tint;
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let yy = y; yy < y + h; yy += w * 1.2) g.fillRect(x, yy, w, w * 0.12);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x, y, w * 0.18, h);
    }

    function walls(G, t, p, ft) {
      const bw = G.cell * 0.55;
      const alarm = ft < 0 ? U.range(p, 0.85, 1) * (0.5 + 0.5 * Math.sin(t * 14)) : 0;
      const tint = alarm > 0.01 ? `rgb(${110 + alarm * 140}, ${115 - alarm * 60}, ${150 - alarm * 90})` : '#6e7396';
      // on collapse the walls splay outward and the whole well drops off the bottom of the screen
      const tau = Math.max(0, ft - COLLAPSE_AT);
      if (tau > 2) return;
      const fall = ft >= COLLAPSE_AT ? U.easeOut(U.range(tau, 0, 0.6)) * 0.45 : 0;
      const drop = 0.5 * 1900 * G.s * tau * tau;
      const top = G.wy - G.cell * 0.4, h = G.wh + G.cell * 0.4;
      g.save();
      g.translate(0, drop);
      [[-1, G.wx - bw], [1, G.wx + G.ww]].forEach(([sd, x]) => {
        g.save();
        const px = sd < 0 ? x : x + bw, py = G.wy + G.wh + bw;
        g.translate(px, py);
        g.rotate(sd * fall);
        g.translate(-px, -py);
        wall(x, top, bw, h + bw, tint);
        g.restore();
      });
      wall(G.wx - bw, G.wy + G.wh, G.ww + 2 * bw, bw, tint);
      g.restore();
    }

    function dangerLine(G, t, p, ft) {
      const d = ft >= 0 ? 1 : U.range(p, 0.55, 1);
      const y = G.wy + (ROWS - DANGER_ROW) * G.cell;
      const blink = d > 0.4 ? 0.5 + 0.5 * Math.sin(t * (4 + d * 14)) : 0.5;
      g.strokeStyle = `rgba(255,60,70,${0.25 + 0.75 * d * blink})`;
      g.lineWidth = Math.max(2, G.cell * 0.12);
      g.setLineDash([G.cell * 0.4, G.cell * 0.25]);
      g.lineDashOffset = -t * G.cell;
      g.beginPath(); g.moveTo(G.wx, y); g.lineTo(G.wx + G.ww, y); g.stroke();
      g.setLineDash([]);
      if (d > 0.05 && ft < 0) {
        g.font = `${Math.max(12, G.cell * 0.75)}px Bungee, sans-serif`;
        g.textAlign = G.portrait ? 'center' : 'right';
        g.textBaseline = 'middle';
        g.fillStyle = `rgba(255,80,90,${0.3 + 0.7 * d * blink})`;
        if (G.portrait) g.fillText('DANGER', G.W / 2, y - G.cell * 0.5);
        else g.fillText('DANGER ▶', G.wx - G.cell * 0.8, y);
      }
    }

    function greyed(r, ft) { return ft >= 0 && ft >= GREY_START + r * GREY_STEP; }

    function stack(G, k, kf, t, p, ft, look) {
      const topH = k ? plan[k - 1].stackH : 0;
      for (let i = 0; i < k; i++) {
        const P = plan[i];
        P.cells.forEach(([c, r]) => drawCell(cellX(G, c), cellY(G, r), G.cell, greyed(r, ft) ? GREY : P.color));
      }
      // complete rows flash ("why won't it clear?!")
      for (let r = 0; r < ROWS; r++) {
        const at = rowFullAt[r];
        if (at < 0 || at > k || ft >= 0) continue;
        const age = kf - at;
        if (age > 1.3) continue;
        g.fillStyle = `rgba(255,255,255,${(1 - age / 1.3) * (0.35 + 0.3 * Math.sin(t * 25))})`;
        g.fillRect(G.wx, cellY(G, r), G.ww, G.cell);
      }
      for (let i = 0; i < k; i++) {
        const P = plan[i];
        const x = G.wx + P.fx * G.cell, y = G.wy + (ROWS - P.fy) * G.cell;
        const dead = greyed(Math.floor(P.fy), ft);
        const depth = topH - P.top;
        let mood = p < 0.45 ? 'happy' : p < 0.8 ? 'nervous' : 'scream';
        if (depth >= 4) mood = 'squish';
        if (dead) mood = 'dead';
        else if (ft >= 0) mood = 'scream';
        const dx = look.x - x, dy = look.y - y, dl = Math.hypot(dx, dy) || 1;
        face(x, y, G.cell, {
          mood, lx: dx / dl, ly: dy / dl,
          blink: ((t * 0.31 + P.ph) % 1) < 0.05,
          brow: mood !== 'squish' && mood !== 'dead' && p > 0.6 ? 'worried' : null,
          sweat: mood !== 'squish' && mood !== 'dead' && p > 0.55 ? (t * 0.9 + P.ph) % 1 : -1,
        });
      }
    }

    function fits(cells, x, y) {
      for (const [cx, cy] of cells) {
        const c = x + cx, r = y + cy;
        if (c < 0 || c >= COLS || r < 0) return false;
        if (r < ROWS + 6 && occ[r * COLS + c]) return false;
      }
      return true;
    }

    // Where the currently falling piece is: an indecisive "player" shuffles and spins it, then drops it in place.
    function fallingState(k, f, t) {
      const P = plan[k], rots = ROT[P.type];
      const LAND = 0.8;
      if (f >= LAND) return { cells: rots[P.rot], x: P.x, y: P.y, lock: (f - LAND) / (1 - LAND) };
      const q = f / LAND;
      const y = Math.max(P.y, Math.floor(U.lerp(ROWS - 1, P.y, q)));
      const a = U.range(q, 0.05, 0.6);
      let cells = q < 0.45 ? rots[(P.rot + Math.floor(t * 1.3 + k * 0.7)) % rots.length] : rots[P.rot];
      let x = Math.round(U.lerp(SPAWN_X, P.x, a) + Math.sin(t * 2.4 + k * 1.7) * 1.5 * (1 - a));
      x = U.clamp(x, 0, COLS - widthOf(cells));
      if (!fits(cells, x, y)) { cells = rots[P.rot]; x = P.x; }
      return { cells, x, y, lock: -1 };
    }

    function pieceFaceAt(G, cells, x, y) {
      const mx = cells.reduce((a, c) => a + c[0], 0) / 4, my = cells.reduce((a, c) => a + c[1], 0) / 4;
      let fc = cells[0];
      cells.forEach(c => { if (Math.hypot(c[0] - mx, c[1] - my) < Math.hypot(fc[0] - mx, fc[1] - my)) fc = c; });
      return { x: G.wx + (x + (fc[0] + mx) / 2 + 0.5) * G.cell, y: G.wy + (ROWS - (y + (fc[1] + my) / 2 + 0.5)) * G.cell };
    }

    function falling(G, k, f, t, p) {
      const P = plan[k];
      const st = fallingState(k, f, t);
      g.save();
      g.beginPath();
      g.rect(G.wx, G.wy, G.ww, G.wh);
      g.clip();
      st.cells.forEach(([cx, cy]) => drawCell(cellX(G, st.x + cx), cellY(G, st.y + cy), G.cell, P.color));
      const fp = pieceFaceAt(G, st.cells, st.x, st.y);
      const evil = p > 0.6;
      face(fp.x, fp.y, G.cell, {
        mood: st.lock >= 0 ? 'happy' : evil ? 'evil' : 'wheee', lx: 0, ly: 1,
        brow: evil ? 'evil' : null, blink: ((t * 0.4) % 1) < 0.04, sweat: -1,
      });
      if (st.lock >= 0 && st.lock < 0.5) {
        g.fillStyle = `rgba(255,255,255,${0.6 * (1 - st.lock * 2)})`;
        st.cells.forEach(([cx, cy]) => g.fillRect(cellX(G, st.x + cx), cellY(G, st.y + cy), G.cell, G.cell));
      }
      g.restore();
      return fp;
    }

    // The piece that does not fit: drops onto the rim at time-up and stays wedged there, horrified.
    function stuckPiece(G, ft, t) {
      if (collapsed) return;
      const cells = ROT[stuckType][0];
      const k = U.easeOutBack(U.range(ft, 0, 0.3));
      const x0 = cellX(G, SPAWN_X), yTop = G.wy - G.cell; // bottom row sits just above the rim
      const off = (1 - k) * -G.wy;
      const grey = ft >= GREY_START + ROWS * GREY_STEP;
      cells.forEach(([cx, cy]) => drawCell(x0 + cx * G.cell, yTop - cy * G.cell + off, G.cell, grey ? GREY : TYPES[stuckType].color));
      face(x0 + 1.5 * G.cell, yTop + 0.5 * G.cell + off, G.cell, { mood: grey ? 'dead' : 'scream', lx: 0, ly: 1, brow: grey ? null : 'worried', sweat: grey ? -1 : (t * 1.5) % 1 });
    }

    function nextBox(G, k, t) {
      const type = k + 1 < N ? plan[k + 1].type : stuckType;
      const size = G.portrait ? Math.min(G.W * 0.3, (G.wy - G.cell * 1.3) * 0.8) : 160 * G.s;
      const cx = G.portrait ? G.W * 0.25 : G.wx / 2, cy = G.portrait ? (G.wy - G.cell * 1.2) / 2 + size * 0.06 : G.H * 0.6;
      g.fillStyle = 'rgba(10,6,30,0.75)';
      g.strokeStyle = '#6e7396';
      g.lineWidth = Math.max(3, size * 0.035);
      g.beginPath(); g.roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.08); g.fill(); g.stroke();
      g.font = `${size * 0.16}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      g.fillText('NEXT', cx, cy - size * 0.33);
      const sz = size * 0.18, bob = Math.sin(t * 2.2) * size * 0.03;
      const dims = shapeCells(G, type, cx, cy + size * 0.1 + bob, sz, TYPES[type].color);
      face(cx + (dims.w === 2 ? 0 : 0), cy + size * 0.1 + bob + (dims.h === 2 ? sz * 0.5 : 0), sz * 1.2,
        { mood: 'wheee', lx: G.portrait ? 1 : 1, ly: 0.3, blink: ((t * 0.5) % 1) < 0.05, sweat: -1 });
    }

    function moodPanel(G, p, t, ft) {
      const size = G.portrait ? Math.min(G.W * 0.3, (G.wy - G.cell * 1.3) * 0.8) : 170 * G.s;
      const cx = G.portrait ? G.W * 0.75 : G.wx + G.ww + (G.W - G.wx - G.ww) / 2;
      const cy = G.portrait ? (G.wy - G.cell * 1.2) / 2 + size * 0.06 : G.H * 0.6;
      const dead = ft >= GAMEOVER_AT;
      const panic = ft >= 0 ? 1 : U.range(p, 0.8, 1);
      const shake = panic * Math.sin(t * 45) * size * 0.03;
      const hue = 48 - 45 * U.range(p, 0.55, 1);
      const col = dead ? GREY : `hsl(${hue}, 95%, 58%)`;
      const c = size * 0.4;
      [[-1, -1], [0, -1], [-1, 0], [0, 0]].forEach(([dx, dy]) => drawCell(cx + dx * c + shake, cy + dy * c, c, col));
      let mood = p < 0.3 ? 'happy' : p < 0.6 ? 'wheee' : p < 0.85 ? 'nervous' : 'scream';
      if (ft >= 0) mood = dead ? 'dead' : 'scream';
      face(cx + shake, cy - c * 0.1, c * 1.35, {
        mood, lx: Math.sin(t * 0.7) * 0.5 - (G.portrait ? 0.5 : 0.8), ly: p > 0.6 ? -0.6 : 0.2,
        blink: ((t * 0.27) % 1) < 0.04, brow: p > 0.6 && !dead ? 'worried' : null,
        sweat: p > 0.5 && !dead ? (t * 1.1) % 1 : -1,
      });
      g.font = `${size * 0.15}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      if (!G.portrait) g.fillText('MOOD', cx, cy - c - size * 0.18);
      // speech bubble
      const say = ft >= 0 ? (dead ? '' : 'NOOOO!') : p < 0.15 ? 'so roomy!' : p < 0.4 ? 'la la la…' : p < 0.6 ? 'hmm.' : p < 0.8 ? 'uh oh…' : p < 0.93 ? 'TOO HIGH!' : 'AAAAH!';
      if (!say) return;
      const fs = G.portrait ? Math.max(12, G.W * 0.04) : 30 * G.s;
      g.font = `700 ${fs}px "Space Grotesk", sans-serif`;
      const tw = g.measureText(say).width + fs;
      const bx = G.portrait ? Math.min(G.W - tw / 2 - 6, cx) : cx + size * 0.15, by = G.portrait ? cy - c - fs * 0.9 : cy - c - size * 0.55;
      const wob = Math.sin(t * 3) * fs * 0.1;
      if (by - fs < 0) return;
      g.fillStyle = '#fff';
      g.beginPath();
      g.roundRect(bx - tw / 2, by - fs * 0.85 + wob, tw, fs * 1.7, fs * 0.5);
      g.moveTo(bx - tw * 0.2, by + fs * 0.8 + wob);
      g.lineTo(bx - tw * 0.32, by + fs * 1.5 + wob);
      g.lineTo(bx - tw * 0.05, by + fs * 0.8 + wob);
      g.fill();
      g.fillStyle = INK;
      g.fillText(say, bx, by + wob);
    }

    function title(G, t) {
      if (G.portrait) return;
      // Bungee is wide (~0.75em per glyph): keep "OVERFLOW" inside the left panel.
      const x = G.wx / 2, fs = Math.min(46 * G.s, (G.wx * 0.9) / 6);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `${fs}px Bungee, sans-serif`;
      ['STACK', 'OVERFLOW'].forEach((w, i) => {
        const y = G.H * 0.11 + i * fs * 1.1 + Math.sin(t * 2 + i) * 3 * G.s;
        g.lineWidth = fs * 0.16;
        g.strokeStyle = INK;
        g.strokeText(w, x, y);
        g.fillStyle = i ? '#ff9b2f' : '#36d6f0';
        g.fillText(w, x, y);
      });
    }

    // ------------------------------------------------------------ finale: pixel text + collapse
    const FONT = {
      G: [' ### ', '#   #', '#    ', '# ###', '#   #', '#   #', ' ####'],
      A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
      M: ['#   #', '## ##', '# # #', '# # #', '#   #', '#   #', '#   #'],
      E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
      O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
      V: ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
      R: ['#### ', '#   #', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
    };

    function pixelText(G, lines, cy, px, ft0, ft, t) {
      let gi = 0;
      lines.forEach((line, li) => {
        const lw = line.length * 6 - 1;
        const x0 = G.W / 2 - (lw * px) / 2;
        const y0 = cy + (li - (lines.length - 1) / 2) * px * 9 - 3.5 * px;
        line.split('').forEach((ch, ci) => {
          const glyph = FONT[ch];
          const appear = ft0 + gi * 0.07;
          gi++;
          if (!glyph || ft < appear) return;
          const k = U.easeOutBack(U.range(ft, appear, appear + 0.35));
          const lx = x0 + ci * 6 * px, ly = y0 - (1 - k) * px * 16;
          for (let pass = 0; pass < 2; pass++) {
            glyph.forEach((row, ry) => {
              for (let rx = 0; rx < 5; rx++) {
                if (row[rx] !== '#') continue;
                const x = lx + rx * px, y = ly + ry * px;
                if (pass === 0) {
                  g.fillStyle = INK;
                  g.fillRect(x - px * 0.25, y - px * 0.25, px * 1.5, px * 1.5);
                } else {
                  g.fillStyle = `hsl(${(52 - ry * 8 + Math.sin(t * 4 + ci) * 8)}, 100%, ${62 - ry * 2}%)`;
                  g.fillRect(x, y, px * 0.94, px * 0.94);
                  g.fillStyle = 'rgba(255,255,255,0.45)';
                  g.fillRect(x, y, px * 0.94, px * 0.2);
                }
              }
            });
          }
        });
      });
    }

    function startCollapse(G) {
      collapsed = true;
      pile = new Float32Array(Math.max(1, Math.floor(G.W / G.cell)));
      const add = (x, y, r, withFace) => {
        if (debris.length >= 240) return;
        debris.push({
          x, y, a: 0, rest: false, face: withFace,
          vx: ((r / ROWS) * 620 + (DR() - 0.35) * 260) * G.s,
          vy: -(DR() * 260 + r * 12) * G.s,
          va: (DR() - 0.5) * 10,
        });
      };
      plan.forEach(P => {
        const fc = [Math.floor(P.fx), Math.floor(P.fy)];
        P.cells.forEach(([c, r]) => add(cellX(G, c) + G.cell / 2, cellY(G, r) + G.cell / 2, r, c === fc[0] && r === fc[1]));
      });
      ROT[stuckType][0].forEach(([cx, cy]) => add(cellX(G, SPAWN_X + cx) + G.cell / 2, G.wy - G.cell / 2 - cy * G.cell, ROWS + cy, cx === 1 && cy === 0));
      for (let i = 0; i < 36; i++) {
        dust.push({
          x: G.wx + DR() * G.ww, y: G.wy + G.wh * (0.3 + DR() * 0.7), vx: (DR() - 0.5) * 160 * G.s, vy: -DR() * 90 * G.s,
          r: (14 + DR() * 22) * G.s, life: 0, max: 1.6 + DR() * 1.4,
        });
      }
    }

    function debrisStep(G, dt) {
      const half = G.cell / 2, grav = 1900 * G.s;
      debris.forEach(q => {
        if (!q.rest) {
          q.vy += grav * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.a += q.va * dt;
          if (q.x < half) { q.x = half; q.vx = Math.abs(q.vx) * 0.5; }
          if (q.x > G.W - half) { q.x = G.W - half; q.vx = -Math.abs(q.vx) * 0.5; }
          const b = U.clamp(Math.floor(q.x / G.cell), 0, pile.length - 1);
          const floorY = G.H - pile[b] - half;
          if (q.y > floorY) {
            q.y = floorY;
            if (q.vy > 260 * G.s) {
              q.vy *= -0.32; q.vx *= 0.6; q.va *= 0.5;
            } else {
              // settle: roll downhill to the lowest nearby spot, then claim it in the pile
              let tb = b;
              for (let n = 0; n < 14; n++) {
                const l = tb > 0 ? pile[tb - 1] : 1e9, r = tb < pile.length - 1 ? pile[tb + 1] : 1e9;
                if (Math.min(l, r) < pile[tb] - G.cell * 0.5) tb += l < r ? -1 : 1; else break;
              }
              q.rest = true;
              q.tx = (tb + 0.5) * G.cell;
              q.ty = G.H - pile[tb] - half;
              q.ta = Math.round(q.a / (Math.PI / 2)) * (Math.PI / 2) + Math.sin(tb * 7.3 + pile[tb]) * 0.12;
              pile[tb] += G.cell * 0.92;
            }
          }
        } else {
          const k = Math.min(1, dt * 9);
          q.x += (q.tx - q.x) * k;
          q.y += (q.ty - q.y) * k;
          q.a += (q.ta - q.a) * k;
        }
        g.save();
        g.translate(q.x, q.y);
        g.rotate(q.a);
        drawCell(-half, -half, G.cell, GREY);
        if (q.face) face(0, 0, G.cell, { mood: 'dead', sweat: -1 });
        g.restore();
      });
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.life += dt;
        if (d.life > d.max) { dust.splice(i, 1); continue; }
        d.x += d.vx * dt; d.y += d.vy * dt; d.r += 30 * G.s * dt;
        g.fillStyle = `rgba(200,195,215,${0.55 * (1 - d.life / d.max)})`;
        g.beginPath(); g.arc(d.x, d.y, d.r, 0, TAU); g.fill();
      }
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        const kf = pieceProgress(p);
        const k = Math.min(N, Math.floor(kf));
        const f = kf - k;

        occ.fill(0);
        for (let i = 0; i < k; i++) plan[i].cells.forEach(([c, r]) => { occ[r * COLS + c] = 1; });

        background(G, t, p, ft);
        title(G, t);

        // screen shake: jitters near the end, rumbles while greying, big hit on collapse
        let shake = ft < 0 ? U.range(p, 0.88, 1) * 2 : ft < GAMEOVER_AT ? 3 : ft < COLLAPSE_AT ? U.range(ft, GAMEOVER_AT + 1, COLLAPSE_AT) * 5 : 14 * Math.max(0, 1 - (ft - COLLAPSE_AT) / 0.8);
        shake *= G.s;
        g.save();
        g.translate(Math.sin(t * 53) * shake, Math.cos(t * 47) * shake);

        nextBox(G, k, t);
        moodPanel(G, p, t, ft);
        if (!collapsed) wellBack(G);
        walls(G, t, p, ft);

        if (ft >= COLLAPSE_AT && !collapsed) startCollapse(G);
        if (!collapsed) {
          let look = { x: G.wx + G.ww / 2, y: G.wy - G.cell * 2 };
          if (k < N && ft < 0) look = falling(G, k, f, t, p);
          stack(G, k, kf, t, p, ft, look);
          if (ft >= 0) stuckPiece(G, ft, t);
          dangerLine(G, t, p, ft);
        } else {
          debrisStep(G, dt);
        }

        if (ft >= 0 && ft < 0.3) {
          g.fillStyle = `rgba(255,40,60,${0.45 * (1 - ft / 0.3)})`;
          g.fillRect(G.wx, G.wy, G.ww, G.wh);
        }
        g.restore();

        if (ft >= GAMEOVER_AT) {
          const lines = G.portrait ? ['GAME', 'OVER'] : ['GAME OVER'];
          const px = G.portrait ? (G.W * 0.85) / 23 : Math.min((G.W * 0.8) / 53, G.H / 22);
          const cy = G.H * (G.portrait ? 0.36 : 0.4), bh = px * (9 * lines.length + 3);
          g.fillStyle = `rgba(10,5,25,${0.82 * U.range(ft, GAMEOVER_AT, GAMEOVER_AT + 0.4)})`;
          g.fillRect(0, cy - bh / 2, G.W, bh);
          pixelText(G, lines, cy, px, GAMEOVER_AT, ft, t);
        }
        if (ft >= COIN_AT && Math.sin((ft - COIN_AT) * 7) > -0.3) {
          const fs = Math.min(40 * G.s, G.W * 0.08);
          g.font = `${fs}px Bungee, sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.lineWidth = fs * 0.2;
          g.strokeStyle = INK;
          const y = G.H * (G.portrait ? 0.58 : 0.66);
          g.strokeText('INSERT COIN', G.W / 2, y);
          g.fillStyle = '#fff';
          g.fillText('INSERT COIN', G.W / 2, y);
        }
      },

      finale() {
        const sq = (f, at, dur, vol, o) => sfx.tone(Object.assign({ f, at, dur, vol, type: 'square', attack: 0.004, release: 0.04, filter: 'lowpass', ff: 3800 }, o));
        // top-out buzz
        sq(196, 0, 0.12, 0.13);
        sq(147, 0.14, 0.2, 0.13);
        // one descending blip per row turning grey
        for (let r = 0; r < ROWS; r++) sq(1200 * Math.pow(0.25, r / (ROWS - 1)), GREY_START + r * GREY_STEP, 0.05, 0.07);
        // game-over jingle: square lead, triangle bass
        const mel = [['G5', 0, 0.11], ['D5', 0.12, 0.11], ['B4', 0.24, 0.11], ['G4', 0.36, 0.22], ['Ab4', 0.66, 0.27], ['G4', 0.96, 0.27], ['F#4', 1.26, 0.3], ['G4', 1.62, 0.75]];
        mel.forEach(([n, at, dur], i) => {
          const last = i === mel.length - 1;
          sq(sfx.note(n), GAMEOVER_AT + at, dur, 0.1, last ? { vib: { rate: 6, depth: 7 }, release: 0.35 } : {});
          if (i >= 4) sq(sfx.note(n) / 2, GAMEOVER_AT + at, dur, 0.04, { detune: 8 });
        });
        [['G3', 0, 0.55], ['Eb3', 0.66, 0.55], ['D3', 1.26, 0.33], ['G2', 1.62, 0.8]].forEach(([n, at, dur]) => {
          sfx.tone({ f: sfx.note(n), type: 'triangle', at: GAMEOVER_AT + at, dur, vol: 0.28, attack: 0.005, release: 0.1 });
        });
        // collapse: rumble, crumble, falling square sweep, clattering blocks
        sfx.boom({ at: COLLAPSE_AT, vol: 0.5, dur: 1.6 });
        sfx.noise({ at: COLLAPSE_AT, dur: 2.0, vol: 0.28, filter: 'bandpass', ff: 1600, ffTo: 200, q: 0.7, attack: 0.01, release: 1.4 });
        sq(520, COLLAPSE_AT, 0.9, 0.08, { to: 50 });
        const r = U.rng(5);
        for (let i = 0; i < 14; i++) sfx.pop({ at: COLLAPSE_AT + 0.35 + r() * 1.6, vol: 0.1 + r() * 0.12, f: 500 + r() * 1400 });
      },

      destroy() {},
    };
  },
});
