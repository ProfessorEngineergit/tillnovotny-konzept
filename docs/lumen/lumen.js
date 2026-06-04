/* ============================================================
   LUMEN engine v2 — backgrounds (both themes) + calm physics.
   ============================================================ */
(function () {
  'use strict';
  var body = document.body;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- PARTICLE BACKGROUND  (modes: 'field' | 'bio' | null) ---------- */
  var canvas = document.querySelector('.lx-canvas');
  var ctx = canvas && canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, mode = null, dots = [], blobs = [];
  var px = -9999, py = -9999, lpx = -9999, lpy = -9999, energy = 0;

  function resize() {
    if (!canvas) return;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (mode === 'field') buildField();
    if (mode === 'bio') buildBio();
  }

  function buildField() {
    dots = [];
    var gap = W < 700 ? 32 : 28;
    var ox = (W % gap) / 2, oy = (H % gap) / 2;
    for (var y = oy; y <= H; y += gap)
      for (var x = ox; x <= W; x += gap)
        dots.push({ hx: x, hy: y, x: x, y: y, vx: 0, vy: 0, z: 0.45 + Math.random() * 0.55 });
  }

  function buildBio() {
    blobs = [];
    var n = Math.max(55, Math.min(140, Math.round((W * H) / 15000)));
    var cols = [[120, 255, 198], [60, 230, 170], [70, 215, 230], [150, 200, 255]];
    for (var i = 0; i < n; i++) {
      var c = cols[(Math.random() * cols.length) | 0];
      blobs.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: 1.4 + Math.random() * 3.2, c: c,
        ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.7, seed: Math.random() * 1000
      });
    }
  }

  /* calmer warp */
  var R = 185, PULL = 46, K = 0.09, DAMP = 0.84, dotRGB = '150,225,205';

  function tick() {
    if (!ctx) return;
    requestAnimationFrame(tick);
    if (!mode) return;

    var sp = (px > -9000 && lpx > -9000) ? Math.hypot(px - lpx, py - lpy) : 0;
    var te = Math.max(0, Math.min(sp / 16, 1));
    energy += (te - energy) * (te > energy ? 0.4 : 0.045);
    lpx = px; lpy = py;

    ctx.clearRect(0, 0, W, H);
    dotRGB = getComputedStyle(body).getPropertyValue('--dot').trim() || dotRGB;
    var light = body.dataset.theme === 'light';

    if (mode === 'field') {
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i], tx = d.hx, ty = d.hy, pull = 0;
        var ddx = px - d.hx, ddy = py - d.hy, dist = Math.hypot(ddx, ddy);
        if (dist < R && energy > 0.001) {
          var s = Math.sin(Math.PI * (dist / R));     // center stays, ring max, edge none
          pull = s * energy;
          tx = d.hx + (ddx / (dist || 1)) * pull * PULL;
          ty = d.hy + (ddy / (dist || 1)) * pull * PULL;
        }
        d.vx = (d.vx + (tx - d.x) * K) * DAMP;
        d.vy = (d.vy + (ty - d.y) * K) * DAMP;
        d.x += d.vx; d.y += d.vy;
        var size = d.z * 1.6 + pull * 1.4;
        var a = (light ? 0.22 : 0.16) + d.z * 0.28 + pull * 0.45;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + dotRGB + ',' + a.toFixed(3) + ')';
        ctx.arc(d.x, d.y, size, 0, 6.2832); ctx.fill();
      }
    } else if (mode === 'bio') {
      ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
      for (var j = 0; j < blobs.length; j++) {
        var b = blobs[j];
        b.ph += 0.009 * b.sp;
        b.x += b.vx + Math.sin(b.ph + b.seed) * 0.16;
        b.y += b.vy + Math.cos(b.ph * 0.8 + b.seed) * 0.16;
        var mdx = b.x - px, mdy = b.y - py, md = Math.hypot(mdx, mdy);
        if (md < 130) { b.x += (mdx / (md || 1)) * 0.5; b.y += (mdy / (md || 1)) * 0.5; }
        if (b.x < -25) b.x = W + 25; if (b.x > W + 25) b.x = -25;
        if (b.y < -25) b.y = H + 25; if (b.y > H + 25) b.y = -25;
        var pulse = 0.55 + Math.sin(b.ph * 1.4) * 0.45;
        var rr = b.r * (1 + pulse * 0.3) * 6, c = b.c;
        var core = (light ? 0.5 : 0.85) * pulse;
        var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr);
        g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + core.toFixed(2) + ')');
        g.addColorStop(0.4, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (light ? 0.12 : 0.14) + ')');
        g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, 6.2832); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    if (m === 'field') buildField();
    if (m === 'bio') buildBio();
    if (!m && ctx) ctx.clearRect(0, 0, W, H);
  }
  function syncBg() {
    if (reduce) { setMode(null); return; }
    var bg = body.dataset.bg;
    setMode(bg === 'field' ? 'field' : bg === 'bio' ? 'bio' : null);  // aurora/vapor -> CSS
  }
  if (canvas) {
    window.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
    window.addEventListener('pointerleave', function () { px = -9999; py = -9999; });
    window.addEventListener('resize', resize);
    resize(); requestAnimationFrame(tick);
  }

  /* ---------- BG + THEME SWITCHERS ---------- */
  function setActiveBg(name) {
    body.dataset.bg = name;
    document.querySelectorAll('[data-set-bg]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-set-bg') === name);
    });
    syncBg();
  }
  document.querySelectorAll('[data-set-bg]').forEach(function (btn) {
    btn.addEventListener('click', function () { setActiveBg(btn.getAttribute('data-set-bg')); });
  });
  document.querySelectorAll('[data-toggle-theme]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var light = body.dataset.theme !== 'light';
      body.dataset.theme = light ? 'light' : 'dark';
      setActiveBg(light ? 'vapor' : 'field');   // vapor = default light; field = default dark
    });
  });
  syncBg();

  /* ---------- SIGNATURE TOGGLE ---------- */
  document.querySelectorAll('.lx-toggle').forEach(function (tg) {
    tg.addEventListener('click', function () {
      tg.setAttribute('aria-checked', String(tg.getAttribute('aria-checked') !== 'true'));
    });
  });

  /* ---------- CUSTOM SLIDER ---------- */
  document.querySelectorAll('.lx-slider').forEach(function (sl) {
    var rail = sl.querySelector('.rail'), bubble = sl.querySelector('.bubble');
    var min = +sl.dataset.min || 0, max = +sl.dataset.max || 100, val = +sl.dataset.value || 60, dragging = false;
    function render() { sl.style.setProperty('--p', ((val - min) / (max - min)) * 100 + '%'); if (bubble) bubble.textContent = Math.round(val); }
    function fromX(cx) { var b = rail.getBoundingClientRect(); val = min + Math.max(0, Math.min((cx - b.left) / b.width, 1)) * (max - min); render(); }
    sl.addEventListener('pointerdown', function (e) { dragging = true; sl.classList.add('drag'); sl.setPointerCapture(e.pointerId); fromX(e.clientX); });
    sl.addEventListener('pointermove', function (e) { if (dragging) fromX(e.clientX); });
    sl.addEventListener('pointerup', function () { dragging = false; sl.classList.remove('drag'); });
    render();
  });

  /* ---------- SEGMENTED ---------- */
  document.querySelectorAll('.lx-seg').forEach(function (seg) {
    var ind = seg.querySelector('.ind'), btns = seg.querySelectorAll('button');
    function move(btn) {
      btns.forEach(function (b) { b.classList.toggle('active', b === btn); });
      ind.style.width = btn.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + (btn.offsetLeft - 5) + 'px)';
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { move(b); }); });
    var act = seg.querySelector('button.active') || btns[0];
    if (act) requestAnimationFrame(function () { move(act); });
  });

  /* ---------- MAGNETIC BUTTONS (subtle, desktop only) ---------- */
  if (fine && !reduce) document.querySelectorAll('.lx-btn.magnetic').forEach(function (btn) {
    btn.addEventListener('pointermove', function (e) {
      var r = btn.getBoundingClientRect();
      btn.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.16) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.16) + 'px)';
    });
    btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
  });

  /* ---------- CARD 3D TILT (gentle, desktop only) ---------- */
  if (fine && !reduce) document.querySelectorAll('.lx-card[data-tilt]').forEach(function (card) {
    var MAX = 5;
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect(), px2 = (e.clientX - r.left) / r.width, py2 = (e.clientY - r.top) / r.height;
      card.style.transform = 'perspective(900px) rotateY(' + ((px2 - 0.5) * MAX) + 'deg) rotateX(' + ((0.5 - py2) * MAX) + 'deg) translateY(-2px)';
      card.style.setProperty('--mx', px2 * 100 + '%'); card.style.setProperty('--my', py2 * 100 + '%');
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  });

  /* ---------- PROGRESS ---------- */
  requestAnimationFrame(function () {
    document.querySelectorAll('.lx-progress i').forEach(function (el) { el.style.width = (el.getAttribute('data-value') || 60) + '%'; });
  });
})();
