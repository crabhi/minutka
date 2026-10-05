// A cartoon rocket flies from the Earth to a Moon with a face (and hits it right in the eye).
// Progress = how far along the dotted trajectory the rocket has flown.
Minutka.register({
  id: 'rocket',
  name: 'To The Moon',
  emoji: '🚀',
  needs3d: true,
  create(stage, sfx) {
    const U = Minutka.util;
    const V3 = THREE.Vector3;
    const T = Minutka.three(stage);
    const R = U.rng(1969);
    const BG = 0x0b0d2a;

    const disposables = [];
    const track = x => { disposables.push(x); return x; };
    const geo = x => track(x);
    const mat = x => track(x);

    T.renderer.setClearColor(BG);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    const cam = new THREE.PerspectiveCamera(40, T.w / T.h, 0.1, 600);
    T.camera = cam;
    T.fit();

    // ------------------------------------------------------------ textures
    function canvasTex(w, h, draw) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const tex = track(new THREE.CanvasTexture(c));
      tex.redraw = () => { c.getContext('2d').clearRect(0, 0, w, h); draw(c.getContext('2d'), w, h); tex.needsUpdate = true; };
      return tex;
    }
    const glowTex = canvasTex(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.3, 'rgba(255,255,255,0.65)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
    function blobs(g, w, h, n, rMin, rMax, color, yMin, yMax) {
      g.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const x = R() * w, y = h * (yMin + R() * (yMax - yMin)), r = rMin + R() * (rMax - rMin);
        for (let j = 0; j < 6; j++) {
          const bx = x + (R() - 0.5) * r * 1.6, by = y + (R() - 0.5) * r, br = r * (0.4 + R() * 0.5);
          [-w, 0, w].forEach(o => { g.beginPath(); g.arc(bx + o, by, br, 0, Math.PI * 2); g.fill(); });
        }
      }
    }
    const earthTex = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#1f6fd6';
      g.fillRect(0, 0, w, h);
      blobs(g, w, h, 9, 22, 46, '#35a845', 0.18, 0.82);
      blobs(g, w, h, 5, 10, 18, '#d9c27a', 0.3, 0.7);
      g.fillStyle = '#f4f8ff';
      g.fillRect(0, 0, w, h * 0.09);
      g.fillRect(0, h * 0.91, w, h * 0.09);
    });
    const cloudTex = canvasTex(512, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      blobs(g, w, h, 12, 8, 20, 'rgba(255,255,255,0.85)', 0.12, 0.88);
    });
    const moonTex = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#c4c4d2';
      g.fillRect(0, 0, w, h);
      blobs(g, w, h, 5, 18, 34, '#a9a9bb', 0.2, 0.8);
      for (let i = 0; i < 40; i++) {
        const x = R() * w, y = h * (0.1 + R() * 0.8), r = 4 + R() * 14;
        g.fillStyle = '#9696aa';
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#dadae6';
        g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.7, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#a4a4b8';
        g.beginPath(); g.arc(x, y, r * 0.6, 0, Math.PI * 2); g.fill();
      }
    });
    const flagTex = canvasTex(128, 88, (g, w, h) => {
      g.fillStyle = '#e8322a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd23a';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 14 : 32;
        g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + 3 + Math.sin(a) * r);
      }
      g.fill();
    });

    // ------------------------------------------------------------ lights
    scene.add(new THREE.AmbientLight(0x5866a0, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.15);
    sun.position.set(-6, 5, 10);
    scene.add(sun);
    const engineLight = new THREE.PointLight(0xff9a3a, 1.5, 9, 2);
    scene.add(engineLight);
    const flashLight = new THREE.PointLight(0xfff0c0, 0, 30, 1);
    scene.add(flashLight);

    // ------------------------------------------------------------ sky
    function starLayer(n, size, seed) {
      const r = U.rng(seed), pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const th = r() * Math.PI * 2, ph = Math.acos(r() * 2 - 1), d = 120 + r() * 80;
        pos[i * 3] = Math.sin(ph) * Math.cos(th) * d;
        pos[i * 3 + 1] = Math.cos(ph) * d;
        pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * d;
      }
      const gm = geo(new THREE.BufferGeometry());
      gm.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = mat(new THREE.PointsMaterial({ color: 0xffffff, size, map: glowTex, transparent: true, depthWrite: false, opacity: 1 }));
      const pts = new THREE.Points(gm, m);
      scene.add(pts);
      return m;
    }
    const starMats = [starLayer(500, 1.6, 1), starLayer(400, 2.2, 2), starLayer(250, 3, 3)];
    function nebula(x, y, z, s, color, op) {
      const m = mat(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
      const sp = new THREE.Sprite(m);
      sp.position.set(x, y, z);
      sp.scale.set(s, s * 0.6, 1);
      scene.add(sp);
    }
    nebula(-30, 25, -110, 120, 0x7a3cff, 0.35);
    nebula(40, -20, -120, 110, 0x1fb5c9, 0.25);

    // ------------------------------------------------------------ the trip
    const trip = new THREE.Group();
    scene.add(trip);
    const EARTH = new V3(-9.5, -2.5, 0), EARTH_R = 3.2;
    const MOON = new V3(9.5, 1.6, 0), MOON_R = 2.3;

    const earthPivot = new THREE.Group();
    earthPivot.position.copy(EARTH);
    trip.add(earthPivot);
    const earth = new THREE.Mesh(geo(new THREE.SphereGeometry(EARTH_R, 48, 32)), mat(new THREE.MeshPhongMaterial({ map: earthTex, shininess: 18, specular: 0x334466 })));
    earthPivot.add(earth);
    const clouds = new THREE.Mesh(geo(new THREE.SphereGeometry(EARTH_R * 1.03, 40, 28)), mat(new THREE.MeshLambertMaterial({ map: cloudTex, transparent: true, depthWrite: false })));
    earthPivot.add(clouds);
    const atmo = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: glowTex, color: 0x4aa8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));
    atmo.scale.set(EARTH_R * 3.4, EARTH_R * 3.4, 1);
    atmo.position.z = -1;
    earthPivot.add(atmo);

    const moonPivot = new THREE.Group();
    moonPivot.position.copy(MOON);
    trip.add(moonPivot);
    const moonBody = new THREE.Group(); // wobbles; carries the face
    moonPivot.add(moonBody);
    const moon = new THREE.Mesh(geo(new THREE.SphereGeometry(MOON_R, 48, 32)), mat(new THREE.MeshLambertMaterial({ map: moonTex })));
    moon.rotation.y = -Math.PI / 2;
    moonBody.add(moon);
    const moonGlow = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff3c8, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending })));
    moonGlow.scale.set(MOON_R * 3.2, MOON_R * 3.2, 1);
    moonGlow.position.z = -1;
    moonPivot.add(moonGlow);

    // Moon face. Features sit on the sphere, local +Z pointing outward.
    const Z = new V3(0, 0, 1);
    function onMoon(obj, dir, r) {
      const d = dir.clone().normalize();
      obj.position.copy(d).multiplyScalar(r);
      obj.quaternion.setFromUnitVectors(Z, d);
      moonBody.add(obj);
      return obj;
    }
    const whiteM = mat(new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 60 }));
    const inkM = mat(new THREE.MeshPhongMaterial({ color: 0x15102a, shininess: 80 }));
    const lipM = mat(new THREE.MeshLambertMaterial({ color: 0x5a2030 }));
    const eyeGeo = geo(new THREE.SphereGeometry(0.5, 24, 16));
    const pupilGeo = geo(new THREE.SphereGeometry(0.22, 16, 12));
    const browGeo = geo(new THREE.BoxGeometry(0.75, 0.14, 0.14));
    const eyes = [-1, 1].map(side => {
      const grp = onMoon(new THREE.Group(), new V3(side * 0.4, 0.3, 0.87), MOON_R * 0.96);
      const lid = new THREE.Group(); // scaled for blinks
      grp.add(lid);
      const white = new THREE.Mesh(eyeGeo, whiteM);
      white.scale.set(1, 1, 0.45);
      lid.add(white);
      const pupil = new THREE.Mesh(pupilGeo, inkM);
      pupil.scale.set(1, 1, 0.5);
      pupil.position.z = 0.2;
      lid.add(pupil);
      const brow = new THREE.Mesh(browGeo, inkM);
      brow.position.set(0, 0.72, 0.12);
      grp.add(brow);
      // dizzy X shown after the crash
      const x1 = new THREE.Mesh(browGeo, inkM), x2 = new THREE.Mesh(browGeo, inkM);
      x1.rotation.z = Math.PI / 4; x2.rotation.z = -Math.PI / 4;
      x1.position.z = x2.position.z = 0.15;
      const xs = new THREE.Group();
      xs.add(x1, x2);
      xs.visible = false;
      grp.add(xs);
      return { grp, lid, pupil, brow, xs, side };
    });
    const smile = onMoon(new THREE.Mesh(geo(new THREE.TorusGeometry(0.55, 0.1, 10, 28, Math.PI)), inkM), new V3(0, -0.36, 0.93), MOON_R * 0.98);
    const smileArc = smile; // rotate so the arc hangs downward
    smileArc.rotateZ(Math.PI);
    const oMouth = onMoon(new THREE.Group(), new V3(0, -0.4, 0.92), MOON_R * 0.97);
    oMouth.add(new THREE.Mesh(geo(new THREE.TorusGeometry(0.32, 0.09, 10, 24)), inkM));
    oMouth.add(new THREE.Mesh(geo(new THREE.CircleGeometry(0.33, 24)), lipM));
    const sweat = onMoon(new THREE.Mesh(geo(new THREE.SphereGeometry(0.16, 12, 10)), mat(new THREE.MeshPhongMaterial({ color: 0x8fd6ff, shininess: 90 }))), new V3(0.75, 0.45, 0.5), MOON_R);
    sweat.scale.set(1, 1.5, 1);

    // The bump that swells on its head after the crash, with a flag on top.
    const bumpDir = new V3(0.25, 1, 0.35).normalize();
    const bump = onMoon(new THREE.Mesh(geo(new THREE.SphereGeometry(1, 24, 16)), mat(new THREE.MeshLambertMaterial({ color: 0xd9b0b4 }))), bumpDir, MOON_R * 0.9);
    bump.scale.setScalar(0.001);
    const flag = onMoon(new THREE.Group(), bumpDir, MOON_R * 0.9);
    flag.rotateX(Math.PI / 2); // local +Y now points outward along bumpDir
    const flagInner = new THREE.Group();
    flag.add(flagInner);
    const pole = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8)), mat(new THREE.MeshPhongMaterial({ color: 0xdddddd })));
    pole.position.y = 0.75;
    flagInner.add(pole);
    const cloth = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.9, 0.62, 6, 1)), mat(new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide })));
    cloth.position.set(0.47, 1.18, 0);
    flagInner.add(cloth);
    flagInner.scale.setScalar(0.001);
    const clothPos = cloth.geometry.attributes.position;
    const clothX = Float32Array.from({ length: clothPos.count }, (_, i) => clothPos.getX(i));

    // dizzy stars circling the Moon's head
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.13 : 0.32;
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const dizzyGeo = geo(new THREE.ShapeGeometry(starShape));
    const dizzyM = mat(new THREE.MeshBasicMaterial({ color: 0xffd23a, side: THREE.DoubleSide }));
    const dizzy = Array.from({ length: 5 }, () => {
      const m = new THREE.Mesh(dizzyGeo, dizzyM);
      m.scale.setScalar(0.001);
      moonPivot.add(m);
      return m;
    });

    // ------------------------------------------------------------ rocket
    const rocket = new THREE.Group();
    const rocketInner = new THREE.Group(); // wobble + roll
    rocket.add(rocketInner);
    rocket.scale.setScalar(1.15);
    scene.add(rocket);
    const redM = mat(new THREE.MeshPhongMaterial({ color: 0xe8322a, shininess: 50 }));
    const hullM = mat(new THREE.MeshPhongMaterial({ color: 0xf4f4f8, shininess: 70 }));
    const greyM = mat(new THREE.MeshPhongMaterial({ color: 0x555a66 }));
    const add = (parent, g2, m, x, y, z) => { const o = new THREE.Mesh(g2, m); o.position.set(x, y, z); parent.add(o); return o; };
    add(rocketInner, geo(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 24)), hullM, 0, 0, 0);
    add(rocketInner, geo(new THREE.CylinderGeometry(0.505, 0.52, 0.22, 24)), redM, 0, -0.55, 0);
    add(rocketInner, geo(new THREE.ConeGeometry(0.42, 0.85, 24)), redM, 0, 1.17, 0);
    add(rocketInner, geo(new THREE.CylinderGeometry(0.26, 0.36, 0.28, 16)), greyM, 0, -0.88, 0);
    const port = add(rocketInner, geo(new THREE.TorusGeometry(0.24, 0.06, 8, 20)), greyM, 0, 0.3, 0.44);
    void port;
    add(rocketInner, geo(new THREE.CircleGeometry(0.24, 20)), mat(new THREE.MeshPhongMaterial({ color: 0x7fd3ff, emissive: 0x1a4060, shininess: 100 })), 0, 0.3, 0.45);
    // a passenger peeking out of the porthole
    const peekGeo = geo(new THREE.SphereGeometry(0.06, 10, 8));
    const peeks = [-1, 1].map(s => add(rocketInner, peekGeo, inkM, s * 0.08, 0.32, 0.47));
    const finGeo = geo(new THREE.BoxGeometry(0.08, 0.7, 0.5));
    for (let i = 0; i < 3; i++) {
      const piv = new THREE.Group();
      piv.rotation.y = i * Math.PI * 2 / 3 + Math.PI / 6;
      const fin = add(piv, finGeo, redM, 0, -0.6, 0.55);
      fin.rotation.x = 0.35;
      rocketInner.add(piv);
    }
    const flameOuterM = mat(new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    const flameInnerM = mat(new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    const flameGeo = geo(new THREE.ConeGeometry(0.3, 1.3, 16, 1, true));
    const flame = add(rocketInner, flameGeo, flameOuterM, 0, -1.65, 0);
    flame.rotation.x = Math.PI;
    const flameIn = add(rocketInner, flameGeo, flameInnerM, 0, -1.4, 0);
    flameIn.rotation.x = Math.PI;
    flameIn.scale.set(0.55, 0.6, 0.55);

    // ------------------------------------------------------------ particles
    function pointPool(n, size, additive) {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) pos[i * 3 + 1] = -9999;
      const gm = geo(new THREE.BufferGeometry());
      gm.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      gm.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
      const m = mat(new THREE.PointsMaterial({
        size, map: glowTex, vertexColors: true, transparent: true, depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }));
      const pts = new THREE.Points(gm, m);
      pts.frustumCulled = false;
      scene.add(pts);
      return { n, pos, col, gm, vel: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n).fill(1), next: 0 };
    }
    const fire = pointPool(260, 0.75, true);
    const smoke = pointPool(90, 1.1, false);
    const bgCol = new THREE.Color(BG);

    function emit(P, at, vel, spread, life) {
      const i = P.next;
      P.next = (P.next + 1) % P.n;
      P.pos[i * 3] = at.x; P.pos[i * 3 + 1] = at.y; P.pos[i * 3 + 2] = at.z;
      P.vel[i * 3] = vel.x + (Math.random() - 0.5) * spread;
      P.vel[i * 3 + 1] = vel.y + (Math.random() - 0.5) * spread;
      P.vel[i * 3 + 2] = vel.z + (Math.random() - 0.5) * spread;
      P.life[i] = 0;
      P.max[i] = life * (0.7 + Math.random() * 0.6);
    }
    function stepPool(P, dt, colorAt) {
      for (let i = 0; i < P.n; i++) {
        if (P.life[i] >= P.max[i]) { P.pos[i * 3 + 1] = -9999; continue; }
        P.life[i] += dt;
        const k = Math.min(1, P.life[i] / P.max[i]);
        P.pos[i * 3] += P.vel[i * 3] * dt;
        P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt;
        P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
        colorAt(k, P.col, i * 3);
      }
      P.gm.attributes.position.needsUpdate = true;
      P.gm.attributes.color.needsUpdate = true;
    }
    const fireColor = (k, c, j) => {
      const f = 1 - k;
      c[j] = f; c[j + 1] = f * f * 0.85; c[j + 2] = f * f * f * 0.4;
    };
    const smokeColor = (k, c, j) => {
      const v = 0.45 * (1 - k);
      c[j] = bgCol.r + v; c[j + 1] = bgCol.g + v; c[j + 2] = bgCol.b + v;
    };

    // Debris + dust ring for the crash.
    const debrisN = 28;
    const debris = new THREE.InstancedMesh(geo(new THREE.IcosahedronGeometry(0.16, 0)), mat(new THREE.MeshLambertMaterial({ color: 0xa8a8b8 })), debrisN);
    debris.frustumCulled = false;
    debris.visible = false; // until the crash
    scene.add(debris);
    const debrisState = Array.from({ length: debrisN }, () => ({ p: new V3(), v: new V3(), s: 0, spin: new V3() }));
    const dummy = new THREE.Object3D();
    const dustM = mat(new THREE.MeshBasicMaterial({ color: 0xe8e2d0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    const dustRing = new THREE.Mesh(geo(new THREE.RingGeometry(0.7, 1.15, 48)), dustM);
    scene.add(dustRing);
    const flashSprite = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff4d0, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })));
    flashSprite.renderOrder = 5;
    scene.add(flashSprite);

    // trajectory dots: bright behind the rocket, faint ahead
    const DOTS = 110;
    const dotPos = new Float32Array(DOTS * 3), dotCol = new Float32Array(DOTS * 3);
    const dotGeo = geo(new THREE.BufferGeometry());
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
    dotGeo.setAttribute('color', new THREE.BufferAttribute(dotCol, 3).setUsage(THREE.DynamicDrawUsage));
    const dots = new THREE.Points(dotGeo, mat(new THREE.PointsMaterial({ size: 0.42, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    dots.frustumCulled = false;
    trip.add(dots);

    // Shout text, painted at finale time so the web font is ready.
    function makeText(word) {
      const tex = canvasTex(1024, 256, (g, w, h) => {
        g.font = '150px Bungee, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 26;
        g.lineJoin = 'round';
        g.strokeStyle = '#1b1233';
        g.strokeText(word, w / 2, h / 2);
        g.fillStyle = '#ffd23a';
        g.fillText(word, w / 2, h / 2);
      });
      const sp = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })));
      sp.renderOrder = 10;
      sp.scale.set(0.001, 0.001, 1);
      scene.add(sp);
      return { sp, tex };
    }
    // made up front (no first-use hitch at the payoff); repainted at the crash so the web font is ready
    const { sp: textSprite, tex: textTex } = makeText('KA-THUNK!');

    // ------------------------------------------------------------ layout
    let portrait = null, curve = null, impact = new V3(), impactN = new V3(), endTan = new V3();
    const tripCenter = new V3(-0.3, 0.6, 0);
    function relayout(isPortrait) {
      portrait = isPortrait;
      const rot = portrait ? Math.PI / 2 : 0;
      trip.rotation.z = rot;
      earthPivot.rotation.set(0, 0, -rot + 0.35);
      moonPivot.rotation.set(0, 0, -rot);
      trip.updateMatrixWorld(true);
      // start on the Earth, end right in the Moon's left eye (all in trip coordinates)
      const n0 = new V3(Math.cos(0.95), Math.sin(0.95), 0.12).normalize();
      const start = EARTH.clone().addScaledVector(n0, EARTH_R + 0.05);
      const eyeW = eyes[0].grp.getWorldPosition(new V3());
      const eyeT = trip.worldToLocal(eyeW);
      impactN.copy(eyeT).sub(MOON).normalize();
      impact.copy(MOON).addScaledVector(impactN, MOON_R * 0.97);
      const end = impact.clone().addScaledVector(impactN, 1.75); // rocket centre when the nose touches
      const toEarth = EARTH.clone().sub(end).normalize();
      curve = new THREE.CubicBezierCurve3(
        start.clone().addScaledVector(n0, 1.4),
        start.clone().addScaledVector(n0, 9),
        end.clone().addScaledVector(impactN, 6.5).addScaledVector(toEarth, 3).add(new V3(0, 1.5, 0)),
        end,
      );
      curve.arcLengthDivisions = 400;
      curve.updateArcLengths();
      for (let i = 0; i < DOTS; i++) {
        const q = curve.getPointAt(i / (DOTS - 1));
        dotPos[i * 3] = q.x; dotPos[i * 3 + 1] = q.y; dotPos[i * 3 + 2] = q.z;
      }
      dotGeo.attributes.position.needsUpdate = true;
      curve.getTangentAt(1, endTan);
    }

    // ------------------------------------------------------------ per-frame helpers
    const tmp = new V3(), tmp2 = new V3(), nozzle = new V3(), rocketPos = new V3(), tan = new V3();
    const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), Y = new V3(0, 1, 0);
    const camTarget = new V3(), moonW = new V3(), scratch = new V3();
    let emitAcc = 0, smokeAcc = 0, blinkT = 3, crashed = false, flagged = false;
    const IMPACT = 0.5;

    function tripToWorld(v, out) { return out.copy(v).applyMatrix4(trip.matrixWorld); }

    function placeRocket(p, t, ft) {
      const fin = ft >= 0;
      const oc = fin ? 1 : U.range(p, 0.86, 1); // out of control
      let u = U.clamp(p) * 0.93;
      if (fin) u = 0.93 + 0.07 * Math.pow(Math.min(1, ft / IMPACT), 2);
      curve.getPointAt(u, tmp);
      curve.getTangentAt(u, tan);
      if (fin && ft >= IMPACT) {
        // stuck in the eye, nose first; the tail still twitches
        const sink = Math.min(1, (ft - IMPACT) / 0.08) * 0.75;
        tmp.copy(curve.getPointAt(1, tmp)).addScaledVector(endTan, sink);
        tan.copy(endTan);
      }
      // wander off course as it loses control
      tmp2.set(-tan.y, tan.x, 0).normalize();
      if (!(fin && ft >= IMPACT)) {
        tmp.addScaledVector(tmp2, Math.sin(t * 6.3) * 0.45 * oc + Math.sin(t * 1.7) * 0.08);
        tmp.z += Math.sin(t * 4.1) * 0.3 * oc;
      }
      tripToWorld(tmp, rocketPos);
      rocket.position.copy(rocketPos);
      tan.transformDirection(trip.matrixWorld);
      qA.setFromUnitVectors(Y, tan);
      rocket.quaternion.copy(qA);
      const stuck = fin && ft >= IMPACT;
      const twitch = stuck ? Math.sin(ft * 30) * 0.12 * Math.exp(-(ft - IMPACT) * 1.5) : 0;
      rocketInner.rotation.set(
        Math.sin(t * 2.3) * 0.05 + Math.sin(t * 8.7) * 0.35 * oc * (stuck ? 0 : 1) + twitch,
        stuck ? rocketInner.rotation.y : t * (0.6 + oc * 9),
        Math.sin(t * 1.9) * 0.06 + Math.sin(t * 7.1) * 0.4 * oc * (stuck ? 0 : 1),
      );
      return oc;
    }

    function exhaust(dt, t, oc, ft) {
      const stuck = ft >= IMPACT;
      // sputters as it loses control, dies after the crash
      const gate = oc > 0 ? (Math.sin(t * 17) + Math.sin(t * 9.3) > 1.6 * oc - 0.6 ? 1 : 0) : 1;
      const on = stuck ? 0 : gate;
      rocket.updateMatrixWorld(true);
      nozzle.set(0, -1.05, 0);
      rocketInner.localToWorld(nozzle);
      tmp.set(0, -1, 0).applyQuaternion(rocketInner.getWorldQuaternion(qB)).multiplyScalar(5);
      emitAcc += dt * 110 * on;
      while (emitAcc > 1) { emitAcc -= 1; emit(fire, nozzle, tmp, 1.6, 0.55); }
      const smokeRate = stuck ? 14 * Math.exp(-(ft - IMPACT) * 0.35) : oc * 18 * (1 - on);
      smokeAcc += dt * smokeRate;
      while (smokeAcc > 1) { smokeAcc -= 1; emit(smoke, nozzle, tmp2.copy(tmp).multiplyScalar(stuck ? -0.15 : 0.3), 1.2, 2.2); }
      stepPool(fire, dt, fireColor);
      stepPool(smoke, dt, smokeColor);
      const fl = on * (0.85 + Math.random() * 0.3);
      flame.scale.set(fl, fl * (0.9 + Math.random() * 0.4), fl);
      flameIn.scale.set(0.55 * fl, 0.6 * fl, 0.55 * fl);
      flame.visible = flameIn.visible = fl > 0.01;
      engineLight.position.copy(nozzle);
      engineLight.intensity = 1.6 * fl;
    }

    function trail(p, ft) {
      const u = ft >= 0 ? 1 : U.clamp(p) * 0.93;
      for (let i = 0; i < DOTS; i++) {
        const q = i / (DOTS - 1), j = i * 3;
        if (q <= u) { dotCol[j] = 1; dotCol[j + 1] = 0.82; dotCol[j + 2] = 0.45; } else { dotCol[j] = 0.2; dotCol[j + 1] = 0.26; dotCol[j + 2] = 0.48; }
      }
      dotGeo.attributes.color.needsUpdate = true;
    }

    function moonFace(p, t, dt, ft) {
      const fin = ft >= 0, after = fin ? ft - IMPACT : -1;
      const fear = fin ? 1 : U.range(p, 0.7, 0.96);
      // wobble: gentle rocking, jelly after the hit
      const jelly = after > 0 ? Math.sin(after * 22) * 0.13 * Math.exp(-after * 2.2) : 0;
      moonBody.rotation.set(Math.sin(t * 0.5) * 0.05 * (fin ? 0 : 1), Math.sin(t * 0.37) * 0.08 * (fin ? 0 : 1), Math.sin(t * 0.8) * 0.04 * (fin ? 0 : 1));
      moonBody.scale.set(1 + jelly, 1 - jelly, 1 + jelly * 0.5);
      // blink
      blinkT -= dt;
      if (blinkT < -0.14) blinkT = 2.5 + Math.random() * 3;
      const blink = blinkT < 0 && fear < 0.6 ? 0.1 : 1;
      rocket.getWorldPosition(tmp);
      eyes.forEach(e => {
        const hit = after > 0 && e.side < 0;
        e.lid.visible = !hit;
        e.xs.visible = after > 0 && after < 4.5 && e.side > 0;
        if (e.xs.visible) e.xs.rotation.z = after * 6;
        if (e.side > 0 && after > 0) e.lid.visible = after >= 4.5;
        const wide = 1 + fear * 0.35;
        e.lid.scale.set(wide, wide * (after >= 4.5 ? 0.35 : blink), wide);
        // pupils follow the rocket
        e.grp.worldToLocal(tmp2.copy(tmp));
        tmp2.z = 0;
        if (tmp2.lengthSq() > 1e-6) tmp2.normalize();
        e.pupil.position.set(tmp2.x * 0.24, tmp2.y * 0.24, 0.22);
        e.pupil.scale.set(1 - fear * 0.4, 1 - fear * 0.4, 0.5);
        e.brow.position.y = 0.72 + fear * 0.25;
        e.brow.rotation.z = -e.side * (0.1 + fear * 0.35);
      });
      const oSize = after > 0 ? 1.1 + Math.sin(after * 9) * 0.15 : fear;
      smile.visible = oSize < 0.35;
      oMouth.visible = !smile.visible;
      oMouth.scale.set(0.6 + oSize * 0.5, 0.6 + oSize * 0.7, 1);
      // sweat slides down the cheek when it gets close
      const sw = U.range(p, 0.82, 0.9);
      sweat.visible = sw > 0 && !(after > 1);
      const q = (t * 0.7) % 1;
      onMoonMove(sweat, scratch.set(0.78, 0.45 - q * 0.7, 0.5), MOON_R * (1 + 0.02 * sw));
      sweat.scale.set(sw, sw * 1.5, sw);
    }
    function onMoonMove(obj, dir, r) {
      dir.normalize();
      obj.position.copy(dir).multiplyScalar(r);
      obj.quaternion.setFromUnitVectors(Z, dir);
    }

    function crashFx(ft, dt, t) {
      const after = ft - IMPACT;
      tripToWorld(impact, tmp);
      if (!crashed && after >= 0) {
        crashed = true;
        const nW = impactN.clone().transformDirection(trip.matrixWorld);
        debrisState.forEach(d => {
          d.p.copy(tmp);
          d.v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(7).addScaledVector(nW, 4 + Math.random() * 5);
          d.s = 0.6 + Math.random() * 1.4;
          d.spin.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        });
        dustRing.position.copy(tmp).addScaledVector(nW, 0.1);
        dustRing.lookAt(tmp2.copy(dustRing.position).add(nW));
        debris.visible = true;
        textTex.redraw();
      }
      if (after < 0) return;
      debrisState.forEach((d, i) => {
        d.p.addScaledVector(d.v, dt);
        d.v.multiplyScalar(1 - 0.6 * dt);
        const s = d.s * Math.max(0, 1 - after / 5);
        dummy.position.copy(d.p);
        dummy.rotation.set(d.spin.x * after, d.spin.y * after, d.spin.z * after);
        dummy.scale.setScalar(Math.max(0.001, s));
        dummy.updateMatrix();
        debris.setMatrixAt(i, dummy.matrix);
      });
      debris.instanceMatrix.needsUpdate = true;
      const r = U.easeOut(U.clamp(after / 1.6));
      dustRing.scale.setScalar(0.3 + r * 4.5);
      dustM.opacity = 0.85 * (1 - r);
      const fl = Math.max(0, 1 - after / 0.6);
      flashSprite.position.copy(tmp);
      flashSprite.scale.setScalar(2 + (1 - fl) * 14);
      flashSprite.material.opacity = fl;
      flashLight.position.copy(tmp).addScaledVector(impactN, 2);
      flashLight.intensity = 5 * fl;
      {
        const k = U.easeOutBack(U.clamp(after / 0.45)) * (1 - U.range(after, 6.5, 7.3));
        moonPivot.getWorldPosition(tmp2);
        const up = portrait ? 3.3 : 3.1;
        textSprite.position.set(tmp2.x - (portrait ? 0 : 2.2), tmp2.y + up, tmp2.z + 2);
        const wob = 1 + Math.sin(after * 14) * 0.04 * Math.exp(-after);
        textSprite.scale.set(Math.max(0.001, 7 * k * wob), Math.max(0.001, 1.75 * k * wob), 1);
        textSprite.material.rotation = 0.08 + Math.sin(after * 3) * 0.04;
      }
      // the bump swells, then the flag pops up on top of it
      const b = U.easeOutElastic(U.clamp((after - 1.3) / 1.2));
      bump.scale.setScalar(Math.max(0.001, b * 0.75));
      onMoonMove(bump, scratch.copy(bumpDir), MOON_R * 0.88);
      const fpop = U.easeOutElastic(U.clamp((after - 2.4) / 1));
      onMoonMove(flag, scratch.copy(bumpDir), MOON_R * 0.88 + b * 0.68);
      flag.rotateX(Math.PI / 2);
      flagInner.scale.setScalar(Math.max(0.001, fpop));
      if (after > 2.4) flagged = true;
      for (let i = 0; i < clothPos.count; i++) {
        const x = clothX[i] + 0.45;
        clothPos.setZ(i, Math.sin(x * 6 - t * 7) * 0.08 * x);
      }
      clothPos.needsUpdate = true;
      // dizzy stars
      const dz = U.range(after, 0.5, 1.2) * (1 - U.range(after, 8.5, 9.5));
      dizzy.forEach((m, i) => {
        const a = after * 2.6 + (i / dizzy.length) * Math.PI * 2;
        m.position.set(Math.cos(a) * MOON_R * 0.95, MOON_R * 1.05 + Math.sin(a) * 0.35, Math.sin(a) * MOON_R * 0.9 + 0.3);
        m.rotation.z = after * 4 + i;
        m.scale.setScalar(Math.max(0.001, dz));
      });
    }

    function frameCamera(p, t, ft) {
      const aspect = T.w / T.h;
      const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const halfW = portrait ? 7.4 : 13.8, halfH = portrait ? 13.8 : 7.6;
      const fit = Math.max(halfH / tanH, halfW / (tanH * aspect));
      tripToWorld(tripCenter, camTarget);
      moonPivot.getWorldPosition(moonW);
      // the Moon looms as the rocket closes in; the camera stays close for the crash, then eases back
      let loom = U.easeInOut(U.range(p, 0.86, 1));
      if (ft >= 0) loom = 1 - 0.3 * U.easeInOut(U.range(ft, 3, 7));
      tmp.copy(moonW).lerp(rocket.position, 0.3);
      if (ft >= 0) tmp.copy(moonW).add(tmp2.set(0, 0.8, 0));
      camTarget.lerp(tmp, loom * 0.9);
      const minFit = Math.max(4.6 / tanH, 4.2 / (tanH * aspect));
      const dist = U.lerp(fit, minFit, loom);
      const az = Math.sin(t * 0.06) * 0.16 - loom * 0.25, el = 0.1 + Math.sin(t * 0.045) * 0.05 + loom * 0.05;
      cam.position.set(camTarget.x + Math.sin(az) * Math.cos(el) * dist, camTarget.y + Math.sin(el) * dist, camTarget.z + Math.cos(az) * Math.cos(el) * dist);
      const shake = ft >= IMPACT ? 0.5 * Math.exp(-(ft - IMPACT) * 3) : 0;
      cam.position.x += (Math.random() - 0.5) * shake;
      cam.position.y += (Math.random() - 0.5) * shake;
      cam.lookAt(camTarget);
    }

    // ------------------------------------------------------------ contract
    return {
      update(p, t, dt, ft) {
        const isPortrait = T.h > T.w * 1.05;
        if (isPortrait !== portrait) relayout(isPortrait);
        earth.rotation.y += dt * 0.18;
        clouds.rotation.y += dt * 0.26;
        starMats.forEach((m, i) => { m.opacity = 0.55 + 0.45 * Math.sin(t * (1.3 + i * 0.7) + i * 2); });
        const oc = placeRocket(p, t, ft);
        peeks.forEach(e => e.scale.setScalar(1 + oc * 0.8));
        exhaust(dt, t, oc, ft);
        trail(p, ft);
        moonFace(p, t, dt, ft);
        if (ft >= 0) crashFx(ft, dt, t);
        frameCamera(p, t, ft);
        T.renderer.render(scene, cam);
      },

      finale() {
        // Thruster rumble with a sputtering engine...
        sfx.noise({ at: 0, dur: 0.55, vol: 0.32, filter: 'lowpass', ff: 380, ffTo: 900, attack: 0.02, release: 0.05 });
        sfx.tone({ f: 55, to: 90, at: 0, dur: 0.5, vol: 0.18, type: 'sawtooth', filter: 'lowpass', ff: 300, attack: 0.02 });
        [0.08, 0.19, 0.27, 0.38, 0.44].forEach((at, i) => sfx.pop({ at, vol: 0.25 + i * 0.03, f: 300 + i * 90 }));
        // ...the crash...
        sfx.boom({ at: IMPACT, vol: 0.6, dur: 2 });
        sfx.tone({ f: 220, to: 70, at: IMPACT, dur: 0.35, vol: 0.3, type: 'square', filter: 'lowpass', ff: 900, attack: 0.002 });
        // ...the Moon says "oof"...
        sfx.voice({ f: 260, to: 170, glide: 0.5, at: IMPACT + 0.35, dur: 0.6, vol: 0.28, formants: [[450, 1, 6], [800, 0.6, 7], [2600, 0.15, 5]] });
        // ...and the flag pops up: boing!
        const b = IMPACT + 2.4;
        sfx.tone({ f: 140, to: 620, glide: 0.18, at: b, dur: 0.7, vol: 0.3, type: 'triangle', vib: { rate: 16, depth: 40 }, release: 0.4 });
        sfx.tone({ f: 280, to: 1240, glide: 0.18, at: b, dur: 0.5, vol: 0.08, type: 'sine', vib: { rate: 16, depth: 70 }, release: 0.3 });
        sfx.tone({ f: 1568, at: b + 0.55, dur: 0.6, vol: 0.12, attack: 0.002, release: 0.55 });
        sfx.tone({ f: 2093, at: b + 0.7, dur: 0.7, vol: 0.1, attack: 0.002, release: 0.65 });
      },

      destroy() {
        disposables.forEach(d => d.dispose && d.dispose());
        disposables.length = 0;
      },
    };
  },
});
