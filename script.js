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
  window.matchMedia('(min-width: 1280px)').addEventListener('change', (e) => {
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

    const top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight;
    window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  });

  /* ---------- Шапка и плавающая кнопка при прокрутке ---------- */
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10);

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
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach((el) => observer.observe(el));
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

  updateTime();
  setInterval(updateTime, 15000);

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
        message
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

  /* ---------- Заявки: на сервер (бот «Свой CRM»), а если он недоступен — в Telegram ---------- */
  const leadForm = document.getElementById('lead-form');
  const leadStatus = document.getElementById('lead-status');
  const LEAD_ENDPOINT = leadForm ? leadForm.dataset.endpoint : '';
  const TELEGRAM_USER = (leadForm && leadForm.dataset.telegram) || 'razumovdimka';
  const SEND_TIMEOUT_MS = 20000;
  // Пометка в начале текста: бот и таблица сразу показывают, что заявка из Далата
  const CITY_MARK = '📍 Далат · заявка с сайта';
  const pageShownAt = Date.now();
  const servicesRu = { airport: 'встреча по приезде', housing: 'жильё', bike: 'байк', help: 'помощь на месте' };
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
      'Заявка на поездку в Далат',
      `Имя: ${lead.name}`,
      `Связь: ${lead.contact} (${channelsRu[lead.channel] || lead.channel})`,
      lead.arrival && `Приезд: ${lead.arrival.split('-').reverse().join('.')}`,
      lead.guests && `Гостей: ${lead.guests}`,
      lead.services && lead.services.length && `Нужно: ${lead.services.map((s) => servicesRu[s] || s).join(', ')}`,
      lead.message
    ].filter(Boolean).join('\n');
    return `https://t.me/${TELEGRAM_USER}?text=${encodeURIComponent(text)}`;
  };

  // true — сервер принял заявку; false — сервер не указан; ошибка — сервер не ответил
  const sendLead = async (lead) => {
    if (!LEAD_ENDPOINT) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      // text/plain — чтобы Google Apps Script принял запрос без предварительной CORS-проверки
      const res = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'lead',
          elapsed: Date.now() - pageShownAt,
          ...lead,
          message: [CITY_MARK, lead.message].filter(Boolean).join('\n')
        }),
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (!result.ok) throw new Error(result.error);
      return true;
    } finally {
      clearTimeout(timer);
    }
  };

  const telegramFallbackLink = (lead) =>
    `<a class="font-semibold underline" href="${telegramHref(leadTelegramUrl(lead))}"${isMobile ? '' : ' target="_blank" rel="noopener noreferrer"'}>Отправьте её в Telegram</a>`;

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

    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (leadForm.dataset.sending) return; // защита от двойной отправки

      const data = new FormData(leadForm);
      // Сервер заявок знает четыре услуги, поэтому рыбалку передаём строкой в тексте заявки —
      // так она доходит до бота без обновления сервера
      const services = data.getAll('services');
      const lead = {
        name: String(data.get('name') || '').trim(),
        channel: data.get('channel'),
        contact: String(data.get('contact') || '').trim(),
        arrival: data.get('arrival'),
        guests: data.get('guests'),
        services: services.filter((s) => s !== 'fishing'),
        message: [
          services.includes('fishing') && 'Хочу на рыбалку с берега',
          data.get('route') && `Как еду в Далат: ${String(data.get('route')).trim()}`,
          String(data.get('message') || '').trim()
        ].filter(Boolean).join('\n'),
        website: data.get('website')
      };

      // required пропускает строку из одних пробелов — проверяем после обрезки
      if (!lead.name || !lead.contact) {
        showLeadStatus('Укажите имя и контакт — иначе я не смогу вам ответить.', false);
        return;
      }

      const button = leadForm.querySelector('button[type="submit"]');
      leadForm.dataset.sending = '1';
      button.disabled = true;
      try {
        if (await sendLead(lead)) {
          leadForm.reset();
          applyChannel(leadForm.elements.contact, 'telegram');
          showLeadStatus('Спасибо! Заявка отправлена — скоро свяжусь с вами.', true);
        } else {
          // Сервер ещё не подключён — открываем Telegram с готовым текстом
          openTelegram(leadTelegramUrl(lead));
          showLeadStatus('Открываю Telegram с готовой заявкой — осталось нажать «Отправить».', true);
        }
      } catch (err) {
        console.error('Не удалось отправить заявку', err);
        showLeadStatus(`Не получилось отправить заявку. ${telegramFallbackLink(lead)} — текст уже готов.`, false);
      } finally {
        delete leadForm.dataset.sending;
        button.disabled = false;
      }
    });
  }

  /* ---------- Общие функции для карты жилья (realty.js) ---------- */
  const scrollToElement = (el) => {
    const top = el.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 12;
    window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  window.SvoySite = { sendLead, leadTelegramUrl, telegramFallbackLink, openTelegram, scrollToElement, contactPlaceholder, setTelegramLink, reduceMotion };

  /* ---------- Текущий год в футере ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
