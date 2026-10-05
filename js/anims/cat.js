// Gravity Test: a cat stares at the audience while one impossibly long arm pushes a glass of water to the table edge.
// Progress = how far the glass has slid from the cat toward the edge (the arm stretches with it).
Minutka.register({
  id: 'cat',
  name: 'Gravity Test',
  emoji: '🐱',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const TAU = U.TAU;

    const FUR = '#f39a3d', FUR_D = '#c96a1c', CREAM = '#fde6c4', PINK = '#ff9fb4', INK = '#3a2214';
    const shards = [];
    const drops = [];
    let crashed = 0; // how many impacts have spawned debris (glass, then mug)

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const tall = H > W * 1.2; // portrait: lower the floor so the table is not on stilts
      const tableY = H * (tall ? 0.55 : 0.66), floorY = H * (tall ? 0.72 : 0.92);
      const tableL = W * 0.05, tableR = W * 0.8;
      const k = s * 1.1;
      const catX = Math.max(W * 0.25, tableL + 150 * k);
      return { W, H, s, k, tableY, floorY, tableL, tableR, catX };
    }

    // glass center x along the table
    function glassX(G, p) {
      const start = G.catX + 160 * G.k, end = G.tableR - 12 * G.s;
      return U.lerp(start, end, p);
    }

    // ------------------------------------------------------------ room
    function room(G, t) {
      const s = G.s;
      g.fillStyle = '#7fc8c0';
      g.fillRect(0, 0, G.W, G.H);
      g.fillStyle = '#74bdb5';
      for (let x = 0; x < G.W; x += 60 * s) g.fillRect(x, 0, 26 * s, G.floorY);
      // framed portrait of the artist with a previous work (a broken vase)
      const fx = G.W * 0.41, fy = G.H * 0.1, fw = 150 * s, fh = 120 * s;
      g.fillStyle = '#b07a3a';
      g.fillRect(fx - 10 * s, fy - 10 * s, fw + 20 * s, fh + 20 * s);
      g.fillStyle = '#fff7e0';
      g.fillRect(fx, fy, fw, fh);
      g.fillStyle = FUR;
      g.beginPath(); g.arc(fx + fw * 0.4, fy + fh * 0.55, 30 * s, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(fx + fw * 0.4 - 28 * s, fy + fh * 0.4); g.lineTo(fx + fw * 0.4 - 20 * s, fy + fh * 0.12); g.lineTo(fx + fw * 0.4 - 4 * s, fy + fh * 0.32); g.fill();
      g.beginPath(); g.moveTo(fx + fw * 0.4 + 28 * s, fy + fh * 0.4); g.lineTo(fx + fw * 0.4 + 20 * s, fy + fh * 0.12); g.lineTo(fx + fw * 0.4 + 4 * s, fy + fh * 0.32); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.5 * s;
      g.beginPath(); g.arc(fx + fw * 0.4 - 10 * s, fy + fh * 0.52, 5 * s, Math.PI * 1.1, Math.PI * 1.9); g.arc(fx + fw * 0.4 + 10 * s, fy + fh * 0.52, 5 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.fillStyle = '#3d8bfd';
      [[0.72, 0.85, 0.3], [0.85, 0.9, -0.5], [0.78, 0.7, 1.2]].forEach(([a, b, r]) => {
        g.save(); g.translate(fx + fw * a, fy + fh * b); g.rotate(r);
        g.beginPath(); g.moveTo(-10 * s, 6 * s); g.lineTo(0, -10 * s); g.lineTo(12 * s, 6 * s); g.fill(); g.restore();
      });
      // window with a swaying plant outside... no, a curtain that breathes
      const wx = G.W * 0.62, wy = G.H * 0.08, ww = 230 * s, wh = 190 * s;
      g.fillStyle = '#e8f6ff';
      g.fillRect(wx - 8 * s, wy - 8 * s, ww + 16 * s, wh + 16 * s);
      g.fillStyle = '#9fd6ff';
      g.fillRect(wx, wy, ww, wh);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      const cx = wx + ((t * 8 * s) % (ww + 120 * s)) - 60 * s;
      g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
      g.beginPath(); g.arc(cx, wy + 60 * s, 22 * s, 0, TAU); g.arc(cx + 26 * s, wy + 50 * s, 28 * s, 0, TAU); g.arc(cx + 54 * s, wy + 62 * s, 20 * s, 0, TAU); g.fill();
      g.restore();
      g.fillStyle = '#e8f6ff';
      g.fillRect(wx + ww / 2 - 4 * s, wy, 8 * s, wh);
      g.fillRect(wx, wy + wh / 2 - 4 * s, ww, 8 * s);
      const sway = Math.sin(t * 0.9) * 8 * s;
      g.fillStyle = '#ff6f61';
      [[wx - 24 * s, 1], [wx + ww + 24 * s, -1]].forEach(([x, d]) => {
        g.beginPath();
        g.moveTo(x - 30 * s * d, wy - 16 * s);
        g.lineTo(x + 34 * s * d, wy - 16 * s);
        g.quadraticCurveTo(x + 10 * s * d + sway, wy + wh * 0.6, x + 26 * s * d + sway * 1.5, wy + wh + 20 * s);
        g.lineTo(x - 30 * s * d, wy + wh + 20 * s);
        g.closePath(); g.fill();
      });
      // floor
      g.fillStyle = '#b9824f';
      g.fillRect(0, G.floorY - 50 * s, G.W, G.H);
      g.fillStyle = '#a5713f';
      for (let y = G.floorY - 50 * s, i = 0; y < G.H; y += 26 * s, i++) g.fillRect(0, y, G.W, 3 * s);
      g.fillStyle = '#f3efe6';
      g.fillRect(0, G.floorY - 62 * s, G.W, 14 * s);
    }

    function table(G) {
      const s = G.s, th = 30 * s;
      g.fillStyle = '#6b3f22';
      [G.tableL + 30 * s, G.tableR - 50 * s].forEach(x => g.fillRect(x, G.tableY + th, 22 * s, G.floorY - G.tableY - th - 40 * s));
      g.fillStyle = '#8f5a32';
      g.fillRect(G.tableL, G.tableY, G.tableR - G.tableL, th);
      g.fillStyle = '#a8703f';
      g.fillRect(G.tableL, G.tableY, G.tableR - G.tableL, 8 * s);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(G.tableL, G.tableY + th - 6 * s, G.tableR - G.tableL, 6 * s);
    }

    // ------------------------------------------------------------ props
    // Glass whose bottom center is (x, y), rotated by rot around its bottom-right corner.
    function glass(G, x, y, rot, t, slosh) {
      const s = G.s * 1.2, w = 74 * s, h = 128 * s;
      g.save();
      g.translate(x + w / 2, y);
      g.rotate(rot);
      g.translate(-w / 2, 0);
      // water
      const lvl = h * 0.72, wave = Math.sin(t * 5) * 3 * s * (1 + slosh * 3);
      g.fillStyle = 'rgba(60,160,255,0.65)';
      g.beginPath();
      g.moveTo(-w / 2 + 5 * s, -4 * s);
      g.lineTo(-w / 2 + 3 * s - 2 * s, -lvl + wave);
      g.quadraticCurveTo(0, -lvl - wave * 1.5 - slosh * 10 * s, w / 2 + 1 * s, -lvl - wave);
      g.lineTo(w / 2 - 5 * s, -4 * s);
      g.closePath();
      g.fill();
      // glass body
      g.fillStyle = 'rgba(230,248,255,0.32)';
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = 4 * s;
      g.beginPath();
      g.moveTo(-w / 2 - 4 * s, -h); g.lineTo(-w / 2 + 4 * s, 0); g.lineTo(w / 2 - 4 * s, 0); g.lineTo(w / 2 + 4 * s, -h);
      g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.fillRect(-w / 2 + 8 * s, -h + 14 * s, 7 * s, h * 0.7);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(-w / 2 + 4 * s, -8 * s, w - 8 * s, 8 * s);
      g.restore();
    }

    function mug(G, x, y, rot) {
      const s = G.s;
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.strokeStyle = '#e63946';
      g.lineWidth = 9 * s;
      g.beginPath(); g.arc(-34 * s, -34 * s, 16 * s, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
      g.fillStyle = '#e63946';
      g.beginPath(); g.roundRect(-34 * s, -70 * s, 64 * s, 70 * s, 8 * s); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(-2 * s, -36 * s, 14 * s, 0, TAU); g.fill();
      g.fillStyle = '#e63946';
      g.beginPath(); g.moveTo(-2 * s, -26 * s); g.bezierCurveTo(-20 * s, -38 * s, -10 * s, -50 * s, -2 * s, -40 * s); g.bezierCurveTo(6 * s, -50 * s, 16 * s, -38 * s, -2 * s, -26 * s); g.fill();
      g.restore();
    }

    // ------------------------------------------------------------ the cat
    // Front-facing tabby sitting with its bottom at (x, y). st: { pupil, lid, look, smug, earTwitch, tail, reachR, reachL, lean }
    function cat(G, x, y, st, t) {
      const k = G.k;
      g.save();
      g.translate(x, y);
      g.scale(k, k);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      // tail, swishing behind on the left
      const sw = st.tail;
      g.strokeStyle = FUR;
      g.lineWidth = 26;
      g.beginPath(); g.moveTo(-60, -20); g.bezierCurveTo(-150, -10, -150 + sw * 40, -120, -110 + sw * 70, -190); g.stroke();
      g.fillStyle = FUR_D;
      g.beginPath(); g.arc(-110 + sw * 70, -190, 14, 0, TAU); g.fill();
      g.save();
      g.rotate(st.lean);
      // body
      g.fillStyle = FUR;
      g.beginPath(); g.ellipse(0, -95, 98, 100, 0, Math.PI, TAU); g.lineTo(98, 0); g.lineTo(-98, 0); g.fill();
      g.beginPath(); g.ellipse(0, -10, 100, 14, 0, 0, TAU); g.fill();
      g.fillStyle = FUR_D;
      [-1, 1].forEach(d => {
        for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(d * (78 - i * 4), -70 - i * 34, 20, 7, d * 0.5, 0, TAU); g.fill(); }
      });
      g.fillStyle = CREAM;
      g.beginPath(); g.ellipse(0, -80, 52, 78, 0, 0, TAU); g.fill();
      // front paws; the right one is the stretchy one
      g.beginPath(); g.ellipse(-36, -8, 26, 15, 0, 0, TAU); g.fill();
      g.restore();
      arm(G, st, 1);
      arm(G, st, -1);
      // head
      g.save();
      g.translate(0, -215);
      g.rotate(st.lean * 0.6 + st.look * 0.08);
      // ears
      [-1, 1].forEach(d => {
        g.save();
        g.translate(d * 58, -52);
        g.rotate(d * (0.15 + (d > 0 ? st.earTwitch : 0) * 0.5) - d * st.flat * 0.5);
        g.fillStyle = FUR;
        g.beginPath(); g.moveTo(-30, 20); g.lineTo(d * 6, -48); g.lineTo(30, 20); g.fill();
        g.fillStyle = PINK;
        g.beginPath(); g.moveTo(-16, 14); g.lineTo(d * 4, -28); g.lineTo(16, 14); g.fill();
        g.restore();
      });
      g.fillStyle = FUR;
      g.beginPath(); g.ellipse(0, 0, 100, 82, 0, 0, TAU); g.fill();
      // cheek fluff
      g.beginPath();
      g.moveTo(-96, 10); g.lineTo(-116, 24); g.lineTo(-92, 30); g.lineTo(-104, 46); g.lineTo(-74, 50);
      g.moveTo(96, 10); g.lineTo(116, 24); g.lineTo(92, 30); g.lineTo(104, 46); g.lineTo(74, 50);
      g.fill();
      g.fillStyle = FUR_D;
      [[-22, -78, 0.2], [0, -82, 0], [22, -78, -0.2]].forEach(([sx, sy, r]) => { g.beginPath(); g.ellipse(sx, sy + 14, 6, 18, r, 0, TAU); g.fill(); });
      g.fillStyle = CREAM;
      g.beginPath(); g.ellipse(0, 36, 50, 32, 0, 0, TAU); g.fill();
      // eyes
      [-1, 1].forEach(d => {
        const ex = d * 40, ey = -8;
        g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(ex, ey, 29, 30, 0, 0, TAU); g.fill();
        g.fillStyle = '#b5d93a';
        g.beginPath(); g.ellipse(ex + st.look * 8, ey, 24, 26, 0, 0, TAU); g.fill();
        g.fillStyle = '#16120e';
        const pw = U.lerp(4, 21, st.pupil);
        g.beginPath(); g.ellipse(ex + st.look * 12, ey, pw, 23, 0, 0, TAU); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(ex + st.look * 12 + 7, ey - 10, 5.5, 0, TAU); g.fill();
        // lids (blink / smug half-close)
        if (st.lid > 0.01) {
          g.fillStyle = FUR;
          g.save();
          g.beginPath(); g.ellipse(ex, ey, 31, 32, 0, 0, TAU); g.clip();
          g.fillRect(ex - 32, ey - 33, 64, 64 * st.lid);
          g.restore();
          g.strokeStyle = INK;
          g.lineWidth = 4;
          const ly = ey - 33 + 64 * st.lid;
          g.beginPath(); g.moveTo(ex - 27, ly - (st.lid > 0.9 ? 4 : 0)); g.quadraticCurveTo(ex, ly + 4, ex + 27, ly - (st.lid > 0.9 ? 4 : 0)); g.stroke();
        }
        g.strokeStyle = INK;
        g.lineWidth = 4;
        g.beginPath(); g.ellipse(ex, ey, 29, 30, 0, 0, TAU); g.stroke();
      });
      // nose + mouth
      g.fillStyle = PINK;
      g.beginPath(); g.moveTo(-11, 22); g.lineTo(11, 22); g.lineTo(0, 34); g.closePath(); g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 4;
      if (st.smug > 0.5) {
        g.beginPath(); g.moveTo(-34, 38); g.quadraticCurveTo(-16, 58, 0, 36); g.quadraticCurveTo(16, 58, 34, 38); g.stroke();
        g.fillStyle = PINK;
        [-1, 1].forEach(d => { g.globalAlpha = 0.45; g.beginPath(); g.ellipse(d * 64, 30, 16, 9, 0, 0, TAU); g.fill(); });
        g.globalAlpha = 1;
      } else {
        g.beginPath(); g.moveTo(0, 34); g.lineTo(0, 40); g.arc(-10, 40, 10, 0, Math.PI * 0.8); g.moveTo(0, 40); g.arc(10, 40, 10, Math.PI, Math.PI * 0.2, true); g.stroke();
      }
      // whiskers
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = 2.5;
      const wig = Math.sin(t * 2.2) * 3;
      [-1, 1].forEach(d => {
        [-8, 2, 12].forEach((dy, i) => {
          g.beginPath(); g.moveTo(d * 46, 32 + dy * 0.5); g.quadraticCurveTo(d * 90, 26 + dy + wig, d * 128, 22 + dy * 2 + wig * (i - 1));
          g.stroke();
        });
      });
      g.restore();
      g.restore();
    }

    // Stretchy arm: from the shoulder down to the table, then along the table to the target x (local units).
    function arm(G, st, d) {
      const reach = d > 0 ? st.reachR : st.reachL;
      if (reach <= 0) return;
      const sx = d * 58, sy = -132, ex = reach * d, ey = -16;
      g.strokeStyle = FUR;
      g.lineWidth = 32;
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(d * 100, -40, d * Math.min(reach, 120), ey); g.lineTo(ex, ey); g.stroke();
      // tabby rings along the arm
      g.strokeStyle = FUR_D;
      g.lineWidth = 7;
      for (let a = 140; a < reach - 30; a += 42) {
        g.beginPath(); g.moveTo(d * a, ey - 15); g.quadraticCurveTo(d * (a + 6), ey, d * a, ey + 15); g.stroke();
      }
      g.fillStyle = CREAM;
      g.beginPath(); g.ellipse(ex, ey + 2, 22, 17, 0, 0, TAU); g.fill();
      g.fillStyle = PINK;
      [-8, 0, 8].forEach(o => { g.beginPath(); g.arc(ex + d * 14, ey + o, 3.5, 0, TAU); g.fill(); });
    }

    // ------------------------------------------------------------ debris
    function shatter(G, x, y, n, color) {
      for (let i = 0; i < n && shards.length < 90; i++) {
        const a = -Math.PI * (0.1 + Math.random() * 0.8);
        const v = (200 + Math.random() * 450) * G.s;
        shards.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 20, k: (5 + Math.random() * 10) * G.s, c: color });
      }
    }

    function splash(G, x, y, n) {
      for (let i = 0; i < n && drops.length < 110; i++) {
        const a = -Math.PI * (0.05 + Math.random() * 0.9);
        const v = (150 + Math.random() * 500) * G.s;
        drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (3 + Math.random() * 6) * G.s, life: 0 });
      }
    }

    function debris(G, dt) {
      const grav = 1500 * G.s, fy = G.floorY - 4 * G.s;
      for (const q of shards) {
        if (q.y >= fy && Math.abs(q.vy) < 20) { q.vx *= 0.9; q.vr *= 0.9; } else q.vy += grav * dt;
        q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt;
        if (q.y > fy) { q.y = fy; q.vy *= -0.3; q.vx *= 0.6; }
        g.save(); g.translate(q.x, q.y); g.rotate(q.r);
        g.fillStyle = q.c;
        g.beginPath(); g.moveTo(-q.k, q.k * 0.4); g.lineTo(0, -q.k); g.lineTo(q.k * 0.7, q.k * 0.6); g.fill();
        g.restore();
      }
      g.fillStyle = 'rgba(70,165,255,0.85)';
      for (let i = drops.length - 1; i >= 0; i--) {
        const q = drops[i];
        q.vy += grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.y > fy) { drops.splice(i, 1); continue; }
        g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill();
      }
    }

    function puddle(G, x, ft) {
      const k = U.easeOut(U.range(ft, 0.75, 2));
      if (k <= 0) return;
      g.fillStyle = 'rgba(80,170,255,0.55)';
      g.beginPath(); g.ellipse(x, G.floorY - 2 * G.s, 170 * G.s * k, 18 * G.s * k + 1, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.ellipse(x - 40 * G.s * k, G.floorY - 6 * G.s, 40 * G.s * k, 4 * G.s * k + 0.5, 0, 0, TAU); g.fill();
    }

    function bubble(G, x, y, text, a, tailLeft) {
      if (a <= 0) return;
      const s = G.s;
      g.save();
      g.globalAlpha = Math.min(1, a);
      g.font = `${30 * s}px Bungee, sans-serif`;
      const w = g.measureText(text).width + 40 * s;
      g.fillStyle = '#fff';
      g.strokeStyle = INK;
      g.lineWidth = 4 * s;
      g.beginPath(); g.roundRect(x - w / 2, y - 30 * s, w, 60 * s, 26 * s); g.fill(); g.stroke();
      g.beginPath();
      if (tailLeft) { g.moveTo(x - w / 2 + 10 * s, y + 4 * s); g.lineTo(x - w / 2 - 34 * s, y + 20 * s); g.lineTo(x - w / 2 + 16 * s, y + 22 * s); }
      else { g.moveTo(x - 14 * s, y + 28 * s); g.lineTo(x - 30 * s, y + 56 * s); g.lineTo(x + 6 * s, y + 28 * s); }
      g.fill();
      g.fillStyle = INK;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, x, y + 2 * s);
      g.restore();
    }

    function bigText(G, text, x, y, ft0, ft, col) {
      if (ft < ft0) return;
      const k = U.easeOutBack(U.range(ft, ft0, ft0 + 0.35));
      g.save();
      g.translate(x, y);
      g.rotate(0.08 + Math.sin(ft * 5) * 0.03);
      g.scale(k, k);
      g.font = `${96 * G.s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = 16 * G.s;
      g.strokeStyle = INK;
      g.strokeText(text, 0, 0, G.W * 0.9);
      g.fillStyle = col;
      g.fillText(text, 0, 0, G.W * 0.9);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        const s = G.s;
        room(G, t);
        table(G);

        // glass trajectory: pushed along, then the last nudge, then gravity
        let gx = glassX(G, p), gy = G.tableY, grot = 0, showGlass = true;
        const tense = U.range(p, 0.85, 1);
        grot = U.range(p, 0.93, 1) * 0.09 + Math.sin(t * 7) * 0.025 * tense;
        if (ft >= 0) {
          const nudge = U.easeIn(U.range(ft, 0, 0.25));
          gx += nudge * 46 * s;
          grot = U.lerp(grot, 0.7, nudge);
          const f = U.range(ft, 0.25, 0.75);
          if (f > 0) {
            gx += f * 70 * s;
            gy = G.tableY + (G.floorY - 10 * s - G.tableY) * f * f;
            grot += f * 2.2;
          }
          if (ft >= 0.75) {
            showGlass = false;
            if (crashed === 0) { crashed = 1; shatter(G, gx, G.floorY - 10 * s, 40, 'rgba(225,245,255,0.95)'); splash(G, gx, G.floorY - 10 * s, 70); }
          }
        }
        const glassLeft = gx - 44 * s;

        // the mug on the left gets the same treatment later in the finale
        let mx = G.tableL + 60 * s, my = G.tableY, mrot = 0, showMug = true;
        let reachL = 0;
        if (ft >= 3.8) {
          const r = U.easeInOut(U.range(ft, 3.8, 4.6));
          const push = U.easeIn(U.range(ft, 4.6, 5.3));
          mx -= push * 74 * s;
          reachL = U.lerp(0, (G.catX - mx - 34 * s) / G.k, r);
          if (push > 0) reachL = (G.catX - mx - 34 * s) / G.k;
          reachL *= 1 - U.range(ft, 6.6, 7.2);
          const f = U.range(ft, 5.3, 5.7);
          if (f > 0) { mx -= f * 40 * s; my = G.tableY + (G.floorY - 10 * s - G.tableY) * f * f; mrot = -f * 2.6; }
          if (ft >= 5.7) {
            showMug = false;
            if (crashed === 1) { crashed = 2; shatter(G, mx, G.floorY - 10 * s, 30, '#e63946'); }
          }
        }

        if (crashed) puddle(G, glassX(G, 1) + 130 * s, ft);
        if (showMug) mug(G, mx, my, mrot);

        // the cat
        const blinkPh = (t % 7) / 7;
        const blink = Math.sin(U.range(blinkPh, 0, 0.14) * Math.PI);
        const smug = ft >= 0.9 ? 1 : 0;
        const lookLeft = ft >= 3.4 ? U.range(ft, 3.4, 3.8) * (1 - U.range(ft, 6.8, 7.2)) : 0;
        const touch = (glassLeft - G.catX) / G.k - 22;
        const reachR = ft < 0.3 ? touch : U.lerp(touch, 70, U.range(ft, 0.3, 1.2));
        cat(G, G.catX, G.tableY, {
          pupil: ft >= 0 ? U.lerp(1, 0.45, U.range(ft, 0.9, 1.6)) : 0.08 + 0.92 * Math.pow(p, 1.4),
          lid: smug ? Math.max(0.45, blink) : Math.max(blink * (1 - tense * 0.8), 0),
          look: ft >= 0 && ft < 0.9 ? U.range(ft, 0, 0.3) : -lookLeft,
          smug,
          earTwitch: Math.pow(Math.max(0, Math.sin(t * 1.3)), 24),
          flat: tense * 0.5,
          tail: Math.sin(t * U.lerp(1.2, 4, Math.max(tense, smug))) * (0.6 + tense * 0.4),
          reachR: Math.max(0, reachR), reachL: Math.max(0, reachL),
          lean: (tense * 0.04) + Math.sin(t * 0.8) * 0.01,
        }, t);

        if (showGlass) glass(G, gx, gy, grot, t, tense + (ft >= 0 ? 1 : 0));
        if (ft >= 0) debris(G, dt);

        // an off-screen human pleads
        if (ft < 0) bubble(G, Math.min(G.W * 0.5, G.catX + 260 * s), G.H * 0.12, "DON'T.", U.range(p, 0.86, 0.9) * 1, true);
        if (ft >= 0) {
          if (ft < 3.6) bigText(G, 'CRASH!', G.W * 0.72, G.H * 0.5, 0.75, ft, '#9fdcff');
          if (ft > 2.0 && ft < 3.6) bubble(G, G.catX + 190 * G.k, G.tableY - 330 * G.k, 'oops.', U.range(ft, 2.0, 2.2), false);
          if (ft > 5.7) bigText(G, 'AND THAT.', G.W * 0.64, G.H * 0.36, 5.7, ft, '#ffd23f');
        }
      },

      finale() {
        const R = U.rng(9);
        const shatterSound = (at, vol) => {
          sfx.noise({ at, dur: 0.55, vol: 0.45 * vol, filter: 'highpass', ff: 2500, attack: 0.001, release: 0.5 });
          sfx.noise({ at, dur: 0.18, vol: 0.3 * vol, filter: 'bandpass', ff: 5500, q: 1.2, attack: 0.001, release: 0.16 });
          sfx.tone({ f: 180, to: 60, at, dur: 0.12, vol: 0.3 * vol, attack: 0.001 });
          for (let i = 0; i < 9; i++) {
            const d = R() * 0.7, dur = 0.25 + R() * 0.45;
            sfx.tone({ f: 2400 + R() * 3800, at: at + 0.03 + d, dur, vol: (0.05 + R() * 0.05) * vol, attack: 0.001, release: dur * 0.9 });
          }
        };
        shatterSound(0.73, 1);
        // smug "mrreow" + purr
        const m = sfx.voice({ f: 480, to: 760, glide: 0.25, at: 2.0, dur: 0.95, vol: 0.28, formants: [[900, 1, 5], [1900, 0.55, 6], [3100, 0.2, 8]], vib: { rate: 6, depth: 10 } });
        if (m && sfx.ctx) m.frequency.exponentialRampToValueAtTime(420, sfx.ctx.currentTime + 2.0 + 0.95);
        sfx.tone({ f: 26, type: 'sawtooth', at: 3.0, dur: 1.4, vol: 0.22, attack: 0.15, release: 0.4, filter: 'lowpass', ff: 380, vib: { rate: 1.5, depth: 3 } });
        shatterSound(5.7, 0.6);
      },

      destroy() { shards.length = 0; drops.length = 0; },
    };
  },
});
