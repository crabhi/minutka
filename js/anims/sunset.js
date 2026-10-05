// Howl at the Moon: the sun arcs across the sky and sets while a wolf waits on a cliff for nightfall.
// Progress = how far the sun has travelled along its arc (and how dark the sky has become).
Minutka.register({
  id: 'sunset',
  name: 'Howl at the Moon',
  emoji: '🐺',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(31);
    const TAU = U.TAU;

    // ------------------------------------------------------------ colors
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    // Keyframed palettes: [p, color, color, ...] -> interpolated colors at p.
    const prep = frames => frames.map(f => [f[0], ...f.slice(1).map(hex)]);
    function pal(frames, p) {
      let i = 0;
      while (i < frames.length - 2 && p > frames[i + 1][0]) i++;
      const a = frames[i], b = frames[i + 1];
      const k = U.range(p, a[0], b[0]);
      return a.slice(1).map((c, j) => mix(c, b[j + 1], k));
    }
    //                 p     sky top    sky mid    horizon    far hills  near hills cliff rock cliff grass cloud
    const PAL = prep([
      [0.00, '#3f9be8', '#7cc3f5', '#c9ecff', '#8eaad6', '#5f9c63', '#7a6450', '#4f9a3c', '#ffffff'],
      [0.45, '#4b93df', '#8cc0ee', '#ffe7b0', '#9aa4cf', '#679a5a', '#7b6149', '#55923a', '#fff6e6'],
      [0.66, '#5a74c4', '#d79a8c', '#ffb85a', '#8e79b0', '#5d7a4d', '#6c4f42', '#4a7134', '#ffd2b0'],
      [0.80, '#33296e', '#a04f86', '#ff7a4f', '#5e4a87', '#3b4a47', '#4a3640', '#2f4a33', '#e98aa0'],
      [0.91, '#141542', '#3a2a6a', '#b0507a', '#2e2a5c', '#222b3c', '#2a2335', '#1e3230', '#7c5a8a'],
      [1.00, '#060a24', '#121a46', '#2c2858', '#1b1d42', '#141c2e', '#1b1828', '#15282a', '#3a3a62'],
    ]);

    // ------------------------------------------------------------ static scenery
    const stars = Array.from({ length: 140 }, () => ({ x: R(), y: R() * 0.66, r: 0.7 + R() * 1.8, ph: R() * TAU, sp: 1 + R() * 3 }));
    const ridge = Array.from({ length: 15 }, (_, i) => ({ x: i / 14, h: 0.06 + R() * 0.12 }));
    const pines = Array.from({ length: 16 }, () => ({ x: 0.4 + R() * 0.62, h: 0.6 + R() * 0.7, dy: R() }));
    const clouds = Array.from({ length: 5 }, () => ({ x: R(), y: 0.06 + R() * 0.26, k: 0.7 + R() * 0.8, v: 0.004 + R() * 0.006 }));
    const birds = Array.from({ length: 6 }, () => ({ x: R(), y: 0.14 + R() * 0.3, v: 0.025 + R() * 0.02, ph: R() * TAU, k: 0.7 + R() * 0.5 }));
    const bats = Array.from({ length: 4 }, () => ({ x: R(), y: 0.12 + R() * 0.25, v: 0.04 + R() * 0.03, ph: R() * TAU }));
    const flies = Array.from({ length: 34 }, () => ({ x: R(), y: 0.55 + R() * 0.42, ax: 0.02 + R() * 0.04, ay: 0.01 + R() * 0.03, fx: 0.2 + R() * 0.5, fy: 0.3 + R() * 0.6, ph: R() * TAU }));
    const tufts = Array.from({ length: 16 }, () => ({ x: R(), k: 0.6 + R() * 0.7, ph: R() * TAU }));
    const craters = [[-0.35, -0.2, 0.18], [0.3, 0.25, 0.14], [0.1, -0.45, 0.1], [-0.15, 0.4, 0.09], [0.45, -0.2, 0.08]];

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const hz = H * 0.7;                       // horizon
      const cliffY = H * 0.6;                  // cliff top where the wolf sits
      const cliffR = Math.max(W * 0.36, 300 * s);
      const k = s * 1.35;
      return { W, H, s, hz, cliffY, cliffR, wolfX: Math.max(cliffR * 0.6, 150 * k), k };
    }

    // ------------------------------------------------------------ sky
    function sky(G, C) {
      const grd = g.createLinearGradient(0, 0, 0, G.hz);
      grd.addColorStop(0, rgb(C[0]));
      grd.addColorStop(0.6, rgb(C[1]));
      grd.addColorStop(1, rgb(C[2]));
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.H);
    }

    function starfield(G, p, t, ft) {
      const a = Math.max(U.range(p, 0.72, 0.97), ft >= 0 ? 1 : 0);
      if (a <= 0) return;
      g.fillStyle = '#fff';
      stars.forEach(st => {
        g.globalAlpha = a * (0.55 + 0.45 * Math.sin(t * st.sp + st.ph));
        const r = st.r * Math.max(0.6, G.s);
        g.fillRect(st.x * G.W - r / 2, st.y * G.hz - r / 2, r, r);
      });
      g.globalAlpha = 1;
      // a shooting star now and then once it is dark
      const sp = (t * 0.16) % 1;
      if (a > 0.5 && sp < 0.12) {
        const k = sp / 0.12, x = G.W * (0.9 - k * 0.5), y = G.H * (0.05 + k * 0.2);
        g.strokeStyle = `rgba(255,255,255,${(1 - k) * a})`;
        g.lineWidth = 3 * G.s;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 80 * G.s, y - 32 * G.s); g.stroke();
      }
    }

    const sunAngle = p => U.lerp(0.56 * Math.PI, -0.07 * Math.PI, p);
    function arcPoint(G, a) {
      const rx = G.W * 0.42, ry = G.hz - G.H * 0.08;
      return { x: G.W * 0.5 + Math.cos(a) * rx, y: G.hz - Math.sin(a) * ry, e: Math.sin(a) };
    }
    const sunPos = (G, p) => arcPoint(G, sunAngle(p));

    // dotted trail of the path the sun still has to travel before it sets
    function sunTrail(G, p) {
      const fade = 1 - U.range(p, 0.82, 0.92);
      if (fade <= 0) return;
      g.fillStyle = `rgba(255,252,225,${0.6 * fade})`;
      g.beginPath();
      const r = 4 * G.s;
      for (let a = sunAngle(p) - 0.09; a > 0; a -= 0.075) {
        const q = arcPoint(G, a);
        g.moveTo(q.x + r, q.y); g.arc(q.x, q.y, r, 0, TAU);
      }
      g.fill();
    }

    function sun(G, p, t) {
      const S = sunPos(G, p);
      if (S.e < -0.15) return;
      const r = 58 * G.s;
      const warm = U.clamp(1 - S.e * 1.7);
      const col = mix(hex('#fff2a0'), hex('#ff6a2a'), warm);
      const halo = g.createRadialGradient(S.x, S.y, r * 0.8, S.x, S.y, r * 3.2);
      halo.addColorStop(0, rgb(col, 0.55));
      halo.addColorStop(1, rgb(col, 0));
      g.fillStyle = halo;
      g.beginPath(); g.arc(S.x, S.y, r * 3.2, 0, TAU); g.fill();
      g.fillStyle = rgb(col);
      g.beginPath(); g.arc(S.x, S.y, r, 0, TAU); g.fill();
      // a sleepy sun face: eyelids droop as it sinks
      const sleepy = U.range(p, 0.55, 0.9);
      const s = G.s;
      g.fillStyle = '#5a2a10';
      g.strokeStyle = '#5a2a10';
      g.lineWidth = 4 * s;
      g.lineCap = 'round';
      [-1, 1].forEach(d => {
        const ex = S.x + d * 20 * s, ey = S.y - 8 * s;
        const open = Math.max(0.08, 1 - sleepy * 0.92) * (Math.sin(t * 0.9 + d) > 0.97 ? 0.1 : 1);
        g.beginPath(); g.ellipse(ex, ey, 6 * s, 7 * s * open, 0, 0, TAU); g.fill();
      });
      // smile turns into a yawn
      const yawn = Math.max(0, Math.sin(t * 0.7)) * sleepy;
      if (yawn > 0.3) {
        g.beginPath(); g.ellipse(S.x, S.y + 18 * s, 9 * s, 12 * s * yawn, 0, 0, TAU); g.fill();
      } else {
        g.beginPath(); g.arc(S.x, S.y + 8 * s, 16 * s, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      }
    }

    function cloud(x, y, k, col) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, 30 * k, 0, TAU);
      g.arc(x + 34 * k, y - 16 * k, 38 * k, 0, TAU);
      g.arc(x + 74 * k, y, 30 * k, 0, TAU);
      g.arc(x + 38 * k, y + 10 * k, 32 * k, 0, TAU);
      g.fill();
    }

    function skyLife(G, p, t, C) {
      clouds.forEach(c => {
        const x = (((c.x + t * c.v) % 1.3) + 1.3) % 1.3 - 0.2;
        cloud(x * G.W, c.y * G.H, c.k * G.s, rgb(C[7], 0.9));
      });
      // birds fly home as evening comes; bats come out at night
      const ba = 1 - U.range(p, 0.72, 0.88);
      g.strokeStyle = `rgba(30,25,40,${ba})`;
      g.lineWidth = 3.5 * G.s;
      g.lineCap = 'round';
      if (ba > 0) birds.forEach(b => {
        const x = ((b.x + t * b.v) % 1.2 - 0.1) * G.W, y = b.y * G.H + Math.sin(t * 0.8 + b.ph) * 10 * G.s;
        const f = Math.sin(t * 9 + b.ph) * 10 * G.s * b.k, w = 16 * G.s * b.k;
        g.beginPath(); g.moveTo(x - w, y - f); g.quadraticCurveTo(x - w * 0.4, y - f * 0.2, x, y); g.quadraticCurveTo(x + w * 0.4, y - f * 0.2, x + w, y - f); g.stroke();
      });
      const bt = U.range(p, 0.86, 0.96);
      if (bt > 0) {
        g.fillStyle = `rgba(10,8,20,${bt})`;
        bats.forEach(b => {
          const x = ((b.x + t * b.v) % 1.2 - 0.1) * G.W, y = b.y * G.H + Math.sin(t * 3 + b.ph) * 22 * G.s;
          const f = Math.sin(t * 22 + b.ph) * 8 * G.s, w = 18 * G.s;
          g.beginPath();
          g.moveTo(x, y); g.lineTo(x - w, y - f); g.lineTo(x - w * 0.5, y + 3 * G.s); g.lineTo(x, y + 5 * G.s);
          g.lineTo(x + w * 0.5, y + 3 * G.s); g.lineTo(x + w, y - f); g.closePath(); g.fill();
        });
      }
    }

    // ------------------------------------------------------------ moon (finale)
    function moon(G, t, ft) {
      if (ft < 0) return;
      const k = U.easeOutBack(U.clamp(ft / 1.3));
      const r = Math.min(G.H * 0.34, G.W * 0.4);
      const x = Math.max(G.wolfX + r * 0.75, r * 1.05), y = U.lerp(G.H + r, G.cliffY - r * 0.72, k);
      const halo = g.createRadialGradient(x, y, r * 0.9, x, y, r * 2.2);
      halo.addColorStop(0, 'rgba(255,250,215,0.45)');
      halo.addColorStop(1, 'rgba(255,250,215,0)');
      g.fillStyle = halo;
      g.beginPath(); g.arc(x, y, r * 2.2, 0, TAU); g.fill();
      g.fillStyle = '#fff8d6';
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.fillStyle = 'rgba(200,190,150,0.45)';
      craters.forEach(([cx, cy, cr]) => { g.beginPath(); g.arc(x + cx * r, y + cy * r, cr * r, 0, TAU); g.fill(); });
      // the moon is delighted to have an audience
      const s = r / 160, fx = x + r * 0.22;
      g.strokeStyle = '#8a7a50';
      g.lineWidth = 6 * s;
      g.lineCap = 'round';
      [-1, 1].forEach(d => { g.beginPath(); g.arc(fx + d * 45 * s, y - 20 * s, 14 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); });
      g.beginPath(); g.arc(fx, y + 20 * s, 40 * s, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.fillStyle = 'rgba(255,140,140,0.35)';
      [-1, 1].forEach(d => { g.beginPath(); g.arc(fx + d * 72 * s, y + 25 * s, 18 * s, 0, TAU); g.fill(); });
      return { x, y, r };
    }

    // ------------------------------------------------------------ landscape
    function land(G, C, t) {
      const s = G.s;
      // far ridge
      g.fillStyle = rgb(C[3]);
      g.beginPath();
      g.moveTo(0, G.hz);
      ridge.forEach(m => g.lineTo(m.x * G.W, G.hz - m.h * Math.min(G.H, G.W) * 0.9));
      g.lineTo(G.W, G.hz);
      g.fill();
      // near hills with pines
      g.fillStyle = rgb(C[4]);
      g.beginPath();
      g.moveTo(0, G.H);
      for (let x = 0; x <= G.W + 20; x += 20) g.lineTo(x, G.hz + 10 * s - Math.sin(x / (210 * s) + 1) * 22 * s);
      g.lineTo(G.W, G.H);
      g.fill();
      pines.forEach(pn => {
        const x = pn.x * G.W, base = G.hz + 30 * s + pn.dy * 40 * s, h = 90 * s * pn.h;
        g.beginPath();
        for (let k = 0; k < 3; k++) {
          const y0 = base - k * h * 0.28, w = h * (0.32 - k * 0.07);
          g.moveTo(x - w, y0); g.lineTo(x, y0 - h * 0.5); g.lineTo(x + w, y0);
        }
        g.fillRect(x - 3 * s, base, 6 * s, 10 * s);
        g.fill();
      });
      // meadow in front
      g.fillStyle = rgb(mix(C[4], [0, 0, 0], 0.25));
      g.beginPath();
      g.moveTo(0, G.H);
      for (let x = 0; x <= G.W + 20; x += 20) g.lineTo(x, G.H * 0.9 - Math.sin(x / (160 * s)) * 10 * s);
      g.lineTo(G.W, G.H);
      g.fill();
    }

    function cliff(G, C, t) {
      const s = G.s, y = G.cliffY, r = G.cliffR;
      g.fillStyle = rgb(C[5]);
      g.beginPath();
      g.moveTo(0, G.H);
      g.lineTo(0, y - 6 * s);
      g.quadraticCurveTo(r * 0.5, y - 14 * s, r, y);
      g.lineTo(r + 16 * s, y + 30 * s);
      g.lineTo(r + 4 * s, y + 70 * s);
      g.lineTo(r + 34 * s, y + 130 * s);
      g.lineTo(r + 22 * s, y + 190 * s);
      g.lineTo(r + 70 * s, G.H);
      g.closePath();
      g.fill();
      // cracks
      g.strokeStyle = 'rgba(0,0,0,0.22)';
      g.lineWidth = 4 * s;
      g.beginPath();
      g.moveTo(r * 0.7, y + 40 * s); g.lineTo(r * 0.78, y + 100 * s); g.lineTo(r * 0.7, y + 160 * s);
      g.moveTo(r * 0.3, y + 70 * s); g.lineTo(r * 0.38, y + 130 * s);
      g.stroke();
      // grass cap
      g.fillStyle = rgb(C[6]);
      g.beginPath();
      g.moveTo(0, y - 18 * s);
      g.quadraticCurveTo(r * 0.5, y - 26 * s, r + 6 * s, y - 2 * s);
      g.lineTo(r + 2 * s, y + 10 * s);
      g.quadraticCurveTo(r * 0.5, y - 4 * s, 0, y + 8 * s);
      g.fill();
      g.strokeStyle = rgb(C[6]);
      g.lineWidth = 3.5 * s;
      g.lineCap = 'round';
      tufts.forEach(f => {
        const x = f.x * r, gy = y - 14 * s - Math.sin(f.x * Math.PI) * 6 * s;
        const sway = Math.sin(t * 1.7 + f.ph) * 6 * s * f.k;
        for (let k = -1; k <= 1; k++) {
          g.beginPath(); g.moveTo(x + k * 5 * s, gy); g.quadraticCurveTo(x + k * 7 * s, gy - 12 * s * f.k, x + k * 9 * s + sway, gy - 24 * s * f.k); g.stroke();
        }
      });
    }

    function rock(x, y, k, col) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x - 40 * k, y + 6 * k);
      g.quadraticCurveTo(x - 36 * k, y - 34 * k, x - 6 * k, y - 40 * k);
      g.quadraticCurveTo(x + 34 * k, y - 38 * k, x + 42 * k, y + 6 * k);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.beginPath(); g.ellipse(x - 12 * k, y - 26 * k, 14 * k, 6 * k, -0.3, 0, TAU); g.fill();
    }

    // ------------------------------------------------------------ the wolf
    // Sitting wolf facing right, origin at ground under the haunch, local units ~200 tall.
    // st: { head, jaw, ear, eye, tail, tongue, tap, fur, light, rim }
    function wolf(x, y, k, st) {
      g.save();
      g.translate(x, y);
      g.scale(k, k);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        const out = pass === 0;
        const col = c => { g.fillStyle = out ? st.rim : c; };
        const paint = () => { if (out) g.stroke(); g.fill(); };
        g.strokeStyle = st.rim;
        g.lineWidth = 8;
        // tail
        g.save(); g.translate(-52, -24); g.rotate(st.tail);
        col(st.fur);
        g.beginPath();
        g.moveTo(4, -14);
        g.quadraticCurveTo(-58, -14, -82, -66);
        g.quadraticCurveTo(-66, -4, -26, 14);
        g.quadraticCurveTo(-6, 16, 4, 10);
        g.closePath(); paint();
        if (!out) { g.fillStyle = st.light; g.beginPath(); g.ellipse(-76, -54, 9, 15, -0.5, 0, TAU); g.fill(); }
        g.restore();
        // haunch, back foot, body
        col(st.fur);
        g.beginPath(); g.ellipse(-22, -42, 50, 43, -0.2, 0, TAU); paint();
        g.beginPath(); g.ellipse(0, -7, 36, 10, 0, 0, TAU); paint();
        g.beginPath(); g.ellipse(18, -84, 31, 58, 0.35, 0, TAU); paint();
        // front legs (the near one can tap impatiently)
        [[22, 0], [42, st.tap]].forEach(([lx, lift]) => {
          g.strokeStyle = out ? st.rim : st.fur;
          g.lineWidth = out ? 26 : 18;
          g.beginPath(); g.moveTo(lx - 6, -64); g.lineTo(lx + lift * 0.4, -8 - lift); g.stroke();
          g.beginPath(); g.moveTo(lx + lift * 0.4, -8 - lift); g.lineTo(lx + 10 + lift * 0.4, -6 - lift); g.stroke();
        });
        g.strokeStyle = st.rim;
        g.lineWidth = 8;
        // neck
        col(st.fur);
        g.beginPath(); g.ellipse(32, -116, 26, 34, 0.45, 0, TAU); paint();
        // head
        g.save(); g.translate(38, -132); g.rotate(st.head);
        g.save(); g.translate(6, -20); g.rotate(-(1 - st.ear) * 0.75);
        col(st.fur);
        g.beginPath(); g.moveTo(-16, 2); g.lineTo(-8, -40); g.lineTo(6, 2); g.closePath(); paint();
        g.beginPath(); g.moveTo(-2, 2); g.lineTo(10, -38); g.lineTo(20, 4); g.closePath(); paint();
        if (!out) { g.fillStyle = '#e7a0a8'; g.beginPath(); g.moveTo(1, 0); g.lineTo(10, -28); g.lineTo(15, 2); g.fill(); }
        g.restore();
        col(st.fur);
        g.beginPath(); g.ellipse(6, -4, 30, 25, 0, 0, TAU); paint();
        // open mouth interior, then lower jaw
        if (!out && st.jaw > 0.05) {
          g.fillStyle = '#5a1222';
          g.beginPath(); g.moveTo(18, 4); g.lineTo(68, -2);
          g.lineTo(18 + Math.cos(st.jaw) * 46, 6 + Math.sin(st.jaw) * 46); g.closePath(); g.fill();
        }
        g.save(); g.translate(18, 4); g.rotate(st.jaw);
        col(st.fur);
        g.beginPath(); g.moveTo(-4, -4); g.lineTo(44, -2); g.lineTo(40, 7); g.lineTo(-2, 14); g.closePath(); paint();
        if (!out && st.tongue > 0) {
          g.fillStyle = '#ff7d93';
          g.beginPath(); g.ellipse(22, 8 + st.tongue * 10, 8, 4 + st.tongue * 10, 0.2, 0, TAU); g.fill();
        }
        g.restore();
        col(st.fur);
        g.beginPath(); g.moveTo(16, -24); g.quadraticCurveTo(50, -20, 70, -8); g.lineTo(70, 2); g.lineTo(16, 8); g.closePath(); paint();
        if (!out) {
          g.fillStyle = st.light;
          g.beginPath(); g.ellipse(2, 12, 20, 9, -0.2, 0, TAU); g.fill();
          g.fillStyle = '#1b1b24';
          g.beginPath(); g.ellipse(70, -5, 7, 6, 0, 0, TAU); g.fill();
          // eye
          if (st.eye < 0.2) {
            g.strokeStyle = '#1b1b24'; g.lineWidth = 3.5;
            g.beginPath(); g.arc(18, -12, 7, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
          } else {
            g.fillStyle = '#fff4c8';
            g.beginPath(); g.ellipse(18, -12, 8, 8 * st.eye, 0, 0, TAU); g.fill();
            g.fillStyle = '#1b1b24';
            g.beginPath(); g.arc(21, -12, 4 * Math.min(1, st.eye + 0.2), 0, TAU); g.fill();
          }
        }
        g.restore();
        if (!out) {
          g.fillStyle = st.light;
          g.beginPath(); g.ellipse(38, -96, 15, 30, 0.35, 0, TAU); g.fill();
        }
      }
      g.restore();
    }

    // world position of a point given in the wolf's head frame
    function headPoint(x, y, k, head, hx, hy) {
      const c = Math.cos(head), sn = Math.sin(head);
      return { x: x + k * (38 + hx * c - hy * sn), y: y + k * (-132 + hx * sn + hy * c) };
    }

    // How hard each wolf is howling right now (0..1) during the finale.
    const howl1 = ft => U.range(ft, 0.7, 1.1) * (1 - U.range(ft, 3.0, 3.4));
    const howl2 = ft => U.range(ft, 3.7, 4.1) * (1 - U.range(ft, 6.2, 6.7));
    const pupHowl = ft => U.range(ft, 4.2, 4.5) * (1 - U.range(ft, 5.8, 6.2));

    function wolfState(p, t, ft, G) {
      const wake = U.range(p, 0.5, 0.6), eager = U.range(p, 0.82, 0.95);
      const impatient = U.range(p, 0.62, 0.7) * (1 - eager);
      const h = ft >= 0 ? Math.max(howl1(ft), howl2(ft)) : 0;
      const breathe = Math.sin(t * 1.3) * 0.05;
      const blink = Math.sin(t * 1.7) > 0.96 ? 0.1 : 1;
      let head = U.lerp(0.5 + breathe, -0.12 + Math.sin(t * 0.6) * 0.05, wake) - eager * 0.28 + Math.sin(t * 7) * 0.04 * eager;
      head = U.lerp(head, -1.1 + Math.sin(t * 5) * 0.04, h);
      const settled = ft > 7 ? U.range(ft, 7, 8) : 0;
      return {
        head,
        jaw: Math.max(h * (0.6 + Math.sin(t * 6) * 0.06), eager * (1 - h) * 0.22 * (1 - settled)),
        ear: Math.max(wake, h) * (1 - Math.sin(t * 2.3) * 0.08 * (Math.sin(t * 0.5) > 0.6 ? 1 : 0)),
        eye: h > 0.5 ? 0 : wake * blink * (1 + eager * 0.3),
        tail: Math.sin(t * U.lerp(1, 12, Math.max(eager, settled)) ) * U.lerp(0.08, 0.35, Math.max(eager, settled)) + (wake - 1) * 0.3,
        tongue: eager * (1 - h) * (0.6 + Math.sin(t * 9) * 0.4),
        tap: impatient * Math.max(0, Math.sin(t * 7)) * 14,
        bounce: eager * (1 - h) * Math.abs(Math.sin(t * 7)) * 10 * G.k,
        fur: rgb(mix(hex('#8a93a8'), hex('#6c7690'), U.range(p, 0.5, 1))),
        light: '#dfe5ef',
        rim: rgb(mix(hex('#2a2d3a'), hex('#c6d4f2'), U.range(p, 0.75, 0.97))),
        wake, h,
      };
    }

    function zzz(G, x, y, p, t) {
      const a = 1 - U.range(p, 0.48, 0.55);
      if (a <= 0) return;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      g.strokeStyle = '#2a2d3a';
      g.lineWidth = 4 * G.s;
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.35 + i / 3) % 1;
        g.globalAlpha = a * Math.sin(k * Math.PI);
        g.font = `${(18 + k * 26) * G.s}px Bungee, sans-serif`;
        const zx = x + k * 70 * G.s + Math.sin(k * 8) * 8 * G.s, zy = y - k * 110 * G.s;
        g.strokeText('z', zx, zy);
        g.fillText('z', zx, zy);
      }
      g.globalAlpha = 1;
    }

    function soundWaves(G, mouth, dir, amt, t, k) {
      if (amt <= 0.05) return;
      g.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const q = (t * 1.4 + i / 5) % 1;
        g.strokeStyle = `rgba(255,255,240,${amt * (1 - q)})`;
        g.lineWidth = (14 - q * 8) * k;
        g.beginPath(); g.arc(mouth.x, mouth.y, (16 + q * 190) * k, dir - 0.55, dir + 0.55); g.stroke();
      }
    }

    function fireflies(G, p, t, ft) {
      const a = Math.max(U.range(p, 0.88, 1) * 0.5, ft >= 0 ? U.range(ft, 0.5, 2.5) : 0);
      if (a <= 0) return;
      flies.forEach(f => {
        const x = (f.x + Math.sin(t * f.fx + f.ph) * f.ax) * G.W;
        const y = (f.y + Math.cos(t * f.fy + f.ph * 2) * f.ay) * G.H;
        const b = a * (0.5 + 0.5 * Math.sin(t * 3 + f.ph * 3));
        g.fillStyle = `rgba(220,255,120,${b * 0.25})`;
        g.beginPath(); g.arc(x, y, 10 * G.s, 0, TAU); g.fill();
        g.fillStyle = `rgba(240,255,170,${b})`;
        g.beginPath(); g.arc(x, y, 3 * G.s, 0, TAU); g.fill();
      });
    }

    function banner(G, ft) {
      if (ft < 0.8) return;
      const s = G.s;
      const n = Math.min(9, 2 + Math.floor((ft - 0.8) * 3));
      const text = 'AW' + 'O'.repeat(n) + '!';
      const k = U.easeOutBack(U.clamp((ft - 0.8) / 0.6));
      const land = G.W > G.H;
      g.save();
      g.translate(land ? G.W * 0.68 : G.W * 0.5, land ? G.H * 0.2 : G.H * 0.12);
      g.rotate(-0.05 + Math.sin(ft * 2.5) * 0.03);
      g.scale(k, k);
      g.font = `${92 * s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const maxW = land ? G.W * 0.58 : G.W * 0.92;
      g.lineWidth = 14 * s;
      g.lineJoin = 'round';
      g.strokeStyle = '#170f33';
      g.strokeText(text, 0, 0, maxW);
      g.fillStyle = '#ffe9a0';
      g.fillText(text, 0, 0, maxW);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        const C = pal(PAL, p);
        sky(G, C);
        starfield(G, p, t, ft);
        sunTrail(G, p);
        sun(G, p, t);
        skyLife(G, p, t, C);
        land(G, C, t);
        moon(G, t, ft);
        cliff(G, C, t);

        const st = wolfState(p, t, ft, G);
        const wy = G.cliffY - 12 * G.s - st.bounce;
        // the pup pops up from behind a rock for the second howl
        const pupX = G.wolfX + 108 * G.k, rockY = G.cliffY - 6 * G.s;
        if (ft > 3.3) {
          const up = U.easeOutBack(U.range(ft, 3.3, 3.8));
          const ph = pupHowl(ft);
          wolf(pupX, rockY + (1 - up) * 70 * G.k * 0.55, G.k * 0.55, {
            head: U.lerp(-0.1 + Math.sin(t * 3) * 0.1, -1.15, ph), jaw: ph * 0.7, ear: 1, eye: ph > 0.5 ? 0 : 1.2,
            tail: Math.sin(t * 14) * 0.4, tongue: 0, tap: 0, fur: '#a7afc2', light: '#f1f4fa', rim: st.rim,
          });
        }
        rock(pupX + 6 * G.k, rockY + 4 * G.s, G.k * 0.75, rgb(mix(C[5], [0, 0, 0], 0.15)));
        wolf(G.wolfX, wy, G.k, st);
        zzz(G, G.wolfX + 80 * G.k, wy - 150 * G.k, p, t);

        if (ft >= 0) {
          const mouth = headPoint(G.wolfX, wy, G.k, st.head, 72, 0);
          soundWaves(G, mouth, -0.5, st.h, t, G.k);
          const ph = pupHowl(ft);
          if (ph > 0) {
            const pk = G.k * 0.55;
            const pm = headPoint(pupX, rockY, pk, U.lerp(0, -1.15, ph), 72, 0);
            soundWaves(G, pm, -1.25, ph * 0.8, t * 1.6, pk);
          }
        }
        fireflies(G, p, t, ft);
        banner(G, ft);
      },

      finale() {
        // Two long howls: rise, hold with vibrato, fall away. A pup joins the second one.
        const howl = (at, dur, f0, peak, end, vol, formants) => {
          const shape = o => {
            if (!o || !sfx.ctx) return;
            const t0 = sfx.ctx.currentTime + at;
            o.frequency.exponentialRampToValueAtTime(peak * 0.96, t0 + dur * 0.7);
            o.frequency.exponentialRampToValueAtTime(end, t0 + dur);
          };
          shape(sfx.voice({ f: f0, to: peak, glide: dur * 0.3, at, dur, vol, formants, vib: { rate: 5.5, depth: 7 }, type: 'sawtooth' }));
          shape(sfx.tone({ f: f0, to: peak, glide: dur * 0.3, at, dur, vol: vol * 0.5, type: 'sine', attack: 0.25, release: 0.5, vib: { rate: 5.5, depth: 7 } }));
        };
        const oo = [[380, 1, 5], [820, 0.35, 6], [2500, 0.08, 8]];
        howl(0.7, 2.6, 260, 560, 300, 0.26, oo);
        howl(3.7, 2.9, 280, 620, 320, 0.24, oo);
        howl(4.2, 1.9, 620, 1050, 700, 0.12, [[900, 1, 6], [1800, 0.4, 7], [3200, 0.1, 8]]);
        // crickets
        for (let i = 0; i < 11; i++) {
          [0, 0.06, 0.12].forEach(d => {
            sfx.tone({ f: 4600, at: 0.2 + i * 0.55 + d, dur: 0.035, vol: 0.05, attack: 0.004, release: 0.025 });
            sfx.tone({ f: 5300, at: 0.45 + i * 0.6 + d * 0.8, dur: 0.03, vol: 0.035, attack: 0.004, release: 0.02 });
          });
        }
      },

      destroy() {},
    };
  },
});
