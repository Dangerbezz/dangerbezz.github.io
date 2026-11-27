/* Живой слой v2: плитки и карточки проявляются по очереди при прокрутке, цифры считаются,
   бегущая строка марок с кнопкой паузы. Без библиотек. Уважает «меньше движения» в системе. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // порядковый номер в группе — для задержки «по очереди»
  document.querySelectorAll('[data-lv-group]').forEach(function (g) {
    Array.prototype.forEach.call(g.children, function (el, i) { el.style.setProperty('--i', i % 8); el.classList.add('lv-pop'); });
  });

  var pops = document.querySelectorAll('.lv-pop');
  if (reduce || !('IntersectionObserver' in window)) {
    pops.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    pops.forEach(function (el) { io.observe(el); });
  }

  // цифры: <b data-lv-count="2014" data-lv-since> или data-lv-count="6"
  var nums = document.querySelectorAll('[data-lv-count]');
  function finalOf(el) {
    var v = parseInt(el.getAttribute('data-lv-count'), 10);
    if (el.hasAttribute('data-lv-since')) v = new Date().getFullYear() - v;
    return v;
  }
  nums.forEach(function (el) { el.textContent = finalOf(el); });
  if (!reduce && 'IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        io2.unobserve(e.target);
        var el = e.target, to = finalOf(el), t0 = null, dur = 1200;
        function step(t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * k);
          if (p < 1) requestAnimationFrame(step);
        }
        el.textContent = '0';
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io2.observe(el); });
  }

  // бегущая строка: копия ленты для бесшовного круга и пауза
  document.querySelectorAll('[data-marquee]').forEach(function (m) {
    var track = m.querySelector('.marquee__track');
    if (!track) return;
    var copy = track.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    m.appendChild(copy);
    var btn = m.parentElement.querySelector('.marquee__pause');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var p = m.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', p ? 'true' : 'false');
      btn.setAttribute('aria-label', p ? 'Запустить бегущую строку' : 'Остановить бегущую строку');
      btn.innerHTML = p ? '&#9654;' : '&#10073;&#10073;';
    });
  });
})();
