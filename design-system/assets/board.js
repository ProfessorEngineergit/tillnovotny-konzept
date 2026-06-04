/* Tiny shared interactivity for every render: the signature toggle,
   the theme switch, segmented controls, and range-fill. CSS does the looks. */
(function () {
  function setRangeFill(el) {
    var min = +el.min || 0, max = +el.max || 100, v = +el.value;
    var pct = ((v - min) / (max - min)) * 100;
    el.style.setProperty('--fill', pct + '%');
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action="toggle"]');
    if (t) {
      var on = t.getAttribute('aria-checked') === 'true';
      t.setAttribute('aria-checked', String(!on));
      return;
    }
    var th = e.target.closest('[data-action="theme"]');
    if (th) {
      var b = document.body;
      b.dataset.theme = b.dataset.theme === 'light' ? 'dark' : 'light';
      return;
    }
    var seg = e.target.closest('.db-seg button, .db-tabs button');
    if (seg) {
      seg.parentElement.querySelectorAll('button').forEach(function (x) {
        x.classList.toggle('is-active', x === seg);
      });
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.matches('.db-range input[type="range"]')) setRangeFill(e.target);
  });

  document.querySelectorAll('.db-range input[type="range"]').forEach(setRangeFill);
})();
