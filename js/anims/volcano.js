// Cutaway volcano: magma rises through the chamber and up the vent while dinosaurs graze at the foot.
// Progress = magma level (bottom of the chamber at p=0, brim of the crater at p=1).
Minutka.register({
  id: 'volcano',
  name: 'Magma Mood',
  emoji: '🌋',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(1066);

    // Static scenery in normalized coordinates.
    const hills = Array.from({ length: 8 }, (_, i) => ({ x: i / 7 + (R() - 0.5) * 0.08, h: 0.06 + R() * 0.07, w: 0.12 + R() * 0.08 }));
    const ferns = Array.from({ length: 26 }, () => ({ x: R(), y: R(), k: 0.7 + R() * 0.7, ph: R() * U.TAU, hue: 95 + R() * 40 }));
    const pebbles = Array.from({ length: 9 }, () => ({ u: R() * 2 - 1, r: 3 + R() * 5, ph: R() * U.TAU }));
    const cracks = Array.from({ length: 7 }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      const pts = [];
      let x = 0, y = 0.35 + R() * 0.45;
      for (let k = 0; k < 4; k++) { x += 0.05 + R() * 0.06; y += (R() - 0.5) * 0.08; pts.push([x, y]); }
      return { side, y0: y, pts, ph: R() * U.TAU };
    });
    const rockShapes = Array.from({ length: 14 }, () => Array.from({ length: 7 }, () => 0.7 + R() * 0.45));

    // Particle pools (bounded).
    const smoke = [];
    const drops = [];
    const bubbles = [];
    const ash = [];
    const rocks = [];
    let smokeAcc = 0, dropAcc = 0, bubbleAcc = 0, ashAcc = 0, rockSalvo = 0;

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const GY = H * 0.78;                     // foot of the volcano
      const VH = Math.min(H * 0.6, W * 0.6);   // volcano height
      const k = VH / 430;                      // volcano detail scale
      const cx = W * 0.5;
      const FY = GY + (H - GY) * 0.62;         // where the dinos stand
      const ds = Math.max(s, 0.36) * 0.95;     // dino scale
      return {
        W, H, s, GY, VH, k, cx, FY, ds,
        baseHW: VH * 0.95, topHW: VH * 0.22, craterY: GY - VH,
        ventTop: VH * 0.062, ventBot: VH * 0.08,
        chY: GY - VH * 0.17, chRX: VH * 0.36, chRY: VH * 0.14,
      };
    }

    // Point on a flank of the cone: u=0 at the crater rim, u=1 at the foot. side = -1 left, 1 right.
    function slope(G, side, u) {
      const x0 = G.topHW, y0 = -G.VH, x1 = G.VH * 0.33, y1 = -G.VH * 0.35, x2 = G.baseHW, y2 = 0;
      const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      return [G.cx + side * (a * x0 + b * x1 + c * x2), G.GY + a * y0 + b * y1 + c * y2];
    }

    function mountainPath(G) {
      const k = G.k;
      g.beginPath();
      g.moveTo(G.cx - G.baseHW, G.GY);
      g.quadraticCurveTo(G.cx - G.VH * 0.33, G.GY - G.VH * 0.35, G.cx - G.topHW, G.craterY);
      g.quadraticCurveTo(G.cx - G.topHW * 0.7, G.craterY - 14 * k, G.cx - G.ventTop - 10 * k, G.craterY - 4 * k);
      g.lineTo(G.cx - G.ventTop, G.craterY + 4 * k);
      g.lineTo(G.cx + G.ventTop, G.craterY + 4 * k);
      g.lineTo(G.cx + G.ventTop + 10 * k, G.craterY - 4 * k);
      g.quadraticCurveTo(G.cx + G.topHW * 0.7, G.craterY - 14 * k, G.cx + G.topHW, G.craterY);
      g.quadraticCurveTo(G.cx + G.VH * 0.33, G.GY - G.VH * 0.35, G.cx + G.baseHW, G.GY);
      g.closePath();
    }

    // Chamber + vent as one clockwise path (so the union clips correctly).
    function cavityPath(G) {
      const k = G.k, top = G.craterY + 4 * k, joinY = G.chY - G.chRY * 0.7;
      g.beginPath();
      g.ellipse(G.cx, G.chY, G.chRX, G.chRY, 0, 0, U.TAU);
      g.moveTo(G.cx - G.ventBot, joinY + 10 * k);
      g.quadraticCurveTo(G.cx - G.ventBot * 1.5, (joinY + top) / 2, G.cx - G.ventTop, top);
      g.lineTo(G.cx + G.ventTop, top);
      g.quadraticCurveTo(G.cx + G.ventBot * 0.6, (joinY + top) / 2, G.cx + G.ventBot, joinY + 10 * k);
      g.closePath();
    }

    function levelY(G, p) {
      return U.lerp(G.chY + G.chRY, G.craterY + 4 * G.k, p);
    }

    // ------------------------------------------------------------ drawing
    function sky(G, p, eT) {
      const d = U.clamp(p * 0.6 + (eT > 0 ? eT * 0.25 : 0));
      const grd = g.createLinearGradient(0, 0, 0, G.GY);
      grd.addColorStop(0, `hsl(${18 - d * 12}, ${80 - d * 30}%, ${70 - d * 45}%)`);
      grd.addColorStop(1, `hsl(${38 - d * 20}, 95%, ${82 - d * 30}%)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.H);
      // big lazy sun
      g.fillStyle = `rgba(255, 245, 190, ${0.9 - d * 0.6})`;
      g.beginPath(); g.arc(G.W * 0.16, G.H * 0.2, 46 * G.s, 0, U.TAU); g.fill();
    }

    function backHills(G) {
      g.fillStyle = '#4f7a3a';
      hills.forEach(h => {
        g.beginPath();
        g.ellipse(h.x * G.W, G.GY, h.w * G.W + 40, h.h * G.H, 0, Math.PI, 0);
        g.fill();
      });
      const grd = g.createLinearGradient(0, G.GY, 0, G.H);
      grd.addColorStop(0, '#b98a4a');
      grd.addColorStop(1, '#d9ac62');
      g.fillStyle = grd;
      g.fillRect(-60, G.GY - 4 * G.s, G.W + 120, G.H - G.GY + 60); // overscan for the screen shake
    }

    function palm(x, y, h, s, t, lean) {
      const sway = Math.sin(t * 1.3 + x) * 0.05;
      const tx = x + (lean + sway) * h, ty = y - h;
      g.strokeStyle = '#8a5a32';
      g.lineWidth = 12 * s;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * h * 0.2, y - h * 0.6, tx, ty); g.stroke();
      g.strokeStyle = '#2f8a3e';
      g.lineWidth = 9 * s;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin(t * 1.7 + i) * 0.05;
        const L = 70 * s;
        g.beginPath();
        g.moveTo(tx, ty);
        g.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.6 - 18 * s, tx + Math.cos(a) * L, ty + Math.sin(a) * L + 22 * s);
        g.stroke();
      }
    }

    function smokePlume(G, dt, p, t, finale) {
      smokeAcc += dt * (finale ? 0 : 1.5 + p * 7);
      while (smokeAcc > 1 && smoke.length < 70) {
        smokeAcc -= 1;
        smoke.push({
          x: G.cx + (Math.random() - 0.5) * G.ventTop * 2, y: G.craterY,
          vx: (10 + Math.random() * 25) * G.k, vy: -(40 + Math.random() * 30 + p * 60) * G.k,
          r: (8 + p * 26 + Math.random() * 6) * G.k, life: 0, max: 4 + p * 3, sh: 0.5 + Math.random() * 0.25,
        });
      }
      if (smokeAcc > 1) smokeAcc = 1;
      for (let i = smoke.length - 1; i >= 0; i--) {
        const q = smoke[i];
        q.life += dt;
        if (q.life > q.max) { smoke.splice(i, 1); continue; }
        q.x += (q.vx + Math.sin(t + q.life) * 8 * G.k) * dt;
        q.y += q.vy * dt;
        q.r += (10 + p * 30) * G.k * dt;
        const a = 0.75 * Math.min(1, q.life * 3) * (1 - q.life / q.max);
        const l = Math.round(q.sh * 100);
        g.fillStyle = `rgba(${l + 40}, ${l + 30}, ${l + 30}, ${a})`;
        g.beginPath(); g.arc(q.x, q.y, q.r, 0, U.TAU); g.fill();
      }
    }

    function mountain(G, p, t) {
      const k = G.k;
      // rock body with strata
      g.save();
      mountainPath(G);
      g.fillStyle = '#7d4e33';
      g.fill();
      g.clip();
      const bands = ['#8d5a3b', '#734530', '#9a6844', '#6a3f2c', '#84553a'];
      for (let i = 8; i >= 0; i--) {
        const y = G.GY - G.VH * (i / 8.5);
        g.fillStyle = bands[i % bands.length];
        g.beginPath();
        g.moveTo(G.cx - G.baseHW, y);
        for (let x = -G.baseHW; x <= G.baseHW; x += 30 * k) g.lineTo(G.cx + x, y - 18 * k - Math.sin(x / (60 * k) + i) * 7 * k);
        g.lineTo(G.cx + G.baseHW, G.GY + 10);
        g.lineTo(G.cx - G.baseHW, G.GY + 10);
        g.fill();
      }
      // heat glow from inside, stronger as magma rises
      const ly = levelY(G, p);
      const glow = g.createRadialGradient(G.cx, ly, 10 * k, G.cx, ly, G.VH * (0.35 + p * 0.3));
      glow.addColorStop(0, `rgba(255, 120, 30, ${0.25 + p * 0.45})`);
      glow.addColorStop(1, 'rgba(255, 80, 20, 0)');
      g.fillStyle = glow;
      g.fillRect(G.cx - G.baseHW, G.craterY - 20 * k, G.baseHW * 2, G.VH + 30 * k);
      g.restore();
      // grassy foot + outline
      g.lineWidth = 6 * k;
      g.strokeStyle = '#3b2216';
      g.lineJoin = 'round';
      mountainPath(G);
      g.stroke();
    }

    function glowCracks(G, p, t) {
      const a = U.range(p, 0.55, 0.95);
      if (a <= 0) return;
      const k = G.k;
      g.save();
      mountainPath(G);
      g.clip();
      g.lineCap = 'round';
      g.lineJoin = 'miter';
      cracks.forEach(c => {
        const pulse = 0.6 + 0.4 * Math.sin(t * 5 + c.ph);
        const y0 = G.GY - G.VH * c.y0;
        const sx = G.cx + c.side * (G.ventBot + 2 * k);
        g.strokeStyle = `rgba(255, ${150 + 80 * pulse}, 40, ${a * pulse})`;
        g.lineWidth = (3 + 3 * a) * k;
        g.beginPath();
        g.moveTo(sx, y0);
        c.pts.forEach(([x, y]) => g.lineTo(sx + c.side * x * G.VH * a * 1.6, G.GY - G.VH * y));
        g.stroke();
      });
      g.restore();
    }

    function magma(G, p, t, dt) {
      const k = G.k, ly = levelY(G, p);
      g.save();
      cavityPath(G);
      g.fillStyle = '#2a120c';
      g.fill();
      g.clip();
      // lava body
      const grd = g.createLinearGradient(0, ly, 0, G.chY + G.chRY);
      grd.addColorStop(0, '#ffe066');
      grd.addColorStop(0.08, '#ff9a1f');
      grd.addColorStop(1, '#c42a10');
      g.fillStyle = grd;
      g.beginPath();
      const x0 = G.cx - G.chRX - 10, x1 = G.cx + G.chRX + 10;
      g.moveTo(x0, G.chY + G.chRY + 10);
      for (let x = x0; x <= x1; x += 8 * k) g.lineTo(x, ly + Math.sin(x / (14 * k) + t * 4) * 3 * k + Math.sin(x / (31 * k) - t * 2.3) * 3 * k);
      g.lineTo(x1, G.chY + G.chRY + 10);
      g.fill();
      // bubbles rise and pop at the surface
      bubbleAcc += dt * (4 + p * 8);
      while (bubbleAcc > 1 && bubbles.length < 30) {
        bubbleAcc -= 1;
        const inVent = ly < G.chY - G.chRY * 0.6;
        const span = inVent ? G.ventTop * 0.8 : G.chRX * 0.8;
        bubbles.push({ x: G.cx + (Math.random() * 2 - 1) * span, y: G.chY + G.chRY * 0.8, r: (3 + Math.random() * 6) * k, v: (25 + Math.random() * 40) * k, pop: -1 });
      }
      if (bubbleAcc > 1) bubbleAcc = 1;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (b.pop < 0) {
          b.y = Math.min(b.y, G.chY + G.chRY) - b.v * dt;
          if (b.y < ly + b.r) b.pop = 0;
          g.strokeStyle = 'rgba(255, 240, 150, 0.9)';
          g.lineWidth = 2 * k;
          g.beginPath(); g.arc(b.x, Math.max(b.y, ly + b.r), b.r, 0, U.TAU); g.stroke();
        } else {
          b.pop += dt;
          if (b.pop > 0.35) { bubbles.splice(i, 1); continue; }
          const q = b.pop / 0.35;
          g.fillStyle = `rgba(255, 220, 90, ${1 - q})`;
          for (let j = -1; j <= 1; j++) {
            g.beginPath(); g.arc(b.x + j * b.r * (0.5 + q * 1.5), ly - q * 14 * k * (1 - Math.abs(j) * 0.4) - 2 * k, b.r * 0.4, 0, U.TAU); g.fill();
          }
        }
      }
      g.restore();
      // rim of the cavity
      g.strokeStyle = 'rgba(30, 10, 5, 0.8)';
      g.lineWidth = 4 * k;
      cavityPath(G);
      g.stroke();
      // overflow dribbles at the very end
      const over = U.range(p, 0.96, 1);
      if (over > 0) {
        g.strokeStyle = '#ff8a1f';
        g.lineCap = 'round';
        g.lineWidth = 8 * k;
        [-1, 1].forEach(side => {
          g.beginPath();
          for (let u = 0; u <= over * 0.12; u += 0.01) {
            const [x, y] = slope(G, side, u);
            if (u === 0) g.moveTo(x - side * 2 * k, y); else g.lineTo(x - side * 5 * k, y);
          }
          g.stroke();
        });
      }
    }

    function face(G, p, t, ft, eT) {
      const k = G.k, ey = G.GY - G.VH * 0.53, er = G.VH * 0.058;
      const mood = U.range(p, 0.25, 0.95); // 0 snoozy .. 1 furious
      [-1, 1].forEach(side => {
        const ex = G.cx + side * G.VH * 0.17;
        const jitter = ft >= 0 ? 0 : mood * mood * Math.sin(t * 40 + side) * 1.5 * k;
        if (eT > 0 && eT < 4.5) {
          // squeezed shut: > <
          g.strokeStyle = '#1b0d08';
          g.lineWidth = 6 * k;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(ex - side * er, ey - er * 0.7); g.lineTo(ex + side * er * 0.6, ey); g.lineTo(ex - side * er, ey + er * 0.7);
          g.stroke();
          return;
        }
        if (eT >= 4.5) {
          // relieved ^ ^ with blush
          g.strokeStyle = '#1b0d08';
          g.lineWidth = 6 * k;
          g.beginPath(); g.arc(ex, ey + er * 0.3, er * 0.8, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
          g.fillStyle = 'rgba(255, 120, 120, 0.6)';
          g.beginPath(); g.ellipse(ex + side * er * 0.4, ey + er * 1.3, er * 0.7, er * 0.35, 0, 0, U.TAU); g.fill();
          return;
        }
        const big = ft >= 0 ? 1.35 : 1 + U.range(p, 0.85, 1) * 0.25;
        g.fillStyle = '#fff8ec';
        g.strokeStyle = '#1b0d08';
        g.lineWidth = 4 * k;
        g.beginPath(); g.arc(ex + jitter, ey, er * big, 0, U.TAU); g.fill(); g.stroke();
        // pupil looks around lazily, then glares straight ahead
        const look = mood > 0.6 ? 0 : Math.sin(t * 0.7) * er * 0.35;
        const pr = er * (0.42 - mood * 0.12) * (ft >= 0 ? 0.6 : 1);
        g.fillStyle = mood > 0.75 ? '#7a0f0f' : '#1b0d08';
        g.beginPath(); g.arc(ex + jitter + look, ey + er * 0.1, pr, 0, U.TAU); g.fill();
        // eyelid: droopy and sleepy at the start, gone when angry
        const blink = (t % 4.3) < 0.15 ? 1 : 0;
        const lid = Math.max(blink, U.lerp(0.55, 0, U.range(p, 0, 0.45)) + Math.sin(t * 0.9) * 0.05 * (1 - mood));
        if (lid > 0.02) {
          g.save();
          g.beginPath(); g.arc(ex + jitter, ey, er * big + 1, 0, U.TAU); g.clip();
          g.fillStyle = '#9a6844';
          g.fillRect(ex - er * 2, ey - er * big - 2, er * 4, er * big * 2 * lid + 2);
          g.restore();
          g.beginPath(); g.arc(ex + jitter, ey, er * big, 0, U.TAU); g.stroke();
        }
        // eyebrows tilt from relaxed to furious
        const tilt = U.lerp(-0.15, 0.55, mood) * side;
        g.save();
        g.translate(ex + jitter, ey - er * (big + 0.45 + (ft >= 0 ? 0.4 : 0)));
        g.rotate(ft >= 0 ? -side * 0.3 : tilt);
        g.fillStyle = '#2a140c';
        g.fillRect(-er * 1.1, -er * 0.18, er * 2.2, er * 0.36);
        g.restore();
      });
      // sweat drops slide down the cone when it gets serious
      const sweat = U.range(p, 0.8, 1);
      if (sweat > 0 && ft < 0) {
        g.fillStyle = 'rgba(140, 210, 255, 0.95)';
        [-1, 1].forEach(side => {
          const q = ((t * 0.6 + (side > 0 ? 0.5 : 0)) % 1);
          const x = G.cx + side * G.VH * 0.3, y = ey - er + q * G.VH * 0.25;
          g.beginPath();
          g.moveTo(x, y - 10 * k);
          g.quadraticCurveTo(x + 7 * k, y + 2 * k, x, y + 6 * k);
          g.quadraticCurveTo(x - 7 * k, y + 2 * k, x, y - 10 * k);
          g.fill();
        });
      }
    }

    // Zzz drifting off the dozing volcano early in the talk.
    function snores(G, p, t, ft) {
      const a = 1 - U.range(p, 0.2, 0.35);
      if (a <= 0 || ft >= 0) return;
      const k = G.k;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 5 * k;
      g.strokeStyle = INK;
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.35 + i / 3) % 1;
        const x = G.cx + G.VH * (0.3 + q * 0.3) + Math.sin(q * 9) * 8 * k;
        const y = G.GY - G.VH * (0.62 + q * 0.4);
        g.globalAlpha = a * Math.min(1, q * 5) * (1 - q);
        g.font = `${(34 + q * 40) * k}px Bungee, sans-serif`;
        g.fillStyle = '#fff8ec';
        g.strokeText('Z', x, y);
        g.fillText('Z', x, y);
      }
      g.globalAlpha = 1;
    }

    function pebblesHop(G, p, t) {
      const hop = U.range(p, 0.7, 1);
      g.fillStyle = '#5a3a28';
      pebbles.forEach(b => {
        const x = G.cx + b.u * G.baseHW * 1.15;
        const y = G.GY + 6 * G.s - Math.abs(Math.sin(t * 11 + b.ph)) * hop * 10 * G.s;
        g.beginPath(); g.ellipse(x, y, b.r * G.s, b.r * 0.7 * G.s, 0, 0, U.TAU); g.fill();
      });
    }

    function eye(x, y, r, lx, ly, fear) {
      g.fillStyle = '#fff';
      g.strokeStyle = '#1b1233';
      g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, r * (1 + fear * 0.4), 0, U.TAU); g.fill(); g.stroke();
      g.fillStyle = '#111';
      g.beginPath(); g.arc(x + lx * r * 0.45, y + ly * r * 0.45, r * (0.5 - fear * 0.15), 0, U.TAU); g.fill();
    }

    const INK = '#1b1233';

    // A limb or neck: thick ink stroke with a colored stroke on top.
    function limb(col, w, draw) {
      g.strokeStyle = INK;
      g.lineWidth = w + 8;
      g.beginPath(); draw(); g.stroke();
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath(); draw(); g.stroke();
    }

    function inked(col, draw) {
      g.fillStyle = col;
      g.strokeStyle = INK;
      g.lineWidth = 4;
      g.beginPath(); draw(); g.fill(); g.stroke();
    }

    // Long-neck dino. Local frame faces right, origin between the feet.
    // P = { lift 0 grazing..1 head up, run phase (-1 = standing), fear, mouth, look:[x,y], hop }
    function bronto(x, y, sc, dir, P, t) {
      g.save();
      g.translate(x, y - (P.hop || 0) * sc);
      g.scale(sc * dir, sc);
      const running = P.run >= 0;
      const bob = running ? -Math.abs(Math.sin(P.run * 2)) * 10 : Math.sin(t * 2.2) * 1.5;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      [[-42, 0], [-22, Math.PI], [28, Math.PI], [48, 0]].forEach(([lx, ph], i) => {
        const sw = running ? Math.sin(P.run * 2 + ph) * 18 : 0;
        const lift = running ? Math.max(0, Math.sin(P.run * 2 + ph)) * 10 : 0;
        limb(i % 2 ? '#4f9a55' : '#5aae60', 18, () => { g.moveTo(lx, -40 + bob); g.lineTo(lx + sw, -6 - lift); });
      });
      const tw = Math.sin(t * (running ? 14 : 1.8)) * (running ? 18 : 8);
      inked('#5aae60', () => {
        g.moveTo(-55, -74 + bob);
        g.quadraticCurveTo(-120, -62 + bob, -168, -26 + tw);
        g.quadraticCurveTo(-110, -38 + bob, -55, -38 + bob);
      });
      // neck: grazing low <-> lifted high
      const chew = P.lift < 0.5 ? Math.sin(t * 7) * 3 : 0;
      const graze = Math.sin(t * 0.6) > -0.3 ? 1 : 0.5; // now and then it lifts its head to chew
      const hx = U.lerp(140, 98, P.lift), hy = U.lerp(-14 - (1 - graze) * 70, -182, P.lift) + chew + bob;
      const neck = () => { g.moveTo(50, -78 + bob); g.quadraticCurveTo(U.lerp(120, 75, P.lift), U.lerp(-100, -140, P.lift) + bob, hx, hy); };
      g.strokeStyle = INK; g.lineWidth = 34; g.beginPath(); neck(); g.stroke();
      inked('#6cc070', () => g.ellipse(0, -60 + bob, 78, 40, 0, 0, U.TAU));
      g.fillStyle = '#b9e48a';
      g.beginPath(); g.ellipse(5, -36 + bob, 55, 12, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#4f9a55';
      [[-30, -82], [0, -90], [30, -82], [-12, -70], [18, -68]].forEach(([sx, sy]) => {
        g.beginPath(); g.arc(sx, sy + bob, 7, 0, U.TAU); g.fill();
      });
      g.strokeStyle = '#6cc070'; g.lineWidth = 26; g.beginPath(); neck(); g.stroke();
      g.save();
      g.translate(hx, hy);
      g.rotate(U.lerp(0.5, -0.25, P.lift));
      inked('#6cc070', () => g.ellipse(14, 0, 28, 17, 0, 0, U.TAU));
      if (P.mouth > 0) {
        inked('#7a1f2a', () => g.ellipse(32, 8, 11, 10 * P.mouth, 0, 0, U.TAU));
      } else {
        g.strokeStyle = INK;
        g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(22, 7); g.lineTo(40, 5); g.stroke();
      }
      eye(14, -6, 7, P.look[0] * dir, P.look[1], P.fear);
      g.restore();
      g.restore();
      return { x: x + dir * hx * sc, y: y + hy * sc - (P.hop || 0) * sc };
    }

    // Triceratops. Same conventions as bronto().
    function trike(x, y, sc, dir, P, t) {
      g.save();
      g.translate(x, y - (P.hop || 0) * sc);
      g.scale(sc * dir, sc);
      const running = P.run >= 0;
      const bob = running ? -Math.abs(Math.sin(P.run * 2.4)) * 9 : Math.sin(t * 2.5 + 1) * 1.2;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      [[-40, 0], [-22, Math.PI], [22, Math.PI], [40, 0]].forEach(([lx, ph], i) => {
        const sw = running ? Math.sin(P.run * 2.4 + ph) * 16 : 0;
        limb(i % 2 ? '#3f6fb8' : '#4a80cc', 20, () => { g.moveTo(lx, -36 + bob); g.lineTo(lx + sw, -8); });
      });
      inked('#4a80cc', () => { g.moveTo(-58, -66 + bob); g.lineTo(-122, -30 + Math.sin(t * 3) * 4); g.lineTo(-58, -32 + bob); });
      inked('#5b93e0', () => g.ellipse(0, -52 + bob, 68, 36, 0, 0, U.TAU));
      g.fillStyle = '#a9cdf7';
      g.beginPath(); g.ellipse(6, -30 + bob, 46, 10, 0, 0, U.TAU); g.fill();
      // head dips to graze, lifts when scared
      const dip = P.lift > 0.5 ? -10 * P.lift : (Math.sin(t * 0.8 + 2) > 0 ? 1 : 0.2) * 22 + Math.sin(t * 7) * 2;
      const hx = 76, hy = -46 + dip + bob;
      g.save();
      g.translate(hx, hy);
      g.rotate(P.lift > 0.5 ? -0.3 * P.lift : dip * 0.012);
      inked('#ffcf3a', () => g.arc(-12, -14, 40, 0, U.TAU));
      g.fillStyle = '#f29a2e';
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.95 + i * 0.5;
        g.beginPath(); g.arc(-12 + Math.cos(a) * 32, -14 + Math.sin(a) * 32, 5, 0, U.TAU); g.fill();
      }
      inked('#5b93e0', () => g.ellipse(10, 0, 32, 21, 0, 0, U.TAU));
      inked('#fff3d6', () => { g.moveTo(2, -16); g.lineTo(48, -44); g.lineTo(12, -8); g.closePath(); });
      inked('#fff3d6', () => { g.moveTo(-6, -18); g.lineTo(30, -52); g.lineTo(4, -10); g.closePath(); });
      inked('#fff3d6', () => { g.moveTo(30, -6); g.lineTo(46, -22); g.lineTo(40, -2); g.closePath(); });
      inked('#3a4f7a', () => { g.moveTo(34, 0); g.lineTo(52, 8); g.lineTo(30, 17); g.closePath(); });
      if (P.mouth > 0) inked('#7a1f2a', () => g.ellipse(28, 16, 10, 9 * P.mouth, 0, 0, U.TAU));
      eye(12, -6, 7, P.look[0] * dir, P.look[1], P.fear);
      g.restore();
      g.restore();
      return { x: x + dir * hx * sc, y: y + hy * sc - (P.hop || 0) * sc };
    }

    function ptero(G, t, ft) {
      const sc = G.ds * 1.25;
      // in the finale it flees up and away from wherever it was, flapping like mad
      const t0 = ft < 0 ? t : t - ft, run = Math.max(0, ft);
      const x = U.lerp(-0.15, 1.15, (t0 / 17 + 0.3) % 1) * G.W + run * run * 160 * G.s;
      const y = G.H * 0.17 + Math.sin(t0 * 1.4) * 14 * G.s - run * 90 * G.s;
      if (x > G.W + 100 || y < -100) return;
      const flap = Math.sin(t * (ft >= 0 ? 22 : 6));
      g.save();
      g.translate(x, y);
      g.scale(sc, sc);
      g.fillStyle = '#7d4fa6';
      // far wing
      g.beginPath(); g.moveTo(-6, -2); g.lineTo(-30, -70 * flap); g.lineTo(14, -2); g.fill();
      g.fillStyle = '#9a6bc4';
      g.beginPath(); g.ellipse(0, 0, 26, 9, 0, 0, U.TAU); g.fill();
      g.beginPath(); g.moveTo(20, -6); g.lineTo(58, 2); g.lineTo(20, 6); g.fill();
      g.beginPath(); g.moveTo(14, -6); g.lineTo(-10, -20); g.lineTo(22, -2); g.fill();
      // near wing
      g.fillStyle = '#b48ad8';
      g.beginPath(); g.moveTo(-10, 0); g.lineTo(-26, -80 * flap + 8); g.lineTo(16, 0); g.fill();
      eye(22, -2, 4, 1, ft >= 0 ? -1 : 0, ft >= 0 ? 1 : 0);
      g.restore();
    }

    function bubble(x, y, text, s, wob) {
      g.save();
      g.font = `${30 * s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const w = g.measureText(text).width + 26 * s;
      // keep the shout on screen while its owner runs off
      g.translate(U.clamp(x, w / 2 + 8, cv.w - w / 2 - 8), Math.max(y, 30 * s));
      g.rotate(wob);
      g.fillStyle = '#fff';
      g.strokeStyle = '#1b1233';
      g.lineWidth = 4 * s;
      g.beginPath(); g.roundRect(-w / 2, -24 * s, w, 48 * s, 18 * s); g.fill(); g.stroke();
      g.fillStyle = '#e8322a';
      g.fillText(text, 0, 2 * s);
      g.restore();
    }

    function nervousMarks(x, y, s, t, k) {
      g.font = `${34 * s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 5 * s;
      g.strokeStyle = '#1b1233';
      g.fillStyle = '#ffd23a';
      const j = Math.sin(t * 18) * 3 * s * k;
      g.strokeText('!', x + j, y);
      g.fillText('!', x + j, y);
      // sweat drop
      g.fillStyle = 'rgba(140, 210, 255, 0.95)';
      const q = (t * 1.3) % 1;
      g.beginPath(); g.arc(x + 22 * s, y + 20 * s + q * 16 * s, 5 * s * k, 0, U.TAU); g.fill();
    }

    function dinos(G, p, t, ft, eT) {
      const s = G.ds;
      const fear = U.range(p, 0.8, 0.94);
      const look = [0.6, -0.8];
      // at the boom they leap with fright, then turn tail and run
      const hop = eT > 0 && eT < 0.7 ? Math.sin((eT / 0.7) * Math.PI) * 70 : 0;
      const run = eT > 0.7 ? eT - 0.7 : -1;
      const away = r => (r < 0 ? 0 : r * r * 140 + r * 110) * G.s;
      const runPose = { lift: 1, run: run * 9, fear: 1, mouth: 1, look: [-1, -0.2], hop: Math.abs(Math.sin(run * 9)) * 6 };
      const calm = (lift, lk) => (eT > 0 ? { lift: 1, run: -1, fear: 1, mouth: 1, look: [0.5, -1], hop } : { lift, run: -1, fear: lift, mouth: 0, look: lk });

      // big long-neck on the left, baby following
      const bx = G.W * 0.2 - away(run);
      const babyX = G.W * 0.2 + 150 * s - away(Math.max(-1, run - 0.1)) * 1.1;
      let head;
      if (run < 0) {
        head = bronto(bx, G.FY, s, 1, calm(fear, fear > 0 ? look : [1, 0.3]), t);
        bronto(babyX, G.FY + 10 * s, s * 0.48, 1, calm(fear, fear > 0 ? look : [1, 0.3]), t + 1.3);
        if (fear > 0.3) nervousMarks(head.x, head.y - 60 * s, s, t, 1);
      } else {
        head = bronto(bx, G.FY, s, -1, runPose, t);
        const baby = bronto(babyX, G.FY + 10 * s, s * 0.48, -1, runPose, t);
        if (run < 1.9) {
          bubble(head.x + 10 * s, head.y - 50 * s, 'AAAAH!', s * 1.2, Math.sin(t * 20) * 0.08);
          bubble(baby.x + 30 * s, baby.y - 50 * s, 'EEK!', s, Math.sin(t * 25 + 1) * 0.1);
        }
      }

      // triceratops on the right
      const tx = G.W * 0.84 + away(run) * 0.9;
      if (run < 0) {
        const th = trike(tx, G.FY + 4 * s, s, -1, calm(fear, fear > 0 ? [-0.6, -0.8] : [-1, 0.3]), t);
        if (fear > 0.3) nervousMarks(th.x, th.y - 70 * s, s, t + 0.4, 1);
      } else {
        const th = trike(tx, G.FY + 4 * s, s, 1, Object.assign({}, runPose, { look: [1, -0.2] }), t);
        if (run < 1.9) bubble(th.x, th.y - 70 * s, 'RUUUN!', s * 1.1, Math.sin(t * 22 + 2) * 0.08);
      }

      // the baby comes back with a marshmallow on a stick
      if (ft > 6) {
        const q = U.easeOut(U.range(ft, 6, 7.6));
        const poolX = Math.max(G.cx - G.baseHW * 0.98, 20 * G.s);
        const bbx = U.lerp(-80 * s, poolX - 120 * s, q);
        const h = bronto(bbx, G.FY + 10 * s, s * 0.6, 1, { lift: 0.55, run: q < 1 ? ft * 9 : -1, fear: 0, mouth: 0, look: [1, 0.4] }, t);
        const ex = h.x + 70 * s, ey = G.GY + 18 * s;
        g.strokeStyle = '#8a5a32';
        g.lineWidth = 4 * s;
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(h.x + 8 * s, h.y + 4 * s); g.lineTo(ex, ey); g.stroke();
        const roast = U.range(ft, 7.6, 9.4);
        g.fillStyle = roast < 0.5 ? `hsl(40, 90%, ${96 - roast * 70}%)` : `hsl(25, 60%, ${61 - (roast - 0.5) * 110}%)`;
        g.beginPath(); g.roundRect(ex - 8 * s, ey - 7 * s, 16 * s, 14 * s, 4 * s); g.fill();
        if (roast > 0.8) {
          const f = Math.sin(t * 30) * 2 * s;
          g.fillStyle = '#ffb02e';
          g.beginPath(); g.moveTo(ex - 7 * s, ey - 6 * s); g.quadraticCurveTo(ex + f, ey - 30 * s, ex + 7 * s, ey - 6 * s); g.fill();
        }
      }
    }

    function foreground(G, t) {
      const s = G.s, top = G.GY + 10 * s;
      ferns.forEach(f => {
        const x = f.x * G.W, y = top + 30 * s + f.y * (G.H - top - 30 * s);
        const sway = Math.sin(t * 1.6 + f.ph) * 5 * s * f.k;
        g.strokeStyle = `hsl(${f.hue}, 55%, 30%)`;
        g.lineWidth = 4 * s;
        g.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
          g.beginPath();
          g.moveTo(x, y);
          g.quadraticCurveTo(x + i * 8 * s, y - 16 * s * f.k, x + i * 16 * s + sway, y - (20 - Math.abs(i) * 4) * s * f.k);
          g.stroke();
        }
      });
    }

    // ------------------------------------------------------------ eruption
    function eruptionIntensity(eT) {
      if (eT < 0) return 0;
      return Math.min(1, eT * 6) * (eT < 3 ? 1 : Math.max(0.2, 1 - (eT - 3) / 5));
    }

    function fountain(G, eT, t, dt) {
      const I = eruptionIntensity(eT), k = G.k;
      // droplets
      dropAcc += dt * 160 * I;
      while (dropAcc > 1 && drops.length < 320) {
        dropAcc -= 1;
        const sp = 0.6 + Math.random() * 0.6;
        drops.push({
          x: G.cx + (Math.random() - 0.5) * G.ventTop * 1.6, y: G.craterY,
          vx: (Math.random() - 0.5) * 520 * k, vy: -(450 + Math.random() * 650) * k * sp * (0.5 + I * 0.5),
          r: (4 + Math.random() * 9) * k, life: 0,
        });
      }
      if (dropAcc > 1) dropAcc = 1;
      if (I > 0) {
        const colH = G.VH * (0.25 + 0.75 * I) * (0.9 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.05);
        const grd = g.createLinearGradient(0, G.craterY, 0, G.craterY - colH);
        grd.addColorStop(0, '#ff7a1a');
        grd.addColorStop(0.5, '#ffd23a');
        grd.addColorStop(1, '#fff3a0');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(G.cx - G.ventTop, G.craterY + 4 * k);
        for (let i = 0; i <= 10; i++) {
          const q = i / 10;
          g.lineTo(G.cx - G.ventTop * (1 - q * 0.4) - Math.sin(t * 17 + i) * 6 * k, G.craterY - colH * q);
        }
        g.arc(G.cx, G.craterY - colH, G.ventTop * 0.9, Math.PI, 0);
        for (let i = 10; i >= 0; i--) {
          const q = i / 10;
          g.lineTo(G.cx + G.ventTop * (1 - q * 0.4) + Math.sin(t * 15 + i * 1.7) * 6 * k, G.craterY - colH * q);
        }
        g.fill();
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.life += dt;
        d.vy += 900 * k * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.life > 4 || d.y > G.H + 20) { drops.splice(i, 1); continue; }
        const c = Math.min(1, d.life / 2.5);
        g.fillStyle = `hsl(${50 - c * 40}, 100%, ${70 - c * 30}%)`;
        g.beginPath(); g.arc(d.x, d.y, d.r * (1 - c * 0.4), 0, U.TAU); g.fill();
      }
    }

    function launchRocks(G, n) {
      for (let i = 0; i < n && rocks.length < 24; i++) {
        rocks.push({
          x: G.cx, y: G.craterY, vx: (Math.random() - 0.5) * 1100 * G.k, vy: -(650 + Math.random() * 600) * G.k,
          r: (12 + Math.random() * 14) * G.k, a: 0, va: (Math.random() - 0.5) * 12, shape: rockShapes[rocks.length % rockShapes.length], life: 0,
        });
      }
    }

    function flyingRocks(G, dt) {
      g.lineCap = 'round';
      for (let i = rocks.length - 1; i >= 0; i--) {
        const r = rocks[i];
        r.life += dt;
        r.vy += 700 * G.k * dt;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.a += r.va * dt;
        if (r.y > G.H + 60 || r.life > 6) { rocks.splice(i, 1); continue; }
        // fiery trail
        g.strokeStyle = 'rgba(255, 140, 40, 0.55)';
        g.lineWidth = r.r * 1.1;
        g.beginPath(); g.moveTo(r.x, r.y); g.lineTo(r.x - r.vx * 0.08, r.y - r.vy * 0.08); g.stroke();
        g.save();
        g.translate(r.x, r.y);
        g.rotate(r.a);
        g.fillStyle = '#3a2620';
        g.beginPath();
        r.shape.forEach((m, j) => {
          const a = (j / r.shape.length) * U.TAU;
          g.lineTo(Math.cos(a) * r.r * m, Math.sin(a) * r.r * m);
        });
        g.fill();
        g.fillStyle = '#ff9a1f';
        g.beginPath(); g.arc(0, 0, r.r * 0.35, 0, U.TAU); g.fill();
        g.restore();
      }
    }

    function lavaFlows(G, eT, t) {
      const L = U.easeOut(U.range(eT, 0.3, 4));
      if (L <= 0) return;
      const k = G.k;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      [[-1, '#e8471a', 26], [-1, '#ffb42e', 11], [1, '#e8471a', 26], [1, '#ffb42e', 11]].forEach(([side, col, w]) => {
        g.strokeStyle = col;
        g.lineWidth = w * k;
        g.beginPath();
        for (let u = 0; u <= L + 1e-6; u += 0.025) {
          const [x, y] = slope(G, side, u);
          const wig = Math.sin(u * 23 + side) * 6 * k;
          const px = x - side * (8 * k + wig), py = y + 3 * k;
          if (u === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();
      });
      // pools spreading at the foot
      const pool = U.range(eT, 3.2, 6);
      if (pool > 0) {
        [-1, 1].forEach(side => {
          const [x, y] = slope(G, side, 1);
          const pr = (20 + pool * 70) * k;
          g.fillStyle = '#e8471a';
          g.beginPath(); g.ellipse(x - side * 6 * k, y + 6 * k, pr, pr * 0.22, 0, 0, U.TAU); g.fill();
          g.fillStyle = `rgba(255, 190, 50, ${0.6 + 0.3 * Math.sin(t * 4 + side)})`;
          g.beginPath(); g.ellipse(x - side * 6 * k, y + 5 * k, pr * 0.6, pr * 0.1, 0, 0, U.TAU); g.fill();
        });
      }
    }

    function ashCloud(G, eT, dt) {
      const k = G.k;
      ashAcc += dt * (eT > 0 && eT < 4 ? 14 : 0);
      while (ashAcc > 1 && ash.length < 60) {
        ashAcc -= 1;
        ash.push({
          x: G.cx + (Math.random() - 0.5) * 30 * k, y: G.craterY - 20 * k,
          vx: (Math.random() - 0.5) * 380 * k, vy: -(260 + Math.random() * 260) * k,
          r: (30 + Math.random() * 25) * k, sh: Math.random(),
        });
      }
      if (ashAcc > 1) ashAcc = 1;
      ash.forEach(a => {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.vx *= 1 - 0.6 * dt;
        a.vy *= 1 - 0.9 * dt;
        if (a.y < G.H * 0.06) a.vy = Math.max(a.vy, 0), a.vx *= 1 + 0.5 * dt;
        a.r = Math.min(a.r + 40 * k * dt, 150 * k);
      });
      ash.forEach(a => {
        g.fillStyle = 'rgba(255, 110, 40, 0.5)';
        g.beginPath(); g.arc(a.x, a.y + a.r * 0.25, a.r, 0, U.TAU); g.fill();
      });
      ash.forEach(a => {
        const l = 38 + a.sh * 22;
        g.fillStyle = `rgb(${l + 8}, ${l}, ${l})`;
        g.beginPath(); g.arc(a.x, a.y, a.r, 0, U.TAU); g.fill();
      });
    }

    function banner(G, eT) {
      if (eT < 0 || eT > 7) return;
      const k = U.easeOutBack(U.clamp(eT / 0.5));
      const fade = 1 - U.range(eT, 6, 7);
      const s = G.s;
      g.save();
      g.globalAlpha = fade;
      g.translate(G.W * 0.5, G.H * 0.5);
      g.rotate(-0.08 + Math.sin(eT * 9) * 0.03 * (1 - U.range(eT, 0, 2)));
      g.scale(k, k);
      g.font = `${Math.min(120 * s, G.W * 0.15)}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 16 * s;
      g.strokeStyle = '#1b0d08';
      g.strokeText('KABOOM!', 0, 0);
      g.fillStyle = '#ffd23a';
      g.fillText('KABOOM!', 0, 0);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        const finale = ft >= 0;
        const eT = finale ? ft - 0.35 : -1; // the boom lands 0.35 s into the finale

        // ground tremble: grows near the end, huge at the boom, then settles
        let amp = U.range(p, 0.7, 1) ** 2 * 4 * G.s;
        if (finale) amp = eT < 0 ? 8 * G.s : 20 * G.s * Math.exp(-eT * 0.7) + 0.8 * G.s;
        const sx = (Math.random() - 0.5) * 2 * amp, sy = (Math.random() - 0.5) * 2 * amp;

        sky(G, p, eT);
        g.save();
        g.translate(sx, sy);
        backHills(G);
        palm(G.W * 0.05, G.GY + 10 * G.s, 170 * G.s, G.s, t, 0.12);
        palm(G.W * 0.96, G.GY + 10 * G.s, 150 * G.s, G.s, t + 2, -0.15);
        smokePlume(G, dt, p, t, finale && eT > 0);
        if (eT > 0) ashCloud(G, eT, dt);
        mountain(G, p, t);
        glowCracks(G, finale ? 1 : p, t);
        magma(G, p, t, dt);
        face(G, p, t, ft, eT);
        snores(G, p, t, ft);
        if (finale) {
          if (eT > 0 && rockSalvo === 0) { launchRocks(G, 12); rockSalvo = 1; }
          if (eT > 1.6 && rockSalvo === 1) { launchRocks(G, 8); rockSalvo = 2; }
          if (eT > 3.4 && rockSalvo === 2) { launchRocks(G, 5); rockSalvo = 3; }
          lavaFlows(G, eT, t);
          fountain(G, eT, t, dt);
          flyingRocks(G, dt);
        }
        pebblesHop(G, finale ? 1 : p, t);
        ptero(G, t, ft);
        dinos(G, p, t, ft, eT);
        foreground(G, t);
        g.restore();

        if (eT > 0 && eT < 0.6) {
          g.fillStyle = `rgba(255, 245, 220, ${0.85 * (1 - eT / 0.6)})`;
          g.fillRect(0, 0, G.W, G.H);
        }
        banner(G, eT);
      },

      finale() {
        // Rumble building up to the boom at 0.35 s.
        sfx.noise({ at: 0, dur: 0.5, vol: 0.35, filter: 'lowpass', ff: 80, ffTo: 500, attack: 0.35, release: 0.08 });
        sfx.tone({ f: 38, to: 60, at: 0, dur: 0.45, vol: 0.3, type: 'sawtooth', filter: 'lowpass', ff: 160, attack: 0.3, release: 0.08 });
        sfx.boom({ at: 0.35, vol: 0.6, dur: 3 });
        sfx.noise({ at: 0.4, dur: 4.2, vol: 0.22, filter: 'lowpass', ff: 260, ffTo: 70, attack: 0.1, release: 3 });
        // Rock clatter.
        for (let i = 0; i < 16; i++) {
          sfx.pop({ at: 0.9 + i * 0.12 + Math.random() * 0.08, vol: 0.12 + Math.random() * 0.14, f: 500 + Math.random() * 1600 });
        }
        // Big dino roar, then the baby's squeal.
        sfx.voice({ f: 125, to: 68, glide: 1.4, at: 1.0, dur: 1.6, vol: 0.4, formants: [[450, 1, 5], [820, 0.7, 6], [2500, 0.25, 5]], vib: { rate: 9, depth: 6 } });
        sfx.noise({ at: 1.0, dur: 1.4, vol: 0.1, filter: 'bandpass', ff: 900, q: 1.2, attack: 0.05, release: 0.8 });
        sfx.voice({ f: 620, to: 950, glide: 0.7, at: 1.5, dur: 1.1, vol: 0.18, formants: [[950, 1, 8], [1500, 0.6, 8], [3100, 0.3, 6]], vib: { rate: 13, depth: 30 } });
      },

      destroy() {},
    };
  },
});
