// Short Fuse: a long fuse snakes across the screen toward a very nervous cartoon bomb.
// Progress = how far the spark has burned along the fuse (measured by arc length).
Minutka.register({
  id: 'bomb',
  name: 'Short Fuse',
  emoji: '💣',
  create(stage, sfx) {
    const U = Minutka.util;
    const TAU = U.TAU;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(31);

    // Finale timeline (seconds after time-up), shared by the visuals and the sound.
    const BOOM = 0.75;          // spark dives into the bomb -> explosion
    const CAP_LAND = BOOM + 1.6; // the fuse cap falls back down with a "tink"
    const HEAP = 2.8;           // smoke thins and reveals a soot heap
    const EYES = 3.4;           // two eyes blink open in the soot
    const COUGH = 4.7;          // the heap coughs twice
    const FLAG = 6.2;           // a tiny white flag of surrender

    const CAP_A = -2.25; // direction of the fuse cap on the bomb (up-left)
    const CAP_D = 1.12;  // cap tip distance from the bomb centre, in bomb radii

    // Fuse control points, normalized to the screen. The cap end is appended at runtime.
    const PATH_L = [[0.03, 0.93], [0.07, 0.72], [0.04, 0.48], [0.1, 0.3], [0.21, 0.36], [0.24, 0.6], [0.33, 0.74],
      [0.44, 0.63], [0.41, 0.4], [0.48, 0.22], [0.58, 0.17]];
    const PATH_P = [[0.06, 0.05], [0.5, 0.09], [0.92, 0.07], [0.9, 0.19], [0.5, 0.23], [0.1, 0.21], [0.08, 0.33],
      [0.5, 0.37], [0.9, 0.35], [0.88, 0.47]];

    const splats = Array.from({ length: 16 }, () => ({ a: R() * TAU, d: 1.25 + R() * 1.4, r: 0.05 + R() * 0.1, ph: R() * TAU }));
    const bumps = Array.from({ length: 9 }, (_, i) => ({ f: (i / 8) * 1.6 - 0.8, r: 0.16 + R() * 0.1 }));
    const specks = Array.from({ length: 14 }, () => ({ f: R() * 1.6 - 0.8, h: R() * 0.8, r: 0.012 + R() * 0.02 }));

    const sparks = [], smoke = [], sweat = [], notes = [], debris = [], cloud = [], flakes = [];
    let fuse = null, fuseKey = '';
    let sparkAcc = 0, smokeAcc = 0, sweatAcc = 0, noteAcc = 0, wispAcc = 0;
    let rayPhase = 0;
    let boomed = false, coughs = 0;

    function geom() {
      const W = cv.w, H = cv.h;
      const portrait = H > W * 1.1;
      const s = portrait ? Math.min(W / 600, H / 1000) : Math.min(W / 1000, H / 600);
      const floorTop = H * 0.8;
      const floorY = H * (portrait ? 0.87 : 0.9);
      const r = 150 * s;
      const bx = portrait ? W * 0.5 : W * 0.78;
      const by = floorY - r - 22 * s;
      return { W, H, s, portrait, floorTop, floorY, r, bx, by };
    }

    function capTip(x, y, r, rot, swell) {
      const a = CAP_A + rot, d = r * CAP_D * swell;
      return [x + Math.cos(a) * d, y + Math.sin(a) * d];
    }

    // ------------------------------------------------------------ fuse path (arc-length parametrized)
    function catmull(pts, n) {
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        for (let k = 0; k < n; k++) {
          const u = k / n, u2 = u * u, u3 = u2 * u;
          const c = j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 +
            (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3);
          out.push([c(0), c(1)]);
        }
      }
      out.push(pts[pts.length - 1]);
      return out;
    }

    function buildFuse(G) {
      const key = G.W + 'x' + G.H;
      if (key === fuseKey) return;
      fuseKey = key;
      const tip = capTip(G.bx, G.by, G.r, 0, 1);
      const pts = (G.portrait ? PATH_P : PATH_L).map(([x, y]) => [x * G.W, y * G.H]);
      pts.push([tip[0] + Math.cos(CAP_A) * 90 * G.s, tip[1] + Math.sin(CAP_A) * 90 * G.s], tip);
      const P = catmull(pts, 22);
      const cum = [0];
      for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      fuse = { P, cum, len: cum[cum.length - 1] };
    }

    function pointAt(d) {
      const { P, cum } = fuse;
      d = U.clamp(d, 0, fuse.len);
      let i = 0;
      while (i < P.length - 2 && cum[i + 1] < d) i++;
      const seg = cum[i + 1] - cum[i] || 1;
      const k = (d - cum[i]) / seg;
      return { x: U.lerp(P[i][0], P[i + 1][0], k), y: U.lerp(P[i][1], P[i + 1][1], k), i };
    }

    function tracePath(d0, d1) {
      const { P, cum } = fuse;
      const a = pointAt(d0), b = pointAt(d1);
      g.moveTo(a.x, a.y);
      for (let i = a.i + 1; i <= b.i; i++) g.lineTo(P[i][0], P[i][1]);
      g.lineTo(b.x, b.y);
      return cum;
    }

    // ------------------------------------------------------------ backdrop
    function background(G, p, char) {
      const s = G.s;
      const hue = U.lerp(46, 10, U.range(p, 0.4, 1));
      const sat = 92 - char * 50, li = 62 - char * 28;
      g.fillStyle = `hsl(${hue}, ${sat}%, ${li}%)`;
      g.fillRect(-80, -80, G.W + 160, G.H + 160);
      // rotating sunburst behind the bomb
      g.save();
      g.beginPath(); g.rect(-80, -80, G.W + 160, G.floorTop + 80); g.clip();
      g.fillStyle = `hsl(${hue - 8}, ${sat}%, ${li - 7}%)`;
      const big = Math.hypot(G.W, G.H) * 1.3, n = 16;
      g.beginPath();
      for (let k = 0; k < n; k++) {
        const a0 = rayPhase + (k * TAU) / n, a1 = a0 + TAU / n / 2;
        g.moveTo(G.bx, G.by);
        g.lineTo(G.bx + Math.cos(a0) * big, G.by + Math.sin(a0) * big);
        g.lineTo(G.bx + Math.cos(a1) * big, G.by + Math.sin(a1) * big);
      }
      g.fill();
      g.restore();
      // floor boards
      g.fillStyle = `hsl(24, ${45 - char * 20}%, ${36 - char * 14}%)`;
      g.fillRect(-80, G.floorTop, G.W + 160, G.H - G.floorTop + 80);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      const rows = 4, rh = (G.H - G.floorTop) / rows;
      for (let j = 1; j < rows; j++) g.fillRect(-80, G.floorTop + j * rh, G.W + 160, 3 * s);
      for (let j = 0; j < rows; j++) {
        for (let x = ((j * 137) % 220) * s - 220 * s; x < G.W + 80; x += 260 * s) g.fillRect(x, G.floorTop + j * rh, 3 * s, rh);
      }
      g.fillStyle = `hsl(20, 40%, ${22 - char * 10}%)`;
      g.fillRect(-80, G.floorTop - 10 * s, G.W + 160, 14 * s);
    }

    function sign(G, t, ft) {
      if (G.portrait) return;
      const s = G.s, x = G.W * 0.87, y = G.H * 0.07;
      const a = ft - BOOM;
      // after the blast the sign hangs from one nail, swinging
      const drop = a > 0 ? U.easeOutElastic(U.clamp(a / 1.6)) : 0;
      const rot = -0.05 + Math.sin(t * 1.1) * 0.025 + drop * (0.75 + Math.sin(a * 2.2) * 0.12 * Math.exp(-a * 0.3));
      g.save();
      g.translate(x, y);
      g.fillStyle = '#555';
      g.beginPath(); g.arc(0, 0, 5 * s, 0, TAU); g.fill();
      g.rotate(rot);
      const w = 170 * s, h = 82 * s, top = 30 * s;
      g.strokeStyle = '#3a2614';
      g.lineWidth = 2.5 * s;
      g.beginPath(); g.moveTo(drop > 0.5 ? -w * 0.42 : 0, 0); g.lineTo(-w * 0.42, top); g.moveTo(0, 0); g.lineTo(w * 0.42 * (1 - drop), top + drop * h * 0.1); g.stroke();
      g.translate(drop * w * 0.4, 0);
      g.fillStyle = '#d39752';
      g.beginPath(); g.roundRect(-w / 2, top, w, h, 8 * s); g.fill();
      g.lineWidth = 4 * s; g.stroke();
      g.fillStyle = '#8e1c12';
      g.font = `${26 * s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('DO NOT', 0, top + h * 0.32);
      g.fillText('LIGHT!', 0, top + h * 0.7);
      g.restore();
    }

    function scorch(G, char) {
      const r = G.r;
      const grd = g.createRadialGradient(G.bx, G.floorY - r * 0.5, r * 0.2, G.bx, G.floorY - r * 0.5, r * 2.6);
      grd.addColorStop(0, `rgba(15,10,8,${0.85 * char})`);
      grd.addColorStop(1, 'rgba(15,10,8,0)');
      g.fillStyle = grd;
      g.fillRect(G.bx - r * 2.7, G.floorY - r * 3.2, r * 5.4, r * 5.4);
      g.fillStyle = `rgba(18,14,12,${0.55 * char})`;
      splats.forEach(q => {
        const x = G.bx + Math.cos(q.a) * q.d * r, y = G.by + Math.sin(q.a) * q.d * r * 0.75;
        if (y > G.floorTop) return;
        const rr = q.r * r * char;
        g.beginPath();
        g.arc(x, y, rr, 0, TAU);
        g.arc(x + Math.cos(q.ph) * rr * 1.4, y + Math.sin(q.ph) * rr * 1.4, rr * 0.45, 0, TAU);
        g.arc(x - Math.cos(q.ph + 1) * rr * 1.2, y - Math.sin(q.ph + 1) * rr * 1.2, rr * 0.3, 0, TAU);
        g.fill();
      });
    }

    // ------------------------------------------------------------ fuse + spark
    function drawFuse(G, d, tip, glow) {
      const s = G.s;
      g.lineJoin = 'round';
      if (d > 0) {
        // ash: what has already burned
        g.lineCap = 'round';
        g.beginPath(); tracePath(0, d);
        g.strokeStyle = '#26211f'; g.lineWidth = 5 * s; g.stroke();
        g.lineCap = 'butt';
        g.setLineDash([2 * s, 10 * s]);
        g.strokeStyle = '#6e655d'; g.lineWidth = 2.5 * s; g.stroke();
        g.setLineDash([]);
        if (glow) {
          g.lineCap = 'round';
          g.beginPath(); tracePath(d - 45 * s, d);
          g.strokeStyle = 'rgba(255,110,30,0.9)'; g.lineWidth = 8 * s; g.stroke();
          g.beginPath(); tracePath(d - 18 * s, d);
          g.strokeStyle = '#ffd34a'; g.lineWidth = 6 * s; g.stroke();
        }
      }
      if (d < fuse.len) {
        // the rope still to burn: outline, body, twisted stripes
        g.beginPath(); tracePath(d, fuse.len); g.lineTo(tip[0], tip[1]);
        g.lineCap = 'round';
        g.strokeStyle = '#4a2c10'; g.lineWidth = 24 * s; g.stroke();
        g.strokeStyle = '#e8b663'; g.lineWidth = 17 * s; g.stroke();
        g.lineCap = 'butt';
        g.setLineDash([6 * s, 10 * s]);
        g.strokeStyle = '#a8732f'; g.lineWidth = 17 * s; g.stroke();
        g.setLineDash([]);
      }
    }

    function drawSpark(x, y, s, t, k) {
      const pr = (46 + Math.sin(t * 31) * 8) * s * k;
      const grd = g.createRadialGradient(x, y, 0, x, y, pr);
      grd.addColorStop(0, 'rgba(255,240,170,0.95)');
      grd.addColorStop(0.35, 'rgba(255,170,40,0.55)');
      grd.addColorStop(1, 'rgba(255,90,0,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, pr, 0, TAU); g.fill();
      g.strokeStyle = '#fff3b0';
      g.lineWidth = 3 * s;
      g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + Math.random() * 0.4, l = (14 + Math.random() * 26) * s * k;
        g.moveTo(x + Math.cos(a) * 5 * s, y + Math.sin(a) * 5 * s);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      g.stroke();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x, y, 7 * s * k, 0, TAU); g.fill();
    }

    function emitSpark(x, y, s, fast) {
      if (sparks.length > 220) sparks.shift();
      const a = Math.random() * TAU, v = (fast ? 300 + Math.random() * 900 : 90 + Math.random() * 220) * s;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * s, life: 0, max: 0.3 + Math.random() * (fast ? 0.9 : 0.45) });
    }

    function emitSmoke(x, y, s, dark, big) {
      if (smoke.length > 60) smoke.shift();
      smoke.push({
        x, y, vx: (Math.random() - 0.5) * 30 * s, vy: (-40 - Math.random() * 40) * s * (big ? 1.8 : 1),
        r: (6 + Math.random() * 6) * s * (big ? 3 : 1), life: 0, max: big ? 1.8 : 1.6, dark,
      });
    }

    function particles(dt, G) {
      const s = G.s;
      g.lineCap = 'round';
      g.lineWidth = 3 * s;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const q = sparks[i];
        q.life += dt;
        if (q.life > q.max) { sparks.splice(i, 1); continue; }
        q.vy += 700 * s * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        const k = q.life / q.max;
        g.strokeStyle = `hsl(${48 - k * 30}, 100%, ${78 - k * 30}%)`;
        g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * 0.025, q.y - q.vy * 0.025); g.stroke();
      }
      for (let i = smoke.length - 1; i >= 0; i--) {
        const q = smoke[i];
        q.life += dt;
        if (q.life > q.max) { smoke.splice(i, 1); continue; }
        q.x += q.vx * dt + Math.sin(q.life * 4 + i) * 12 * s * dt;
        q.y += q.vy * dt;
        q.r += 16 * s * dt;
        const a = 0.6 * (1 - q.life / q.max);
        g.fillStyle = q.dark ? `rgba(30,26,26,${a + 0.2})` : `rgba(90,85,85,${a})`;
        g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill();
      }
    }

    function drawSweat(dt, G) {
      const s = G.s;
      g.fillStyle = '#8fdcff';
      g.strokeStyle = '#2a6f9a';
      g.lineWidth = 2 * s;
      for (let i = sweat.length - 1; i >= 0; i--) {
        const q = sweat[i];
        q.life += dt;
        q.vy += 900 * s * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (q.y > G.floorY + 10 * s || q.life > 1.6) { sweat.splice(i, 1); continue; }
        const a = Math.atan2(q.vy, q.vx), r = q.r;
        g.beginPath();
        g.arc(q.x, q.y, r, a + Math.PI / 2, a - Math.PI / 2);
        g.lineTo(q.x - Math.cos(a) * r * 2.6, q.y - Math.sin(a) * r * 2.6);
        g.closePath();
        g.fill(); g.stroke();
      }
    }

    function drawNotes(dt, s) {
      g.fillStyle = '#3b2508';
      g.strokeStyle = '#3b2508';
      g.lineWidth = 3 * s;
      for (let i = notes.length - 1; i >= 0; i--) {
        const q = notes[i];
        q.life += dt;
        if (q.life > 2.4) { notes.splice(i, 1); continue; }
        const x = q.x + q.life * 40 * s + Math.sin(q.life * 4) * 10 * s, y = q.y - q.life * 55 * s;
        g.globalAlpha = q.a * Math.min(1, (2.4 - q.life) * 1.5);
        const k = 1 + q.life * 0.2;
        g.beginPath(); g.ellipse(x, y, 11 * s * k, 8 * s * k, -0.4, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(x + 7 * s * k, y - 2 * s); g.lineTo(x + 7 * s * k, y - 30 * s * k);
        g.quadraticCurveTo(x + 18 * s * k, y - 22 * s * k, x + 16 * s * k, y - 14 * s * k);
        g.stroke();
        g.globalAlpha = 1;
      }
    }

    // ------------------------------------------------------------ the bomb
    function glove(x, y, r, s, side) {
      g.fillStyle = '#fff';
      g.strokeStyle = '#111';
      g.lineWidth = 3 * s;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
      g.beginPath();
      for (let k = -1; k <= 1; k++) { g.moveTo(x + k * r * 0.35, y - r * 0.2); g.lineTo(x + k * r * 0.35, y + r * 0.55); }
      g.lineWidth = 2 * s;
      g.stroke();
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(x + side * r * 0.75, y - r * 0.55, r * 0.35, r * 0.5, side * 0.7, 0, TAU); g.fill(); g.stroke();
    }

    function drawBomb(G, B, t) {
      const s = G.s, r = G.r;
      // shadow, legs, shoes (not rotated)
      g.fillStyle = 'rgba(40,20,0,0.35)';
      g.beginPath(); g.ellipse(G.bx, G.floorY + 2 * s, r * 0.95, r * 0.15, 0, 0, TAU); g.fill();
      [-1, 1].forEach(side => {
        const fx = G.bx + side * r * 0.36 + Math.sin(t * 34 + side) * B.knock * 9 * s;
        const tap = side === 1 && B.knock < 0.2 ? Math.max(0, Math.sin(t * 5)) * 8 * s : 0;
        g.strokeStyle = '#15161b'; g.lineWidth = 10 * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(B.x + side * r * 0.3, B.y + r * 0.8); g.lineTo(fx, G.floorY - 12 * s - tap); g.stroke();
        g.fillStyle = '#e8483a';
        g.beginPath(); g.ellipse(fx + side * 12 * s, G.floorY - 12 * s - tap, 32 * s, 15 * s, side * -0.1 * (tap / (8 * s)), 0, TAU); g.fill();
        g.fillStyle = '#fff';
        g.fillRect(fx + side * 12 * s - 28 * s, G.floorY - 6 * s - tap, 56 * s, 5 * s);
      });

      g.save();
      g.translate(B.x, B.y);
      g.rotate(B.rot);
      g.scale(B.swell, B.swell);
      // cap
      g.save();
      g.rotate(CAP_A + Math.PI / 2);
      g.fillStyle = '#7d8696'; g.fillRect(-0.2 * r, -CAP_D * r, 0.4 * r, 0.32 * r);
      g.fillStyle = '#aab3c2'; g.fillRect(-0.13 * r, -CAP_D * r, 0.06 * r, 0.3 * r);
      g.fillStyle = '#4c5260'; g.fillRect(-0.25 * r, -0.92 * r, 0.5 * r, 0.09 * r);
      g.restore();
      // body
      const grd = g.createRadialGradient(-0.35 * r, -0.4 * r, 0.05 * r, 0, 0, r);
      grd.addColorStop(0, '#6c7285'); grd.addColorStop(0.35, '#2b2e38'); grd.addColorStop(1, '#0d0e12');
      g.fillStyle = grd;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      if (B.hot > 0) {
        g.fillStyle = `rgba(255,50,20,${0.6 * B.hot})`;
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      }
      g.strokeStyle = '#000'; g.lineWidth = 4 * s; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath(); g.ellipse(-0.47 * r, -0.44 * r, 0.2 * r, 0.08 * r, -0.75, 0, TAU); g.fill();

      // eyes
      const fx0 = 0.1 * r, eyeY = -0.1 * r;
      const blink = !B.squeeze && (((t + 1.9) % 3.7) < 0.12 || (B.panic > 0.5 && (t % 1.1) < 0.07));
      [-1, 1].forEach(side => {
        const ex = fx0 + side * 0.3 * r;
        const erx = 0.19 * r * (1 + B.panic * 0.15), ery = 0.25 * r * (1 + B.panic * 0.22);
        g.lineCap = 'round';
        if (B.squeeze) {
          g.strokeStyle = '#fff'; g.lineWidth = 0.06 * r;
          g.beginPath();
          g.moveTo(ex - side * 0.15 * r, eyeY - 0.12 * r); g.lineTo(ex + side * 0.12 * r, eyeY); g.lineTo(ex - side * 0.15 * r, eyeY + 0.12 * r);
          g.stroke();
        } else if (blink) {
          g.strokeStyle = '#fff'; g.lineWidth = 0.05 * r;
          g.beginPath(); g.moveTo(ex - erx, eyeY); g.lineTo(ex + erx, eyeY); g.stroke();
        } else {
          g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3 * s;
          g.beginPath(); g.ellipse(ex, eyeY, erx, ery, 0, 0, TAU); g.fill(); g.stroke();
          // pupils follow the spark; in panic they dart around
          let dx = B.look[0] - (B.x + ex), dy = B.look[1] - (B.y + eyeY);
          const n = Math.hypot(dx, dy) || 1;
          dx /= n; dy /= n;
          if (B.panic > 0) {
            const h = Math.floor(t * 5);
            const da = Math.sin(h * 12.9898) * 43758.5453;
            const ang = (da - Math.floor(da)) * TAU;
            const m = B.panic * 0.6;
            dx = U.lerp(dx, Math.cos(ang), m); dy = U.lerp(dy, Math.sin(ang), m);
          }
          const pr = 0.085 * r * (1 - B.panic * 0.45);
          const px = ex + dx * (erx - pr - 0.02 * r), py = eyeY + dy * (ery - pr - 0.02 * r);
          g.fillStyle = '#111';
          g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.3, 0, TAU); g.fill();
        }
        // brows: confident, then worried (inner ends rise)
        const w = B.nerv;
        g.strokeStyle = '#dcdfe8'; g.lineWidth = 0.055 * r;
        g.beginPath();
        g.moveTo(ex + side * 0.2 * r, eyeY - 0.34 * r + w * 0.04 * r);
        g.lineTo(ex - side * 0.13 * r, eyeY - 0.36 * r - w * 0.12 * r + (1 - w) * 0.03 * r);
        g.stroke();
      });

      // mouth
      const mx = fx0, my = 0.4 * r;
      g.strokeStyle = '#fff';
      g.lineWidth = 0.05 * r;
      g.lineCap = 'round';
      if (B.squeeze || B.p > 0.82) {
        const wv = B.squeeze ? 0.42 * r : 0.34 * r;
        const hh = 0.1 * r + Math.abs(Math.sin(t * 38)) * 0.07 * r;
        g.fillStyle = '#3a0a0a';
        g.fillRect(mx - wv / 2, my - hh / 2, wv, hh);
        g.fillStyle = '#fff';
        g.fillRect(mx - wv / 2, my - hh / 2, wv, 0.045 * r);
        g.fillRect(mx - wv / 2, my + hh / 2 - 0.045 * r, wv, 0.045 * r);
        g.strokeStyle = '#555'; g.lineWidth = 2 * s;
        g.beginPath();
        for (let k = 1; k < 5; k++) { const x = mx - wv / 2 + (wv * k) / 5; g.moveTo(x, my - hh / 2); g.lineTo(x, my + hh / 2); }
        g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = 3 * s;
        g.strokeRect(mx - wv / 2, my - hh / 2, wv, hh);
      } else if (B.p > 0.6) {
        g.beginPath();
        for (let k = 0; k <= 8; k++) {
          const x = mx - 0.2 * r + (k / 8) * 0.4 * r, y = my + (k % 2 ? 1 : -1) * 0.035 * r * Math.sin(t * 9 + k);
          if (k) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
      } else if (B.p > 0.26) {
        const c = U.lerp(0.14 * r, 0, U.range(B.p, 0.26, 0.6));
        g.beginPath(); g.moveTo(mx - 0.2 * r, my); g.quadraticCurveTo(mx, my + c * 2, mx + 0.2 * r, my); g.stroke();
      } else {
        // whistling, very relaxed
        g.fillStyle = '#5a1515';
        g.beginPath(); g.ellipse(mx + 0.04 * r, my, 0.06 * r, 0.075 * r, 0, 0, TAU); g.fill(); g.stroke();
      }

      // forehead sweat bead
      if (B.nerv > 0.15) {
        const k = 0.04 * r + B.nerv * 0.05 * r;
        const x = fx0 + 0.55 * r, y = -0.5 * r + ((t * 0.3) % 1) * 0.2 * r;
        g.fillStyle = '#8fdcff'; g.strokeStyle = '#2a6f9a'; g.lineWidth = 2 * s;
        g.beginPath(); g.arc(x, y, k, 0, Math.PI); g.lineTo(x, y - k * 2.4); g.closePath(); g.fill(); g.stroke();
      }

      // arms + gloves: relaxed at the sides, then nail-biting at the mouth
      const bite = B.squeeze ? 1 : U.easeInOut(U.range(B.p, 0.8, 0.88));
      [-1, 1].forEach(side => {
        const rx = side * 1.2 * r, ry = 0.4 * r + Math.sin(t * 2 + side) * 0.05 * r;
        const tx = mx + side * 0.17 * r, ty = my + 0.1 * r;
        const jit = bite * Math.sin(t * 41 + side * 2) * 0.025 * r;
        const hx = U.lerp(rx, tx, bite) + jit, hy = U.lerp(ry, ty, bite) + jit;
        g.strokeStyle = '#15161b'; g.lineWidth = 0.07 * r; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(side * 0.9 * r, 0.25 * r);
        g.quadraticCurveTo(side * 1.15 * r, U.lerp(0.25 * r, 0.6 * r, bite), hx, hy);
        g.stroke();
        glove(hx, hy, 0.12 * r, s, side);
      });
      g.restore();
    }

    function exclaim(G, t, panic) {
      if (panic < 0.3) return;
      const s = G.s, k = U.range(panic, 0.3, 0.6);
      g.font = `${70 * s * k}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 8 * s;
      g.strokeStyle = '#2a0d00';
      g.fillStyle = '#ff3b2a';
      [[-1.25, -0.95, 0], [1.2, -1.05, 1.7]].forEach(([dx, dy, ph]) => {
        const x = G.bx + dx * G.r, y = G.by + dy * G.r + Math.sin(t * 14 + ph) * 5 * s;
        g.save();
        g.translate(x, y);
        g.rotate(dx * 0.15 + Math.sin(t * 9 + ph) * 0.1);
        g.strokeText('!', 0, 0); g.fillText('!', 0, 0);
        g.restore();
      });
    }

    // ------------------------------------------------------------ explosion + aftermath
    function spawnBoom(G) {
      const s = G.s, r = G.r;
      for (let i = 0; i < 18; i++) {
        const a = -Math.PI * (0.05 + Math.random() * 0.9), sp = (350 + Math.random() * 750) * s;
        const kind = i < 15 ? 'shard' : i < 17 ? 'shoe' : 'glove';
        const n = 4, rad = (0.08 + Math.random() * 0.12) * r;
        const pts = Array.from({ length: n }, (_, k) => {
          const aa = (k / n) * TAU + Math.random() * 0.8, rr = rad * (0.6 + Math.random() * 0.6);
          return [Math.cos(aa) * rr, Math.sin(aa) * rr];
        });
        debris.push({
          x: G.bx + (Math.random() - 0.5) * r, y: G.by + (Math.random() - 0.5) * r,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 18,
          kind, pts, size: rad, z: (Math.random() * 0.6 - 0.1) * (G.H - G.floorY), rest: false, side: Math.random() < 0.5 ? -1 : 1,
        });
      }
      for (let i = 0; i < 20; i++) {
        cloud.push({
          a: -Math.PI * Math.random() * 1.1 + 0.05, dist: (0.4 + Math.random() * 1.6) * r,
          r0: (0.35 + Math.random() * 0.45) * r, rise: (10 + Math.random() * 30) * s, ph: Math.random() * TAU,
        });
      }
      for (let i = 0; i < 140; i++) emitSpark(G.bx, G.by, s, true);
      // the ash fuse crumbles: flakes drop off along its whole length over ~1.5 s
      for (let i = 0; i < 70; i++) {
        const q = pointAt(Math.random() * fuse.len);
        flakes.push({
          x: q.x, y: q.y, delay: Math.random() * 1.3, vx: (Math.random() - 0.5) * 40 * s, vy: 0,
          r: (2.5 + Math.random() * 3) * s, rot: Math.random() * TAU, ph: Math.random() * TAU, life: 0,
        });
      }
    }

    function drawFlakes(dt, G) {
      const s = G.s;
      g.fillStyle = '#3a3330';
      flakes.forEach(q => {
        q.life += dt;
        if (q.life < q.delay) return;
        const ground = G.floorTop + (q.ph / TAU) * (G.H - G.floorTop) * 0.9;
        if (q.y < ground) {
          q.vy = Math.min(q.vy + 400 * s * dt, 160 * s);
          q.x += (q.vx + Math.sin(q.life * 5 + q.ph) * 40 * s) * dt;
          q.y = Math.min(ground, q.y + q.vy * dt);
          q.rot += 3 * dt;
        }
        g.save();
        g.translate(q.x, q.y);
        g.rotate(q.rot);
        g.fillRect(-q.r, -q.r * 0.6, q.r * 2, q.r * 1.2);
        g.restore();
      });
    }

    function drawDebris(dt, G) {
      const s = G.s;
      debris.forEach(q => {
        if (!q.rest) {
          q.vy += 1500 * s * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.rot += q.vr * dt;
          if (q.x < 10 || q.x > G.W - 10) { q.vx *= -0.6; q.x = U.clamp(q.x, 10, G.W - 10); }
          const ground = G.floorY + q.z;
          if (q.y > ground && q.vy > 0) {
            q.y = ground;
            q.vy *= -0.38; q.vx *= 0.65; q.vr *= 0.55;
            if (Math.abs(q.vy) < 90 * s) { q.vy = 0; q.vx = 0; q.vr = 0; q.rest = true; }
          }
        }
        g.save();
        g.translate(q.x, q.y);
        g.rotate(q.rot);
        if (q.kind === 'shard') {
          g.fillStyle = '#1d1e25';
          g.strokeStyle = '#4b505e';
          g.lineWidth = 3 * s;
          g.beginPath();
          q.pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.closePath(); g.fill(); g.stroke();
        } else if (q.kind === 'shoe') {
          g.fillStyle = '#e8483a';
          g.beginPath(); g.ellipse(0, 0, 32 * s, 15 * s, 0, 0, TAU); g.fill();
          g.fillStyle = '#fff'; g.fillRect(-28 * s, 6 * s, 56 * s, 5 * s);
        } else {
          glove(0, 0, 0.12 * G.r, s, q.side);
        }
        g.restore();
      });
    }

    function lerpRGB(a, b, k) {
      return `rgb(${Math.round(U.lerp(a[0], b[0], k))},${Math.round(U.lerp(a[1], b[1], k))},${Math.round(U.lerp(a[2], b[2], k))})`;
    }

    function drawCloud(G, a, ft) {
      const e = U.easeOut(U.clamp(a / 1.1));
      const alpha = (1 - U.range(ft, 1.9, 4.0) * 0.8) * (1 - U.range(ft, 6, 8.8));
      if (alpha <= 0) return;
      // colour: white-hot -> orange -> soot
      let col;
      if (a < 0.15) col = lerpRGB([255, 250, 210], [255, 210, 80], a / 0.15);
      else if (a < 0.55) col = lerpRGB([255, 210, 80], [235, 90, 30], (a - 0.15) / 0.4);
      else col = lerpRGB([235, 90, 30], [70, 64, 62], U.clamp((a - 0.55) / 0.8));
      const hi = a < 0.55 ? 'rgba(255,255,220,0.5)' : 'rgba(150,140,135,0.45)';
      g.globalAlpha = alpha;
      cloud.forEach(c => {
        const x = G.bx + Math.cos(c.a) * c.dist * e + Math.sin(ft * 0.9 + c.ph) * 6 * G.s;
        const y = G.by + G.r * 0.2 + Math.sin(c.a) * c.dist * e * 0.8 - a * c.rise;
        const rr = c.r0 * (0.3 + 0.9 * e) + a * 6 * G.s;
        g.fillStyle = col;
        g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
        g.fillStyle = hi;
        g.beginPath(); g.arc(x - rr * 0.25, y - rr * 0.25, rr * 0.55, 0, TAU); g.fill();
      });
      g.globalAlpha = 1;
    }

    function heapGeom(G, ft) {
      const hk = U.easeOut(U.range(ft, BOOM + 0.4, HEAP + 0.3));
      const c = ft - COUGH;
      let squash = 1;
      if (c > 0 && c < 1.1) squash = 1 + Math.sin(c * TAU * 2.6) * 0.16 * (1 - c / 1.1);
      const hw = 0.95 * G.r * (2 - squash) * Math.max(0.3, hk), hh = 0.55 * G.r * hk * squash;
      return { hk, hw, hh, top: G.floorY - hh };
    }

    function drawHeap(G, ft, t) {
      const s = G.s, r = G.r, x = G.bx, fy = G.floorY;
      const H0 = heapGeom(G, ft);
      if (H0.hk <= 0) return H0;
      const { hw, hh } = H0;
      g.fillStyle = '#17161a';
      g.beginPath();
      g.moveTo(x - hw, fy + 4 * s);
      g.bezierCurveTo(x - hw * 0.8, fy - hh * 1.15, x + hw * 0.8, fy - hh * 1.15, x + hw, fy + 4 * s);
      g.closePath();
      g.fill();
      bumps.forEach(b => {
        const bx = x + b.f * hw, by = fy - hh * (1 - b.f * b.f) * 0.8;
        g.beginPath(); g.arc(bx, by, Math.max(1, b.r * r * H0.hk), 0, TAU); g.fill();
      });
      g.fillStyle = '#5c5753';
      specks.forEach(q => {
        g.beginPath(); g.arc(x + q.f * hw, fy - hh * q.h * (1 - q.f * q.f), Math.max(0.5, q.r * r), 0, TAU); g.fill();
      });
      // eyes in the soot
      const ek = U.easeOutBack(U.range(ft, EYES, EYES + 0.35));
      if (ek > 0) {
        const ey = fy - hh * 0.5;
        const coughing = ft > COUGH && ft < COUGH + 0.75;
        const blink = (ft - EYES) % 1.9 < 0.12;
        [-1, 1].forEach(side => {
          const ex = x + side * 0.17 * r;
          if (coughing) {
            g.strokeStyle = '#fff'; g.lineWidth = 0.04 * r; g.lineCap = 'round';
            g.beginPath();
            g.moveTo(ex - side * 0.08 * r, ey - 0.07 * r); g.lineTo(ex + side * 0.06 * r, ey); g.lineTo(ex - side * 0.08 * r, ey + 0.07 * r);
            g.stroke();
            return;
          }
          const ry = Math.max(0.5, 0.13 * r * ek * (blink ? 0.12 : 1));
          g.fillStyle = '#fff';
          g.beginPath(); g.ellipse(ex, ey, Math.max(0.5, 0.1 * r * ek), ry, 0, 0, TAU); g.fill();
          if (!blink) {
            // dazed pupils roll around; later they peek up at the flag
            const look = U.range(ft, FLAG, FLAG + 0.5);
            const pa = ft * 3.2;
            const px = ex + U.lerp(Math.cos(pa) * 0.035 * r, 0.03 * r, look);
            const py = ey + U.lerp(Math.sin(pa) * 0.05 * r, -0.07 * r, look);
            g.fillStyle = '#111';
            g.beginPath(); g.arc(px, py, Math.max(0.5, 0.045 * r * ek), 0, TAU); g.fill();
          }
        });
      }
      // little white flag of surrender
      const fk = U.easeOut(U.range(ft, FLAG, FLAG + 0.7));
      if (fk > 0) {
        const sx = x + 0.5 * hw, sy = fy - hh * 0.55, top = sy - 1.15 * r * fk;
        g.strokeStyle = '#7a5530'; g.lineWidth = 6 * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, top); g.stroke();
        const fw = 0.55 * r, fh = 0.32 * r;
        g.fillStyle = '#fff'; g.strokeStyle = '#333'; g.lineWidth = 2.5 * s;
        g.beginPath();
        g.moveTo(sx, top);
        for (let k = 1; k <= 6; k++) g.lineTo(sx + (fw * k) / 6, top + Math.sin(t * 7 - k * 0.9) * 0.05 * r * (k / 6));
        for (let k = 6; k >= 0; k--) g.lineTo(sx + (fw * k) / 6, top + fh + Math.sin(t * 7 - k * 0.9) * 0.05 * r * (k / 6));
        g.closePath(); g.fill(); g.stroke();
      }
      return H0;
    }

    // The fuse cap is flung up by the blast and lands on top of the heap like a little hat.
    function drawCap(G, a, H0) {
      const r = G.r, land = CAP_LAND - BOOM;
      const k = U.clamp(a / land);
      const x = G.bx + U.lerp(0, 0.12 * r, k);
      const restY = H0.top - 0.12 * r;
      const y = a < land ? U.lerp(G.by - r, restY, k) - Math.sin(Math.PI * k) * G.H * 0.75 : restY;
      const rot = a < land ? a * 14 : 0.35;
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.fillStyle = '#4c5260'; g.fillRect(-0.25 * r, 0.1 * r, 0.5 * r, 0.09 * r);
      g.fillStyle = '#5d6473'; g.fillRect(-0.2 * r, -0.2 * r, 0.4 * r, 0.32 * r);
      g.fillStyle = '#2a2c33'; g.fillRect(-0.03 * r, -0.28 * r, 0.06 * r, 0.1 * r);
      g.restore();
      return [x - Math.sin(rot) * 0.28 * r, y - Math.cos(rot) * 0.28 * r];
    }

    function shockRing(G, a) {
      if (a > 0.9) return;
      const k = a / 0.9;
      g.strokeStyle = `rgba(255,255,240,${0.85 * (1 - k)})`;
      g.lineWidth = Math.max(1, 34 * G.s * (1 - k));
      g.beginPath(); g.arc(G.bx, G.by, U.easeOut(k) * Math.hypot(G.W, G.H) * 0.9, 0, TAU); g.stroke();
    }

    function fireball(G, a) {
      if (a > 0.7) return;
      const k = a / 0.7;
      const rr = G.r * (0.6 + U.easeOut(k) * 1.6);
      const grd = g.createRadialGradient(G.bx, G.by, 0, G.bx, G.by, rr);
      grd.addColorStop(0, `rgba(255,255,230,${1 - k})`);
      grd.addColorStop(0.5, `rgba(255,190,60,${0.9 * (1 - k)})`);
      grd.addColorStop(1, 'rgba(255,80,0,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(G.bx, G.by, rr, 0, TAU); g.fill();
    }

    function kaboom(G, a, ft) {
      if (a < 0.03) return;
      const s = G.s;
      const k = U.easeOutBack(U.clamp((a - 0.03) / 0.45));
      const size = Math.min(150 * s, (G.W * 0.9) / 5.6);
      g.save();
      g.translate(G.portrait ? G.W * 0.5 : G.W * 0.38, G.portrait ? G.H * 0.3 : G.H * 0.26);
      g.rotate(-0.08 + Math.sin(ft * 3) * 0.03);
      g.scale(k * (1 + Math.sin(ft * 9) * 0.02), k);
      g.font = `${size}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = size * 0.16;
      g.strokeStyle = '#2a0d00';
      g.strokeText('KABOOM!', size * 0.06, size * 0.06);
      g.fillStyle = '#e8381e';
      g.fillText('KABOOM!', size * 0.06, size * 0.06);
      g.strokeText('KABOOM!', 0, 0);
      g.fillStyle = '#ffd23d';
      g.fillText('KABOOM!', 0, 0);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom(), s = G.s;
        buildFuse(G);
        const fin = ft >= 0, a = ft - BOOM, post = fin && a >= 0;
        const pre = fin && !post;
        const kpre = pre ? ft / BOOM : 0;
        rayPhase += dt * (0.08 + (fin ? 1.2 : U.range(p, 0.8, 1) * 0.5));
        if (post && !boomed) { boomed = true; spawnBoom(G); }

        // whole-scene shake in the finale
        let amp = 0;
        if (pre) amp = (2 + 9 * kpre) * s;
        if (post) amp = 40 * s * Math.exp(-a * 2.4);
        g.save();
        g.translate((Math.sin(t * 71) + Math.sin(t * 43)) * 0.5 * amp, (Math.cos(t * 67) + Math.sin(t * 37)) * 0.5 * amp);

        const char = post ? U.range(a, 0, 0.25) : 0;
        background(G, p, char);
        sign(G, t, ft);
        if (post) scorch(G, char);

        const d = fin ? fuse.len : p * fuse.len;
        const sp = pointAt(d);

        if (!post) {
          const nerv = fin ? 1 : U.range(p, 0.35, 0.95);
          const panic = fin ? 1 : U.range(p, 0.8, 1);
          const sh = (nerv * 1.2 + panic * panic * 6) * s + kpre * 8 * s;
          const B = {
            x: G.bx + (Math.sin(t * 47) + Math.sin(t * 29) * 0.6) * sh,
            y: G.by + Math.cos(t * 39) * sh * 0.6 - Math.abs(Math.sin(t * 1.6)) * 5 * s * (1 - panic),
            rot: Math.sin(t * 1.3) * 0.05 * (1 - panic) + Math.sin(t * 53) * 0.03 * panic,
            swell: 1 + U.easeIn(kpre) * 0.22 + (pre ? Math.sin(t * 60) * 0.015 : 0),
            nerv, panic, p: fin ? 1 : p, squeeze: pre, knock: panic, hot: kpre, look: [sp.x, sp.y],
          };
          const tip = capTip(B.x, B.y, G.r, B.rot, B.swell);
          const spark = fin ? { x: tip[0], y: tip[1] } : sp;
          drawFuse(G, d, tip, true);
          drawBomb(G, B, t);
          exclaim(G, t, panic);

          // emitters
          sparkAcc += dt * (pre ? 240 : 45);
          while (sparkAcc > 1) { sparkAcc -= 1; emitSpark(spark.x, spark.y, s, pre); }
          smokeAcc += dt * 7;
          while (smokeAcc > 1) { smokeAcc -= 1; emitSmoke(spark.x, spark.y, s, false, false); }
          sweatAcc += dt * (nerv > 0.25 ? nerv * 3 + panic * 9 : 0);
          while (sweatAcc > 1) {
            sweatAcc -= 1;
            if (sweat.length < 40) {
              const an = -Math.PI * (0.1 + Math.random() * 0.8);
              sweat.push({
                x: B.x + Math.cos(an) * G.r * 0.95, y: B.y + Math.sin(an) * G.r * 0.95,
                vx: Math.cos(an) * 160 * s, vy: Math.sin(an) * 160 * s - 120 * s, r: (5 + Math.random() * 4) * s, life: 0,
              });
            }
          }
          const whistle = 1 - U.range(p, 0.2, 0.28);
          noteAcc += dt * (fin ? 0 : 1.2 * whistle);
          while (noteAcc > 1) {
            noteAcc -= 1;
            if (notes.length < 8) notes.push({ x: B.x + 0.25 * G.r, y: B.y + 0.3 * G.r, life: 0, a: whistle });
          }
          drawNotes(dt, s);
          drawSweat(dt, G);
          particles(dt, G);
          drawSpark(spark.x, spark.y, s, t, pre ? 1.5 + kpre : 1);
        } else {
          const ashA = 1 - U.range(a, 0.1, 1.6);
          if (ashA > 0) {
            g.globalAlpha = ashA;
            drawFuse(G, d, sp, false);
            g.globalAlpha = 1;
          }
          drawFlakes(dt, G);
          const H0 = drawHeap(G, ft, t);
          const capTop = drawCap(G, a, H0);
          // lingering wisps from the cap, soot coughs
          wispAcc += dt * (a > CAP_LAND - BOOM ? 2.5 : 0);
          while (wispAcc > 1) { wispAcc -= 1; emitSmoke(capTop[0], capTop[1], s, false, false); }
          while (coughs < 2 && ft >= COUGH + coughs * 0.32) {
            coughs++;
            for (let i = 0; i < 4; i++) emitSmoke(G.bx + (Math.random() - 0.5) * G.r * 0.4, H0.top + G.r * 0.1, s, true, true);
          }
          drawDebris(dt, G);
          particles(dt, G);
          fireball(G, a);
          drawCloud(G, a, ft);
          shockRing(G, a);
          kaboom(G, a, ft);
        }
        g.restore();

        // white flash (not shaken)
        if (post && a < 0.5) {
          g.fillStyle = `rgba(255,255,255,${1 - a / 0.5})`;
          g.fillRect(0, 0, G.W, G.H);
        }
      },

      finale() {
        // Fizz: hissing fuse with crackles, rising in pitch as it dives in.
        sfx.noise({ at: 0, dur: BOOM, vol: 0.22, filter: 'bandpass', ff: 2500, ffTo: 7000, q: 0.8, attack: 0.02, release: 0.04 });
        sfx.noise({ at: 0, dur: BOOM, vol: 0.1, filter: 'highpass', ff: 5000, attack: 0.01, release: 0.04, rate: 1.6 });
        for (let i = 0; i < 9; i++) sfx.pop({ at: (i / 9) * BOOM * 0.92 + Math.random() * 0.04, vol: 0.12, f: 2500 + Math.random() * 3000 });
        // The boom: sharp crack, low rumble (helper), and a mid-range body so laptop/projector speakers carry it.
        sfx.noise({ at: BOOM, dur: 0.3, vol: 0.45, filter: 'highpass', ff: 1500, attack: 0.001, release: 0.25 });
        sfx.boom({ at: BOOM, vol: 0.55, dur: 2.8 });
        sfx.noise({ at: BOOM, dur: 1.7, vol: 0.4, filter: 'bandpass', ff: 900, ffTo: 160, q: 0.5, attack: 0.003, release: 1.4 });
        sfx.tone({ at: BOOM, dur: 0.9, f: 180, to: 45, type: 'sawtooth', vol: 0.18, filter: 'lowpass', ff: 1400, ffTo: 200, attack: 0.003, release: 0.7 });
        for (let i = 0; i < 10; i++) sfx.pop({ at: BOOM + 0.15 + Math.random() * 1.0, vol: 0.08 + Math.random() * 0.08, f: 600 + Math.random() * 1200 });
        // Debris clatter, thinning out; the cap lands with a "tink".
        for (let i = 0; i < 14; i++) {
          const at = BOOM + 0.7 + i * 0.11 + Math.random() * 0.06, v = 0.28 * (1 - i / 16);
          sfx.pop({ at, vol: v, f: 1800 + Math.random() * 2500 });
          if (i % 3 === 0) sfx.tone({ at, dur: 0.25, f: 2200 + Math.random() * 1500, type: 'triangle', vol: v * 0.25, attack: 0.001, release: 0.22 });
        }
        sfx.tone({ at: CAP_LAND, dur: 0.6, f: 2637, type: 'triangle', vol: 0.16, attack: 0.001, release: 0.55 });
        sfx.tone({ at: CAP_LAND, dur: 0.4, f: 5274, type: 'sine', vol: 0.05, attack: 0.001, release: 0.35 });
        // Two sooty little coughs.
        [COUGH, COUGH + 0.32].forEach(at => {
          sfx.noise({ at, dur: 0.2, vol: 0.28, filter: 'bandpass', ff: 1100, q: 1.5, attack: 0.005, release: 0.15 });
          sfx.voice({ at, f: 200, to: 130, dur: 0.2, vol: 0.1, formants: [[600, 1], [1100, 0.6]] });
        });
      },

      destroy() {},
    };
  },
});
