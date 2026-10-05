// A goofy party guy pumps up a balloon with a hand pump. Progress = balloon size.
// Near the end the balloon is enormous, squeaking and shaking; the pumper leans away in terror.
// Finale: POP — confetti, rubber shreds, soot face, hat blown off, then a party-horn toot.
Minutka.register({
  id: 'balloon',
  name: 'Pump It Up',
  emoji: '🎈',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(11);

    // Finale timeline (seconds after time-up), shared by the sound and the picture.
    const T_POP = 0.7;
    const TOOTS = [[1.75, 0.3], [2.2, 0.85], [3.8, 0.75]]; // [at, dur] of each party-horn toot
    const MINI_POPS = [0.4, 0.62, 0.86].map(d => T_POP + d); // the little gift balloons go too

    const flagHues = [350, 45, 200, 130, 280, 20, 170, 55, 320, 100, 230, 10, 150, 260];
    const flagPh = flagHues.map(() => R() * U.TAU);
    const minis = [{ hue: 200, dx: -30, h: 1.0 }, { hue: 48, dx: 2, h: 1.3 }, { hue: 135, dx: 30, h: 0.85 }];
    const shredShapes = Array.from({ length: 14 }, () =>
      Array.from({ length: 6 }, (_, k) => ({ a: (k / 6) * U.TAU + R() * 0.7, r: 0.45 + R() * 0.75 })));
    const confettiHues = [350, 45, 200, 130, 290, 20, 170];
    const squeaks = ['squeak!', 'eek!', 'creak…', 'SQUEE!'];

    const confetti = []; // capped at spawn (one burst)
    const shreds = [];
    let pumpPhase = 0;
    let popped = false;
    let frozenK = 1;

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const c = s * 1.3; // the pumper and his pump are drawn a bit larger than the room
      const floorY = H * (W > H ? 0.9 : 0.86);
      const pumpX = Math.max(W * 0.25, 150 * c);
      const charX = pumpX - 88 * c;
      const nx = W > H ? W * 0.57 : W * 0.56; // nozzle: where the balloon is tied on
      const ny = floorY - 8 * s;
      // at p=1 the balloon nearly touches the ceiling; any over-stretch beyond that squashes it sideways
      const rMax = Math.max(20 * s, Math.min(W - nx - 12, (ny - 14 * s - H * 0.03) / 2.36));
      const giftX = W - 85 * s;
      const gifts = giftX - 55 * s > nx + rMax * 1.32;
      return { W, H, s, c, floorY, pumpX, charX, nx, ny, rMax, giftX, gifts };
    }

    const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

    // ------------------------------------------------------------ scenery
    function room(G, t) {
      const s = G.s;
      const grd = g.createLinearGradient(0, 0, 0, G.floorY);
      grd.addColorStop(0, '#ffd9e8');
      grd.addColorStop(1, '#ffeccf');
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.H);
      // wallpaper stripes + polka dots
      g.fillStyle = 'rgba(255,255,255,0.35)';
      for (let x = 0; x < G.W; x += 80 * s) g.fillRect(x, 0, 34 * s, G.floorY);
      g.fillStyle = 'rgba(255,140,180,0.25)';
      for (let x = 57 * s; x < G.W; x += 80 * s) {
        for (let y = 40 * s; y < G.floorY - 20 * s; y += 70 * s) {
          g.beginPath(); g.arc(x, y + ((x / (80 * s)) % 2) * 35 * s, 5 * s, 0, U.TAU); g.fill();
        }
      }
      // skirting + floor boards
      g.fillStyle = '#fff6ea';
      g.fillRect(0, G.floorY - 16 * s, G.W, 16 * s);
      g.fillStyle = '#c0834f';
      g.fillRect(0, G.floorY, G.W, G.H - G.floorY);
      g.fillStyle = 'rgba(90,45,15,0.28)';
      for (let y = G.floorY + 18 * s, row = 0; y < G.H; y += 22 * s, row++) {
        g.fillRect(0, y, G.W, 2 * s);
        for (let x = (row % 2) * 90 * s; x < G.W; x += 180 * s) g.fillRect(x, y - 20 * s, 2 * s, 20 * s);
      }
    }

    // Bunting across the ceiling. A huge balloon (bump) shoves the string up over its top;
    // after the pop the string twangs back.
    function bunting(G, t, bump, after) {
      const s = G.s;
      const top = 26 * s, sag = Math.min(70 * s, G.H * 0.08);
      const twang = after >= 0 ? Math.sin(after * 13) * Math.exp(-after * 2.5) * 40 * s : 0;
      const yAt = x => {
        const arc = 1 - Math.pow((2 * x) / G.W - 1, 2);
        let y = top + (sag + twang) * arc + Math.sin(t * 1.3) * 3 * s;
        if (bump) {
          const d = (x - bump.cx) / (bump.rx * 1.04);
          if (Math.abs(d) < 1) y = Math.min(y, bump.cy - bump.ry * 0.98 * Math.sqrt(1 - d * d) - 3 * s);
        }
        return Math.max(3 * s, y);
      };
      g.strokeStyle = '#7a4b2a';
      g.lineWidth = 2.5 * s;
      g.beginPath();
      for (let x = 0; x <= G.W + 10; x += 10) x === 0 ? g.moveTo(x, yAt(x)) : g.lineTo(x, yAt(x));
      g.stroke();
      const n = Math.max(6, Math.floor(G.W / (72 * s)));
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.5) / n) * G.W, y = yAt(x);
        const slope = Math.atan2(yAt(x + 6 * s) - yAt(x - 6 * s), 12 * s);
        g.save();
        g.translate(x, y);
        g.rotate(slope + Math.sin(t * 2.2 + flagPh[i % 14]) * 0.12);
        g.fillStyle = `hsl(${flagHues[i % 14]}, 80%, 58%)`;
        g.beginPath(); g.moveTo(-20 * s, 0); g.lineTo(20 * s, 0); g.lineTo(0, 44 * s); g.fill();
        g.restore();
      }
    }

    function balloonPath(rx, ry) {
      g.beginPath();
      g.moveTo(0, -ry);
      g.bezierCurveTo(rx * 0.56, -ry, rx, -ry * 0.6, rx, -ry * 0.1);
      g.bezierCurveTo(rx, ry * 0.45, rx * 0.45, ry * 0.92, 0, ry);
      g.bezierCurveTo(-rx * 0.45, ry * 0.92, -rx, ry * 0.45, -rx, -ry * 0.1);
      g.bezierCurveTo(-rx, -ry * 0.6, -rx * 0.56, -ry, 0, -ry);
      g.closePath();
    }

    function gifts(G, t, ft) {
      if (!G.gifts) return;
      const s = G.s, x = G.giftX, f = G.floorY;
      minis.forEach((m, i) => {
        const popAt = MINI_POPS[i];
        const bx = x + m.dx * s + Math.sin(t * 1.4 + i * 2) * 6 * s;
        const by = f - 70 * s - 150 * s * m.h + Math.sin(t * 1.9 + i) * 5 * s;
        g.strokeStyle = 'rgba(60,40,40,0.7)';
        g.lineWidth = 1.5 * s;
        g.beginPath();
        g.moveTo(x, f - 58 * s);
        if (ft >= popAt) g.quadraticCurveTo(x + m.dx * s * 0.5, f - 100 * s, bx + 8 * s, f - 120 * s - 20 * s * m.h); // limp
        else g.quadraticCurveTo(x + m.dx * s * 0.5, (by + f) / 2, bx, by + 32 * s);
        g.stroke();
        if (ft >= popAt) {
          const a = ft - popAt;
          if (a < 0.18) star(bx, by, 34 * s * (0.6 + a * 3), 16 * s, 8, '#fff3a0');
          return;
        }
        g.save();
        g.translate(bx, by);
        g.rotate(Math.sin(t * 1.4 + i * 2) * 0.08);
        g.fillStyle = `hsl(${m.hue}, 80%, 55%)`;
        balloonPath(26 * s, 32 * s);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.beginPath(); g.ellipse(-9 * s, -12 * s, 5 * s, 9 * s, -0.5, 0, U.TAU); g.fill();
        g.restore();
      });
      // present box
      g.fillStyle = '#4b6cf0';
      g.fillRect(x - 40 * s, f - 60 * s, 80 * s, 60 * s);
      g.fillStyle = '#ffcc2e';
      g.fillRect(x - 7 * s, f - 60 * s, 14 * s, 60 * s);
      g.fillRect(x - 46 * s, f - 66 * s, 92 * s, 14 * s);
      g.beginPath(); g.ellipse(x - 14 * s, f - 72 * s, 14 * s, 8 * s, -0.4, 0, U.TAU); g.ellipse(x + 14 * s, f - 72 * s, 14 * s, 8 * s, 0.4, 0, U.TAU); g.fill();
    }

    function star(x, y, ro, ri, n, color) {
      g.fillStyle = color;
      g.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * U.TAU - Math.PI / 2;
        const r = i % 2 ? ri : ro;
        i === 0 ? g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
    }

    // ------------------------------------------------------------ pump + hose
    function handleY(G, k) {
      return G.floorY - 120 * G.c - U.lerp(72, 16, k) * G.c;
    }

    function hosePoint(G, u) {
      const s = G.c;
      const p0 = [G.pumpX + 16 * s, G.floorY - 9 * s];
      const p1 = [G.pumpX + 90 * s, G.floorY + 10 * s];
      const p2 = [G.nx - 90 * s, G.floorY + 10 * s];
      const p3 = [G.nx, G.ny];
      const v = 1 - u;
      return [0, 1].map(i => v * v * v * p0[i] + 3 * v * v * u * p1[i] + 3 * v * u * u * p2[i] + u * u * u * p3[i]);
    }

    function hoseAndPump(G, k, airU) {
      const s = G.c, x = G.pumpX, f = G.floorY;
      // hose
      g.strokeStyle = '#2f8f5b';
      g.lineWidth = 9 * s;
      g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const q = hosePoint(G, i / 24);
        i === 0 ? g.moveTo(q[0], q[1]) : g.lineTo(q[0], q[1]);
      }
      g.stroke();
      if (airU >= 0) {
        const q = hosePoint(G, airU);
        g.fillStyle = '#2f8f5b';
        g.beginPath(); g.arc(q[0], q[1], 9 * s, 0, U.TAU); g.fill();
      }
      // nozzle
      g.fillStyle = '#d9a43a';
      g.fillRect(G.nx - 9 * s, G.ny - 10 * s, 18 * s, 14 * s);
      // pump: foot plate, barrel, rod, T-handle
      const hy = handleY(G, k);
      g.fillStyle = '#3a3a44';
      g.beginPath(); g.roundRect(x - 36 * s, f - 10 * s, 72 * s, 12 * s, 4 * s); g.fill();
      g.fillStyle = '#c4c9d0';
      g.fillRect(x - 4 * s, hy, 8 * s, f - 120 * s - hy);
      g.fillStyle = '#e04848';
      g.beginPath(); g.roundRect(x - 17 * s, f - 124 * s, 34 * s, 116 * s, 7 * s); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(x - 10 * s, f - 116 * s, 6 * s, 100 * s);
      g.fillStyle = '#3a3a44';
      g.fillRect(x - 19 * s, f - 128 * s, 38 * s, 8 * s);
      g.beginPath(); g.roundRect(x - 40 * s, hy - 8 * s, 80 * s, 15 * s, 7 * s); g.fill();
    }

    // ------------------------------------------------------------ the balloon
    function balloon(G, t, p, ft, r, puff) {
      const s = G.s;
      const strain = U.range(p, 0.55, 1);
      const panic = U.range(p, 0.82, 1);
      const pre = ft >= 0 ? U.clamp(ft / T_POP) : 0;
      const wob = Math.sin(t * 3.1) * 0.025 + puff;
      const neck = 14 * s + r * 0.12;
      // squashed against the ceiling: height is capped, the excess bulges sideways
      const ryWant = r * 1.12 * (1 - wob * 0.5);
      const ryMax = (G.ny - neck - 4 * s) / 2;
      const squash = ryWant > ryMax ? ryWant / ryMax : 1;
      const ry = Math.min(ryWant, ryMax);
      // near the end the rubber bulges sideways too, looming over the pumper
      const widen = 1 + 0.22 * U.easeIn(strain) + 0.06 * pre;
      const rx = Math.min(r * (widen + wob) * squash, Math.min(G.W - G.nx, G.nx) - 8);
      const jitter = (panic * panic * 3 + pre * 8) * s;
      const cx = G.nx + Math.sin(t * 1.2) * r * 0.04 + Math.sin(t * 51) * jitter;
      const cy = G.ny - neck - ry + Math.cos(t * 47) * jitter;
      const tilt = Math.sin(t * 1.1) * 0.05;

      // neck down to the nozzle
      const kx = cx + Math.sin(tilt) * -ry, ky = cy + Math.cos(tilt) * ry;
      g.strokeStyle = `hsl(355, 75%, 44%)`;
      g.lineWidth = 6 * s + r * 0.05;
      g.beginPath();
      g.moveTo(kx, ky);
      g.quadraticCurveTo(kx + Math.sin(t * 4) * 6 * s, (ky + G.ny) / 2, G.nx, G.ny - 8 * s);
      g.stroke();

      g.save();
      g.translate(cx, cy);
      g.rotate(tilt);
      // rubber gets thinner (lighter) as it stretches
      const L = U.lerp(50, 64, strain);
      const grd = g.createRadialGradient(-rx * 0.35, -ry * 0.4, Math.max(1, r * 0.05), 0, 0, r * 1.25);
      grd.addColorStop(0, `hsl(355, 95%, ${L + 22}%)`);
      grd.addColorStop(0.5, `hsl(355, 85%, ${L}%)`);
      grd.addColorStop(1, `hsl(350, 80%, ${L - 18}%)`);
      g.fillStyle = grd;
      balloonPath(rx, ry);
      g.fill();
      g.strokeStyle = 'rgba(110,10,25,0.6)';
      g.lineWidth = 3 * s;
      g.stroke();
      // knot
      g.fillStyle = `hsl(355, 75%, 42%)`;
      g.beginPath(); g.moveTo(0, ry - 2 * s); g.lineTo(-9 * s, ry + 10 * s); g.lineTo(9 * s, ry + 10 * s); g.fill();
      // shine
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath(); g.ellipse(-rx * 0.42, -ry * 0.45, rx * 0.12, ry * 0.24, 0.55, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(-rx * 0.22, -ry * 0.72, Math.max(1, r * 0.04), 0, U.TAU); g.fill();
      markerFace(rx, ry, r, t, strain, panic, s);
      // condensation "sweat" sliding down the rubber
      if (strain > 0.3) {
        g.fillStyle = 'rgba(200,235,255,0.85)';
        for (let i = 0; i < 3; i++) {
          const q = (t * 0.35 + i / 3) % 1;
          const a = -0.4 + i * 0.35;
          const x = Math.cos(a) * rx * 0.93, y = -ry * 0.3 + q * ry * 0.7;
          sweatDrop(x, y, (4 + 6 * strain) * s * (1 - q * 0.4));
        }
      }
      g.restore();

      // stress marks + squeak words
      if (panic > 0 || ft >= 0) {
        const fl = Math.sin(t * 23) > -0.3;
        if (fl) {
          g.strokeStyle = '#7a0f22';
          g.lineWidth = 4 * s;
          g.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const a = -1.9 + i * 0.32 + Math.sin(t * 9 + i) * 0.04;
            const r1 = r * 1.18 + 6 * s, r2 = r1 + 26 * s;
            g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke();
            const b = -0.7 + i * 0.32;
            g.beginPath(); g.moveTo(cx + Math.cos(b) * r1, cy + Math.sin(b) * r1); g.lineTo(cx + Math.cos(b) * r2, cy + Math.sin(b) * r2); g.stroke();
          }
        }
        const slot = Math.floor(t / 1.1);
        const life = (t / 1.1) % 1;
        const fr = (slot * 0.73) % 1;
        const a = slot % 2 ? -0.55 + fr * 0.7 : -2.75 + fr * 0.35; // on the flanks, clear of the bunting
        const word = ft >= 0 ? 'SQUEEE!' : squeaks[slot % squeaks.length];
        g.save();
        g.translate(U.clamp(cx + Math.cos(a) * r * 0.95, 60 * s, G.W - 60 * s), Math.max(30 * s, cy + Math.sin(a) * r * 1.05));
        g.rotate(Math.sin(slot * 2.3) * 0.25);
        const k = U.easeOutBack(U.clamp(life / 0.25));
        g.scale(k, k);
        g.globalAlpha = 1 - U.range(life, 0.7, 1);
        g.font = `${(34 + 16 * (ft >= 0 ? 1 : panic)) * s}px Bungee, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 6 * s;
        g.strokeStyle = '#fff';
        g.strokeText(word, 0, 0);
        g.fillStyle = '#c3122f';
        g.fillText(word, 0, 0);
        g.restore();
        g.globalAlpha = 1;
      }
      return { cx, cy, rx, ry };
    }

    // The smiley someone drew on the balloon with a marker. It stretches with the rubber.
    function markerFace(rx, ry, r, t, strain, panic, s) {
      g.strokeStyle = '#1b1b22';
      g.fillStyle = '#1b1b22';
      g.lineCap = 'round';
      g.lineWidth = Math.max(2 * s, r * 0.028);
      const ey = -ry * 0.12, ex = rx * 0.3;
      const er = r * U.lerp(0.07, 0.14, strain);
      const dart = panic > 0 ? (Math.floor(t * 3) % 2 ? 1 : -1) * er * 0.4 : Math.sin(t * 0.7) * er * 0.2;
      [-1, 1].forEach(d => {
        if (strain > 0.25) {
          g.fillStyle = '#fff';
          g.beginPath(); g.ellipse(d * ex, ey, er, er * 1.15, 0, 0, U.TAU); g.fill(); g.stroke();
          g.fillStyle = '#1b1b22';
          g.beginPath(); g.arc(d * ex + dart, ey + er * 0.2, Math.max(1, er * U.lerp(0.5, 0.25, strain)), 0, U.TAU); g.fill();
          // worried brows
          g.beginPath();
          g.moveTo(d * (ex - er * 0.9), ey - er * 1.5 - strain * er * 0.6);
          g.lineTo(d * (ex + er * 0.9), ey - er * 1.5 + strain * er * 0.3);
          g.stroke();
        } else {
          g.beginPath(); g.ellipse(d * ex, ey, er * 0.55, er * 0.85, 0, 0, U.TAU); g.fill();
        }
      });
      // mouth: grin -> flat -> wobbly grimace
      const my = ry * 0.3, mw = rx * 0.34;
      g.beginPath();
      if (strain < 0.7) {
        const c = U.lerp(r * 0.22, -r * 0.04, strain / 0.7);
        g.moveTo(-mw, my);
        g.quadraticCurveTo(0, my + c, mw, my);
      } else {
        const amp = r * 0.035 * (1 + panic);
        for (let i = 0; i <= 12; i++) {
          const x = -mw + (i / 12) * 2 * mw;
          const y = my + Math.sin(i * 1.6 + t * 14) * amp;
          i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
      }
      g.stroke();
    }

    function sweatDrop(x, y, r) {
      g.beginPath();
      g.moveTo(x, y - r * 1.8);
      g.quadraticCurveTo(x + r, y - r * 0.2, x, y + r);
      g.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.8);
      g.fill();
    }

    // ------------------------------------------------------------ the pumper
    function hornExtend(ft) {
      let e = 0;
      TOOTS.forEach(([at, dur]) => {
        if (ft >= at - 0.06 && ft <= at + dur + 0.12) {
          e = Math.max(e, U.easeOut(U.clamp((ft - at + 0.06) / 0.12)) * (1 - U.range(ft, at + dur, at + dur + 0.12)));
        }
      });
      return e;
    }

    function arm(sx, sy, hx, hy, color, s) {
      const L = 78 * s;
      const dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
      const bend = d < L ? Math.sqrt(L * L / 4 - d * d / 4) : 0;
      const ex = (sx + hx) / 2 - (dy / d) * bend * -1, ey = (sy + hy) / 2 + (dx / d) * bend;
      g.strokeStyle = color;
      g.lineWidth = 13 * s;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke();
      g.fillStyle = '#f2c094';
      g.beginPath(); g.arc(hx, hy, 9 * s, 0, U.TAU); g.fill();
    }

    function character(G, t, p, ft, k) {
      const s = G.c, f = G.floorY;
      const fear = U.range(p, 0.5, 1), panic = U.range(p, 0.85, 1);
      const after = ft >= T_POP ? ft - T_POP : -1;
      const pre = ft >= 0 && after < 0;
      const slide = after >= 0 ? -38 * s * U.easeOut(U.clamp(after / 0.3)) : 0;
      const tremble = (panic * 2 + (pre ? 3 : 0)) * Math.sin(t * 43) * s;
      let lean;
      if (after < 0) lean = U.lerp(0.14, -0.45, U.easeInOut(fear)) + Math.sin(t * 1.7) * 0.02 - (pre ? 0.08 : 0);
      else lean = U.lerp(-0.12, -0.7, Math.exp(-after * 1.6)) + Math.sin(after * 11) * 0.12 * Math.exp(-after * 2.2);
      const crouch = after < 0 ? k * 12 * s : 0;
      const fx = Math.max(G.charX + slide, 55 * s); // stay on screen in portrait
      const hip = [fx + tremble, f - 74 * s + crouch];

      // legs (knees knock when scared)
      const knock = panic * Math.sin(t * 38) * 4 * s;
      g.strokeStyle = '#2d3a7a';
      g.lineWidth = 16 * s;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      [-1, 1].forEach(d => {
        g.beginPath();
        g.moveTo(hip[0] + d * 9 * s, hip[1]);
        g.lineTo(fx + d * 12 * s + 10 * s + knock * d, f - 36 * s + crouch * 0.5);
        g.lineTo(fx + d * 18 * s, f - 8 * s);
        g.stroke();
      });
      g.fillStyle = '#222';
      [-1, 1].forEach(d => { g.beginPath(); g.ellipse(fx + d * 18 * s + 8 * s, f - 5 * s, 17 * s, 8 * s, 0, 0, U.TAU); g.fill(); });

      const toWorld = (x, y) => { const q = rot(x, y, lean); return [hip[0] + q[0], hip[1] + q[1]]; };
      const shoulder = toWorld(10 * s, -70 * s);
      const headC = toWorld(10 * s, -118 * s);
      const tilt = lean - fear * 0.12 + Math.sin(t * 2.1) * 0.04;
      const mouthW = (() => { const q = rot(30 * s, 18 * s, tilt); return [headC[0] + q[0], headC[1] + q[1]]; })();

      // hand targets
      const hy = handleY(G, k);
      let near, far;
      if (after < 0) {
        near = [G.pumpX - 30 * s, hy];
        far = [G.pumpX - 14 * s, hy - 2 * s];
      } else {
        const fl = Math.exp(-after * 0.9);
        const flailN = [shoulder[0] + 30 * s + Math.sin(after * 13) * 26 * s * fl, shoulder[1] - 70 * s + Math.cos(after * 11) * 14 * s];
        const flailF = [shoulder[0] - 46 * s + Math.sin(after * 12 + 1) * 24 * s * fl, shoulder[1] - 62 * s + Math.cos(after * 10) * 12 * s];
        const hang = [shoulder[0] - 6 * s, shoulder[1] + 70 * s];
        const toHorn = U.easeInOut(U.range(ft, TOOTS[0][0] - 0.45, TOOTS[0][0] - 0.1));
        near = [U.lerp(flailN[0], mouthW[0] + 6 * s, toHorn), U.lerp(flailN[1], mouthW[1] + 8 * s, toHorn)];
        const droop = U.easeInOut(U.range(after, 1.2, 1.8));
        far = [U.lerp(flailF[0], hang[0], droop), U.lerp(flailF[1], hang[1], droop)];
      }

      arm(shoulder[0] - 6 * s, shoulder[1], far[0], far[1], '#d9772a', s);

      // torso: striped party shirt
      g.save();
      g.translate(hip[0], hip[1]);
      g.rotate(lean);
      g.fillStyle = '#ff9a3c';
      g.beginPath(); g.roundRect(-26 * s, -86 * s, 54 * s, 92 * s, 20 * s); g.fill();
      g.fillStyle = '#ffdd55';
      for (let i = 0; i < 4; i++) g.fillRect(-26 * s, -72 * s + i * 20 * s, 54 * s, 7 * s);
      g.fillStyle = '#2d3a7a';
      g.fillRect(-26 * s, -6 * s, 54 * s, 12 * s);
      g.restore();

      head(G, headC, tilt, t, ft, after, fear, panic, s);
      arm(shoulder[0] + 4 * s, shoulder[1], near[0], near[1], '#ff9a3c', s);

      // party hat: on the head, then blasted off on the pop
      if (after < 0) {
        g.save();
        g.translate(headC[0], headC[1]);
        g.rotate(tilt - 0.25);
        partyHat(0, -36 * s, s, 0);
        g.restore();
      } else {
        const q = U.clamp(after / 1.3);
        const top = rot(0, -40 * s, tilt);
        const x0 = headC[0] + top[0], y0 = headC[1] + top[1];
        const hx = x0 - 170 * s * q;
        const hy2 = U.lerp(y0, f + 14 * s, q * q) - 300 * s * Math.sin(Math.PI * q) * (1 - q * 0.3);
        g.save();
        g.translate(Math.max(30 * s, hx), hy2);
        g.rotate(-0.25 - q * U.TAU * 2.25);
        partyHat(0, 0, s, 0);
        g.restore();
      }

      // dazed stars circling the head
      if (after > 0.35) {
        for (let i = 0; i < 3; i++) {
          const a = t * 3 + (i * U.TAU) / 3;
          star(headC[0] + Math.cos(a) * 52 * s, headC[1] - 50 * s + Math.sin(a) * 14 * s, 11 * s, 5 * s, 5, '#ffd21f');
        }
      }
      return { mouthW, tilt };
    }

    function partyHat(x, y, s, a) {
      g.fillStyle = '#7b4dff';
      g.beginPath(); g.moveTo(x - 20 * s, y + 6 * s); g.lineTo(x, y - 52 * s); g.lineTo(x + 20 * s, y + 6 * s); g.fill();
      g.fillStyle = '#ffdd55';
      g.beginPath(); g.moveTo(x - 13 * s, y - 14 * s); g.lineTo(x - 6 * s, y - 34 * s); g.lineTo(x + 6 * s, y - 34 * s); g.lineTo(x + 13 * s, y - 14 * s); g.fill();
      g.fillStyle = '#ff4f8b';
      g.beginPath(); g.arc(x, y - 54 * s, 8 * s, 0, U.TAU); g.fill();
    }

    function head(G, c, tilt, t, ft, after, fear, panic, s) {
      g.save();
      g.translate(c[0], c[1]);
      g.rotate(tilt);
      const blown = after >= 0;
      // hair: spikes up, blown straight back after the pop
      const hairA = blown ? -1.25 + Math.sin(t * 20) * 0.05 * Math.exp(-after) : -0.15 + Math.sin(t * 2) * 0.04;
      g.fillStyle = blown ? '#2b2522' : '#6b3a1e';
      for (let i = 0; i < 6; i++) {
        const ba = -2.5 + i * 0.32;
        const bx = Math.cos(ba) * 34 * s, by = Math.sin(ba) * 34 * s;
        const len = (blown ? 44 : 26 + (i % 2) * 8 + fear * 10) * s; // hair stands on end with fear
        const da = -Math.PI / 2 + hairA + (blown ? 0 : (i - 2.5) * 0.18);
        g.beginPath();
        g.moveTo(bx - 9 * s, by + 4 * s);
        g.lineTo(bx + Math.cos(da) * len, by + Math.sin(da) * len);
        g.lineTo(bx + 9 * s, by + 4 * s);
        g.fill();
      }
      // face
      g.fillStyle = '#f6c9a0';
      g.beginPath(); g.arc(0, 0, 38 * s, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(-30 * s, 6 * s, 10 * s, 0, U.TAU); g.fill();
      if (blown) {
        // soot
        g.fillStyle = 'rgba(40,36,34,0.82)';
        g.beginPath(); g.arc(14 * s, 2 * s, 30 * s, 0, U.TAU); g.fill();
        g.beginPath(); g.arc(-6 * s, -18 * s, 18 * s, 0, U.TAU); g.fill();
        g.beginPath(); g.arc(24 * s, 22 * s, 16 * s, 0, U.TAU); g.fill();
      } else {
        g.fillStyle = `rgba(255,90,90,${0.25 + fear * 0.35})`;
        g.beginPath(); g.arc(4 * s, 16 * s, 8 * s, 0, U.TAU); g.fill();
      }
      // eyes
      const blink = !blown && (t % 3.7) < 0.12;
      const eyeR = (blown ? 13 : 10 + fear * 4) * s;
      let lx = 3, ly = -2.5; // look at the balloon
      if (panic > 0 && Math.floor(t * 2.5) % 2) { lx = -1; ly = 1.5; } // ...and at the audience
      if (blown) { lx = Math.sin(t * 6) * 2; ly = Math.cos(t * 6) * 2; }
      [6, 26].forEach(ex => {
        if (blink || (blown && after < 0.25)) {
          g.strokeStyle = '#1b1b22'; g.lineWidth = 3 * s;
          g.beginPath(); g.moveTo(ex * s - eyeR, -6 * s); g.lineTo(ex * s + eyeR, -6 * s); g.stroke();
          return;
        }
        g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(ex * s, -6 * s, eyeR * 0.8, eyeR, 0, 0, U.TAU); g.fill();
        g.fillStyle = '#1b1b22';
        g.beginPath(); g.arc(ex * s + lx * s, -6 * s + ly * s, (blown ? 2.5 : 5 - fear * 1.5) * s, 0, U.TAU); g.fill();
      });
      // brows
      if (!blown) {
        g.strokeStyle = '#4a2a14';
        g.lineWidth = 4 * s;
        g.lineCap = 'round';
        [6, 26].forEach((ex, i) => {
          const d = i === 0 ? -1 : 1;
          const up = fear * 6 * s;
          g.beginPath();
          g.moveTo(ex * s - 9 * s, -20 * s - (d < 0 ? 0 : up) - fear * 3 * s);
          g.lineTo(ex * s + 9 * s, -20 * s - (d < 0 ? up : 0) - fear * 3 * s);
          g.stroke();
        });
      }
      // nose
      g.fillStyle = blown ? '#5a3f36' : '#f09a7a';
      g.beginPath(); g.ellipse(40 * s, 6 * s, 13 * s, 10 * s, 0, 0, U.TAU); g.fill();
      // mouth
      g.strokeStyle = '#7a2020';
      g.lineWidth = 3.5 * s;
      g.lineCap = 'round';
      const e = ft >= 0 ? hornExtend(ft) : 0;
      if (blown) {
        if (ft < TOOTS[0][0] - 0.2) {
          g.fillStyle = '#5a1515';
          g.beginPath(); g.ellipse(24 * s, 22 * s, 6 * s, 8 * s, 0, 0, U.TAU); g.fill();
        }
      } else if (panic > 0.15) {
        // gritted teeth
        g.fillStyle = '#fff';
        g.beginPath(); g.roundRect(10 * s, 15 * s, 26 * s, 12 * s, 3 * s); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(10 * s, 21 * s); g.lineTo(36 * s, 21 * s);
        for (let x = 16; x < 36; x += 6) { g.moveTo(x * s, 15 * s); g.lineTo(x * s, 27 * s); }
        g.lineWidth = 1.5 * s;
        g.stroke();
      } else if (fear > 0.2) {
        g.beginPath();
        for (let i = 0; i <= 6; i++) {
          const x = (10 + i * 4) * s, y = (21 + (i % 2 ? -2 : 2)) * s;
          i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
      } else {
        // concentrating grin, tongue out
        g.fillStyle = '#ff6f8e';
        g.beginPath(); g.ellipse(32 * s, 22 * s + Math.sin(t * 7) * 1.2 * s, 5 * s, 4 * s, 0.3, 0, U.TAU); g.fill();
        g.beginPath(); g.moveTo(8 * s, 16 * s); g.quadraticCurveTo(22 * s, 28 * s, 36 * s, 18 * s); g.stroke();
      }
      // party horn (blower): curled up, unrolls on each toot
      if (blown && ft >= TOOTS[0][0] - 0.35) {
        const len = U.lerp(10, 120, e) * s;
        g.strokeStyle = '#ffdd55';
        g.lineWidth = 9 * s;
        g.lineCap = 'butt';
        g.beginPath(); g.moveTo(26 * s, 22 * s); g.lineTo(26 * s + len, 22 * s - len * 0.12); g.stroke();
        g.strokeStyle = '#ff4f8b';
        g.setLineDash([8 * s, 8 * s]);
        g.beginPath(); g.moveTo(26 * s, 22 * s); g.lineTo(26 * s + len, 22 * s - len * 0.12); g.stroke();
        g.setLineDash([]);
        if (e < 0.95) {
          g.strokeStyle = '#ffdd55';
          g.lineWidth = 7 * s;
          g.beginPath(); g.arc(26 * s + len, 22 * s - len * 0.12 + 10 * s, Math.max(2 * s, 11 * s * (1 - e)), -Math.PI / 2, Math.PI * 1.3); g.stroke();
        }
        g.fillStyle = '#3db0ff';
        g.fillRect(16 * s, 17 * s, 14 * s, 10 * s);
        if (e > 0.5) {
          g.save();
          g.translate(46 * s + len, -10 * s - len * 0.12);
          g.rotate(-tilt - 0.15);
          g.font = `${40 * s}px Bungee, sans-serif`;
          g.textAlign = 'left';
          g.textBaseline = 'middle';
          g.lineWidth = 6 * s;
          g.strokeStyle = '#fff';
          g.strokeText('TOOT!', 0, 0);
          g.fillStyle = '#7b4dff';
          g.fillText('TOOT!', 0, 0);
          g.restore();
        }
      }
      // sweat
      if (!blown && fear > 0.15) {
        g.fillStyle = 'rgba(120,200,255,0.95)';
        const n = panic > 0 ? 4 : 2;
        for (let i = 0; i < n; i++) {
          const q = (t * (0.7 + panic * 0.8) + i / n) % 1;
          const side = i % 2 ? 1 : -1;
          const x = (side > 0 ? 30 : -22) * s + side * q * 30 * s;
          const y = -24 * s + q * q * 60 * s - (1 - q) * 6 * s;
          sweatDrop(x, y, (4 + fear * 3) * s);
        }
      }
      // a scrap of balloon lands on his head
      if (blown) {
        const q = U.clamp((after - 0.6) / 0.5);
        if (q > 0) {
          const y = U.lerp(-300 * s, -36 * s, U.easeIn(q));
          g.fillStyle = 'hsl(355, 82%, 56%)';
          g.beginPath();
          g.moveTo(-26 * s, y + 8 * s);
          g.quadraticCurveTo(-4 * s, y - 16 * s, 24 * s, y + 2 * s);
          g.lineTo(30 * s, y + 18 * s);
          g.lineTo(18 * s, y + 10 * s);
          g.lineTo(6 * s, y + 20 * s);
          g.lineTo(-8 * s, y + 10 * s);
          g.lineTo(-22 * s, y + 22 * s);
          g.fill();
        }
      }
      g.restore();
    }

    // ------------------------------------------------------------ pop debris
    function burst(G, b, r) {
      const s = G.s;
      for (let i = 0; i < 180; i++) {
        const a = Math.random() * U.TAU;
        const d = Math.random() * r;
        const v = (250 + Math.random() * 650) * s;
        confetti.push({
          x: b.cx + Math.cos(a) * d, y: b.cy + Math.sin(a) * d,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v - 250 * s,
          rot: Math.random() * U.TAU, vr: (Math.random() - 0.5) * 18, ph: Math.random() * U.TAU,
          w: (8 + Math.random() * 8) * s, h: (5 + Math.random() * 5) * s,
          hue: confettiHues[i % confettiHues.length],
          land: G.floorY + 3 * s + Math.random() * (G.H - G.floorY - 8 * s), done: false,
        });
      }
      shredShapes.forEach((shape, i) => {
        const a = (i / shredShapes.length) * U.TAU + Math.random() * 0.3;
        const v = (500 + Math.random() * 500) * s;
        shreds.push({
          x: b.cx + Math.cos(a) * r * 0.8, y: b.cy + Math.sin(a) * r * 0.8,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200 * s,
          rot: a, vr: (Math.random() - 0.5) * 14, k: Math.min(G.W, G.H) * (0.06 + Math.random() * 0.04), shape,
          land: G.floorY + 6 * s + Math.random() * (G.H - G.floorY - 14 * s), done: false,
        });
      });
    }

    function physics(list, dt, s, flutter, t) {
      list.forEach(q => {
        if (q.done) return;
        q.vy += 900 * s * dt;
        const drag = Math.max(0, 1 - (flutter ? 2.2 : 0.8) * dt);
        q.vx *= drag;
        q.vy *= drag;
        q.x += q.vx * dt + (flutter ? Math.sin(t * 7 + q.ph) * 40 * s * dt : 0);
        q.y += q.vy * dt;
        q.rot += q.vr * dt;
        if (q.y >= q.land && q.vy > 0) { q.y = q.land; q.done = true; q.rot = Math.round(q.rot / Math.PI) * Math.PI + 0.2; }
      });
    }

    function drawDebris(t) {
      shreds.forEach(q => {
        g.save();
        g.translate(q.x, q.y);
        g.rotate(q.rot);
        g.fillStyle = 'hsl(355, 82%, 54%)';
        g.beginPath();
        q.shape.forEach((v, i) => {
          const x = Math.cos(v.a) * v.r * q.k, y = Math.sin(v.a) * v.r * q.k * (q.done ? 0.6 : 1);
          i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        });
        g.fill();
        g.restore();
      });
      confetti.forEach(q => {
        g.save();
        g.translate(q.x, q.y);
        g.rotate(q.rot);
        const flip = q.done ? 1 : Math.cos(t * 9 + q.ph);
        g.fillStyle = `hsl(${q.hue}, 85%, ${flip > 0 ? 58 : 45}%)`;
        g.fillRect(-q.w / 2, (-q.h / 2) * Math.abs(flip), q.w, Math.max(0.5, q.h * Math.abs(flip)));
        g.restore();
      });
    }

    function popFx(G, b, r, after) {
      const s = G.s;
      if (after < 0.45) {
        const k = U.easeOut(U.clamp(after / 0.12));
        g.globalAlpha = 1 - U.range(after, 0.25, 0.45);
        star(b.cx, b.cy, r * 1.25 * k + 10 * s, r * 0.7 * k + 5 * s, 14, '#fff27a');
        star(b.cx, b.cy, r * 0.8 * k + 6 * s, r * 0.45 * k + 3 * s, 14, '#ffffff');
        g.globalAlpha = 1;
      }
      // limp shrivelled neck left on the nozzle
      g.fillStyle = 'hsl(355, 75%, 44%)';
      g.save();
      g.translate(G.nx, G.ny - 8 * s);
      g.rotate(Math.sin(after * 6) * 0.5 * Math.exp(-after * 0.4) + 0.4);
      g.beginPath(); g.ellipse(0, -16 * s, 8 * s, 18 * s, 0, 0, U.TAU); g.fill();
      g.restore();
    }

    function banner(G, b, after) {
      const s = G.s;
      const k = U.easeOutBack(U.clamp(after / 0.4));
      g.save();
      const x = U.clamp(b.cx, 200 * s, G.W - 200 * s);
      g.translate(x, Math.max(110 * s, b.cy - 20 * s));
      g.rotate(-0.08 + Math.sin(after * 3) * 0.03);
      g.scale(k, k);
      g.font = `${Math.min(170 * s, G.W * 0.28)}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 16 * s;
      g.lineJoin = 'round';
      g.strokeStyle = '#2a0c3a';
      g.strokeText('POP!', 0, 0);
      g.fillStyle = '#ff3d6e';
      g.fillText('POP!', 0, 0);
      g.restore();
    }

    function vignette(G, panic, t) {
      if (panic <= 0) return;
      const grd = g.createRadialGradient(G.W / 2, G.H / 2, Math.min(G.W, G.H) * 0.35, G.W / 2, G.H / 2, Math.max(G.W, G.H) * 0.75);
      grd.addColorStop(0, 'rgba(255,0,40,0)');
      grd.addColorStop(1, `rgba(255,0,40,${panic * (0.12 + 0.1 * Math.sin(t * 7))})`);
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.H);
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        const s = G.s;
        const after = ft >= T_POP ? ft - T_POP : -1;

        // pump strokes: steady, a frantic last shove just before the pop, then nothing
        if (after < 0) pumpPhase += dt * U.TAU * (ft >= 0 ? 2.2 : 0.9);
        const k = after < 0 ? 0.5 - 0.5 * Math.cos(pumpPhase) : frozenK;
        if (after < 0) frozenK = k;
        const ph = ((pumpPhase % U.TAU) + U.TAU) % U.TAU;
        const airU = after < 0 && ph < Math.PI ? ph / Math.PI : -1; // a gulp of air travels down the hose
        const puff = after < 0 ? Math.max(0, Math.sin(pumpPhase - 2.4)) * 0.018 : 0;

        let r = U.lerp(G.rMax * 0.12, G.rMax, p);
        if (ft >= 0) r *= 1 + 0.08 * U.easeIn(U.clamp(ft / T_POP));

        g.save();
        if (after >= 0) {
          const amp = 16 * s * Math.exp(-after * 5);
          g.translate(Math.sin(after * 57) * amp, Math.cos(after * 43) * amp);
        }
        room(G, t);
        gifts(G, t, ft);
        hoseAndPump(G, k, airU);

        let b;
        if (after < 0) b = balloon(G, t, p, ft, r, puff);
        else {
          b = { cx: G.nx, cy: Math.max(G.ny * 0.5, G.ny - 14 * s - r * 0.12 - r * 1.12) };
          if (!popped) { popped = true; burst(G, b, r); }
          popFx(G, b, r, after);
        }
        bunting(G, t, after < 0 ? b : null, after);
        character(G, t, p, ft, k);

        if (popped) {
          physics(confetti, dt, s, true, t);
          physics(shreds, dt, s, false, t);
          drawDebris(t);
          banner(G, b, after);
        }
        vignette(G, after < 0 ? Math.max(U.range(p, 0.85, 1), ft >= 0 ? 1 : 0) : 0, t);
        g.restore();
        if (after >= 0 && after < 0.3) {
          g.fillStyle = `rgba(255,255,255,${0.85 * (1 - after / 0.3)})`;
          g.fillRect(0, 0, G.W, G.H);
        }
      },

      finale() {
        // Rubber stretch squeaks building up to the pop.
        [0, 0.22, 0.44].forEach((at, i) => {
          sfx.tone({ f: 750 + i * 160, to: 1250 + i * 260, glide: 0.17, type: 'sawtooth', at, dur: 0.19, vol: 0.13, filter: 'bandpass', ff: 1700 + i * 300, q: 4, vib: { rate: 32, depth: 60 }, attack: 0.01, release: 0.05 });
        });
        sfx.voice({ f: 480, to: 950, at: 0, dur: T_POP, vol: 0.1, formants: [[1500, 1, 8], [3000, 0.4, 8]], vib: { rate: 24, depth: 30 } });
        // POP!
        sfx.pop({ at: T_POP, vol: 0.5, f: 2000 });
        sfx.noise({ at: T_POP, dur: 0.3, vol: 0.42, filter: 'highpass', ff: 1200, attack: 0.001, release: 0.26 });
        sfx.boom({ at: T_POP, vol: 0.32, dur: 0.8 });
        if (geom().gifts) MINI_POPS.forEach((at, i) => sfx.pop({ at, vol: 0.3, f: 2300 + i * 350 }));
        // confetti tinkle
        for (let i = 0; i < 7; i++) {
          sfx.tone({ f: 2200 + Math.random() * 2200, at: T_POP + 0.15 + i * 0.12, dur: 0.16, vol: 0.04, attack: 0.002, release: 0.14 });
        }
        // Party blower kazoo: toot, TOOOOT ... and a deflated droop.
        const kazoo = [[450, 1, 5], [1150, 0.7, 6], [2600, 0.35, 6]];
        const [t1, t2, t3] = TOOTS;
        sfx.voice({ f: sfx.note('G4'), at: t1[0], dur: t1[1], vol: 0.24, formants: kazoo, vib: { rate: 10, depth: 5 } });
        sfx.voice({ f: sfx.note('C5'), at: t2[0], dur: t2[1], vol: 0.26, formants: kazoo, vib: { rate: 7, depth: 10 } });
        sfx.voice({ f: sfx.note('C5'), to: sfx.note('E4'), glide: t3[1], at: t3[0], dur: t3[1], vol: 0.2, formants: kazoo, vib: { rate: 5, depth: 12 } });
        TOOTS.forEach(([at, dur]) => sfx.noise({ at, dur, vol: 0.05, filter: 'bandpass', ff: 3200, q: 2, attack: 0.02 }));
      },

      destroy() {},
    };
  },
});
