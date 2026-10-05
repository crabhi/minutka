// App shell: menu, run loop, finale, overtime clock.
// Test hooks (query string):
//   ?anim=<id>    force one animation
//   ?dur=<sec>    override the duration of every button
//   ?at=<0..>     start already this far into the run (1 = time's up, 1.2 = 20% over)
//   ?autostart=1  start right away (audio stays muted without a click)
(function () {
  const M = Minutka, U = M.util;
  const $ = s => document.querySelector(s);
  const qs = new URLSearchParams(location.search);
  const FINALE_S = 10;
  const LAST_KEY = 'minutka.last';

  const stage = $('#stage');
  const clockEl = $('#ot-clock');
  const msgEl = $('#ot-msg');
  const sourceEl = $('#ot-source');

  let run = null;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  function setMode(mode) { document.body.dataset.mode = mode; }

  function available() {
    return M.anims.filter(a => !a.needs3d || (window.THREE && M.webglOK()));
  }

  function pickAnim(tried) {
    const forced = qs.get('anim');
    if (forced && !tried.has(forced)) {
      const a = M.anims.find(x => x.id === forced);
      if (a) return a;
      console.warn('unknown animation', forced, 'available:', M.anims.map(x => x.id).join(', '));
    }
    const pool = available().filter(a => !tried.has(a.id));
    if (!pool.length) return null;
    const last = store.get(LAST_KEY);
    const fresh = pool.filter(a => a.id !== last);
    return U.pick(fresh.length ? fresh : pool);
  }

  // ---------------------------------------------------------------- run
  function start(minutes) {
    M.unlockAudio();
    stop();
    const durMs = (Number(qs.get('dur')) || minutes * 60) * 1000;
    const at = Number(qs.get('at')) || 0;
    setMode('run');
    M._fitAll();

    const tried = new Set();
    let anim, inst, sfx;
    while ((anim = pickAnim(tried))) {
      tried.add(anim.id);
      sfx = M.makeSfx();
      try {
        inst = anim.create(stage, sfx, { duration: durMs / 1000 });
        break;
      } catch (e) {
        console.error('animation ' + anim.id + ' failed to start', e);
        sfx.dispose();
        M._cleanup(stage);
        inst = null;
      }
    }
    if (!inst) { setMode('menu'); return; }
    store.set(LAST_KEY, anim.id);
    document.title = anim.emoji + ' ' + anim.name + ' · Minutka';

    const now = performance.now();
    run = {
      anim, inst, sfx,
      begin: now,
      deadline: now + durMs * (1 - at),
      durMs,
      last: now,
      finaleFired: false,
      phase: 'run',
      errors: 0,
      raf: 0,
      watchdog: setInterval(checkPhase, 250),
      lastMinute: 0,
      msgIndex: -1,
    };
    requestWakeLock();
    run.raf = requestAnimationFrame(frame);
  }

  // Overtime seconds (negative while still running).
  const overBy = (r, now) => (now - r.deadline) / 1000;

  function checkPhase() {
    const r = run;
    if (!r) return;
    const over = overBy(r, performance.now());
    if (over >= 0 && !r.finaleFired) {
      r.finaleFired = true;
      try { r.inst.finale && r.inst.finale(); } catch (e) { console.error(e); }
    }
    if (over >= FINALE_S && r.phase === 'run') showOvertime();
    if (r.phase === 'overtime') tickOvertime(over);
  }

  function frame(now) {
    const r = run;
    if (!r || r.phase !== 'run') return;
    r.raf = requestAnimationFrame(frame);
    checkPhase();
    if (r.phase !== 'run') return;
    const over = overBy(r, now);
    const p = U.clamp(1 - (r.deadline - now) / r.durMs);
    const t = (now - r.begin) / 1000;
    const dt = Math.min(0.1, (now - r.last) / 1000);
    r.last = now;
    try {
      r.inst.update(p, t, dt, over >= 0 ? over : -1);
    } catch (e) {
      if (r.errors++ < 3) console.error(e);
    }
  }

  function destroyAnim(r) {
    cancelAnimationFrame(r.raf);
    try { r.inst.destroy && r.inst.destroy(); } catch (e) { console.error(e); }
    M._cleanup(stage);
  }

  function stop() {
    const r = run;
    if (!r) return;
    run = null;
    clearInterval(r.watchdog);
    if (r.phase === 'run') destroyAnim(r);
    r.sfx.dispose();
    releaseWakeLock();
    document.title = 'Minutka';
    setMode('menu');
  }

  // ---------------------------------------------------------------- overtime
  const MESSAGES = [
    'Wrap it up!',
    'This was supposed to be a lightning talk.',
    'Lightning is famously quick.',
    'The next speaker is aging visibly.',
    'Questions? There is no time for questions.',
    'Last slide. Promise?',
    'Your audience is drafting their escape.',
    'We love you. Please stop.',
    'The pizza is getting cold.',
    'Thunder follows lightning. Not a keynote.',
    'Clap now and maybe they will stop.',
    'Somewhere, a timer is crying.',
  ];

  function showOvertime() {
    const r = run;
    destroyAnim(r);
    r.phase = 'overtime';
    sourceEl.textContent = r.anim.emoji + ' ' + r.anim.name;
    setMode('overtime');
    tickOvertime(overBy(r, performance.now()));
  }

  function fmt(sec) {
    const s = Math.floor(sec);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    const pad = n => String(n).padStart(2, '0');
    return '+' + (h ? h + ':' + pad(m) : m) + ':' + pad(ss);
  }

  function tickOvertime(over) {
    const r = run;
    clockEl.textContent = fmt(over);
    const level = over < 30 ? 0 : over < 60 ? 1 : over < 120 ? 2 : 3;
    document.body.dataset.heat = level;
    const idx = Math.floor((over - FINALE_S) / 6) % MESSAGES.length;
    if (idx !== r.msgIndex) {
      r.msgIndex = idx;
      msgEl.textContent = MESSAGES[Math.max(0, idx)];
      msgEl.classList.remove('pop');
      void msgEl.offsetWidth;
      msgEl.classList.add('pop');
    }
    const minute = Math.floor(over / 60);
    if (minute > r.lastMinute) {
      r.lastMinute = minute;
      sadTrombone(r.sfx);
    }
  }

  // Every full minute over budget: wah, wah, wah, waaaah.
  function sadTrombone(sfx) {
    const notes = [['D4', 0.45], ['C#4', 0.45], ['C4', 0.45], ['B3', 1.6]];
    let at = 0;
    notes.forEach(([n, d], i) => {
      sfx.voice({
        f: M.note(n), at, dur: d, vol: 0.35, attack: 0.04, release: 0.2,
        formants: [[600, 1, 4], [1000, 0.5, 5], [2400, 0.2, 6]],
        vib: i === 3 ? { rate: 5, depth: 6 } : null,
        to: i === 3 ? M.note('A#3') : null,
      });
      at += d;
    });
  }

  // ---------------------------------------------------------------- wake lock
  let wakeLock = null;
  async function requestWakeLock() {
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; }
  }
  function releaseWakeLock() {
    try { wakeLock && wakeLock.release(); } catch (e) { /* ignore */ }
    wakeLock = null;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && run) requestWakeLock();
  });

  // ---------------------------------------------------------------- wiring
  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) { /* unsupported */ }
  }

  document.querySelectorAll('[data-minutes]').forEach(btn => {
    btn.addEventListener('click', () => start(Number(btn.dataset.minutes)));
  });
  $('#exit').addEventListener('click', stop);
  $('#overtime').addEventListener('click', stop);
  $('#fs').addEventListener('click', toggleFullscreen);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { stop(); return; }
    if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }
    if (!run) {
      const map = { 1: 1, 3: 3, 0: 10 };
      if (e.key in map) start(map[e.key]);
    }
  });

  window.addEventListener('resize', () => {
    M._fitAll();
    if (run && run.phase === 'run' && run.inst.resize) {
      const r = stage.getBoundingClientRect();
      run.inst.resize(r.width, r.height);
    }
  });

  // Marquee of motifs on the menu.
  const marquee = $('#marquee');
  const icons = M.anims.map(a => '<span title="' + a.name + '">' + a.emoji + '</span>').join('');
  marquee.innerHTML = '<div class="track">' + icons + icons + '</div>';
  $('#count').textContent = M.anims.length;

  setMode('menu');
  if (qs.get('autostart')) start(1);
})();
