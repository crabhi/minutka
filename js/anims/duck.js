// A clawfoot bathtub fills up while a rubber duck floats on top. Progress = water level.
// Foam piles up, the duck gets alarmed as the water nears the rim, the cat watches nervously.
// Finale: the tap handle pops off, the tub overflows and floods the floor, the duck surfs a wave out of
// the tub squeaking, the cat leaps onto the towel rail, and the flood finally gurgles down the drain.
Minutka.register({
  id: 'duck',
  name: 'Bath Time',
  emoji: '🦆',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(17);

    const foam = Array.from({ length: 60 }, (_, i) => ({ u: R(), r: 0.6 + R() * 0.8, ph: R() * U.TAU, ord: R() }));
    foam.sort((a, b) => a.ord - b.ord);
    const bubbles = [];
    const drops = [];
    let bubbleAcc = 0, dropAcc = 0;

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const land = W > H;
      const TW = Math.min(W * (land ? 0.64 : 0.88), H * 1.1);
      const m = TW / 760;
      const TH = TW * 0.48;
      const floorY = H * (land ? 0.87 : 0.77);
      const feet = 34 * m;
      const yBot = floorY - feet, yTop = yBot - TH;
      const cx = W * (land ? 0.47 : 0.5);
      const x0 = cx - TW / 2, x1 = cx + TW / 2;
      const th = 16 * m;
      return { W, H, s, land, TW, TH, m, floorY, yTop, yBot, x0, x1, cx, th, catRoom: x1 + 150 * m < W };
    }

    // water surface height inside the tub
    function levelY(G, p) {
      const inTop = G.yTop + G.th * 0.6 + 4 * G.m, inBot = G.yBot - G.th;
      return U.lerp(inBot - (inBot - inTop) * 0.1, inTop, p);
    }

    function surf(G, x, t, amp) {
      return Math.sin(x / (55 * G.m) + t * 2.2) * 3 * G.m * amp + Math.sin(x / (23 * G.m) - t * 3.1) * 1.6 * G.m * amp;
    }

    // ------------------------------------------------------------ room
    function room(G, t) {
      g.fillStyle = '#bfe8ef';
      g.fillRect(0, 0, G.W, G.floorY);
      const tile = 46 * Math.max(G.m, 0.5);
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x < G.W; x += tile) { g.moveTo(x, 0); g.lineTo(x, G.floorY); }
      for (let y = G.floorY; y > 0; y -= tile) { g.moveTo(0, y); g.lineTo(G.W, y); }
      g.stroke();
      // a band of darker tiles
      g.fillStyle = '#7cc7d6';
      g.fillRect(0, G.yTop - tile * 2.2, G.W, tile * 0.5);
      // floor
      g.fillStyle = '#f4f4f4';
      g.fillRect(0, G.floorY, G.W, G.H - G.floorY);
      const ft = 40 * Math.max(G.m, 0.5);
      g.fillStyle = '#3b4252';
      for (let y = G.floorY, r = 0; y < G.H; y += ft, r++) {
        for (let x = (r % 2) * ft; x < G.W; x += ft * 2) g.fillRect(x, y, ft, ft);
      }
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(0, G.floorY, G.W, 6 * G.m);
      // floor drain
      g.fillStyle = '#9aa3ad';
      g.beginPath(); g.ellipse(drainX(G), G.floorY + 22 * G.m, 30 * G.m, 8 * G.m, 0, 0, U.TAU); g.fill();
      g.strokeStyle = '#555';
      g.lineWidth = 2;
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(drainX(G) + k * 9 * G.m, G.floorY + 17 * G.m); g.lineTo(drainX(G) + k * 9 * G.m, G.floorY + 27 * G.m); g.stroke(); }
      // shelf with shampoo bottles (above the far end)
      const sx = G.x1 - G.TW * 0.25, sy = Math.max(G.yTop - tile * 3.2, G.H * 0.06 + 80 * G.m);
      g.fillStyle = '#ffffff';
      g.fillRect(sx - 90 * G.m, sy, 180 * G.m, 10 * G.m);
      [['#ff7a3d', -60, 60], ['#7b5bd6', -15, 76], ['#25b97a', 35, 50]].forEach(([c, dx, hh]) => {
        g.fillStyle = c;
        g.beginPath(); g.roundRect(sx + dx * G.m, sy - hh * G.m, 34 * G.m, hh * G.m, 6 * G.m); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.fillRect(sx + dx * G.m + 6 * G.m, sy - hh * G.m * 0.7, 6 * G.m, hh * G.m * 0.4);
      });
    }

    function drainX(G) { return G.land ? G.x1 + (G.W - G.x1) * 0.45 : G.cx + G.TW * 0.32; }

    function towelRail(G, t) {
      if (!G.catRoom) return null;
      const x = G.x1 + 120 * G.m, y = G.yTop - 90 * G.m;
      g.strokeStyle = '#c9d1d9';
      g.lineWidth = 7 * G.m;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 70 * G.m, y); g.lineTo(x + 70 * G.m, y); g.stroke();
      g.fillStyle = '#ff9db0';
      g.beginPath();
      g.moveTo(x - 50 * G.m, y);
      g.lineTo(x + 50 * G.m, y);
      g.lineTo(x + 46 * G.m + Math.sin(t) * 2 * G.m, y + 120 * G.m);
      g.lineTo(x - 46 * G.m + Math.sin(t) * 2 * G.m, y + 120 * G.m);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(x - 48 * G.m, y + 95 * G.m, 96 * G.m, 8 * G.m);
      return { x, y };
    }

    // ------------------------------------------------------------ tub
    function tubOuter(G) {
      g.beginPath();
      g.roundRect(G.x0, G.yTop, G.TW, G.TH, [G.th, G.th, G.TH * 0.45, G.TH * 0.45]);
    }
    function tubInner(G) {
      g.beginPath();
      g.roundRect(G.x0 + G.th, G.yTop + G.th * 0.6, G.TW - G.th * 2, G.TH - G.th * 1.6, [2, 2, G.TH * 0.4, G.TH * 0.4]);
    }

    function tub(G) {
      const m = G.m;
      // clawed feet
      g.fillStyle = '#d4a017';
      [0.15, 0.85].forEach(k => {
        const x = G.x0 + G.TW * k;
        g.beginPath();
        g.moveTo(x - 16 * m, G.yBot - 12 * m);
        g.quadraticCurveTo(x - 26 * m, G.floorY - 6 * m, x - 30 * m, G.floorY);
        g.lineTo(x + 30 * m, G.floorY);
        g.quadraticCurveTo(x + 26 * m, G.floorY - 6 * m, x + 16 * m, G.yBot - 12 * m);
        g.fill();
      });
      g.fillStyle = '#ffffff';
      tubOuter(G);
      g.fill();
      g.strokeStyle = '#8fa9b8';
      g.lineWidth = 4 * m;
      g.stroke();
      // interior (cut-away view)
      const grd = g.createLinearGradient(0, G.yTop, 0, G.yBot);
      grd.addColorStop(0, '#e9eef2');
      grd.addColorStop(1, '#cfd9df');
      g.fillStyle = grd;
      tubInner(G);
      g.fill();
    }

    function rim(G) {
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#8fa9b8';
      g.lineWidth = 3 * G.m;
      g.beginPath();
      g.roundRect(G.x0 - 10 * G.m, G.yTop - 8 * G.m, G.TW + 20 * G.m, 16 * G.m, 8 * G.m);
      g.fill();
      g.stroke();
      // front wall edge: a thin enamel border so the water reads as "inside"
      g.strokeStyle = '#ffffff';
      g.lineWidth = G.th * 0.5;
      tubInner(G);
      g.stroke();
    }

    function water(G, wy, t, amp) {
      g.save();
      tubInner(G);
      g.clip();
      const grd = g.createLinearGradient(0, wy, 0, G.yBot);
      grd.addColorStop(0, 'rgba(110,200,255,0.85)');
      grd.addColorStop(1, 'rgba(40,120,220,0.9)');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(G.x0, G.yBot + 10);
      for (let x = G.x0; x <= G.x1 + 10; x += 10) g.lineTo(x, wy + surf(G, x, t, amp));
      g.lineTo(G.x1, G.yBot + 10);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 3 * G.m;
      g.beginPath();
      for (let x = G.x0; x <= G.x1 + 10; x += 10) {
        const y = wy + surf(G, x, t, amp);
        if (x === G.x0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      // caustic glints
      g.strokeStyle = 'rgba(255,255,255,0.25)';
      g.lineWidth = 2 * G.m;
      for (let k = 0; k < 6; k++) {
        const x = G.x0 + G.TW * (0.15 + k * 0.14) + Math.sin(t * 0.8 + k) * 12 * G.m;
        const y = wy + (G.yBot - wy) * (0.3 + (k % 3) * 0.2);
        if (y < G.yBot - G.th) { g.beginPath(); g.moveTo(x - 14 * G.m, y); g.lineTo(x + 14 * G.m, y); g.stroke(); }
      }
      g.restore();
    }

    // ------------------------------------------------------------ faucet + stream
    function faucetPos(G) {
      return { x: G.x0 + G.TW * 0.13, y: G.yTop - 44 * G.m };
    }

    function faucet(G, ft) {
      const m = G.m, f = faucetPos(G);
      g.fillStyle = '#c9d1d9';
      g.strokeStyle = '#7d8a96';
      g.lineWidth = 2 * m;
      // wall pipe + spout
      g.fillRect(f.x - 70 * m, f.y - 72 * m, 22 * m, 60 * m);
      g.beginPath();
      g.moveTo(f.x - 60 * m, f.y - 66 * m);
      g.quadraticCurveTo(f.x + 6 * m, f.y - 78 * m, f.x + 6 * m, f.y);
      g.lineTo(f.x - 10 * m, f.y);
      g.quadraticCurveTo(f.x - 10 * m, f.y - 54 * m, f.x - 60 * m, f.y - 48 * m);
      g.closePath();
      g.fill(); g.stroke();
      // handles (one pops off in the finale)
      [['#e94b5b', -96, 0], ['#3d8bfd', -24, 1]].forEach(([col, dx, i]) => {
        let hx = f.x + dx * m, hy = f.y - 94 * m, rot = 0;
        if (i === 0 && ft >= 0.35) {
          const k = ft - 0.35;
          hx += -k * 160 * m; hy += -k * 700 * m + 0.5 * 1400 * m * k * k; rot = k * 14;
        }
        g.save();
        g.translate(hx, hy);
        g.rotate(rot);
        g.fillStyle = '#c9d1d9';
        g.fillRect(-5 * m, 0, 10 * m, 18 * m);
        g.fillStyle = col;
        g.beginPath(); g.roundRect(-20 * m, -8 * m, 40 * m, 12 * m, 6 * m); g.fill();
        g.restore();
      });
    }

    function stream(G, wy, t, ft) {
      const m = G.m, f = faucetPos(G);
      const fin = ft >= 0;
      const w = (fin ? 26 : 13) * m;
      const top = f.y, bot = wy;
      if (bot <= top) return;
      g.fillStyle = 'rgba(150,215,255,0.85)';
      g.beginPath();
      g.moveTo(f.x - w / 2 - 2 * m, top);
      for (let y = top; y <= bot; y += 8) g.lineTo(f.x - w / 2 + Math.sin(y * 0.15 - t * 20) * 1.5 * m, y);
      for (let y = bot; y >= top; y -= 8) g.lineTo(f.x + w / 2 + Math.sin(y * 0.13 - t * 18) * 1.5 * m, y);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 2.5 * m;
      g.setLineDash([12 * m, 16 * m]);
      g.lineDashOffset = -t * 260 * m;
      g.beginPath(); g.moveTo(f.x - w * 0.15, top); g.lineTo(f.x - w * 0.15, bot); g.stroke();
      g.setLineDash([]);
      // splash crown where it hits
      g.fillStyle = 'rgba(220,245,255,0.9)';
      for (let k = 0; k < 7; k++) {
        const ph = (t * 2.5 + k / 7) % 1;
        const dir = k % 2 ? 1 : -1;
        const x = f.x + dir * (8 + ph * 30 * (1 + (k % 3) * 0.3)) * m;
        const y = bot - Math.sin(ph * Math.PI) * 22 * m * (fin ? 2 : 1);
        g.beginPath(); g.arc(x, y, (3.5 - ph * 2) * m, 0, U.TAU); g.fill();
      }
    }

    // ------------------------------------------------------------ foam, bubbles
    function foamLayer(G, wy, p, t, ft) {
      const n = Math.min(foam.length, Math.floor(6 + p * 54) + (ft >= 0 ? 60 : 0));
      const inL = G.x0 + G.th * 1.4, inR = G.x1 - G.th * 1.4;
      for (let i = 0; i < n; i++) {
        const b = foam[i];
        const x = U.lerp(inL, inR, b.u);
        const r = b.r * (14 + 10 * p) * G.m;
        const pile = (i % 3) * r * 0.6 * p; // foam stacks up as it grows
        const y = wy + surf(G, x, t, 1) - pile - r * 0.2 + Math.sin(t * 2 + b.ph) * 1.5 * G.m;
        g.fillStyle = 'rgba(255,255,255,0.95)';
        g.beginPath(); g.arc(x, y, r, 0, U.TAU); g.fill();
        g.strokeStyle = 'rgba(140,200,235,0.6)';
        g.lineWidth = 1.5 * G.m;
        g.stroke();
        g.fillStyle = 'rgba(190,230,255,0.9)';
        g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, U.TAU); g.fill();
      }
    }

    function stepBubbles(G, wy, dt, t) {
      const f = faucetPos(G);
      bubbleAcc += dt * 8;
      while (bubbleAcc > 1) {
        bubbleAcc -= 1;
        if (bubbles.length < 40 && G.yBot - G.th - wy > 20 * G.m) bubbles.push({ x: f.x + (Math.random() - 0.5) * 50 * G.m, y: Math.min(G.yBot - G.th * 1.5, wy + 30 * G.m + Math.random() * (G.yBot - wy) * 0.6), r: (3 + Math.random() * 5) * G.m, v: (40 + Math.random() * 40) * G.m, ph: Math.random() * 6, pop: 0 });
      }
      g.save();
      tubInner(G);
      g.clip();
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (b.pop > 0) {
          b.pop += dt;
          if (b.pop > 0.25) { bubbles.splice(i, 1); continue; }
          g.strokeStyle = `rgba(255,255,255,${1 - b.pop * 4})`;
          g.lineWidth = 1.5 * G.m;
          g.beginPath(); g.arc(b.x, b.y, b.r * (1 + b.pop * 6), 0, U.TAU); g.stroke();
          continue;
        }
        b.y -= b.v * dt;
        b.x += Math.sin(t * 4 + b.ph) * 12 * G.m * dt;
        if (b.y < wy + b.r) { b.y = wy; b.pop = 0.001; continue; }
        g.strokeStyle = 'rgba(255,255,255,0.85)';
        g.lineWidth = 1.5 * G.m;
        g.beginPath(); g.arc(b.x, b.y, b.r, 0, U.TAU); g.stroke();
      }
      g.restore();
    }

    // ------------------------------------------------------------ duck + cat
    function duck(G, x, y, sx, tilt, alarm, t, squeak) {
      const D = 95 * G.m;
      g.save();
      g.translate(x, y);
      g.rotate(tilt);
      g.scale(Math.abs(sx) < 0.2 ? Math.sign(sx || 1) * 0.2 : sx, 1);
      if (squeak > 0) g.scale(1 + squeak * 0.15, 1 - squeak * 0.15);
      // body
      g.fillStyle = '#ffd23f';
      g.beginPath();
      g.moveTo(-D * 0.9, -D * 0.25);
      g.quadraticCurveTo(-D * 1.15, -D * 0.75, -D * 0.7, -D * 0.55);
      g.quadraticCurveTo(-D * 0.2, -D * 0.75, D * 0.25, -D * 0.55);
      g.quadraticCurveTo(D * 0.9, -D * 0.5, D * 0.75, D * 0.05);
      g.quadraticCurveTo(D * 0.4, D * 0.3, -D * 0.4, D * 0.25);
      g.quadraticCurveTo(-D * 0.95, D * 0.15, -D * 0.9, -D * 0.25);
      g.fill();
      // wing
      g.fillStyle = '#f0b400';
      g.beginPath(); g.ellipse(-D * 0.15, -D * 0.2, D * 0.38, D * 0.2, -0.2 + (alarm > 0.6 ? Math.sin(t * 25) * 0.3 : 0), 0, U.TAU); g.fill();
      // head
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(D * 0.32, -D * 0.85, D * 0.42, 0, U.TAU); g.fill();
      // beak
      g.fillStyle = '#ff7a1a';
      const open = squeak > 0 ? D * 0.12 : alarm > 0.7 ? D * 0.06 : 0;
      g.beginPath(); g.moveTo(D * 0.62, -D * 0.88); g.quadraticCurveTo(D * 1.05, -D * 0.9 - open * 0.5, D * 1.02, -D * 0.78 - open); g.lineTo(D * 0.66, -D * 0.74); g.fill();
      g.beginPath(); g.moveTo(D * 0.66, -D * 0.72); g.quadraticCurveTo(D * 0.98, -D * 0.72 + open * 0.3, D * 0.95, -D * 0.64 + open * 0.5); g.lineTo(D * 0.62, -D * 0.66); g.fill();
      // eye: widens with alarm
      const er = D * (0.1 + alarm * 0.07);
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(D * 0.42, -D * 0.98, er, 0, U.TAU); g.fill();
      g.fillStyle = '#111';
      const blink = (t % 4) < 0.12 && alarm < 0.5;
      if (blink) g.fillRect(D * 0.42 - er, -D * 0.98, er * 2, D * 0.03);
      else { g.beginPath(); g.arc(D * 0.44 + alarm * er * 0.3, -D * 0.98 - alarm * er * 0.3, er * 0.55, 0, U.TAU); g.fill(); }
      if (alarm > 0.3) {
        g.strokeStyle = '#7a4a00';
        g.lineWidth = D * 0.05;
        g.beginPath(); g.moveTo(D * 0.28, -D * 1.18 + alarm * D * 0.05); g.lineTo(D * 0.55, -D * 1.22 - alarm * D * 0.05); g.stroke();
        // sweat
        g.fillStyle = 'rgba(100,180,255,0.95)';
        const k = (t * 1.4) % 1;
        g.beginPath(); g.arc(D * 0.05, -D * 1.1 + k * D * 0.35, D * 0.06, 0, U.TAU); g.fill();
      }
      g.restore();
    }

    function cat(G, t, ft, rail, nerv) {
      if (!G.catRoom) return;
      const m = G.m, C = 85 * m;
      let x = G.x1 + 95 * m, y = G.floorY, puff = 0, cling = false;
      if (ft >= 0.9 && rail) {
        const k = U.clamp((ft - 0.9) / 0.45);
        x = U.lerp(x, rail.x, k);
        y = U.lerp(G.floorY, rail.y + C * 1.1, k) - Math.sin(k * Math.PI) * C * 1.2;
        puff = 1;
        cling = k >= 1;
      }
      g.save();
      g.translate(x, y);
      if (cling) g.rotate(Math.sin(ft * 3) * 0.08);
      const fur = puff ? '#3b3b40' : '#4a4a52';
      // tail
      g.strokeStyle = fur;
      g.lineWidth = C * (0.12 + puff * 0.12);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(C * 0.3, -C * 0.15);
      g.quadraticCurveTo(C * 0.8, -C * 0.2 + Math.sin(t * (2 + nerv * 6)) * C * 0.3, C * 0.7, -C * (0.8 + puff * 0.4));
      g.stroke();
      // body
      g.fillStyle = fur;
      g.beginPath(); g.ellipse(0, -C * 0.45, C * (0.38 + puff * 0.12), C * 0.45, 0, 0, U.TAU); g.fill();
      if (puff) {
        // spiky fur
        g.beginPath();
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * U.TAU, rr = C * (k % 2 ? 0.52 : 0.68);
          g.lineTo(Math.cos(a) * rr, -C * 0.45 + Math.sin(a) * rr * 1.05);
        }
        g.fill();
      }
      // head
      g.beginPath(); g.arc(0, -C * 1.0, C * 0.3, 0, U.TAU); g.fill();
      [-1, 1].forEach(d => { g.beginPath(); g.moveTo(d * C * 0.28, -C * 1.1); g.lineTo(d * C * 0.2, -C * 1.42); g.lineTo(d * C * 0.05, -C * 1.25); g.fill(); });
      // eyes look at the tub
      g.fillStyle = '#c6f05a';
      const er = C * (0.07 + nerv * 0.04 + puff * 0.04);
      [-1, 1].forEach(d => { g.beginPath(); g.arc(d * C * 0.12, -C * 1.03, er, 0, U.TAU); g.fill(); });
      g.fillStyle = '#111';
      [-1, 1].forEach(d => { g.beginPath(); g.ellipse(d * C * 0.12 - C * 0.02, -C * 1.03, er * 0.3, er * 0.85, 0, 0, U.TAU); g.fill(); });
      g.fillStyle = '#ff9db0';
      g.beginPath(); g.moveTo(-C * 0.04, -C * 0.93); g.lineTo(C * 0.04, -C * 0.93); g.lineTo(0, -C * 0.88); g.fill();
      if (cling) {
        g.strokeStyle = fur;
        g.lineWidth = C * 0.12;
        [-1, 1].forEach(d => { g.beginPath(); g.moveTo(d * C * 0.25, -C * 0.7); g.lineTo(d * C * 0.35, -C * 1.15); g.stroke(); });
      }
      g.restore();
    }

    // ------------------------------------------------------------ overflow
    function overflow(G, ft, t) {
      const k = U.range(ft, 0.5, 1.2);
      if (k <= 0) return;
      g.fillStyle = 'rgba(90,185,250,0.8)';
      [-1, 1].forEach(side => {
        const ex = side < 0 ? G.x0 - 6 * G.m : G.x1 + 6 * G.m;
        const flow = 1 - U.range(ft, 4.5, 6);
        if (flow <= 0) return;
        const w = 40 * G.m * flow * k;
        const out = side * 22 * G.m;
        g.beginPath();
        g.moveTo(ex - side * 18 * G.m, G.yTop - 8 * G.m);
        g.quadraticCurveTo(ex + out * 1.4, G.yTop - 10 * G.m, ex + out, G.yTop + 30 * G.m);
        g.lineTo(ex + out + side * Math.sin(t * 9) * 2 * G.m, U.lerp(G.yTop, G.floorY, k));
        g.lineTo(ex + out + side * w, U.lerp(G.yTop, G.floorY, k));
        g.quadraticCurveTo(ex + out + side * w * 1.6, G.yTop - 6 * G.m, ex - side * 18 * G.m, G.yTop - 16 * G.m);
        g.fill();
      });
    }

    function flood(G, ft, t) {
      const rise = U.easeOut(U.range(ft, 0.9, 3.2));
      const drain = U.easeInOut(U.range(ft, 5.2, 8.5));
      const depth = (G.H - G.floorY) * 0.7 + G.TH * 0.3;
      const h = depth * rise * (1 - drain * 0.8);
      if (h < 1) return G.H;
      const top = G.H - h;
      const amp = 1 + 3 * (1 - U.range(ft, 1, 5));
      g.fillStyle = 'rgba(70,170,245,0.78)';
      g.beginPath();
      g.moveTo(0, G.H);
      for (let x = 0; x <= G.W + 16; x += 16) g.lineTo(x, top + surf(G, x, t * 1.6, amp) * 1.5);
      g.lineTo(G.W, G.H);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 3 * G.m;
      g.beginPath();
      for (let x = 0; x <= G.W + 16; x += 16) {
        const y = top + surf(G, x, t * 1.6, amp) * 1.5;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      // whirlpool over the drain
      if (drain > 0) {
        const dx = drainX(G);
        g.strokeStyle = `rgba(255,255,255,${0.8 * Math.sin(drain * Math.PI)})`;
        g.lineWidth = 3 * G.m;
        for (let r = 1; r <= 4; r++) {
          g.beginPath();
          g.ellipse(dx, top + 8 * G.m, r * 18 * G.m, r * 5 * G.m, 0, t * 6 + r, t * 6 + r + 4);
          g.stroke();
        }
      }
      return top;
    }

    function splash(G, x, y, n, power) {
      for (let i = 0; i < n; i++) {
        if (drops.length > 220) drops.shift();
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const v = (200 + Math.random() * 600) * G.m * power;
        drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (3 + Math.random() * 6) * G.m, life: 0 });
      }
    }

    function stepDrops(G, dt) {
      g.fillStyle = 'rgba(200,235,255,0.95)';
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.life += dt;
        d.vy += 1400 * G.m * dt;
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.life > 2 || d.y > G.H + 20) { drops.splice(i, 1); continue; }
        g.beginPath(); g.arc(d.x, d.y, Math.max(0.5, d.r), 0, U.TAU); g.fill();
      }
    }

    function banner(G, text, ft0, ft, color) {
      if (ft < ft0) return;
      const k = U.easeOutBack(U.clamp((ft - ft0) / 0.45));
      const px = Math.min(G.H * 0.16, (G.W * 0.9) / (text.length * 0.8));
      g.save();
      g.translate(G.W * 0.5, G.H * (G.land ? 0.13 : 0.12));
      g.rotate(-0.05 + Math.sin(ft * 3) * 0.03);
      g.scale(k, k);
      g.font = `${px}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = px * 0.14;
      g.lineJoin = 'round';
      g.strokeStyle = '#123050';
      g.strokeText(text, 0, 0);
      g.fillStyle = color;
      g.fillText(text, 0, 0);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    let splashed = false, popped = false;
    return {
      update(p, t, dt, ft) {
        const G = geom();
        const fin = ft >= 0;
        const lv = fin ? 1 : p;
        const wy = levelY(G, lv) - (fin ? U.range(ft, 0, 0.6) * 10 * G.m : 0);
        const amp = fin ? 1 + 3 * Math.exp(-ft * 0.3) : 1 + p * 0.6;
        const alarm = fin ? 1 : U.range(p, 0.7, 0.97);

        room(G, t);
        const rail = towelRail(G, t);
        tub(G);
        water(G, wy, t, amp);
        stepBubbles(G, wy, dt, t);

        // duck drifts around the tub, bobbing and slowly turning
        const span = G.TW * 0.3;
        let dx = G.cx + Math.sin(t * 0.17) * span + G.TW * 0.05;
        let dyy = wy + surf(G, dx, t, amp) + 4 * G.m;
        const cs = Math.cos(t * 0.33);
        let sx = (cs < 0 ? -1 : 1) * (0.45 + 0.55 * Math.abs(cs));
        let tilt = Math.sin(t * 1.7) * 0.08 * amp;
        let squeak = 0;
        let duckInTub = true;
        if (fin) {
          // ride the wave over the rim and surf the flood
          const k = U.range(ft, 0.7, 1.7);
          if (k > 0) {
            const endX = G.land ? G.x1 + (G.W - G.x1) * 0.5 : G.x1 - G.TW * 0.15;
            dx = U.lerp(G.cx + G.TW * 0.2, endX, U.easeInOut(k));
            dyy = U.lerp(wy, G.floorY + 10 * G.m, k) - Math.sin(k * Math.PI) * G.TH * 0.9;
            tilt = Math.sin(k * Math.PI * 2) * 0.5;
            sx = 1;
            duckInTub = k < 0.35;
          } else {
            dx = U.lerp(dx, G.cx + G.TW * 0.2, U.clamp(ft / 0.7));
            sx = 1;
          }
          [0.75, 1.7, 2.3, 2.5].forEach(sq => { if (ft > sq && ft < sq + 0.15) squeak = 1 - (ft - sq) / 0.15; });
        }

        foamLayer(G, wy, lv, t, ft);
        if (duckInTub) duck(G, dx, dyy, sx, tilt, alarm, t, squeak);
        rim(G);
        faucet(G, ft);
        stream(G, wy, t, ft);

        // rising-water nerves: a little "!" over the duck
        if (!fin && p > 0.85) {
          g.fillStyle = '#e94b5b';
          g.font = `${(50 + Math.sin(t * 9) * 6) * G.m}px Bungee, sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('!', dx + 10 * G.m, dyy - 130 * G.m);
        }

        if (fin) {
          if (!popped && ft > 0.35) {
            popped = true;
            const f = faucetPos(G);
            splash(G, f.x - 96 * G.m, f.y - 94 * G.m, 24, 0.8);
          }
          if (!splashed && ft > 0.6) {
            splashed = true;
            splash(G, G.x0 + G.TW * 0.2, G.yTop, 50, 1.2);
            splash(G, G.x1 - G.TW * 0.2, G.yTop, 50, 1.2);
          }
          // the broken tap sprays
          if (ft > 0.35 && ft < 5) {
            dropAcc += dt * 40;
            const f = faucetPos(G);
            while (dropAcc > 1) {
              dropAcc -= 1;
              if (drops.length > 220) drops.shift();
              drops.push({ x: f.x - 96 * G.m, y: f.y - 94 * G.m, vx: (-150 + Math.random() * 300) * G.m, vy: -(400 + Math.random() * 300) * G.m, r: (3 + Math.random() * 4) * G.m, life: 0 });
            }
          }
          overflow(G, ft, t);
          const ftop = flood(G, ft, t);
          cat(G, t, ft, rail, 1);
          if (!duckInTub) {
            let fx = dx, fy = Math.min(dyy, ftop + 4 * G.m);
            if (ft > 5.2) {
              // spin round the drain
              const k = U.range(ft, 5.2, 9);
              const rr = 70 * G.m * (1 - k * 0.6);
              fx = U.lerp(dx, drainX(G), U.clamp((ft - 5.2) / 1)) + Math.cos(ft * 4) * rr;
              fy = Math.min(ftop + 4 * G.m, G.floorY + (G.H - G.floorY) * 0.45) + Math.sin(ft * 4) * rr * 0.2;
              sx = Math.cos(ft * 4);
            }
            duck(G, fx, fy, sx, tilt * (ft > 1.7 ? 0.2 : 1) + Math.sin(t * 3) * 0.1, 1 - U.range(ft, 2.5, 4) * 0.7, t, squeak);
          }
        } else {
          cat(G, t, ft, rail, U.range(p, 0.3, 1));
        }
        stepDrops(G, dt);

        if (fin) {
          if (ft < 5.2) banner(G, 'OVERFLOW!', 0.55, ft, '#8fe3ff');
          else banner(G, 'GLUG GLUG...', 5.2, ft, '#ffd23f');
        }
      },

      finale() {
        const squeak = (at, f, to, dur) => {
          sfx.tone({ at, f, to, glide: dur * 0.7, dur, type: 'square', vol: 0.12, attack: 0.005, release: 0.04, filter: 'bandpass', ff: 1800, q: 2 });
          sfx.tone({ at, f: f * 1.01, to: to * 1.01, glide: dur * 0.7, dur, type: 'triangle', vol: 0.16, attack: 0.005, release: 0.04 });
        };
        // the tap handle pops off
        sfx.pop({ at: 0.35, vol: 0.45, f: 1400 });
        squeak(0.75, 950, 1500, 0.14);
        // big splash over the rim
        sfx.noise({ at: 0.6, dur: 1.6, vol: 0.45, filter: 'lowpass', ff: 5000, ffTo: 500, attack: 0.01, release: 1.2 });
        sfx.noise({ at: 0.62, dur: 0.6, vol: 0.2, filter: 'highpass', ff: 3000, attack: 0.005, release: 0.5 });
        sfx.tone({ at: 0.6, f: 160, to: 50, dur: 0.35, type: 'sine', vol: 0.4, attack: 0.003, release: 0.25 });
        // flood rush
        sfx.noise({ at: 1.0, dur: 2.6, vol: 0.14, filter: 'bandpass', ff: 900, q: 0.8, attack: 0.3, release: 1.4 });
        squeak(1.7, 1100, 1700, 0.13);
        squeak(2.3, 1000, 1400, 0.1);
        squeak(2.5, 1050, 1600, 0.16);
        // drain gurgle: random low blips + throaty noise
        const rnd = U.rng(99);
        for (let i = 0; i < 14; i++) {
          const at = 5.3 + i * 0.11 + rnd() * 0.05;
          const f = 110 + rnd() * 160;
          sfx.tone({ at, f, to: f * (1.6 + rnd()), glide: 0.07, dur: 0.08, type: 'sine', vol: 0.22, attack: 0.005, release: 0.04 });
        }
        sfx.noise({ at: 5.2, dur: 1.6, vol: 0.16, filter: 'lowpass', ff: 400, q: 3, attack: 0.1, release: 0.8 });
        // final slurp
        sfx.tone({ at: 6.6, f: 600, to: 120, dur: 0.35, type: 'sine', vol: 0.25, attack: 0.01, release: 0.15 });
      },

      destroy() {},
    };
  },
});
