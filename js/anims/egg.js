// A giant egg in a nest on a tree branch. Progress = how far the cracks have spread across the shell.
// The egg wobbles harder, chips fall off, an eye peeks out; the mother bird paces and loses feathers.
// Finale: the shell bursts, a baby dragon pops out, gets the top shell as a hat, sneezes fire on mum.
Minutka.register({
  id: 'egg',
  name: 'Hatchling',
  emoji: '🥚',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(11);

    // ------------------------------------------------------------ crack network (normalized egg coords)
    // x in [-1,1] is the fraction of the half-width at height v; v in [-1,1] runs top to bottom.
    const cracks = [];
    function grow(x, v, d, dir, n, depth) {
      let ang = dir;
      for (let i = 0; i < n; i++) {
        ang += (R() - 0.5) * 0.8;
        const len = 0.07 + R() * 0.06;
        const nx = x + Math.cos(ang) * len, nv = v + Math.sin(ang) * len * 0.8;
        if (Math.abs(nv) > 0.9 || Math.abs(nx) > 0.92) return;
        cracks.push({ x0: x, v0: v, x1: nx, v1: nv, d0: d, d1: d + len, w: depth ? 0.6 : 0.85 });
        x = nx; v = nv; d += len;
        if (depth < 2 && R() < 0.3) grow(x, v, d, ang + (R() < 0.5 ? 1 : -1) * (0.7 + R() * 0.6), 2 + Math.floor(R() * 3), depth + 1);
      }
    }
    [-1, 1].forEach(side => {
      let x = 0, v = -0.12, d = 0;
      for (let i = 0; i < 12; i++) {
        const nx = x + side * (0.075 + R() * 0.03);
        const nv = -0.12 + (i % 2 ? -0.08 : 0.08) + (R() - 0.5) * 0.04;
        if (Math.abs(nx) > 0.95) break;
        const len = Math.hypot(nx - x, nv - v);
        cracks.push({ x0: x, v0: v, x1: nx, v1: nv, d0: d, d1: d + len, w: 1 });
        if (R() < 0.7) grow(nx, nv, d + len, (i % 2 ? -1 : 1) * Math.PI / 2 + (R() - 0.5) * 0.8, 3 + Math.floor(R() * 5), 1);
        x = nx; v = nv; d += len;
      }
    });
    const maxD = Math.max(...cracks.map(c => c.d1));

    // Holes that chip open near the end. pts are normalized polygons around (x,v).
    const holes = [
      { x: -0.25, v: -0.35, r: 0.2, b: 0.8 },
      { x: 0.42, v: 0.12, r: 0.14, b: 0.87 },
      { x: -0.05, v: 0.42, r: 0.12, b: 0.93 },
    ].map(h => Object.assign(h, { pts: Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * U.TAU, k: 0.6 + R() * 0.5 })), done: false }));
    const spots = Array.from({ length: 16 }, () => ({ x: (R() - 0.5) * 1.6, v: (R() - 0.5) * 1.7, r: 0.025 + R() * 0.045, hue: R() < 0.5 ? 195 : 160 }));
    const leaves = Array.from({ length: 26 }, (_, i) => ({ side: i % 2 ? 1 : -1, x: R() * 0.32, y: R() * 0.3, r: 40 + R() * 50, ph: R() * U.TAU, sh: R() * 0.15 }));
    const twigs = Array.from({ length: 22 }, () => ({ a: R() * Math.PI, l: 0.6 + R() * 0.5, o: (R() - 0.5) * 0.3, c: R() }));
    const shards = Array.from({ length: 16 }, () => ({ x: (R() - 0.5) * 1.4, v: -0.3 - R() * 0.6, sz: 0.1 + R() * 0.12, vx: (R() - 0.5) * 2, vy: -1 - R() * 1.2, spin: (R() - 0.5) * 12 }));

    const feathers = [];
    const flames = [];
    const chips = [];
    let featherAcc = 0, flameAcc = 0, smokeAcc = 0;

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const m = Math.min(W / 700, H / 650);
      const land = W > H;
      const EH = 430 * m, EW = EH * 0.74;
      const nx = W * (land ? 0.6 : 0.58), ny = H * (land ? 0.84 : 0.7);
      const birdX = W * (land ? 0.22 : 0.2), birdRange = W * (land ? 0.09 : 0.06);
      return { W, H, s, m, land, EH, EW, nx, ny, birdX, birdRange, birdS: m * (land ? 1 : 0.9) };
    }

    function halfW(G, v) { return (G.EW / 2) * Math.sqrt(Math.max(0, 1 - v * v)) * (1 + 0.12 * v); }
    // egg-local point: origin at the bottom centre of the egg
    function ept(G, x, v) { return [x * halfW(G, v), -G.EH / 2 + (v * G.EH) / 2]; }

    function eggPath(G) {
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * U.TAU;
        const v = -Math.cos(a);
        const px = Math.sin(a) * (G.EW / 2) * (1 + 0.12 * v), py = -G.EH / 2 + (v * G.EH) / 2;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    }

    // ------------------------------------------------------------ scenery
    function sky(G, t) {
      const grd = g.createLinearGradient(0, 0, 0, G.H);
      grd.addColorStop(0, '#7fd0f5');
      grd.addColorStop(1, '#d9f3ff');
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.H);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 4; i++) {
        const x = ((i * 0.3 + t * 0.006) % 1.3 - 0.15) * G.W, y = G.H * (0.12 + (i % 2) * 0.14), k = 30 * G.s * (1 + (i % 3) * 0.3);
        g.beginPath();
        g.arc(x, y, k, 0, U.TAU); g.arc(x + k, y - k * 0.5, k * 1.2, 0, U.TAU); g.arc(x + k * 2.2, y, k * 0.9, 0, U.TAU);
        g.fill();
      }
      // distant hills
      g.fillStyle = '#9fd6a0';
      g.beginPath();
      g.moveTo(0, G.H);
      for (let x = 0; x <= G.W; x += 20) g.lineTo(x, G.H * 0.72 - Math.sin(x / (210 * G.s)) * 30 * G.s - Math.sin(x / (90 * G.s)) * 10 * G.s);
      g.lineTo(G.W, G.H);
      g.fill();
      // tree trunk on the right that the branch grows from
      const tw = 70 * G.m;
      g.fillStyle = '#6b4020';
      g.fillRect(G.W - tw * 0.8, 0, tw, G.H);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(G.W - tw * 0.8, 0, tw * 0.25, G.H);
    }

    function foliage(G, t, top) {
      leaves.forEach(l => {
        if ((l.y < 0.15) !== top) return;
        const x = l.side < 0 ? l.x * G.W * 0.5 : G.W - l.x * G.W * 0.5;
        const y = l.y * G.H * 0.5 + Math.sin(t * 1.3 + l.ph) * 5 * G.s;
        g.fillStyle = `hsl(${110 + l.sh * 120}, 45%, ${top ? 30 : 38}%)`;
        g.beginPath(); g.arc(x, y, l.r * G.s, 0, U.TAU); g.fill();
      });
    }

    function branch(G) {
      const s = G.s, y = G.ny + 10 * G.m;
      g.fillStyle = '#7a4a26';
      g.beginPath();
      g.moveTo(-10, y - 26 * G.m);
      g.quadraticCurveTo(G.W * 0.5, y - 40 * G.m, G.W + 10, y - 10 * G.m);
      g.lineTo(G.W + 10, y + 30 * G.m);
      g.quadraticCurveTo(G.W * 0.5, y + 10 * G.m, -10, y + 22 * G.m);
      g.fill();
      g.strokeStyle = '#5a3417';
      g.lineWidth = 3 * s;
      for (let i = 0; i < 6; i++) {
        const x = G.W * (0.08 + i * 0.17);
        g.beginPath(); g.moveTo(x, y - 14 * G.m); g.quadraticCurveTo(x + 30 * s, y - 8 * G.m, x + 60 * s, y - 12 * G.m); g.stroke();
      }
      // a few leaves on the branch
      g.fillStyle = '#4c9a3c';
      [0.05, 0.38, 0.93].forEach((k, i) => {
        g.save();
        g.translate(G.W * k, y - 20 * G.m);
        g.rotate(-0.6 + i * 0.5);
        g.beginPath(); g.ellipse(0, -18 * G.m, 12 * G.m, 26 * G.m, 0, 0, U.TAU); g.fill();
        g.restore();
      });
    }

    function nest(G, back) {
      const m = G.m, w = G.EW * 0.85, x = G.nx, y = G.ny;
      if (back) {
        g.fillStyle = '#6b4320';
        g.beginPath(); g.ellipse(x, y - G.EH * 0.12, w * 1.05, G.EH * 0.1, 0, Math.PI, 0); g.fill();
        return;
      }
      g.fillStyle = '#9c6a36';
      g.beginPath();
      g.moveTo(x - w * 1.15, y - G.EH * 0.14);
      g.quadraticCurveTo(x, y - G.EH * 0.02, x + w * 1.15, y - G.EH * 0.14);
      g.quadraticCurveTo(x + w * 1.0, y + G.EH * 0.08, x, y + G.EH * 0.1);
      g.quadraticCurveTo(x - w * 1.0, y + G.EH * 0.08, x - w * 1.15, y - G.EH * 0.14);
      g.fill();
      g.lineCap = 'round';
      twigs.forEach(tw => {
        const cx = x + Math.cos(tw.a) * w * 0.95 * (tw.c < 0.5 ? 1 : -1) * 0.95, cy = y - G.EH * 0.02 + tw.o * G.EH * 0.2;
        g.strokeStyle = tw.c < 0.5 ? '#c08a4c' : '#5f3a1a';
        g.lineWidth = 4 * m;
        g.beginPath(); g.moveTo(cx - 40 * m * tw.l, cy - 8 * m); g.lineTo(cx + 40 * m * tw.l, cy + 8 * m * tw.o * 3); g.stroke();
      });
    }

    // ------------------------------------------------------------ the egg
    function egg(G, p, t, ft) {
      const m = G.m;
      // shell
      const grd = g.createRadialGradient(-G.EW * 0.15, -G.EH * 0.7, G.EW * 0.05, 0, -G.EH * 0.45, G.EW * 0.75);
      grd.addColorStop(0, '#fffdf4');
      grd.addColorStop(0.7, '#f6e8c8');
      grd.addColorStop(1, '#d9c39a');
      g.fillStyle = grd;
      eggPath(G);
      g.fill();
      g.strokeStyle = '#8a6a3c';
      g.lineWidth = 4 * m;
      g.stroke();
      g.save();
      eggPath(G);
      g.clip();
      spots.forEach(sp => {
        const [x, y] = ept(G, sp.x, sp.v);
        g.fillStyle = `hsla(${sp.hue}, 45%, 72%, 0.4)`;
        g.beginPath(); g.arc(x, y, sp.r * G.EW, 0, U.TAU); g.fill();
      });
      g.restore();
      // cracks
      const reach = U.lerp(0.02, 1, U.range(p, 0.01, 0.92)) * maxD;
      const glow = U.range(p, 0.75, 1);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      [['#fff3c4', 2.2, 1.2], ['#4a2c12', 1, 0]].forEach(([col, wk, off]) => {
        g.strokeStyle = glow > 0 && off === 0 ? '#4a2c12' : col;
        g.beginPath();
        cracks.forEach(c => {
          if (reach <= c.d0) return;
          const f = U.clamp((reach - c.d0) / (c.d1 - c.d0));
          const [x0, y0] = ept(G, c.x0, c.v0);
          const [x1, y1] = ept(G, U.lerp(c.x0, c.x1, f), U.lerp(c.v0, c.v1, f));
          g.moveTo(x0 + off * m, y0 + off * m); g.lineTo(x1 + off * m, y1 + off * m);
        });
        g.lineWidth = 6 * m * wk * (off ? 0.5 : 1);
        g.stroke();
      });
      if (glow > 0) {
        g.strokeStyle = `rgba(255,170,50,${glow * (0.5 + 0.4 * Math.sin(t * 7))})`;
        g.lineWidth = 2 * m;
        g.beginPath();
        cracks.forEach(c => {
          if (reach <= c.d1 || c.w < 1) return;
          const [x0, y0] = ept(G, c.x0, c.v0), [x1, y1] = ept(G, c.x1, c.v1);
          g.moveTo(x0, y0); g.lineTo(x1, y1);
        });
        g.stroke();
      }
      g.save();
      eggPath(G);
      g.clip();
      // holes chipped open
      holes.forEach((h, i) => {
        if (p < h.b) return;
        const k = U.easeOutBack(U.range(p, h.b, h.b + 0.015));
        const [cx, cy] = ept(G, h.x, h.v);
        g.fillStyle = '#2a1608';
        g.beginPath();
        h.pts.forEach((q, j) => {
          const r = h.r * G.EW * q.k * k;
          const x = cx + Math.cos(q.a) * r, y = cy + Math.sin(q.a) * r * 0.9;
          if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
        });
        g.closePath();
        g.fill();
        if (i === 0 && ft < 0) peekEye(cx, cy, h.r * G.EW * 0.55, t);
        if (i === 1 && ft < 0) {
          // something warm glows inside
          g.fillStyle = `rgba(255,140,40,${0.3 + 0.2 * Math.sin(t * 6)})`;
          g.beginPath(); g.arc(cx, cy, h.r * G.EW * 0.4, 0, U.TAU); g.fill();
        }
      });
      g.restore();
      // shine
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath(); g.ellipse(-G.EW * 0.22, -G.EH * 0.72, G.EW * 0.07, G.EH * 0.1, 0.4, 0, U.TAU); g.fill();
    }

    // A yellow reptile eye in the dark hole, looking around and blinking.
    function peekEye(x, y, r, t) {
      const cyc = t % 4.2;
      const open = cyc < 0.15 || (cyc > 2.1 && cyc < 2.25) ? 0.1 : 1;
      const look = Math.sin(t * 0.9) * 0.4;
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.ellipse(x, y, r, r * 0.8 * open, 0, 0, U.TAU); g.fill();
      if (open > 0.5) {
        g.fillStyle = '#111';
        g.beginPath(); g.ellipse(x + look * r, y, r * 0.18, r * 0.65, 0, 0, U.TAU); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(x + look * r - r * 0.3, y - r * 0.3, r * 0.15, 0, U.TAU); g.fill();
      }
    }

    function shardShape(x, y, sz, a) {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = '#f6e8c8';
      g.strokeStyle = '#8a6a3c';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-sz, -sz * 0.6); g.lineTo(sz * 0.2, -sz); g.lineTo(sz, -sz * 0.2); g.lineTo(sz * 0.4, sz * 0.8); g.lineTo(-sz * 0.7, sz * 0.5);
      g.closePath(); g.fill(); g.stroke();
      g.restore();
    }

    // Lower half of the shell with a zig-zag rim; also the top half (as a hat).
    function halfShell(G, top) {
      const m = G.m;
      g.fillStyle = '#f6e8c8';
      g.strokeStyle = '#8a6a3c';
      g.lineWidth = 4 * m;
      g.beginPath();
      const N = 10;
      if (!top) {
        const [lx, ly] = ept(G, -1, 0.1);
        g.moveTo(lx, ly);
        for (let i = 1; i <= N; i++) {
          const [x, y] = ept(G, -1 + (2 * i) / N, i % 2 ? -0.05 : 0.15);
          g.lineTo(x, y);
        }
        for (let i = 0; i <= 20; i++) {
          const v = U.lerp(0.1, 1, i / 20);
          const [x, y] = ept(G, 1, v);
          g.lineTo(x, y);
        }
        for (let i = 20; i >= 0; i--) {
          const v = U.lerp(0.1, 1, i / 20);
          const [x, y] = ept(G, -1, v);
          g.lineTo(x, y);
        }
      } else {
        const [lx, ly] = ept(G, -1, -0.2);
        g.moveTo(lx, ly);
        for (let i = 0; i <= 20; i++) {
          const v = U.lerp(-0.2, -1, i / 20);
          const [x, y] = ept(G, -1, v);
          g.lineTo(x, y);
        }
        for (let i = 20; i >= 0; i--) {
          const v = U.lerp(-0.2, -1, i / 20);
          const [x, y] = ept(G, 1, v);
          g.lineTo(x, y);
        }
        for (let i = N; i >= 0; i--) {
          const [x, y] = ept(G, -1 + (2 * i) / N, i % 2 ? -0.32 : -0.15);
          g.lineTo(x, y);
        }
      }
      g.closePath();
      g.fill();
      g.stroke();
    }

    // ------------------------------------------------------------ baby dragon
    function dragon(G, ft, t) {
      const m = G.m, D = G.EH * 0.62;
      const pop = U.easeOutBack(U.range(ft, 0.3, 0.8));
      const sneezeBuild = ft < 3.15 ? U.range(ft, 1.9, 3.15) : 0;
      const sneeze = ft > 3.15 && ft < 4.1;
      const roar = ft > 4.6 && ft < 5.35;
      const headBack = sneeze ? -0.15 + 0.1 * Math.sin(ft * 30) : sneezeBuild * 0.5 + Math.sin(ft * 25) * sneezeBuild * 0.04;
      const by = -G.EH * 0.2 - pop * D * 0.55 + (1 - pop) * D * 0.3;
      g.save();
      g.translate(0, by);
      // tail
      g.strokeStyle = '#3fa34d';
      g.lineWidth = D * 0.1;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(D * 0.2, D * 0.2); g.quadraticCurveTo(D * 0.6, D * 0.1 + Math.sin(t * 4) * D * 0.1, D * 0.55, -D * 0.2); g.stroke();
      g.fillStyle = '#e94b5b';
      g.beginPath(); g.moveTo(D * 0.55, -D * 0.32); g.lineTo(D * 0.65, -D * 0.15); g.lineTo(D * 0.45, -D * 0.15); g.fill();
      // wings flap
      const flap = Math.sin(t * 14) * 0.4;
      [-1, 1].forEach(d => {
        g.save();
        g.translate(d * D * 0.28, -D * 0.05);
        g.rotate(d * (-0.5 + flap));
        g.fillStyle = '#7b5bd6';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(d * D * 0.38, -D * 0.25); g.lineTo(d * D * 0.32, D * 0.0); g.lineTo(d * D * 0.4, D * 0.12); g.closePath(); g.fill();
        g.restore();
      });
      // body
      g.fillStyle = '#4cbf5a';
      g.beginPath(); g.ellipse(0, D * 0.1, D * 0.32, D * 0.36, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#ffe28a';
      g.beginPath(); g.ellipse(0, D * 0.16, D * 0.2, D * 0.26, 0, 0, U.TAU); g.fill();
      // arms waving
      g.strokeStyle = '#4cbf5a';
      g.lineWidth = D * 0.08;
      const wave = Math.sin(t * 10) * 0.6;
      g.beginPath(); g.moveTo(-D * 0.25, D * 0.0); g.lineTo(-D * 0.42, -D * 0.2 + wave * D * 0.1); g.stroke();
      g.beginPath(); g.moveTo(D * 0.25, D * 0.0); g.lineTo(D * 0.4, -D * 0.12 - wave * D * 0.1); g.stroke();
      // head
      g.save();
      g.translate(0, -D * 0.32);
      g.rotate(-headBack * 0.6 + (roar ? 0.18 : 0));
      g.translate(0, -D * headBack * 0.1);
      g.fillStyle = '#4cbf5a';
      g.beginPath(); g.ellipse(0, -D * 0.12, D * 0.34, D * 0.28, 0, 0, U.TAU); g.fill();
      // snout pointing left (toward mum)
      g.beginPath(); g.ellipse(-D * 0.3, -D * 0.02, D * 0.2, D * 0.14, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#2d7a37';
      const nos = 1 + sneezeBuild * 0.8;
      g.beginPath(); g.arc(-D * 0.42, -D * 0.06, D * 0.025 * nos, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(-D * 0.34, -D * 0.08, D * 0.025 * nos, 0, U.TAU); g.fill();
      // horns
      g.fillStyle = '#fff4c2';
      [-0.12, 0.14].forEach(hx => { g.beginPath(); g.moveTo(D * hx - D * 0.05, -D * 0.36); g.lineTo(D * hx, -D * 0.5); g.lineTo(D * hx + D * 0.05, -D * 0.36); g.fill(); });
      // eyes: big and shiny, squeezed shut while the sneeze builds
      const squint = sneezeBuild > 0.5 || sneeze;
      [-0.12, 0.1].forEach(ex => {
        if (squint) {
          g.strokeStyle = '#123';
          g.lineWidth = D * 0.025;
          g.beginPath(); g.moveTo(D * ex - D * 0.06, -D * 0.2); g.lineTo(D * ex + D * 0.04, -D * 0.16); g.lineTo(D * ex - D * 0.06, -D * 0.12); g.stroke();
          return;
        }
        const bl = (ft % 2.2) < 0.1 ? 0.1 : 1;
        g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(D * ex, -D * 0.17, D * 0.08, D * 0.1 * bl, 0, 0, U.TAU); g.fill();
        g.fillStyle = '#111';
        g.beginPath(); g.ellipse(D * ex - D * 0.02, -D * 0.16, D * 0.05, D * 0.07 * bl, 0, 0, U.TAU); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(D * ex - D * 0.04, -D * 0.2, D * 0.02, 0, U.TAU); g.fill();
      });
      // mouth
      g.fillStyle = '#7a1f2a';
      g.beginPath();
      if (sneeze) g.ellipse(-D * 0.36, D * 0.06, D * 0.1, D * 0.07, 0, 0, U.TAU);
      else if (roar) g.ellipse(-D * 0.34, D * 0.06, D * 0.13, D * 0.1 + Math.sin(ft * 40) * D * 0.015, 0, 0, U.TAU);
      else g.arc(-D * 0.28, D * 0.04, D * 0.05, 0, Math.PI);
      g.fill();
      // hat: the top of the shell lands on the head
      if (ft > 1.35) {
        g.save();
        g.translate(D * 0.02, -D * 0.12);
        const s2 = (D * 0.95) / G.EH;
        g.scale(s2, s2);
        g.rotate(0.15);
        g.translate(0, G.EH * 0.45);
        halfShell(G, true);
        g.restore();
      }
      g.restore();
      g.restore();
      return { mouthX: -D * 0.4, mouthY: by - D * 0.32 };
    }

    // ------------------------------------------------------------ mother bird
    function bird(G, p, t, ft) {
      const S = 125 * G.birdS;
      const fin = ft >= 0;
      const charred = fin && ft > 3.35;
      const pace = fin ? 0 : Math.sin(t * (0.9 + p * 1.2));
      const x = G.birdX + pace * G.birdRange;
      const face = fin ? 1 : Math.cos(t * (0.9 + p * 1.2)) > 0 ? 1 : -1;
      const hop = fin ? (ft < 0.9 ? Math.sin(U.clamp((ft - 0.3) / 0.6) * Math.PI) * S * 0.6 : 0) : Math.abs(Math.sin(t * 6)) * S * 0.06;
      const y = G.ny - 18 * G.m - hop;
      const nerv = fin ? 1 : U.range(p, 0.2, 0.95);
      g.save();
      g.translate(x, y);
      if (charred && ft < 4.5) g.translate(Math.sin(ft * 60) * 3 * G.s, 0);
      g.scale(face, 1);
      const body = charred ? '#3b3b40' : '#3d8bfd', belly = charred ? '#57575c' : '#ff9d5c';
      // legs
      g.strokeStyle = '#e8a33a';
      g.lineWidth = S * 0.05;
      g.lineCap = 'round';
      const step = fin ? 0 : Math.sin(t * 6) * S * 0.08;
      g.beginPath(); g.moveTo(-S * 0.1, -S * 0.3); g.lineTo(-S * 0.12 + step, 0); g.stroke();
      g.beginPath(); g.moveTo(S * 0.1, -S * 0.3); g.lineTo(S * 0.12 - step, 0); g.stroke();
      // tail
      g.fillStyle = body;
      g.beginPath(); g.moveTo(-S * 0.35, -S * 0.6); g.lineTo(-S * 0.75, -S * 0.85); g.lineTo(-S * 0.7, -S * 0.6); g.closePath(); g.fill();
      // body
      g.beginPath(); g.ellipse(0, -S * 0.65, S * 0.42, S * 0.4, 0, 0, U.TAU); g.fill();
      g.fillStyle = belly;
      g.beginPath(); g.ellipse(S * 0.12, -S * 0.55, S * 0.26, S * 0.26, 0, 0, U.TAU); g.fill();
      // head tuft: fewer feathers as stress mounts
      const tuft = charred ? 0 : Math.round(5 * (1 - p * 0.85));
      g.strokeStyle = body;
      g.lineWidth = S * 0.05;
      for (let i = 0; i < tuft; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.25;
        g.beginPath(); g.moveTo(S * 0.05, -S * 1.25); g.quadraticCurveTo(S * 0.05 + Math.cos(a) * S * 0.2, -S * 1.25 + Math.sin(a) * S * 0.25, S * 0.1 + Math.cos(a) * S * 0.25, -S * 1.25 + Math.sin(a) * S * 0.35); g.stroke();
      }
      // head
      g.fillStyle = body;
      g.beginPath(); g.arc(S * 0.12, -S * 1.05, S * 0.27, 0, U.TAU); g.fill();
      // beak (open in shock)
      g.fillStyle = charred ? '#888' : '#ffc23d';
      const open = fin && ft > 0.3 ? S * 0.08 : Math.max(0, Math.sin(t * 4)) * nerv * S * 0.04;
      g.beginPath(); g.moveTo(S * 0.34, -S * 1.1); g.lineTo(S * 0.58, -S * 1.04 + open * 0.2); g.lineTo(S * 0.34, -S * 1.0); g.fill();
      g.beginPath(); g.moveTo(S * 0.34, -S * 1.0 + open * 0.3); g.lineTo(S * 0.52, -S * 0.98 + open); g.lineTo(S * 0.34, -S * 0.93 + open * 0.5); g.fill();
      // eye
      const er = S * (0.07 + nerv * 0.04 + (fin && ft > 0.3 && !charred ? 0.04 : 0));
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(S * 0.22, -S * 1.1, er, 0, U.TAU); g.fill();
      g.fillStyle = '#111';
      const bl = (t % 3.3) < 0.12;
      if (bl || (charred && (ft % 1.2) < 0.15)) g.fillRect(S * 0.22 - er, -S * 1.1, er * 2, S * 0.02);
      else { g.beginPath(); g.arc(S * 0.23, -S * 1.1, er * 0.45, 0, U.TAU); g.fill(); }
      // worried brow
      g.strokeStyle = '#123';
      g.lineWidth = S * 0.035;
      g.beginPath(); g.moveTo(S * 0.12, -S * 1.2 - nerv * S * 0.03); g.lineTo(S * 0.3, -S * 1.24 + nerv * S * 0.04); g.stroke();
      // wing: wrings / covers eyes at high stress
      g.fillStyle = charred ? '#2a2a2e' : '#2f6fd6';
      const cover = !fin && p > 0.7 && (t % 5) < 1.4;
      g.save();
      g.translate(-S * 0.05, -S * 0.72);
      g.rotate(cover ? -2.2 : fin && ft > 0.3 && ft < 3.3 ? -1.6 + Math.sin(ft * 30) * 0.5 : -0.2 + Math.sin(t * (2 + 10 * nerv)) * 0.25 * nerv);
      g.beginPath(); g.ellipse(S * 0.2, 0, S * 0.32, S * 0.14, 0.2, 0, U.TAU); g.fill();
      g.restore();
      // sweat
      if (nerv > 0.3 && !charred) {
        g.fillStyle = 'rgba(120,200,255,0.9)';
        const k = (t * 1.5) % 1;
        g.beginPath(); g.arc(-S * 0.1, -S * 1.2 + k * S * 0.3, S * 0.04, 0, U.TAU); g.fill();
      }
      g.restore();
      return { x, y: y - S * 0.8, S, charred };
    }

    function addFeather(x, y, s, burst) {
      if (feathers.length > 60) feathers.shift();
      feathers.push({ x, y, vx: burst ? (Math.random() - 0.5) * 400 * s : (Math.random() - 0.5) * 30 * s, vy: burst ? -(150 + Math.random() * 300) * s : -20 * s, ph: Math.random() * U.TAU, life: 0, max: burst ? 5 : 4, sz: (10 + Math.random() * 6) * s, dark: burst });
    }

    function stepFeathers(G, dt) {
      for (let i = feathers.length - 1; i >= 0; i--) {
        const f = feathers[i];
        f.life += dt;
        if (f.life > f.max) { feathers.splice(i, 1); continue; }
        f.vx *= 0.97;
        f.vy = f.vy * 0.95 + 40 * G.s * dt * 20 * 0.05;
        f.x += (f.vx + Math.sin(f.life * 3 + f.ph) * 40 * G.s) * dt;
        f.y += f.vy * dt;
        g.save();
        g.translate(f.x, f.y);
        g.rotate(Math.sin(f.life * 3 + f.ph) * 0.8);
        g.globalAlpha = 1 - f.life / f.max;
        g.fillStyle = f.dark ? '#444' : '#7fb2ff';
        g.beginPath(); g.ellipse(0, 0, f.sz * 0.35, f.sz, 0, 0, U.TAU); g.fill();
        g.strokeStyle = '#fff';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, -f.sz); g.lineTo(0, f.sz * 1.3); g.stroke();
        g.globalAlpha = 1;
        g.restore();
      }
    }

    function stepFlames(G, dt) {
      for (let i = flames.length - 1; i >= 0; i--) {
        const f = flames[i];
        f.life += dt;
        if (f.life > f.max) { flames.splice(i, 1); continue; }
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy -= (f.smoke ? 60 : 30) * G.s * dt;
        const k = f.life / f.max;
        const r = Math.max(0.5, f.r * (f.smoke ? 1 + k * 2 : 1 + k));
        g.fillStyle = f.smoke ? `rgba(70,70,75,${0.5 * (1 - k)})` : k < 0.3 ? `rgba(255,240,150,${1 - k})` : k < 0.6 ? `rgba(255,150,40,${1 - k})` : `rgba(220,60,30,${1 - k})`;
        g.beginPath(); g.arc(f.x, f.y, r, 0, U.TAU); g.fill();
      }
    }

    function stepChips(G, dt, ox, oy) {
      for (let i = chips.length - 1; i >= 0; i--) {
        const c = chips[i];
        c.life += dt;
        if (c.life > 3) { chips.splice(i, 1); continue; }
        c.vy += 1500 * G.s * dt;
        c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.spin * dt;
        shardShape(ox + c.x, oy + c.y, c.sz, c.a);
      }
    }

    function banner(G, text, ft0, ft, color) {
      if (ft < ft0) return;
      const k = U.easeOutBack(U.clamp((ft - ft0) / 0.5));
      const px = Math.min(G.H * 0.15, (G.W * 0.9) / (text.length * 0.8));
      g.save();
      g.translate(G.W * 0.5, G.H * (G.land ? 0.14 : 0.12));
      g.rotate(-0.05 + Math.sin(ft * 3) * 0.03);
      g.scale(k, k);
      g.font = `${px}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = px * 0.14;
      g.lineJoin = 'round';
      g.strokeStyle = '#2a1608';
      g.strokeText(text, 0, 0);
      g.fillStyle = color;
      g.fillText(text, 0, 0);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        const s = G.s, fin = ft >= 0;

        // wobble grows with p, with nervous jolts later on
        const amp = 0.015 + 0.08 * Math.pow(p, 1.5);
        const jc = t % 2.7;
        const jolt = p > 0.45 && jc < 0.45 ? Math.sin(jc * 45) * 0.07 * p : 0;
        let rot = Math.sin(t * 2.3) * amp + jolt;
        let lift = p > 0.45 && jc < 0.45 ? Math.abs(Math.sin(jc * 22)) * 8 * s * p : 0;
        if (fin && ft < 0.3) { rot = Math.sin(ft * 70) * 0.12; lift = Math.abs(Math.sin(ft * 40)) * 14 * s; }

        sky(G, t);
        foliage(G, t, false);
        branch(G);
        nest(G, true);

        const ox = G.nx, oy = G.ny - G.EH * 0.08;
        let mouth = null;
        g.save();
        g.translate(ox, oy - lift);
        if (!fin || ft < 0.3) {
          g.rotate(rot);
          egg(G, fin ? 1 : p, t, ft);
          // chip particles when a hole opens
          holes.forEach(h => {
            if (!h.done && p >= h.b) {
              h.done = true;
              const [hx, hy] = ept(G, h.x, h.v);
              for (let i = 0; i < 6; i++) chips.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 300 * s, vy: -(100 + Math.random() * 200) * s, a: 0, spin: (Math.random() - 0.5) * 10, sz: (6 + Math.random() * 8) * G.m, life: 0 });
            }
            if (p < h.b) h.done = false;
          });
        } else {
          mouth = dragon(G, ft, t);
          halfShell(G, false);
        }
        g.restore();
        if (chips.length > 60) chips.splice(0, chips.length - 60);
        stepChips(G, dt, ox, oy);

        // smoke wisps from the cracks, foreshadowing what's inside
        if (!fin && p > 0.7) {
          smokeAcc += dt * (1 + 4 * p);
          while (smokeAcc > 1) {
            smokeAcc -= 1;
            if (flames.length < 220) flames.push({ x: ox + (Math.random() - 0.5) * G.EW * 0.6, y: oy - G.EH * (0.4 + Math.random() * 0.3), vx: (Math.random() - 0.5) * 20 * s, vy: -40 * s, r: 6 * s, life: 0, max: 1.6, smoke: true });
          }
        }

        nest(G, false);

        // flying shell shards when it bursts
        if (fin && ft > 0.3) {
          const k = ft - 0.3;
          shards.forEach(sh => {
            const [x0, y0] = ept(G, sh.x, sh.v);
            const x = ox + x0 + sh.vx * k * 500 * s;
            const y = oy + y0 + sh.vy * k * 700 * s + 0.5 * 1800 * s * k * k;
            if (y < G.H + 50) shardShape(x, y, sh.sz * G.EW * 0.5, sh.spin * k);
          });
          // top shell flies up and comes down onto the dragon's head
          if (ft < 1.35) {
            const k2 = U.range(ft, 0.3, 1.35);
            const hy = oy - G.EH * 0.2 - Math.sin(k2 * Math.PI) * G.H * 0.5 - k2 * G.EH * 0.55;
            g.save();
            g.translate(ox + Math.sin(k2 * Math.PI) * 40 * s, hy + G.EH * 0.2);
            g.rotate(k2 * U.TAU * 1.5);
            g.translate(0, G.EH * 0.6);
            halfShell(G, true);
            g.restore();
          }
          // burst flash
          const fl = 1 - U.range(ft, 0.3, 0.7);
          if (fl > 0) {
            const fr = G.EH * (0.6 + (1 - fl) * 0.9);
            const fg = g.createRadialGradient(ox, oy - G.EH * 0.5, 0, ox, oy - G.EH * 0.5, fr);
            fg.addColorStop(0, `rgba(255,250,210,${fl})`);
            fg.addColorStop(1, 'rgba(255,250,210,0)');
            g.fillStyle = fg;
            g.beginPath(); g.arc(ox, oy - G.EH * 0.5, fr, 0, U.TAU); g.fill();
          }
        }

        const b = bird(G, p, t, ft);

        // stress feathers, then a burst of singed ones when the fire hits
        if (!fin) {
          featherAcc += dt * (0.2 + p * 2.2);
          while (featherAcc > 1) { featherAcc -= 1; addFeather(b.x, b.y - b.S * 0.3, s, false); }
        } else if (ft > 3.35 && ft < 3.45) {
          for (let i = 0; i < 4; i++) addFeather(b.x, b.y - b.S * 0.2, s, true);
        }
        stepFeathers(G, dt);

        // ACHOO: fire blast toward mum
        if (fin && mouth && ft > 3.15 && ft < 4.0) {
          flameAcc += dt * 160;
          while (flameAcc > 1) {
            flameAcc -= 1;
            const mx = ox + mouth.mouthX, my = oy + mouth.mouthY;
            const tx = b.x - mx, ty = b.y - my;
            const d = Math.hypot(tx, ty) || 1;
            const v = (d / 0.55) * (0.8 + Math.random() * 0.4);
            if (flames.length > 220) flames.shift();
            flames.push({ x: mx, y: my, vx: (tx / d) * v + (Math.random() - 0.5) * 80 * s, vy: (ty / d) * v + (Math.random() - 0.5) * 120 * s, r: (8 + Math.random() * 12) * G.m, life: 0, max: 0.6 + Math.random() * 0.3 });
          }
        }
        // mum smoulders afterwards
        if (b.charred && ft < 8) {
          smokeAcc += dt * 8;
          while (smokeAcc > 1) {
            smokeAcc -= 1;
            if (flames.length > 220) flames.shift();
            flames.push({ x: b.x + (Math.random() - 0.5) * b.S * 0.5, y: b.y - b.S * 0.4, vx: (Math.random() - 0.5) * 20 * s, vy: -60 * s, r: 7 * s, life: 0, max: 1.8, smoke: true });
          }
        }
        stepFlames(G, dt);
        foliage(G, t, true);

        if (fin) {
          if (ft < 1.9) banner(G, 'SURPRISE!', 0.35, ft, '#ffd23f');
          else if (ft < 3.15) banner(G, 'AH... AH...', 1.9, ft, '#bdf27a');
          else if (ft < 5.6) banner(G, 'ACHOO!', 3.15, ft, '#ff7a3d');
          else banner(G, "IT'S A BOY!", 5.6, ft, '#8fe3ff');
          // tiny "peep" bubbles
          if (ft > 4.6 && ft < 5.6) {
            // the tiny roar of pride
            g.font = `${54 * G.m}px Bungee, sans-serif`;
            g.textAlign = 'center';
            g.lineWidth = 7 * G.m;
            g.strokeStyle = '#fff';
            const rx = Math.min(ox + G.EW * 0.85, G.W - 100 * G.m), ry = oy - G.EH * 0.6 + Math.sin(ft * 30) * 3 * s;
            g.strokeText('RAWR!', rx, ry);
            g.fillStyle = '#2d7a37';
            g.fillText('RAWR!', rx, ry);
          }
          if (ft > 0.8 && ft < 1.8) {
            g.font = `${44 * G.m}px Bungee, sans-serif`;
            g.textAlign = 'center';
            g.lineWidth = 6 * G.m;
            g.strokeStyle = '#fff';
            const py = oy - G.EH * 0.75 + Math.sin(ft * 10) * 4 * s;
            const qx = Math.min(ox + G.EW * 0.85, G.W - 90 * G.m);
            g.strokeText('PEEP!', qx, py + G.EH * 0.1);
            g.fillStyle = '#2a1608';
            g.fillText('PEEP!', qx, py + G.EH * 0.1);
          }
        }
      },

      finale() {
        // crunchy cracks
        [0, 0.12, 0.22].forEach((at, i) => {
          sfx.noise({ at, dur: 0.07, vol: 0.4, filter: 'bandpass', ff: 2500 + i * 600, q: 1.5, attack: 0.001, release: 0.06 });
          sfx.tone({ at, f: 900, to: 200, dur: 0.05, type: 'square', vol: 0.08, attack: 0.001 });
        });
        // the burst
        sfx.pop({ at: 0.3, vol: 0.5, f: 900 });
        sfx.noise({ at: 0.3, dur: 0.35, vol: 0.35, filter: 'highpass', ff: 1500, attack: 0.002, release: 0.3 });
        // peep peep
        [0.8, 1.0, 1.45, 1.6].forEach((at, i) => sfx.tone({ at, f: 2300 + (i % 2) * 300, to: 3000, glide: 0.08, dur: 0.11, type: 'sine', vol: 0.25, attack: 0.005, release: 0.05 }));
        // ah... ah...
        sfx.voice({ at: 1.9, f: 500, to: 650, dur: 0.45, vol: 0.22, formants: [[900, 1, 5], [1500, 0.6, 6], [2800, 0.3, 8]], attack: 0.08, release: 0.15 });
        sfx.voice({ at: 2.55, f: 560, to: 760, dur: 0.5, vol: 0.24, formants: [[900, 1, 5], [1500, 0.6, 6], [2800, 0.3, 8]], attack: 0.08, release: 0.15 });
        // ACHOO + fire roar
        sfx.voice({ at: 3.15, f: 700, to: 300, dur: 0.3, vol: 0.28, formants: [[500, 1, 4], [1000, 0.6, 5], [3000, 0.4, 3]], attack: 0.005, release: 0.12 });
        sfx.noise({ at: 3.15, dur: 0.25, vol: 0.4, filter: 'highpass', ff: 2500, attack: 0.002, release: 0.2 });
        sfx.noise({ at: 3.2, dur: 1.0, vol: 0.4, filter: 'lowpass', ff: 1200, ffTo: 300, attack: 0.02, release: 0.6 });
        // mum squawks
        sfx.voice({ at: 3.45, f: 900, to: 1300, dur: 0.25, vol: 0.25, formants: [[1200, 1, 6], [2400, 0.6, 7]], attack: 0.005 });
        // tiny squeaky roar of pride
        sfx.voice({ at: 4.6, f: 620, to: 420, dur: 0.75, vol: 0.28, formants: [[1100, 1, 4], [2200, 0.7, 5], [3400, 0.3, 6]], attack: 0.03, release: 0.3, vib: { rate: 22, depth: 40 } });
      },

      destroy() {},
    };
  },
});
