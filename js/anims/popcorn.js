// Microwave Popcorn: a popcorn bag spins and swells inside a humming microwave; the display bar fills up.
// Progress = the display's progress bar (and how inflated the bag is / how often kernels pop).
Minutka.register({
  id: 'popcorn',
  name: 'Microwave Popcorn',
  emoji: '🍿',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(404);
    const TAU = U.TAU;

    const CORN = '#fff4d8', CORN_D = '#e2bf7a', BUTTER = '#ffd35c';
    const pops = [];      // flashes on the bag
    const loose = [];     // escaped kernels bouncing inside the oven
    const flying = [];    // finale avalanche kernels
    let popAcc = 0, flyAcc = 0;
    const scallops = Array.from({ length: 80 }, () => ({ dy: R(), r: 0.8 + R() * 0.5 }));
    const texture = Array.from({ length: 90 }, () => ({ x: R(), y: R(), r: 0.6 + R() * 0.8, rot: R() * TAU, butter: R() < 0.25 }));

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const counterY = H * 0.8;
      const mw = Math.min(W * 0.9, 760 * s), mh = mw * 0.56;
      const mx = (W - mw) / 2, my = counterY - mh - 10 * s;
      const win = { x: mx + mw * 0.06, y: my + mh * 0.12, w: mw * 0.58, h: mh * 0.76 };
      const panel = { x: mx + mw * 0.73, y: my + mh * 0.06, w: mw * 0.23, h: mh * 0.88 };
      return { W, H, s, counterY, mw, mh, mx, my, win, panel, u: mw / 760 };
    }

    // ------------------------------------------------------------ kitchen
    function kitchen(G, t) {
      const s = G.s;
      g.fillStyle = '#ffd2ad';
      g.fillRect(0, 0, G.W, G.counterY);
      g.strokeStyle = '#f0bb90';
      g.lineWidth = 3 * s;
      g.beginPath();
      const ts = 60 * s;
      for (let x = 0; x < G.W; x += ts) { g.moveTo(x, 0); g.lineTo(x, G.counterY); }
      for (let y = G.counterY; y > 0; y -= ts) { g.moveTo(0, y); g.lineTo(G.W, y); }
      g.stroke();
      // counter
      g.fillStyle = '#8b5e3c';
      g.fillRect(0, G.counterY, G.W, G.H - G.counterY);
      g.fillStyle = '#e9d3b4';
      g.fillRect(0, G.counterY, G.W, 22 * s);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(0, G.counterY + 22 * s, G.W, 6 * s);
      g.fillStyle = '#7a5234';
      for (let x = 20 * s; x < G.W; x += 220 * s) {
        g.fillRect(x, G.counterY + 44 * s, 190 * s, G.H);
        g.fillStyle = '#c9a36b';
        g.fillRect(x + 80 * s, G.counterY + 60 * s, 30 * s, 6 * s);
        g.fillStyle = '#7a5234';
      }
    }

    // ------------------------------------------------------------ popcorn bits
    function kernelPath(x, y, r, rot) {
      const c = Math.cos(rot), sn = Math.sin(rot);
      [[0, 0, 1], [0.75, -0.35, 0.8], [-0.65, -0.45, 0.78], [0.05, -0.95, 0.72]].forEach(([dx, dy, k]) => {
        const px = x + (dx * c - dy * sn) * r, py = y + (dx * sn + dy * c) * r;
        g.moveTo(px + r * k, py);
        g.arc(px, py, r * k, 0, TAU);
      });
    }

    // Draw a batch of popcorn {x, y, r(rotation), k?(size), butter?}: shadow pass, body pass, butter dots.
    function kernels(list, size, off, dy) {
      if (!list.length) return;
      // one small path per kernel: big multi-contour paths are slow to rasterize
      g.fillStyle = CORN_D;
      list.forEach(q => { g.beginPath(); kernelPath(q.x + off, q.y + dy + off, size * (q.k || 1), q.r); g.fill(); });
      g.fillStyle = CORN;
      list.forEach(q => { g.beginPath(); kernelPath(q.x, q.y + dy, size * (q.k || 1), q.r); g.fill(); });
      g.beginPath();
      list.forEach(q => {
        if (!q.butter) return;
        const r = size * (q.k || 1) * 0.28;
        g.moveTo(q.x + r, q.y + dy); g.arc(q.x, q.y + dy, r, 0, TAU);
      });
      g.fillStyle = BUTTER;
      g.fill();
    }

    function burst(x, y, r, a) {
      g.strokeStyle = `rgba(255,255,255,${a})`;
      g.lineWidth = Math.max(1, r * 0.18);
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * TAU;
        g.moveTo(x + Math.cos(an) * r * 0.4, y + Math.sin(an) * r * 0.4);
        g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r);
      }
      g.stroke();
    }

    // ------------------------------------------------------------ the bag
    // Bag standing on the plate at (cx, by). spin = turntable angle, p = inflation.
    function bag(G, cx, by, p, spin, t, hop) {
      const u = G.u;
      const face = Math.cos(spin);
      const fx = 0.3 + 0.7 * Math.abs(face);
      const w = G.win.w * U.lerp(0.36, 0.42, p), h = G.win.h * U.lerp(0.22, 0.66, p);
      const bulge = U.lerp(0.02, 0.18, p) * w;
      g.save();
      g.translate(cx, by - hop);
      g.scale(fx, 1);
      const shape = () => {
        g.beginPath();
        g.moveTo(-w / 2, 0);
        g.quadraticCurveTo(-w / 2 - bulge, -h / 2, -w / 2 + bulge * 0.3, -h);
        g.lineTo(w / 2 - bulge * 0.3, -h);
        g.quadraticCurveTo(w / 2 + bulge, -h / 2, w / 2, 0);
        g.quadraticCurveTo(0, bulge * 0.4, -w / 2, 0);
        g.closePath();
      };
      shape();
      g.fillStyle = face > 0 ? '#e63946' : '#c92f3b';
      g.fill();
      g.save();
      g.clip();
      // stripes
      g.fillStyle = face > 0 ? '#fff3e0' : '#f1dccb';
      for (let x = -w; x < w; x += w / 4) g.fillRect(x + w / 16, -h - 10, w / 8, h + 20);
      // crinkle lines while still flat
      g.strokeStyle = `rgba(0,0,0,${0.25 * (1 - p)})`;
      g.lineWidth = 2 * u;
      g.beginPath();
      for (let i = 1; i < 4; i++) { g.moveTo(-w / 2, -h * i / 4); g.lineTo(-w / 4, -h * i / 4 - 6 * u); g.lineTo(0, -h * i / 4); g.lineTo(w / 4, -h * i / 4 - 6 * u); g.lineTo(w / 2, -h * i / 4); }
      g.stroke();
      g.restore();
      // sealed top
      g.fillStyle = '#b82633';
      g.fillRect(-w / 2 + bulge * 0.3, -h - 8 * u, w - bulge * 0.6, 12 * u);
      if (face > 0) {
        // mascot label with a face that gets more and more alarmed
        const lr = Math.min(w * 0.34, h * 0.36), ly = -h * 0.5;
        g.fillStyle = '#ffd35c';
        g.beginPath(); g.arc(0, ly, lr, 0, TAU); g.fill();
        g.strokeStyle = '#7a3a00';
        g.lineWidth = 3 * u;
        g.stroke();
        const alarm = U.range(p, 0.55, 1);
        const er = lr * U.lerp(0.13, 0.22, alarm);
        [-1, 1].forEach(d => {
          const ex = d * lr * 0.36, ey = ly - lr * 0.15;
          if (p < 0.2) {
            g.beginPath(); g.moveTo(ex - er, ey); g.lineTo(ex + er, ey); g.stroke();
          } else {
            g.fillStyle = '#fff';
            g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill(); g.stroke();
            g.fillStyle = '#2a1600';
            g.beginPath(); g.arc(ex + Math.sin(t * 3) * er * 0.3, ey, er * U.lerp(0.55, 0.35, alarm), 0, TAU); g.fill();
          }
        });
        // mouth: content -> puffed cheeks -> "O"
        g.fillStyle = '#7a1a1a';
        if (alarm > 0.5) {
          g.beginPath(); g.ellipse(0, ly + lr * 0.42, lr * 0.16, lr * 0.2 * (1 + Math.sin(t * 9) * 0.15), 0, 0, TAU); g.fill();
        } else {
          g.beginPath(); g.arc(0, ly + lr * 0.25, lr * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
        }
        g.fillStyle = `rgba(255,90,90,${0.3 + alarm * 0.5})`;
        [-1, 1].forEach(d => { g.beginPath(); g.ellipse(d * lr * 0.62, ly + lr * 0.25, lr * 0.18 * (1 + alarm * 0.6), lr * 0.12 * (1 + alarm * 0.6), 0, 0, TAU); g.fill(); });
        if (alarm > 0.2) {
          const q = (t * 1.4) % 1;
          g.fillStyle = `rgba(110,200,255,${(1 - q) * alarm})`;
          const sx = lr * 0.95, sy = ly - lr * 0.5 + q * lr;
          g.beginPath(); g.moveTo(sx, sy - 9 * u); g.quadraticCurveTo(sx + 7 * u, sy, sx, sy + 5 * u); g.quadraticCurveTo(sx - 7 * u, sy, sx, sy - 9 * u); g.fill();
        }
      }
      g.restore();
      return { w: w * fx, h };
    }

    // ------------------------------------------------------------ microwave
    function oven(G, p, t, ft, dt) {
      const s = G.s, u = G.u, W = G.win;
      const shake = (Math.pow(p, 3) * 2 + (ft >= 0 && ft < 1.4 ? 3 : 0)) * u;
      const ox = Math.sin(t * 47) * shake, oy = Math.cos(t * 39) * shake * 0.5;
      g.save();
      g.translate(ox, oy);
      // body
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.beginPath(); g.ellipse(G.mx + G.mw / 2, G.counterY + 4 * s, G.mw * 0.52, 12 * s, 0, 0, TAU); g.fill();
      g.fillStyle = '#e8ebef';
      g.beginPath(); g.roundRect(G.mx, G.my, G.mw, G.mh, 26 * u); g.fill();
      g.fillStyle = '#cfd4db';
      g.fillRect(G.mx + G.mw * 0.71, G.my + 10 * u, 4 * u, G.mh - 20 * u);
      g.fillStyle = '#9aa1ab';
      [0.2, 0.8].forEach(k => g.fillRect(G.mx + G.mw * k - 20 * u, G.my + G.mh, 40 * u, 10 * s));
      // vents
      g.fillStyle = '#b6bcc5';
      for (let i = 0; i < 6; i++) g.fillRect(G.mx + G.mw * 0.76 + i * 22 * u, G.my + 16 * u, 10 * u, 4 * u);
      g.restore();

      cavity(G, p, t, ft, dt, ox, oy);
      door(G, p, t, ft, ox, oy);
      panel(G, p, t, ft, ox, oy);
    }

    // inside of the oven: glow, turntable, bag, pops, loose kernels
    function cavity(G, p, t, ft, dt, ox, oy) {
      const u = G.u, W = G.win;
      const x = W.x + ox, y = W.y + oy;
      g.save();
      g.beginPath(); g.roundRect(x, y, W.w, W.h, 16 * u); g.clip();
      const hum = 0.9 + Math.sin(t * 31) * 0.04 + Math.sin(t * 7.3) * 0.05;
      const grd = g.createRadialGradient(x + W.w / 2, y + W.h * 0.45, 10, x + W.w / 2, y + W.h * 0.5, W.w * 0.65);
      grd.addColorStop(0, `rgba(255,236,160,${hum})`);
      grd.addColorStop(1, `rgba(214,132,40,${hum})`);
      g.fillStyle = grd;
      g.fillRect(x, y, W.w, W.h);
      // turntable
      const cx = x + W.w / 2, py = y + W.h * 0.86, rx = W.w * 0.4, ry = 16 * u;
      const spinning = ft < 0 || ft < 1.3;
      const spin = t * 0.9;
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.beginPath(); g.ellipse(cx, py, rx, ry, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(120,70,20,0.35)';
      for (let i = 0; i < 6; i++) {
        const a = spin + (i * TAU) / 6;
        if (Math.sin(a) < 0) continue;
        g.beginPath(); g.arc(cx + Math.cos(a) * rx * 0.85, py + Math.sin(a) * ry * 0.7, 4 * u, 0, TAU); g.fill();
      }
      if (ft < 1.3) {
        // pops: rate climbs steeply with progress
        const rate = ft >= 0 ? 30 : 0.15 + 16 * Math.pow(p, 2.4);
        popAcc += rate * dt;
        while (popAcc > 1) {
          popAcc -= 1;
          if (pops.length < 40) pops.push({ x: Math.random() - 0.5, y: Math.random(), age: 0 });
          if (p > 0.35 && Math.random() < 0.35 && loose.length < 24) {
            loose.push({ x: cx + (Math.random() - 0.5) * W.w * 0.2, y: py - W.h * 0.5 * p, vx: (Math.random() - 0.5) * 300 * u, vy: -(200 + Math.random() * 250) * u, r: Math.random() * TAU, life: 0 });
          }
        }
        let hop = 0;
        for (let i = pops.length - 1; i >= 0; i--) {
          pops[i].age += dt;
          if (pops[i].age > 0.25) { pops.splice(i, 1); continue; }
          hop = Math.max(hop, (1 - pops[i].age / 0.12) * 7 * u);
        }
        const sz = bag(G, cx, py, Math.min(1, p + (ft >= 0 ? ft * 0.15 : 0)), spinning ? spin : 0, t, Math.max(0, hop));
        pops.forEach(q => burst(cx + q.x * sz.w * 0.9, py - q.y * sz.h, (10 + q.age * 60) * u, 1 - q.age / 0.25));
      }
      // loose kernels bounce around the cavity
      const floor = py;
      for (let i = loose.length - 1; i >= 0; i--) {
        const k = loose[i];
        k.life += dt;
        if (k.life > 4 || ft >= 1.3) { loose.splice(i, 1); continue; }
        k.vy += 900 * u * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.r += k.vx * 0.01 * dt;
        if (k.y > floor) { k.y = floor; k.vy *= -0.45; k.vx *= 0.8; }
        if (k.x < x + 10 * u || k.x > x + W.w - 10 * u) k.vx *= -1;
      }
      kernels(loose, 9 * u, 1.5 * u, -6 * u);
      // once the door is open the cavity is a fountain of popcorn
      if (ft >= 1.3) {
        const pile = [];
        for (let i = 0; i < 26; i++) pile.push({ x: x + ((i * 37) % 100) / 100 * W.w, y: y + W.h - ((i * 53) % 60) / 100 * W.h * (0.6 + U.range(ft, 1.3, 2.5) * 0.6), r: i });
        kernels(pile, 18 * u, 3 * u, 0);
      }
      g.restore();
    }

    function door(G, p, t, ft, ox, oy) {
      const u = G.u;
      const x0 = G.mx + 8 * u + ox, y0 = G.my + 8 * u + oy, dw = G.mw * 0.69, dh = G.mh - 16 * u;
      const open = ft >= 1.3 ? U.easeOutBack(U.range(ft, 1.3, 1.65)) * 1.9 : 0;
      const W = G.win;
      if (open <= 0) {
        // glass sheen + mesh dots over the window
        g.save();
        g.beginPath(); g.roundRect(W.x + ox, W.y + oy, W.w, W.h, 16 * u); g.clip();
        g.fillStyle = 'rgba(30,20,10,0.12)';
        for (let yy = W.y + oy; yy < W.y + oy + W.h; yy += 12 * u) g.fillRect(W.x + ox, yy, W.w, 3 * u);
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.beginPath(); g.moveTo(W.x + ox + W.w * 0.1, W.y + oy); g.lineTo(W.x + ox + W.w * 0.3, W.y + oy); g.lineTo(W.x + ox + W.w * 0.05, W.y + oy + W.h); g.lineTo(W.x + ox - W.w * 0.15, W.y + oy + W.h); g.fill();
        g.restore();
        g.strokeStyle = '#2b2f36';
        g.lineWidth = 14 * u;
        g.beginPath(); g.roundRect(W.x + ox - 7 * u, W.y + oy - 7 * u, W.w + 14 * u, W.h + 14 * u, 20 * u); g.stroke();
        // handle
        g.fillStyle = '#9aa1ab';
        g.beginPath(); g.roundRect(x0 + dw - 26 * u, y0 + dh * 0.25, 14 * u, dh * 0.5, 7 * u); g.fill();
        // sticky note
        g.save();
        g.translate(W.x + ox + W.w * 0.06, W.y + oy + W.h * 0.08);
        g.rotate(-0.12 + Math.sin(t * 2) * 0.02);
        g.fillStyle = '#fff176';
        g.fillRect(0, 0, 92 * u, 56 * u);
        g.fillStyle = '#4a3b00';
        g.font = `${15 * u}px Bungee, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('NO', 46 * u, 18 * u);
        g.fillText('METAL!', 46 * u, 38 * u, 84 * u);
        g.restore();
        return;
      }
      // swung-open door as a perspective quad hinged on the left
      const ex = x0 + dw * Math.cos(open), grow = Math.sin(open) * dh * 0.14;
      g.fillStyle = '#d4d9df';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(ex, y0 - grow); g.lineTo(ex, y0 + dh + grow); g.lineTo(x0, y0 + dh); g.closePath(); g.fill();
      g.strokeStyle = '#2b2f36';
      g.lineWidth = 4 * u;
      g.stroke();
      const ix = U.lerp(x0, ex, 0.1), jx = U.lerp(x0, ex, 0.86);
      const ig = grow * 0.1, jg = grow * 0.86;
      g.fillStyle = 'rgba(40,30,20,0.75)';
      g.beginPath(); g.moveTo(ix, y0 + dh * 0.12 - ig); g.lineTo(jx, y0 + dh * 0.12 - jg); g.lineTo(jx, y0 + dh * 0.88 + jg); g.lineTo(ix, y0 + dh * 0.88 + ig); g.closePath(); g.fill();
    }

    function panel(G, p, t, ft, ox, oy) {
      const u = G.u, P = G.panel;
      const x = P.x + ox, y = P.y + oy;
      // display
      const dx = x + P.w * 0.06, dy = y + 10 * u, dw = P.w * 0.88, dh = P.h * 0.3;
      g.fillStyle = '#10241a';
      g.beginPath(); g.roundRect(dx, dy, dw, dh, 10 * u); g.fill();
      const beepOn = ft >= 0 && Math.floor(ft * 5) % 2 === 0;
      const lit = '#6dff9a';
      if (ft < 0 || ft > 2.2) {
        // progress bar with segment gaps
        const bx = dx + 12 * u, by = dy + dh * 0.22, bw = dw - 24 * u, bh = dh * 0.36;
        g.fillStyle = 'rgba(109,255,154,0.14)';
        g.fillRect(bx, by, bw, bh);
        g.fillStyle = lit;
        g.fillRect(bx, by, bw * (ft >= 0 ? 1 : p), bh);
        g.fillStyle = '#10241a';
        for (let i = 1; i < 10; i++) g.fillRect(bx + (bw * i) / 10 - 1.5 * u, by, 3 * u, bh);
        // animated dots
        for (let i = 0; i < 5; i++) {
          const on = (Math.floor(t * 4) % 5) === i;
          g.fillStyle = on ? lit : 'rgba(109,255,154,0.25)';
          g.beginPath(); g.arc(dx + dw * (0.3 + i * 0.1), dy + dh * 0.78, 4.5 * u, 0, TAU); g.fill();
        }
      } else if (beepOn) {
        g.fillStyle = lit;
        g.font = `${dh * 0.5}px Bungee, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('BEEP', dx + dw / 2, dy + dh / 2, dw * 0.9);
      }
      // buttons (blank) + big start button + dial
      g.fillStyle = '#c3c9d1';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        g.beginPath(); g.roundRect(x + P.w * (0.08 + c * 0.3), y + P.h * (0.38 + r * 0.11), P.w * 0.24, P.h * 0.08, 6 * u); g.fill();
      }
      g.fillStyle = '#34c37a';
      g.beginPath(); g.roundRect(x + P.w * 0.08, y + P.h * 0.72, P.w * 0.84, P.h * 0.1, 8 * u); g.fill();
      const kx = x + P.w * 0.5, ky = y + P.h * 0.93, kr = Math.min(P.w * 0.2, P.h * 0.06);
      g.fillStyle = '#7d8590';
      g.beginPath(); g.arc(kx, ky, kr, 0, TAU); g.fill();
      g.strokeStyle = '#e8ebef';
      g.lineWidth = 4 * u;
      const ka = -Math.PI / 2 + p * TAU * 0.8;
      g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.cos(ka) * kr * 0.8, ky + Math.sin(ka) * kr * 0.8); g.stroke();
    }

    function steam(G, p, t) {
      const u = G.u;
      const a = 0.35 + 0.6 * p;
      g.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const q = (t * 0.4 + i / 5) % 1;
        const x = G.mx + G.mw * (0.78 + i * 0.04), y = G.my + 10 * u - q * 160 * u;
        g.strokeStyle = `rgba(255,255,255,${a * Math.sin(q * Math.PI)})`;
        g.lineWidth = (10 + q * 14) * u;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + 18 * u, y - 20 * u, x - 18 * u, y - 40 * u, x + Math.sin(t + i) * 10 * u, y - 60 * u);
        g.stroke();
      }
    }

    // ------------------------------------------------------------ finale: the avalanche
    function floodLevel(G, ft) {
      return U.lerp(G.H + 60 * G.s, -60 * G.s, U.easeInOut(U.range(ft, 1.5, 6)));
    }

    function avalanche(G, ft, t, dt) {
      const s = G.s, level = floodLevel(G, ft);
      // kernels erupt from the open door
      if (ft >= 1.3 && ft < 6.5) {
        flyAcc += dt * (ft < 3 ? 160 : 70);
        while (flyAcc > 1) {
          flyAcc -= 1;
          if (flying.length >= 160) continue;
          const W = G.win;
          flying.push({
            x: W.x + Math.random() * W.w, y: W.y + W.h * (0.3 + Math.random() * 0.6),
            vx: (Math.random() * 1.6 - 0.5) * 520 * s, vy: -(250 + Math.random() * 650) * s,
            k: (14 + Math.random() * 12) * s, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, butter: Math.random() < 0.3,
          });
        }
      }
      // the rising sea of popcorn
      if (level < G.H) {
        g.fillStyle = CORN;
        g.fillRect(0, level, G.W, G.H - level);
        g.beginPath();
        const step = 38 * s;
        for (let i = 0, x = -10; x < G.W + step && i < scallops.length; i++, x += step) {
          const sc = scallops[i], r = 30 * s * sc.r, yy = level + (sc.dy - 0.5) * 18 * s + Math.sin(t * 2 + i) * 3 * s;
          g.moveTo(x + r, yy); g.arc(x, yy, r, 0, TAU);
        }
        g.fill();
        const lumps = texture.map(q => ({ x: q.x * G.W, y: level + 30 * s + q.y * (G.H - level), r: q.rot, k: q.r, butter: q.butter }));
        kernels(lumps, 20 * s, 4 * s, 0);
      }
      // flying kernels, absorbed when they land in the sea
      for (let i = flying.length - 1; i >= 0; i--) {
        const k = flying[i];
        k.vy += 1100 * s * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.r += k.vr * dt;
        if ((k.vy > 0 && k.y > level + 10 * s) || k.x < -60 || k.x > G.W + 60) flying.splice(i, 1);
      }
      kernels(flying, 1, 3 * s, 0);
      return level;
    }

    // the empty bag happily surfs on top of the popcorn
    function surfer(G, level, ft, t) {
      if (ft < 3) return;
      const s = G.s, k = U.easeOutBack(U.range(ft, 3, 3.6));
      // rides the surface, then bobs in front of the popcorn once the screen is full
      const x = G.W * 0.5 + Math.sin(t * 0.8) * G.W * 0.18, y = Math.max(level - 6 * s, G.H * 0.66) + Math.sin(t * 2.4) * 6 * s;
      g.save();
      g.translate(x, y);
      g.rotate(Math.sin(t * 2.4) * 0.15);
      g.scale(k * s * 0.95, k * s * 0.95);
      g.fillStyle = '#e63946';
      g.beginPath(); g.moveTo(-50, 0); g.lineTo(-44, -90); g.lineTo(44, -90); g.lineTo(50, 0); g.closePath(); g.fill();
      g.fillStyle = '#fff3e0';
      [-30, -6, 18].forEach(xx => g.fillRect(xx, -90, 12, 90));
      g.fillStyle = '#ffd35c';
      g.beginPath(); g.arc(0, -50, 26, 0, TAU); g.fill();
      g.strokeStyle = '#7a3a00'; g.lineWidth = 3;
      g.stroke();
      [-9, 9].forEach(d => { g.beginPath(); g.arc(d, -54, 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); });
      g.fillStyle = '#7a1a1a';
      g.beginPath(); g.arc(0, -42, 10, 0, Math.PI); g.closePath(); g.fill();
      // little arms waving
      g.strokeStyle = '#e63946'; g.lineWidth = 6; g.lineCap = 'round';
      const wv = Math.sin(t * 8) * 0.5;
      [-1, 1].forEach(d => { g.beginPath(); g.moveTo(d * 46, -50); g.lineTo(d * (70 + wv * 10), -90 - wv * d * 12); g.stroke(); });
      g.restore();
    }

    function bigText(G, text, x, y, ft0, ft, col, size) {
      if (ft < ft0) return;
      const k = U.easeOutBack(U.range(ft, ft0, ft0 + 0.3));
      g.save();
      g.translate(x, y);
      g.rotate(-0.06 + Math.sin(ft * 5) * 0.04);
      g.scale(k, k);
      g.font = `${size * G.s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = size * 0.16 * G.s;
      g.strokeStyle = '#3a1c00';
      g.strokeText(text, 0, 0, G.W * 0.92);
      g.fillStyle = col;
      g.fillText(text, 0, 0, G.W * 0.92);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        kitchen(G, t);
        steam(G, p, t);
        oven(G, p, t, ft, dt);
        if (ft >= 0) {
          // three beeps, each with its own speech burst
          [0, 0.4, 0.8].forEach((at, i) => {
            if (ft >= at && ft < 1.5) bigText(G, 'BEEP!', G.win.x + G.win.w * (0.25 + i * 0.25), G.win.y + G.win.h * (0.2 + i * 0.25), at, ft, '#6dff9a', 70);
          });
          const level = avalanche(G, ft, t, dt);
          surfer(G, level, ft, t);
          bigText(G, 'POPCALYPSE!', G.W / 2, Math.max(G.H * 0.24, Math.min(G.H * 0.5, level - 250 * G.s)), 1.6, ft, '#ffd35c', 80);
        }
      },

      finale() {
        // Three microwave beeps.
        [0, 0.4, 0.8].forEach(at => sfx.tone({ f: 2000, type: 'square', at, dur: 0.24, vol: 0.11, attack: 0.005, release: 0.03 }));
        // Door bursts: a soft whump.
        sfx.noise({ at: 1.3, dur: 0.5, vol: 0.35, filter: 'lowpass', ff: 1400, ffTo: 120, attack: 0.005, release: 0.4 });
        sfx.tone({ f: 140, to: 50, at: 1.3, dur: 0.3, vol: 0.35, attack: 0.005 });
        // Rapid popping crackle that thins out.
        const R2 = U.rng(77);
        for (let i = 0; i < 44; i++) {
          const k = R2();
          sfx.pop({ at: 1.25 + k * k * 3.2, vol: 0.12 + R2() * 0.16, f: 900 + R2() * 1800 });
        }
      },

      destroy() { pops.length = 0; loose.length = 0; flying.length = 0; },
    };
  },
});
