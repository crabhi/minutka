// A penguin on an iceberg under a smug, blazing sun. Progress = how much of the iceberg has melted.
// The ice shrinks in width and height, the penguin sweats, hides under a parasol and shuffles to stay on.
// Finale: the last of the ice vanishes, the penguin hangs in the air, drops in — SPLASH — and comes back
// up wearing a snorkel, riding a friendly orca.
Minutka.register({
  id: 'penguin',
  name: 'Melting Point',
  emoji: '🐧',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(31);

    // Lumpy iceberg profile, generated once (u in 0..1 across the berg).
    const lumps = Array.from({ length: 13 }, () => (R() - 0.5));
    const streaks = Array.from({ length: 7 }, () => ({ u: 0.12 + R() * 0.76, ph: R(), v: 0.18 + R() * 0.2 }));
    const waveSeeds = Array.from({ length: 4 }, (_, i) => ({ f: 0.006 + R() * 0.004, v: 0.6 + R() * 0.8, ph: R() * U.TAU, a: 4 + i * 2 }));
    const sparkles = Array.from({ length: 14 }, () => ({ x: R(), y: R(), ph: R() * U.TAU }));

    const clouds = Array.from({ length: 4 }, () => ({ x: R(), y: 0.12 + R() * 0.35, k: 0.7 + R() * 0.6, v: 0.004 + R() * 0.006 }));
    const farBergs = [{ x: 0.08, w: 0.07, h: 0.8 }, { x: 0.2, w: 0.04, h: 0.5 }, { x: 0.9, w: 0.06, h: 0.7 }];
    const parts = [];   // drips, sweat, splash, bubbles, spout water
    const ripples = [];
    let dripAcc = 0, sweatAcc = 0, bubbleAcc = 0, spoutAcc = 0;
    let splashed = false, fishSplash = -1;

    const mixRGB = (a, b, k) => `rgb(${Math.round(U.lerp(a[0], b[0], k))},${Math.round(U.lerp(a[1], b[1], k))},${Math.round(U.lerp(a[2], b[2], k))})`;

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const m = Math.min(W / 600, H / 600); // main-object scale; keeps the berg big in portrait
      const seaY = H * (W > H ? 0.66 : 0.58);
      return { W, H, s, m, seaY, cx: W * 0.47 };
    }

    // ------------------------------------------------------------ particles
    function addPart(o) {
      if (parts.length > 260) parts.shift();
      parts.push(Object.assign({ life: 0, max: 2, r: 4, grav: 900, kind: 'drip' }, o));
    }
    function addRipple(x, y, r) {
      if (ripples.length > 30) ripples.shift();
      ripples.push({ x, y, r, life: 0, max: 1.2 });
    }

    function stepParts(G, dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.life += dt;
        q.vy += q.grav * G.s * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        const hitSea = q.kind !== 'bubble' && q.vy > 0 && q.y > G.seaY + 4 * G.s && q.kind !== 'sweat';
        if (hitSea && (q.kind === 'drip' || q.kind === 'spout')) addRipple(q.x, G.seaY + 6 * G.s, 3 * G.s);
        if (q.life > q.max || hitSea || (q.kind === 'bubble' && q.y < G.seaY)) { parts.splice(i, 1); continue; }
      }
    }

    function drawParts(G) {
      parts.forEach(q => {
        const a = 1 - q.life / q.max;
        if (q.kind === 'bubble') {
          g.strokeStyle = `rgba(230,250,255,${0.8 * a})`;
          g.lineWidth = 2 * G.s;
          g.beginPath(); g.arc(q.x, q.y, Math.max(0.5, q.r), 0, U.TAU); g.stroke();
          return;
        }
        g.fillStyle = q.kind === 'sweat' ? `rgba(120,200,255,${0.95 * a})` : q.kind === 'splash' ? `rgba(225,245,255,${0.95 * a})` : 'rgba(170,225,255,0.9)';
        drop(q.x, q.y, Math.max(0.5, q.r), Math.atan2(q.vy, q.vx) - Math.PI / 2);
      });
    }

    function drop(x, y, r, ang) {
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.beginPath();
      g.moveTo(0, -r * 2.2);
      g.quadraticCurveTo(r * 1.1, -r * 0.3, r, r * 0.2);
      g.arc(0, r * 0.2, r, 0, Math.PI);
      g.quadraticCurveTo(-r * 1.1, -r * 0.3, 0, -r * 2.2);
      g.fill();
      g.restore();
    }

    function drawRipples(G, dt) {
      g.lineWidth = 2.5 * G.s;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.life += dt;
        if (r.life > r.max) { ripples.splice(i, 1); continue; }
        const k = r.life / r.max;
        g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
        const rad = r.r + k * r.r * 6;
        g.beginPath(); g.ellipse(r.x, r.y, rad, rad * 0.25, 0, 0, U.TAU); g.stroke();
      }
    }

    // ------------------------------------------------------------ scenery
    function sky(G, p) {
      const k1 = U.range(p, 0, 0.5), k2 = U.range(p, 0.5, 1);
      const top = k2 > 0 ? mixRGB([120, 200, 230], [255, 120, 60], k2) : mixRGB([90, 175, 235], [120, 200, 230], k1);
      const bot = k2 > 0 ? mixRGB([255, 236, 160], [255, 214, 120], k2) : mixRGB([200, 235, 250], [255, 236, 160], k1);
      const grd = g.createLinearGradient(0, 0, 0, G.seaY);
      grd.addColorStop(0, top);
      grd.addColorStop(1, bot);
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.seaY + 2);
    }

    // A smug sun in sunglasses that gets bigger and angrier-hot as time passes.
    function sun(G, p, t, ft) {
      const s = G.s;
      const x = G.W * (G.W > G.H ? 0.84 : 0.75), y = G.H * (G.W > G.H ? 0.2 : 0.13);
      const r = (58 + 34 * p) * Math.max(s, G.m * 0.55) * (1 + Math.sin(t * 3) * 0.02);
      const col = mixRGB([255, 220, 80], [255, 120, 40], p);
      g.save();
      g.translate(x, y);
      g.fillStyle = `rgba(255,230,120,${0.25 + 0.2 * p})`;
      g.beginPath(); g.arc(0, 0, r * (1.6 + 0.1 * Math.sin(t * 2)), 0, U.TAU); g.fill();
      g.rotate(t * (0.25 + p * 0.5));
      g.fillStyle = col;
      for (let k = 0; k < 12; k++) {
        const a = (k * U.TAU) / 12;
        const len = r * (1.45 + 0.12 * Math.sin(t * 5 + k));
        g.beginPath();
        g.moveTo(Math.cos(a - 0.12) * r * 0.95, Math.sin(a - 0.12) * r * 0.95);
        g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        g.lineTo(Math.cos(a + 0.12) * r * 0.95, Math.sin(a + 0.12) * r * 0.95);
        g.fill();
      }
      g.rotate(-t * (0.25 + p * 0.5));
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill();
      g.fillStyle = col;
      g.beginPath(); g.arc(0, 0, r * 0.85, 0, U.TAU); g.fill();
      // sunglasses
      const surprised = ft > 2.6;
      const gy = -r * 0.15 - (surprised ? r * 0.35 : 0);
      g.fillStyle = '#16161e';
      g.beginPath(); g.roundRect(-r * 0.72, gy - r * 0.18, r * 0.62, r * 0.4, r * 0.15); g.fill();
      g.beginPath(); g.roundRect(r * 0.1, gy - r * 0.18, r * 0.62, r * 0.4, r * 0.15); g.fill();
      g.fillRect(-r * 0.12, gy - r * 0.1, r * 0.24, r * 0.08);
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.fillRect(-r * 0.6, gy - r * 0.1, r * 0.16, r * 0.07);
      g.fillRect(r * 0.22, gy - r * 0.1, r * 0.16, r * 0.07);
      if (surprised) {
        g.fillStyle = '#fff';
        [-1, 1].forEach(d => { g.beginPath(); g.arc(d * r * 0.3, -r * 0.05, r * 0.14, 0, U.TAU); g.fill(); });
        g.fillStyle = '#222';
        [-1, 1].forEach(d => { g.beginPath(); g.arc(d * r * 0.3, -r * 0.02, r * 0.07, 0, U.TAU); g.fill(); });
      }
      // smug grin widens with p; a little "o" of surprise when the orca shows up
      g.strokeStyle = '#7a2a10';
      g.lineWidth = r * 0.09;
      g.lineCap = 'round';
      g.beginPath();
      if (surprised) g.arc(0, r * 0.4, r * 0.14, 0, U.TAU);
      else g.arc(0, r * 0.15, r * (0.35 + 0.15 * p), 0.25 * Math.PI, 0.75 * Math.PI);
      g.stroke();
      g.restore();
    }

    // Clouds evaporate as it gets hotter; distant icebergs melt too.
    function horizon(G, p, t) {
      const s = G.s;
      clouds.forEach(c => {
        const k = (1 - p) * c.k;
        if (k < 0.05) return;
        const x = (((c.x + t * c.v) % 1.3) + 1.3) % 1.3 - 0.15;
        const x0 = x * G.W, y0 = c.y * G.seaY, r = 34 * s * k;
        g.fillStyle = `rgba(255,255,255,${0.85 * (1 - p * 0.6)})`;
        g.beginPath();
        g.arc(x0, y0, r, 0, U.TAU);
        g.arc(x0 + r * 1.1, y0 - r * 0.45, r * 1.2, 0, U.TAU);
        g.arc(x0 + r * 2.3, y0, r * 0.9, 0, U.TAU);
        g.fill();
      });
      g.fillStyle = 'rgba(225,245,255,0.85)';
      farBergs.forEach(b => {
        const w = b.w * G.W * (1 - p * 0.8), h = b.h * 70 * G.m * (1 - p * 0.85);
        const x = b.x * G.W;
        g.beginPath();
        g.moveTo(x - w / 2, G.seaY + 1);
        g.lineTo(x - w * 0.15, G.seaY - h);
        g.lineTo(x + w * 0.1, G.seaY - h * 0.8);
        g.lineTo(x + w / 2, G.seaY + 1);
        g.fill();
      });
    }

    function sea(G, t) {
      const grd = g.createLinearGradient(0, G.seaY, 0, G.H);
      grd.addColorStop(0, '#1f8fd1');
      grd.addColorStop(1, '#0b3d78');
      g.fillStyle = grd;
      g.fillRect(0, G.seaY, G.W, G.H - G.seaY);
      sparkles.forEach(sp => {
        const a = 0.5 + 0.5 * Math.sin(t * 2.5 + sp.ph);
        g.fillStyle = `rgba(255,255,255,${0.35 * a})`;
        const x = ((sp.x + t * 0.01) % 1) * G.W, y = G.seaY + 20 * G.s + sp.y * (G.H - G.seaY) * 0.8;
        g.fillRect(x, y, 26 * G.s * a, 3 * G.s);
      });
    }

    function waveY(G, x, t, k) {
      let y = 0;
      waveSeeds.forEach(w => { y += Math.sin(x * w.f / G.s + t * w.v + w.ph + k) * w.a * G.s * 0.6; });
      return y;
    }

    // Front water band that laps over the base of the iceberg / orca.
    function frontWater(G, t) {
      g.fillStyle = 'rgba(40,150,215,0.88)';
      g.beginPath();
      g.moveTo(0, G.H);
      for (let x = 0; x <= G.W + 20; x += 16) g.lineTo(x, G.seaY + 6 * G.s + waveY(G, x, t, 0));
      g.lineTo(G.W, G.H);
      g.lineTo(0, G.H);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 4 * G.s;
      g.beginPath();
      for (let x = 0; x <= G.W + 20; x += 16) {
        const y = G.seaY + 6 * G.s + waveY(G, x, t, 0);
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      // a couple of lower wave lines for depth
      g.strokeStyle = 'rgba(255,255,255,0.25)';
      g.lineWidth = 3 * G.s;
      [0.25, 0.55].forEach((d, i) => {
        const yb = G.seaY + (G.H - G.seaY) * d;
        g.beginPath();
        for (let x = 0; x <= G.W + 20; x += 20) {
          const y = yb + waveY(G, x, t * 0.8, 2 + i) * 0.8;
          if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      });
    }

    // ------------------------------------------------------------ iceberg
    function profile(u) {
      const base = Math.pow(Math.sin(Math.PI * u), 0.55);
      const plateau = Math.min(1, base * 1.22);
      const fi = u * (lumps.length - 1), i0 = Math.floor(fi), f = fi - i0;
      const lump = U.lerp(lumps[i0], lumps[Math.min(lumps.length - 1, i0 + 1)], f);
      const centre = Math.abs(u - 0.5) < 0.12 ? 0 : 1; // keep a flat spot for the penguin
      return Math.max(0, plateau + lump * 0.14 * centre * base);
    }

    function bergPath(w, h, t) {
      const N = 40;
      g.beginPath();
      g.moveTo(-w / 2, 0);
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const melt = Math.sin(u * 17 + t * 1.5) * 1.5;
        g.lineTo((u - 0.5) * w, -h * profile(u) + melt * (h > 4 ? 1 : 0));
      }
      g.lineTo(w / 2, 0);
      g.closePath();
    }

    function iceberg(G, w, h, t, p) {
      if (w < 2 || h < 1) return;
      const s = G.s;
      // underwater bulk
      g.fillStyle = 'rgba(190,240,255,0.32)';
      g.beginPath();
      g.moveTo(-w * 0.55, 0);
      g.quadraticCurveTo(-w * 0.62, h * 1.1, 0, h * 1.5);
      g.quadraticCurveTo(w * 0.62, h * 1.1, w * 0.55, 0);
      g.fill();
      // above water
      const grd = g.createLinearGradient(-w / 2, 0, w / 2, 0);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.55, '#e4f7ff');
      grd.addColorStop(1, '#9fd8f2');
      g.fillStyle = grd;
      bergPath(w, h, t);
      g.fill();
      g.strokeStyle = '#5fb4dc';
      g.lineWidth = 4 * s;
      g.lineJoin = 'round';
      g.stroke();
      // facets
      g.save();
      bergPath(w, h, t);
      g.clip();
      g.fillStyle = 'rgba(120,200,235,0.35)';
      g.beginPath();
      g.moveTo(w * 0.08, -h * 1.1);
      g.lineTo(w * 0.5, -h * 0.2);
      g.lineTo(w * 0.5, 0);
      g.lineTo(w * 0.22, 0);
      g.fill();
      // melt streaks running down
      g.strokeStyle = 'rgba(140,210,240,0.8)';
      g.lineWidth = 3 * s;
      g.lineCap = 'round';
      streaks.forEach(st => {
        const x = (st.u - 0.5) * w;
        const top = -h * profile(st.u);
        const k = (t * st.v + st.ph) % 1;
        const y = top + (-top) * k;
        g.beginPath(); g.moveTo(x, y - 18 * s); g.lineTo(x, y); g.stroke();
        g.fillStyle = 'rgba(140,210,240,0.9)';
        g.beginPath(); g.arc(x, y + 2 * s, 3 * s, 0, U.TAU); g.fill();
      });
      g.restore();
      // puddle on top, growing as it melts
      const pw = Math.min(w * 0.42, (30 + 70 * p) * G.m);
      g.fillStyle = 'rgba(110,200,245,0.65)';
      g.beginPath(); g.ellipse(0, -h + 2 * s, pw / 2, 5 * s + 3 * s * p, 0, 0, U.TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.beginPath(); g.ellipse(-pw * 0.15, -h + 1 * s, pw * 0.12, 1.5 * s, 0, 0, U.TAU); g.fill();
    }

    // "NO MELTING!" sign: stuck in the ice, topples, then drifts away.
    function sign(G, w, h, p, t) {
      const s = G.s, m = G.m * 1.35;
      const u = 0.24;
      const stuckX = (u - 0.5) * w, stuckY = -h * profile(u);
      let x = stuckX, y = stuckY, a = -0.08 + Math.sin(t * 1.3) * 0.03;
      const fall = U.range(p, 0.48, 0.56);
      if (fall > 0) {
        x = U.lerp(stuckX, -w * 0.5 - 40 * m, fall);
        y = U.lerp(stuckY, 10 * s, U.easeIn(fall));
        a = U.lerp(-0.08, -1.25, fall);
      }
      const drift = U.range(p, 0.56, 1);
      if (drift > 0) {
        x -= drift * G.W * 0.25;
        y = 8 * s + Math.sin(t * 2) * 3 * s;
        a = -1.25 + Math.sin(t * 1.6) * 0.1;
      }
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = '#7a4b25';
      g.fillRect(-3 * m, -70 * m, 6 * m, 72 * m);
      g.fillStyle = '#f8f1dc';
      g.strokeStyle = '#7a4b25';
      g.lineWidth = 3 * m;
      g.beginPath(); g.roundRect(-46 * m, -96 * m, 92 * m, 38 * m, 5 * m); g.fill(); g.stroke();
      g.fillStyle = '#d33';
      g.font = `${15 * m}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('NO', 0, -86 * m);
      g.font = `${11 * m}px Bungee, sans-serif`;
      g.fillText('MELTING!', 0, -70 * m);
      g.restore();
    }

    // ------------------------------------------------------------ penguin
    // Drawn with feet at (0,0), height P.
    function penguin(P, o) {
      const lw = Math.max(1.5, P * 0.025);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      // feet (shuffle: alternate lifting)
      g.fillStyle = '#ff9a1f';
      [-1, 1].forEach(d => {
        const lift = o.shuffle * Math.max(0, Math.sin(o.t * 9 + (d > 0 ? Math.PI : 0))) * P * 0.06;
        g.beginPath(); g.ellipse(d * P * 0.12, -P * 0.02 - lift, P * 0.12, P * 0.045, d * 0.15, 0, U.TAU); g.fill();
      });
      g.save();
      g.rotate(o.tilt);
      // flippers
      const flip = (side, ang) => {
        g.save();
        g.translate(side * P * 0.27, -P * 0.58);
        g.rotate(side * ang);
        g.fillStyle = '#1c2230';
        g.beginPath(); g.ellipse(side * P * 0.03, P * 0.17, P * 0.07, P * 0.2, side * -0.2, 0, U.TAU); g.fill();
        g.restore();
      };
      flip(-1, o.flipL);
      flip(1, o.flipR);
      // body
      g.fillStyle = '#1c2230';
      g.beginPath(); g.ellipse(0, -P * 0.47, P * 0.3, P * 0.47, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#f7f7f2';
      g.beginPath(); g.ellipse(0, -P * 0.4, P * 0.22, P * 0.36, 0, 0, U.TAU); g.fill();
      // face patch
      g.beginPath(); g.ellipse(-P * 0.09, -P * 0.74, P * 0.1, P * 0.1, 0, 0, U.TAU); g.fill();
      g.beginPath(); g.ellipse(P * 0.09, -P * 0.74, P * 0.1, P * 0.1, 0, 0, U.TAU); g.fill();
      // cheeks
      g.fillStyle = `rgba(255,120,140,${0.35 + 0.4 * o.nerv})`;
      [-1, 1].forEach(d => { g.beginPath(); g.ellipse(d * P * 0.15, -P * 0.62, P * 0.05, P * 0.03, 0, 0, U.TAU); g.fill(); });
      // eyes
      const ey = -P * 0.75, eo = P * 0.09;
      const er = P * (0.055 + 0.02 * o.nerv);
      [-1, 1].forEach(d => {
        g.save();
        g.translate(d * eo, ey);
        g.scale(1, Math.max(0.08, o.blink));
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(0, 0, er, 0, U.TAU); g.fill();
        g.strokeStyle = '#1c2230';
        g.lineWidth = lw * 0.8;
        g.stroke();
        g.fillStyle = '#111';
        g.beginPath(); g.arc(o.lookX * er * 0.45, o.lookY * er * 0.45, er * 0.5, 0, U.TAU); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(o.lookX * er * 0.45 - er * 0.15, o.lookY * er * 0.45 - er * 0.18, er * 0.15, 0, U.TAU); g.fill();
        g.restore();
        // worried brows
        g.strokeStyle = '#1c2230';
        g.lineWidth = lw * 1.4;
        const by = ey - er - P * 0.04;
        g.beginPath();
        g.moveTo(d * eo - d * er, by + d * 0 + o.nerv * P * 0.03);
        g.lineTo(d * eo + d * er * 0.8, by - o.nerv * P * 0.02);
        g.stroke();
      });
      // beak (opens in panic)
      g.fillStyle = '#ff9a1f';
      const open = o.beakOpen * P * 0.06;
      g.beginPath();
      g.moveTo(-P * 0.06, -P * 0.66); g.lineTo(P * 0.06, -P * 0.66); g.lineTo(0, -P * 0.6 - open * 0.3); g.closePath(); g.fill();
      if (open > 0.5) {
        g.fillStyle = '#c0392b';
        g.beginPath(); g.ellipse(0, -P * 0.62 + open * 0.3, P * 0.04, open * 0.5, 0, 0, U.TAU); g.fill();
        g.fillStyle = '#ff9a1f';
        g.beginPath(); g.moveTo(-P * 0.05, -P * 0.6 + open * 0.5); g.lineTo(P * 0.05, -P * 0.6 + open * 0.5); g.lineTo(0, -P * 0.57 + open * 0.8); g.closePath(); g.fill();
      }
      if (o.snorkel) {
        // diving mask + snorkel
        g.fillStyle = 'rgba(150,230,255,0.55)';
        g.strokeStyle = '#ffcc00';
        g.lineWidth = lw * 2;
        g.beginPath(); g.roundRect(-P * 0.2, ey - P * 0.09, P * 0.4, P * 0.17, P * 0.07); g.fill(); g.stroke();
        g.strokeStyle = '#222';
        g.lineWidth = lw * 1.2;
        g.beginPath(); g.moveTo(-P * 0.2, ey); g.lineTo(-P * 0.29, ey + P * 0.02); g.stroke();
        g.strokeStyle = '#ff5a36';
        g.lineWidth = lw * 2.6;
        g.beginPath(); g.moveTo(P * 0.05, -P * 0.63); g.quadraticCurveTo(P * 0.27, -P * 0.62, P * 0.25, -P * 0.85); g.lineTo(P * 0.25, -P * 1.05); g.stroke();
        g.fillStyle = '#ffcc00';
        g.fillRect(P * 0.21, -P * 1.1, P * 0.08, P * 0.07);
      }
      g.restore();
    }

    // Tiny parasol held over the head.
    function parasol(P, k, t, spin) {
      if (k <= 0) return;
      g.save();
      g.translate(P * 0.32, -P * 0.48);
      g.rotate(0.25 + Math.sin(t * 2.2) * 0.05);
      g.scale(k, k);
      g.strokeStyle = '#5a3d22';
      g.lineWidth = Math.max(1.5, P * 0.025);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -P * 0.78); g.stroke();
      g.translate(0, -P * 0.78);
      g.rotate(spin);
      canopy(P * 0.5);
      g.restore();
    }

    function canopy(r) {
      for (let i = 0; i < 6; i++) {
        g.fillStyle = i % 2 ? '#fff' : '#ff4f6d';
        g.beginPath();
        g.moveTo(0, -r * 0.18);
        g.arc(0, 0, r, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6);
        g.closePath();
        g.fill();
      }
      g.fillStyle = '#ff4f6d';
      g.beginPath(); g.arc(0, -r * 0.2, r * 0.07, 0, U.TAU); g.fill();
    }

    // ------------------------------------------------------------ fish + orca
    function fishAt(x, y, size, ang) {
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.fillStyle = '#ff8c2a';
      g.beginPath(); g.ellipse(0, 0, size, size * 0.45, 0, 0, U.TAU); g.fill();
      g.beginPath(); g.moveTo(-size * 0.8, 0); g.lineTo(-size * 1.5, -size * 0.5); g.lineTo(-size * 1.5, size * 0.5); g.closePath(); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(size * 0.5, -size * 0.1, size * 0.16, 0, U.TAU); g.fill();
      g.fillStyle = '#111';
      g.beginPath(); g.arc(size * 0.55, -size * 0.1, size * 0.08, 0, U.TAU); g.fill();
      g.restore();
    }

    // A fish leaps on a fixed cycle; returns its position (for the penguin to stare at) or null.
    function jumpingFish(G, t) {
      const period = 5.5, dur = 1.3;
      const cyc = Math.floor(t / period), k = (t % period) / dur;
      if (k > 1) return null;
      const side = cyc % 2 ? 1 : -1;
      const x0 = G.cx + side * G.W * 0.3, span = G.W * 0.12 * side;
      const x = x0 + span * k;
      const hgt = 130 * G.m * (0.8 + 0.3 * ((cyc * 7) % 3) / 2);
      const y = G.seaY + 10 * G.s - Math.sin(Math.PI * k) * hgt;
      const ang = Math.atan2(-Math.cos(Math.PI * k) * hgt * Math.PI, span) * -1;
      if (fishSplash !== cyc * 2 && k < 0.1) { fishSplash = cyc * 2; addRipple(x0, G.seaY + 8 * G.s, 6 * G.s); }
      if (fishSplash !== cyc * 2 + 1 && k > 0.9) { fishSplash = cyc * 2 + 1; addRipple(x0 + span, G.seaY + 8 * G.s, 6 * G.s); }
      fishAt(x, y, 22 * G.m, side > 0 ? -ang : Math.PI + ang);
      return { x, y };
    }

    function orca(x, y, L, t) {
      g.save();
      g.translate(x, y);
      g.rotate(Math.sin(t * 1.4) * 0.03);
      // tail
      g.fillStyle = '#15171f';
      g.beginPath();
      g.moveTo(-L * 0.42, -L * 0.05);
      g.quadraticCurveTo(-L * 0.6, -L * 0.1, -L * 0.68, -L * 0.25 + Math.sin(t * 3) * L * 0.03);
      g.quadraticCurveTo(-L * 0.6, -L * 0.05, -L * 0.7, L * 0.1);
      g.quadraticCurveTo(-L * 0.55, L * 0.02, -L * 0.42, L * 0.05);
      g.fill();
      // body
      g.beginPath(); g.ellipse(0, 0, L * 0.48, L * 0.2, 0, 0, U.TAU); g.fill();
      // dorsal fin
      g.beginPath();
      g.moveTo(-L * 0.12, -L * 0.17);
      g.quadraticCurveTo(-L * 0.1, -L * 0.4, -L * 0.2, -L * 0.48);
      g.quadraticCurveTo(L * 0.02, -L * 0.32, L * 0.06, -L * 0.18);
      g.fill();
      // belly + eye patch
      g.fillStyle = '#f4f4f4';
      g.beginPath(); g.ellipse(L * 0.1, L * 0.1, L * 0.32, L * 0.08, 0.05, 0, U.TAU); g.fill();
      g.beginPath(); g.ellipse(L * 0.3, -L * 0.07, L * 0.07, L * 0.035, -0.2, 0, U.TAU); g.fill();
      g.fillStyle = '#111';
      g.beginPath(); g.arc(L * 0.36, -L * 0.04, L * 0.022, 0, U.TAU); g.fill();
      // grin
      g.strokeStyle = '#444';
      g.lineWidth = L * 0.012;
      g.beginPath(); g.arc(L * 0.36, L * 0.0, L * 0.09, 0.1, 1.1); g.stroke();
      g.restore();
    }

    function speech(G, x, y, text, P) {
      const fs = P * 0.2;
      g.font = `${fs}px Bungee, sans-serif`;
      const tw = g.measureText(text).width;
      g.fillStyle = '#fff';
      g.strokeStyle = '#13233d';
      g.lineWidth = 3 * G.s;
      g.beginPath();
      g.roundRect(x - tw / 2 - fs * 0.5, y - fs, tw + fs, fs * 2, fs * 0.6);
      g.moveTo(x + tw * 0.2, y + fs); g.lineTo(x + tw * 0.5, y + fs * 1.7); g.lineTo(x + tw * 0.45, y + fs);
      g.fill(); g.stroke();
      g.fillStyle = '#13233d';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, x, y + fs * 0.05);
    }

    function banner(G, text, ft0, ft, color) {
      if (ft < ft0) return;
      const k = U.easeOutBack(U.clamp((ft - ft0) / 0.6));
      const px = Math.min(G.H * 0.15, (G.W * 0.9) / (text.length * 0.8));
      const s = px / 100;
      g.save();
      g.translate(G.W * (G.W > G.H ? 0.42 : 0.5), G.H * (G.W > G.H ? 0.17 : 0.3));
      g.rotate(-0.05 + Math.sin(ft * 3) * 0.03);
      g.scale(k, k);
      g.font = `${px}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 14 * s;
      g.strokeStyle = '#13233d';
      g.strokeText(text, 0, 0);
      g.fillStyle = color;
      g.fillText(text, 0, 0);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        const s = G.s, m = G.m;
        const fin = ft >= 0;

        // Iceberg size: shrinks steadily, then the last sliver melts in the finale.
        const meltK = fin ? U.clamp(ft / 0.55) : 0;
        const wk = U.lerp(1, 0.17, p) * (1 - meltK);
        const hk = U.lerp(1, 0.22, p) * (1 - meltK);
        const bw = 600 * m * wk, bh = 175 * m * hk;
        const bob = Math.sin(t * 1.3) * 4 * s;
        const tilt = Math.sin(t * 0.9) * 0.03 * (0.4 + p);
        const nerv = U.range(p, 0.35, 0.95);
        const P = 150 * m;

        sky(G, p);
        sun(G, p, t, ft);
        horizon(G, p, t);
        sea(G, t);
        const fishPos = jumpingFish(G, t);

        // ------------------------------------------------ iceberg + penguin (before the orca)
        g.save();
        g.translate(G.cx, G.seaY + 8 * s + bob);
        g.rotate(tilt);
        if (!fin || meltK < 1) {
          iceberg(G, bw, bh, t, p);
          sign(G, bw, bh, p, t);
        }
        g.restore();

        // drips off the berg's edges, more as it gets hotter
        if (!fin || meltK < 1) {
          dripAcc += dt * (2 + 10 * p + (fin ? 30 : 0));
          while (dripAcc > 1) {
            dripAcc -= 1;
            const side = Math.random() < 0.5 ? -1 : 1;
            addPart({ x: G.cx + side * bw * (0.35 + Math.random() * 0.15), y: G.seaY - bh * 0.2, vx: side * (10 + Math.random() * 30) * s, vy: 0, r: (3 + Math.random() * 2) * s, max: 2 });
          }
        }

        // Penguin pose & position
        const topY = G.seaY + 8 * s + bob - bh;
        let px = G.cx + Math.sin(tilt) * bh, py = topY;
        const shake = Math.sin(t * 43) * nerv * nerv * 2.5 * s;
        const shuffle = U.range(p, 0.6, 0.9);
        px += shake + shuffle * Math.sin(t * 4.5) * 8 * s;
        let blinkPh = (t % 3.7);
        let blink = blinkPh < 0.12 ? Math.abs(blinkPh - 0.06) / 0.06 : 1;
        let lookX = 0.2, lookY = U.lerp(-0.3, 0.9, U.range(p, 0.3, 0.8));
        if (fishPos) {
          const dx = fishPos.x - px, dy = fishPos.y - (py - P * 0.75);
          const dl = Math.hypot(dx, dy) || 1;
          lookX = dx / dl; lookY = dy / dl;
        }
        let flipL = 0.3 + Math.sin(t * (3 + 18 * nerv)) * (0.15 + 0.55 * nerv); // fanning itself
        let flipR = -0.2;
        let beakOpen = U.range(p, 0.88, 0.97);
        let ptilt = Math.sin(t * 3) * 0.06 + shuffle * Math.sin(t * 4.5) * 0.08;
        let umbrellaK = U.easeOutBack(U.range(p, 0.18, 0.26));
        let snorkel = false;
        let showPenguin = true, orcaY = null;

        if (fin) {
          // hop up in alarm, hang in mid-air (cartoon physics), then drop
          const hop = U.easeOut(U.clamp(ft / 0.45)) * P * 0.5;
          const hangY = topY - P * 0.5;
          if (ft < 1.0) {
            py = topY - hop;
            lookX = 0; lookY = ft > 0.5 ? 1 : -0.2; // looks down... uh oh
            flipL = 1.6 + Math.sin(ft * 30) * 0.4; flipR = -1.6 - Math.sin(ft * 30) * 0.4;
            beakOpen = 1;
            blink = 1;
          } else {
            // timed so the feet hit the water together with the splash sound
            py = U.lerp(hangY, G.seaY + P * 1.2, U.easeIn(U.range(ft, 1.0, 1.48)));
            flipL = 2.6; flipR = -2.6;
            lookY = -1;
            beakOpen = 1;
            if (py > G.seaY + P * 1.1) showPenguin = false;
          }
          ptilt = 0;
          umbrellaK = ft < 1.0 ? 1 : 0;
          if (!splashed && ft >= 1.33) {
            splashed = true;
            for (let i = 0; i < 70; i++) {
              const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
              const v = (300 + Math.random() * 700) * s;
              addPart({ kind: 'splash', x: px + (Math.random() - 0.5) * P * 0.6, y: G.seaY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (4 + Math.random() * 7) * s, max: 2.5, grav: 1300 });
            }
            for (let i = 0; i < 4; i++) addRipple(px, G.seaY + 8 * s, (10 + i * 14) * s);
          }
          // bubbles from below while the penguin is under
          if (ft > 1.3 && ft < 2.6) {
            bubbleAcc += dt * 20;
            while (bubbleAcc > 1) {
              bubbleAcc -= 1;
              addPart({ kind: 'bubble', x: px + (Math.random() - 0.5) * 60 * s, y: G.seaY + 160 * s, vx: (Math.random() - 0.5) * 30 * s, vy: -(120 + Math.random() * 120) * s, r: (4 + Math.random() * 8) * s, max: 3, grav: 0 });
            }
          }
          // orca surfaces with the penguin on its back
          if (ft > 2.4) {
            const k = U.easeOutBack(U.range(ft, 2.4, 3.3));
            orcaY = G.seaY + 8 * m + (1 - k) * 300 * m + Math.sin(t * 1.4) * 5 * s;
            showPenguin = true;
            snorkel = true;
            px = G.cx + Math.sin(ft * 0.5) * 30 * s;
            py = orcaY - 62 * m;
            flipL = 2.4 + Math.sin(ft * 8) * 0.5; flipR = -0.4 + Math.sin(ft * 3) * 0.2;
            lookX = 0.4; lookY = 0;
            beakOpen = 0.8 + Math.sin(ft * 6) * 0.2;
            ptilt = Math.sin(ft * 2) * 0.08;
            umbrellaK = 0;
            blink = (ft % 2.5) < 0.12 ? 0.1 : 1;
          }
          if (ft > 3.1 && ft < 5.5) {
            spoutAcc += dt * 40;
            while (spoutAcc > 1) {
              spoutAcc -= 1;
              addPart({ kind: 'splash', x: G.cx - 10 * m, y: orcaY - 70 * m, vx: (Math.random() - 0.5) * 220 * s, vy: -(500 + Math.random() * 300) * s, r: (3 + Math.random() * 4) * s, max: 2, grav: 900 });
            }
          }
        }

        // floating parasol (upside down boat) after the dunk
        if (fin && ft > 1.25) {
          const ux = G.cx + 120 * m + (ft - 1.25) * 12 * s;
          const uy = G.seaY + 6 * s + Math.sin(t * 2.4) * 4 * s;
          g.save();
          g.translate(ux, uy);
          g.rotate(Math.PI + Math.sin(t * 1.8) * 0.15);
          g.strokeStyle = '#5a3d22';
          g.lineWidth = Math.max(1.5, P * 0.025);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(0, P * 0.7); g.stroke();
          canopy(P * 0.5);
          g.restore();
        }

        if (orcaY !== null) orca(G.cx, orcaY, 330 * m, t);

        if (showPenguin) {
          g.save();
          g.translate(px, py);
          parasol(P, umbrellaK, t, Math.sin(t * 1.7) * 0.08);
          penguin(P, { t, nerv: fin ? 1 : nerv, blink, lookX, lookY, flipL, flipR, beakOpen, tilt: ptilt, shuffle: fin ? 0 : shuffle, snorkel });
          g.restore();
          // panic marks
          if (!fin && p > 0.8) {
            const a = 0.5 + 0.5 * Math.sin(t * 8);
            g.fillStyle = `rgba(230,40,40,${0.6 + 0.4 * a})`;
            g.font = `${(40 + 8 * a) * m}px Bungee, sans-serif`;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(p > 0.9 ? '!!' : '!', px - P * 0.5, py - P * 1.0);
          }
        }

        if (fin && ft > 0.45 && ft < 1.05) speech(G, px - P * 0.75, py - P * 1.05, 'UH-OH', P);

        // sweat flies off as the heat rises
        if (showPenguin && (fin ? ft < 1.2 : nerv > 0)) {
          sweatAcc += dt * (fin ? 14 : 1 + nerv * 9);
          while (sweatAcc > 1) {
            sweatAcc -= 1;
            const side = Math.random() < 0.5 ? -1 : 1;
            addPart({ kind: 'sweat', x: px + side * P * 0.22, y: py - P * 0.85, vx: side * (60 + Math.random() * 80) * s, vy: -(120 + Math.random() * 100) * s, r: (4 + Math.random() * 3) * m, max: 1.1, grav: 900 });
          }
        }

        frontWater(G, t);
        drawRipples(G, dt);
        stepParts(G, dt);
        drawParts(G);

        // heat shimmer above the ice
        if (!fin && p > 0.2) {
          g.strokeStyle = `rgba(255,255,255,${0.12 + 0.18 * p})`;
          g.lineWidth = 3 * s;
          for (let k = -1; k <= 1; k++) {
            const x0 = G.cx + k * 120 * m;
            g.beginPath();
            for (let y = 0; y < 120 * m; y += 8) {
              const yy = topY - P * 1.4 - y;
              const x = x0 + Math.sin(y * 0.08 + t * 4 + k) * 6 * s;
              if (y === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
            }
            g.stroke();
          }
        }

        if (fin) {
          if (ft < 2.8) banner(G, 'SPLASH!', 1.25, ft, '#7fe3ff');
          else banner(G, 'STAY COOL!', 2.9, ft, '#ffd23f');
        }
      },

      finale() {
        const honk = (at, f, to, dur, vol) => sfx.voice({
          at, f, to, dur, vol: vol || 0.32, type: 'sawtooth',
          formants: [[750, 1, 5], [1300, 0.8, 7], [2700, 0.35, 8]], attack: 0.01, release: 0.06,
        });
        // panicked "wha?!" honk, then an "uh-oh"
        honk(0.02, 420, 680, 0.22);
        honk(0.55, 520, 500, 0.16, 0.28);
        honk(0.75, 400, 360, 0.26, 0.28);
        // cartoon falling whistle
        sfx.tone({ at: 1.0, f: 1600, to: 380, glide: 0.33, dur: 0.33, type: 'sine', vol: 0.2, attack: 0.02, release: 0.05 });
        // SPLASH: thump + spray + wash
        const sp = 1.35;
        sfx.tone({ at: sp, f: 140, to: 40, dur: 0.4, type: 'sine', vol: 0.5, attack: 0.003, release: 0.3 });
        sfx.noise({ at: sp, dur: 1.4, vol: 0.45, filter: 'lowpass', ff: 4500, ffTo: 300, attack: 0.005, release: 1.1 });
        sfx.noise({ at: sp + 0.02, dur: 0.7, vol: 0.25, filter: 'highpass', ff: 2500, attack: 0.005, release: 0.6 });
        // glub glub bubbles
        [1.9, 2.05, 2.25, 2.4, 2.5].forEach((at, i) => sfx.tone({ at, f: 300 + i * 60, to: 900 + i * 120, dur: 0.07, type: 'sine', vol: 0.18, attack: 0.005, release: 0.04 }));
        // orca surfacing whoosh + blowhole spout
        sfx.noise({ at: 2.5, dur: 0.8, vol: 0.2, filter: 'bandpass', ff: 500, ffTo: 1800, q: 1.2, attack: 0.2, release: 0.4 });
        sfx.noise({ at: 3.1, dur: 1.2, vol: 0.22, filter: 'highpass', ff: 1800, attack: 0.03, release: 0.8 });
        // happy honk-honk-hooonk
        honk(3.3, 560, 600, 0.13, 0.3);
        honk(3.5, 560, 600, 0.13, 0.3);
        honk(3.75, 600, 760, 0.5, 0.32);
      },

      destroy() {},
    };
  },
});
