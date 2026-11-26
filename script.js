/* =========================================================
   Свой в Далате — скрипты лендинга
   - плавный скролл к якорям с учётом фиксированной шапки
   - мобильное меню
   - шапка и плавающая кнопка Telegram при прокрутке
   - появление блоков при скролле
   - местное время в Далате
   - подсветка карточек за курсором
   ========================================================= */
(() => {
  const header = document.getElementById('site-header');
  const menu = document.getElementById('mobile-menu');
  const menuToggle = document.getElementById('menu-toggle');
  const hero = document.getElementById('top');
  const fab = document.getElementById('fab-telegram');
  const footer = document.getElementById('contacts');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Telegram на телефоне — сразу в приложении ---------- */
  // Сайт t.me блокируют, например, мобильные операторы во Вьетнаме — в браузере телефона ссылка
  // падает с ошибкой. Ссылка tg:// открывает приложение Telegram напрямую, минуя t.me.
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isMobile = isAndroid || /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const telegramHref = (httpsUrl) => {
    if (!isMobile) return httpsUrl;
    const url = new URL(httpsUrl);
    const domain = url.pathname.split('/')[1];
    const text = url.searchParams.get('text');
    const query = `domain=${domain}${text ? `&text=${encodeURIComponent(text)}` : ''}`;
    // Android: если Telegram не установлен, Chrome сам откроет обычную ссылку
    return isAndroid
      ? `intent://resolve?${query}#Intent;scheme=tg;S.browser_fallback_url=${encodeURIComponent(httpsUrl)};end`
      : `tg://resolve?${query}`;
  };

  const openTelegram = (httpsUrl) => {
    if (isMobile) window.location.href = telegramHref(httpsUrl);
    else window.open(httpsUrl, '_blank', 'noopener,noreferrer');
  };

  /* ---------- Smart CTA: сообщение в Telegram зависит от места кнопки ---------- */
  // Метка data-tg у ссылки: «general», «service:Название услуги», «road:откуда или как едет» или «housing[:что ищем]»
  const TELEGRAM_CHAT = 'https://t.me/razumovdimka';
  const telegramMessage = (kind, detail) => {
    if (kind === 'service') return `Здравствуйте! Интересует услуга «${detail}» в Далате. Подскажите детали: `;
    if (kind === 'road') return `Здравствуйте! Еду в Далат (${detail}). Подскажите, как лучше добраться и что учесть в дороге: `;
    if (kind === 'housing') return `Здравствуйте! Ищу жильё в Далате${detail ? ` (${detail})` : ''}. Мои даты и бюджет: `;
    return 'Здравствуйте! Я с сайта «Свой в Далате». Хочу спросить про поездку в Далат: ';
  };
  const telegramUrl = (kind, detail) => `${TELEGRAM_CHAT}?text=${encodeURIComponent(telegramMessage(kind, detail))}`;

  // Ставит ссылке адрес с готовым текстом; на телефоне — через приложение Telegram
  const setTelegramLink = (link, kind, detail) => {
    link.href = telegramHref(telegramUrl(kind, detail));
    if (isMobile) {
      link.removeAttribute('target');
    } else {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  };

  document.querySelectorAll('a[data-tg]').forEach((link) => {
    const [kind, ...rest] = link.dataset.tg.split(':');
    setTelegramLink(link, kind, rest.join(':'));
  });

  // Остальные ссылки на t.me (без метки) просто открываем приложением
  if (isMobile) {
    document.querySelectorAll('a[href^="https://t.me/"]').forEach((link) => {
      link.href = telegramHref(link.href);
      link.removeAttribute('target');
    });
  }

  /* ---------- Экран загрузки (установленное приложение) ---------- */
  const splash = document.getElementById('splash');
  if (splash) {
    if (!document.documentElement.classList.contains('has-splash')) {
      splash.remove();
    } else {
      try { sessionStorage.setItem('splash-shown', '1'); } catch (err) { /* без памяти покажется ещё раз — не страшно */ }
      let hidden = false;
      const hideSplash = () => {
        if (hidden) return;
        hidden = true;
        splash.classList.add('is-out');
        setTimeout(() => { splash.remove(); document.documentElement.classList.remove('has-splash'); }, 600);
      };
      const afterLoad = () => setTimeout(hideSplash, Math.max(0, 900 - performance.now())); // не мелькает, но и не держит дольше нужного
      if (document.readyState === 'complete') afterLoad(); else window.addEventListener('load', afterLoad);
      setTimeout(hideSplash, 4000); // на медленной сети всё равно открываем сайт
    }
  }

  /* ---------- Мобильное меню ---------- */
  const setMenu = (open) => {
    menu.classList.toggle('hidden', !open);
    // Пока меню открыто, страница под ним не прокручивается
    document.documentElement.style.overflow = open ? 'hidden' : '';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menuToggle.querySelector('.icon-open').classList.toggle('hidden', open);
    menuToggle.querySelector('.icon-close').classList.toggle('hidden', !open);
  };

  menuToggle.addEventListener('click', () => setMenu(menu.classList.contains('hidden')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------- Свёрнутые блоки ---------- */
  // Форма отзыва скрыта, пока не нажали «Оставить отзыв» (или не пришли по ссылке #leave-review)
  const reviewBox = document.getElementById('leave-review');
  if (reviewBox && location.hash !== '#leave-review') reviewBox.hidden = true;
  // На широком экране места хватает — «Читать дальше» и «Уточнить детали» сразу раскрыты
  if (window.matchMedia('(min-width: 640px)').matches) {
    document.querySelectorAll('details[data-open-wide]').forEach((d) => { d.open = true; });
  }

  /* ---------- Плавный скролл к якорям ---------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    if (target === reviewBox) reviewBox.hidden = false;
    setMenu(false); // закрываем меню до расчёта, чтобы высота шапки была верной

    // Цель и всё выше неё показываем сразу, чтобы после перехода не было пустых экранов
    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    document.querySelectorAll('.reveal').forEach((el) => {
      if (el === target || target.contains(el) || el.getBoundingClientRect().top + window.scrollY <= targetTop) {
        el.classList.add('is-visible');
      }
    });

    const top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight;
    window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  });

  /* ---------- Шапка и плавающая кнопка при прокрутке ---------- */
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10);

    // Телефон: шапка прячется при прокрутке вниз и возвращается при прокрутке вверх
    const dy = y - lastY;
    if (Math.abs(dy) > 8) {
      const menuOpen = !menu.classList.contains('hidden');
      const hide = dy > 0 && y > 80 && window.innerWidth < 640 && !menuOpen;
      header.classList.toggle('is-hidden', hide);
      lastY = y;
    }

    // Кнопка видна после hero и прячется в футере, где уже есть своя кнопка Telegram
    const pastHero = y > hero.offsetHeight * 0.7;
    const inFooter = footer.getBoundingClientRect().top < window.innerHeight - 120;
    fab.classList.toggle('is-visible', pastHero && !inFooter);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Появление блоков при скролле ---------- */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

    revealEls.forEach((el) => {
      // Большие блоки не прячем — иначе на экране остаётся пустота
      if (el.offsetHeight > 600) el.classList.add('is-visible');
      else observer.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Местное время в Далате ---------- */
  const timeEls = document.querySelectorAll('[data-dalat-time]');
  const dalatTime = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh'
  });

  const updateTime = () => {
    const now = dalatTime.format(new Date());
    timeEls.forEach((el) => { el.textContent = now; });
  };

  /* ---------- «Живое окно»: утро, день, вечер или ночь в Далате ---------- */
  // Для проверки: ?daypart=night (morning, day, evening)
  const DAYPART_TEXT = {
    morning: { msg: 'Доброе утро! Над озером туман — к обеду рассеется ☁️', status: 'в сети' },
    day: { msg: 'Возьмите кофту — вечером в горах свежо 🙂', status: 'в сети' },
    evening: { msg: 'Закат над Суан Хыонг — лучшее время для прогулки 🌅', status: 'в сети' },
    night: { msg: 'В Далате ночь. Пишите — отвечу утром 🌙', status: 'ответит утром' }
  };
  const forcedDaypart = new URLSearchParams(location.search).get('daypart');
  const dalatHour = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Ho_Chi_Minh' });
  const daypartMsg = document.querySelector('[data-daypart-msg]');
  const daypartStatus = document.querySelector('[data-daypart-status]');

  const updateDaypart = () => {
    const hour = Number(dalatHour.format(new Date()));
    let part = hour >= 5 && hour < 9 ? 'morning' : hour < 17 && hour >= 9 ? 'day' : hour >= 17 && hour < 19 ? 'evening' : 'night';
    if (DAYPART_TEXT[forcedDaypart]) part = forcedDaypart;
    if (document.documentElement.dataset.daypart === part) return;
    document.documentElement.dataset.daypart = part;
    if (daypartMsg) daypartMsg.textContent = DAYPART_TEXT[part].msg;
    if (daypartStatus) daypartStatus.textContent = DAYPART_TEXT[part].status;
  };

  updateTime();
  updateDaypart();
  setInterval(() => { updateTime(); updateDaypart(); }, 15000);

  /* ---------- Погода в Далате (Open-Meteo, без ключа) ---------- */
  // Нет сети или сервис не ответил — молча показываем только время
  const weatherEls = document.querySelectorAll('[data-dalat-weather]');
  // Только температура: прогноз дождя от сервиса часто не совпадал с реальностью, поэтому его на сайте нет
  const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=11.9404&longitude=108.4583&current_weather=true';
  const WEATHER_TTL_MS = 15 * 60 * 1000;

  const showWeather = (temp) => {
    const rounded = Math.round(temp);
    const label = `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)}°C`;
    weatherEls.forEach((el) => {
      el.textContent = ` · ${label}`;
      el.hidden = false;
    });
  };

  const loadWeather = async () => {
    try {
      const cached = JSON.parse(sessionStorage.getItem('dalat-weather') || 'null');
      if (cached && Date.now() - cached.at < WEATHER_TTL_MS) {
        showWeather(cached.temp);
        return;
      }
    } catch (err) { /* sessionStorage недоступен — идём в сеть */ }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(WEATHER_URL, { signal: controller.signal });
      if (!res.ok) return;
      const temp = Number((await res.json()).current_weather?.temperature);
      if (!Number.isFinite(temp)) return;
      showWeather(temp);
      try { sessionStorage.setItem('dalat-weather', JSON.stringify({ temp, at: Date.now() })); } catch (err) { /* не критично */ }
    } catch (err) {
      /* без погоды сайт работает как раньше */
    } finally {
      clearTimeout(timer);
    }
  };

  if (weatherEls.length) {
    loadWeather();
    setInterval(loadWeather, WEATHER_TTL_MS);
  }

  /* ---------- «Рентген объявления»: точка на рисунке ↔ пункт списка ---------- */
  const xray = document.querySelector('[data-xray]');
  if (xray) {
    const pins = xray.querySelectorAll('[data-xray-pin]');
    const items = xray.querySelectorAll('[data-xray-item]');
    const setActive = (i, fromPin) => {
      pins.forEach((pin, k) => pin.setAttribute('aria-pressed', String(k === i)));
      items.forEach((item, k) => item.classList.toggle('is-active', k === i));
      // На телефоне список под картинкой: показываем выбранный пункт, если он ниже экрана
      if (fromPin && window.matchMedia('(max-width: 1023px)').matches) {
        const box = items[i].getBoundingClientRect();
        if (box.bottom > window.innerHeight - 80) items[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }
    };
    pins.forEach((pin, i) => pin.addEventListener('click', () => setActive(i, true)));
    items.forEach((item, i) => {
      item.addEventListener('click', () => setActive(i, false));
      item.addEventListener('mouseenter', () => setActive(i, false));
    });
  }

  /* ---------- Планировщик поездки: месяц → сезон, чемодан, открытка в Telegram ---------- */
  // Температуры — средние дневные максимумы и ночные минимумы Далата (многолетние, округлены)
  const plan = document.querySelector('[data-plan]');
  if (plan) {
    const M_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const M_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const M_IN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
    const HI = [22, 23, 24, 25, 24, 23, 23, 22, 23, 22, 22, 21];
    const LO = [12, 12, 14, 15, 16, 16, 16, 16, 16, 15, 14, 13];
    const SEASON = ['dry', 'dry', 'dry', 'mid', 'rain', 'rain', 'rain', 'rain', 'rain', 'rain', 'mid', 'dry'];
    const SEASON_TEXT = {
      dry: 'Сухой сезон: солнечно, ночи прохладные',
      mid: 'Межсезонье: солнце и первые или последние ливни',
      rain: 'Сезон дождей: ливни обычно после обеда, утро ясное'
    };
    const NOTE = [
      'Цветёт далатская сакура (mai anh đào). Ближе к Тету жильё дорожает — бронируйте заранее.',
      'Тет, вьетнамский Новый год, — в январе или феврале: цены выше, многое закрыто на несколько дней.',
      'В марте–апреле цветут фиолетовые жакаранды.',
      'Жакаранды ещё цветут; к концу месяца возможны первые ливни.',
      'Начало дождей: туристов обычно меньше, с жильём проще.',
      'Зелено и свежо. Берите обувь, которая быстро сохнет.',
      'На побережье в это время жара, а в Далате свежо; ливни обычно короткие.',
      'Пик дождей: дела и прогулки лучше планировать на утро.',
      'Ещё дождливо. 2 сентября — национальный праздник, в выходные людно.',
      'Дожди идут на спад; в конце месяца зацветают дикие подсолнухи.',
      'Цветут дикие подсолнухи (dã quỳ) — время для прогулок по холмам.',
      'Конец года — много туристов, на праздники жильё бронируйте заранее. К концу месяца зацветает сакура.'
    ];
    const PACK = {
      dry: [['🧥', 'Свитер или худи', 'вечером +12…+14°'], ['🧦', 'Тёплые носки', 'в домах нет отопления'], ['🧴', 'Крем SPF 50', 'на высоте 1500 м солнце жёсткое'], ['🧣', 'Ветровка', 'на байке продувает']],
      mid: [['🧥', 'Свитер', 'вечером свежо'], ['☔', 'Лёгкий дождевик', 'бывают ливни'], ['🧴', 'Крем SPF 50', 'днём солнце жёсткое'], ['🧦', 'Тёплые носки', 'в домах нет отопления']],
      rain: [['☔', 'Дождевик-пончо', 'ливни после обеда'], ['👟', 'Обувь, что быстро сохнет', 'кроссовки за ночь не высохнут'], ['🧥', 'Свитер', 'вечером около +16°'], ['🎒', 'Гермомешок', 'для телефона и документов']]
    };
    const WHO = [['one', 'Один человек', 'нас будет один человек'], ['two', 'Двое', 'нас будет двое'], ['kids', 'С детьми', 'едем семьёй с детьми']];
    const WHAT = [
      ['consult', 'Консультация', 'Интересует консультация'],
      ['housing', 'Подбор жилья', 'Интересует подбор жилья'],
      ['turnkey', 'Под ключ', 'Интересует пакет «Переезд под ключ»'],
      ['unsure', 'Пока не знаю', 'Пока не знаю, что выбрать, — подскажите']
    ];
    const plural = (n, one, few, many) => {
      const m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return one;
      return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
    };

    // Сегодня — по часам Далата
    const [dY, dM, dD] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()).split('-').map(Number);
    const todayUtc = Date.UTC(dY, dM - 1, dD);
    const state = { month: dM % 12, who: '', what: '' };

    const monthsBox = plan.querySelector('[data-plan-months]');
    M_SHORT.forEach((name, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `plan__month plan__month--${SEASON[i]}`;
      btn.textContent = name;
      btn.setAttribute('aria-label', M_FULL[i]);
      btn.addEventListener('click', () => { state.month = i; render(); });
      monthsBox.appendChild(btn);
    });
    const chips = (box, list, key) => list.forEach(([value, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'postcard__chip';
      btn.dataset.value = value;
      btn.textContent = label;
      btn.addEventListener('click', () => { state[key] = state[key] === value ? '' : value; render(); });
      box.appendChild(btn);
    });
    chips(plan.querySelector('[data-plan-who]'), WHO, 'who');
    chips(plan.querySelector('[data-plan-what]'), WHAT, 'what');

    const sendLink = plan.querySelector('[data-plan-send]');
    const render = () => {
      const m = state.month;
      monthsBox.querySelectorAll('.plan__month').forEach((btn, i) => btn.setAttribute('aria-pressed', String(i === m)));
      // Выбранный месяц — в центр ленты (на телефоне она листается)
      const active = monthsBox.children[m];
      monthsBox.scrollLeft = active.offsetLeft - monthsBox.offsetLeft - (monthsBox.clientWidth - active.offsetWidth) / 2;
      plan.querySelectorAll('.postcard__chip').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.value === state.who || btn.dataset.value === state.what)));

      const year = m + 1 >= dM ? dY : dY + 1;
      const days = Math.round((Date.UTC(year, m, 1) - todayUtc) / 86400000);
      plan.querySelector('[data-plan-count]').textContent = m + 1 === dM ? 'Уже в этом месяце' : `Через ${days} ${plural(days, 'день', 'дня', 'дней')}`;
      plan.querySelector('[data-plan-season]').textContent = SEASON_TEXT[SEASON[m]];
      plan.querySelector('[data-plan-temps]').textContent = `Днём около +${HI[m]}°, ночью около +${LO[m]}°`;
      plan.querySelector('[data-plan-note]').textContent = NOTE[m];
      plan.querySelector('[data-plan-items]').innerHTML = PACK[SEASON[m]]
        .map(([ico, name, why]) => `<li><span class="plan__ico" aria-hidden="true">${ico}</span><b>${name}</b><span>${why}</span></li>`).join('');
      plan.querySelector('[data-plan-postmark]').textContent = `${String(m + 1).padStart(2, '0')}·${String(year).slice(2)}`;

      const who = WHO.find(([v]) => v === state.who);
      const what = WHAT.find(([v]) => v === state.what);
      const text = `Xin chào! Планирую в Далат в ${M_IN[m]} ${year}${who ? `, ${who[2]}` : ''}. ${what ? `${what[2]}.` : 'Подскажите, с чего начать.'} `;
      plan.querySelector('[data-plan-msg]').textContent = text.trim();
      sendLink.href = telegramHref(`${TELEGRAM_CHAT}?text=${encodeURIComponent(text)}`);
      if (isMobile) sendLink.removeAttribute('target');
    };
    render();

  }

  /* ---------- «Сейчас у вас и в Далате»: погода и климат по месяцам ---------- */
  // Средние температуры месяцев (°C, многолетние, округлены) — ориентир. Город по умолчанию — по часовому поясу браузера
  const climateBox = document.querySelector('[data-climate]');
  if (climateBox) {
    const DALAT = { name: 'Далат', lat: 11.9404, lon: 108.4583, t: [16.6, 17.4, 18.5, 19.6, 20, 19.8, 19.3, 19.2, 19.2, 18.7, 18, 17] };
    const CITIES = {
      msk: { name: 'Москва', lat: 55.7558, lon: 37.6173, t: [-6.2, -5.9, -0.9, 6.5, 13.2, 17, 19.2, 17, 11.3, 5.6, -0.2, -4.5] },
      spb: { name: 'Санкт-Петербург', lat: 59.9386, lon: 30.3141, t: [-5.5, -5.8, -1.3, 5.1, 11.3, 15.7, 18.8, 16.9, 11.6, 5.6, 0.2, -3] },
      kzn: { name: 'Казань', lat: 55.7887, lon: 49.1221, t: [-10.4, -9.4, -3.3, 5.7, 13.1, 17.9, 20, 17.5, 11.3, 4.5, -2.7, -8.3] },
      sam: { name: 'Самара', lat: 53.1959, lon: 50.1002, t: [-9.9, -9.6, -3.3, 7, 15, 19.3, 21, 19, 12.9, 5.3, -2, -7.6] },
      krd: { name: 'Краснодар', lat: 45.0355, lon: 38.9753, t: [0.6, 1.6, 6.4, 12.6, 17.4, 21.6, 24.3, 23.6, 18, 12.2, 6.4, 1.9] },
      ekb: { name: 'Екатеринбург', lat: 56.8389, lon: 60.6057, t: [-12.6, -10.8, -3.7, 4.8, 11.7, 16, 18.5, 15.8, 9.9, 2.6, -5, -10.7] },
      oms: { name: 'Омск', lat: 54.9885, lon: 73.3242, t: [-16.3, -15.1, -7.6, 4.3, 11.9, 17.6, 19.4, 16.6, 10.6, 2.5, -7.1, -13.5] },
      nsk: { name: 'Новосибирск', lat: 55.0084, lon: 82.9357, t: [-16.5, -14.5, -6.6, 3.3, 11, 17, 19.4, 16.3, 10.4, 2.5, -7.7, -14] },
      krs: { name: 'Красноярск', lat: 56.0153, lon: 92.8932, t: [-15, -12.6, -4.6, 3, 10.5, 16.5, 18.8, 15.9, 9.5, 1.6, -7.3, -13.4] },
      irk: { name: 'Иркутск', lat: 52.287, lon: 104.305, t: [-17.4, -14.3, -5.5, 2.5, 9.6, 15.3, 18, 15.5, 8.9, 1, -8.6, -15.6] },
      vvo: { name: 'Владивосток', lat: 43.1155, lon: 131.8855, t: [-12.3, -8.6, -1.4, 5.2, 10.7, 14, 18.5, 20.4, 15.9, 8.3, -1.4, -9.2] },
      msq: { name: 'Минск', lat: 53.9006, lon: 27.559, t: [-4.5, -4.4, -0.2, 7, 13, 16.3, 18.4, 17.4, 12.1, 6.6, 0.7, -3.2] },
      ala: { name: 'Алматы', lat: 43.2389, lon: 76.8897, t: [-4.7, -3, 3.8, 11.6, 16.6, 21.8, 24.4, 23.7, 18.1, 10.3, 2.5, -2.9] }
    };
    const TZ_CITY = {
      'Europe/Moscow': 'msk', 'Europe/Samara': 'sam', 'Europe/Ulyanovsk': 'sam', 'Europe/Saratov': 'sam', 'Europe/Astrakhan': 'sam',
      'Asia/Yekaterinburg': 'ekb', 'Asia/Omsk': 'oms', 'Asia/Novosibirsk': 'nsk', 'Asia/Barnaul': 'nsk', 'Asia/Tomsk': 'nsk',
      'Asia/Novokuznetsk': 'nsk', 'Asia/Krasnoyarsk': 'krs', 'Asia/Irkutsk': 'irk', 'Asia/Vladivostok': 'vvo',
      'Europe/Minsk': 'msq', 'Asia/Almaty': 'ala'
    };
    const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const STORE_KEY = 'svoy:climate-city';
    const fmt = (t, digits = 0) => {
      const n = Number(t.toFixed(digits));
      return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('ru-RU')}°`;
    };

    const select = climateBox.querySelector('[data-climate-city]');
    const plot = climateBox.querySelector('[data-climate-plot]');
    Object.entries(CITIES).forEach(([key, c]) => select.add(new Option(c.name, key)));

    let cityKey = TZ_CITY[Intl.DateTimeFormat().resolvedOptions().timeZone] || 'msk';
    try { const saved = localStorage.getItem(STORE_KEY); if (CITIES[saved]) cityKey = saved; } catch (err) { /* без памяти — по поясу */ }
    select.value = cityKey;
    const nowMonth = Number(new Intl.DateTimeFormat('en-GB', { month: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())) - 1;

    // Сейчас: обе температуры одним запросом, кэш на вкладку 15 минут
    const showNow = (home, dalat) => {
      const c = CITIES[cityKey];
      climateBox.querySelector('[data-climate-home]').textContent = Number.isFinite(home) ? fmt(home) : '—';
      climateBox.querySelector('[data-climate-dalat]').textContent = Number.isFinite(dalat) ? fmt(dalat) : '—';
      const verdict = climateBox.querySelector('[data-climate-verdict]');
      if (!Number.isFinite(home) || !Number.isFinite(dalat)) {
        verdict.textContent = `${MONTHS[nowMonth]}: в среднем ${fmt(c.t[nowMonth])} у вас и ${fmt(DALAT.t[nowMonth])} в Далате`;
        return;
      }
      const diff = Math.round(dalat - home);
      verdict.textContent = diff >= 2 ? `В Далате теплее на ${diff}°`
        : diff <= -2 ? `В Далате прохладнее на ${-diff}° — зато без жары`
        : 'Сейчас почти одинаково';
    };
    const loadNow = async () => {
      const c = CITIES[cityKey];
      const cacheKey = `climate-now:${cityKey}`;
      try {
        const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
        if (cached && Date.now() - cached.at < WEATHER_TTL_MS) { showNow(cached.home, cached.dalat); return; }
      } catch (err) { /* идём в сеть */ }
      showNow(NaN, NaN);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat},${DALAT.lat}&longitude=${c.lon},${DALAT.lon}&current=temperature_2m`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const [home, dalat] = (await res.json()).map((r) => Number(r.current?.temperature_2m));
        if (select.value !== cityKey) return; // пока грузилось, выбрали другой город
        showNow(home, dalat);
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ home, dalat, at: Date.now() })); } catch (err) { /* не критично */ }
      } catch (err) {
        /* без сети остаются средние за месяц */
      } finally {
        clearTimeout(timer);
      }
    };

    // График: две линии по месяцам, текущий месяц подсвечен, подсказка при наведении или касании
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, parent) => {
      const node = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
      if (parent) parent.appendChild(node);
      return node;
    };
    const drawChart = () => {
      const c = CITIES[cityKey];
      const W = Math.max(280, plot.clientWidth);
      const H = W < 520 ? 220 : 260;
      const pad = { l: 34, r: W < 520 ? 70 : 104, t: 14, b: 26 };
      const lo = Math.min(-5, Math.floor(Math.min(...c.t) / 5) * 5);
      const hi = Math.max(25, Math.ceil(Math.max(...c.t) / 5) * 5);
      const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / 11;
      const y = (t) => pad.t + ((hi - t) * (H - pad.t - pad.b)) / (hi - lo);
      plot.textContent = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': `Средняя температура по месяцам: Далат и ${c.name}` }, plot);

      const step = hi - lo > 30 ? 10 : 5;
      for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) {
        el('line', { x1: pad.l, x2: W - pad.r + 8, y1: y(t), y2: y(t), class: t === 0 ? 'climate__zero' : 'climate__grid' }, svg);
        el('text', { x: pad.l - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'climate__axis' }, svg).textContent = fmt(t);
      }
      const bandW = (W - pad.l - pad.r) / 11;
      el('rect', { x: x(nowMonth) - bandW / 2, y: pad.t, width: bandW, height: H - pad.t - pad.b, rx: 6, class: 'climate__band' }, svg);
      MONTHS.forEach((m, i) => {
        el('text', { x: x(i), y: H - 6, 'text-anchor': 'middle', class: i === nowMonth ? 'climate__axis climate__axis--now' : 'climate__axis' }, svg)
          .textContent = W < 520 ? m[0] : m.slice(0, 3).toLowerCase();
      });

      const series = [[DALAT, 'dalat'], [c, 'home']];
      series.forEach(([s, kind]) => {
        el('path', { d: s.t.map((t, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(t).toFixed(1)}`).join(' '), class: `climate__line climate__line--${kind}` }, svg);
      });
      // Подписи у концов линий; если близко — разводим
      let yd = y(DALAT.t[11]) + 4, yh = y(c.t[11]) + 4;
      if (Math.abs(yd - yh) < 14) {
        const mid = (yd + yh) / 2;
        const dalatAbove = yd <= yh;
        yd = mid + (dalatAbove ? -7 : 7);
        yh = mid + (dalatAbove ? 7 : -7);
      }
      el('text', { x: x(11) + 8, y: yd, class: 'climate__end' }, svg).textContent = 'Далат';
      el('text', { x: x(11) + 8, y: yh, class: 'climate__end' }, svg).textContent = W < 520 && c.name.length > 9 ? `${c.name.slice(0, 8)}.` : c.name;

      // Слой наведения: вертикаль, точки и подсказка
      const hover = el('g', { class: 'climate__hover', visibility: 'hidden' }, svg);
      const vline = el('line', { y1: pad.t, y2: H - pad.b, class: 'climate__cross' }, hover);
      const dots = series.map(([, kind]) => el('circle', { r: 5, class: `climate__dot climate__dot--${kind}` }, hover));
      let tip = plot.querySelector('.climate__tip');
      if (!tip) { tip = document.createElement('div'); tip.className = 'climate__tip'; tip.hidden = true; plot.appendChild(tip); }

      const show = (i) => {
        hover.setAttribute('visibility', 'visible');
        vline.setAttribute('x1', x(i)); vline.setAttribute('x2', x(i));
        series.forEach(([s], k) => { dots[k].setAttribute('cx', x(i)); dots[k].setAttribute('cy', y(s.t[i])); });
        tip.innerHTML = `<b>${MONTHS[i]}</b><span><i class="climate__swatch climate__swatch--dalat"></i>Далат ${fmt(DALAT.t[i], 1)}</span><span><i class="climate__swatch climate__swatch--home"></i>${c.name} ${fmt(c.t[i], 1)}</span>`;
        tip.hidden = false;
        const left = Math.min(Math.max(x(i) - tip.offsetWidth / 2, 0), W - tip.offsetWidth);
        tip.style.left = `${left}px`;
        tip.style.top = `${Math.max(0, Math.min(y(DALAT.t[i]), y(c.t[i])) - tip.offsetHeight - 14)}px`;
      };
      const hit = el('rect', { x: pad.l - bandW / 2, y: 0, width: W - pad.l - pad.r + bandW, height: H, fill: 'transparent' }, svg);
      const pick = (evt) => {
        const box = svg.getBoundingClientRect();
        const px = ((evt.clientX - box.left) * W) / box.width;
        show(Math.max(0, Math.min(11, Math.round(((px - pad.l) * 11) / (W - pad.l - pad.r)))));
      };
      hit.addEventListener('pointermove', pick);
      hit.addEventListener('pointerdown', pick);
      hit.addEventListener('pointerleave', () => { hover.setAttribute('visibility', 'hidden'); tip.hidden = true; });

      // Таблица для экранных дикторов
      const table = climateBox.querySelector('[data-climate-table]');
      table.querySelectorAll('tr').forEach((tr) => tr.remove());
      table.insertAdjacentHTML('beforeend', `<tr><th>Месяц</th><th>Далат</th><th>${c.name}</th></tr>`
        + MONTHS.map((m, i) => `<tr><td>${m}</td><td>${fmt(DALAT.t[i], 1)}</td><td>${fmt(c.t[i], 1)}</td></tr>`).join(''));
    };

    const render = () => {
      const name = CITIES[cityKey].name;
      climateBox.querySelector('[data-climate-home-name]').textContent = name;
      climateBox.querySelector('[data-climate-legend-home]').textContent = name;
      drawChart();
      loadNow();
    };
    select.addEventListener('change', () => {
      cityKey = select.value;
      try { localStorage.setItem(STORE_KEY, cityKey); } catch (err) { /* не критично */ }
      render();
    });
    let lastW = 0;
    new ResizeObserver(() => {
      if (Math.abs(plot.clientWidth - lastW) < 8) return;
      lastW = plot.clientWidth;
      drawChart();
    }).observe(plot);
    render();
  }

  /* ---------- Подсветка карточек за курсором ---------- */
  document.querySelectorAll('.spotlight').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--mx');
      card.style.removeProperty('--my');
    });
  });

  /* ---------- Форма отзыва: отправка в Telegram или WhatsApp ---------- */
  const reviewForm = document.getElementById('review-form');
  const reviewStatus = document.getElementById('review-status');

  if (reviewForm && reviewStatus) {
    reviewForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const data = new FormData(reviewForm);
      const rating = Number(data.get('rating')) || 5;
      const name = String(data.get('name') || '').trim();
      const city = String(data.get('city') || '').trim();
      const message = String(data.get('message') || '').trim();

      // required пропускает строку из одних пробелов — проверяем после обрезки
      if (!name || !message) {
        reviewStatus.textContent = 'Напишите, пожалуйста, имя и пару слов о поездке.';
        reviewStatus.classList.remove('hidden');
        return;
      }

      const text = [
        'Отзыв для сайта «Свой в Далате»',
        '★'.repeat(rating) + '☆'.repeat(5 - rating),
        city ? `${name}, ${city}` : name,
        '',
        message,
        '',
        `Публикация с именем и городом: ${data.get('publish') ? 'да' : 'нет'}`
      ].join('\n');

      const viaWhatsApp = e.submitter && e.submitter.value === 'wa';
      const url = viaWhatsApp
        ? `https://wa.me/${reviewForm.dataset.whatsapp}?text=${encodeURIComponent(text)}`
        : `https://t.me/${reviewForm.dataset.telegram}?text=${encodeURIComponent(text)}`;

      // Копируем текст на случай, если мессенджер не подставит его сам
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      if (viaWhatsApp) window.open(url, '_blank', 'noopener,noreferrer');
      else openTelegram(url);

      reviewStatus.textContent = 'Спасибо за отзыв! Открываю чат — если текст не подставился сам, просто вставьте его: он уже скопирован.';
      reviewStatus.classList.remove('hidden');
    });
  }

  /* ---------- Заявка: ничего не хранится, по кнопке открывается Telegram с готовым текстом ---------- */
  const leadForm = document.getElementById('lead-form');
  const leadStatus = document.getElementById('lead-status');
  const TELEGRAM_USER = (leadForm && leadForm.dataset.telegram) || 'razumovdimka';
  const servicesRu = { consult: 'консультация', housing: 'подбор жилья', turnkey: 'переезд под ключ', question: 'вопрос' };
  const channelsRu = { telegram: 'Telegram', whatsapp: 'WhatsApp', phone: 'звонок' };
  const contactPlaceholder = (channel) => (channel === 'telegram' ? '@ник или номер' : '+7 900 000-00-00');
  // Для звонка и WhatsApp поле становится телефонным: на телефоне открывается цифровая клавиатура
  const applyChannel = (field, channel) => {
    const isPhone = channel !== 'telegram';
    field.type = isPhone ? 'tel' : 'text';
    field.inputMode = isPhone ? 'tel' : 'text';
    field.placeholder = contactPlaceholder(channel);
  };

  const leadTelegramUrl = (lead) => {
    const text = [
      'Заявка с сайта (Далат)',
      `Имя: ${lead.name}`,
      `Связь: ${lead.contact} (${channelsRu[lead.channel] || lead.channel})`,
      lead.arrival && `Приезд: ${lead.arrival.split('-').reverse().join('.')}`,
      lead.guests && `Гостей: ${lead.guests}`,
      lead.services && lead.services.length && `Нужно: ${lead.services.map((s) => servicesRu[s] || s).join(', ')}`,
      lead.message
    ].filter(Boolean).join('\n');
    return `https://t.me/${TELEGRAM_USER}?text=${encodeURIComponent(text)}`;
  };

  if (leadForm && leadStatus) {
    const showLeadStatus = (html, ok) => {
      leadStatus.innerHTML = html;
      leadStatus.className = `rounded-2xl px-4 py-3 text-sm ${ok ? 'bg-pine-50 text-pine-700' : 'bg-clay/10 text-ink'}`;
    };

    // Прошедшую дату приезда выбрать нельзя
    if (leadForm.elements.arrival) {
      const now = new Date();
      leadForm.elements.arrival.min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    leadForm.elements.channel.addEventListener('change', (e) => {
      applyChannel(leadForm.elements.contact, e.target.value);
    });

    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (leadForm.elements.website && leadForm.elements.website.value) return; // ловушка для спам-ботов

      const data = new FormData(leadForm);
      const lead = {
        name: String(data.get('name') || '').trim(),
        channel: data.get('channel'),
        contact: String(data.get('contact') || '').trim(),
        arrival: data.get('arrival'),
        guests: data.get('guests'),
        services: data.getAll('services'),
        message: [
          data.get('route') && `Как еду в Далат: ${String(data.get('route')).trim()}`,
          String(data.get('message') || '').trim()
        ].filter(Boolean).join('\n')
      };

      // required пропускает строку из одних пробелов — проверяем после обрезки
      if (!lead.name || !lead.contact) {
        showLeadStatus('Укажите имя и контакт — иначе я не смогу вам ответить.', false);
        return;
      }
      if (!data.get('consent')) {
        showLeadStatus('Отметьте согласие на обработку данных — без него заявку не открыть.', false);
        return;
      }

      openTelegram(leadTelegramUrl(lead));
      showLeadStatus('Открываю Telegram с готовой заявкой — осталось нажать «Отправить».', true);
      if (window.svoyGoal) window.svoyGoal('tg_lead');
    });
  }

  /* ---------- Общие функции для карты жилья (realty.js) ---------- */
  const scrollToElement = (el) => {
    const top = el.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 12;
    window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  window.SvoySite = { leadTelegramUrl, openTelegram, scrollToElement, contactPlaceholder, setTelegramLink, reduceMotion };

  // Год в футере ставит guard.js
})();
