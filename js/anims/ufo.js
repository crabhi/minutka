// Close Encounter: a flying saucer's tractor beam slowly lifts an unimpressed cow off a sleepy farm.
// Progress = how high the cow has floated, from the grass up to the saucer's hatch.
Minutka.register({
  id: 'ufo',
  name: 'Close Encounter',
  emoji: '🛸',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(51);
    const TAU = U.TAU;

    const stars = Array.from({ length: 130 }, () => ({ x: R(), y: R() * 0.7, r: 0.8 + R() * 1.8, ph: R() * TAU, sp: 0.8 + R() * 3 }));
    const hills = Array.from({ length: 9 }, (_, i) => ({ x: i / 8 + (R() - 0.5) * 0.08, h: 0.05 + R() * 0.07, w: 0.16 + R() * 0.1 }));
    const tufts = Array.from({ length: 34 }, () => ({ x: R(), y: R(), k: 0.6 + R() * 0.7, ph: R() * TAU }));
    const sparks = Array.from({ length: 22 }, () => ({ x: R() * 2 - 1, ph: R(), sp: 0.15 + R() * 0.25, r: 1.5 + R() * 2.5 }));
    const hay = Array.from({ length: 7 }, () => ({ x: R() * 1.4 - 0.7, ph: R(), sp: 0.04 + R() * 0.05, rot: R() * TAU, len: 10 + R() * 12 }));
    const chickens = [{ x: 0.05, ph: 0 }, { x: 0.13, ph: 2.1 }, { x: 0.21, ph: 4.2 }];

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const groundY = H * 0.82;
      const ux = W * 0.5, uy = Math.max(H * 0.18, 120 * s);
      return { W, H, s, groundY, ux, uy, ck: s * 0.9 };
    }

    // ------------------------------------------------------------ backdrop
    function sky(G, t) {
      const grd = g.createLinearGradient(0, 0, 0, G.groundY);
      grd.addColorStop(0, '#070a26');
      grd.addColorStop(0.6, '#1b1f5c');
      grd.addColorStop(1, '#3d2f73');
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.H);
      g.fillStyle = '#fff';
      stars.forEach(st => {
        g.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * st.sp + st.ph));
        const r = st.r * Math.max(0.6, G.s);
        g.fillRect(st.x * G.W - r / 2, st.y * G.groundY - r / 2, r, r);
      });
      g.globalAlpha = 1;
      // crescent moon
      const mx = G.W * 0.1, my = G.H * 0.13, mr = 34 * G.s;
      g.fillStyle = '#fff4c2';
      g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
      g.fillStyle = '#0d1236';
      g.beginPath(); g.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.85, 0, TAU); g.fill();
    }

    function land(G, t) {
      const s = G.s;
      g.fillStyle = '#1a2a3f';
      hills.forEach(h => {
        g.beginPath();
        g.ellipse(h.x * G.W, G.groundY, h.w * G.W, h.h * G.H + 30 * s, 0, Math.PI, TAU);
        g.fill();
      });
      g.fillStyle = '#1f4a34';
      g.fillRect(0, G.groundY, G.W, G.H - G.groundY);
      g.fillStyle = '#245a3e';
      g.fillRect(0, G.groundY, G.W, 8 * s);
      // fence
      g.fillStyle = '#5c4632';
      const fy = G.groundY - 34 * s;
      g.fillRect(0, fy + 6 * s, G.W, 6 * s);
      g.fillRect(0, fy + 20 * s, G.W, 6 * s);
      for (let x = 10 * s; x < G.W; x += 70 * s) g.fillRect(x, fy, 8 * s, 36 * s);
      // grass
      g.strokeStyle = '#2f7048';
      g.lineWidth = 3 * s;
      g.lineCap = 'round';
      tufts.forEach(f => {
        const x = f.x * G.W, y = G.groundY + 14 * s + f.y * (G.H - G.groundY - 18 * s);
        const sway = Math.sin(t * 1.6 + f.ph) * 4 * s * f.k;
        for (let k = -1; k <= 1; k++) {
          g.beginPath(); g.moveTo(x + k * 5 * s, y); g.quadraticCurveTo(x + k * 7 * s, y - 10 * s * f.k, x + k * 9 * s + sway, y - 18 * s * f.k); g.stroke();
        }
      });
    }

    function barn(G, t) {
      const s = G.s, bw = 210 * s, bh = 150 * s, bx = 30 * s, by = G.groundY - bh;
      // silo
      g.fillStyle = '#8a8f9c';
      g.fillRect(bx + bw + 4 * s, by - 60 * s, 60 * s, bh + 60 * s);
      g.fillStyle = '#6b7080';
      g.beginPath(); g.arc(bx + bw + 34 * s, by - 60 * s, 30 * s, Math.PI, TAU); g.fill();
      for (let k = 0; k < 5; k++) g.fillRect(bx + bw + 4 * s, by - 40 * s + k * 38 * s, 60 * s, 3 * s);
      // barn body + roof
      g.fillStyle = '#a3262e';
      g.fillRect(bx, by, bw, bh);
      g.beginPath();
      g.moveTo(bx - 14 * s, by + 4 * s); g.lineTo(bx + bw * 0.22, by - 60 * s); g.lineTo(bx + bw * 0.78, by - 60 * s); g.lineTo(bx + bw + 14 * s, by + 4 * s);
      g.fill();
      g.strokeStyle = '#f2ead8';
      g.lineWidth = 6 * s;
      g.beginPath();
      g.moveTo(bx - 14 * s, by + 4 * s); g.lineTo(bx + bw * 0.22, by - 60 * s); g.lineTo(bx + bw * 0.78, by - 60 * s); g.lineTo(bx + bw + 14 * s, by + 4 * s);
      g.stroke();
      // doors with an X
      const dw = 90 * s, dh = 100 * s, dx = bx + bw / 2 - dw / 2, dy = G.groundY - dh;
      g.fillStyle = '#7d1b22';
      g.fillRect(dx, dy, dw, dh);
      g.strokeRect(dx, dy, dw, dh);
      g.beginPath();
      g.moveTo(dx, dy); g.lineTo(dx + dw / 2, dy + dh); g.lineTo(dx + dw, dy);
      g.moveTo(dx, dy + dh); g.lineTo(dx + dw / 2, dy); g.lineTo(dx + dw, dy + dh);
      g.moveTo(dx + dw / 2, dy); g.lineTo(dx + dw / 2, dy + dh);
      g.stroke();
      // glowing hayloft window
      const flick = 0.85 + Math.sin(t * 7) * 0.05 + Math.sin(t * 13) * 0.05;
      g.fillStyle = `rgba(255,200,90,${flick})`;
      g.fillRect(bx + bw / 2 - 22 * s, by - 34 * s, 44 * s, 34 * s);
      g.strokeRect(bx + bw / 2 - 22 * s, by - 34 * s, 44 * s, 34 * s);
    }

    function chicken(x, y, k, t, ph, panic) {
      const peck = panic ? 0 : Math.max(0, Math.sin(t * 2.5 + ph)) ** 6;
      const hop = panic ? Math.abs(Math.sin(t * 16 + ph)) * 10 * k : 0;
      g.save();
      g.translate(x, y - hop);
      g.scale(k, k);
      g.fillStyle = '#f5f1e6';
      g.beginPath(); g.ellipse(0, -16, 18, 14, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-14, -22); g.lineTo(-26, -34); g.lineTo(-18, -14); g.fill();
      const hx = 14 + peck * 8, hy = -30 + peck * 22;
      g.beginPath(); g.arc(hx, hy, 9, 0, TAU); g.fill();
      g.fillStyle = '#e63946';
      g.beginPath(); g.arc(hx, hy - 9, 4, 0, TAU); g.arc(hx - 4, hy - 8, 3.5, 0, TAU); g.fill();
      g.fillStyle = '#ffb703';
      g.beginPath(); g.moveTo(hx + 7, hy - 2); g.lineTo(hx + 15, hy + 1); g.lineTo(hx + 7, hy + 4); g.fill();
      g.fillStyle = '#111';
      g.beginPath(); g.arc(hx + 2, hy - 2, 2, 0, TAU); g.fill();
      g.strokeStyle = '#ffb703';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(-3, -4); g.lineTo(-5, 4); g.moveTo(4, -4); g.lineTo(6, 4); g.stroke();
      if (panic) {
        const f = Math.sin(t * 30 + ph) * 12;
        g.fillStyle = '#e8e2d0';
        g.beginPath(); g.moveTo(-4, -20); g.lineTo(-10, -40 - f); g.lineTo(8, -24); g.fill();
      }
      g.restore();
    }

    function porch(G, t, ft) {
      const s = G.s, pw = 240 * s, px = G.W - pw, py = G.groundY;
      // house wall + roof
      g.fillStyle = '#d8c7a0';
      g.fillRect(px, py - 170 * s, pw, 170 * s);
      g.fillStyle = '#56402c';
      g.beginPath(); g.moveTo(px - 20 * s, py - 120 * s); g.lineTo(px + 40 * s, py - 160 * s); g.lineTo(G.W + 10, py - 160 * s); g.lineTo(G.W + 10, py - 120 * s); g.fill();
      g.fillStyle = '#6b4f36';
      g.fillRect(px - 6 * s, py - 120 * s, 8 * s, 120 * s);
      g.fillRect(px, py - 12 * s, pw, 12 * s);
      // window + porch lamp
      g.fillStyle = '#ffd27a';
      g.fillRect(px + 120 * s, py - 105 * s, 50 * s, 46 * s);
      g.fillStyle = '#56402c';
      g.fillRect(px + 143 * s, py - 105 * s, 4 * s, 46 * s);
      const glow = g.createRadialGradient(px + 40 * s, py - 110 * s, 2, px + 40 * s, py - 110 * s, 70 * s);
      glow.addColorStop(0, 'rgba(255,220,130,0.55)');
      glow.addColorStop(1, 'rgba(255,220,130,0)');
      g.fillStyle = glow;
      g.beginPath(); g.arc(px + 40 * s, py - 110 * s, 70 * s, 0, TAU); g.fill();
      g.fillStyle = '#ffe9a8';
      g.beginPath(); g.arc(px + 40 * s, py - 110 * s, 7 * s, 0, TAU); g.fill();
      farmer(G, px + 70 * s, py - 12 * s, t, ft);
    }

    function farmer(G, x, y, t, ft) {
      const s = G.s;
      const wake = ft >= 0 ? U.range(ft, 4.6, 5.0) : 0;
      const rock = Math.sin(t * 1.2) * 0.08 * (1 - wake);
      g.save();
      g.translate(x, y);
      g.rotate(rock);
      g.scale(s, s);
      // rocking chair
      g.strokeStyle = '#7a5230';
      g.lineWidth = 6;
      g.lineCap = 'round';
      g.beginPath(); g.arc(0, -120, 120, Math.PI * 0.4, Math.PI * 0.6); g.stroke();
      g.beginPath(); g.moveTo(-30, -6); g.lineTo(-34, -100); g.moveTo(30, -6); g.lineTo(26, -48); g.moveTo(-34, -48); g.lineTo(30, -48); g.stroke();
      // body (overalls), slumped -> upright
      const lean = U.lerp(-0.35, 0, wake);
      g.save();
      g.translate(-6, -52);
      g.rotate(lean);
      g.fillStyle = '#3a5ba0';
      g.beginPath(); g.roundRect(-18, -58, 36, 60, 10); g.fill();
      g.fillStyle = '#c0392b';
      g.fillRect(-18, -58, 36, 16);
      // legs
      g.strokeStyle = '#3a5ba0';
      g.lineWidth = 13;
      g.beginPath(); g.moveTo(0, -4); g.lineTo(38, -4); g.lineTo(44, 44); g.stroke();
      g.fillStyle = '#4a3020';
      g.fillRect(38, 40, 22, 9);
      // head
      const hy = -76;
      g.fillStyle = '#f2c29b';
      g.beginPath(); g.arc(4, hy, 17, 0, TAU); g.fill();
      g.fillStyle = '#ddd';
      g.beginPath(); g.ellipse(6, hy + 9, 14, 7, 0, 0, Math.PI); g.fill();
      // straw hat (tipped over the eyes, then pops up in surprise)
      const hatUp = wake * (1 - U.range(ft, 5.3, 5.8)) * 30 + wake * 4;
      g.fillStyle = '#e9c46a';
      g.beginPath(); g.ellipse(4, hy - 6 - hatUp, 30, 7, -0.1 + wake * 0.1, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(4, hy - 14 - hatUp, 16, 11, 0, Math.PI, TAU); g.fill();
      g.fillStyle = '#c0392b';
      g.fillRect(-12, hy - 16 - hatUp, 32, 4);
      g.fillStyle = '#111';
      if (wake > 0.5) {
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(0, hy - 2, 5, 0, TAU); g.arc(12, hy - 2, 5, 0, TAU); g.fill();
        g.fillStyle = '#111';
        const look = Math.sin(t * 3) * 2;
        g.beginPath(); g.arc(look, hy - 3, 2.2, 0, TAU); g.arc(12 + look, hy - 3, 2.2, 0, TAU); g.fill();
      }
      g.restore();
      g.restore();
      // snot bubble + Zzz while asleep, "HUH?" when awake
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (wake < 0.5) {
        const hx = x + (-6 - 76 * Math.sin(-0.35) + 14) * s, hy = y + (-52 - 76 * Math.cos(0.35) + 6) * s;
        const b = (0.5 + 0.5 * Math.sin(t * 1.6)) * 14 * s + 3 * s;
        g.fillStyle = 'rgba(190,230,255,0.55)';
        g.strokeStyle = 'rgba(255,255,255,0.9)';
        g.lineWidth = 1.5 * s;
        g.beginPath(); g.arc(hx + 6 * s + b * 0.8, hy, b, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) {
          const q = (t * 0.35 + i / 3) % 1;
          g.globalAlpha = Math.sin(q * Math.PI);
          g.font = `${(14 + q * 22) * s}px Bungee, sans-serif`;
          g.fillText('z', hx - (10 + q * 40) * s, hy - (30 + q * 80) * s);
        }
        g.globalAlpha = 1;
      } else if (ft > 5) {
        const k = U.easeOutBack(U.range(ft, 5, 5.4));
        const bx = x - 30 * s, by = y - 200 * s;
        g.save();
        g.translate(bx, by);
        g.scale(k, k);
        g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(0, 0, 62 * s, 34 * s, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(10 * s, 26 * s); g.lineTo(34 * s, 56 * s); g.lineTo(30 * s, 22 * s); g.fill();
        g.fillStyle = '#1b1f5c';
        g.font = `${30 * s}px Bungee, sans-serif`;
        g.fillText('HUH?', 0, 2 * s);
        g.restore();
      }
    }

    // ------------------------------------------------------------ saucer, beam, cow
    function beam(G, p, t, top, bot, alpha) {
      if (alpha <= 0 || bot <= top) return;
      const s = G.s, tw = 56 * s, bw = 160 * s, x = G.ux;
      const grd = g.createLinearGradient(0, top, 0, bot);
      grd.addColorStop(0, `rgba(180,255,170,${0.65 * alpha})`);
      grd.addColorStop(1, `rgba(120,255,200,${0.22 * alpha})`);
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(x - tw, top); g.lineTo(x + tw, top); g.lineTo(x + bw, bot); g.lineTo(x - bw, bot); g.closePath(); g.fill();
      // shimmer bands sliding upward
      const span = bot - top;
      for (let i = 0; i < 7; i++) {
        const q = 1 - ((t * (0.35 + p * 0.4) + i / 7) % 1);
        const y = top + q * span, h = 10 * s;
        const hw = U.lerp(tw, bw, q);
        g.fillStyle = `rgba(230,255,230,${0.22 * alpha * Math.sin(q * Math.PI)})`;
        g.fillRect(x - hw, y, hw * 2, h);
      }
      // sparkles + floating hay
      g.fillStyle = `rgba(255,255,255,${alpha})`;
      sparks.forEach(sp => {
        const q = 1 - ((t * sp.sp + sp.ph) % 1);
        const y = top + q * span, hw = U.lerp(tw, bw, q);
        g.fillRect(x + sp.x * hw * 0.9, y, sp.r * s, sp.r * s);
      });
      g.strokeStyle = `rgba(233,196,106,${alpha})`;
      g.lineWidth = 3 * s;
      hay.forEach(h => {
        const q = 1 - ((t * h.sp + h.ph) % 1);
        const y = top + q * span, hw = U.lerp(tw, bw, q), a = h.rot + t * 0.8;
        const hx = x + h.x * hw * 0.8;
        g.beginPath(); g.moveTo(hx - Math.cos(a) * h.len * s, y - Math.sin(a) * h.len * s); g.lineTo(hx + Math.cos(a) * h.len * s, y + Math.sin(a) * h.len * s); g.stroke();
      });
      // lit patch on the ground
      g.fillStyle = `rgba(170,255,190,${0.3 * alpha})`;
      g.beginPath(); g.ellipse(x, bot, bw * 1.05, 16 * s, 0, 0, TAU); g.fill();
    }

    // Saucer at (x, y) with scale k. mood: 0 calm .. 1 excited; cowIn: show the cow in the dome.
    function saucer(x, y, k, rot, t, mood, cowIn) {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.scale(k, k);
      // dome with alien
      g.fillStyle = 'rgba(160,230,255,0.35)';
      g.beginPath(); g.arc(0, -20, 62, Math.PI, TAU); g.fill();
      const bob = Math.abs(Math.sin(t * (2 + mood * 8))) * 6 * mood;
      const ax = cowIn ? -22 : 0;
      g.fillStyle = '#7ee05a';
      g.beginPath(); g.ellipse(ax, -44 - bob, 22, 26, 0, 0, TAU); g.fill();
      g.strokeStyle = '#7ee05a';
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(ax, -68 - bob); g.lineTo(ax + 4, -82 - bob); g.stroke();
      g.fillStyle = '#ff4fd8';
      g.beginPath(); g.arc(ax + 4, -84 - bob, 5 + Math.sin(t * 6) * 1.5, 0, TAU); g.fill();
      g.fillStyle = '#111';
      g.beginPath(); g.ellipse(ax - 8, -46 - bob, 7, 10, -0.4, 0, TAU); g.ellipse(ax + 8, -46 - bob, 7, 10, 0.4, 0, TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(ax - 6, -50 - bob, 2.2, 0, TAU); g.arc(ax + 10, -50 - bob, 2.2, 0, TAU); g.fill();
      g.strokeStyle = '#1d4a12';
      g.lineWidth = 2.5;
      g.beginPath(); g.arc(ax, -34 - bob, 6 + mood * 3, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      if (cowIn) cowHead(26, -40, 0.62, t);
      g.strokeStyle = 'rgba(255,255,255,0.6)';
      g.lineWidth = 4;
      g.beginPath(); g.arc(0, -20, 54, Math.PI * 1.15, Math.PI * 1.4); g.stroke();
      // disc
      g.fillStyle = '#6f7a8c';
      g.beginPath(); g.ellipse(0, 6, 92, 22, 0, 0, TAU); g.fill();
      g.fillStyle = '#b8c3d4';
      g.beginPath(); g.ellipse(0, -4, 132, 30, 0, 0, TAU); g.fill();
      g.fillStyle = '#e4ebf5';
      g.beginPath(); g.ellipse(0, -12, 110, 14, 0, 0, TAU); g.fill();
      // cycling rim lights
      const sp = 3 + mood * 10;
      for (let i = 0; i < 9; i++) {
        const lx = -112 + i * 28, ly = 2 + Math.cos(((i - 4) / 4) * 1.2) * 6;
        const on = (Math.floor(t * sp) + i) % 3 === 0;
        g.fillStyle = on ? `hsl(${(i * 40 + t * 120) % 360}, 100%, 65%)` : `hsl(${(i * 40 + t * 120) % 360}, 60%, 30%)`;
        g.beginPath(); g.arc(lx, ly, on ? 8 : 6, 0, TAU); g.fill();
      }
      // hatch
      g.fillStyle = '#3a4252';
      g.beginPath(); g.ellipse(0, 22, 40, 9, 0, 0, TAU); g.fill();
      g.restore();
    }

    function cowHead(x, y, k, t) {
      g.save();
      g.translate(x, y);
      g.scale(k, k);
      g.fillStyle = '#f5f1e6';
      g.beginPath(); g.ellipse(0, 0, 26, 30, 0, 0, TAU); g.fill();
      g.fillStyle = '#e9e1cf';
      g.beginPath(); g.moveTo(-18, -24); g.lineTo(-30, -36); g.lineTo(-14, -30); g.moveTo(18, -24); g.lineTo(30, -36); g.lineTo(14, -30); g.fill();
      g.fillStyle = '#1d1d24';
      g.beginPath(); g.ellipse(-10, -12, 11, 9, 0.4, 0, TAU); g.fill();
      g.fillStyle = '#f7a8b8';
      g.beginPath(); g.ellipse(0, 16, 22, 14, 0, 0, TAU); g.fill();
      g.fillStyle = '#7a3a4a';
      g.beginPath(); g.arc(-7, 14, 3, 0, TAU); g.arc(7, 14, 3, 0, TAU); g.fill();
      eyesMeh(0, -8, t);
      g.restore();
    }

    // Half-lidded, deeply unimpressed eyes.
    function eyesMeh(x, y, t) {
      [-11, 11].forEach(dx => {
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(x + dx, y, 7, 0, TAU); g.fill();
        g.fillStyle = '#1d1d24';
        g.beginPath(); g.arc(x + dx + 1, y + 2, 3.5, 0, TAU); g.fill();
        g.fillStyle = '#e9e1cf';
        const lid = Math.sin(t * 0.7) > 0.95 ? 7 : 0;
        g.fillRect(x + dx - 8, y - 8, 16, 8 + lid);
        g.strokeStyle = '#1d1d24';
        g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(x + dx - 8, y + lid); g.lineTo(x + dx + 8, y + lid); g.stroke();
      });
    }

    // Side-view cow centered at (x, y), rotated, legs flailing, chewing.
    function cow(x, y, k, rot, t, flail) {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.scale(k, k);
      // legs behind body
      const legs = [[-58, 0], [-34, 1.7], [34, 3.1], [58, 4.4]];
      g.lineCap = 'round';
      legs.forEach(([lx, ph]) => {
        const a = Math.sin(t * (4 + flail * 6) + ph) * (0.25 + flail * 0.35);
        const ex = lx + Math.sin(a) * 50, ey = 30 + Math.cos(a) * 50;
        g.strokeStyle = '#f5f1e6';
        g.lineWidth = 15;
        g.beginPath(); g.moveTo(lx, 26); g.lineTo(ex, ey); g.stroke();
        g.fillStyle = '#3a2a22';
        g.beginPath(); g.arc(ex, ey, 9, 0, TAU); g.fill();
      });
      // tail
      const tw = Math.sin(t * 3) * 14;
      g.strokeStyle = '#f5f1e6';
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(-82, -12); g.quadraticCurveTo(-110, -6 + tw, -104, 26 + tw); g.stroke();
      g.fillStyle = '#1d1d24';
      g.beginPath(); g.ellipse(-104, 30 + tw, 6, 9, 0, 0, TAU); g.fill();
      // body + spots
      g.fillStyle = '#f5f1e6';
      g.beginPath(); g.ellipse(0, 0, 88, 46, 0, 0, TAU); g.fill();
      g.save();
      g.beginPath(); g.ellipse(0, 0, 88, 46, 0, 0, TAU); g.clip();
      g.fillStyle = '#1d1d24';
      [[-40, -20, 28, 22], [20, 12, 24, 20], [50, -26, 18, 16], [-10, 30, 16, 12]].forEach(([sx, sy, rx, ry]) => {
        g.beginPath(); g.ellipse(sx, sy, rx, ry, 0.5, 0, TAU); g.fill();
      });
      g.restore();
      // udder
      g.fillStyle = '#f7a8b8';
      g.beginPath(); g.ellipse(18, 42, 18, 11, 0, 0, TAU); g.fill();
      // head (side-ish) with a chewing mouth
      g.save();
      g.translate(92, -22);
      g.fillStyle = '#e9e1cf';
      g.beginPath(); g.moveTo(-14, -26); g.lineTo(-6, -46); g.lineTo(2, -28); g.fill();
      g.fillStyle = '#f5f1e6';
      g.beginPath(); g.ellipse(-22, -24, 16, 8, -0.6, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(0, 0, 30, 32, 0, 0, TAU); g.fill();
      const chew = Math.sin(t * 4) * 4;
      g.fillStyle = '#f7a8b8';
      g.beginPath(); g.ellipse(12 + chew * 0.3, 20, 24, 15, 0, 0, TAU); g.fill();
      g.fillStyle = '#7a3a4a';
      g.beginPath(); g.arc(20, 16, 3, 0, TAU); g.arc(30, 18, 3, 0, TAU); g.fill();
      g.strokeStyle = '#7a3a4a';
      g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(4 + chew, 30); g.lineTo(22 + chew, 30); g.stroke();
      eyesMeh(6, -8, t);
      g.restore();
      g.restore();
    }

    function bubble(G, x, y, text, a) {
      if (a <= 0) return;
      const s = G.s;
      g.globalAlpha = Math.min(1, a);
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(x, y, 44 * s, 24 * s, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(x - 30 * s, y + 30 * s, 6 * s, 0, TAU); g.arc(x - 40 * s, y + 42 * s, 4 * s, 0, TAU); g.fill();
      g.fillStyle = '#1b1f5c';
      g.font = `${20 * s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, x, y + 1 * s);
      g.globalAlpha = 1;
    }

    function poof(G, x, y, ft) {
      const a = U.range(ft, 4.2, 5.6);
      if (a <= 0 || a >= 1) return;
      const s = G.s;
      g.strokeStyle = `rgba(255,255,220,${1 - a})`;
      g.lineWidth = 4 * s;
      g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const an = (i / 12) * TAU, r0 = 10 * s + a * 40 * s, r1 = r0 + 30 * s * (1 - a) + 10 * s;
        g.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0);
        g.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1);
      }
      g.stroke();
      g.fillStyle = `rgba(255,255,255,${1 - a})`;
      const r = 14 * s * (1 - a);
      g.beginPath();
      g.moveTo(x, y - r * 2); g.lineTo(x + r * 0.4, y - r * 0.4); g.lineTo(x + r * 2, y); g.lineTo(x + r * 0.4, y + r * 0.4);
      g.lineTo(x, y + r * 2); g.lineTo(x - r * 0.4, y + r * 0.4); g.lineTo(x - r * 2, y); g.lineTo(x - r * 0.4, y - r * 0.4);
      g.fill();
    }

    function bigText(G, text, x, y, ft0, ft, col) {
      if (ft < ft0) return;
      const k = U.easeOutBack(U.range(ft, ft0, ft0 + 0.4));
      g.save();
      g.translate(x, y);
      g.rotate(-0.08 + Math.sin(ft * 4) * 0.04);
      g.scale(k, k);
      g.font = `${84 * G.s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = 14 * G.s;
      g.strokeStyle = '#120b30';
      g.strokeText(text, 0, 0, G.W * 0.9);
      g.fillStyle = col;
      g.fillText(text, 0, 0, G.W * 0.9);
      g.restore();
    }

    function milk(G, ft, t) {
      if (ft < 6) return;
      const s = G.s;
      const q = U.easeOut(U.range(ft, 6, 9.2));
      const x = G.W - 170 * s + Math.sin(ft * 2) * 20 * s * (1 - q), y = U.lerp(-60 * s, G.groundY - 30 * s, q);
      if (q < 1) {
        g.strokeStyle = '#ddd';
        g.lineWidth = 1.5 * s;
        g.beginPath(); g.moveTo(x - 28 * s, y - 50 * s); g.lineTo(x, y - 10 * s); g.lineTo(x + 28 * s, y - 50 * s); g.stroke();
        g.fillStyle = '#ff4fd8';
        g.beginPath(); g.arc(x, y - 50 * s, 30 * s, Math.PI, TAU); g.fill();
      }
      g.fillStyle = '#fff';
      g.beginPath(); g.roundRect(x - 9 * s, y - 14 * s, 18 * s, 28 * s, 4 * s); g.fill();
      g.fillStyle = '#3d8bfd';
      g.fillRect(x - 9 * s, y - 2 * s, 18 * s, 6 * s);
      g.fillStyle = '#ccc';
      g.fillRect(x - 5 * s, y - 20 * s, 10 * s, 7 * s);
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ftReal) {
        // Finale timeline is authored for a 1.25 s suction; stretch it to 1.6 s for a longer moo, shift the rest.
        const ft = ftReal < 0 ? ftReal : ftReal < 1.6 ? ftReal * (1.25 / 1.6) : ftReal - 0.35;
        const G = geom();
        const s = G.s;
        sky(G, t);
        land(G, t);
        barn(G, t);
        porch(G, t, ft);
        const panic = ft > 1.3 && ft < 4.4;
        chickens.forEach((c, i) => {
          const run = panic ? Math.sin(ft * 3 + i * 2) * 50 * s : 0;
          chicken(c.x * G.W + 40 * s + run + 290 * s, G.groundY + 6 * s, s * 0.9, t, c.ph, panic);
        });

        // saucer path: hover, wobble after the gulp, then zigzag off into the night
        const mood = U.range(p, 0.6, 1);
        let ux = G.ux + Math.sin(t * 0.7) * 10 * s, uy = G.uy + Math.sin(t * 1.3) * 8 * s, uk = s * 1.2, urot = Math.sin(t * 0.9) * 0.03 * (1 + mood * 2);
        let gone = false, cowIn = false;
        if (ft >= 0) {
          cowIn = ft > 1.25;
          urot += Math.sin(ft * 16) * 0.16 * U.range(ft, 1.25, 1.4) * (1 - U.range(ft, 2.2, 2.6));
          const z = U.range(ft, 2.6, 4.2);
          const zz = U.easeIn(z);
          ux += zz * G.W * 0.38 + Math.sin(z * Math.PI * 6) * G.W * 0.14 * (1 - z);
          uy = U.lerp(uy, G.H * 0.07, zz);
          uk = s * 1.2 * (1 - zz * 0.9);
          gone = ft > 4.2;
        }
        const hatchY = uy + 22 * uk;

        // beam + cow
        const beamA = ft < 0 ? 0.85 + Math.sin(t * 9) * 0.08 : 1 - U.range(ft, 1.3, 1.7);
        const beamTop = hatchY, beamBot = ft < 0 ? G.groundY : U.lerp(G.groundY, hatchY + 10, U.range(ft, 1.3, 1.7));
        beam(G, p, t, beamTop, beamBot, beamA);

        const cowR = 60 * G.ck;
        const y0 = G.groundY - 76 * G.ck, y1 = hatchY + cowR + 30 * s;
        if (ft < 1.25) {
          const suck = ft >= 0 ? U.easeIn(U.range(ft, 0, 1.2)) : 0;
          const cy = U.lerp(U.lerp(y0, y1, p), hatchY, suck) + Math.sin(t * 1.4) * 6 * s * (p > 0.01 ? 1 : 0.3);
          const rot = t * 0.3 * Math.min(1, p * 12) + suck * suck * 14;
          cow(ux + Math.sin(t * 0.6) * 8 * s, cy, G.ck * (1 - suck * 0.9), rot, t, Math.min(1, p * 1.5) + suck);
          // the cow comments on the situation now and then
          const say = (t % 9) / 9;
          if (ft < 0 && say > 0.6) bubble(G, ux + 150 * s, cy - 90 * s, U.range(p, 0.6, 1) > 0.5 ? 'ugh.' : 'meh.', Math.sin(U.range(say, 0.6, 1) * Math.PI) * 1.5);
        }
        if (!gone) saucer(ux, uy, uk, urot, t, ft >= 0 ? 1 : mood, cowIn);
        poof(G, G.ux + G.W * 0.38, G.H * 0.07, ft);
        if (ft >= 0) {
          if (ft < 3.2) bigText(G, 'GULP!', G.ux, G.uy + 150 * s, 1.25, ft, '#9dff6a');
          milk(G, ft, t);
        }
      },

      finale() {
        // Indignant moo that rises as the cow is sucked up.
        // Long, low, deeply unimpressed moo with an indignant yelp at the very end.
        const moo = sfx.voice({ f: 145, to: 100, glide: 1.3, at: 0, dur: 1.65, vol: 0.34, formants: [[520, 1, 5], [1100, 0.45, 6], [2500, 0.1, 8]], vib: { rate: 5, depth: 3 } });
        if (moo && sfx.ctx) moo.frequency.exponentialRampToValueAtTime(230, sfx.ctx.currentTime + 1.62);
        const D = 0.35; // visuals after the gulp are shifted by this much
        // Gulp.
        sfx.tone({ f: 380, to: 90, glide: 0.14, at: 1.25 + D, dur: 0.18, vol: 0.4, type: 'sine', attack: 0.005 });
        sfx.pop({ at: 1.32 + D, vol: 0.4, f: 700 });
        // Small satisfied burp from the saucer.
        sfx.voice({ f: 90, to: 70, at: 1.9 + D, dur: 0.35, vol: 0.22, formants: [[400, 1, 4], [900, 0.4, 5]] });
        // Theremin warble while it wobbles and zigzags off.
        [[1.4, 0.8, 700, 1050], [2.2, 0.5, 1050, 620], [2.7, 0.5, 620, 1300], [3.2, 0.45, 1300, 760], [3.65, 0.45, 760, 1600]].forEach(([at, dur, f, to]) => {
          sfx.tone({ f, to, at: at + D, dur, vol: 0.13, type: 'sine', attack: 0.06, release: 0.12, vib: { rate: 7, depth: 35 } });
          sfx.tone({ f: f * 2, to: to * 2, at: at + D, dur, vol: 0.03, type: 'triangle', attack: 0.06, release: 0.12, vib: { rate: 7, depth: 70 } });
        });
        // Warp zap + sparkle.
        sfx.tone({ f: 180, to: 3400, glide: 0.35, at: 4.05 + D, dur: 0.4, vol: 0.18, type: 'sawtooth', filter: 'lowpass', ff: 1500, ffTo: 6000, attack: 0.005 });
        sfx.noise({ at: 4.05 + D, dur: 0.4, vol: 0.12, filter: 'highpass', ff: 1200, ffTo: 7000, attack: 0.005 });
        [0, 0.07, 0.14, 0.21].forEach((d, i) => sfx.tone({ f: 2400 + i * 520, at: 4.3 + D + d, dur: 0.5, vol: 0.06, attack: 0.002, release: 0.45 }));
      },

      destroy() {},
    };
  },
});
