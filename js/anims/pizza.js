// Top-down pizza on a checkered table, eaten clockwise by a very long, very sneaky dachshund.
// Progress = the eaten wedge (bite-marked edges, cheese strings). The dog gets rounder as it eats.
// Finale: last crust gulped, empty box, then an epic BURP — shockwave rings, napkins and crumbs fly,
// the table shakes — followed by a satisfied "ahh".
Minutka.register({
  id: 'pizza',
  name: 'Pizza Time',
  emoji: '🍕',
  create(stage, sfx) {
    const U = Minutka.util;
    const cv = Minutka.canvas(stage);
    const g = cv.ctx;
    const R0 = U.rng(23);
    const TOP = -Math.PI / 2;

    // toppings in polar coords (fraction of cheese radius)
    const toppings = [];
    for (let i = 0; i < 46; i++) {
      const kind = i < 18 ? 'pep' : i < 30 ? 'olive' : i < 38 ? 'mush' : 'basil';
      toppings.push({ kind, a: R0() * Math.PI * 2, r: 0.12 + Math.sqrt(R0()) * 0.8, rot: R0() * 6, k: 0.85 + R0() * 0.3 });
    }
    const blobs = Array.from({ length: 30 }, () => ({ a: R0() * Math.PI * 2, r: Math.sqrt(R0()) * 0.85, s: 0.06 + R0() * 0.08 }));
    const biteR = [0.92, 0.78, 0.63, 0.49, 0.36, 0.23, 0.11];
    const props = [
      { kind: 'napkin', x: -1.55, y: -0.55, rot: 0.3, vx: -1, vy: -0.6, spin: 4 },
      { kind: 'napkin', x: 1.5, y: 0.65, rot: -0.4, vx: 1, vy: 0.4, spin: -5 },
      { kind: 'fork', x: 1.45, y: -0.5, rot: 0.2, vx: 0.9, vy: -0.8, spin: 7 },
      { kind: 'cup', x: -1.45, y: 0.7, rot: 0, vx: -0.8, vy: 0.9, spin: 2 },
      { kind: 'shaker', x: 1.25, y: 0.05, rot: 0, vx: 1.1, vy: 0.1, spin: -6 },
    ];

    const crumbs = [];
    let crumbAcc = 0, burstDone = false;

    function geom() {
      const W = cv.w, H = cv.h;
      const s = Math.min(W / 1000, H / 600);
      const land = W > H;
      const R = Math.min(W * 0.4, H * 0.37);
      return { W, H, s, land, R, cx: W * 0.5, cy: H * (land ? 0.55 : 0.52) };
    }

    // ------------------------------------------------------------ table
    function table(G, t) {
      const sq = 70 * Math.max(G.s, 0.55);
      g.fillStyle = '#fff7ee';
      g.fillRect(-20, -20, G.W + 40, G.H + 40);
      g.save();
      g.translate(G.W / 2, G.H / 2);
      g.rotate(0.12);
      g.fillStyle = 'rgba(214,52,52,0.55)';
      const n = Math.ceil(Math.hypot(G.W, G.H) / sq / 2) + 1;
      for (let i = -n; i <= n; i++) g.fillRect(i * sq * 2, -n * sq * 2, sq, n * sq * 4);
      for (let j = -n; j <= n; j++) g.fillRect(-n * sq * 2, j * sq * 2, n * sq * 4, sq);
      g.restore();
    }

    function box(G, ft) {
      const R = G.R, b = R * 1.18;
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(G.cx - b + 10 * G.s, G.cy - b + 14 * G.s, b * 2, b * 2);
      g.fillStyle = '#d9a86a';
      g.fillRect(G.cx - b, G.cy - b, b * 2, b * 2);
      g.fillStyle = '#c4904f';
      g.fillRect(G.cx - b * 0.94, G.cy - b * 0.94, b * 1.88, b * 1.88);
      g.fillStyle = 'rgba(150,90,30,0.25)';
      [[-0.4, -0.3, 0.25], [0.35, 0.4, 0.18], [0.2, -0.5, 0.12]].forEach(([x, y, r]) => {
        g.beginPath(); g.arc(G.cx + x * R, G.cy + y * R, r * R, 0, U.TAU); g.fill();
      });
      if (ft >= 0.6) {
        g.fillStyle = 'rgba(120,70,20,0.6)';
        g.font = `${R * 0.16}px Bungee, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('ALL GONE', G.cx, G.cy + R * 0.05);
      }
    }

    function prop(G, pr, ft) {
      const R = G.R;
      let x = G.cx + pr.x * R, y = G.cy + pr.y * R, rot = pr.rot;
      const fly = ft >= 1.6 ? ft - 1.6 : 0;
      if (fly > 0) {
        const k = 1 - Math.exp(-fly * 1.6);
        x += pr.vx * k * R * 2.2; y += pr.vy * k * R * 2.2; rot += pr.spin * k;
      }
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      const u = R * 0.22;
      if (pr.kind === 'napkin') {
        g.fillStyle = '#ffffff';
        g.strokeStyle = '#9ec3e6';
        g.lineWidth = u * 0.05;
        g.beginPath(); g.rect(-u, -u, u * 2, u * 2); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-u, -u); g.lineTo(u, u); g.stroke();
      } else if (pr.kind === 'fork') {
        g.fillStyle = '#b8c2cc';
        g.fillRect(-u * 0.08, -u * 0.2, u * 0.16, u * 1.6);
        g.fillRect(-u * 0.3, -u * 0.5, u * 0.6, u * 0.32);
        for (let k = 0; k < 4; k++) g.fillRect(-u * 0.3 + k * u * 0.18, -u * 1.1, u * 0.08, u * 0.65);
      } else if (pr.kind === 'cup') {
        g.fillStyle = '#e94b5b';
        g.beginPath(); g.arc(0, 0, u * 0.75, 0, U.TAU); g.fill();
        g.fillStyle = '#5a2a12';
        g.beginPath(); g.arc(0, 0, u * 0.6, 0, U.TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.beginPath(); g.arc(-u * 0.2, -u * 0.2, u * 0.12, 0, U.TAU); g.fill();
        g.strokeStyle = '#ffd23f';
        g.lineWidth = u * 0.14;
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(u * 0.1, 0); g.lineTo(u * 0.9, -u * 0.8); g.stroke();
      } else {
        g.fillStyle = '#eee';
        g.beginPath(); g.arc(0, 0, u * 0.42, 0, U.TAU); g.fill();
        g.fillStyle = '#c0392b';
        g.beginPath(); g.arc(0, 0, u * 0.3, 0, U.TAU); g.fill();
        g.fillStyle = '#fff';
        for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(Math.cos(k * 1.26) * u * 0.15, Math.sin(k * 1.26) * u * 0.15, u * 0.04, 0, U.TAU); g.fill(); }
      }
      g.restore();
    }

    // ------------------------------------------------------------ the pizza
    // Remaining pizza path: leading edge at a0 (being eaten), far edge at a1, both with bite scallops.
    function remainPath(G, a0, a1, full) {
      const R = G.R, cx = G.cx, cy = G.cy;
      g.beginPath();
      if (full) { g.arc(cx, cy, R, 0, U.TAU); return; }
      const span = a1 - a0;
      const edge = (a, sign, outward) => {
        const ux = Math.cos(a), uy = Math.sin(a);
        const nx = -uy * sign, ny = ux * sign; // into the remaining pizza
        const pts = outward ? biteR.slice().reverse() : biteR;
        const r0 = outward ? 0.02 : 1;
        if (outward) g.lineTo(cx + ux * r0 * R, cy + uy * r0 * R);
        pts.forEach((r, i) => {
          const prev = outward ? (i === 0 ? r0 : pts[i - 1]) : (i === 0 ? 1 : pts[i - 1]);
          const mid = (r + prev) / 2;
          const depth = Math.min(0.07, span * mid * 0.4, (Math.PI * 2 - span) * mid * 0.4 + 0.01) * R;
          g.quadraticCurveTo(cx + ux * mid * R + nx * depth * 2, cy + uy * mid * R + ny * depth * 2, cx + ux * r * R, cy + uy * r * R);
        });
        if (!outward) g.lineTo(cx + ux * 0.02 * R, cy + uy * 0.02 * R);
      };
      g.moveTo(cx, cy);
      edge(a0, 1, true);
      g.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      g.arc(cx, cy, R, a0, a1);
      edge(a1, -1, false);
      g.closePath();
    }

    function pizza(G, p, t) {
      const R = G.R, cx = G.cx, cy = G.cy;
      const a0 = TOP + p * U.TAU, a1 = TOP + U.TAU;
      const full = p < 0.004;
      if (a1 - a0 < 0.01) return;
      g.fillStyle = 'rgba(0,0,0,0.2)';
      remainPath(G, a0, a1, full);
      g.save();
      g.translate(6 * G.s, 8 * G.s);
      g.fill();
      g.restore();
      // crust
      g.fillStyle = '#e8a24c';
      remainPath(G, a0, a1, full);
      g.fill();
      g.save();
      g.clip();
      g.fillStyle = '#c97a2a';
      g.beginPath(); g.arc(cx, cy, R, 0, U.TAU); g.arc(cx, cy, R * 0.93, 0, U.TAU, true); g.fill();
      // sauce + cheese
      g.fillStyle = '#d23a1f';
      g.beginPath(); g.arc(cx, cy, R * 0.88, 0, U.TAU); g.fill();
      g.fillStyle = '#ffd65c';
      g.beginPath(); g.arc(cx, cy, R * 0.85, 0, U.TAU); g.fill();
      g.fillStyle = '#ffe79a';
      blobs.forEach(b => { g.beginPath(); g.arc(cx + Math.cos(b.a) * b.r * R, cy + Math.sin(b.a) * b.r * R, b.s * R, 0, U.TAU); g.fill(); });
      toppings.forEach(tp => topping(G, tp));
      // bitten edge shows a little bread
      g.restore();
      g.strokeStyle = '#a8642a';
      g.lineWidth = Math.max(2, R * 0.012);
      g.lineJoin = 'round';
      remainPath(G, a0, a1, full);
      g.stroke();
    }

    function topping(G, tp) {
      const R = G.R * 0.85;
      const x = G.cx + Math.cos(tp.a) * tp.r * R, y = G.cy + Math.sin(tp.a) * tp.r * R;
      const u = G.R * 0.075 * tp.k;
      if (tp.kind === 'pep') {
        g.fillStyle = '#b8261b';
        g.beginPath(); g.arc(x, y, u, 0, U.TAU); g.fill();
        g.fillStyle = '#d9472f';
        g.beginPath(); g.arc(x - u * 0.15, y - u * 0.15, u * 0.7, 0, U.TAU); g.fill();
        g.fillStyle = 'rgba(120,20,10,0.6)';
        g.beginPath(); g.arc(x + u * 0.3, y + u * 0.1, u * 0.12, 0, U.TAU); g.arc(x - u * 0.3, y + u * 0.35, u * 0.1, 0, U.TAU); g.fill();
      } else if (tp.kind === 'olive') {
        g.strokeStyle = '#222';
        g.lineWidth = u * 0.28;
        g.beginPath(); g.arc(x, y, u * 0.38, 0, U.TAU); g.stroke();
      } else if (tp.kind === 'mush') {
        g.save();
        g.translate(x, y); g.rotate(tp.rot);
        g.fillStyle = '#efe2cc';
        g.beginPath(); g.arc(0, -u * 0.1, u * 0.6, Math.PI, 0); g.fill();
        g.fillRect(-u * 0.18, -u * 0.12, u * 0.36, u * 0.5);
        g.restore();
      } else {
        g.save();
        g.translate(x, y); g.rotate(tp.rot);
        g.fillStyle = '#2f8f3a';
        g.beginPath(); g.ellipse(0, 0, u * 0.9, u * 0.4, 0, 0, U.TAU); g.fill();
        g.strokeStyle = '#5fbf5a';
        g.lineWidth = u * 0.08;
        g.beginPath(); g.moveTo(-u * 0.8, 0); g.lineTo(u * 0.8, 0); g.stroke();
        g.restore();
      }
    }

    function steam(G, t, p) {
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = Math.max(2, G.R * 0.025);
      g.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const a = TOP + p * U.TAU + (1 - p) * U.TAU * (0.2 + k * 0.2);
        const bx = G.cx + Math.cos(a) * G.R * 0.45, by = G.cy + Math.sin(a) * G.R * 0.45;
        const ph = (t * 0.5 + k * 0.25) % 1;
        g.globalAlpha = Math.sin(ph * Math.PI) * (1 - p * 0.5);
        g.beginPath();
        for (let i = 0; i <= 10; i++) {
          const yy = by - ph * G.R * 0.5 - i * G.R * 0.04;
          const xx = bx + Math.sin(i * 0.8 + t * 3 + k) * G.R * 0.04;
          if (i === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    // ------------------------------------------------------------ the dachshund
    // Head sits in the eaten wedge facing the leading edge; its long body stretches off-screen.
    function dog(G, a, p, t, ft) {
      const R = G.R;
      const fin = ft >= 0;
      const cyc = (t % 1.7) / 1.7;
      let lunge = cyc < 0.15 ? U.easeOut(cyc / 0.15) : cyc < 0.3 ? 1 : 1 - U.easeInOut(U.range(cyc, 0.3, 0.6));
      let mouthOpen = cyc < 0.15 ? 1 : cyc < 0.22 ? 1 - (cyc - 0.15) / 0.07 : 0;
      let chew = cyc > 0.3 ? Math.sin(t * 18) * 0.5 + 0.5 : 0;
      const fat = p; // the belly grows as the pizza disappears
      let puff = 0, burping = false, bliss = false;
      if (fin) {
        lunge = ft < 0.5 ? Math.sin(ft / 0.5 * Math.PI) : 0;
        mouthOpen = ft < 0.25 ? 1 : 0;
        chew = ft > 0.5 && ft < 1.0 ? Math.sin(ft * 25) * 0.5 + 0.5 : 0;
        puff = U.range(ft, 0.9, 1.6) * (ft < 3.6 ? 1 : Math.max(0, 1 - (ft - 3.6) * 2));
        burping = ft >= 1.6 && ft < 3.6;
        bliss = ft >= 3.6;
        if (burping) mouthOpen = 1;
      }
      const rr = R * 0.55;
      const S = R * 0.36 * (1 + puff * 0.18);
      const back = (S * 1.25) / rr;
      const ha = a - back;
      const tx = -Math.sin(a), ty = Math.cos(a); // facing: toward the leading edge
      const hx = G.cx + Math.cos(ha) * rr + tx * lunge * R * 0.1 + (burping ? Math.sin(ft * 40) * R * 0.01 : 0);
      const hy = G.cy + Math.sin(ha) * rr + ty * lunge * R * 0.1;
      const face = Math.atan2(ty, tx);
      // body: from the head out past the edge of the screen
      const ox = Math.cos(ha), oy = Math.sin(ha);
      const far = Math.hypot(G.W, G.H);
      g.lineCap = 'round';
      g.strokeStyle = '#8a4b22';
      g.lineWidth = S * 1.25;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + ox * far, hy + oy * far); g.stroke();
      g.strokeStyle = '#a55d2c';
      g.lineWidth = S * 1.05;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + ox * far, hy + oy * far); g.stroke();
      // belly bulge
      const br = S * (0.62 + fat * 0.55 + puff * 0.45);
      const bx = hx + ox * (S * 2.2 + br), by = hy + oy * (S * 2.2 + br);
      g.fillStyle = '#a55d2c';
      g.beginPath(); g.ellipse(bx, by, br * 1.25, br, ha, 0, U.TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.beginPath(); g.ellipse(bx - oy * br * 0.3, by + ox * br * 0.3, br * 0.6, br * 0.35, ha, 0, U.TAU); g.fill();
      // front paws planted on the box, sneakily
      const px0 = hx + ox * S * 1.5, py0 = hy + oy * S * 1.5;
      [-1, 1].forEach(dd => {
        const k = dd * (1.05 + fat * 0.3);
        const pxx = px0 - oy * S * k + tx * S * 0.35, pyy = py0 + ox * S * k + ty * S * 0.35;
        g.fillStyle = '#8a4b22';
        g.beginPath(); g.ellipse(pxx, pyy, S * 0.34, S * 0.26, face, 0, U.TAU); g.fill();
        g.strokeStyle = '#5e3216';
        g.lineWidth = S * 0.04;
        g.lineCap = 'round';
        for (let q = -1; q <= 1; q++) {
          const qx = pxx + tx * S * 0.2 - ty * q * S * 0.1, qy = pyy + ty * S * 0.2 + tx * q * S * 0.1;
          g.beginPath(); g.moveTo(qx, qy); g.lineTo(qx + tx * S * 0.12, qy + ty * S * 0.12); g.stroke();
        }
      });
      // collar
      g.strokeStyle = '#3d8bfd';
      g.lineWidth = S * 0.22;
      g.lineCap = 'butt';
      const cx2 = hx + ox * S * 0.85, cy2 = hy + oy * S * 0.85;
      g.beginPath(); g.moveTo(cx2 - oy * S * 0.55, cy2 + ox * S * 0.55); g.lineTo(cx2 + oy * S * 0.55, cy2 - ox * S * 0.55); g.stroke();
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(cx2 + tx * S * 0.2, cy2 + ty * S * 0.2, S * 0.14, 0, U.TAU); g.fill();

      g.save();
      g.translate(hx, hy);
      g.rotate(face);
      // ears flop
      g.fillStyle = '#5e3216';
      const flop = Math.sin(t * 5) * 0.15;
      [-1, 1].forEach(d => {
        g.beginPath(); g.ellipse(-S * 0.3, d * S * 0.62, S * 0.5, S * 0.22, d * (0.5 + flop), 0, U.TAU); g.fill();
      });
      // head
      g.fillStyle = '#a55d2c';
      g.beginPath(); g.ellipse(0, 0, S * 0.7, S * 0.6 * (1 + puff * 0.2), 0, 0, U.TAU); g.fill();
      // snout + mouth
      g.fillStyle = '#c9884f';
      g.beginPath(); g.ellipse(S * 0.65, 0, S * 0.45, S * 0.36 * (1 + puff * 0.3), 0, 0, U.TAU); g.fill();
      if (mouthOpen > 0.05) {
        g.fillStyle = '#5a1020';
        g.beginPath(); g.ellipse(S * 0.95, 0, S * 0.2 * mouthOpen + S * 0.05, S * 0.28 * mouthOpen, 0, 0, U.TAU); g.fill();
        g.fillStyle = '#fff';
        [-1, 1].forEach(d => { g.beginPath(); g.moveTo(S * 0.85, d * S * 0.18 * mouthOpen); g.lineTo(S * 0.95, d * S * 0.05); g.lineTo(S * 1.0, d * S * 0.2 * mouthOpen); g.fill(); });
      } else {
        g.strokeStyle = '#5a1020';
        g.lineWidth = S * 0.05;
        g.beginPath(); g.moveTo(S * 0.85, -S * 0.15); g.quadraticCurveTo(S * (1.0 + chew * 0.05), 0, S * 0.85, S * 0.15); g.stroke();
      }
      // nose
      g.fillStyle = '#1a1a1a';
      g.beginPath(); g.ellipse(S * 1.05, 0, S * 0.12, S * 0.16, 0, 0, U.TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath(); g.arc(S * 1.03, -S * 0.06, S * 0.04, 0, U.TAU); g.fill();
      // eyes: shifty, or blissfully shut
      const blink = (t % 3.1) < 0.12;
      [-1, 1].forEach(d => {
        const ex = S * 0.22, ey = d * S * 0.28;
        if (bliss || blink) {
          g.strokeStyle = '#1a1a1a';
          g.lineWidth = S * 0.06;
          g.beginPath(); g.arc(ex, ey, S * 0.1, bliss ? Math.PI * 0.6 : Math.PI * 0.4, bliss ? Math.PI * 1.4 : Math.PI * 1.6); g.stroke();
          return;
        }
        const big = burping || puff > 0.3 ? 1.35 : 1;
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(ex, ey, S * 0.15 * big, 0, U.TAU); g.fill();
        g.fillStyle = '#1a1a1a';
        const look = fin ? 0 : Math.sin(t * 0.7) * 0.5;
        g.beginPath(); g.arc(ex + S * 0.05, ey + look * S * 0.06 * d, S * 0.08 * big, 0, U.TAU); g.fill();
      });
      // eyebrows: sneaky
      if (!fin) {
        g.strokeStyle = '#4a2410';
        g.lineWidth = S * 0.06;
        [-1, 1].forEach(d => { g.beginPath(); g.moveTo(S * 0.05, d * S * 0.45); g.lineTo(S * 0.4, d * S * 0.36); g.stroke(); });
      }
      g.restore();
      if (bliss) {
        // little hearts of contentment
        for (let i = 0; i < 3; i++) {
          const q = ((ft - 3.6) * 0.45 + i / 3) % 1;
          const x = U.lerp(hx, G.cx, q * 0.8) + Math.sin(q * 6 + i) * S * 0.4 + (i - 1) * S * 0.7;
          const y = U.lerp(hy, G.cy, q * 0.8) - q * S;
          const r = S * 0.5 * (1 - q * 0.3);
          g.globalAlpha = Math.sin(q * Math.PI);
          g.fillStyle = '#ff4f6d';
          g.beginPath();
          g.arc(x - r * 0.5, y, r * 0.55, Math.PI, 0);
          g.arc(x + r * 0.5, y, r * 0.55, Math.PI, 0);
          g.lineTo(x, y + r * 1.1);
          g.closePath();
          g.fill();
          g.globalAlpha = 1;
        }
      }
      return { mx: hx + tx * S * 1.0, my: hy + ty * S * 1.0, hx, hy, tx, ty, S, lunge, cyc };
    }

    // stretchy cheese strings between the bite edge and the dog's mouth
    function cheese(G, a, d, fin) {
      if (fin || d.cyc < 0.3 || d.cyc > 0.75) return;
      const k = U.range(d.cyc, 0.3, 0.75);
      const ex = G.cx + Math.cos(a) * G.R * 0.5, ey = G.cy + Math.sin(a) * G.R * 0.5;
      g.strokeStyle = `rgba(255,220,90,${1 - k})`;
      g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        const ox = Math.cos(a) * i * G.R * 0.06, oy = Math.sin(a) * i * G.R * 0.06;
        g.lineWidth = Math.max(1.5, G.R * 0.025 * (1 - k * 0.7));
        g.beginPath();
        g.moveTo(ex + ox, ey + oy);
        g.quadraticCurveTo((ex + d.mx) / 2 + ox * 0.5, (ey + d.my) / 2 + oy * 0.5 + G.R * 0.05 * k, d.mx + ox * 0.3, d.my + oy * 0.3);
        g.stroke();
      }
    }

    function stepCrumbs(G, dt) {
      for (let i = crumbs.length - 1; i >= 0; i--) {
        const c = crumbs[i];
        c.life += dt;
        if (c.life > c.max) { crumbs.splice(i, 1); continue; }
        c.vx *= 0.94; c.vy *= 0.94;
        c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
        g.save();
        g.translate(c.x, c.y);
        g.rotate(c.rot);
        g.globalAlpha = Math.min(1, (c.max - c.life) * 2);
        g.fillStyle = c.col;
        g.fillRect(-c.sz / 2, -c.sz / 2, c.sz, c.sz * 0.7);
        g.globalAlpha = 1;
        g.restore();
      }
    }

    function addCrumb(x, y, vx, vy, sz, max) {
      if (crumbs.length > 200) crumbs.shift();
      crumbs.push({ x, y, vx, vy, sz, max, life: 0, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, col: Math.random() < 0.7 ? '#e8a24c' : '#b8261b' });
    }

    function shockwave(G, x, y, ft) {
      const k = ft - 1.6;
      if (k < 0 || k > 2.4) return;
      for (let i = 0; i < 5; i++) {
        const q = k - i * 0.3;
        if (q < 0 || q > 1.2) continue;
        const r = G.R * 0.2 + q * Math.hypot(G.W, G.H) * 0.6;
        g.strokeStyle = `rgba(160,220,90,${0.7 * (1 - q / 1.2)})`;
        g.lineWidth = G.R * 0.07 * (1 - q / 1.2) + 2;
        g.beginPath(); g.arc(x, y, r, 0, U.TAU); g.stroke();
      }
      // stinky green haze
      const hz = Math.max(0, 1 - k / 2.4);
      g.fillStyle = `rgba(170,210,80,${0.18 * hz})`;
      g.beginPath(); g.arc(x, y, G.R * (0.6 + k * 0.5), 0, U.TAU); g.fill();
    }

    function banner(G, text, ft0, ft, color, y) {
      if (ft < ft0) return;
      const k = U.easeOutBack(U.clamp((ft - ft0) / 0.4));
      const px = Math.min(G.H * 0.17, (G.W * 0.92) / (text.length * 0.8));
      g.save();
      g.translate(G.W * 0.5 + (ft < 3.6 ? Math.sin(ft * 47) * 4 * G.s : 0), G.H * (y || (G.land ? 0.14 : 0.12)));
      g.rotate(-0.06 + Math.sin(ft * 3) * 0.03);
      g.scale(k, k);
      g.font = `${px}px Bungee, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = px * 0.14;
      g.lineJoin = 'round';
      g.strokeStyle = '#2a1608';
      g.strokeText(text, 0, 0);
      g.fillStyle = color;
      g.fillText(text, 0, 0);
      g.restore();
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const G = geom();
        const s = G.s, fin = ft >= 0;
        // eaten angle; in the finale the last sliver goes in one gulp
        const pe = fin ? U.lerp(p, 1, U.clamp(ft / 0.3)) : p;
        const a = TOP + pe * U.TAU;

        const shake = fin && ft > 1.6 && ft < 3.6 ? (1 - (ft - 1.6) / 2) * 9 * Math.max(s, 0.5) : 0;
        g.save();
        if (shake > 0) g.translate(Math.sin(ft * 53) * shake, Math.cos(ft * 41) * shake);
        table(G, t);
        box(G, ft);
        props.forEach(pr => prop(G, pr, ft));
        if (pe < 1) pizza(G, pe, t);
        if (!fin) steam(G, t, p);

        const d = dog(G, a, p, t, ft);
        cheese(G, a, d, fin);

        // crumbs fall at every chomp
        if (!fin && d.cyc < 0.3 && d.cyc > 0.14) {
          crumbAcc += dt * 25;
          while (crumbAcc > 1) {
            crumbAcc -= 1;
            addCrumb(d.mx, d.my, (Math.random() - 0.5) * 120 * s, (Math.random() - 0.5) * 120 * s, (4 + Math.random() * 5) * Math.max(s, 0.5), 3);
          }
        }
        // the BURP blasts crumbs and debris everywhere
        if (fin && !burstDone && ft >= 1.6) {
          burstDone = true;
          for (let i = 0; i < 120; i++) {
            const ang = Math.random() * U.TAU, v = (300 + Math.random() * 1200) * Math.max(s, 0.5);
            addCrumb(d.mx, d.my, Math.cos(ang) * v, Math.sin(ang) * v, (5 + Math.random() * 9) * Math.max(s, 0.5), 4 + Math.random() * 2);
          }
        }
        stepCrumbs(G, dt);
        if (fin) shockwave(G, d.mx, d.my, ft);
        g.restore();

        if (fin) {
          if (ft > 0.9 && ft < 1.6) banner(G, '...', 0.9, ft, '#fff');
          else if (ft >= 1.6 && ft < 3.8) banner(G, 'BUUURP!', 1.6, ft, '#a6e05a');
          else if (ft >= 3.8) banner(G, 'AHHH...', 3.8, ft, '#ffd23f');
        }
      },

      finale() {
        // gulp
        sfx.tone({ at: 0.15, f: 260, to: 110, dur: 0.18, type: 'sine', vol: 0.35, attack: 0.01, release: 0.08 });
        sfx.tone({ at: 0.6, f: 180, to: 90, dur: 0.12, type: 'sine', vol: 0.25 });
        // the BURP: two detuned rattling voices with an irregular, wobbly pitch line
        const at = 1.6, dur = 2.0;
        const burp = [[72, 0.34, 26], [79, 0.26, 31]];
        burp.forEach(([f, vol, rate], i) => {
          const osc = sfx.voice({
            at, f, dur, vol, type: 'sawtooth', attack: 0.04, release: 0.45,
            formants: [[380, 1, 4], [820, 0.7, 5], [2300, 0.2, 6]], vib: { rate, depth: f * 0.18 },
          });
          if (osc && sfx.ctx) {
            const t0 = sfx.ctx.currentTime + at;
            const pts = [[0.2, 1.25], [0.45, 0.9], [0.7, 1.15], [1.0, 0.8], [1.3, 1.0], [1.6, 0.7], [1.95, 0.55]];
            pts.forEach(([k, m]) => osc.frequency.linearRampToValueAtTime(f * m * (1 + i * 0.03), t0 + k));
          }
        });
        sfx.noise({ at, dur, vol: 0.2, filter: 'lowpass', ff: 420, q: 2, attack: 0.05, release: 0.6 });
        // debris clatter
        [1.75, 1.9, 2.1, 2.3].forEach((t, i) => sfx.noise({ at: t, dur: 0.05, vol: 0.18, filter: 'bandpass', ff: 3000 + i * 500, q: 3, attack: 0.001 }));
        // satisfied "ahh"
        sfx.voice({ at: 3.9, f: 190, to: 140, dur: 1.2, vol: 0.28, type: 'sawtooth', attack: 0.08, release: 0.5, formants: [[800, 1, 6], [1200, 0.6, 7], [2700, 0.25, 8]], vib: { rate: 5, depth: 3 } });
      },

      destroy() {},
    };
  },
});
