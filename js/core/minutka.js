// Minutka core: animation registry, canvas/three.js helpers, synthesized sound effects.
// Animations are plain classic scripts that call Minutka.register({...}).
window.Minutka = (function () {
  const M = { anims: [], _fits: [], _renderers: [] };

  // ---------------------------------------------------------------- registry
  // def = { id, name, emoji, needs3d?, create(stage, sfx, info) -> { update(p, t, dt, ft), finale(), destroy?(), resize?(w, h) } }
  M.register = function (def) {
    if (M.anims.some(a => a.id === def.id)) throw new Error('duplicate animation id ' + def.id);
    M.anims.push(def);
  };

  // ---------------------------------------------------------------- helpers
  const dprOf = () => Math.min(window.devicePixelRatio || 1, 2);

  // A full-stage 2D canvas whose drawing units are CSS pixels. Read cv.w / cv.h every frame.
  M.canvas = function (stage) {
    const el = document.createElement('canvas');
    el.className = 'fill';
    stage.appendChild(el);
    const ctx = el.getContext('2d');
    const cv = { el, ctx, w: 1, h: 1, dpr: 1 };
    cv.fit = function () {
      const r = stage.getBoundingClientRect();
      cv.dpr = dprOf();
      cv.w = Math.max(1, r.width);
      cv.h = Math.max(1, r.height);
      el.width = Math.round(cv.w * cv.dpr);
      el.height = Math.round(cv.h * cv.dpr);
      ctx.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    };
    cv.fit();
    M._fits.push(cv.fit);
    return cv;
  };

  // A full-stage three.js renderer. Set T.camera = yourPerspectiveCamera and resizes are handled.
  M.three = function (stage, opts) {
    if (!window.THREE) throw new Error('three.js is not available');
    const renderer = new THREE.WebGLRenderer(Object.assign({ antialias: true }, opts));
    renderer.domElement.className = 'fill';
    stage.appendChild(renderer.domElement);
    M._renderers.push(renderer);
    const T = { renderer, camera: null, w: 1, h: 1 };
    T.fit = function () {
      const r = stage.getBoundingClientRect();
      T.w = Math.max(1, r.width);
      T.h = Math.max(1, r.height);
      renderer.setPixelRatio(dprOf());
      renderer.setSize(T.w, T.h, false);
      if (T.camera && T.camera.isPerspectiveCamera) {
        T.camera.aspect = T.w / T.h;
        T.camera.updateProjectionMatrix();
      }
    };
    T.fit();
    M._fits.push(T.fit);
    return T;
  };

  M._fitAll = function () { M._fits.forEach(f => f()); };

  // Called by the app after an animation's destroy(); frees everything the helpers made.
  M._cleanup = function (stage) {
    M._renderers.forEach(r => {
      try { r.dispose(); r.forceContextLoss(); } catch (e) { /* already gone */ }
    });
    M._renderers = [];
    M._fits = [];
    stage.innerHTML = '';
  };

  let webgl = null;
  M.webglOK = function () {
    if (webgl === null) {
      try {
        const c = document.createElement('canvas');
        webgl = !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
      } catch (e) { webgl = false; }
    }
    return webgl;
  };

  // ---------------------------------------------------------------- math utils
  const TAU = Math.PI * 2;
  M.util = {
    TAU,
    clamp: (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)),
    lerp: (a, b, k) => a + (b - a) * k,
    // remap x from [a,b] to [0,1], clamped
    range: (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a))),
    rand: (a = 0, b = 1) => a + Math.random() * (b - a),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    // deterministic PRNG: const r = rng(42); r() -> [0,1)
    rng(seed) {
      let s = seed >>> 0;
      return function () {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    easeInOut: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    easeOut: k => 1 - Math.pow(1 - k, 3),
    easeIn: k => k * k * k,
    easeOutBack: k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    easeOutElastic: k => (k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (TAU / 3)) + 1),
  };

  // ---------------------------------------------------------------- audio
  // The AudioContext must be created/resumed inside a user gesture (the start buttons).
  M.unlockAudio = function () {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!M._actx) {
      M._actx = new AC();
      const comp = M._actx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 6;
      M._master = M._actx.createGain();
      M._master.gain.value = 0.9;
      M._master.connect(comp).connect(M._actx.destination);
    }
    if (M._actx.state === 'suspended') M._actx.resume();
    return M._actx;
  };

  const NOTE = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  // 'A4' -> 440, 'C#5', 'Eb3'
  M.note = function (name) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) throw new Error('bad note ' + name);
    const semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
    return 440 * Math.pow(2, semi / 12);
  };

  // Per-run sound effect kit. Every `at` is seconds from now. All methods are safe no-ops without audio.
  M.makeSfx = function () {
    const ctx = M._actx;
    const noop = () => null;
    if (!ctx) {
      return { ctx: null, bus: null, now: () => 0, tone: noop, noise: noop, voice: noop, boom: noop, pop: noop, note: M.note, dispose: noop };
    }
    const bus = ctx.createGain();
    bus.connect(M._master);
    const T = at => ctx.currentTime + (at || 0);

    let noiseBuf = null;
    function noiseBuffer() {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return noiseBuf;
    }

    function envelope(o, at, dur) {
      const g = ctx.createGain();
      const vol = o.vol == null ? 0.3 : o.vol;
      const attack = Math.min(o.attack == null ? 0.01 : o.attack, dur);
      const release = Math.min(o.release == null ? Math.min(0.15, dur * 0.5) : o.release, dur - attack);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(vol, at + attack);
      g.gain.setValueAtTime(vol, at + dur - release);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      g.connect(o.dest || bus);
      return g;
    }

    function filterChain(o, at, dur) {
      if (!o.filter) return null;
      const f = ctx.createBiquadFilter();
      f.type = o.filter;
      f.frequency.setValueAtTime(o.ff || 1000, at);
      if (o.ffTo) f.frequency.exponentialRampToValueAtTime(o.ffTo, at + dur);
      f.Q.value = o.q == null ? 1 : o.q;
      return f;
    }

    function addVibrato(param, o, at, dur) {
      if (!o.vib) return;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = o.vib.rate || 6;
      const lg = ctx.createGain();
      lg.gain.value = o.vib.depth || 8;
      lfo.connect(lg).connect(param);
      lfo.start(at);
      lfo.stop(at + dur + 0.05);
    }

    const sfx = { ctx, bus, note: M.note, now: () => ctx.currentTime };

    // Oscillator. { f, to, glide, type, at, dur, vol, attack, release, vib:{rate,depth}, filter, ff, ffTo, q, detune }
    sfx.tone = function (o = {}) {
      const at = T(o.at), dur = o.dur || 0.3;
      const osc = ctx.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f || 440, at);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + (o.glide || dur));
      if (o.detune) osc.detune.value = o.detune;
      addVibrato(osc.frequency, o, at, dur);
      const g = envelope(o, at, dur);
      const f = filterChain(o, at, dur);
      if (f) osc.connect(f).connect(g); else osc.connect(g);
      osc.start(at);
      osc.stop(at + dur + 0.05);
      return osc;
    };

    // Filtered white noise. { at, dur, vol, filter('lowpass'|'highpass'|'bandpass'), ff, ffTo, q, attack, release }
    sfx.noise = function (o = {}) {
      const at = T(o.at), dur = o.dur || 0.3;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer();
      src.loop = true;
      src.playbackRate.value = o.rate || 1;
      const g = envelope(o, at, dur);
      const f = filterChain(Object.assign({ filter: 'lowpass', ff: 2000 }, o), at, dur);
      src.connect(f).connect(g);
      src.start(at, Math.random());
      src.stop(at + dur + 0.05);
      return src;
    };

    // Buzzy source through formant band-passes: moo, meow, howl, roar, burp, "wah"...
    // { f, to, glide, at, dur, vol, type, formants: [[freq, gain, q?], ...], vib }
    sfx.voice = function (o = {}) {
      const at = T(o.at), dur = o.dur || 0.6;
      const osc = ctx.createOscillator();
      osc.type = o.type || 'sawtooth';
      osc.frequency.setValueAtTime(o.f || 150, at);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + (o.glide || dur));
      addVibrato(osc.frequency, o, at, dur);
      const g = envelope(o, at, dur);
      (o.formants || [[700, 1], [1200, 0.6], [2600, 0.25]]).forEach(([freq, gain, q]) => {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = freq;
        bp.Q.value = q || 6;
        const fg = ctx.createGain();
        fg.gain.value = gain * 3;
        osc.connect(bp).connect(fg).connect(g);
      });
      osc.start(at);
      osc.stop(at + dur + 0.05);
      return osc;
    };

    // Explosion: low noise rumble + falling sine thump.
    sfx.boom = function (o = {}) {
      const vol = o.vol == null ? 0.9 : o.vol, at = o.at || 0, dur = o.dur || 2.2;
      sfx.noise({ at, dur, vol, filter: 'lowpass', ff: 1800, ffTo: 60, attack: 0.005, release: dur * 0.8 });
      sfx.tone({ at, dur: dur * 0.6, vol: vol * 0.9, f: 120, to: 30, type: 'sine', attack: 0.005, release: dur * 0.5 });
    };

    // Short pop/click.
    sfx.pop = function (o = {}) {
      const at = o.at || 0;
      sfx.noise({ at, dur: 0.08, vol: o.vol == null ? 0.7 : o.vol, filter: 'bandpass', ff: o.f || 1500, q: 0.8, attack: 0.001, release: 0.07 });
      sfx.tone({ at, dur: 0.1, vol: (o.vol == null ? 0.7 : o.vol) * 0.6, f: (o.f || 1500) / 3, to: 60, attack: 0.001 });
    };

    // Fade out everything this run scheduled.
    sfx.dispose = function () {
      try {
        bus.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        setTimeout(() => bus.disconnect(), 400);
      } catch (e) { /* ignore */ }
    };

    return sfx;
  };

  return M;
})();
