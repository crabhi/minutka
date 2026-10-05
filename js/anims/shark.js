// Jaws of Time: a shark fin glides across the sea toward a carefree swimmer on a rubber ring.
// Progress = how close the fin has crept to the swimmer.
Minutka.register({
  id: 'shark',
  name: 'Jaws of Time',
  emoji: '🦈',
  create(stage, sfx) {
    const U = Minutka.util;
    const TAU = U.TAU;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(1975);
    const SKIN = '#f4bb8f';

    // Finale timeline (seconds after time-up). Picture and sound both read these.
    const LEAP = 1.5;     // the da-dums end, the shark bursts out of the water
    const CHOMP = 1.8;    // jaws snap shut on the rubber ring
    const FALL = 2.45;    // shark's nose hits the water again
    const SPLASH = 3.6;   // swimmer lands head first
    const RESURF = 4.0;   // shark pops its head up, chewing the ring
    const POPUP = 4.3;    // swimmer surfaces, soaked
    const SWIM = 4.9;     // ...and windmills away
    const GLASSES = 5.0;  // the swimmer's sunglasses land on the shark

    // Static scenery in normalized coordinates.
    const clouds = Array.from({ length: 5 }, () => ({ x: R(), y: 0.12 + R() * 0.4, s: 0.6 + R() * 0.6, v: 0.004 + R() * 0.006 }));
    const gulls = Array.from({ length: 3 }, () => ({ x: R(), y: 0.2 + R() * 0.35, v: 0.02 + R() * 0.02, ph: R() * 6, k: 0.8 + R() * 0.4 }));
    const fish = Array.from({ length: 6 }, () => ({
      x: R(), y: R(), v: 0.015 + R() * 0.03, dir: R() < 0.5 ? -1 : 1, ph: R() * 6, hue: [20, 45, 330, 190][Math.floor(R() * 4)], k: 0.7 + R() * 0.5,
    }));
    const weeds = Array.from({ length: 16 }, () => ({ x: R(), h: 0.5 + R() * 0.6, ph: R() * 6, hue: 110 + R() * 50 }));

    const drops = [];   // splash droplets (capped)
    const puffs = [];   // air hissing out of the punctured ring (capped)
    const ripples = []; // rings spreading on the surface (capped)
    let lastFt = -1, sprayAcc = 0, rippleAcc = 0, puffAcc = 0;

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 800, H / 600);
      const port = H > W * 1.1;
      const waterY = H * (port ? 0.46 : 0.5);
      const swimX = W * (port ? 0.74 : 0.8);
      return {
        W, H, s, port, waterY, swimX,
        k: s * 0.95,                 // shark scale
        sw: s * 1.05,                // swimmer scale
        finStart: W * 0.07,
        finEnd: swimX - 175 * s,
        landX: W * (port ? 0.3 : 0.42),
      };
    }

    const wave = (x, t, G) => G.waterY + Math.sin(x / (70 * G.s) + t * 1.6) * 5 * G.s + Math.sin(x / (29 * G.s) - t * 2.4) * 2.2 * G.s;

    function circ(x, y, r) {
      g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); g.fill();
    }

    function toWorld(P, lx, ly) {
      const c = Math.cos(P.ang), n = Math.sin(P.ang);
      return { x: P.x + (lx * c - ly * n) * P.k, y: P.y + (lx * n + ly * c) * P.k };
    }

    // ------------------------------------------------------------ sky
    function sky(G, p) {
      const gloom = U.range(p, 0.7, 1) * 0.5;
      const grd = g.createLinearGradient(0, 0, 0, G.waterY);
      grd.addColorStop(0, `hsl(${205 + gloom * 25}, ${78 - gloom * 25}%, ${60 - gloom * 16}%)`);
      grd.addColorStop(1, `hsl(${192 + gloom * 20}, 85%, ${86 - gloom * 14}%)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.H);
    }

    function sun(G, t, worry) {
      const s = G.s, x = G.W * (G.port ? 0.17 : 0.11), y = G.H * (G.port ? 0.075 : 0.17), r = 48 * s;
      g.save();
      g.translate(x, y);
      g.rotate(t * 0.15);
      g.fillStyle = '#ffd84a';
      for (let i = 0; i < 12; i++) {
        g.rotate(TAU / 12);
        g.beginPath();
        g.moveTo(-9 * s, -r - 4 * s);
        g.lineTo(0, -r - 28 * s - Math.sin(t * 3 + i) * 5 * s);
        g.lineTo(9 * s, -r - 4 * s);
        g.fill();
      }
      g.restore();
      g.fillStyle = '#ffe36b';
      circ(x, y, r);
      // the sun keeps an eye on the swimmer
      const lx = 4 * s, ly = 3 * s;
      [-1, 1].forEach(side => {
        const ex = x + side * 16 * s, ey = y - 8 * s;
        if (worry > 0.3) {
          g.fillStyle = '#fff'; circ(ex, ey, (6 + worry * 4) * s);
          g.fillStyle = '#4a2c00'; circ(ex + lx, ey + ly, 3.5 * s);
        } else {
          g.fillStyle = '#4a2c00'; circ(ex, ey, 4.5 * s);
        }
      });
      g.fillStyle = 'rgba(255,120,80,0.45)';
      circ(x - 28 * s, y + 8 * s, 7 * s); circ(x + 28 * s, y + 8 * s, 7 * s);
      g.strokeStyle = '#4a2c00';
      g.fillStyle = '#4a2c00';
      g.lineWidth = 4 * s;
      g.lineCap = 'round';
      if (worry > 0.3) {
        g.beginPath(); g.ellipse(x, y + 18 * s, 7 * s, (6 + worry * 6) * s, 0, 0, TAU); g.fill();
      } else {
        g.beginPath(); g.arc(x, y + 6 * s, 18 * s, 0.35, Math.PI - 0.35); g.stroke();
      }
    }

    function cloud(x, y, k) {
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.beginPath();
      g.arc(x, y, 30 * k, 0, TAU);
      g.arc(x + 32 * k, y - 14 * k, 36 * k, 0, TAU);
      g.arc(x + 70 * k, y, 28 * k, 0, TAU);
      g.arc(x + 36 * k, y + 10 * k, 30 * k, 0, TAU);
      g.fill();
    }

    function skyLife(G, t) {
      clouds.forEach(c => {
        const x = (((c.x - t * c.v) % 1.3) + 1.3) % 1.3 - 0.15;
        cloud(x * G.W, c.y * G.waterY, c.s * G.s);
      });
      g.strokeStyle = '#2d3b4c';
      g.lineWidth = 4 * G.s;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      gulls.forEach(b => {
        const x = ((((b.x + t * b.v) % 1.3) + 1.3) % 1.3 - 0.15) * G.W;
        const y = b.y * G.waterY + Math.sin(t * 0.7 + b.ph) * 10 * G.s;
        const k = b.k * G.s, f = Math.sin(t * 7 + b.ph);
        g.beginPath();
        g.moveTo(x - 24 * k, y - 4 * k - f * 10 * k);
        g.quadraticCurveTo(x - 10 * k, y - 12 * k - f * 4 * k, x, y);
        g.quadraticCurveTo(x + 10 * k, y - 12 * k - f * 4 * k, x + 24 * k, y - 4 * k - f * 10 * k);
        g.stroke();
      });
    }

    // ------------------------------------------------------------ sea
    function surfacePath(G, t) {
      g.beginPath();
      g.moveTo(0, G.H);
      for (let x = 0; x <= G.W + 12; x += 12) g.lineTo(x, wave(x, t, G));
      g.lineTo(G.W, G.H);
      g.closePath();
    }

    function sea(G, t) {
      const s = G.s, deep = G.H - G.waterY;
      surfacePath(G, t);
      const grd = g.createLinearGradient(0, G.waterY, 0, G.H);
      grd.addColorStop(0, '#2bbbe0');
      grd.addColorStop(0.45, '#157db2');
      grd.addColorStop(1, '#0a3563');
      g.fillStyle = grd;
      g.fill();
      // light shafts
      g.fillStyle = 'rgba(255,255,255,0.07)';
      for (let i = 0; i < 5; i++) {
        const x = (i + 0.4) / 5 * G.W + Math.sin(t * 0.4 + i * 2) * 30 * s;
        g.beginPath();
        g.moveTo(x - 20 * s, G.waterY);
        g.lineTo(x + 34 * s, G.waterY);
        g.lineTo(x - 50 * s, G.H);
        g.lineTo(x - 150 * s, G.H);
        g.fill();
      }
      // seabed + weeds
      const bed = G.H - 24 * s;
      g.lineCap = 'round';
      weeds.forEach(w => {
        const x = w.x * G.W, h = w.h * Math.min(deep * 0.4, 140 * s);
        const sw = Math.sin(t * 1.3 + w.ph) * 14 * s;
        g.strokeStyle = `hsl(${w.hue}, 55%, 30%)`;
        g.lineWidth = 9 * s;
        g.beginPath(); g.moveTo(x, bed + 8 * s); g.quadraticCurveTo(x - sw, bed - h * 0.5, x + sw, bed - h); g.stroke();
      });
      g.fillStyle = '#d9b77a';
      g.beginPath();
      g.moveTo(0, G.H);
      for (let x = 0; x <= G.W + 20; x += 20) g.lineTo(x, bed + Math.sin(x / (90 * s)) * 6 * s);
      g.lineTo(G.W, G.H);
      g.fill();
      // little fish going about their business
      fish.forEach(f => {
        const k = f.k * s;
        const u = ((((f.x + t * f.v * f.dir) % 1.2) + 1.2) % 1.2) - 0.1;
        const x = u * G.W, y = G.waterY + (0.35 + f.y * 0.5) * deep + Math.sin(t * 1.5 + f.ph) * 8 * s;
        g.save();
        g.translate(x, y);
        g.scale(f.dir * k, k);
        g.fillStyle = `hsl(${f.hue}, 90%, 58%)`;
        g.beginPath(); g.ellipse(0, 0, 22, 12, 0, 0, TAU); g.fill();
        const wag = Math.sin(t * 10 + f.ph) * 4;
        g.beginPath(); g.moveTo(-16, 0); g.lineTo(-34, -11 + wag); g.lineTo(-34, 11 + wag); g.fill();
        g.fillStyle = '#fff'; circ(10, -3, 4.5);
        g.fillStyle = '#111'; circ(11.5, -3, 2.2);
        g.restore();
      });
      // bubbles
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.lineWidth = 2 * s;
      for (let i = 0; i < 14; i++) {
        const sp = (30 + (i % 5) * 9) * s;
        const y = G.H - ((t * sp + i * 137 * s) % deep);
        const x = ((i * 0.618) % 1) * G.W + Math.sin(t * 2 + i) * 6 * s;
        g.beginPath(); g.arc(x, y, (3 + (i % 3) * 2) * s, 0, TAU); g.stroke();
      }
    }

    // Translucent water in front of everything that is partly submerged.
    function waterFront(G, t) {
      surfacePath(G, t);
      g.fillStyle = 'rgba(22,120,170,0.5)';
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 3 * G.s;
      g.beginPath();
      for (let x = 0; x <= G.W + 12; x += 12) {
        const y = wave(x, t, G);
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      // foam crests drifting along
      g.fillStyle = 'rgba(255,255,255,0.8)';
      const step = 90 * G.s;
      for (let x = ((t * 18 * G.s) % step) - step; x < G.W; x += step) {
        g.beginPath(); g.ellipse(x, wave(x, t, G), 12 * G.s, 3 * G.s, 0, 0, TAU); g.fill();
      }
    }

    // ------------------------------------------------------------ the fin
    function fin(x, y, s, sink) {
      const h = 105 * s * (1 - sink);
      if (h < 2) return;
      const b = 50 * s;
      g.fillStyle = '#4a5a6c';
      g.beginPath();
      g.moveTo(x - b, y + 14 * s);
      g.quadraticCurveTo(x - 6 * s, y - h * 0.45, x - 30 * s, y - h);
      g.quadraticCurveTo(x + 26 * s, y - h * 0.75, x + b * 0.75, y + 14 * s);
      g.closePath();
      g.fill();
      g.strokeStyle = '#1f2a36';
      g.lineWidth = 4 * s;
      g.lineJoin = 'round';
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 5 * s;
      g.beginPath();
      g.moveTo(x - 22 * s, y - h * 0.85);
      g.quadraticCurveTo(x + 10 * s, y - h * 0.62, x + b * 0.45, y - h * 0.05);
      g.stroke();
    }

    function wake(x, G, t, k) {
      const s = G.s;
      for (let i = 0; i < 10; i++) {
        const wx = x - 40 * s - i * 26 * s;
        const r = (11 - i) * s * k * (0.8 + 0.2 * Math.sin(t * 6 + i));
        g.fillStyle = `rgba(255,255,255,${0.9 * (1 - i / 10)})`;
        g.beginPath(); g.ellipse(wx, wave(wx, t, G), r * 1.9, r * 0.55, 0, 0, TAU); g.fill();
      }
      const bx = x + 40 * s;
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(bx, wave(bx, t, G) - 2 * s, 16 * s * k, 7 * s * k, -0.3, 0, TAU); g.fill();
    }

    // ------------------------------------------------------------ the shark (local units, ~430 long, nose toward +x)
    function bodyPath() {
      g.moveTo(196, 4);
      g.bezierCurveTo(176, -40, 80, -60, -20, -54);
      g.bezierCurveTo(-100, -48, -150, -20, -178, -6);
      g.lineTo(-178, 8);
      g.bezierCurveTo(-140, 24, -60, 52, 20, 52);
      g.bezierCurveTo(60, 52, 85, 50, 92, 46);
      g.lineTo(90, 16);
      g.quadraticCurveTo(150, 24, 196, 4);
      g.closePath();
    }
    function tailPath() {
      g.moveTo(-166, -6); g.lineTo(-240, -82); g.quadraticCurveTo(-216, -16, -210, 2);
      g.quadraticCurveTo(-218, 30, -236, 64); g.lineTo(-166, 10); g.closePath();
    }
    function dorsalPath() {
      g.moveTo(-70, -46); g.quadraticCurveTo(-50, -100, -80, -150); g.quadraticCurveTo(-20, -112, 6, -54); g.closePath();
    }
    function pectoralPath() {
      g.moveTo(20, 40); g.quadraticCurveTo(-10, 80, -50, 104); g.quadraticCurveTo(10, 84, 62, 46); g.closePath();
    }
    function jawPath() {
      g.moveTo(0, 0); g.quadraticCurveTo(60, 8, 106, -12); g.quadraticCurveTo(100, 14, 60, 27);
      g.quadraticCurveTo(25, 33, 2, 30); g.closePath();
    }
    const qp = (x0, y0, cx, cy, x1, y1, u) => [
      (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1,
      (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y1,
    ];
    function teeth(x0, y0, cx, cy, x1, y1, dir, n, off) {
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const [x, y] = qp(x0, y0, cx, cy, x1, y1, (i + off) / (n + 0.5));
        g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.lineTo(x, y + dir * 12); g.closePath();
      }
      g.fill();
    }

    // P: { x, y, ang, k, open 0..1, alpha (silhouette) | undefined, grin, dorsal, glasses }
    function shark(P) {
      const a = (P.open || 0) * 0.85;
      g.save();
      g.translate(P.x, P.y);
      g.rotate(P.ang);
      g.scale(P.k, P.k);
      if (P.alpha != null) {
        // menacing shadow under the surface
        g.fillStyle = `rgba(8,24,52,${P.alpha})`;
        g.beginPath(); bodyPath(); g.fill();
        g.beginPath(); tailPath(); g.fill();
        g.beginPath(); pectoralPath(); g.fill();
        if (P.dorsal) { g.beginPath(); dorsalPath(); g.fill(); }
        g.save(); g.translate(90, 16); g.rotate(a); g.beginPath(); jawPath(); g.fill();
        g.fillStyle = `rgba(255,255,255,${P.grin * 0.8})`;
        teeth(0, 0, 60, 8, 106, -12, -1, 6, 0.7);
        g.restore();
        g.fillStyle = `rgba(255,255,255,${P.grin * 0.8})`;
        teeth(90, 16, 150, 24, 196, 4, 1, 6, 0.5);
        g.fillStyle = `rgba(255,255,255,${0.5 + P.grin * 0.5})`;
        circ(130, -20, 7);
        g.restore();
        return;
      }
      const edge = '#1f2a36';
      g.lineWidth = 5;
      g.lineJoin = 'round';
      g.strokeStyle = edge;
      g.fillStyle = '#6c7f95';
      g.beginPath(); tailPath(); g.fill(); g.stroke();
      if (P.dorsal !== false) { g.beginPath(); dorsalPath(); g.fill(); g.stroke(); }
      // open mouth cavity
      if (a > 0.02) {
        const c = Math.cos(a), n = Math.sin(a);
        g.fillStyle = '#5b0e1e';
        g.beginPath();
        g.moveTo(90, 16);
        g.quadraticCurveTo(150, 24, 196, 4);
        g.lineTo(90 + 106 * c + 12 * n, 16 + 106 * n - 12 * c);
        g.closePath();
        g.fill();
        g.fillStyle = '#ff6f86';
        g.beginPath(); g.ellipse(120 + 10 * n, 30 + 30 * n, 26, 10, a * 0.6, 0, TAU); g.fill();
      }
      g.fillStyle = '#8496ab';
      g.beginPath(); bodyPath(); g.fill();
      g.save();
      g.clip();
      g.fillStyle = '#eef3f6';
      g.beginPath(); g.ellipse(30, 64, 200, 36, 0.04, 0, TAU); g.fill();
      g.restore();
      g.beginPath(); bodyPath(); g.stroke();
      // gills
      g.lineWidth = 3.5;
      g.beginPath();
      [44, 56, 68].forEach(x => { g.moveTo(x, -20); g.quadraticCurveTo(x - 8, 0, x, 20); });
      g.stroke();
      // lower jaw with its own teeth
      g.save();
      g.translate(90, 16);
      g.rotate(a);
      g.fillStyle = '#e6edf2';
      g.beginPath(); jawPath(); g.fill(); g.lineWidth = 5; g.stroke();
      g.fillStyle = '#fff';
      teeth(0, 0, 60, 8, 106, -12, -1, 6, 0.95);
      g.restore();
      g.fillStyle = '#fff';
      teeth(90, 16, 150, 24, 196, 4, 1, 6, 0.5);
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(31,42,54,0.6)';
      g.beginPath(); g.moveTo(90, 16); g.quadraticCurveTo(150, 24, 196, 4); g.stroke();
      // pectoral fin in front
      g.strokeStyle = edge;
      g.lineWidth = 5;
      g.fillStyle = '#6c7f95';
      g.beginPath(); pectoralPath(); g.fill(); g.stroke();
      // eye + brow
      g.fillStyle = '#fff'; circ(128, -20, 12);
      g.fillStyle = '#111'; circ(132, -19, 6.5);
      g.fillStyle = '#fff'; circ(134, -22, 2.2);
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      if (P.smug) { g.moveTo(110, -40); g.quadraticCurveTo(128, -48, 148, -40); } else { g.moveTo(110, -40); g.lineTo(148, -29); }
      g.stroke();
      if (P.glasses) shades(130, -22, 1.05);
      g.restore();
    }

    // Foam where the shark's body pierces the surface.
    function foamCollar(P, G, t) {
      const sn = Math.sin(P.ang);
      if (Math.abs(sn) < 0.3) return;
      const d = (G.waterY - P.y) / sn / P.k;
      if (d < -170 || d > 190) return;
      const x = P.x + d * Math.cos(P.ang) * P.k, y = wave(x, t, G);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = -3; i <= 3; i++) {
        circ(x + i * 18 * P.k, y + Math.abs(i) * 2 * P.k, (16 - Math.abs(i) * 2 + Math.sin(t * 9 + i) * 2) * P.k);
      }
    }

    // ------------------------------------------------------------ the swimmer (local units, origin at hips, +y down)
    function shades(x, y, k) {
      g.fillStyle = '#15151c';
      g.beginPath();
      g.roundRect(x - 26 * k, y - 8 * k, 23 * k, 16 * k, 5 * k);
      g.roundRect(x + 3 * k, y - 8 * k, 23 * k, 16 * k, 5 * k);
      g.fill();
      g.strokeStyle = '#15151c';
      g.lineWidth = 3.5 * k;
      g.beginPath(); g.moveTo(x - 5 * k, y - 4 * k); g.lineTo(x + 5 * k, y - 4 * k); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.65)';
      g.lineWidth = 2.5 * k;
      g.beginPath();
      g.moveTo(x - 21 * k, y - 4 * k); g.lineTo(x - 15 * k, y + 3 * k);
      g.moveTo(x + 8 * k, y - 4 * k); g.lineTo(x + 14 * k, y + 3 * k);
      g.stroke();
    }

    function ringArc(inflate, from, to, rot) {
      const rx = 74 * (0.75 + 0.25 * inflate), ry = 22 * (0.45 + 0.55 * inflate), th = 5 + 21 * inflate;
      const arc = (a0, a1) => { g.beginPath(); g.ellipse(0, 0, rx, ry, rot, a0, a1); g.stroke(); };
      g.lineCap = 'butt';
      g.strokeStyle = '#7d1430';
      g.lineWidth = th + 5;
      arc(from, to);
      g.lineWidth = th;
      for (let i = 0; i < 10; i++) {
        const lo = Math.max(from, (i / 10) * TAU), hi = Math.min(to, ((i + 1) / 10) * TAU);
        if (hi <= lo) continue;
        g.strokeStyle = i % 2 ? '#ffffff' : '#ff4d6d';
        arc(lo, hi);
      }
    }

    function drink(x, y) {
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.moveTo(x - 11, y - 28); g.lineTo(x + 11, y - 28); g.lineTo(x + 6, y + 4); g.lineTo(x - 6, y + 4); g.fill();
      g.fillStyle = '#ff9a1f';
      g.beginPath(); g.moveTo(x - 9, y - 18); g.lineTo(x + 9, y - 18); g.lineTo(x + 6, y + 2); g.lineTo(x - 6, y + 2); g.fill();
      g.strokeStyle = '#2bd17e'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x + 2, y - 10); g.lineTo(x + 10, y - 40); g.stroke();
      g.fillStyle = '#ff4fa3';
      g.beginPath(); g.arc(x - 4, y - 34, 13, Math.PI, 0); g.fill();
      g.strokeStyle = '#8a2b5a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x - 4, y - 34); g.lineTo(x - 2, y - 18); g.stroke();
    }

    function tear(x, y, r) {
      g.beginPath();
      g.moveTo(x, y - r * 2);
      g.quadraticCurveTo(x + r * 1.3, y - r * 0.2, x, y + r);
      g.quadraticCurveTo(x - r * 1.3, y - r * 0.2, x, y - r * 2);
      g.fill();
    }

    function limb(sx, sy, ex, ey, hx, hy) {
      g.strokeStyle = SKIN;
      g.lineWidth = 12;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke();
      g.fillStyle = SKIN;
      circ(hx, hy, 8);
    }

    function arms(o) {
      const t = o.t;
      if (o.pose === 'relax') {
        limb(22, -66, 52, -108, 16, -128); // hand behind the head, elbow out
        const sip = Math.pow(Math.max(0, Math.sin(t * 0.7)), 8);
        const hx = U.lerp(-60, -28, sip), hy = U.lerp(-72, -104, sip);
        limb(-22, -66, -50, U.lerp(-48, -84, sip), hx, hy);
        drink(hx, hy - 4);
      } else if (o.pose === 'notice') {
        limb(-22, -66, -48, -96, -26, -122); // shading the eyes, staring left
        const jit = Math.sin(t * 30) * 2;
        limb(22, -66, 46, -46, 58, -68 + jit);
        drink(58, -72 + jit);
      } else if (o.pose === 'swim') {
        for (const side of [-1, 1]) {
          const a = t * 13 + (side > 0 ? Math.PI : 0);
          const sx = side * 22, sy = -66;
          limb(sx, sy, sx + Math.cos(a) * 32, sy + Math.sin(a) * 32, sx + Math.cos(a) * 62, sy + Math.sin(a) * 62);
        }
      } else {
        const sp = o.pose === 'fly' ? 24 : 16;
        for (const side of [-1, 1]) {
          const a = Math.sin(t * sp + (side > 0 ? 0 : 1.7)) * 0.7;
          const ex = side * (42 + Math.cos(a) * 8), ey = -98 + Math.sin(a) * 18;
          limb(side * 22, -66, ex, ey, ex + side * 12 + Math.sin(a * 2) * 12, ey - 32);
        }
      }
    }

    function head(o) {
      const t = o.t, fear = o.fear, hy = -112;
      // hair (stands up with fear, flat when soaked)
      g.fillStyle = '#d0581c';
      if (o.soaked) {
        g.beginPath(); g.ellipse(0, hy - 16, 31, 17, 0, Math.PI, 0); g.fill();
        for (let i = -2; i <= 2; i++) g.fillRect(i * 12 - 3, hy - 18, 6, 22 + Math.abs(i) * 4);
      } else {
        const up = 8 + fear * 28;
        g.beginPath();
        for (let i = -2; i <= 2; i++) {
          g.moveTo(i * 10 - 8, hy - 20);
          g.lineTo(i * 13 + Math.sin(t * 25 + i) * fear * 3, hy - 26 - up * (1 - Math.abs(i) * 0.15));
          g.lineTo(i * 10 + 8, hy - 20);
        }
        g.fill();
      }
      g.fillStyle = SKIN;
      circ(0, hy, 30);
      if (o.soaked) {
        // a strand of seaweed draped over the head
        g.strokeStyle = '#2e8b3e'; g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-26, hy - 22); g.quadraticCurveTo(0, hy - 40, 20, hy - 22); g.quadraticCurveTo(30, hy - 10, 26, hy + 6); g.stroke();
      }
      const fx = o.look * 9;
      if (o.glasses) {
        shades(fx, hy - 4, 1);
      } else {
        const er = 4 + fear * 7;
        [-1, 1].forEach(side => {
          const ex = fx + side * 11, ey = hy - 4;
          if (fear > 0.15) {
            g.fillStyle = '#fff'; circ(ex, ey, er + 2);
            g.strokeStyle = '#222'; g.lineWidth = 2; g.stroke();
            g.fillStyle = '#111'; circ(ex + o.look * er * 0.5, ey, Math.max(2, 3.6 - fear));
          } else {
            g.fillStyle = '#111'; circ(ex, ey, 3.6);
          }
        });
        if (o.glassesUp) shades(fx, hy - 22, 0.72);
        if (fear > 0.15) {
          g.strokeStyle = '#7a3a12'; g.lineWidth = 3.5; g.lineCap = 'round';
          g.beginPath();
          [-1, 1].forEach(side => {
            g.moveTo(fx + side * 5, hy - 16 - er - fear * 4);
            g.lineTo(fx + side * 18, hy - 12 - er);
          });
          g.stroke();
        }
      }
      // mouth
      const mx = fx * 1.1, my = hy + 14;
      g.fillStyle = '#5a1a1a';
      g.strokeStyle = '#5a1a1a';
      g.lineWidth = 3;
      if (o.mouth === 'smile') {
        g.beginPath(); g.arc(mx, my - 6, 10, 0.25, Math.PI - 0.25); g.stroke();
      } else if (o.mouth === 'flat') {
        g.beginPath(); g.moveTo(mx - 7, my); g.quadraticCurveTo(mx, my - 3, mx + 7, my + 1); g.stroke();
      } else if (o.mouth === 'spit') {
        circ(mx, my, 4);
      } else {
        const r = 5 + fear * 6;
        g.beginPath(); g.ellipse(mx, my + 2, r * 0.8, r, 0, 0, TAU); g.fill();
        g.fillStyle = '#ff7b8a';
        g.beginPath(); g.ellipse(mx, my + 2 + r * 0.5, r * 0.5, r * 0.35, 0, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgba(255,90,90,0.35)';
      circ(fx - 19, hy + 7, 5); circ(fx + 19, hy + 7, 5);
      // sweat (or sea water) flying off
      if (fear > 0.4 || o.soaked) {
        g.fillStyle = '#8fdcff';
        for (let i = 0; i < 4; i++) {
          const ph = (t * 1.8 + i / 4) % 1, side = i % 2 ? 1 : -1;
          tear(side * (28 + ph * 26), hy - 20 + ph * ph * 60 - ph * 22, 4.5 * (1 - ph * 0.4));
        }
      }
    }

    // o: { t, pose, fear, look, mouth, glasses, glassesUp, ring, kick, soaked }
    function swimmer(x, y, rot, k, o) {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.scale(k, k);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const t = o.t, kick = o.kick;
      for (const side of [-1, 1]) {
        const a = Math.sin(t * (3 + kick * 14) + (side > 0 ? Math.PI : 0)) * (0.25 + kick * 0.5) - side * 0.12;
        const hx = side * 11, hy = 6;
        const kx = hx + Math.sin(a) * 36, ky = hy + Math.cos(a) * 36;
        const fx = kx + Math.sin(a * 1.5) * 34, fy = ky + Math.cos(a * 1.5) * 34;
        g.strokeStyle = SKIN; g.lineWidth = 13;
        g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
        g.save();
        g.translate(fx, fy);
        g.rotate(-a * 1.5);
        g.fillStyle = '#ffcf26';
        g.beginPath(); g.ellipse(0, 12, 9, 19, 0, 0, TAU); g.fill();
        g.restore();
      }
      if (o.ring) ringArc(1, Math.PI, TAU, 0);
      g.fillStyle = SKIN;
      g.beginPath(); g.roundRect(-25, -80, 50, 90, 22); g.fill();
      g.fillStyle = '#2f6fe0';
      g.beginPath(); g.roundRect(-25, -12, 50, 22, [0, 0, 14, 14]); g.fill();
      g.fillStyle = '#fff';
      g.fillRect(-25, -6, 50, 4);
      g.fillStyle = '#d9946a';
      circ(0, -30, 2.5);
      arms(o);
      head(o);
      if (o.ring) ringArc(1, 0, Math.PI, 0);
      g.restore();
    }

    function bubble(x, y, text, k, G) {
      if (k <= 0.01) return;
      g.save();
      g.font = '40px Bungee, sans-serif';
      const w = Math.max(64, g.measureText(text).width + 34);
      const half = (w / 2) * k * G.s;
      g.translate(U.clamp(x, half + 6, G.W - half - 6), y);
      g.scale(k * G.s, k * G.s);
      g.fillStyle = '#fff';
      g.strokeStyle = '#1b1233';
      g.lineWidth = 5;
      g.lineJoin = 'round';
      g.beginPath(); g.moveTo(-10, 22); g.lineTo(-24, 52); g.lineTo(12, 22); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.roundRect(-w / 2, -30, w, 60, 26); g.fill(); g.stroke();
      g.fillRect(-12, 18, 22, 9);
      g.fillStyle = '#e8213a';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, 0, 2);
      g.restore();
    }

    function musicNotes(x, y, t, a, s) {
      if (a <= 0.01) return;
      g.fillStyle = '#2c2560';
      g.strokeStyle = '#2c2560';
      g.lineWidth = 3.5 * s;
      for (let i = 0; i < 2; i++) {
        const ph = (t * 0.45 + i * 0.5) % 1;
        const nx = x + ph * 50 * s + Math.sin(ph * 9) * 8 * s, ny = y - ph * 80 * s;
        g.globalAlpha = a * Math.sin(ph * Math.PI);
        g.beginPath(); g.ellipse(nx, ny, 8 * s, 6 * s, -0.4, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(nx + 7 * s, ny - 2 * s); g.lineTo(nx + 7 * s, ny - 28 * s); g.lineTo(nx + 18 * s, ny - 19 * s); g.stroke();
      }
      g.globalAlpha = 1;
    }

    // ------------------------------------------------------------ finale choreography
    function sharkPose(ft, G) {
      const k = G.k, W0 = G.waterY;
      if (ft < LEAP) {
        // dives, slides under the swimmer and turns nose-up, jaws opening
        const m = U.easeInOut(U.range(ft, 0.1, 1.1));
        const turn = U.easeInOut(U.range(ft, 0.6, LEAP));
        return {
          mode: 'shadow', k, x: U.lerp(G.finEnd + 32 * k, G.swimX - 50 * k, m), y: U.lerp(W0 + 90 * k, W0 + 245 * k, m),
          ang: -1.35 * turn, open: U.range(ft, 1.0, LEAP), alpha: 0.6 + 0.3 * m, grin: 1, dorsal: ft > 0.45,
        };
      }
      const tau = ft - LEAP;
      if (tau < 1.45) {
        // bites at yBite, keeps rising once the swimmer is flung off, hangs in the air, drops
        const yStart = W0 + 245 * k, yBite = W0 + 10 * k, yTop = W0 - 45 * k, yEnd = W0 + 330 * k;
        let y;
        if (tau < 0.3) y = U.lerp(yStart, yBite, U.easeOut(tau / 0.3));
        else if (tau < 0.85) y = U.lerp(yBite, yTop, U.easeOut(U.range(tau, 0.3, 0.6))) - Math.sin(((tau - 0.3) / 0.55) * Math.PI) * 8 * k;
        else y = yTop + (yEnd - yTop) * Math.pow((tau - 0.85) / 0.6, 2);
        const roll = U.easeInOut(U.range(tau, 0.7, 1.1));
        const open = tau < 0.24 ? 1 : 1 - U.range(tau, 0.24, 0.3);
        return { mode: 'full', k, x: G.swimX - 50 * k + roll * 90 * k, y, ang: U.lerp(-1.35, 1.1, roll), open };
      }
      if (ft < RESURF) return { mode: 'none' };
      const e = U.easeOutBack(U.range(ft, RESURF, RESURF + 0.6));
      const chew = ft > RESURF + 0.7 ? Math.max(0, Math.sin((ft - RESURF) * 9)) * 0.25 : 0;
      return {
        mode: 'full', k, x: G.swimX - 30 * k, y: U.lerp(W0 + 340 * k, W0 + 62 * k, e) + Math.sin(ft * 2.2) * 5 * k,
        ang: -1.2 + Math.sin(ft * 1.7) * 0.05, open: chew, glasses: ft >= GLASSES, smug: ft >= GLASSES,
      };
    }

    const ringSpot = P => toWorld(P, 165, 34);

    function swimmerState(p, t, ft, G) {
      const s = G.s;
      const notice = U.range(p, 0.6, 0.8);
      const panic = ft >= 0 ? 1 : U.range(p, 0.8, 0.97);
      const o = { t, pose: 'relax', fear: 0, look: 0, mouth: 'smile', glasses: true, glassesUp: false, ring: true, kick: 0.1, soaked: false };
      const floatY = wave(G.swimX, t, G) + Math.sin(t * 1.4) * 2 * s;
      let x = G.swimX + Math.sin(t * 43) * 3 * s * panic, y = floatY, rot = Math.sin(t * 0.9) * 0.06, say = '', sayK = 0;
      if (ft < 0 && p < 0.6) {
        // blissfully unaware
      } else if (ft < 0 && p < 0.8) {
        Object.assign(o, { pose: 'notice', fear: 0.2 + notice * 0.3, look: -1, mouth: 'flat', glasses: false, glassesUp: true, kick: 0.3 });
        say = '?'; sayK = 0.6 + notice * 0.4;
      } else if (ft < CHOMP) {
        Object.assign(o, { pose: 'panic', fear: 0.6 + 0.4 * panic, look: -1, mouth: 'scream', glasses: false, glassesUp: true, kick: 0.6 + 0.4 * panic });
        say = ft >= 0 ? 'HELP!' : '!!'; sayK = 0.8 + panic * 0.3 + Math.sin(t * 12) * 0.05;
        if (ft >= LEAP) {
          const P = sharkPose(CHOMP, G), r = ringSpot(P), e = U.easeIn(U.range(ft, LEAP + 0.05, CHOMP));
          x = U.lerp(x, r.x, e); y = U.lerp(floatY, r.y, e);
          say = '';
        }
      } else {
        Object.assign(o, { pose: 'fly', fear: 1, look: 0, mouth: 'scream', glasses: false, ring: false, kick: 1 });
        const L = ringSpot(sharkPose(CHOMP, G));
        if (ft < SPLASH) {
          const k = (ft - CHOMP) / (SPLASH - CHOMP);
          const y1 = G.waterY - 38 * s;
          const apex = Math.max(G.H * 0.03 + 150 * G.sw, L.y - Math.max(80 * s, (L.y - G.H * 0.12) * 0.6));
          const h = Math.max(0, (L.y + y1) / 2 - apex);
          x = U.lerp(L.x, G.landX, k);
          y = U.lerp(L.y, y1, k) - 4 * h * k * (1 - k);
          rot = k * 3 * Math.PI;
        } else if (ft < POPUP) {
          // legs sticking out of the water, kicking
          x = G.landX;
          y = G.waterY - 38 * s + Math.sin(t * 6) * 3 * s;
          rot = Math.PI + Math.sin(t * 8) * 0.15;
        } else {
          Object.assign(o, { pose: ft < SWIM ? 'panic' : 'swim', soaked: true, mouth: ft < POPUP + 0.6 ? 'spit' : 'scream', fear: 0.9, look: 1, kick: 1 });
          const e = U.easeOutBack(U.range(ft, POPUP, POPUP + 0.45));
          const away = U.easeInOut(U.range(ft, SWIM, 9.2));
          x = G.landX - away * (G.landX - G.W * 0.14);
          y = U.lerp(G.waterY + 150 * s, G.waterY + 48 * s, e) + Math.sin(t * 7) * 3 * s;
          rot = ft < SWIM ? 0 : -0.22 + Math.sin(t * 13) * 0.06;
          if (ft > SWIM) { say = 'NOPE!'; sayK = 0.75 + Math.sin(t * 10) * 0.05; }
        }
      }
      return { x, y, rot, o, say, sayK, panic };
    }

    // ------------------------------------------------------------ particles
    function splash(x, y, n, power, s) {
      for (let i = 0; i < n && drops.length < 400; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
        const v = power * (0.35 + Math.random() * 0.75) * s;
        drops.push({ x: x + (Math.random() - 0.5) * 50 * s, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (3 + Math.random() * 6) * s, life: 0, max: 0.8 + Math.random() * 0.9 });
      }
      if (ripples.length < 16) ripples.push({ x, life: 0 });
    }

    function stepParticles(G, t, dt) {
      const s = G.s;
      g.fillStyle = 'rgba(235,250,255,0.92)';
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.life += dt;
        d.vy += 1100 * s * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.life > d.max || (d.vy > 0 && d.y > wave(d.x, t, G) + 4 * s)) { drops.splice(i, 1); continue; }
        circ(d.x, d.y, d.r);
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const q = puffs[i];
        q.life += dt;
        if (q.life > 0.8) { puffs.splice(i, 1); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt; q.r += 30 * s * dt;
        g.fillStyle = `rgba(255,255,255,${0.75 * (1 - q.life / 0.8)})`;
        circ(q.x, q.y, q.r);
      }
      g.lineWidth = 3 * s;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.life += dt;
        if (r.life > 1.6) { ripples.splice(i, 1); continue; }
        const rx = (24 + r.life * 150) * s;
        g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - r.life / 1.6)})`;
        g.beginPath(); g.ellipse(r.x, G.waterY + 4 * s, rx, rx * 0.12, 0, 0, TAU); g.stroke();
      }
    }

    function banner(G, ft) {
      if (ft < CHOMP) return;
      const e = ft - CHOMP;
      const k = U.easeOutBack(U.clamp(e / 0.35)) * (1 + Math.max(0, 0.3 - e) * 0.8);
      const size = Math.min(120 * G.s, G.W / 5.6);
      g.save();
      g.translate(G.W * (G.port ? 0.5 : 0.3), G.H * (G.port ? 0.76 : 0.86));
      g.rotate(-0.08 + Math.sin(ft * 2.5) * 0.04);
      g.scale(k, k);
      g.font = `${size}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = size * 0.16;
      g.strokeStyle = '#1b1233';
      g.strokeText('CHOMP!', 0, 0);
      g.fillStyle = '#ff3b4f';
      g.fillText('CHOMP!', 0, 0);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillText('CHOMP!', -size * 0.03, -size * 0.05);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom(), s = G.s;
        const fired = T => ft >= T && lastFt < T;
        const S = swimmerState(p, t, ft, G);
        const P = ft < 0
          ? { mode: 'shadow', k: G.k, x: U.lerp(G.finStart, G.finEnd, p) + Math.sin(t * 0.8) * 6 * s + 32 * G.k, y: G.waterY + 90 * G.k + Math.sin(t * 1.1) * 4 * G.k, ang: Math.sin(t * 1.3) * 0.03, open: 0, alpha: 0.4 + 0.3 * p, grin: 0.25 + 0.75 * p, dorsal: false }
          : sharkPose(ft, G);
        const fx = U.lerp(G.finStart, G.finEnd, p) + Math.sin(t * 0.8) * 6 * s;
        const sink = ft < 0 ? 0 : U.range(ft, 0, 0.45);

        // one-off finale events
        if (fired(LEAP)) splash(G.swimX, G.waterY, 70, 800, s);
        if (fired(CHOMP)) { const r = ringSpot(sharkPose(CHOMP, G)); splash(r.x, r.y, 12, 300, s); }
        if (fired(FALL)) splash(G.swimX + 40 * G.k, G.waterY, 80, 850, s);
        if (fired(SPLASH)) splash(G.landX, G.waterY, 55, 700, s);
        if (fired(RESURF)) splash(G.swimX, G.waterY, 30, 450, s);
        if (fired(POPUP + 0.15)) {
          for (let i = 0; i < 22 && drops.length < 400; i++) {
            drops.push({ x: S.x + 10 * s, y: S.y - 100 * G.sw, vx: (40 + Math.random() * 120) * s, vy: -(380 + Math.random() * 200) * s, r: (3 + Math.random() * 3) * s, life: 0, max: 1.4 });
          }
        }

        // continuous spray
        sprayAcc += dt * (ft < 0 ? 6 + 24 * S.panic : ft > SWIM ? 30 : 0);
        while (sprayAcc > 1) {
          sprayAcc -= 1;
          if (drops.length >= 400) continue;
          const atFin = ft < 0 && Math.random() < 0.3;
          const ox = atFin ? fx + 40 * s : ft > SWIM ? S.x + 40 * s : S.x + (Math.random() < 0.5 ? -1 : 1) * 60 * s;
          if (!atFin && ft < 0 && S.panic <= 0) continue;
          drops.push({ x: ox, y: G.waterY, vx: (Math.random() - 0.5) * 160 * s, vy: -(150 + Math.random() * 220) * s, r: (2 + Math.random() * 4) * s, life: 0, max: 1 });
        }
        rippleAcc += dt;
        if (ft < 0 && rippleAcc > 1.6 && ripples.length < 16) { rippleAcc = 0; ripples.push({ x: G.swimX, life: 0 }); }

        sky(G, ft >= 0 ? 1 : p);
        sun(G, t, Math.max(S.panic, ft >= 0 ? 1 : 0));
        skyLife(G, t);
        sea(G, t);

        // everything partly submerged goes before the water front
        if (sink < 1) fin(fx, wave(fx, t, G), s, sink);
        if (P.mode === 'full') shark(P);
        const showRing = ft >= CHOMP && P.mode === 'full';
        let ringPos = null;
        if (showRing) {
          ringPos = ringSpot(P);
          const inflate = 1 - 0.75 * U.easeOut(U.range(ft, CHOMP, CHOMP + 1.6));
          const jig = (1 - inflate) * Math.sin(ft * 30) * 0.15;
          g.save(); g.translate(ringPos.x, ringPos.y); g.scale(G.sw, G.sw);
          ringArc(inflate, 0, TAU, P.ang * 0.25 + jig);
          g.restore();
        }
        swimmer(S.x, S.y, S.rot, G.sw, S.o);
        if (P.mode === 'full' && ft >= RESURF && ringPos) {
          // ring dangling in front of the jaw once the shark is back up
          g.save(); g.translate(ringPos.x, ringPos.y); g.scale(G.sw, G.sw);
          ringArc(0.25, 0, Math.PI, P.ang * 0.25);
          g.restore();
        }

        waterFront(G, t);
        if (P.mode === 'shadow') {
          g.save();
          g.beginPath(); g.rect(0, G.waterY + 8 * s, G.W, G.H); g.clip();
          shark(P);
          g.restore();
        }
        if (sink < 1) wake(fx, G, t, 1 - sink);
        if (P.mode === 'full') foamCollar(P, G, t);
        if (ft > SWIM) {
          // speed lines behind the fleeing swimmer
          g.strokeStyle = 'rgba(255,255,255,0.8)';
          g.lineWidth = 4 * s;
          g.lineCap = 'round';
          g.beginPath();
          for (let i = 0; i < 3; i++) {
            const lx = S.x + (70 + i * 14 + Math.sin(t * 20 + i) * 10) * s, ly = G.waterY - (10 + i * 28) * s;
            g.moveTo(lx, ly); g.lineTo(lx + 70 * s, ly);
          }
          g.stroke();
        }

        // air hissing out of the punctured ring
        if (ringPos && ft < CHOMP + 1.6) {
          puffAcc += dt * 30;
          while (puffAcc > 1) {
            puffAcc -= 1;
            if (puffs.length < 60) puffs.push({ x: ringPos.x - 60 * G.sw, y: ringPos.y, vx: -(120 + Math.random() * 120) * s, vy: (Math.random() - 0.5) * 120 * s, r: 4 * s, life: 0 });
          }
        }
        stepParticles(G, t, dt);

        // the sunglasses' trip from the swimmer's face to the shark's
        if (ft >= CHOMP && ft < GLASSES) {
          const a = ringSpot(sharkPose(CHOMP, G)), b = toWorld(sharkPose(GLASSES, G), 130, -22);
          const k = (ft - CHOMP) / (GLASSES - CHOMP);
          const y0 = a.y - 120 * G.sw;
          const top = Math.max(G.H * 0.06, Math.min(y0, b.y) - G.H * 0.2);
          const h = Math.max(0, (y0 + b.y) / 2 - top);
          g.save();
          g.translate(U.lerp(a.x, b.x, k), U.lerp(y0, b.y, k) - 4 * h * k * (1 - k));
          g.rotate(k * 5 * TAU);
          shades(0, 0, G.sw * 1.2);
          g.restore();
        }

        if (ft < 0) musicNotes(S.x + 30 * G.sw, S.y - 150 * G.sw, t, 1 - U.range(p, 0.5, 0.6), s);
        if (S.say) bubble(S.x - 10 * s, S.y - 205 * G.sw, S.say, S.sayK, G);
        if (ft > GLASSES + 0.4 && P.mode === 'full') {
          const m = toWorld(P, 196, 4);
          bubble(m.x + 70 * s, m.y - 50 * s, Math.sin(ft * 3) > 0 ? 'NOM NOM' : 'NOM', 0.8, G);
        }
        banner(G, ft);
        lastFt = ft;
      },

      finale() {
        // "da-dum... da-dum..." on E/F, accelerating until the leap.
        const notes = [sfx.note('E2'), sfx.note('F2')];
        let at = 0, gap = 0.36, i = 0;
        while (at < LEAP - 0.04) {
          const f = notes[i % 2], loud = 0.6 + 0.4 * (at / LEAP), dur = Math.min(0.32, gap * 1.15);
          sfx.tone({ f, type: 'sawtooth', at, dur, vol: 0.24 * loud, attack: 0.008, release: dur * 0.6, filter: 'lowpass', ff: 560, q: 2 });
          sfx.tone({ f: f * 2, type: 'triangle', at, dur, vol: 0.14 * loud, attack: 0.008, release: dur * 0.6 });
          sfx.tone({ f, type: 'sine', at, dur, vol: 0.2 * loud, attack: 0.008, release: dur * 0.6 });
          at += gap;
          gap = Math.max(0.075, gap * 0.8);
          i++;
        }
        // leap: dissonant stab + water burst
        [sfx.note('E2'), sfx.note('F2'), sfx.note('E3')].forEach(f => {
          sfx.tone({ f, type: 'sawtooth', at: LEAP, dur: 0.6, vol: 0.12, attack: 0.005, release: 0.4, filter: 'lowpass', ff: 1100 });
        });
        sfx.noise({ at: LEAP, dur: 0.7, vol: 0.35, filter: 'bandpass', ff: 1400, ffTo: 450, q: 0.7, attack: 0.005, release: 0.5 });
        // CHOMP + rubber squeak
        sfx.pop({ at: CHOMP, vol: 0.5, f: 700 });
        sfx.tone({ at: CHOMP, f: 190, to: 60, type: 'square', dur: 0.12, vol: 0.22, filter: 'lowpass', ff: 1200 });
        sfx.noise({ at: CHOMP + 0.02, dur: 0.12, vol: 0.28, filter: 'highpass', ff: 2500 });
        sfx.tone({ at: CHOMP + 0.03, f: 900, to: 1500, type: 'square', dur: 0.12, vol: 0.06, filter: 'lowpass', ff: 3000 });
        // ring deflating: hiss + raspberry
        sfx.noise({ at: CHOMP + 0.1, dur: 1.4, vol: 0.18, filter: 'bandpass', ff: 3200, ffTo: 900, q: 3, release: 0.3 });
        sfx.tone({ at: CHOMP + 0.1, f: 230, to: 95, glide: 1.4, type: 'sawtooth', dur: 1.4, vol: 0.1, vib: { rate: 24, depth: 35 }, filter: 'lowpass', ff: 1400 });
        // swimmer's scream, up then down
        const aa = [[850, 1, 8], [1250, 0.6, 8], [2800, 0.3, 8]];
        sfx.voice({ at: CHOMP + 0.08, f: 480, to: 760, glide: 0.45, dur: 0.5, vol: 0.16, formants: aa, vib: { rate: 8, depth: 20 } });
        sfx.voice({ at: CHOMP + 0.55, f: 760, to: 400, glide: 1.1, dur: 1.15, vol: 0.16, formants: aa, vib: { rate: 9, depth: 30 }, release: 0.3 });
        // shark crashes back in
        sfx.noise({ at: FALL, dur: 0.9, vol: 0.4, filter: 'lowpass', ff: 3000, ffTo: 300, attack: 0.005, release: 0.6 });
        sfx.tone({ at: FALL, f: 110, to: 40, dur: 0.35, vol: 0.28, attack: 0.005 });
        // swimmer belly-flops (head-flops)
        sfx.noise({ at: SPLASH, dur: 0.7, vol: 0.35, filter: 'bandpass', ff: 1600, ffTo: 450, q: 0.8, attack: 0.005, release: 0.5 });
        sfx.tone({ at: SPLASH, f: 500, to: 150, dur: 0.18, vol: 0.22 });
        // surfacing gurgle, then the shark goes nom nom
        [[0, 350], [0.12, 460], [0.22, 300]].forEach(([d, f]) => sfx.tone({ at: POPUP + 0.15 + d, f, to: f * 1.8, dur: 0.09, vol: 0.18 }));
        [0, 0.35].forEach(d => sfx.voice({ at: GLASSES + 0.4 + d, f: 150, to: 120, dur: 0.2, vol: 0.14, formants: [[350, 1, 5], [900, 0.4, 5]] }));
      },

      destroy() {},
    };
  },
});
