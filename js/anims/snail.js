// Escargot Grand Prix: a racing snail crawls toward the checkered finish line in front of a grandstand of bugs.
// Progress = how far the snail has crawled from the start line to the finish line (its slime trail grows with it).
Minutka.register({
  id: 'snail',
  name: 'Escargot Grand Prix',
  emoji: '🐌',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R = U.rng(1312);
    const TAU = U.TAU;

    // ------------------------------------------------------------ static scenery
    const BUGS = [
      { body: '#e63946', head: '#1d1d24', spots: '#1d1d24' },   // ladybug
      { body: '#ffd23f', head: '#2b2118', stripes: '#2b2118' }, // bee
      { body: '#2ec27e', head: '#145a3c' },                     // beetle
      { body: '#8a4b2a', head: '#5a2d16' },                     // ant
      { body: '#7b5cff', head: '#3b2a8a' },                     // fancy beetle
      { body: '#ff8fb8', head: '#a83a6a' },                     // grub
    ];
    const SIGNS = ['GO!', 'ALLEZ!', 'VITE!', 'WOO!', 'GO!', 'YAY!'];
    const seats = Array.from({ length: 3 * 44 }, () => ({
      type: Math.floor(R() * BUGS.length), ph: R() * TAU, sp: 3 + R() * 4, k: 0.85 + R() * 0.3,
      sign: R() < 0.1 ? Math.floor(R() * SIGNS.length) : -1, flag: R() < 0.18, hue: Math.floor(R() * 360),
    }));
    const clouds = Array.from({ length: 4 }, () => ({ x: R(), y: 0.02 + R() * 0.06, k: 0.5 + R() * 0.5, v: 0.006 + R() * 0.006 }));
    const pebbles = Array.from({ length: 40 }, () => ({ x: R(), y: R(), r: 1.5 + R() * 3 }));
    const tufts = Array.from({ length: 30 }, () => ({ x: R(), y: R(), k: 0.6 + R() * 0.7, ph: R() * TAU }));
    const CONF = ['#ff3b5c', '#ffd23f', '#2ec4ff', '#41e08a', '#b06bff', '#ffffff'];
    const confetti = [];
    const fireworks = Array.from({ length: 7 }, (_, i) => ({
      at: 0.4 + i * 0.85 + R() * 0.3, x: 0.15 + R() * 0.7, y: 0.08 + R() * 0.25, col: CONF[i % 5], n: 36,
    }));
    let started = false;

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const standTop = H * 0.13, standBot = H * 0.55;
      const trackTop = H * 0.6, trackBot = H * 0.93;
      const lane1 = U.lerp(trackTop, trackBot, 0.3), lane2 = U.lerp(trackTop, trackBot, 0.8);
      const startX = W * 0.08, finishX = W * 0.8;
      const k = s * 1.15; // snail scale
      return { W, H, s, k, standTop, standBot, trackTop, trackBot, lane1, lane2, startX, finishX, snailLen: 230 * k };
    }

    // nose position of the snail along the track
    function noseX(G, p) { return U.lerp(G.startX + 190 * G.k, G.finishX, p); }

    // ------------------------------------------------------------ background
    function sky(G, t) {
      const grd = g.createLinearGradient(0, 0, 0, G.standTop);
      grd.addColorStop(0, '#4fb3ff');
      grd.addColorStop(1, '#a8e1ff');
      g.fillStyle = grd;
      g.fillRect(0, 0, G.W, G.standTop + 10);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      clouds.forEach(c => {
        const x = ((((c.x + t * c.v) % 1.3) + 1.3) % 1.3 - 0.15) * G.W, y = c.y * G.H, k = c.k * G.s;
        g.beginPath();
        g.arc(x, y + 14 * k, 22 * k, 0, TAU); g.arc(x + 26 * k, y + 4 * k, 28 * k, 0, TAU); g.arc(x + 56 * k, y + 14 * k, 22 * k, 0, TAU);
        g.fill();
      });
    }

    function bug(x, y, k, seat, cheer, t) {
      const B = BUGS[seat.type];
      const bob = -Math.abs(Math.sin(t * seat.sp + seat.ph)) * cheer * 10 * k;
      const by = y + bob;
      // arms
      const wave = Math.sin(t * seat.sp * 1.6 + seat.ph) * 0.5 * cheer;
      g.strokeStyle = B.head;
      g.lineWidth = 3.5 * k;
      g.lineCap = 'round';
      const armUp = U.lerp(0.4, 2.6, Math.min(1, cheer));
      const hands = [-1, 1].map(d => {
        const a = d * (armUp + wave * d);
        const hx = x + d * 9 * k + Math.sin(a) * 18 * k, hy = by - 14 * k - Math.cos(a) * 18 * k;
        g.beginPath(); g.moveTo(x + d * 9 * k, by - 14 * k); g.lineTo(hx, hy); g.stroke();
        return { x: hx, y: hy };
      });
      // body
      g.fillStyle = B.body;
      g.beginPath(); g.ellipse(x, by - 10 * k, 15 * k, 17 * k, 0, 0, TAU); g.fill();
      if (B.spots) {
        g.fillStyle = B.spots;
        g.fillRect(x - 1 * k, by - 26 * k, 2 * k, 30 * k);
        [[-7, -14], [6, -6], [-6, -2]].forEach(([dx, dy]) => { g.beginPath(); g.arc(x + dx * k, by + dy * k, 3 * k, 0, TAU); g.fill(); });
      }
      if (B.stripes) {
        g.fillStyle = B.stripes;
        g.fillRect(x - 14 * k, by - 14 * k, 28 * k, 4 * k);
        g.fillRect(x - 13 * k, by - 5 * k, 26 * k, 4 * k);
      }
      // head + antennae + eyes
      const hy = by - 32 * k;
      g.strokeStyle = B.head;
      g.lineWidth = 2.2 * k;
      [-1, 1].forEach(d => {
        const sway = Math.sin(t * 4 + seat.ph + d) * 3 * k;
        g.beginPath(); g.moveTo(x + d * 4 * k, hy - 8 * k); g.quadraticCurveTo(x + d * 8 * k, hy - 20 * k, x + d * 12 * k + sway, hy - 24 * k); g.stroke();
      });
      g.fillStyle = B.head;
      g.beginPath(); g.arc(x, hy, 11 * k, 0, TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x - 4.5 * k, hy - 1 * k, 4 * k, 0, TAU); g.arc(x + 4.5 * k, hy - 1 * k, 4 * k, 0, TAU); g.fill();
      g.fillStyle = '#111';
      g.beginPath(); g.arc(x - 3.5 * k, hy, 2 * k, 0, TAU); g.arc(x + 5.5 * k, hy, 2 * k, 0, TAU); g.fill();
      if (cheer > 0.6) {
        g.fillStyle = '#ff6b81';
        g.beginPath(); g.ellipse(x, hy + 5.5 * k, 4 * k, 3 * k * Math.min(1.3, cheer), 0, 0, TAU); g.fill();
      }
      // props
      if (seat.flag) {
        const h = hands[1];
        g.strokeStyle = '#5a3d22';
        g.lineWidth = 2 * k;
        g.beginPath(); g.moveTo(h.x, h.y + 6 * k); g.lineTo(h.x, h.y - 22 * k); g.stroke();
        g.fillStyle = `hsl(${seat.hue}, 85%, 55%)`;
        const fl = Math.sin(t * 9 + seat.ph) * 4 * k;
        g.beginPath(); g.moveTo(h.x, h.y - 22 * k); g.lineTo(h.x + 18 * k, h.y - 17 * k + fl); g.lineTo(h.x, h.y - 10 * k); g.fill();
      } else if (seat.sign >= 0) {
        const cx = (hands[0].x + hands[1].x) / 2, cy = Math.min(hands[0].y, hands[1].y) - 10 * k;
        g.fillStyle = '#fff';
        g.fillRect(cx - 22 * k, cy - 11 * k, 44 * k, 20 * k);
        g.fillStyle = '#e63946';
        g.font = `${10 * k}px Bungee, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(SIGNS[seat.sign], cx, cy, 40 * k);
      }
    }

    function grandstand(G, p, t, ft) {
      const s = G.s, top = G.standTop, bot = G.standBot;
      // back wall + roof
      g.fillStyle = '#3d4a73';
      g.fillRect(0, top, G.W, bot - top);
      g.fillStyle = '#2f3a5e';
      for (let x = 0; x < G.W; x += 90 * s) g.fillRect(x, top, 8 * s, bot - top);
      // tiers
      const rows = 3, rowH = (bot - top - 70 * s) / rows;
      const cheer = ft >= 0 ? 1.4 : 0.25 + 0.75 * p * p;
      const k = Math.max(0.5 * s, Math.min(rowH / 52, 1.25 * s * (G.W > G.H ? 1 : 2)));
      const sp = 44 * k;
      const perRow = Math.min(44, Math.ceil(G.W / sp) + 1);
      for (let r = 0; r < rows; r++) {
        const by = top + 40 * s + (r + 1) * rowH;
        for (let i = 0; i < perRow; i++) {
          const seat = seats[r * 44 + i];
          bug((i + (r % 2) * 0.5) * sp + 10 * k, by - 4 * s, k, seat, cheer * (0.7 + 0.3 * Math.sin(seat.ph)), t);
        }
        g.fillStyle = r % 2 ? '#c98a4b' : '#b77a3e';
        g.fillRect(0, by - 6 * s, G.W, 12 * s);
      }
      // railing banner
      g.fillStyle = '#f4f1e8';
      g.fillRect(0, bot - 32 * s, G.W, 32 * s);
      g.fillStyle = '#e63946';
      g.fillRect(0, bot - 32 * s, G.W, 5 * s);
      g.fillRect(0, bot - 5 * s, G.W, 5 * s);
      g.fillStyle = '#1d1d40';
      g.font = `${20 * s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('★ ESCARGOT GRAND PRIX ★', G.W / 2, bot - 16 * s, G.W * 0.95);
      // striped awning with scallops
      const aw = 30 * s;
      for (let x = 0, i = 0; x < G.W; x += aw, i++) {
        g.fillStyle = i % 2 ? '#ffffff' : '#e63946';
        g.fillRect(x, top - 12 * s, aw, 24 * s);
        g.beginPath(); g.arc(x + aw / 2, top + 12 * s, aw / 2, 0, Math.PI); g.fill();
      }
      // bunting
      g.strokeStyle = '#333';
      g.lineWidth = 1.5 * s;
      const by = top + 34 * s;
      g.beginPath(); g.moveTo(0, by);
      for (let x = 0; x <= G.W; x += 20 * s) g.lineTo(x, by + Math.sin(x / (120 * s) * Math.PI) * 6 * s);
      g.stroke();
      const fw = 26 * s;
      for (let x = 0, i = 0; x < G.W; x += fw * 1.15, i++) {
        const y0 = by + Math.sin(x / (120 * s) * Math.PI) * 6 * s;
        const fl = Math.sin(t * 5 + i * 0.7) * 6 * s * (ft >= 0 ? 2 : 1);
        g.fillStyle = CONF[i % 5];
        g.beginPath(); g.moveTo(x, y0); g.lineTo(x + fw, y0); g.lineTo(x + fw / 2 + fl, y0 + 26 * s); g.fill();
      }
    }

    // ------------------------------------------------------------ track
    function track(G, t) {
      const s = G.s;
      g.fillStyle = '#58b947';
      g.fillRect(0, G.standBot, G.W, G.H - G.standBot);
      g.fillStyle = '#9a7752';
      g.fillRect(0, G.trackTop, G.W, G.trackBot - G.trackTop);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      pebbles.forEach(pb => {
        g.beginPath(); g.arc(pb.x * G.W, U.lerp(G.trackTop + 6 * s, G.trackBot - 6 * s, pb.y), pb.r * s, 0, TAU); g.fill();
      });
      // lane edges
      g.fillStyle = '#fff';
      g.fillRect(0, G.trackTop, G.W, 5 * s);
      g.fillRect(0, G.trackBot - 5 * s, G.W, 5 * s);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      const mid = U.lerp(G.trackTop, G.trackBot, 0.55);
      for (let x = 0; x < G.W; x += 50 * s) g.fillRect(x, mid - 2 * s, 28 * s, 4 * s);
      // start line
      g.fillStyle = '#fff';
      g.fillRect(G.startX - 4 * s, G.trackTop, 8 * s, G.trackBot - G.trackTop);
      // grass tufts in front
      g.strokeStyle = '#3f9a3a';
      g.lineWidth = 3 * s;
      g.lineCap = 'round';
      tufts.forEach(f => {
        const x = f.x * G.W, y = G.trackBot + 8 * s + f.y * Math.max(0, G.H - G.trackBot - 10 * s);
        const sway = Math.sin(t * 1.8 + f.ph) * 4 * s * f.k;
        for (let k = -1; k <= 1; k++) {
          g.beginPath(); g.moveTo(x + k * 5 * s, y); g.quadraticCurveTo(x + k * 7 * s, y - 10 * s * f.k, x + k * 9 * s + sway, y - 18 * s * f.k); g.stroke();
        }
      });
    }

    function finishLine(G, t, ft) {
      const s = G.s, x = G.finishX, cw = 14 * s;
      const n = Math.ceil((G.trackBot - G.trackTop) / cw);
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < n; r++) {
          g.fillStyle = (r + c) % 2 ? '#111' : '#fff';
          g.fillRect(x + (c - 1) * cw, G.trackTop + r * cw, cw, Math.min(cw, G.trackBot - G.trackTop - r * cw));
        }
      }
      // flag pole with a waving checkered flag
      const px = x + 2.5 * cw, py = G.trackTop - 4 * s, ph = 190 * s;
      g.fillStyle = '#ddd';
      g.fillRect(px - 3 * s, py - ph, 6 * s, ph);
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(px, py - ph, 7 * s, 0, TAU); g.fill();
      const fw = 90 * s, fh = 60 * s, cols = 6, rows = 4;
      const amp = (ft >= 0 ? 14 : 5) * s, sp = ft >= 0 ? 14 : 5;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x0 = px + (i / cols) * fw, x1 = px + ((i + 1) / cols) * fw;
          const w0 = Math.sin(t * sp - i * 0.9) * amp * (i / cols), w1 = Math.sin(t * sp - (i + 1) * 0.9) * amp * ((i + 1) / cols);
          const y0 = py - ph + 4 * s + (j / rows) * fh, y1 = y0 + fh / rows;
          g.fillStyle = (i + j) % 2 ? '#111' : '#fff';
          g.beginPath(); g.moveTo(x0, y0 + w0); g.lineTo(x1, y0 + w1); g.lineTo(x1, y1 + w1); g.lineTo(x0, y1 + w0); g.closePath(); g.fill();
        }
      }
    }

    // ------------------------------------------------------------ racers
    function slime(G, tailX, t) {
      if (tailX <= G.startX) return;
      const s = G.s, y = G.lane2 - 4 * s, th = 18 * s;
      g.fillStyle = 'rgba(160,255,215,0.55)';
      g.beginPath(); g.roundRect(G.startX, y - th / 2, tailX - G.startX, th, th / 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.fillRect(G.startX + 6 * s, y - th * 0.28, Math.max(0, tailX - G.startX - 12 * s), 3 * s);
      // glints sliding along
      g.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) {
        const q = (t * 0.12 + i / 6) % 1;
        const gx = G.startX + q * (tailX - G.startX);
        const a = Math.sin(q * Math.PI);
        g.globalAlpha = a;
        g.beginPath(); g.moveTo(gx, y - 8 * s); g.lineTo(gx + 3 * s, y - 3 * s); g.lineTo(gx, y + 2 * s); g.lineTo(gx - 3 * s, y - 3 * s); g.fill();
      }
      g.globalAlpha = 1;
    }

    // Snail facing right; origin = nose at ground level. st: { strain, stretch, dance, grin, t }
    function snailAt(x, y, k, st) {
      const t = st.t;
      g.save();
      g.translate(x, y - st.hop);
      g.rotate(st.tilt);
      g.scale(k, k);
      // speed lines (ironic)
      g.strokeStyle = `rgba(255,255,255,${0.5 + 0.3 * Math.sin(t * 20)})`;
      g.lineWidth = 4;
      g.lineCap = 'round';
      [-120, -80, -40].forEach((yy, i) => {
        const len = 40 + 25 * Math.sin(t * 9 + i * 2);
        g.beginPath(); g.moveTo(-250 - i * 10, yy); g.lineTo(-250 - i * 10 - len, yy); g.stroke();
      });
      // exhaust puffs
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.2 + i / 3) % 1;
        g.fillStyle = `rgba(230,230,240,${(1 - q) * 0.8})`;
        g.beginPath(); g.arc(-205 - q * 50, -42 - q * 30, 6 + q * 14, 0, TAU); g.fill();
      }
      // foot / body (stretches like an inchworm)
      const L = 200 * st.stretch;
      g.fillStyle = '#f0b97a';
      g.beginPath();
      g.moveTo(-L, 0);
      g.quadraticCurveTo(-L + 10, -24, -L + 40, -26);
      g.lineTo(-30, -30);
      g.quadraticCurveTo(-14, -40, -12, -70);
      g.lineTo(26, -82);
      g.quadraticCurveTo(28, -30, 10, 0);
      g.closePath();
      g.fill();
      g.fillStyle = '#d99a5a';
      g.fillRect(-L + 20, -8, L - 10, 8);
      // eye stalks + eyes with determined brows
      const wig = 0.08 + st.strain * 0.25;
      [[-2, -0.35, 0], [14, 0.2, 1.3]].forEach(([sx, lean, ph]) => {
        const a = lean + Math.sin(t * (3 + st.strain * 9) + ph) * wig;
        const ex = sx + Math.sin(a) * 58, ey = -96 - Math.cos(a) * 58;
        g.strokeStyle = '#f0b97a';
        g.lineWidth = 9;
        g.beginPath(); g.moveTo(sx, -88); g.quadraticCurveTo(sx + Math.sin(a) * 20, -120, ex, ey); g.stroke();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(ex, ey, 14, 0, TAU); g.fill();
        g.strokeStyle = '#3a2614'; g.lineWidth = 2.5;
        g.stroke();
        g.fillStyle = '#1b1b24';
        g.beginPath(); g.arc(ex + 5, ey + 1, 6.5, 0, TAU); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(ex + 7, ey - 2, 2, 0, TAU); g.fill();
        // brow: relaxed -> furious
        g.strokeStyle = '#3a2614';
        g.lineWidth = 5;
        const tilt = st.dance > 0 ? -0.3 : U.lerp(0, 0.5, st.strain) * (ph ? 1 : -1) * -1;
        g.beginPath(); g.moveTo(ex - 13, ey - 18 - tilt * 12); g.lineTo(ex + 13, ey - 18 + tilt * 12); g.stroke();
      });
      // racing helmet on the head, stalks poking through
      g.fillStyle = '#2f6bff';
      g.beginPath(); g.arc(8, -78, 28, Math.PI * 1.05, Math.PI * 2.08); g.closePath(); g.fill();
      g.fillStyle = '#fff';
      g.fillRect(-20, -84, 56, 6);
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.moveTo(10, -104); g.lineTo(14, -92); g.lineTo(6, -92); g.fill();
      g.fillStyle = '#1d2a55';
      g.beginPath(); g.roundRect(12, -76, 26, 12, 5); g.fill();
      g.fillStyle = 'rgba(160,220,255,0.8)';
      g.fillRect(16, -74, 10, 3);
      // mouth: smile -> gritted teeth -> victory grin
      g.strokeStyle = '#5a2d16';
      g.lineWidth = 3.5;
      if (st.dance > 0) {
        g.fillStyle = '#5a1a22';
        g.beginPath(); g.arc(22, -44, 11, 0, Math.PI); g.closePath(); g.fill();
      } else if (st.strain > 0.45) {
        g.fillStyle = '#fff';
        g.fillRect(12, -50, 20, 9);
        g.beginPath(); g.rect(12, -50, 20, 9); g.moveTo(17, -50); g.lineTo(17, -41); g.moveTo(22, -50); g.lineTo(22, -41); g.moveTo(27, -50); g.lineTo(27, -41); g.stroke();
        if (st.strain > 0.7) {
          g.fillStyle = '#ff7d93';
          g.beginPath(); g.ellipse(20, -36, 5, 7 + Math.sin(t * 8) * 2, 0.3, 0, TAU); g.fill();
        }
      } else {
        g.beginPath(); g.arc(20, -52, 10, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      }
      // cheek blush when straining
      g.fillStyle = `rgba(255,90,90,${0.2 + st.strain * 0.5})`;
      g.beginPath(); g.arc(4, -52, 7, 0, TAU); g.fill();
      // shell with racing livery
      const sx = -84, sy = -80, sr = 56;
      g.save();
      g.translate(sx, sy);
      g.rotate(st.dance > 0 ? Math.sin(t * 6) * 0.15 : Math.sin(t * 2) * 0.03);
      // spoiler
      g.fillStyle = '#1d1d24';
      g.fillRect(-58, -36, 8, 34);
      g.fillRect(-40, -46, 8, 34);
      g.beginPath(); g.roundRect(-84, -66, 66, 16, 6); g.fill();
      g.fillStyle = '#e63946';
      g.fillRect(-82, -64, 62, 4);
      // shell body
      g.fillStyle = '#e63946';
      g.beginPath(); g.arc(0, 0, sr, 0, TAU); g.fill();
      g.save();
      g.beginPath(); g.arc(0, 0, sr, 0, TAU); g.clip();
      g.fillStyle = '#fff';
      g.save(); g.rotate(-0.6); g.fillRect(-sr, -14, sr * 2, 10); g.fillRect(-sr, 2, sr * 2, 10); g.restore();
      g.restore();
      g.strokeStyle = '#8a1a24';
      g.lineWidth = 6;
      g.beginPath();
      for (let a = 0; a < TAU * 2.3; a += 0.2) {
        const r = 4 + a * 3.3;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (a === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.stroke();
      // star decal (no numbers in this league)
      g.fillStyle = '#ffd23f';
      g.strokeStyle = '#1d1d24';
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22;
        g.lineTo(28 + Math.cos(a) * r, -26 + Math.sin(a) * r);
      }
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#1d1d24';
      g.lineWidth = 5;
      g.beginPath(); g.arc(0, 0, sr, 0, TAU); g.stroke();
      // exhaust pipe
      g.fillStyle = '#9aa3ad';
      g.beginPath(); g.roundRect(-94, 34, 34, 14, 5); g.fill();
      g.restore();
      // sweat
      if (st.strain > 0.3) {
        for (let i = 0; i < 4; i++) {
          const q = (t * 1.6 + i / 4) % 1;
          const d = i % 2 ? 1 : -1;
          const dx = 10 + d * (14 + q * 50), dy = -120 - Math.sin(q * Math.PI) * 40 + q * 70;
          g.fillStyle = `rgba(70,170,255,${(1 - q) * Math.min(1, (st.strain - 0.3) * 2)})`;
          g.beginPath(); g.moveTo(dx, dy - 16); g.quadraticCurveTo(dx + 11, dy, dx, dy + 8); g.quadraticCurveTo(dx - 11, dy, dx, dy - 16); g.fill();
          g.strokeStyle = `rgba(255,255,255,${(1 - q) * 0.8})`; g.lineWidth = 2; g.stroke();
        }
      }
      g.restore();
    }

    function turtle(G, x, y, k, t, ft) {
      const awake = ft >= 0 ? U.range(ft, 1.5, 1.9) : 0;
      const breathe = Math.sin(t * 1.2) * 3;
      g.save();
      g.translate(x, y);
      g.scale(k, k);
      // legs
      g.fillStyle = '#6fbf5a';
      [-50, 40].forEach(lx => { g.beginPath(); g.ellipse(lx, -6, 16, 10, 0, 0, TAU); g.fill(); });
      // head resting on the ground (or popped up, startled)
      const hy = U.lerp(-14, -58, awake), hx = U.lerp(88, 80, awake);
      g.beginPath(); g.ellipse(hx, hy, 26, 20, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(60, (hy - 14) / 2, 18, 18 + awake * 8, 0, 0, TAU); g.fill();
      // eyes
      g.strokeStyle = '#1b3a14';
      g.lineWidth = 3;
      if (awake < 0.5) {
        g.beginPath(); g.arc(92, hy - 4, 6, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
      } else {
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(94, hy - 6, 9, 0, TAU); g.fill();
        g.fillStyle = '#111';
        g.beginPath(); g.arc(96, hy - 6, 3, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(104, hy + 6, 4, 5, 0, 0, TAU); g.fill();
      }
      // shell (breathing) with a sleeping cap
      g.fillStyle = '#2f7d4a';
      g.beginPath(); g.ellipse(0, -30 + breathe * 0.3, 74, 46 + breathe, 0, Math.PI, TAU); g.fill();
      g.fillRect(-74, -32, 148, 14);
      g.strokeStyle = '#a5d36b';
      g.lineWidth = 4;
      g.beginPath();
      [-36, 0, 36].forEach(cx => { g.moveTo(cx + 18, -46); g.lineTo(cx + 9, -62); g.lineTo(cx - 9, -62); g.lineTo(cx - 18, -46); g.lineTo(cx - 9, -30); g.lineTo(cx + 9, -30); g.closePath(); });
      g.stroke();
      g.restore();
      // Zzz or ?!
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 4 * G.s;
      g.strokeStyle = '#1d1d40';
      if (awake < 0.5) {
        g.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) {
          const q = (t * 0.4 + i / 3) % 1;
          g.globalAlpha = Math.sin(q * Math.PI);
          g.font = `${(14 + q * 20) * G.s}px Bungee, sans-serif`;
          const zx = x + (100 + q * 60) * k, zy = y - (40 + q * 90) * k;
          g.strokeText('z', zx, zy); g.fillText('z', zx, zy);
        }
        g.globalAlpha = 1;
      } else {
        g.fillStyle = '#ffd23f';
        g.font = `${40 * G.s}px Bungee, sans-serif`;
        const jx = x + 110 * k, jy = y - 130 * k + Math.sin(t * 10) * 3 * G.s;
        g.strokeText('?!', jx, jy); g.fillText('?!', jx, jy);
      }
    }

    // ------------------------------------------------------------ finale fx
    function spawnConfetti(G, n) {
      for (let i = 0; i < n && confetti.length < 180; i++) {
        confetti.push({
          x: Math.random() * G.W, y: -Math.random() * G.H * 0.8, vy: (60 + Math.random() * 90) * G.s,
          sw: Math.random() * TAU, w: (6 + Math.random() * 6) * G.s, c: Math.floor(Math.random() * CONF.length), spin: 4 + Math.random() * 8,
        });
      }
    }

    function drawConfetti(G, dt, t, ft) {
      for (const c of confetti) {
        c.y += c.vy * dt;
        c.x += Math.sin(t * 2 + c.sw) * 30 * G.s * dt;
        if (c.y > G.H + 20 && ft < 7) { c.y = -20; c.x = Math.random() * G.W; }
      }
      for (let ci = 0; ci < CONF.length; ci++) {
        g.fillStyle = CONF[ci];
        for (const c of confetti) {
          if (c.c !== ci) continue;
          const w = c.w * Math.abs(Math.cos(t * c.spin + c.sw)) + 1;
          g.fillRect(c.x - w / 2, c.y, w, c.w * 0.6);
        }
      }
    }

    function drawFireworks(G, ft) {
      fireworks.forEach(f => {
        const a = ft - f.at;
        if (a < 0 || a > 1.8) return;
        const cx = f.x * G.W, cy = f.y * G.H;
        const r = 150 * G.s * U.easeOut(Math.min(1, a / 0.9));
        const drop = 50 * G.s * a * a;
        g.globalAlpha = 1 - a / 1.8;
        g.fillStyle = f.col;
        g.strokeStyle = f.col;
        g.lineWidth = 6 * G.s;
        g.lineCap = 'round';
        g.beginPath();
        for (let i = 0; i < f.n; i++) {
          const an = (i / f.n) * TAU, rr = r * (i % 2 ? 0.75 : 1), r0 = rr * 0.7;
          g.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0 + drop * 0.7);
          g.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr + drop);
        }
        g.stroke();
        g.fillStyle = '#fff';
        if (a < 0.15) { g.beginPath(); g.arc(cx, cy, 20 * G.s, 0, TAU); g.fill(); }
      });
      g.globalAlpha = 1;
    }

    function trophy(G, x, y, ft, t) {
      if (ft < 1.1) return;
      const k = U.easeOutElastic(U.range(ft, 1.1, 2.2)) * G.s * 1.1;
      const bob = Math.sin(t * 3) * 6 * G.s;
      g.save();
      g.translate(x, y + bob);
      g.scale(k, k);
      // rays
      g.fillStyle = 'rgba(255,230,120,0.35)';
      for (let i = 0; i < 10; i++) {
        const a = t * 0.8 + (i * TAU) / 10;
        g.beginPath(); g.moveTo(0, -40); g.lineTo(Math.cos(a) * 150, -40 + Math.sin(a) * 150); g.lineTo(Math.cos(a + 0.2) * 150, -40 + Math.sin(a + 0.2) * 150); g.fill();
      }
      g.fillStyle = '#f6b81c';
      g.strokeStyle = '#8a5a00';
      g.lineWidth = 5;
      // handles
      g.lineWidth = 9;
      g.strokeStyle = '#f6b81c';
      [-1, 1].forEach(d => { g.beginPath(); g.arc(d * 44, -62, 20, d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5, d < 0); g.stroke(); });
      // cup
      g.beginPath();
      g.moveTo(-50, -90); g.lineTo(50, -90); g.quadraticCurveTo(48, -30, 10, -22); g.lineTo(10, 0); g.lineTo(-10, 0); g.lineTo(-10, -22); g.quadraticCurveTo(-48, -30, -50, -90);
      g.fill();
      g.fillRect(-32, 0, 64, 12);
      g.fillStyle = '#7a4a1a';
      g.fillRect(-40, 12, 80, 20);
      g.fillStyle = '#fff3b0';
      g.fillRect(-36, -84, 10, 40);
      // tiny snail emblem: a spiral
      g.strokeStyle = '#8a5a00';
      g.lineWidth = 4;
      g.beginPath();
      for (let a = 0; a < TAU * 2; a += 0.25) { const r = 2 + a * 2.2; g.lineTo(8 + Math.cos(a) * r, -60 + Math.sin(a) * r); }
      g.stroke();
      g.restore();
    }

    function banner(G, ft) {
      if (ft < 0.5) return;
      const k = U.easeOutBack(U.range(ft, 0.5, 1.1));
      g.save();
      g.translate(G.W / 2, G.H * 0.3);
      g.rotate(-0.05 + Math.sin(ft * 3) * 0.03);
      g.scale(k, k);
      g.font = `${100 * G.s}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = 16 * G.s;
      g.strokeStyle = '#1d1d40';
      g.strokeText('VICTOIRE!', 0, 0, G.W * 0.92);
      g.fillStyle = '#ffd23f';
      g.fillText('VICTOIRE!', 0, 0, G.W * 0.92);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        if (ft >= 0 && !started) { started = true; spawnConfetti(G, 180); }

        sky(G, t);
        grandstand(G, p, t, ft);
        track(G, t);
        drawFireworks(G, ft);

        const strain = U.range(p, 0.35, 1);
        const lunge = ft >= 0 ? U.easeOut(U.range(ft, 0, 1)) * 60 * G.k : 0;
        const nx = noseX(G, p) + lunge;
        const dance = ft >= 0 ? U.range(ft, 1.1, 1.5) * (1 - U.range(ft, 8, 9)) : 0;
        const stretch = 1 + Math.sin(t * (2 + strain * 4)) * (0.05 + strain * 0.04) * (1 - dance);
        slime(G, nx - 200 * stretch * G.k + 20 * G.k, t);
        turtle(G, G.W * 0.42, G.lane1 + 10 * G.s, G.k * 0.8, t, ft);
        finishLine(G, t, ft);
        snailAt(nx, G.lane2, G.k, {
          t, strain: ft >= 0 ? 0 : strain, stretch, dance,
          hop: dance * Math.abs(Math.sin(t * 7)) * 34 * G.s,
          tilt: dance * Math.sin(t * 7) * 0.12 - (ft < 0 ? strain * 0.04 : 0),
        });
        trophy(G, nx - 70 * G.k, G.lane2 - 240 * G.k, ft, t);
        if (ft >= 0) drawConfetti(G, dt, t, ft);
        banner(G, ft);
      },

      finale() {
        // Air horn: detuned sawtooth stack, short-short-long.
        [[0, 0.22], [0.3, 0.22], [0.6, 0.9]].forEach(([at, dur]) => {
          [415, 422, 520, 527].forEach(f => sfx.tone({ f: f * 0.92, to: f, glide: 0.05, type: 'sawtooth', at, dur, vol: 0.07, attack: 0.01, release: 0.06, filter: 'lowpass', ff: 2600 }));
        });
        // Crowd cheer: band-passed noise swelling and fading, plus a few whistles.
        [[700, 0.2], [1500, 0.16], [3200, 0.08]].forEach(([ff, vol]) => sfx.noise({ at: 0.1, dur: 5, vol, filter: 'bandpass', ff, q: 0.7, attack: 0.9, release: 2.5 }));
        [1.2, 2.6, 3.4].forEach((at, i) => sfx.tone({ f: 1800 + i * 300, to: 2600 + i * 300, glide: 0.25, at, dur: 0.45, vol: 0.05, type: 'sine', vib: { rate: 12, depth: 30 } }));
        // Brassy fanfare.
        const N = sfx.note;
        const fan = [['G4', 1.6, 0.16], ['C5', 1.76, 0.16], ['E5', 1.92, 0.16], ['G5', 2.08, 0.4], ['E5', 2.52, 0.16], ['G5', 2.7, 1.3]];
        fan.forEach(([n, at, dur]) => {
          const f = N(n);
          [-7, 7].forEach(det => sfx.tone({ f, type: 'sawtooth', at, dur, vol: 0.08, attack: 0.02, release: 0.08, filter: 'lowpass', ff: 1400, ffTo: 3200, detune: det, vib: dur > 1 ? { rate: 6, depth: 4 } : null }));
          sfx.tone({ f: f / 2, type: 'square', at, dur, vol: 0.04, attack: 0.02, release: 0.08, filter: 'lowpass', ff: 900 });
        });
        [N('C4'), N('E4'), N('G4')].forEach(f => sfx.tone({ f, type: 'sawtooth', at: 2.7, dur: 1.3, vol: 0.05, attack: 0.03, release: 0.4, filter: 'lowpass', ff: 1600 }));
      },

      destroy() { confetti.length = 0; },
    };
  },
});
