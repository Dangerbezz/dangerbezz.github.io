/* =====================================================================
   НАСТРОЙКИ САЙТА — меняйте только здесь
   ===================================================================== */

// Адрес внешнего сервиса форм, если на хостинге нет PHP.
// Пример: 'https://formspree.io/f/abcdwxyz' или 'https://api.web3forms.com/submit'
// Оставьте пустым '' — тогда заявки идут через send.php (рекомендуется).
const FORM_ENDPOINT = 'https://api.web3forms.com/submit';

const SITE = {
  phone: '+79000000000',              // для ссылки «позвонить», только цифры и +
  phoneHuman: '+7 (900) 000-00-00',   // как номер показывается людям
  whatsapp: '79000000000',            // номер WhatsApp без +
  telegram: 'klyuch_service_demo',    // имя в Telegram без @
  timezone: 'Europe/Moscow',
  // Режим работы: 0 — воскресенье, 1 — понедельник ... 6 — суббота.
  // null — выходной.
  hours: {
    0: null,
    1: ['09:00', '20:00'],
    2: ['09:00', '20:00'],
    3: ['09:00', '20:00'],
    4: ['09:00', '20:00'],
    5: ['09:00', '20:00'],
    6: ['10:00', '18:00']
  },
  callbackMinutes: 15,   // через сколько минут перезваниваете в рабочее время
  maxPhotos: 3,
  maxPhotoMb: 5
};


/* =====================================================================
   КАЛЬКУЛЯТОР ОРИЕНТИРОВОЧНОЙ ЦЕНЫ (страница «Цены»)
   Ориентир = цена «от» × коэффициент класса машины × количество.
   Верхняя граница = ориентир × spread.
   Меняйте числа — калькулятор пересчитается сам.
   ===================================================================== */
const CALC = {
  classes: [
    { id: 'small', name: 'Малый класс',              example: 'Picanto, Granta, Logan',  k: 1.0 },
    { id: 'mid',   name: 'Седан или хэтчбек',        example: 'Rio, Solaris, Vesta, Polo', k: 1.15 },
    { id: 'suv',   name: 'Кроссовер, внедорожник',   example: 'Creta, Haval, RAV4, Duster', k: 1.35 },
    { id: 'van',   name: 'Минивэн, коммерческий до 3,5 т', example: 'Газель, Транзит',    k: 1.6 }
  ],
  services: [
    { id: 'diagnostika',  name: 'Компьютерная диагностика',     base: 1200, spread: 1.5, unit: '',          note: 'Сложные случаи с проводкой — дороже.' },
    { id: 'to',           name: 'ТО: масло и фильтры (работа)', base: 900,  spread: 1.6, unit: '',          note: 'Масло и фильтры — отдельно, можно свои.' },
    { id: 'hodovaya',     name: 'Осмотр ходовой',               base: 500,  spread: 1.0, unit: '',          note: 'Бесплатно, если ремонт делаете у нас.' },
    { id: 'shinomontazh', name: 'Шиномонтаж, комплект',         base: 2400, spread: 1.5, unit: '',          note: 'R17 и больше, низкий профиль — ближе к верхней границе.' },
    { id: 'kuzov',        name: 'Покраска элемента',            base: 7000, spread: 1.6, unit: 'элементов', note: 'Точная цена — после осмотра кузова.' },
    { id: 'elektrika',    name: 'Поиск неисправности электрики', base: 1500, spread: 2.0, unit: '',          note: 'Ремонт после поиска считаем отдельно.' },
    { id: 'kondicioner',  name: 'Заправка кондиционера',        base: 2500, spread: 1.4, unit: '',          note: 'Если есть утечка — сначала скажем, где.' }
  ]
};

/* ---------------------------------------------------------------------
   Дополнительные функции: запись по времени, выезд, галерея, карта
   --------------------------------------------------------------------- */
window.SiteExtras = window.SiteExtras || [];
document.documentElement.classList.add('js');

