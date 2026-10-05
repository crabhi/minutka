// A long serpentine run of dominoes on wall shelves; marbles roll down chutes to turn each row around.
// Progress = how far the falling wave has travelled. A nervous little guy follows the wave.
// Finale: the last few dominoes clatter down, the last one hits a giant gong — GONG — confetti cannons fire,
// the whole line stands back up in a wave and bounces to celebrate.
Minutka.register({
  id: 'domino',
  name: 'Chain Reaction',
  emoji: '🎳',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;

    const RESERVE = 6;       // the last dominoes fall during the finale (synced with the clacks)
    const FALL = 0.32;       // seconds a domino takes to topple
    let layoutKey = '';
    let L = null;            // layout: rows, items, gong...
    const confetti = [];
    let guy = null;

    // Builds the serpentine for the current screen size. Item state (fall times) is kept by index.
    function layout(W, H) {
      const key = W + 'x' + H;
      if (key === layoutKey) return L;
      layoutKey = key;
      const R = U.rng(5);
      const land = W > H;
      const rows = land ? 4 : U.clamp(Math.round((H / W) * 3.2), 4, 8);
      const top = H * (land ? 0.17 : 0.14), bottom = H * 0.95;
      const pitch = (bottom - top) / rows;
      const h = pitch * 0.62, w = h * 0.3, d = h * 0.58;
      const cr = pitch / 2;
      const A = cr + pitch * 0.25, B = W - cr - pitch * 0.25;
      const items = [];
      let slot = 0;
      for (let r = 0; r < rows; r++) {
        const y = top + pitch * (r + 1) - pitch * 0.08;
        const dir = r % 2 ? -1 : 1;
        const last = r === rows - 1;
        const span = B - A - (last ? pitch * 1.5 : 0);
        const n = Math.floor(span / d);
        for (let i = 0; i < n; i++) {
          const x = dir > 0 ? A + d * 0.5 + i * d : B - d * 0.5 - i * d;
          items.push({ kind: 'd', x, y, dir, row: r, hue: (items.length * 9) % 360, pips: [Math.floor(R() * 7), Math.floor(R() * 7)], s0: slot, fallT: null });
          slot += 1;
        }
        if (!last) {
          const cx = dir > 0 ? B : A;
          items.push({ kind: 'chute', x: cx, y, dir, row: r, cy: y + pitch / 2, s0: slot, fallT: null });
          slot += 2;
        }
      }
      const lastD = items[items.length - 1];
      const gr = pitch * 0.4;
      const gong = { x: lastD.x + lastD.dir * (h * Math.sin(0.75) + w * 0.5 + gr * 0.95), y: lastD.y - pitch * 0.48, r: gr, top: lastD.y - pitch * 0.91 };
      // keep fall states across resizes
      if (L) items.forEach((it, i) => { if (L.items[i]) it.fallT = L.items[i].fallT; });
      L = { land, rows, pitch, h, w, d, cr, items, slots: slot, gong, A, B };
      guy = null;
      return L;
    }

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      return { W, H, s, L: layout(W, H) };
    }

    // ------------------------------------------------------------ scenery
    function wall(G, t) {
      g.fillStyle = '#f3e3c3';
      g.fillRect(0, 0, G.W, G.H);
      const sw = 60 * Math.max(G.s, 0.5);
      g.fillStyle = '#ead4ab';
      for (let x = 0; x < G.W; x += sw * 2) g.fillRect(x, 0, sw, G.H);
      // a picture frame and a clock-less wall decoration for charm
      g.fillStyle = 'rgba(120,80,40,0.08)';
      g.fillRect(0, G.H * 0.97, G.W, G.H * 0.03);
    }

    function shelf(G, y) {
      const Lr = G.L, th = Lr.pitch * 0.09;
      g.fillStyle = '#9b6a3a';
      g.fillRect(Lr.A - Lr.cr * 0.2, y, Lr.B - Lr.A + Lr.cr * 0.4, th);
      g.fillStyle = '#7a5029';
      g.fillRect(Lr.A - Lr.cr * 0.2, y + th * 0.7, Lr.B - Lr.A + Lr.cr * 0.4, th * 0.3);
      // brackets
      g.fillStyle = '#5b5f6a';
      [0.15, 0.5, 0.85].forEach(k => {
        const x = U.lerp(Lr.A, Lr.B, k);
        g.beginPath(); g.moveTo(x, y + th); g.lineTo(x + th * 1.5, y + th); g.lineTo(x, y + th * 3); g.fill();
      });
    }

    function chute(G, it) {
      const Lr = G.L, r = Lr.cr;
      g.strokeStyle = '#3d8bfd';
      g.lineWidth = Lr.pitch * 0.07;
      g.lineCap = 'round';
      g.beginPath();
      if (it.dir > 0) g.arc(it.x, it.cy, r, -Math.PI / 2, Math.PI / 2);
      else g.arc(it.x, it.cy, r, Math.PI / 2, Math.PI * 1.5);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = Lr.pitch * 0.02;
      g.stroke();
    }

    // The marble rolls down the chute over the chute's two slots, arriving as the next row starts.
    function marble(G, it, f, t) {
      const Lr = G.L, mr = Lr.h * 0.13, r = Lr.cr - Lr.pitch * 0.035 - mr;
      const k = U.clamp((f - it.s0) / 2);
      const a = -Math.PI / 2 + U.easeInOut(k) * Math.PI + (k > 0 && k < 1 ? Math.sin(t * 9) * 0.01 : 0);
      const x = it.x + it.dir * Math.cos(a) * r - it.dir * (k === 0 ? mr * 1.5 : 0);
      const y = it.cy + Math.sin(a) * r;
      const grd = g.createRadialGradient(x - mr * 0.4, y - mr * 0.4, mr * 0.1, x, y, mr);
      grd.addColorStop(0, '#fff');
      grd.addColorStop(1, '#e94b5b');
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, mr, 0, U.TAU); g.fill();
    }

    // One domino standing at (x,y) (bottom centre), tipped by `ang` toward dir around its leading corner.
    function domino(G, it, ang, lift, dim) {
      const Lr = G.L, h = Lr.h, w = Lr.w;
      g.save();
      g.translate(it.x + it.dir * w / 2, it.y - lift);
      g.rotate(it.dir * ang);
      g.translate(-it.dir * w / 2, 0);
      g.fillStyle = `hsl(${it.hue}, 75%, ${dim ? 42 : 55}%)`;
      g.strokeStyle = '#1e1a2e';
      g.lineWidth = Math.max(1.5, w * 0.1);
      g.beginPath(); g.roundRect(-w / 2, -h, w, h, w * 0.18); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = Math.max(1, w * 0.07);
      g.beginPath(); g.moveTo(-w * 0.32, -h / 2); g.lineTo(w * 0.32, -h / 2); g.stroke();
      g.fillStyle = '#fff';
      const pr = w * 0.09;
      it.pips.forEach((n, half) => pipFace(n, -h * (half ? 0.25 : 0.75), w * 0.26, h * 0.15, pr));
      g.restore();
    }

    const PIPS = [[], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]];
    function pipFace(n, cy, dx, dy, r) {
      PIPS[n].forEach(([a, b]) => { g.beginPath(); g.arc(a * dx, cy + b * dy, r, 0, U.TAU); g.fill(); });
    }

    function gong(G, ft, t) {
      const Lr = G.L, gg = Lr.gong, s = G.s;
      const hit = ft >= 0.95 ? ft - 0.95 : -1;
      const swing = hit >= 0 ? Math.sin(hit * 5) * 0.25 * Math.exp(-hit * 0.5) : Math.sin(t * 1.1) * 0.02;
      const shake = hit >= 0 ? Math.sin(hit * 70) * Math.exp(-hit * 1.2) * gg.r * 0.06 : 0;
      const top = gg.top;
      g.save();
      g.translate(gg.x, top);
      g.rotate(swing);
      g.strokeStyle = '#333';
      g.lineWidth = 2 * Math.max(s, 0.6);
      g.beginPath(); g.moveTo(-gg.r * 0.5, 0); g.lineTo(-gg.r * 0.3, gg.y - top); g.moveTo(gg.r * 0.5, 0); g.lineTo(gg.r * 0.3, gg.y - top); g.stroke();
      g.translate(shake, gg.y - top);
      const grd = g.createRadialGradient(-gg.r * 0.3, -gg.r * 0.3, gg.r * 0.1, 0, 0, gg.r);
      grd.addColorStop(0, '#ffe7a0');
      grd.addColorStop(0.6, '#e0a83a');
      grd.addColorStop(1, '#9a6a1c');
      g.fillStyle = grd;
      g.beginPath(); g.arc(0, 0, gg.r, 0, U.TAU); g.fill();
      g.strokeStyle = '#7a4f10';
      g.lineWidth = gg.r * 0.08;
      g.stroke();
      g.beginPath(); g.arc(0, 0, gg.r * 0.55, 0, U.TAU); g.lineWidth = gg.r * 0.04; g.stroke();
      g.fillStyle = '#b77d22';
      g.beginPath(); g.arc(0, 0, gg.r * 0.22, 0, U.TAU); g.fill();
      g.restore();
      // sound rings
      if (hit >= 0 && hit < 4) {
        for (let k = 0; k < 4; k++) {
          const q = (hit * 1.3 + k * 0.25) % 1;
          g.strokeStyle = `rgba(255,190,60,${(1 - q) * 0.8 * (1 - hit / 4)})`;
          g.lineWidth = gg.r * 0.08 * (1 - q) + 1;
          g.beginPath(); g.arc(gg.x, gg.y, gg.r * (1.1 + q * 2.4), 0, U.TAU); g.stroke();
        }
      }
    }

    // The nervous little spectator who follows the wave.
    function spectator(G, x, y, S, t, ft, nerv) {
      const fin = ft >= 0;
      const party = fin && ft > 1.2;
      const hop = party ? Math.abs(Math.sin(ft * 7)) * S * 0.3 : Math.abs(Math.sin(t * 3)) * S * 0.03;
      const jit = !fin ? Math.sin(t * 37) * nerv * S * 0.02 : 0;
      g.save();
      g.translate(x + jit, y - hop);
      g.lineCap = 'round';
      g.strokeStyle = '#2b2b3d';
      g.lineWidth = S * 0.09;
      const step = Math.sin(t * 9) * S * 0.08 * (party ? 1 : 0.3);
      g.beginPath(); g.moveTo(-S * 0.08, -S * 0.45); g.lineTo(-S * 0.12 + step, 0); g.moveTo(S * 0.08, -S * 0.45); g.lineTo(S * 0.12 - step, 0); g.stroke();
      // body
      g.fillStyle = '#ff7a3d';
      g.beginPath(); g.roundRect(-S * 0.17, -S * 0.85, S * 0.34, S * 0.45, S * 0.1); g.fill();
      // arms: bite nails / cover ears / party
      g.strokeStyle = '#ff7a3d';
      g.lineWidth = S * 0.08;
      const ears = fin && ft > 0.85 && ft < 1.6;
      g.beginPath();
      if (party) {
        const a = Math.sin(ft * 10) * 0.4;
        g.moveTo(-S * 0.15, -S * 0.78); g.lineTo(-S * 0.38, -S * 1.15 + a * S * 0.1);
        g.moveTo(S * 0.15, -S * 0.78); g.lineTo(S * 0.38, -S * 1.15 - a * S * 0.1);
      } else if (ears) {
        g.moveTo(-S * 0.15, -S * 0.78); g.lineTo(-S * 0.3, -S * 1.05);
        g.moveTo(S * 0.15, -S * 0.78); g.lineTo(S * 0.3, -S * 1.05);
      } else {
        const bite = Math.sin(t * 8) * S * 0.02;
        g.moveTo(-S * 0.15, -S * 0.78); g.lineTo(-S * 0.25, -S * 0.55); g.lineTo(-S * 0.05, -S * 0.98 + bite);
        g.moveTo(S * 0.15, -S * 0.78); g.lineTo(S * 0.3, -S * 0.5);
      }
      g.stroke();
      // head
      g.fillStyle = '#f5c9a0';
      g.beginPath(); g.arc(0, -S * 1.08, S * 0.24, 0, U.TAU); g.fill();
      g.fillStyle = '#4a2c12';
      g.beginPath(); g.arc(0, -S * 1.16, S * 0.22, Math.PI * 1.05, Math.PI * 1.95); g.fill();
      const er = S * (0.05 + nerv * 0.03);
      g.fillStyle = '#fff';
      [-1, 1].forEach(dd => { g.beginPath(); g.arc(dd * S * 0.09, -S * 1.1, er, 0, U.TAU); g.fill(); });
      g.fillStyle = '#111';
      const look = guy ? guy.look : 0;
      [-1, 1].forEach(dd => { g.beginPath(); g.arc(dd * S * 0.09 + look * er * 0.4, -S * 1.1, er * 0.5, 0, U.TAU); g.fill(); });
      g.strokeStyle = '#7a2a10';
      g.lineWidth = S * 0.03;
      g.beginPath();
      if (party) g.arc(0, -S * 1.0, S * 0.08, 0.1, Math.PI - 0.1);
      else { g.moveTo(-S * 0.06, -S * 0.97); g.lineTo(-S * 0.02, -S * 0.99); g.lineTo(S * 0.02, -S * 0.97); g.lineTo(S * 0.06, -S * 0.99); }
      g.stroke();
      if (!fin && nerv > 0.3) {
        g.fillStyle = 'rgba(100,180,255,0.9)';
        const k = (t * 1.3) % 1;
        g.beginPath(); g.arc(S * 0.24, -S * 1.15 + k * S * 0.3, S * 0.04, 0, U.TAU); g.fill();
      }
      g.restore();
    }

    // ------------------------------------------------------------ confetti
    function cannon(G, side, ft) {
      const s = Math.max(G.s, 0.5), x = side < 0 ? 40 * s : G.W - 40 * s, y = G.H - 20 * s;
      const recoil = ft > 1.3 ? Math.exp(-(ft - 1.3) * 6) * 12 * s : 0;
      g.save();
      g.translate(x, y);
      g.rotate(side * -0.5);
      g.translate(0, recoil);
      g.fillStyle = '#2b2b3d';
      g.beginPath(); g.roundRect(-18 * s, -80 * s, 36 * s, 80 * s, 6 * s); g.fill();
      g.fillStyle = '#ffd23f';
      g.fillRect(-20 * s, -84 * s, 40 * s, 10 * s);
      g.restore();
    }

    function fireConfetti(G, side) {
      const s = Math.max(G.s, 0.5);
      for (let i = 0; i < 110; i++) {
        if (confetti.length > 320) confetti.shift();
        const a = -Math.PI / 2 - side * (0.45 + (Math.random() - 0.5) * 0.6);
        const v = (600 + Math.random() * 700) * s * Math.max(1, G.H / 720);
        confetti.push({ x: side < 0 ? 60 * s : G.W - 60 * s, y: G.H - 80 * s, vx: Math.cos(a) * v * (G.W / G.H > 1 ? 1 : 0.6), vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20, hue: Math.floor(Math.random() * 360), sz: (9 + Math.random() * 8) * s, life: 0 });
      }
    }

    function stepConfetti(G, dt) {
      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.life += dt;
        c.vx *= 0.985; c.vy = c.vy * 0.985 + 600 * Math.max(G.s, 0.5) * dt;
        if (c.vy > 160 * Math.max(G.s, 0.5)) c.vy = 160 * Math.max(G.s, 0.5);
        c.x += c.vx * dt + Math.sin(c.life * 4 + c.rot) * 0.8;
        c.y += c.vy * dt;
        c.rot += c.vr * dt;
        if (c.y > G.H + 20 || c.life > 9) { confetti.splice(i, 1); continue; }
        g.save();
        g.translate(c.x, c.y);
        g.rotate(c.rot);
        g.fillStyle = `hsl(${c.hue}, 85%, 58%)`;
        g.fillRect(-c.sz / 2, -c.sz * 0.3 * Math.abs(Math.cos(c.life * 6)), c.sz, c.sz * 0.6 * Math.abs(Math.cos(c.life * 6)) + 1);
        g.restore();
      }
    }

    function banner(G, text, ft0, ft, color) {
      if (ft < ft0) return;
      const k = U.easeOutBack(U.clamp((ft - ft0) / 0.4));
      const px = Math.min(G.H * 0.17, (G.W * 0.9) / (text.length * 0.8));
      g.save();
      g.translate(G.W * 0.5, G.H * (G.L.land ? 0.12 : 0.1));
      g.rotate(-0.04 + Math.sin(ft * 3) * 0.03);
      g.scale(k, k);
      g.font = `${px}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = px * 0.14;
      g.lineJoin = 'round';
      g.strokeStyle = '#1e1a2e';
      g.strokeText(text, 0, 0);
      g.fillStyle = color;
      g.fillText(text, 0, 0);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    let fired = false;
    return {
      update(p, t, dt, ft) {
        const G = geom();
        const Lr = G.L, items = Lr.items, s = G.s;
        const fin = ft >= 0;

        // wave front in slots; the last RESERVE dominoes are knocked over during the finale
        const playable = Lr.slots - RESERVE;
        const f = fin ? playable + U.clamp(ft / 0.14, 0, RESERVE + 1) : p * playable;
        let front = 0;
        items.forEach((it, i) => {
          if (f >= it.s0) {
            front = i;
            if (it.fallT === null) it.fallT = f - it.s0 > 3 ? -100 : t;
          } else if (!fin) it.fallT = null;
        });

        wall(G, t);
        for (let r = 0; r < Lr.rows; r++) shelf(G, items.find(it => it.row === r).y);
        items.forEach(it => { if (it.kind === 'chute') chute(G, it); });
        gong(G, ft, t);

        // stand back up in a reverse wave, then bounce in a travelling wave
        const fallenAng = Math.acos(U.clamp(Lr.w / Lr.d, 0, 1));
        const nDom = items.length;
        const next = items[front + 1];
        const frac = U.clamp(f - Math.floor(f));
        items.forEach((it, i) => {
          if (it.kind === 'chute') { marble(G, it, f, t); return; }
          let ang = 0, lift = 0, dim = false;
          if (it.fallT !== null) {
            const k = U.clamp((t - it.fallT) / FALL);
            const lastInRow = !items[i + 1] || items[i + 1].row !== it.row;
            const rest = lastInRow ? (i === nDom - 1 ? 0.75 : Math.PI / 2) : fallenAng;
            ang = U.easeIn(k) * rest;
            dim = k >= 1;
          } else if (it === next && !fin) {
            // the next one teeters, more as the wave approaches
            ang = frac * 0.12 + Math.sin(t * 25) * 0.015 * (0.3 + frac);
          } else if (!fin && i > front && i < front + 7) {
            ang = Math.sin(t * 31 + i * 1.7) * 0.012;
          }
          if (fin && ft > 2.2) {
            const up = U.clamp((ft - 2.2 - (nDom - 1 - i) * 0.012) / 0.25);
            ang *= 1 - up;
            dim = dim && up < 1;
            if (ft > 3.6) lift = Math.abs(Math.sin(ft * 6 - i * 0.35)) * Lr.h * 0.25 * Math.max(0, 1 - (ft - 3.6) / 6);
          }
          domino(G, it, ang, lift, dim);
        });

        // spectator follows the wave on the shelf in front
        const fi = items[Math.min(items.length - 1, front + 2)];
        const tx = fi.kind === 'chute' ? fi.x - fi.dir * Lr.d : fi.x, ty = fi.y + Lr.pitch * 0.09;
        if (!guy) guy = { x: tx, y: ty, look: 1 };
        const kk = 1 - Math.exp(-dt * 4);
        guy.x += (tx - guy.x) * kk;
        guy.y += (ty - guy.y) * kk;
        guy.look = fi.dir * -1;
        if (fin) { guy.x += (Lr.gong.x - fi.dir * Lr.pitch * 1.8 - guy.x) * kk * 0.5; guy.look = fi.dir; }
        spectator(G, guy.x, guy.y, Lr.h * 1.05, t, ft, fin ? 1 : U.range(p, 0.3, 1));

        if (fin) {
          cannon(G, -1, ft);
          cannon(G, 1, ft);
          if (!fired && ft > 1.3) { fired = true; fireConfetti(G, -1); fireConfetti(G, 1); }
          stepConfetti(G, dt);
          if (ft < 2.2) banner(G, 'GONG!', 0.95, ft, '#ffd23f');
          else banner(G, 'CHAIN REACTION!', 2.2, ft, '#7fe3ff');
        }
      },

      finale() {
        // the last dominoes clatter, speeding up
        for (let i = 0; i < RESERVE; i++) {
          const at = i * 0.14;
          sfx.noise({ at, dur: 0.035, vol: 0.35, filter: 'bandpass', ff: 2600 + i * 120, q: 3, attack: 0.001, release: 0.03 });
          sfx.tone({ at, f: 1500 + i * 60, to: 900, dur: 0.04, type: 'triangle', vol: 0.12, attack: 0.001 });
        }
        // GONG: low inharmonic partials with long decay, plus the mallet thud
        const at = 0.95, f0 = 118;
        sfx.noise({ at, dur: 0.15, vol: 0.4, filter: 'lowpass', ff: 900, attack: 0.002, release: 0.12 });
        [[0.5, 0.1], [1, 0.13], [1.47, 0.11], [2.09, 0.1], [2.56, 0.09], [3.42, 0.07], [4.18, 0.05], [5.43, 0.04]].forEach(([r, v], i) => {
          sfx.tone({ at, f: f0 * r, dur: 5.5 - i * 0.4, type: 'sine', vol: v, attack: 0.004, release: 5.2 - i * 0.4, vib: { rate: 0.8 + i * 0.37, depth: f0 * r * 0.004 } });
        });
        sfx.noise({ at: at + 0.02, dur: 2.5, vol: 0.06, filter: 'bandpass', ff: 1400, q: 4, attack: 0.05, release: 2.3 });
        // confetti cannons
        sfx.pop({ at: 1.3, vol: 0.5, f: 700 });
        sfx.pop({ at: 1.34, vol: 0.45, f: 1100 });
        sfx.noise({ at: 1.32, dur: 0.6, vol: 0.18, filter: 'highpass', ff: 3500, attack: 0.005, release: 0.5 });
      },

      destroy() {},
    };
  },
});
