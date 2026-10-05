// A dark dance floor lights up tile by tile while a mirror ball descends and a lonely robot waits for the party.
// Progress = how much of the floor is lit (a spiral from the centre) and how far the ball has come down.
Minutka.register({
  id: 'disco',
  name: 'Saturday Night Countdown',
  emoji: '🪩',
  needs3d: true,
  create(stage, sfx) {
    const U = Minutka.util;
    const V3 = THREE.Vector3;
    const T = Minutka.three(stage);
    const R = U.rng(1977);
    const BG = 0x07040f;

    const disposables = [];
    const track = x => { disposables.push(x); return x; };
    const lam = c => track(new THREE.MeshLambertMaterial({ color: c }));
    const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

    T.renderer.setClearColor(BG);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    const cam = new THREE.PerspectiveCamera(42, T.w / T.h, 0.1, 200);
    T.camera = cam;
    T.fit();

    function canvasTex(w, h, draw) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const tex = track(new THREE.CanvasTexture(c));
      tex.redraw = () => { draw(c.getContext('2d'), w, h); tex.needsUpdate = true; };
      return tex;
    }
    const glowTex = canvasTex(64, 64, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.4, 'rgba(255,255,255,0.5)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });

    // ------------------------------------------------------------ lights (fixed set; only intensities change)
    const ambient = new THREE.AmbientLight(0x5a4080, 0.55);
    scene.add(ambient);
    const spots = [0xff3df0, 0x3df0ff].map((c, i) => {
      const s = new THREE.SpotLight(c, 2.2, 40, 0.38, 0.5, 1);
      s.position.set(i ? 7 : -7, 11, 2);
      scene.add(s, s.target);
      return s;
    });
    const ballLight = new THREE.PointLight(0xffffff, 0.6, 14, 1.5);
    scene.add(ballLight);

    // ------------------------------------------------------------ room
    const wall = new THREE.Mesh(track(new THREE.PlaneGeometry(40, 22)), lam(0x1c1234));
    wall.position.set(0, 9, -7.5);
    scene.add(wall);
    const base = new THREE.Mesh(track(new THREE.BoxGeometry(13.2, 0.4, 13.2)), lam(0x120c1e));
    base.position.y = -0.2;
    scene.add(base);
    const signTex = canvasTex(512, 160, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.font = '120px Bungee, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 10;
      g.strokeStyle = '#ff6ad5';
      g.strokeText('DISCO', w / 2, h / 2 + 6);
      g.fillStyle = '#ffe0f6';
      g.fillText('DISCO', w / 2, h / 2 + 6);
    });
    const signM = track(new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const sign = new THREE.Mesh(track(new THREE.PlaneGeometry(7, 2.2)), signM);
    sign.position.set(0, 9.5, -7.4);
    scene.add(sign);
    let signRedrawn = false;
    // speaker stacks either side
    const spkGeo = track(new THREE.BoxGeometry(1.6, 2.2, 1.4));
    const coneGeo = track(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 20));
    const coneM = lam(0x3a3450);
    const speakers = [];
    [-8.4, 8.4].forEach(x => {
      for (let k = 0; k < 2; k++) {
        const box = at(new THREE.Mesh(spkGeo, lam(0x1a1a22)), x, 1.1 + k * 2.25, -3);
        const cone = at(new THREE.Mesh(coneGeo, coneM), 0, 0, 0.72);
        cone.rotation.x = Math.PI / 2;
        box.add(cone);
        scene.add(box);
        speakers.push(cone);
      }
    });

    // ------------------------------------------------------------ dance floor
    const N = 12, TILES = N * N;
    const floor = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.92, 0.12, 0.92)), track(new THREE.MeshBasicMaterial({ color: 0xffffff })), TILES);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const OFF = new THREE.Color(0x1d1530);
    // square spiral from the middle outwards: tile order[k] lights up k-th
    const order = [];
    {
      let x = N / 2 - 1, y = N / 2 - 1, dx = 1, dy = 0, run = 1;
      const seen = new Set();
      while (order.length < TILES) {
        for (let side = 0; side < 2; side++) {
          for (let k = 0; k < run; k++) {
            if (x >= 0 && y >= 0 && x < N && y < N && !seen.has(y * N + x)) { seen.add(y * N + x); order.push(y * N + x); }
            x += dx; y += dy;
          }
          [dx, dy] = [-dy, dx];
        }
        run++;
      }
    }
    const rank = new Int16Array(TILES);
    order.forEach((idx, k) => { rank[idx] = k; });
    const litAt = new Float32Array(TILES).fill(-1);
    for (let i = 0; i < TILES; i++) {
      const x = i % N, z = Math.floor(i / N);
      dummy.position.set(x - (N - 1) / 2, 0.06, z - (N - 1) / 2);
      dummy.updateMatrix();
      floor.setMatrixAt(i, dummy.matrix);
      floor.setColorAt(i, OFF);
    }
    scene.add(floor);

    // ------------------------------------------------------------ mirror ball
    const BALL_R = 1.15, BALL_TOP = 11.4, BALL_LOW = 6.4;
    const ball = new THREE.Group();
    scene.add(ball);
    const ballSpin = new THREE.Group();
    ball.add(ballSpin);
    ballSpin.add(new THREE.Mesh(track(new THREE.SphereGeometry(BALL_R * 0.97, 20, 14)), lam(0x2a2a33)));
    const facetDirs = [];
    for (let i = 1; i < 14; i++) {
      const lat = -Math.PI / 2 + (i / 14) * Math.PI;
      const n = Math.max(4, Math.round(Math.cos(lat) * 34));
      for (let k = 0; k < n; k++) {
        const lon = (k / n) * Math.PI * 2 + (i % 2) * 0.1;
        facetDirs.push(new V3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)));
      }
    }
    const facets = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.19, 0.19, 0.04)), track(new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 120, specular: 0xffffff, emissive: 0x222230 })), facetDirs.length);
    const Z = new V3(0, 0, 1);
    const facetShade = facetDirs.map(() => 0.55 + R() * 0.35);
    facetDirs.forEach((d, i) => {
      dummy.position.copy(d).multiplyScalar(BALL_R);
      dummy.quaternion.setFromUnitVectors(Z, d);
      dummy.updateMatrix();
      facets.setMatrixAt(i, dummy.matrix);
      facets.setColorAt(i, col.setScalar(facetShade[i]));
    });
    ballSpin.add(facets);
    const cable = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04, 0.04, 1, 6)), lam(0x888899));
    scene.add(cable);
    const halo = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTex, color: 0xbfd8ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })));
    halo.scale.set(5, 5, 1);
    ball.add(halo);

    // light specks thrown around the room by the ball
    const SPECKS = 90;
    const speckDirs = Array.from({ length: SPECKS }, () => {
      const y = -0.15 - R() * 0.85, a = R() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      return new V3(Math.cos(a) * r, y, Math.sin(a) * r);
    });
    const speckPos = new Float32Array(SPECKS * 3), speckCol = new Float32Array(SPECKS * 3);
    const speckGeo = track(new THREE.BufferGeometry());
    speckGeo.setAttribute('position', new THREE.BufferAttribute(speckPos, 3).setUsage(THREE.DynamicDrawUsage));
    speckGeo.setAttribute('color', new THREE.BufferAttribute(speckCol, 3).setUsage(THREE.DynamicDrawUsage));
    const specks = new THREE.Points(speckGeo, track(new THREE.PointsMaterial({ size: 0.42, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    specks.frustumCulled = false;
    scene.add(specks);
    const speckTint = speckDirs.map(() => [0.8 + R() * 0.2, 0.8 + R() * 0.2, 0.9 + R() * 0.1]);

    // ------------------------------------------------------------ sweeping beams
    const beamGeo = track(new THREE.ConeGeometry(1, 1, 24, 1, true));
    beamGeo.translate(0, -0.5, 0); // apex at the origin, opening down -Y
    const poolGeo = track(new THREE.CircleGeometry(1, 28));
    const beamCols = [0xff3df0, 0x3df0ff, 0xfff03d, 0x7d5cff];
    const beams = beamCols.map((c, i) => {
      const m = new THREE.Mesh(beamGeo, track(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })));
      m.position.set([-7, 7, -3.5, 3.5][i], [11, 11, 12, 12][i], [2, 2, -6, -6][i]);
      scene.add(m);
      const pool = new THREE.Mesh(poolGeo, track(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })));
      pool.rotation.x = -Math.PI / 2;
      scene.add(pool);
      return { m, pool, ph: i * 1.7 };
    });

    // ------------------------------------------------------------ the robot
    const bodyM = track(new THREE.MeshPhongMaterial({ color: 0xc9d2e0, shininess: 70 }));
    const darkM = track(new THREE.MeshPhongMaterial({ color: 0x3a3f4f, shininess: 40 }));
    const eyeM = track(new THREE.MeshBasicMaterial({ color: 0x5ff7ff }));
    const blinkM = track(new THREE.MeshBasicMaterial({ color: 0xff3a3a }));
    const box = (w, h, d) => track(new THREE.BoxGeometry(w, h, d));
    function limb(parent, x, y, z, len, w, m) {
      const piv = at(new THREE.Group(), x, y, z);
      piv.add(at(new THREE.Mesh(box(w, len, w), m), 0, -len / 2, 0));
      parent.add(piv);
      return piv;
    }
    const robot = at(new THREE.Group(), 0, 0.12, 1.2);
    robot.scale.setScalar(1.7);
    scene.add(robot);
    const hips = at(new THREE.Group(), 0, 1.1, 0);
    robot.add(hips);
    const legs = [-1, 1].map(s => {
      const thigh = limb(hips, s * 0.28, 0, 0, 0.55, 0.24, darkM);
      const shin = limb(thigh, 0, -0.55, 0, 0.55, 0.22, bodyM);
      shin.add(at(new THREE.Mesh(box(0.34, 0.14, 0.5), darkM), 0, -0.6, 0.08));
      return { thigh, shin };
    });
    const torso = at(new THREE.Group(), 0, 0.05, 0);
    hips.add(torso);
    torso.add(at(new THREE.Mesh(box(0.95, 0.95, 0.6), bodyM), 0, 0.55, 0));
    torso.add(at(new THREE.Mesh(box(0.5, 0.32, 0.05), darkM), 0, 0.6, 0.31));
    const chestLights = [0xff3df0, 0xfff03d, 0x3df0ff].map((c, i) => {
      const m = track(new THREE.MeshBasicMaterial({ color: c }));
      torso.add(at(new THREE.Mesh(box(0.1, 0.1, 0.05), m), -0.14 + i * 0.14, 0.6, 0.34));
      return m;
    });
    const neck = at(new THREE.Group(), 0, 1.05, 0);
    torso.add(neck);
    const head = at(new THREE.Group(), 0, 0.33, 0);
    neck.add(head);
    head.add(new THREE.Mesh(box(0.8, 0.6, 0.6), bodyM));
    head.add(at(new THREE.Mesh(box(0.62, 0.24, 0.05), darkM), 0, 0.02, 0.31));
    const eyes = [-1, 1].map(s => {
      const e = at(new THREE.Mesh(box(0.13, 0.11, 0.04), eyeM), s * 0.16, 0.03, 0.34);
      head.add(e);
      return e;
    });
    head.add(at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6)), darkM), 0, 0.47, 0));
    const bulb = at(new THREE.Mesh(track(new THREE.SphereGeometry(0.09, 10, 8)), blinkM), 0, 0.66, 0);
    head.add(bulb);
    const arms = [-1, 1].map(s => {
      const upper = limb(torso, s * 0.58, 0.95, 0, 0.5, 0.2, darkM);
      const fore = limb(upper, 0, -0.5, 0, 0.5, 0.18, bodyM);
      fore.add(at(new THREE.Mesh(box(0.24, 0.2, 0.24), darkM), 0, -0.56, 0));
      return { upper, fore, s };
    });
    // the wristwatch it keeps checking
    arms[0].fore.add(at(new THREE.Mesh(box(0.22, 0.1, 0.22), track(new THREE.MeshBasicMaterial({ color: 0xffd23a }))), 0, -0.4, 0));

    // party guests who pop out of the floor at the finale
    const guestGeo = { body: track(new THREE.CylinderGeometry(0.28, 0.36, 1.1, 10)), head: track(new THREE.SphereGeometry(0.28, 12, 10)), arm: box(0.13, 0.6, 0.13), hair: track(new THREE.SphereGeometry(0.42, 12, 10)) };
    const guests = [[-3.2, -2.2, 0xff5fa2], [3.4, -1.8, 0x3d8bfd], [-2.6, 2.8, 0x25b97a], [2.8, 3.0, 0xffc23d], [0, -3.8, 0x9a6bc4]].map(([x, z, c], i) => {
      const g = at(new THREE.Group(), x, 0.12, z);
      const m = lam(c);
      g.add(at(new THREE.Mesh(guestGeo.body, m), 0, 0.75, 0));
      g.add(at(new THREE.Mesh(guestGeo.head, lam(0xf5c9a0)), 0, 1.6, 0));
      if (i % 2 === 0) g.add(at(new THREE.Mesh(guestGeo.hair, lam(0x2a1a10)), 0, 1.75, -0.08)); // afro
      const ga = [-1, 1].map(s => limb(g, s * 0.36, 1.2, 0, 0.6, 0.13, m));
      g.lookAt(0, 0.12, 1.2);
      g.scale.setScalar(0.001);
      scene.add(g);
      return { g, ga, ph: i * 1.3 };
    });

    // Shout text, painted at finale time so the web font is ready.
    function makeShout(word) {
      const tex = canvasTex(1024, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.font = '160px Bungee, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 26;
        g.lineJoin = 'round';
        g.strokeStyle = '#1b1233';
        g.strokeText(word, w / 2, h / 2);
        const gr = g.createLinearGradient(0, h * 0.2, 0, h * 0.8);
        gr.addColorStop(0, '#fff03d');
        gr.addColorStop(1, '#ff3df0');
        g.fillStyle = gr;
        g.fillText(word, w / 2, h / 2);
      });
      const sp = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })));
      sp.renderOrder = 10;
      sp.scale.set(0.001, 0.001, 1);
      sp.userData.tex = tex;
      scene.add(sp);
      return sp;
    }
    // made up front (no first-use hitch at the payoff); repainted in the finale so the web font is ready
    const shout = makeShout('BOOGIE!');
    let shoutPainted = false;

    // ------------------------------------------------------------ per-frame
    const BEAT = 60 / 128, MUSIC = 1.0; // the beat drops one second into the finale
    const tmp = new V3(), tmp2 = new V3(), ballPos = new V3();
    let prevLit = 0, sparkleAcc = 0;

    function beatInfo(t, ft) {
      if (ft >= MUSIC) {
        const b = (ft - MUSIC) / BEAT;
        return { n: Math.floor(b), ph: b % 1, on: ft < MUSIC + BEAT * 12 + 2 };
      }
      // an imaginary slow groove before the party, so the idle motion has rhythm
      const b = t / (BEAT * 2);
      return { n: Math.floor(b), ph: b % 1, on: false };
    }

    function updateFloor(p, t, ft, beat) {
      const lit = ft >= 0 ? TILES : Math.floor(U.clamp(p) * TILES + 1e-6);
      for (let k = prevLit; k < lit; k++) litAt[order[k]] = t;
      for (let k = lit; k < prevLit; k++) litAt[order[k]] = -1;
      prevLit = lit;
      const pulse = 0.5 + 0.5 * Math.cos(beat.ph * Math.PI * 2);
      for (let i = 0; i < TILES; i++) {
        if (litAt[i] < 0) {
          // unlit tiles shimmer faintly so the floor never looks dead
          const sh = 0.03 * Math.sin(t * 2 + i * 1.7);
          col.setRGB(OFF.r + sh, OFF.g + sh, OFF.b + sh * 1.5);
        } else {
          const x = i % N, z = Math.floor(i / N);
          let hue = (rank[i] * 0.013 + t * 0.05) % 1;
          let light = 0.5 + 0.08 * pulse;
          if (beat.on) {
            // finale: checkerboard flip and colour rings from the centre, on the beat
            const checker = (x + z + beat.n) % 2;
            const ring = Math.abs(Math.hypot(x - 5.5, z - 5.5) - beat.ph * 9) < 1 ? 0.25 : 0;
            hue = (beat.n * 0.13 + checker * 0.5 + rank[i] * 0.004) % 1;
            light = (checker ? 0.62 : 0.38) * (0.75 + 0.25 * pulse) + ring;
          }
          col.setHSL(hue, 0.9, Math.min(0.9, light));
          const pop = 1 - U.clamp((t - litAt[i]) / 0.6);
          if (pop > 0) col.lerp(tmp2.set(1, 1, 1), pop * 0.8);
        }
        floor.setColorAt(i, col);
      }
      floor.instanceColor.needsUpdate = true;
    }

    function updateBall(p, t, dt, ft) {
      let y = U.lerp(BALL_TOP, BALL_LOW, U.clamp(p));
      if (ft >= 0) y = BALL_LOW - 0.35 * Math.sin(Math.min(ft, 1) * Math.PI * 3) * Math.exp(-ft * 3); // clunk!
      ball.position.set(0, y, 0);
      ballPos.copy(ball.position);
      ballSpin.rotation.y += dt * (ft >= 0 ? 1.6 : 0.5);
      cable.position.set(0, (y + 16) / 2, 0);
      cable.scale.set(1, Math.max(0.01, 16 - y), 1);
      ballLight.position.set(0, y - 1.5, 0);
      // sparkling facets
      sparkleAcc += dt * 40;
      while (sparkleAcc > 1) {
        sparkleAcc -= 1;
        const i = Math.floor(Math.random() * facetDirs.length);
        facets.setColorAt(i, col.setScalar(Math.random() < 0.5 ? 1.6 : facetShade[i]));
      }
      facets.instanceColor.needsUpdate = true;
      // specks: cast rays from the ball onto the floor and the back wall
      const bright = 0.25 + 0.75 * U.clamp(p) + (ft >= 0 ? 0.4 : 0);
      const rot = ballSpin.rotation.y;
      const c = Math.cos(rot), s = Math.sin(rot);
      speckDirs.forEach((d, i) => {
        const dx = d.x * c + d.z * s, dz = -d.x * s + d.z * c, dy = d.y;
        let k = (0.08 - y) / dy; // hit floor
        let hx = dx * k, hz = dz * k;
        if (hz < -7.4) { k = (-7.4) / dz; hx = dx * k; hz = -7.4; }
        const hy = y + dy * k;
        const inRoom = Math.abs(hx) < 8 && hz < 7;
        speckPos[i * 3] = hx; speckPos[i * 3 + 1] = inRoom ? Math.max(0.14, hy) : -999; speckPos[i * 3 + 2] = hz + (hz <= -7.4 ? 0.05 : 0);
        const tw = 0.7 + 0.3 * Math.sin(t * 9 + i * 2.3);
        speckCol[i * 3] = speckTint[i][0] * bright * tw; speckCol[i * 3 + 1] = speckTint[i][1] * bright * tw; speckCol[i * 3 + 2] = speckTint[i][2] * bright * tw;
      });
      speckGeo.attributes.position.needsUpdate = true;
      speckGeo.attributes.color.needsUpdate = true;
    }

    function updateBeams(p, t, ft, beat) {
      const party = ft >= 0;
      beams.forEach((b, i) => {
        const sp = party ? 2.4 : 0.35 + p * 0.3;
        const tx = Math.sin(t * sp + b.ph) * 4.5, tz = Math.cos(t * sp * 0.8 + b.ph * 1.3) * 3.5;
        tmp.set(tx, 0.13, tz);
        tmp2.copy(tmp).sub(b.m.position);
        const len = tmp2.length();
        tmp2.divideScalar(len);
        b.m.quaternion.setFromUnitVectors(tmp.set(0, -1, 0), tmp2);
        const r = len * 0.17;
        b.m.scale.set(r, len, r);
        b.pool.position.set(b.m.position.x + tmp2.x * len, 0.14 + i * 0.002, b.m.position.z + tmp2.z * len);
        b.pool.scale.setScalar(r * 0.75);
        const flick = party && beat.on ? (beat.n % 4 === i ? 1.6 : 0.8) : 1;
        b.m.material.opacity = (0.06 + 0.05 * U.clamp(p)) * flick;
        b.pool.material.opacity = 0.22 * flick;
        if (i < 2) {
          spots[i].target.position.set(b.pool.position.x, 0, b.pool.position.z);
          spots[i].position.copy(b.m.position);
        }
      });
    }

    function poseRobot(p, t, ft, beat) {
      const party = ft >= 0;
      const e = party ? 1 : U.range(p, 0.15, 1); // how into it the robot is
      const ph = beat.ph * Math.PI * 2;
      const bounce = party ? Math.abs(Math.sin(beat.ph * Math.PI)) * 0.25 : Math.abs(Math.sin(ph)) * 0.05 * (0.4 + e);
      hips.position.y = 1.1 + bounce - (party ? 0.08 : 0);
      hips.rotation.z = Math.sin(ph) * 0.06 * (0.5 + e);
      torso.rotation.y = Math.sin(ph * 0.5) * 0.25 * e;
      // waiting gag: every so often it checks its watch (less often as the party gets closer)
      const cyc = (t % 9) / 9;
      const check = party ? 0 : (cyc > 0.7 && cyc < 0.88 ? Math.sin(((cyc - 0.7) / 0.18) * Math.PI) : 0) * (1 - U.range(p, 0.75, 0.9));
      neck.rotation.set(check * 0.5 + (party ? Math.sin(ph * 2) * 0.15 : 0), Math.sin(t * 0.7) * 0.3 * (1 - e) - check * 0.3, Math.sin(ph) * 0.12 * e);
      // feet: one taps impatiently, then both groove
      legs.forEach((l, i) => {
        const tap = i === 1 && !party ? Math.max(0, Math.sin(t * 7)) * 0.25 * (1 - e) : 0;
        const step = Math.sin(ph + i * Math.PI) * 0.35 * e;
        l.thigh.rotation.x = -tap - Math.max(0, step);
        l.shin.rotation.x = tap * 1.2 + Math.max(0, step) * 1.4;
      });
      arms.forEach(a => {
        const sway = Math.sin(ph + (a.s > 0 ? Math.PI : 0)) * 0.4 * e;
        let ux = sway, uz = a.s * (0.12 + 0.2 * e), fx = -0.3 - 0.6 * e;
        if (a.s < 0 && check > 0) { ux = U.lerp(ux, -1.4, check); uz = U.lerp(uz, 0.5, check); fx = U.lerp(fx, -1.5, check); }
        if (party) {
          // the Saturday-night point: up to one corner, down across the other, swapping arms every beat
          const up = (beat.n + (a.s > 0 ? 0 : 1)) % 2 === 0;
          ux = 0; uz = up ? a.s * 2.5 : -a.s * 0.5;
          fx = 0;
          if (!up) { ux = -0.3; fx = -1.9; uz = a.s * 0.2; } // hand on hip
        }
        a.upper.rotation.set(ux, 0, uz);
        a.fore.rotation.set(fx, 0, 0);
      });
      const blink = (t % 3.7) < 0.12 ? 0.1 : 1;
      eyes.forEach(ey => ey.scale.set(1, party ? 1.4 + 0.4 * Math.sin(ph) : blink, 1));
      bulb.visible = Math.sin(t * (party ? 16 : 4)) > 0;
      chestLights.forEach((m, i) => { m.color.setHSL(((party ? beat.n * 0.25 : t * 0.2) + i * 0.33) % 1, 1, 0.55); });
    }

    function frameCamera(p, t, ft, beat) {
      const aspect = T.w / T.h;
      const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const halfW = 7.6, halfH = 6.4;
      const dist = Math.max(halfH / tanH, halfW / (tanH * aspect)) + 6;
      const party = ft >= 0;
      const az = Math.sin(t * 0.11) * 0.28 + (party ? Math.sin(ft * 0.6) * 0.3 : 0);
      const el = 0.36 + Math.sin(t * 0.07) * 0.04;
      const look = tmp.set(0, aspect < 1 ? 4 : 2.9, 0);
      const bob = party && beat.on ? Math.abs(Math.sin(beat.ph * Math.PI)) * 0.15 : 0;
      cam.position.set(look.x + Math.sin(az) * Math.cos(el) * dist, look.y + Math.sin(el) * dist - bob, look.z + Math.cos(az) * Math.cos(el) * dist);
      cam.lookAt(look);
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        if (!signRedrawn && t > 1.5) { signTex.redraw(); signRedrawn = true; }
        const beat = beatInfo(t, ft);
        updateFloor(p, t, ft, beat);
        updateBall(p, t, dt, ft);
        updateBeams(p, t, ft, beat);
        poseRobot(p, t, ft, beat);
        signM.opacity = Math.random() < 0.015 ? 0.3 : 1;

        // strobe on the off-beats while the music plays
        const strobe = beat.on && ft >= MUSIC && beat.ph > 0.5 && beat.ph < 0.62 ? 1 : 0;
        ambient.intensity = 0.55 + strobe * 3 + (ft >= 0 && ft < 0.25 ? 2.5 : 0);
        speakers.forEach(s => s.scale.setScalar(beat.on ? 1 + 0.25 * Math.max(0, 1 - beat.ph * 4) : 1));

        if (ft >= 0) {
          guests.forEach((gu, i) => {
            const k = U.easeOutElastic(U.clamp((ft - 0.6 - i * 0.15) / 0.8));
            gu.g.scale.setScalar(Math.max(0.001, k * 1.5));
            gu.g.position.y = 0.12 + Math.abs(Math.sin((beat.ph + i * 0.5) * Math.PI)) * 0.3;
            gu.ga.forEach((a, s) => { a.rotation.z = (s ? -1 : 1) * (2.6 + Math.sin(t * 9 + gu.ph + s) * 0.4); });
          });
          if (!shoutPainted) { shout.userData.tex.redraw(); shoutPainted = true; }
          const k = U.easeOutBack(U.clamp(ft / 0.5)) * (1 - U.range(ft, 7.5, 8.2));
          const pulse = 1 + (beat.on ? 0.08 * Math.max(0, 1 - beat.ph * 3) : 0);
          shout.position.set(0, BALL_LOW + 2.8, 0.5);
          const w = Math.min(1, T.w / T.h * 1.2);
          shout.scale.set(Math.max(0.001, 10 * k * pulse * w), Math.max(0.001, 2.5 * k * pulse * w), 1);
        }
        frameCamera(p, t, ft, beat);
        T.renderer.render(scene, cam);
      },

      finale() {
        // Three air horns: bwamp, bwamp, bwaaaamp.
        [[0, 0.22], [0.3, 0.22], [0.6, 0.55]].forEach(([at, dur]) => {
          [[466, 0], [470, 7], [349, -5]].forEach(([f, det]) => {
            sfx.tone({ f: f * 1.02, to: f, glide: 0.05, type: 'sawtooth', at, dur, vol: 0.1, attack: 0.01, release: 0.05, filter: 'lowpass', ff: 3200, detune: det, vib: { rate: 30, depth: 4 } });
          });
          sfx.noise({ at, dur, vol: 0.08, filter: 'bandpass', ff: 2200, q: 2, attack: 0.01, release: 0.05 });
        });
        // Four-on-the-floor with hats, claps and an octave bass line.
        const bass = ['A1', 'A1', 'F1', 'F1', 'G1', 'G1'];
        for (let b = 0; b < 12; b++) {
          const at = MUSIC + b * BEAT;
          sfx.tone({ f: 150, to: 45, glide: 0.12, at, dur: 0.28, vol: 0.5, attack: 0.002, release: 0.2 });
          sfx.noise({ at: at + BEAT / 2, dur: 0.05, vol: 0.12, filter: 'highpass', ff: 7000, attack: 0.002, release: 0.04 });
          if (b % 2) sfx.noise({ at, dur: 0.14, vol: 0.18, filter: 'bandpass', ff: 1500, q: 0.9, attack: 0.002, release: 0.12 });
          const root = sfx.note(bass[Math.floor(b / 2)]);
          [0, 1].forEach(h => {
            sfx.tone({ f: root * (h ? 2 : 1), at: at + h * BEAT / 2, dur: BEAT / 2 - 0.03, vol: 0.2, type: 'sawtooth', filter: 'lowpass', ff: 700, attack: 0.005, release: 0.06 });
          });
        }
      },

      destroy() {
        disposables.forEach(d => d.dispose && d.dispose());
        disposables.length = 0;
      },
    };
  },
});
