// A roller coaster creeps up an absurdly tall lift hill; at time-up it plunges down the drop and through a loop.
// Progress = how far up the lift hill the train has been dragged.
Minutka.register({
  id: 'coaster',
  name: 'The Lift Hill',
  emoji: '🎢',
  needs3d: true,
  create(stage, sfx) {
    const U = Minutka.util;
    const V3 = THREE.Vector3;
    const T = Minutka.three(stage);
    const R = U.rng(1884);
    const SKY = 0x8fd3ff;

    const disposables = [];
    const track = x => { disposables.push(x); return x; };

    T.renderer.setClearColor(SKY);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(SKY, 160, 420);
    const cam = new THREE.PerspectiveCamera(42, T.w / T.h, 0.5, 900);
    T.camera = cam;
    T.fit();

    scene.add(new THREE.HemisphereLight(0xdff3ff, 0x6a9a4a, 0.62));
    const sun = new THREE.DirectionalLight(0xfff4e0, 0.7);
    sun.position.set(-20, 40, 30);
    scene.add(sun);

    const lam = c => track(new THREE.MeshLambertMaterial({ color: c }));
    const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
    const basic = c => track(new THREE.MeshBasicMaterial({ color: c }));
    function canvasTex(w, h, draw) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const tex = track(new THREE.CanvasTexture(c));
      tex.redraw = () => { draw(c.getContext('2d'), w, h); tex.needsUpdate = true; };
      return tex;
    }

    // ------------------------------------------------------------ sky dome, ground
    const skyGeo = track(new THREE.SphereGeometry(400, 24, 16));
    const skyCol = new Float32Array(skyGeo.attributes.position.count * 3);
    const top = new THREE.Color(0x3a8ee8), hor = new THREE.Color(0xd8f1ff), c0 = new THREE.Color();
    for (let i = 0; i < skyGeo.attributes.position.count; i++) {
      const y = skyGeo.attributes.position.getY(i) / 400;
      c0.copy(hor).lerp(top, U.clamp(y * 1.6));
      skyCol[i * 3] = c0.r; skyCol[i * 3 + 1] = c0.g; skyCol[i * 3 + 2] = c0.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(skyCol, 3));
    const sky = new THREE.Mesh(skyGeo, track(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
    scene.add(sky);
    const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(700, 700, 28, 28)), lam(0x4f9e3a));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const path = new THREE.Mesh(track(new THREE.PlaneGeometry(90, 5)), lam(0xd9c08a));
    path.rotation.x = -Math.PI / 2;
    path.position.set(-10, 0.02, 7);
    scene.add(path);

    // ------------------------------------------------------------ the track
    const pts = [];
    const P = (x, y, z) => pts.push(new V3(x, y, z || 0));
    P(-34, 1); P(-28, 1); P(-23, 1); P(-20, 1.6); P(-17.5, 3.2);
    for (let k = 1; k <= 4; k++) P(-17.5 + k * 5.4, 3.2 + k * 5.4);   // the lift: a straight 45° ramp
    P(7, 26.4); P(9.3, 27.6); P(11.5, 27.3); P(13.6, 24.5);            // the crest
    P(15.6, 16); P(17.4, 7); P(19.6, 2.2); P(23, 1.1); P(28, 1.1);     // the drop
    const LC = new V3(33, 8.1, 0), LR = 6.6;
    for (let k = 1; k < 16; k++) {
      const a = -Math.PI / 2 + (k / 16) * Math.PI * 2;
      P(LC.x + Math.cos(a) * LR, LC.y + Math.sin(a) * LR, (k / 16) * 3);
    }
    P(38, 1.1, 3); P(46, 1.1, 3); P(62, 1.1, 3); P(80, 1.1, 3);
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    curve.arcLengthDivisions = 2000;
    const LEN = curve.getLength();
    const sAtX = x => { // arc length of the first point past x (coarse search, done once)
      for (let s = 0; s < LEN; s += 0.1) if (curve.getPointAt(s / LEN).x >= x) return s;
      return LEN;
    };
    const S_LIFT = sAtX(-17.5), S_CREST = sAtX(9.3), S_BRAKE = sAtX(41), S_END = sAtX(51);

    const tmp = new V3(), tmp2 = new V3(), tan = new V3(), nrm = new V3();
    const ZAX = new V3(0, 0, 1);
    function frameAt(s, pos, t, n) {
      const u = U.clamp(s / LEN);
      curve.getPointAt(u, pos);
      curve.getTangentAt(u, t);
      n.crossVectors(ZAX, t).normalize(); // track "up": the loop stays in the XY plane, so this never flips
      return pos;
    }

    // rails + spine
    const N = 900;
    const railPts = [[], [], []];
    for (let i = 0; i <= N; i++) {
      const s = (i / N) * LEN;
      frameAt(s, tmp, tan, nrm);
      railPts[0].push(tmp.clone().add(new V3(0, 0, -0.55)));
      railPts[1].push(tmp.clone().add(new V3(0, 0, 0.55)));
      railPts[2].push(tmp.clone().addScaledVector(nrm, -0.35));
    }
    const railM = track(new THREE.MeshPhongMaterial({ color: 0xe8322a, shininess: 60 }));
    const spineM = track(new THREE.MeshPhongMaterial({ color: 0xffc23d, shininess: 40 }));
    railPts.forEach((arr, i) => {
      const c = new THREE.CatmullRomCurve3(arr);
      scene.add(new THREE.Mesh(track(new THREE.TubeGeometry(c, N, i < 2 ? 0.11 : 0.2, 6, false)), i < 2 ? railM : spineM));
    });
    const dummy = new THREE.Object3D();
    const basis = new THREE.Matrix4();
    function orient(obj, s) {
      frameAt(s, obj.position, tan, nrm);
      tmp2.crossVectors(tan, nrm);
      basis.makeBasis(tan, nrm, tmp2);
      obj.quaternion.setFromRotationMatrix(basis);
    }
    const tieCount = Math.floor(LEN / 0.8);
    const ties = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.22, 0.14, 1.35)), lam(0x4a4f5a), tieCount);
    for (let i = 0; i < tieCount; i++) {
      orient(dummy, i * 0.8);
      dummy.position.addScaledVector(nrm, -0.12);
      dummy.updateMatrix();
      ties.setMatrixAt(i, dummy.matrix);
    }
    scene.add(ties);

    // supports: white lattice towers under the track
    const posts = [];
    for (let x = -15; x <= 20; x += 3.2) {
      const s = sAtX(x);
      frameAt(s, tmp, tan, nrm);
      if (tmp.y < 2) continue;
      posts.push([tmp.x, tmp.y - 0.4]);
    }
    [-0.2, 0.25, 0.6].forEach(a => {
      const x = LC.x + Math.cos(-Math.PI / 2 + a * Math.PI) * LR * 0.9;
      posts.push([x, 1.1]);
    });
    const postM = lam(0xf4f1ea);
    const postGeo = track(new THREE.CylinderGeometry(0.13, 0.16, 1, 6));
    const postMesh = new THREE.InstancedMesh(postGeo, postM, posts.length * 2);
    const braceMesh = new THREE.InstancedMesh(postGeo, postM, posts.length * 2);
    posts.forEach(([x, y], i) => {
      [-0.7, 0.7].forEach((z, j) => {
        dummy.position.set(x, y / 2, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, y, 1);
        dummy.updateMatrix();
        postMesh.setMatrixAt(i * 2 + j, dummy.matrix);
        // zig-zag braces between the two legs
        dummy.position.set(x, y * (0.3 + j * 0.4), 0);
        dummy.rotation.set(j ? 0.9 : -0.9, 0, 0);
        dummy.scale.set(0.5, 1.9, 0.5);
        dummy.updateMatrix();
        braceMesh.setMatrixAt(i * 2 + j, dummy.matrix);
      });
    });
    scene.add(postMesh, braceMesh);

    // the chain: dogs crawl up the lift
    const S_CHAIN0 = S_LIFT, S_CHAIN1 = sAtX(7);
    const DOGS = 44;
    const chain = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.4, 0.16, 0.24)), lam(0x2a2d33), DOGS);
    chain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(chain);
    let chainPhase = 0;

    // ------------------------------------------------------------ scenery
    function cloud(x, y, z, k) {
      const grp = new THREE.Group();
      const cm = lam(0xffffff);
      const r = U.rng(Math.floor(x * 13 + y * 7));
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(cloudGeo, cm);
        m.position.set((i - 2) * 1.6 * k, (r() - 0.3) * 1.2 * k, (r() - 0.5) * 1.5 * k);
        m.scale.setScalar(k * (1.2 + r() * 0.9) * (i === 2 ? 1.4 : 1));
        grp.add(m);
      }
      grp.position.set(x, y, z);
      scene.add(grp);
      return grp;
    }
    const cloudGeo = track(new THREE.SphereGeometry(1, 14, 10));
    const clouds = [
      cloud(-30, 30, -30, 2.2), cloud(-6, 17, -14, 1.6), cloud(24, 33, -40, 2.6), cloud(-46, 18, -50, 2.4),
      cloud(40, 22, -24, 1.8), cloud(4, 38, -60, 3), cloud(-20, 9, -26, 1.3),
    ];
    const cloudBase = clouds.map(c => c.position.x);

    // Ferris wheel
    const ferris = new THREE.Group();
    ferris.position.set(-30, 8.5, -26);
    scene.add(ferris);
    const wheel = new THREE.Group();
    ferris.add(wheel);
    wheel.add(new THREE.Mesh(track(new THREE.TorusGeometry(7, 0.18, 6, 40)), lam(0xff5fa2)));
    const spokeGeo = track(new THREE.CylinderGeometry(0.08, 0.08, 14, 4));
    const spokeM = lam(0xffffff);
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(spokeGeo, spokeM);
      sp.rotation.z = (i / 6) * Math.PI;
      wheel.add(sp);
    }
    const gondolas = [];
    const gondGeo = track(new THREE.BoxGeometry(1, 0.9, 0.9));
    const gondCols = [0xffd23a, 0x3d8bfd, 0x25b97a, 0xff7a1a, 0x9a6bc4, 0xe8322a];
    for (let i = 0; i < 12; i++) {
      const gd = new THREE.Mesh(gondGeo, lam(gondCols[i % gondCols.length]));
      wheel.add(gd);
      gondolas.push(gd);
    }
    const legGeo = track(new THREE.CylinderGeometry(0.2, 0.25, 10, 6));
    [-1, 1].forEach(s => {
      const leg = new THREE.Mesh(legGeo, spokeM);
      leg.position.set(s * 2.4, -4, 0);
      leg.rotation.z = s * 0.28;
      ferris.add(leg);
    });

    // carousel + striped tents
    const stripeTex = canvasTex(128, 32, (g, w, h) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#e8322a'; g.fillRect((i * w) / 8, 0, w / 8, h); }
    });
    const stripeTex2 = canvasTex(128, 32, (g, w, h) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffe9a8' : '#3d8bfd'; g.fillRect((i * w) / 8, 0, w / 8, h); }
    });
    const carousel = new THREE.Group();
    carousel.position.set(-27, 0, -7);
    scene.add(carousel);
    carousel.add(at(new THREE.Mesh(track(new THREE.CylinderGeometry(4, 4, 0.6, 24)), lam(0xffd23a)), 0, 0.3, 0));
    const roof = new THREE.Mesh(track(new THREE.ConeGeometry(4.6, 2.4, 24)), track(new THREE.MeshLambertMaterial({ map: stripeTex })));
    roof.position.y = 4.8;
    carousel.add(roof);
    carousel.add(at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.3, 0.3, 4, 8)), lam(0xffffff)), 0, 2.4, 0));
    const horses = [];
    const horseGeo = track(new THREE.BoxGeometry(1.1, 0.6, 0.35));
    for (let i = 0; i < 6; i++) {
      const hm = new THREE.Mesh(horseGeo, lam(gondCols[i]));
      carousel.add(hm);
      horses.push(hm);
    }
    [[-38, -4, 0], [-18, -12, 1], [-36, -16, 0]].forEach(([x, z, k]) => {
      const tent = new THREE.Group();
      tent.position.set(x, 0, z);
      tent.add(at(new THREE.Mesh(track(new THREE.CylinderGeometry(2.6, 2.6, 2.4, 16)), lam(0xfff3d6)), 0, 1.2, 0));
      const cone = new THREE.Mesh(track(new THREE.ConeGeometry(3.1, 2.8, 16)), track(new THREE.MeshLambertMaterial({ map: k ? stripeTex2 : stripeTex })));
      cone.position.y = 3.8;
      tent.add(cone);
      scene.add(tent);
    });
    // station hut at the start of the ride
    const station = new THREE.Group();
    station.position.set(-27, 0, 0);
    scene.add(station);
    station.add(at(new THREE.Mesh(track(new THREE.BoxGeometry(9, 0.8, 4)), lam(0xc9a06a)), 0, 0.4, -0.2));
    const stRoof = new THREE.Mesh(track(new THREE.BoxGeometry(10, 0.4, 4.6)), lam(0x3d8bfd));
    stRoof.position.set(0, 4.2, 0);
    station.add(stRoof);
    [[-4.4, -1.8], [4.4, -1.8], [-4.4, 1.8], [4.4, 1.8]].forEach(([x, z]) => {
      station.add(at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.15, 0.15, 4, 6)), lam(0xffffff)), x, 2, z));
    });

    // flags: crest + station + tents
    const flagGeo = track(new THREE.PlaneGeometry(1.4, 0.8));
    const poleGeo = track(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6));
    const flags = [];
    function flag(x, y, z, col) {
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      grp.add(at(new THREE.Mesh(poleGeo, lam(0xffffff)), 0, 1.2, 0));
      const f = new THREE.Mesh(flagGeo, track(new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })));
      f.position.set(0.7, 2.0, 0);
      const piv = new THREE.Group();
      piv.add(f);
      grp.add(piv);
      scene.add(grp);
      flags.push(piv);
    }
    flag(9.3, 28.2, -1.1, 0xffd23a);
    flag(-31, 4.4, 0, 0xe8322a);
    flag(-23, 4.4, 0, 0x25b97a);
    flag(-38, 5.2, -4, 0xff5fa2);
    flag(-18, 5.2, -12, 0xffd23a);

    // balloons drifting up from the fair
    const balloonGeo = track(new THREE.SphereGeometry(0.45, 12, 10));
    const balloons = Array.from({ length: 7 }, (_, i) => {
      const b = new THREE.Mesh(balloonGeo, track(new THREE.MeshPhongMaterial({ color: gondCols[i % 6], shininess: 80 })));
      b.scale.set(1, 1.2, 1);
      scene.add(b);
      return { m: b, x: -34 + R() * 26, z: -4 - R() * 10, ph: R() * 40, v: 0.6 + R() * 0.5 };
    });

    // sign at the foot of the lift
    const signTex = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#ffd23a';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1b1233';
      g.lineWidth = 16;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#1b1233';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '58px Bungee, sans-serif';
      g.fillText('YOU MUST BE', w / 2, h * 0.32);
      g.fillText('THIS BRAVE', w / 2, h * 0.68);
    });
    const sign = new THREE.Group();
    sign.position.set(-19, 0, 3.4);
    sign.rotation.y = -0.25;
    scene.add(sign);
    sign.add(at(new THREE.Mesh(track(new THREE.PlaneGeometry(5, 2.5)), track(new THREE.MeshLambertMaterial({ map: signTex, side: THREE.DoubleSide }))), 0, 4.2, 0));
    sign.add(at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.12, 0.12, 3, 6)), lam(0x8a5a32)), 0, 1.5, 0));
    let signRedrawn = false;

    // ------------------------------------------------------------ the train
    const CARS = 4, GAP = 2.15;
    const carCols = [0xe8322a, 0xffc23d, 0x3d8bfd, 0x25b97a];
    const skins = [0xf5c9a0, 0xc68a5a, 0x8d5a3b, 0xffdcb8];
    const hairs = [0x3a2a1a, 0xf2d06b, 0xa0401a, 0x1b1233, 0x6b4a2b];
    const carGeo = track(new THREE.BoxGeometry(1.9, 0.75, 1.3));
    const noseGeo = track(new THREE.CylinderGeometry(0.65, 0.65, 1.3, 16, 1, false, 0, Math.PI));
    const wheelGeo = track(new THREE.CylinderGeometry(0.2, 0.2, 0.15, 10));
    const torsoGeo = track(new THREE.CylinderGeometry(0.2, 0.25, 0.55, 8));
    const headGeo = track(new THREE.SphereGeometry(0.32, 14, 10));
    const hairGeo = track(new THREE.SphereGeometry(0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2));
    const eyeGeo = track(new THREE.SphereGeometry(0.055, 6, 6));
    const mouthGeo = track(new THREE.SphereGeometry(0.11, 10, 8));
    const armGeo = track(new THREE.BoxGeometry(0.13, 0.62, 0.13));
    const inkM = basic(0x1b1233);
    const mouthM = basic(0x5a1020);
    const darkM = lam(0x2a2d33);
    const shirtCols = [0xffffff, 0x9a6bc4, 0xff7a1a, 0x25b97a, 0xff5fa2, 0x3d8bfd, 0xffd23a, 0xe8322a];
    const cars = [];
    const riders = [];
    for (let c = 0; c < CARS; c++) {
      const car = new THREE.Group();
      scene.add(car);
      const body = new THREE.Mesh(carGeo, track(new THREE.MeshPhongMaterial({ color: carCols[c], shininess: 70 })));
      body.position.y = 0.6;
      car.add(body);
      if (c === 0) {
        const nose = new THREE.Mesh(noseGeo, body.material);
        nose.rotation.set(Math.PI / 2, 0, 0);
        nose.position.set(0.95, 0.6, 0);
        car.add(nose);
      }
      [[-0.65, -0.55], [0.65, -0.55], [-0.65, 0.55], [0.65, 0.55]].forEach(([x, z]) => {
        const w = new THREE.Mesh(wheelGeo, darkM);
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.18, z);
        car.add(w);
      });
      for (let k = 0; k < 2; k++) {
        const r = new THREE.Group();
        r.position.set(-0.1, 0.9, k ? 0.32 : -0.32);
        car.add(r);
        const i = c * 2 + k;
        r.add(at(new THREE.Mesh(torsoGeo, lam(shirtCols[i % shirtCols.length])), 0, 0.25, 0));
        const head = new THREE.Group();
        head.position.y = 0.82;
        r.add(head);
        head.add(new THREE.Mesh(headGeo, lam(skins[Math.floor(R() * skins.length)])));
        const hair = new THREE.Mesh(hairGeo, lam(hairs[Math.floor(R() * hairs.length)]));
        hair.rotation.z = 0.35; // swept back
        head.add(hair);
        [-0.12, 0.12].forEach(z => head.add(at(new THREE.Mesh(eyeGeo, inkM), 0.29, 0.06, z)));
        const mouth = new THREE.Mesh(mouthGeo, mouthM);
        mouth.position.set(0.28, -0.13, 0);
        mouth.scale.set(0.4, 0.3, 0.8);
        head.add(mouth);
        const arms = [-1, 1].map(s => {
          const piv = new THREE.Group();
          piv.position.set(0, 0.45, s * 0.24);
          const a = new THREE.Mesh(armGeo, lam(shirtCols[(i + 3) % shirtCols.length]));
          a.position.y = 0.31;
          piv.add(a);
          r.add(piv);
          return piv;
        });
        riders.push({ r, head, mouth, arms, ph: R() * 10, brave: R() });
      }
      cars.push(car);
    }
    // one rider wears a top hat. It will not survive the drop.
    const hat = new THREE.Group();
    hat.add(new THREE.Mesh(track(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 12)), inkM));
    hat.add(at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 14)), inkM), 0, -0.2, 0));
    hat.add(at(new THREE.Mesh(track(new THREE.CylinderGeometry(0.245, 0.245, 0.09, 12)), basic(0xe8322a)), 0, -0.1, 0));
    scene.add(hat);
    const hatState = { free: false, v: new V3(), spin: 0 };

    // Shout text, painted at finale time so the web font is ready.
    function makeShout(word) {
      const tex = canvasTex(1024, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.font = '170px Bungee, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 26;
        g.lineJoin = 'round';
        g.strokeStyle = '#1b1233';
        g.strokeText(word, w / 2, h / 2);
        g.fillStyle = '#ffd23a';
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
    const shout = makeShout('AAAAAH!'), again = makeShout('AGAIN!');
    let shoutsPainted = false;

    // ------------------------------------------------------------ motion
    let sFront = 0, vel = 0;
    const TRAIN = (CARS - 1) * GAP;
    const S0 = S_LIFT + TRAIN + 0.6, S1 = S_CREST - 1.2; // lift range of the front car

    function placeTrain(t, shake) {
      cars.forEach((car, c) => {
        orient(car, Math.max(0, sFront - c * GAP));
        car.position.addScaledVector(nrm, 0.25);
        if (shake) car.position.y += Math.sin(t * 40 + c) * shake;
      });
    }

    // pose: 0 = arms up (whee), 1 = white-knuckle grip
    function poseRiders(t, grip, scream, nerves, dizzy) {
      riders.forEach((rd, i) => {
        const g = U.clamp(grip * 1.6 - rd.brave * 0.6);
        rd.arms.forEach((piv, k) => {
          const wave = Math.sin(t * 5 + rd.ph + k) * 0.25 * (1 - g);
          piv.rotation.set((k ? -1 : 1) * (0.25 + wave) * (1 - g), 0, U.lerp(0, -2.0, g));
        });
        rd.head.rotation.set(Math.sin(t * 31 + i) * 0.12 * nerves + Math.sin(t * 6 + i) * 0.35 * dizzy, Math.sin(t * 2 + rd.ph) * 0.2 * (1 - nerves), Math.cos(t * 6 + i) * 0.35 * dizzy);
        rd.r.position.y = 0.9 + Math.abs(Math.sin(t * 3 + rd.ph)) * 0.06 * (1 - nerves) + Math.sin(t * 45 + i) * 0.02 * nerves;
        const m = Math.max(scream, nerves * 0.3);
        rd.mouth.scale.set(0.4 + m * 0.5, 0.3 + m * 1.6, 0.8);
      });
    }

    function updateHat(t, dt, release) {
      if (release && !hatState.free) {
        hatState.free = true;
        tmp.copy(tan).multiplyScalar(vel * 0.6);
        hatState.v.set(tmp.x, Math.max(4, tmp.y + 6), 1.5);
      }
      if (!hatState.free) {
        const head = riders[0].head;
        head.updateMatrixWorld(true);
        hat.position.set(0, 0.38, 0);
        head.localToWorld(hat.position);
        head.getWorldQuaternion(hat.quaternion);
        return;
      }
      // flutters down like a leaf
      hatState.v.y -= 3 * dt;
      hatState.v.multiplyScalar(1 - 1.4 * dt);
      hat.position.addScaledVector(hatState.v, dt);
      hat.position.x += Math.sin(t * 2.5) * 2 * dt;
      if (hat.position.y < 0.3) { hat.position.y = 0.3; hatState.v.set(0, 0, 0); }
      else hat.rotation.set(Math.sin(t * 3) * 0.6, t * 2, Math.cos(t * 2.3) * 0.5);
    }

    const camPos = new V3(), camLook = new V3(), wantPos = new V3(), wantLook = new V3(), chasePos = new V3(), chaseLook = new V3();
    let camInit = false;
    function frameCamera(p, t, dt, ft) {
      const aspect = T.w / T.h;
      const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const portrait = aspect < 1;
      const halfW = portrait ? 15.5 : 23, halfH = portrait ? 16 : 14.5;
      const dist = Math.max(halfH / tanH, halfW / (tanH * aspect)) + 6;
      wantLook.set(portrait ? -4.5 : -3, 13.5, 0);
      // drift a little toward the train as it nears the top
      frameAt(sFront, tmp, tan, nrm);
      const near = U.easeInOut(U.range(p, 0.75, 1)) * 0.45;
      wantLook.lerp(tmp, near);
      const az = -0.22 + Math.sin(t * 0.09) * 0.06, el = 0.12 + Math.sin(t * 0.07) * 0.03;
      const d = dist * (1 - near * 0.5);
      wantPos.set(wantLook.x + Math.sin(az) * Math.cos(el) * d, wantLook.y + Math.sin(el) * d, wantLook.z + Math.cos(az) * Math.cos(el) * d);
      if (ft >= 0) {
        // chase cam: alongside and a bit behind, swinging out wide for the loop
        frameAt(Math.max(0, sFront - GAP * 1.5), chaseLook, tan, nrm);
        const pull = 1 + 0.35 * U.easeInOut(U.range(ft, 6.5, 8.8)); // ease back once it has stopped
        chasePos.copy(chaseLook).add(tmp2.set(-5 - Math.min(vel, 20) * 0.25, 3 * pull, (15 + (portrait ? 10 : 0)) * pull));
        chasePos.y = Math.max(chasePos.y, 2);
        chaseLook.y += 2.5 * U.range(ft, 6.5, 8.8);
        const k = U.easeInOut(U.range(ft, 0.8, 2.2));
        wantPos.lerp(chasePos, k);
        wantLook.lerp(chaseLook, k);
      }
      if (!camInit) { camPos.copy(wantPos); camLook.copy(wantLook); camInit = true; }
      const f = ft >= 0 ? 1 - Math.exp(-dt * 5) : 1;
      camPos.lerp(wantPos, f);
      camLook.lerp(wantLook, f);
      cam.position.copy(camPos);
      cam.lookAt(camLook);
    }

    function physics(dt) {
      // gravity along the track, a little drag, then the brakes
      const steps = 4, h = dt / steps;
      for (let i = 0; i < steps; i++) {
        let slope = 0;
        for (let c = 0; c < CARS; c++) slope += frameAt(Math.max(0, sFront - c * GAP), tmp, tan, nrm) && tan.y / CARS;
        vel += (-16 * slope - 0.004 * vel * vel) * h;
        if (sFront > S_BRAKE) vel -= 9 * h;
        vel = Math.max(sFront > S_BRAKE ? 0 : 3, vel);
        sFront = Math.min(S_END, sFront + vel * h);
      }
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        if (!signRedrawn && t > 1.5) { signTex.redraw(); signRedrawn = true; }
        const fin = ft >= 0;
        const nerves = fin ? (ft < 1.6 ? 1 : 0) : U.range(p, 0.82, 0.98);
        let scream = 0, grip = U.range(p, 0.35, 0.95);

        if (!fin) {
          sFront = U.lerp(S0, S1, U.clamp(p));
          vel = 0;
        } else if (ft < 1.6) {
          // chain lets go, the train teeters over the crest... and pauses
          sFront = S1 + U.easeIn(U.clamp(ft / 1.6)) * 4;
          vel = 3;
          grip = 1;
        } else {
          physics(dt);
          grip = 0;
          scream = vel > 3 ? 0.8 + Math.sin(t * 20) * 0.2 : 0.2;
        }
        // chain keeps clacking until the finale
        chainPhase += dt * (fin ? Math.max(0, 1 - ft * 2) : 1) * 1.6;
        const chainLen = S_CHAIN1 - S_CHAIN0;
        for (let i = 0; i < DOGS; i++) {
          const s = S_CHAIN0 + ((((i / DOGS) * chainLen + chainPhase) % chainLen) + chainLen) % chainLen;
          orient(dummy, s);
          dummy.position.addScaledVector(nrm, -0.05);
          dummy.updateMatrix();
          chain.setMatrixAt(i, dummy.matrix);
        }
        chain.instanceMatrix.needsUpdate = true;

        placeTrain(t, fin ? 0 : nerves * 0.03);
        poseRiders(t, grip, scream, nerves, fin && vel < 0.5 && sFront > S_BRAKE ? 1 : 0);
        updateHat(t, dt, fin && ft > 2.0);

        // fairground idle
        wheel.rotation.z = t * 0.18;
        gondolas.forEach((gd, i) => {
          const a = (i / gondolas.length) * Math.PI * 2;
          gd.position.set(Math.cos(a) * 7, Math.sin(a) * 7 - 0.6, 0);
          gd.rotation.z = -wheel.rotation.z;
        });
        carousel.rotation.y = t * 0.6;
        horses.forEach((hm, i) => {
          const a = (i / horses.length) * Math.PI * 2;
          hm.position.set(Math.cos(a) * 3, 1.6 + Math.sin(t * 3 + i * 2) * 0.35, Math.sin(a) * 3);
          hm.rotation.y = -a;
        });
        flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 4 + i * 1.3) * 0.35; });
        clouds.forEach((c, i) => { c.position.x = cloudBase[i] + Math.sin(t * 0.03 + i) * 6; });
        balloons.forEach(b => {
          const y = ((t * b.v + b.ph) % 40);
          b.m.position.set(b.x + Math.sin(t * 0.8 + b.ph) * 0.8, y, b.z);
        });

        if (fin && ft > 1.6) {
          if (!shoutsPainted) { shout.userData.tex.redraw(); again.userData.tex.redraw(); shoutsPainted = true; }
        }

        frameCamera(p, t, dt, ft);
        if (fin) {
          // pinned near the top of the screen, whatever the camera does
          const k = U.easeOutBack(U.clamp((ft - 1.6) / 0.4)) * (1 - U.range(ft, 5.5, 6.2));
          cam.getWorldDirection(tmp);
          tmp2.set(0, 1, 0).applyQuaternion(cam.quaternion);
          shout.position.copy(cam.position).addScaledVector(tmp, 12).addScaledVector(tmp2, 3);
          const wob = (1 + Math.sin(ft * 25) * 0.05) * Math.min(1, (T.w / T.h) * 1.1);
          shout.scale.set(Math.max(0.001, 8 * k * wob), Math.max(0.001, 2 * k * wob), 1);
        }
        if (fin) {
          // ...and the riders want another go
          const k = U.easeOutBack(U.clamp((ft - 7) / 0.4));
          frameAt(sFront - TRAIN / 2, again.position, tan, nrm);
          again.position.y += 4.2 + Math.abs(Math.sin(ft * 6)) * 0.4;
          again.scale.set(Math.max(0.001, 10 * k), Math.max(0.001, 2.5 * k), 1);
        }
        T.renderer.render(scene, cam);
      },

      finale() {
        // The chain clacks slow down and stop...
        [0, 0.16, 0.36, 0.6, 0.9].forEach((at, i) => {
          sfx.noise({ at, dur: 0.05, vol: 0.32 - i * 0.04, filter: 'bandpass', ff: 1400, q: 3, attack: 0.002, release: 0.04 });
          sfx.tone({ f: 180, to: 90, at, dur: 0.07, vol: 0.2 - i * 0.03, type: 'square', filter: 'lowpass', ff: 800, attack: 0.002 });
        });
        // ...a pause at the top. Then the whoosh, the wind and everybody screaming.
        const d = 1.6;
        sfx.noise({ at: d, dur: 2.4, vol: 0.32, filter: 'bandpass', ff: 300, ffTo: 2600, q: 1.2, attack: 0.4, release: 0.6 });
        sfx.noise({ at: d + 0.3, dur: 3.6, vol: 0.2, filter: 'lowpass', ff: 700, ffTo: 300, attack: 0.5, release: 1.5 });
        [[560, 760], [660, 900], [820, 1050], [950, 1250], [480, 640]].forEach(([f, to], i) => {
          sfx.voice({
            f, to, glide: 0.5 + i * 0.1, at: d + 0.1 + i * 0.07, dur: 2.6 - i * 0.15, vol: 0.12,
            formants: [[1000 + i * 80, 1, 6], [1600 + i * 60, 0.6, 7], [3000, 0.3, 5]], vib: { rate: 7 + i * 1.5, depth: 25 + i * 6 },
          });
        });
        // A last "wheee!" out of the loop.
        sfx.voice({ f: 500, to: 1100, glide: 0.6, at: 4.6, dur: 0.9, vol: 0.14, formants: [[700, 1, 6], [2300, 0.6, 7], [3100, 0.3, 5]], vib: { rate: 6, depth: 15 } });
      },

      destroy() {
        disposables.forEach(d => d.dispose && d.dispose());
        disposables.length = 0;
      },
    };
  },
});
