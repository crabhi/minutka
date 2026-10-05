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
  const CUSTOM_KEY = 'minutka.custom';

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
  function start(seconds) {
    M.unlockAudio();
    stop();
    const durMs = (Number(qs.get('dur')) || seconds) * 1000;
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
    btn.addEventListener('click', () => start(Number(btn.dataset.minutes) * 60));
  });
  $('#exit').addEventListener('click', stop);
  $('#overtime').addEventListener('click', stop);
  $('#fs').addEventListener('click', toggleFullscreen);

  // Custom time: "MM:SS", or plain minutes. "." and "," also work as the separator,
  // because phone number pads have no colon.
  function parseTime(str) {
    const m = /^(\d{0,3})(?:[:.,](\d{1,2}))?$/.exec(str.trim());
    if (!m || (!m[1] && !m[2])) return 0;
    const min = Number(m[1] || 0), sec = Number(m[2] || 0);
    return sec < 60 ? min * 60 + sec : 0;
  }

  const customEl = $('#custom-time');
  customEl.value = store.get(CUSTOM_KEY) || '';
  customEl.addEventListener('input', () => customEl.removeAttribute('aria-invalid'));
  $('#custom').addEventListener('submit', e => {
    e.preventDefault();
    const sec = parseTime(customEl.value);
    if (!sec) {
      customEl.setAttribute('aria-invalid', 'true');
      customEl.focus();
      return;
    }
    store.set(CUSTOM_KEY, customEl.value.trim());
    customEl.blur();
    start(sec);
  });

  document.addEventListener('keydown', e => {
    if (e.target === customEl) return;
    if (e.key === 'Escape') { stop(); return; }
    if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }
    if (!run) {
      const map = { 1: 60, 3: 180, 0: 600 };
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
  if (qs.get('autostart')) start(60);
})();