(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Сегодняшняя дата в часовом поясе сервиса (ГГГГ-ММ-ДД)
  function todayStr(offsetDays) {
    var d = new Date(Date.now() + (offsetDays || 0) * 864e5);
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: SITE.timezone }).format(d); } catch (e) { return d.toISOString().slice(0, 10); }
  }
  function weekday(str) { var p = str.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
  function minutesNow() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: SITE.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':');
      return (+p[0] % 24) * 60 + +p[1];
    } catch (e) { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // ---------- Слоты записи по графику ----------
  window.SiteFillSlots = function (dateEl, timeEl) {
    var v = dateEl.value;
    timeEl.innerHTML = '';
    var hint = dateEl.closest('[data-slots]').querySelector('[data-slots-hint]');
    if (!v) { timeEl.add(new Option('Сначала выберите дату', '')); timeEl.disabled = true; return; }
    var h = SITE.hours[weekday(v)];
    if (!h) {
      timeEl.add(new Option('Выходной', '')); timeEl.disabled = true;
      if (hint) hint.textContent = 'В этот день мы не работаем. Выберите другой день.';
      return;
    }
    var from = +h[0].split(':')[0] * 60 + +h[0].split(':')[1];
    var to = +h[1].split(':')[0] * 60 + +h[1].split(':')[1] - 60; // последняя запись за час до закрытия
    var isToday = v === todayStr();
    var earliest = isToday ? minutesNow() + 60 : 0;
    timeEl.add(new Option('Выберите время', ''));
    var n = 0;
    for (var m = from; m <= to; m += 60) {
      if (m < earliest) continue;
      var t = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
      timeEl.add(new Option(t.replace(/^0/, ''), t)); n++;
    }
    timeEl.disabled = n === 0;
    if (n === 0) { timeEl.innerHTML = ''; timeEl.add(new Option('На сегодня мест нет', '')); }
    if (hint) hint.textContent = n === 0 ? 'Сегодня записаться уже не получится. Выберите завтра или позже.' : 'Мастер перезвонит и подтвердит время.';
  };

  function initSlots() {
    document.querySelectorAll('[data-slots]').forEach(function (box) {
      var dateEl = box.querySelector('input[type="date"]');
      var timeEl = box.querySelector('select');
      dateEl.min = todayStr();
      dateEl.max = todayStr(30);
      dateEl.addEventListener('change', function () { window.SiteFillSlots(dateEl, timeEl); });
      window.SiteFillSlots(dateEl, timeEl);
    });
    // «Просто перезвоните» прячет выбор времени
    document.querySelectorAll('[data-callback-only]').forEach(function (cb) {
      var target = cb.form.querySelector('[data-slots]');
      function sync() {
        target.hidden = cb.checked;
        target.querySelectorAll('input, select').forEach(function (el) { el.required = !cb.checked; });
      }
      cb.addEventListener('change', sync); sync();
    });
  }

  // ---------- Геолокация ----------
  function initGeo() {
    document.querySelectorAll('[data-geo]').forEach(function (btn) {
      var form = btn.closest('form');
      var addr = form.querySelector('[name="address"]');
      var coords = form.querySelector('[name="coords"]');
      var msg = form.querySelector('[data-geo-msg]');
      function say(text, cls) { msg.textContent = text; msg.className = 'geo__msg ' + (cls || ''); }
      var manual = 'Напишите адрес или ориентир: улица и дом, трасса и километр, заправка, кафе рядом.';
      if (!('geolocation' in navigator)) { btn.hidden = true; return; }
      btn.addEventListener('click', function () {
        say('Определяем… Разрешите доступ к местоположению, если браузер спросит.');
        btn.disabled = true;
        var done = false;
        // если браузер так и не ответил (окно разрешения закрыли) — не держим человека
        var guard = setTimeout(function () { if (!done) { done = true; btn.disabled = false; say('Не получилось определить. ' + manual, 'is-err'); } }, 20000);
        navigator.geolocation.getCurrentPosition(function (pos) {
          if (done) return; done = true; clearTimeout(guard);
          btn.disabled = false;
          var lat = pos.coords.latitude.toFixed(5), lon = pos.coords.longitude.toFixed(5);
          coords.value = lat + ',' + lon;
          if (!addr.value.trim()) addr.value = 'Моё местоположение: ' + lat + ', ' + lon;
          say('Готово, точность около ' + Math.round(pos.coords.accuracy) + ' м. Добавьте ориентир, если знаете.', 'is-ok');
          var a = document.createElement('a');
          a.href = 'https://yandex.ru/maps/?pt=' + lon + ',' + lat + '&z=16&l=map';
          a.target = '_blank'; a.rel = 'noopener'; a.textContent = ' Проверить на карте';
          msg.appendChild(a);
        }, function (err) {
          if (done) return; done = true; clearTimeout(guard);
          btn.disabled = false;
          var why = err.code === 1 ? 'Доступ к местоположению запрещён.' : err.code === 3 ? 'Не успели определить.' : 'Не получилось определить местоположение.';
          say(why + ' ' + manual, 'is-err');
          addr.focus();
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
      });
    });
  }

  // ---------- Светбокс ----------
  function initLightbox() {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    if (!links.length || !window.HTMLDialogElement) return;
    var dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Просмотр фото');
    dlg.innerHTML = '<div class="lightbox__inner"><img alt=""><p></p>' +
      '<button class="lightbox__close" type="button" aria-label="Закрыть">✕</button>' +
      '<button class="lightbox__prev" type="button" aria-label="Предыдущее фото">‹</button>' +
      '<button class="lightbox__next" type="button" aria-label="Следующее фото">›</button></div>';
    document.body.appendChild(dlg);
    var img = dlg.querySelector('img'), cap = dlg.querySelector('p'), i = 0;
    function show(n) {
      i = (n + links.length) % links.length;
      var a = links[i], im = a.querySelector('img');
      img.src = a.href; img.alt = im ? im.alt : '';
      cap.textContent = (i + 1) + ' из ' + links.length + (a.dataset.caption ? ': ' + a.dataset.caption : '');
    }
    links.forEach(function (a, n) { a.addEventListener('click', function (e) { e.preventDefault(); show(n); dlg.showModal(); }); });
    dlg.querySelector('.lightbox__close').onclick = function () { dlg.close(); };
    dlg.querySelector('.lightbox__prev').onclick = function () { show(i - 1); };
    dlg.querySelector('.lightbox__next').onclick = function () { show(i + 1); };
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('lightbox__inner')) dlg.close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
    var x0 = null;
    dlg.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  // ---------- Карта по кнопке (не тормозит загрузку) ----------
  function initMap() {
    document.querySelectorAll('[data-map]').forEach(function (box) {
      var btn = box.querySelector('button');
      btn.addEventListener('click', function () {
        var f = document.createElement('iframe');
        f.src = box.getAttribute('data-map');
        f.title = 'Карта: как к нам проехать';
        f.loading = 'lazy';
        box.innerHTML = ''; box.appendChild(f);
      });
    });
  }

  // ---------- Появление при прокрутке ----------
  function initReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  window.SiteExtras.push(initSlots, initGeo, initLightbox, initMap, initReveal);
})();

/* ---------------------------------------------------------------------
   Премиум: тема, счётчики, таймлайн, до/после, калькулятор,
   пошаговая запись, карта зон, параллакс, копирование номера
   --------------------------------------------------------------------- */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function rub(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽'; }
  function round100(n) { return Math.round(n / 100) * 100; }

  // ---------- Светлая / тёмная тема ----------
  function initTheme() {
    var btns = document.querySelectorAll('[data-theme-toggle]');
    if (!btns.length) return;
    function current() {
      var t = document.documentElement.getAttribute('data-theme');
      if (t) return t;
      return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function sync() {
      var dark = current() === 'dark';
      btns.forEach(function (btn) {
        btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
        if (btn.hasAttribute('data-theme-text')) btn.textContent = dark ? 'Светлая тема' : 'Тёмная тема';
        else btn.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
      });
    }
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        store('theme', next);
        sync();
      });
    });
    sync();
  }

  // ---------- Счётчики ----------
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    els.forEach(function (el) {
      var target = el.getAttribute('data-count');
      if (target === 'since') target = String(new Date().getFullYear() - +el.getAttribute('data-since'));
      el.setAttribute('data-target', target);
      if (reduce || !('IntersectionObserver' in window)) el.textContent = target;
    });
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, to = +el.getAttribute('data-target'), t0 = null, dur = 1100;
        function tick(t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * eased);
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: .6 });
    els.forEach(function (el) { el.textContent = '0'; io.observe(el); });
  }

  // ---------- Таймлайн: линия заполняется при прокрутке ----------
  function initTimeline() {
    var tl = document.querySelector('[data-timeline]');
    if (!tl || reduce) { if (tl) tl.style.setProperty('--p', 1); return; }
    var ticking = false;
    function upd() {
      var r = tl.getBoundingClientRect(), vh = innerHeight;
      var p = Math.min(1, Math.max(0, (vh * .6 - r.top) / r.height));
      tl.style.setProperty('--p', p.toFixed(3));
      tl.querySelectorAll('li').forEach(function (li) { li.classList.toggle('is-past', li.getBoundingClientRect().top < vh * .6); });
      ticking = false;
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  // ---------- До / после ----------
  function initBeforeAfter() {
    document.querySelectorAll('[data-ba]').forEach(function (box) {
      var r = box.querySelector('input[type="range"]');
      function set() { box.style.setProperty('--pos', r.value + '%'); r.setAttribute('aria-valuetext', r.value < 15 ? 'показано «после»' : r.value > 85 ? 'показано «до»' : 'до — слева, после — справа'); }
      r.addEventListener('input', set); set();
    });
  }

  // ---------- Параллакс первого экрана ----------
  function initParallax() {
    var layers = document.querySelectorAll('[data-parallax]');
    if (!layers.length || reduce) return;
    var ticking = false;
    addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var y = scrollY;
        if (y < innerHeight * 1.2) layers.forEach(function (l) { l.style.transform = 'translate3d(0,' + (y * +l.getAttribute('data-parallax')).toFixed(1) + 'px,0)'; });
        ticking = false;
      });
    }, { passive: true });
  }

  // ---------- Калькулятор ----------
  function initCalc() {
    var box = document.querySelector('[data-calc]');
    if (!box || typeof CALC === 'undefined') return;
    var svcSel = box.querySelector('[name="calc_service"]');
    var classBox = box.querySelector('[data-calc-classes]');
    var qtyWrap = box.querySelector('[data-calc-qty]');
    var qty = box.querySelector('[name="calc_qty"]');
    var out = box.querySelector('[data-calc-out]');
    var outNote = box.querySelector('[data-calc-note]');
    var book = box.querySelector('[data-calc-book]');
    CALC.services.forEach(function (s) { svcSel.add(new Option(s.name, s.id)); });
    classBox.innerHTML = CALC.classes.map(function (c, i) {
      return '<label class="opt-card"><input type="radio" name="calc_class" value="' + c.id + '"' + (i === 1 ? ' checked' : '') + '><span><b>' + c.name + '</b><small>' + c.example + '</small></span></label>';
    }).join('');
    var pre = new URLSearchParams(location.search).get('calc');
    if (pre) svcSel.value = pre;
    function calc() {
      var s = CALC.services.filter(function (x) { return x.id === svcSel.value; })[0];
      var cEl = box.querySelector('[name="calc_class"]:checked');
      var c = CALC.classes.filter(function (x) { return x.id === (cEl && cEl.value); })[0] || CALC.classes[0];
      qtyWrap.hidden = !s.unit;
      var n = s.unit ? Math.max(1, Math.min(10, parseInt(qty.value, 10) || 1)) : 1;
      var lo = round100(s.base * c.k * n), hi = round100(lo * s.spread);
      out.textContent = hi > lo ? rub(lo) + ' — ' + rub(hi) : rub(lo);
      outNote.textContent = s.note + ' Итог — после диагностики, до начала работ.';
      var svcName = (document.querySelector('[data-svc-map="' + s.id + '"]') || {}).textContent || s.name;
      book.href = 'zapis.html?service=' + encodeURIComponent(svcName) + '&class=' + c.id + '&estimate=' + encodeURIComponent(out.textContent);
    }
    box.addEventListener('input', calc); box.addEventListener('change', calc);
    calc();
  }

  // ---------- Карта зон выезда ----------
  function initZones() {
    document.querySelectorAll('[data-zones]').forEach(function (box) {
      var items = box.querySelectorAll('[data-zone]');
      function on(z) { box.setAttribute('data-active', z); }
      function off() { box.removeAttribute('data-active'); }
      items.forEach(function (it) {
        var z = it.getAttribute('data-zone');
        it.addEventListener('mouseenter', function () { on(z); });
        it.addEventListener('mouseleave', off);
        it.addEventListener('focus', function () { on(z); });
        it.addEventListener('blur', off);
        it.addEventListener('click', function () { on(z); });
      });
    });
  }

  // ---------- Копировать номер ----------
  function toast(text) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    setTimeout(function () { t.classList.remove('is-on'); setTimeout(function () { t.remove(); }, 300); }, 2200);
  }
  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-copy');
        try { navigator.clipboard.writeText(v).then(function () { toast('Номер скопирован: ' + v); }, function () { toast(v); }); } catch (e) { toast(v); }
      });
    });
  }

  // ---------- Пошаговая запись ----------
  function initWizard() {
    var form = document.querySelector('[data-wizard]');
    if (!form) return;
    var steps = Array.prototype.slice.call(form.querySelectorAll('[data-step]'));
    var marks = Array.prototype.slice.call(document.querySelectorAll('[data-step-mark]'));
    var back = form.querySelector('[data-back]'), next = form.querySelector('[data-next]'), submit = form.querySelector('[type="submit"]');
    var summary = form.querySelector('[data-summary]');
    var KEY = 'zapis-draft', cur = 0;

    // восстановить черновик
    var params = new URLSearchParams(location.search);
    var draft = null; try { draft = JSON.parse(store(KEY) || 'null'); } catch (e) {}
    if (draft) {
      Object.keys(draft).forEach(function (n) {
        var els = form.querySelectorAll('[name="' + n + '"]');
        els.forEach(function (el) {
          if (el.type === 'radio' || el.type === 'checkbox') el.checked = el.value === draft[n] || (el.type === 'checkbox' && draft[n] === true);
          else if (el.type !== 'file') el.value = draft[n];
        });
      });
      var dEl = form.querySelector('input[type="date"]');
      if (dEl && dEl.value && dEl.value < dEl.min) dEl.value = '';
      if (dEl && window.SiteFillSlots) { var tv = draft.time; window.SiteFillSlots(dEl, form.querySelector('select[name="time"]')); if (tv) form.querySelector('select[name="time"]').value = tv; }
      var cb = form.querySelector('[data-callback-only]'); if (cb) cb.dispatchEvent(new Event('change'));
      var note = document.querySelector('[data-draft-note]'); if (note) note.hidden = false;
    }
    if (params.get('service')) {
      form.querySelectorAll('[name="service"]').forEach(function (r) { if (r.value === params.get('service')) r.checked = true; });
    }
    if (params.get('class')) form.querySelectorAll('[name="carclass"]').forEach(function (r) { r.checked = r.getAttribute('data-id') === params.get('class'); });
    if (params.get('estimate')) { var est = form.querySelector('[name="estimate"]'); if (est) est.value = params.get('estimate'); }

    function save() {
      var d = {};
      form.querySelectorAll('input, select, textarea').forEach(function (el) {
        if (!el.name || el.type === 'file' || el.type === 'hidden' || el.closest('.hp')) return;
        if (el.type === 'radio') { if (el.checked) d[el.name] = el.value; }
        else if (el.type === 'checkbox') d[el.name] = el.checked;
        else d[el.name] = el.value;
      });
      store(KEY, JSON.stringify(d));
    }
    form.addEventListener('input', save); form.addEventListener('change', save);
    form.addEventListener('site:sent', function () { store(KEY, null); marks.forEach(function (m) { m.classList.add('is-done'); m.removeAttribute('aria-current'); }); });

    function show(i, focus) {
      cur = i;
      steps.forEach(function (s, n) { s.hidden = n !== i; });
      marks.forEach(function (m, n) {
        m.classList.toggle('is-done', n < i);
        if (n === i) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
        var b = m.querySelector('button'); if (b) b.disabled = n >= i;
      });
      back.hidden = i === 0;
      next.hidden = i === steps.length - 1;
      submit.hidden = i !== steps.length - 1;
      if (i === steps.length - 1) renderSummary();
      if (focus) { var h = steps[i].querySelector('legend, h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } }
      var top = form.getBoundingClientRect().top + scrollY - 90;
      if (focus && scrollY > top) scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    }
    function renderSummary() {
      var fd = new FormData(form), rows = [];
      function add(l, v) { if (v) rows.push('<div><dt>' + l + '</dt><dd>' + String(v).replace(/[<>&]/g, '') + '</dd></div>'); }
      add('Услуга', fd.get('service') || 'Консультация');
      add('Машина', [fd.get('car'), fd.get('carclass')].filter(Boolean).join(', '));
      add('Ориентир', fd.get('estimate'));
      add('Когда', fd.get('callback_only') ? 'перезвоните, подберём время' : [fd.get('date') && fd.get('date').split('-').reverse().join('.'), fd.get('time')].filter(Boolean).join(' в '));
      add('Что случилось', fd.get('message'));
      var files = form.querySelector('[type="file"]'); if (files && files.files.length) add('Фото', files.files.length + ' шт.');
      summary.innerHTML = rows.join('');
    }
    next.addEventListener('click', function () { if (window.SiteCheckForm(form, steps[cur])) show(cur + 1, true); });
    back.addEventListener('click', function () { show(cur - 1, true); });
    marks.forEach(function (m, n) { var b = m.querySelector('button'); if (b) b.addEventListener('click', function () { if (n < cur) show(n, true); }); });
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && cur < steps.length - 1) { e.preventDefault(); next.click(); }
    });
    show(0, false);
  }

  window.SiteExtras.push(initTheme, initCounters, initTimeline, initBeforeAfter, initParallax, initCalc, initZones, initCopy, initWizard);
})();

