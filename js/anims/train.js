// Reference animation: a steam train crawls across the countryside to the station.
// Progress = how far the locomotive has travelled toward the end of the platform.
Minutka.register({
  id: 'train',
  name: 'The Last Train',
  emoji: '🚂',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(7);

    // Static scenery, generated once in normalized coordinates.
    const mountains = Array.from({ length: 9 }, (_, i) => ({ x: i / 8 + R() * 0.06, h: 0.18 + R() * 0.14, w: 0.18 + R() * 0.1 }));
    const clouds = Array.from({ length: 6 }, () => ({ x: R(), y: 0.08 + R() * 0.22, s: 0.6 + R() * 0.8, v: 0.004 + R() * 0.006 }));
    const crowd = Array.from({ length: 5 }, (_, i) => ({
      dx: i * 27 + R() * 6, hue: Math.floor(R() * 360), h: 0.9 + R() * 0.25, ph: R() * U.TAU, hat: R() < 0.4,
    }));
    const wagonColors = ['#e94b5b', '#3d8bfd', '#25b97a'];
    const passengers = Array.from({ length: 9 }, () => ({ on: R() < 0.75, hue: Math.floor(R() * 360), ph: R() * U.TAU }));

    const tufts = Array.from({ length: 40 }, () => ({ x: R(), y: R(), k: 0.6 + R() * 0.8, flower: R() < 0.3, hue: Math.floor(R() * 360), ph: R() * 6 }));

    const puffs = [];
    let emitAcc = 0;
    let wheelPhase = 0;

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const SH = Math.min(H, W * 0.75); // scenery height, keeps mountains sane in portrait
      const railY = H * 0.78;
      const stationX = W * 0.6;
      const platformEnd = W * 0.8; // where the locomotive stops; the crowd waits beyond it
      return { W, H, s, SH, railY, stationX, platformEnd };
    }

    function frontX(p, G) {
      const startX = G.W * 0.28;
      const endX = G.platformEnd;
      return U.lerp(startX, endX, p);
    }

    // ------------------------------------------------------------ drawing
    function sky(G, p, ft) {
      const warm = U.range(p, 0.6, 1) * 0.5;
      const grd = g.createLinearGradient(0, 0, 0, G.railY);
      grd.addColorStop(0, `hsl(${205 - warm * 30}, 70%, ${62 - warm * 10}%)`);
      grd.addColorStop(1, `hsl(${30 + (1 - warm) * 10}, 90%, ${82 - warm * 8}%)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.H);
      // sun slides down a little as time passes
      const sy = U.lerp(G.H * 0.16, G.H * 0.42, p);
      g.fillStyle = 'rgba(255, 230, 140, 0.35)';
      g.beginPath(); g.arc(G.W * 0.82, sy, 90 * G.s, 0, U.TAU); g.fill();
      g.fillStyle = '#ffe28a';
      g.beginPath(); g.arc(G.W * 0.82, sy, 55 * G.s, 0, U.TAU); g.fill();
    }

    function cloud(x, y, k) {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      g.arc(x, y, 30 * k, 0, U.TAU);
      g.arc(x + 32 * k, y - 14 * k, 36 * k, 0, U.TAU);
      g.arc(x + 70 * k, y, 28 * k, 0, U.TAU);
      g.arc(x + 36 * k, y + 10 * k, 30 * k, 0, U.TAU);
      g.fill();
    }

    function scenery(G, t) {
      clouds.forEach(c => {
        const x = (((c.x - t * c.v) % 1.3) + 1.3) % 1.3 - 0.15;
        cloud(x * G.W, c.y * G.H, c.s * G.s);
      });
      g.fillStyle = '#8c7fb8';
      mountains.forEach(m => {
        g.beginPath();
        g.moveTo((m.x - m.w) * G.W, G.railY);
        g.lineTo(m.x * G.W, G.railY - m.h * G.SH);
        g.lineTo((m.x + m.w) * G.W, G.railY);
        g.fill();
      });
      g.fillStyle = '#f4f1ff';
      mountains.forEach(m => {
        const k = 0.22;
        g.beginPath();
        g.moveTo((m.x - m.w * k) * G.W, G.railY - m.h * G.SH * (1 - k));
        g.lineTo(m.x * G.W, G.railY - m.h * G.SH);
        g.lineTo((m.x + m.w * k) * G.W, G.railY - m.h * G.SH * (1 - k));
        g.fill();
      });
      // rolling hills
      g.fillStyle = '#5fbf5a';
      g.beginPath();
      g.moveTo(0, G.railY);
      for (let x = 0; x <= G.W; x += 20) g.lineTo(x, G.railY - 40 * G.s - Math.sin(x / (180 * G.s)) * 26 * G.s);
      g.lineTo(G.W, G.railY);
      g.fill();
      // ground
      g.fillStyle = '#3f9a45';
      g.fillRect(0, G.railY, G.W, G.H - G.railY);
      g.fillStyle = '#b48a5a';
      g.fillRect(0, G.railY - 4 * G.s, G.W, 22 * G.s);
    }

    function rails(G) {
      const s = G.s;
      g.fillStyle = '#6b4a2b';
      for (let x = -20; x < G.W + 40; x += 34 * s) g.fillRect(x, G.railY + 2 * s, 14 * s, 14 * s);
      g.fillStyle = '#9aa3ad';
      g.fillRect(0, G.railY, G.W, 5 * s);
      g.fillStyle = '#5b636d';
      g.fillRect(0, G.railY + 5 * s, G.W, 2 * s);
      // telegraph poles
      g.strokeStyle = '#5a3d22';
      g.lineWidth = 5 * s;
      for (let x = 60 * s; x < G.stationX - 40 * s; x += 260 * s) {
        g.beginPath(); g.moveTo(x, G.railY - 2 * s); g.lineTo(x, G.railY - 150 * s); g.stroke();
        g.beginPath(); g.moveTo(x - 22 * s, G.railY - 140 * s); g.lineTo(x + 22 * s, G.railY - 140 * s); g.stroke();
      }
      g.strokeStyle = 'rgba(40,30,20,0.5)';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = 60 * s; x < G.stationX - 300 * s; x += 260 * s) {
        g.moveTo(x, G.railY - 140 * s);
        g.quadraticCurveTo(x + 130 * s, G.railY - 118 * s, x + 260 * s, G.railY - 140 * s);
      }
      g.stroke();
    }

    function station(G, t, ft) {
      const s = G.s, x = G.stationX, y = G.railY;
      const bw = 230 * s, bh = 150 * s, bx = x + 50 * s;
      // platform
      g.fillStyle = '#c9b79c';
      g.fillRect(x - 10 * s, y - 26 * s, G.W - x + 20 * s, 26 * s);
      g.fillStyle = '#a08c70';
      g.fillRect(x - 10 * s, y - 6 * s, G.W - x + 20 * s, 6 * s);
      // building
      g.fillStyle = '#f2d6a2';
      g.fillRect(bx, y - 26 * s - bh, bw, bh);
      g.fillStyle = '#b5413a';
      g.beginPath();
      g.moveTo(bx - 24 * s, y - 26 * s - bh);
      g.lineTo(bx + bw / 2, y - 26 * s - bh - 70 * s);
      g.lineTo(bx + bw + 24 * s, y - 26 * s - bh);
      g.fill();
      // windows + door
      g.fillStyle = '#5a7bb0';
      g.fillRect(bx + 22 * s, y - 26 * s - bh + 40 * s, 40 * s, 50 * s);
      g.fillRect(bx + bw - 62 * s, y - 26 * s - bh + 40 * s, 40 * s, 50 * s);
      g.fillStyle = '#6b3e1f';
      g.fillRect(bx + bw / 2 - 24 * s, y - 26 * s - 80 * s, 48 * s, 80 * s);
      // clock without numbers, hands spin
      const cx = bx + bw / 2, cy = y - 26 * s - bh - 22 * s;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(cx, cy, 20 * s, 0, U.TAU); g.fill();
      g.strokeStyle = '#222'; g.lineWidth = 3 * s;
      g.stroke();
      g.lineCap = 'round';
      const spin = ft >= 0 ? 12 : 1;
      [[t * 0.05 * spin, 10], [t * 0.6 * spin, 16]].forEach(([a, len]) => {
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * len * s, cy - Math.cos(a) * len * s); g.stroke();
      });
      // sign
      g.fillStyle = '#1f3b5c';
      g.fillRect(bx + 20 * s, y - 26 * s - bh + 8 * s, bw - 40 * s, 24 * s);
      g.fillStyle = '#fff';
      g.font = `700 ${15 * s}px "Space Grotesk", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('MINUTKA CENTRAL', bx + bw / 2, y - 26 * s - bh + 20 * s);
    }

    function people(G, t, ft) {
      const s = G.s, base = G.railY - 26 * s;
      crowd.forEach((c, i) => {
        const x = G.platformEnd + 34 * s + c.dx * s;
        const jump = ft >= 0 ? Math.abs(Math.sin(t * 9 + c.ph)) * 26 * s : 0;
        const sway = Math.sin(t * 2 + c.ph) * 2 * s;
        const h = 52 * s * c.h;
        const y = base - jump;
        g.strokeStyle = `hsl(${c.hue}, 55%, 35%)`;
        g.lineWidth = 7 * s;
        g.lineCap = 'round';
        // legs
        g.beginPath();
        g.moveTo(x - 5 * s, y); g.lineTo(x, y - h * 0.4); g.lineTo(x + 5 * s, y);
        g.stroke();
        // body
        g.lineWidth = 12 * s;
        g.beginPath(); g.moveTo(x, y - h * 0.4); g.lineTo(x + sway, y - h * 0.85); g.stroke();
        // waving arm
        const wave = ft >= 0 ? Math.sin(t * 14 + i) * 0.6 - 2.4 : Math.sin(t * 1.5 + c.ph) * 0.15 - 0.4;
        g.lineWidth = 5 * s;
        g.beginPath();
        g.moveTo(x + sway, y - h * 0.78);
        g.lineTo(x + sway + Math.sin(wave) * 20 * s, y - h * 0.78 + Math.cos(wave) * 20 * s);
        g.stroke();
        // head
        g.fillStyle = '#f5c9a0';
        g.beginPath(); g.arc(x + sway, y - h - 4 * s, 9 * s, 0, U.TAU); g.fill();
        if (c.hat) {
          g.fillStyle = '#222';
          g.fillRect(x + sway - 10 * s, y - h - 12 * s, 20 * s, 4 * s);
          g.fillRect(x + sway - 6 * s, y - h - 24 * s, 12 * s, 13 * s);
        }
      });
    }

    function wheel(x, y, r, phase, s) {
      g.fillStyle = '#2b2b33';
      g.beginPath(); g.arc(x, y, r, 0, U.TAU); g.fill();
      g.strokeStyle = '#c33';
      g.lineWidth = 3 * s;
      g.beginPath(); g.arc(x, y, r * 0.8, 0, U.TAU); g.stroke();
      g.strokeStyle = '#ddd';
      g.lineWidth = 2.5 * s;
      for (let k = 0; k < 6; k++) {
        const a = phase + (k * U.TAU) / 6;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); g.stroke();
      }
      g.fillStyle = '#ddd';
      g.beginPath(); g.arc(x, y, r * 0.18, 0, U.TAU); g.fill();
    }

    // Draws the train with its front at fx. Returns chimney top position for steam.
    function trainAt(G, fx, t, bob) {
      const s = G.s, y = G.railY;
      const locoL = 250 * s, wagonL = 190 * s, gap = 14 * s;
      const lx = fx - locoL;
      const by = y - 22 * s + bob;

      // wagons (behind the loco, to the left)
      for (let w = 0; w < 3; w++) {
        const wx = lx - gap - wagonL - w * (wagonL + gap);
        if (wx + wagonL < -20) continue;
        g.fillStyle = '#333';
        g.fillRect(wx + wagonL, by - 30 * s, gap, 6 * s);
        g.fillStyle = wagonColors[w];
        g.fillRect(wx, by - 110 * s, wagonL, 84 * s);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(wx, by - 36 * s, wagonL, 10 * s);
        g.fillStyle = '#41302a';
        g.fillRect(wx - 6 * s, by - 120 * s, wagonL + 12 * s, 12 * s);
        for (let k = 0; k < 3; k++) {
          const px = wx + 18 * s + k * 58 * s, py = by - 96 * s;
          g.fillStyle = '#d8f0ff';
          g.fillRect(px, py, 40 * s, 38 * s);
          const pa = passengers[w * 3 + k];
          if (pa.on) {
            const hb = Math.sin(t * 6 + pa.ph) * 2 * s;
            g.fillStyle = '#f5c9a0';
            g.beginPath(); g.arc(px + 20 * s, py + 22 * s + hb, 10 * s, 0, U.TAU); g.fill();
            g.fillStyle = `hsl(${pa.hue}, 60%, 45%)`;
            g.fillRect(px + 8 * s, py + 32 * s + hb, 24 * s, 8 * s);
            g.fillStyle = '#222';
            g.fillRect(px + 15 * s, py + 20 * s + hb, 2.5 * s, 2.5 * s);
            g.fillRect(px + 23 * s, py + 20 * s + hb, 2.5 * s, 2.5 * s);
          }
        }
        wheel(wx + 36 * s, y - 14 * s, 16 * s, wheelPhase * 1.6, s);
        wheel(wx + wagonL - 36 * s, y - 14 * s, 16 * s, wheelPhase * 1.6 + 1, s);
      }

      // locomotive
      g.fillStyle = '#20232a';
      g.fillRect(lx, by - 34 * s, locoL - 10 * s, 14 * s);
      // cab
      g.fillStyle = '#c0392b';
      g.fillRect(lx, by - 150 * s, 80 * s, 120 * s);
      g.fillStyle = '#20232a';
      g.fillRect(lx - 8 * s, by - 160 * s, 96 * s, 14 * s);
      g.fillStyle = '#ffeaa0';
      g.fillRect(lx + 16 * s, by - 132 * s, 46 * s, 40 * s);
      // driver
      g.fillStyle = '#f5c9a0';
      g.beginPath(); g.arc(lx + 40 * s, by - 104 * s + Math.sin(t * 5) * 1.5 * s, 11 * s, 0, U.TAU); g.fill();
      g.fillStyle = '#2f4f8f';
      g.fillRect(lx + 28 * s, by - 122 * s, 24 * s, 7 * s);
      // boiler
      g.fillStyle = '#2c3e50';
      g.beginPath();
      g.roundRect(lx + 76 * s, by - 112 * s, locoL - 96 * s, 80 * s, [0, 40 * s, 40 * s, 0]);
      g.fill();
      g.fillStyle = '#f1c40f';
      [0.3, 0.6].forEach(k => g.fillRect(lx + 76 * s + (locoL - 96 * s) * k, by - 112 * s, 6 * s, 80 * s));
      // front plate + lamp
      g.fillStyle = '#596b7d';
      g.beginPath(); g.arc(fx - 22 * s, by - 72 * s, 34 * s, -Math.PI / 2, Math.PI / 2); g.fill();
      g.fillStyle = '#fff6b0';
      g.beginPath(); g.arc(fx - 16 * s, by - 96 * s, 9 * s, 0, U.TAU); g.fill();
      // dome + chimney
      const chx = fx - 70 * s;
      g.fillStyle = '#f1c40f';
      g.beginPath(); g.arc(lx + 150 * s, by - 112 * s, 18 * s, Math.PI, 0); g.fill();
      g.fillStyle = '#20232a';
      g.beginPath();
      g.moveTo(chx - 12 * s, by - 112 * s);
      g.lineTo(chx - 20 * s, by - 160 * s);
      g.lineTo(chx + 20 * s, by - 160 * s);
      g.lineTo(chx + 12 * s, by - 112 * s);
      g.fill();
      g.fillRect(chx - 24 * s, by - 170 * s, 48 * s, 12 * s);
      // cowcatcher
      g.fillStyle = '#c0392b';
      g.beginPath();
      g.moveTo(fx - 18 * s, by - 34 * s);
      g.lineTo(fx + 16 * s, y - 2 * s);
      g.lineTo(fx - 18 * s, y - 2 * s);
      g.fill();
      // drivers + coupling rod
      const wy = y - 26 * s, wr = 26 * s;
      const wx = [lx + 104 * s, lx + 164 * s];
      wx.forEach(x => wheel(x, wy, wr, wheelPhase, s));
      wheel(lx + 30 * s, y - 14 * s, 14 * s, wheelPhase * 1.8, s);
      wheel(fx - 40 * s, y - 14 * s, 14 * s, wheelPhase * 1.8, s);
      const rx = Math.cos(wheelPhase) * wr * 0.55, ry = Math.sin(wheelPhase) * wr * 0.55;
      g.strokeStyle = '#bfc6cc';
      g.lineWidth = 6 * s;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(wx[0] + rx, wy + ry); g.lineTo(wx[1] + rx, wy + ry); g.stroke();
      // piston rod toward the cylinder
      g.lineWidth = 5 * s;
      g.beginPath(); g.moveTo(wx[1] + rx, wy + ry); g.lineTo(fx - 50 * s, wy - 6 * s); g.stroke();
      g.fillStyle = '#20232a';
      g.fillRect(fx - 70 * s, wy - 20 * s, 34 * s, 24 * s);

      return { x: chx, y: by - 172 * s };
    }

    function emitPuff(x, y, s, big) {
      puffs.push({
        x, y,
        vx: (-40 - Math.random() * 30) * s * (big ? 2 : 1),
        vy: (-60 - Math.random() * 40) * s * (big ? 1.4 : 1),
        r: (10 + Math.random() * 8) * s * (big ? 1.8 : 1),
        life: 0,
        max: big ? 3 : 2.4,
      });
    }

    function steam(dt, s) {
      for (let i = puffs.length - 1; i >= 0; i--) {
        const q = puffs[i];
        q.life += dt;
        if (q.life > q.max) { puffs.splice(i, 1); continue; }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy *= 0.985;
        q.r += 22 * s * dt;
        const a = 0.85 * (1 - q.life / q.max);
        g.fillStyle = `rgba(245,245,250,${a})`;
        g.beginPath(); g.arc(q.x, q.y, q.r, 0, U.TAU); g.fill();
      }
    }

    function foreground(G, t) {
      const s = G.s, top = G.railY + 24 * s;
      tufts.forEach(f => {
        const x = f.x * G.W, y = top + 10 * s + f.y * (G.H - top - 10 * s);
        const sway = Math.sin(t * 1.8 + f.ph) * 4 * s * f.k;
        g.strokeStyle = '#2f7d36';
        g.lineWidth = 3 * s;
        g.lineCap = 'round';
        for (let k = -1; k <= 1; k++) {
          g.beginPath(); g.moveTo(x + k * 5 * s, y); g.quadraticCurveTo(x + k * 7 * s, y - 12 * s * f.k, x + k * 9 * s + sway, y - 22 * s * f.k); g.stroke();
        }
        if (f.flower) {
          g.fillStyle = `hsl(${f.hue}, 85%, 65%)`;
          g.beginPath(); g.arc(x + sway, y - 24 * s * f.k, 6 * s * f.k, 0, U.TAU); g.fill();
          g.fillStyle = '#ffe14d';
          g.beginPath(); g.arc(x + sway, y - 24 * s * f.k, 2.5 * s * f.k, 0, U.TAU); g.fill();
        }
      });
    }

    function banner(G, ft) {
      if (ft < 0) return;
      const k = U.easeOutBack(U.clamp(ft / 0.7));
      const s = G.s;
      g.save();
      g.translate(G.W * 0.42, G.H * 0.28);
      g.rotate(-0.06 + Math.sin(ft * 3) * 0.02);
      g.scale(k, k);
      g.font = `${96 * s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 14 * s;
      g.strokeStyle = '#1b1233';
      g.strokeText('ALL ABOARD!', 0, 0);
      g.fillStyle = '#ffc23d';
      g.fillText('ALL ABOARD!', 0, 0);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        // Wheels chug at a steady cartoon pace, then brake to a halt in the finale.
        const speed = ft < 0 ? 3.2 : 3.2 * Math.max(0, 1 - ft / 2.5);
        wheelPhase += speed * dt;
        const bob = Math.sin(t * 9) * 1.5 * G.s * (speed / 3.2);

        sky(G, p, ft);
        scenery(G, t);
        rails(G);
        station(G, t, ft);

        const fx = frontX(p, G);
        // draw train first into a temp pass to get chimney position for puffs
        const chimney = trainAt(G, fx, t, bob);
        people(G, t, ft);

        emitAcc += dt * (ft < 0 ? 5 : ft < 2 ? 30 : 2);
        while (emitAcc > 1) {
          emitAcc -= 1;
          emitPuff(chimney.x, chimney.y, G.s, ft >= 0 && ft < 2);
          if (ft >= 0 && ft < 2.5) emitPuff(fx - 120 * G.s, G.railY - 10 * G.s, G.s, true);
        }
        steam(dt, G.s);
        foreground(G, t);
        banner(G, ft);
      },

      finale() {
        // Steam whistle: two blasts of a minor chord with hiss.
        const chord = [370, 440, 554];
        [[0, 0.55], [0.75, 1.5]].forEach(([at, dur]) => {
          chord.forEach(f => {
            sfx.tone({ f: f * 0.97, to: f, glide: 0.08, type: 'sawtooth', at, dur, vol: 0.07, attack: 0.04, release: 0.15, filter: 'lowpass', ff: 2200, vib: { rate: 7, depth: 3 } });
            sfx.tone({ f, type: 'sine', at, dur, vol: 0.08, attack: 0.04, release: 0.15 });
          });
          sfx.noise({ at, dur, vol: 0.12, filter: 'bandpass', ff: 1800, q: 1.5, attack: 0.03 });
        });
        // Brake hiss.
        sfx.noise({ at: 2.2, dur: 1.6, vol: 0.25, filter: 'highpass', ff: 3000, attack: 0.02, release: 1.2 });
        // Station bell.
        [3.4, 3.9, 4.4].forEach(at => {
          sfx.tone({ f: 1320, at, dur: 1.4, vol: 0.18, attack: 0.002, release: 1.35 });
          sfx.tone({ f: 3520, at, dur: 0.6, vol: 0.06, attack: 0.002, release: 0.55 });
        });
      },

      destroy() {},
    };
  },
});