/* ---------------------------------------------------------------------
   Дальше код сайта. Менять не нужно — все настройки выше.
   --------------------------------------------------------------------- */
(function () {
  'use strict';

  var DAY_NAMES = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var DAY_ACC = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];

  // ---------- Время в часовом поясе сервиса ----------
  function nowParts() {
    try {
      var f = new Intl.DateTimeFormat('en-GB', { timeZone: SITE.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hour12: false });
      var p = {};
      f.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
      return { day: wd, min: (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10), date: p.year + '-' + p.month + '-' + p.day };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes(), date: d.toISOString().slice(0, 10) };
    }
  }
  function toMin(hhmm) { var a = hhmm.split(':'); return +a[0] * 60 + +a[1]; }
  function fmt(hhmm) { return hhmm.replace(/^0/, ''); }

  function status() {
    var n = nowParts(), today = SITE.hours[n.day];
    if (today && n.min >= toMin(today[0]) && n.min < toMin(today[1])) {
      return { open: true, closes: fmt(today[1]), minutesLeft: toMin(today[1]) - n.min, now: n };
    }
    // ищем ближайшее открытие
    for (var i = 0; i < 8; i++) {
      var d = (n.day + i) % 7, h = SITE.hours[d];
      if (!h) continue;
      if (i === 0 && n.min >= toMin(h[0])) continue;
      var when = i === 0 ? 'сегодня' : i === 1 ? 'завтра' : DAY_ACC[d];
      return { open: false, nextWhen: when, nextTime: fmt(h[0]), now: n };
    }
    return { open: false, nextWhen: '', nextTime: '', now: n };
  }
  window.SiteStatus = status;

  function callbackText() {
    var s = status();
    if (s.open && s.minutesLeft > SITE.callbackMinutes) return 'в течение ' + SITE.callbackMinutes + ' минут';
    if (s.open) return nextOpenAfterToday() + ', в первый час работы';
    return s.nextWhen + ' с ' + s.nextTime + ', в первый час работы';
  }
  function nextOpenAfterToday() {
    var n = nowParts();
    for (var i = 1; i < 8; i++) {
      var d = (n.day + i) % 7, h = SITE.hours[d];
      if (h) return (i === 1 ? 'завтра' : DAY_ACC[d]) + ' с ' + fmt(h[0]);
    }
    return '';
  }
  window.SiteCallbackText = callbackText;

  function renderStatus() {
    var s = status();
    document.querySelectorAll('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', s.open);
      el.classList.toggle('is-closed', !s.open);
      var t = el.querySelector('[data-status-text]') || el;
      t.textContent = s.open
        ? 'Сейчас открыто, работаем до ' + s.closes
        : 'Сейчас закрыто. Откроемся ' + s.nextWhen + ' в ' + s.nextTime;
    });
    document.querySelectorAll('[data-callback]').forEach(function (el) { el.textContent = callbackText(); });
    document.querySelectorAll('[data-day]').forEach(function (row) {
      row.classList.toggle('is-today', row.getAttribute('data-day').split(' ').indexOf(String(s.now.day)) !== -1);
    });
  }

  // ---------- Меню ----------
  function initBurger() {
    var btn = document.querySelector('[data-burger]');
    if (!btn) return;
    var nav = document.getElementById(btn.getAttribute('aria-controls'));
    function set(open) { btn.setAttribute('aria-expanded', open ? 'true' : 'false'); nav.classList.toggle('is-open', open); }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
  }

  // ---------- Маска телефона ----------
  // Возвращает «7» + до 10 цифр номера. Префикс +7 может стоять где угодно
  // (если курсор оказался перед ним), поэтому убираем именно его, а не первую цифру.
  function phoneDigits(v) {
    v = String(v);
    var d;
    if (v.indexOf('+7') !== -1) {
      d = v.replace('+7', '').replace(/\D/g, '');
      // набрали «8 916…» или «+7 916…» поверх готового +7 — лишнюю первую цифру убираем
      if (d.length === 11 && (d.charAt(0) === '8' || d.charAt(0) === '7')) d = d.slice(1);
    } else {
      d = v.replace(/\D/g, '');
      if (d.charAt(0) === '8' || d.charAt(0) === '7') d = d.slice(1);
    }
    d = d.slice(0, 10);
    return d ? '7' + d : (v.indexOf('+7') !== -1 ? '7' : '');
  }
  function phoneFormat(d) {
    if (!d) return '';
    var r = '+7';
    if (d.length > 1) r += ' (' + d.slice(1, 4);
    if (d.length > 4) r += ') ' + d.slice(4, 7);   // скобку ставим только когда пошли следующие цифры — иначе её не стереть
    if (d.length > 7) r += '-' + d.slice(7, 9);
    if (d.length > 9) r += '-' + d.slice(9, 11);
    return r;
  }
  function initPhoneMask(root) {
    (root || document).querySelectorAll('input[type="tel"]').forEach(function (inp) {
      if (inp.dataset.masked) return;
      inp.dataset.masked = '1';
      inp.addEventListener('input', function () {
        var d = phoneDigits(inp.value);
        inp.value = phoneFormat(d);
      });
      inp.addEventListener('focus', function () {
        if (inp.value) return;
        inp.value = '+7 (';
        setTimeout(function () { try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {} }, 0);
      });
      inp.addEventListener('blur', function () { if (phoneDigits(inp.value).length <= 1) inp.value = ''; });
    });
  }

  // ---------- Проверка полей ----------
  var PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  function checkField(el) {
    var v = (el.value || '').trim(), rule = el.getAttribute('data-rule'), msg = '';
    if (el.required && !v && el.type !== 'file') {
      msg = el.getAttribute('data-required-msg') || (rule === 'phone' ? 'Укажите телефон, по нему мы перезвоним.' : el.tagName === 'SELECT' ? 'Выберите вариант.' : 'Заполните это поле.');
    } else if (rule === 'phone' && v && phoneDigits(v).length !== 11) {
      msg = 'В номере не хватает цифр. Нужно 11: +7 и ещё 10.';
    } else if (rule === 'name' && v && !/^[A-Za-zА-Яа-яЁё\s\-.']{1,60}$/.test(v)) {
      msg = 'В имени — только буквы.';
    } else if (rule === 'photos' && el.files && el.files.length) {
      if (el.files.length > SITE.maxPhotos) msg = 'Можно до ' + SITE.maxPhotos + ' фото. Выберите заново.';
      for (var i = 0; i < el.files.length && !msg; i++) {
        var f = el.files[i];
        if (PHOTO_TYPES.indexOf(f.type) === -1 && !/\.(jpe?g|png|webp|heic)$/i.test(f.name)) msg = 'Файл «' + f.name + '» не фото. Подходят JPG, PNG, WEBP, HEIC.';
        else if (f.size > SITE.maxPhotoMb * 1024 * 1024) msg = 'Фото «' + f.name + '» больше ' + SITE.maxPhotoMb + ' МБ.';
      }
    } else if (el.type === 'date' && v && el.min && v < el.min) {
      msg = 'Эта дата уже прошла.';
    } else if (el.type === 'date' && v && el.max && v > el.max) {
      msg = 'Записываем не дальше чем на месяц вперёд.';
    } else if (rule === 'workday' && v && el.closest('[data-slots]') && el.closest('[data-slots]').querySelector('select').disabled) {
      msg = 'На этот день записаться нельзя. Выберите другой.';
    } else if (el.tagName === 'SELECT' && el.required && !v) {
      msg = 'Выберите вариант.';
    }
    setError(el, msg);
    return !msg;
  }
  function setError(el, msg) {
    var field = el.closest('.field') || el.parentNode;
    var id = (el.id || el.name) + '-err';
    var box = document.getElementById(id);
    if (msg) {
      if (!box) {
        box = document.createElement('p');
        box.className = 'field__error';
        box.id = id;
        field.appendChild(box);
      }
      box.textContent = msg;
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', id);
    } else {
      if (box) box.remove();
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    }
  }
  function checkForm(form, scope) {
    var ok = true, first = null;
    (scope || form).querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.type === 'hidden' || el.closest('.hp') || el.disabled || el.closest('[hidden]')) return;
      if (!checkField(el)) { ok = false; if (!first) first = el; }
    });
    if (first) first.focus();
    return ok;
  }
  window.SiteCheckForm = checkForm;

  // ---------- Текст заявки для мессенджеров ----------
  var LABELS = { name: 'Имя', phone: 'Телефон', service: 'Услуга', message: 'Комментарий', car: 'Машина', carclass: 'Класс машины',
    date: 'Дата', time: 'Время', address: 'Где машина', coords: 'Координаты', company: 'Компания', fleet: 'Машин в парке', estimate: 'Ориентир по цене', callback_only: 'Просто перезвоните' };
  function summary(form) {
    var lines = ['Здравствуйте! Заявка с сайта.'];
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.type === 'hidden' || el.type === 'file' || el.closest('.hp') || !el.value.trim()) return;
      if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
      var lbl = el.getAttribute('data-label') || LABELS[el.name] || (form.querySelector('label[for="' + el.id + '"]') || {}).textContent || el.name;
      lbl = String(lbl).replace(/(обязательно|по желанию|до 3 фото.*)$/i, '').trim();
      lines.push(lbl + ': ' + el.value.trim());
    });
    return lines.join('\n');
  }

  function fallbackHtml(form, serverMsg) {
    var text = summary(form);
    var wa = 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(text);
    var tg = 'https://t.me/' + SITE.telegram;
    return '<h3>Заявка не ушла</h3>' +
      '<p>' + (serverMsg ? escapeHtml(serverMsg) + ' ' : 'Нет связи с сервером. ') +
      'Ничего не потерялось: всё, что вы ввели, осталось в форме. Отправьте заявку другим способом:</p>' +
      '<div class="messengers">' +
      '<a class="btn btn--call" href="tel:' + SITE.phone + '">Позвонить ' + SITE.phoneHuman + '</a>' +
      '<a class="btn btn--wa" href="' + wa + '" target="_blank" rel="noopener">Отправить в WhatsApp</a>' +
      '<a class="btn btn--tg" href="' + tg + '" target="_blank" rel="noopener" data-copy-tg>Написать в Telegram</a>' +
      '</div>' +
      '<p class="muted" style="margin:.75rem 0 0">Для Telegram текст заявки скопируется сам — вставьте его в чат.</p>' +
      '<pre>' + escapeHtml(text) + '</pre>';
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function copy(text) {
    try { if (navigator.clipboard) return navigator.clipboard.writeText(text); } catch (e) {}
    var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {} ta.remove();
  }

  // ---------- Отправка ----------
  function initForms() {
    document.querySelectorAll('form[data-form]').forEach(function (form) {
      var ts = document.createElement('input');
      ts.type = 'hidden'; ts.name = 'ts'; ts.value = String(Date.now());
      form.appendChild(ts);
      if (FORM_ENDPOINT) form.querySelectorAll('[data-photos]').forEach(function (b) { b.hidden = true; });

      form.querySelectorAll('input, select, textarea').forEach(function (el) {
        el.addEventListener('blur', function () { if (el.hasAttribute('aria-invalid') || (el.value && el.type !== 'file')) checkField(el); });
        el.addEventListener('change', function () { if (el.type === 'file' || el.hasAttribute('aria-invalid')) checkField(el); });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (form.dataset.beforeSubmit && window[form.dataset.beforeSubmit] && window[form.dataset.beforeSubmit](form) === false) return;
        if (!checkForm(form)) return;
        send(form);
      });
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-copy-tg]');
      if (a) { var f = a.closest('form'); if (f) copy(summary(f)); }
    });
  }

  function send(form) {
    var btn = form.querySelector('[type="submit"]');
    var fb = form.querySelector('[data-fallback]');
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }
    if (fb) { fb.hidden = true; fb.innerHTML = ''; }

    var data = new FormData(form);
    var url = FORM_ENDPOINT || form.getAttribute('action') || 'send.php';
    if (FORM_ENDPOINT) data.delete('photos[]');

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

    fetch(url, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) {
        return res.text().then(function (t) {
          var j = null; try { j = JSON.parse(t); } catch (e) {}
          if (res.ok && (FORM_ENDPOINT ? true : j && j.ok)) return { ok: true };
          return { ok: false, msg: j && (j.message || j.error) };
        });
      })
      .catch(function () { return { ok: false }; })
      .then(function (r) {
        clearTimeout(timer);
        if (btn) { btn.disabled = false; btn.textContent = label; }
        if (r.ok) return success(form);
        if (fb) { fb.innerHTML = fallbackHtml(form, r.msg); fb.hidden = false; fb.setAttribute('tabindex', '-1'); fb.focus(); }
        form.dispatchEvent(new CustomEvent('site:failed'));
      });
  }

  function success(form) {
    var nameEl = form.querySelector('[name="name"]');
    var name = nameEl && nameEl.value.trim() ? nameEl.value.trim() + ', з' : 'З';
    var box = document.createElement('div');
    box.className = 'done';
    box.setAttribute('role', 'status');
    box.setAttribute('tabindex', '-1');
    box.innerHTML = '<h3>' + escapeHtml(name) + 'аявка принята</h3>' +
      '<p>Перезвоним ' + escapeHtml(callbackText()) + '. Если срочно — звоните сами: <a href="tel:' + SITE.phone + '">' + SITE.phoneHuman + '</a>.</p>';
    form.dispatchEvent(new CustomEvent('site:sent'));
    form.replaceWith(box);
    box.focus();
  }

  // ---------- Кнопки «Записаться на …» подставляют услугу ----------
  function initBookLinks() {
    function pick(service, target) {
      var sel = document.querySelector((target || 'form[data-form]') + ' select[name="service"]');
      if (!sel) return;
      if (sel) for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === service || sel.options[i].value === service) sel.selectedIndex = i;
      sel && sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-book]');
      if (a) pick(a.getAttribute('data-book'), a.getAttribute('data-target'));
    });
    var q = new URLSearchParams(location.search).get('service');
    if (q) pick(q);
  }

  window.SitePhoneMask = initPhoneMask;

  function init() {
    renderStatus();
    setInterval(renderStatus, 60000);
    initBurger();
    initPhoneMask();
    // доп. функции раньше форм: их обработчики (например, слоты) должны срабатывать до проверки полей
    if (window.SiteExtras) window.SiteExtras.forEach(function (fn) { try { fn(); } catch (e) { if (window.console) console.error(e); } });
    initForms();
    initBookLinks();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
