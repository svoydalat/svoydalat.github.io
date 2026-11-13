/* =========================================================
   Свой в Далате — режим администратора (карта и каталог жилья)

   Включается сам, если на этом устройстве подключено приложение «Свой CRM»: ключ подключения у них общий
   (localStorage «svoy-crm:sync»). На другом устройстве откройте адрес со знаком # в конце: «realty.html#admin»
   и вставьте код подключения из бота (/connect).

   В файле нет никаких данных: закрытые сведения приходят из вашей Google-таблицы только по ключу,
   живут в памяти открытой вкладки и нигде не сохраняются. Посетители без ключа ничего не получают и ничего не видят.
   Показывает: цену хозяина и разницу, настоящий адрес и точку, ссылку на объявление, ваши ссылки к местам карты,
   кнопку «Обновить жильё».
   ========================================================= */
(() => {
  'use strict';

  const SYNC_KEY = 'svoy-crm:sync';      // подключение приложения «Свой CRM»: { url, key, … }
  const OFF_KEY = 'svoy-admin:off';      // «выйти» на этом устройстве, не отключая CRM
  const POLL_MS = 5000;
  const POLL_MAX_MS = 12 * 60 * 1000;
  const FRESH_MS = 30 * 60 * 1000;       // как долго показываем итог последнего обновления

  const A = {
    active: false,
    objects: new Map(),   // № объекта → закрытые данные
    links: new Map(),     // id места → ссылки
    refresh: { state: 'idle', at: 0 },
    objectHtml: () => '',
    placeHtml: () => '',
    realPos: () => null,
  };
  window.SvoyAdmin = A;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
  const safeUrl = (url) => (/^https?:\/\/[^\s"'<>]+$/i.test(url || '') ? url : '');
  const money = (vnd) => {
    const [value, unit] = vnd >= 1e6 ? [vnd / 1e6, 'млн'] : [vnd / 1e3, 'тыс.'];
    return `${Number(value.toFixed(2)).toLocaleString('ru-RU')} ${unit} VND`;
  };
  const isLocalDev = ['localhost', '127.0.0.1'].includes(location.hostname);

  /* ---------- Подключение ---------- */
  const readCreds = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(SYNC_KEY) || 'null');
      if (saved && saved.url && saved.key) return { url: saved.url, key: saved.key };
    } catch (err) { /* повреждено — считаем, что не подключено */ }
    return null;
  };
  const isOff = () => {
    try { return localStorage.getItem(OFF_KEY) === '1'; } catch (err) { return false; }
  };
  const setOff = (off) => {
    try { off ? localStorage.setItem(OFF_KEY, '1') : localStorage.removeItem(OFF_KEY); } catch (err) { /* не критично */ }
  };

  // text/plain — чтобы Google Apps Script принял запрос без предварительной CORS-проверки
  const call = async (action) => {
    const creds = readCreds();
    if (!creds) throw new Error('not_connected');
    const res = await fetch(creds.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, key: creds.key }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  /* ---------- Разметка для карточек ---------- */
  const mapsLink = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  A.objectHtml = (item, mode) => {
    if (!A.active) return '';
    const row = A.objects.get(item.code);
    if (!row) {
      return `<div class="adm-box adm-box--${mode}"><p class="adm-title">Для админа</p><p class="adm-muted">Закрытых данных по объекту нет: нажмите «Обновить жильё» вверху страницы.</p></div>`;
    }
    const diff = row.clientPrice - row.ownerPrice;
    const pct = row.ownerPrice ? Math.round((diff / row.ownerPrice) * 100) : 0;
    const url = safeUrl(row.url);
    const hasPoint = Number.isFinite(row.lat) && Number.isFinite(row.lng);
    return `
      <div class="adm-box adm-box--${mode}">
        <p class="adm-title">Для админа</p>
        <p class="adm-price">Хозяину <b>${esc(money(row.ownerPrice))}</b> · клиенту ${esc(money(row.clientPrice))}</p>
        <p class="adm-diff">Разница <b>${diff >= 0 ? '+' : '−'}${esc(money(Math.abs(diff)))}</b> (${diff >= 0 ? '+' : '−'}${Math.abs(pct)} %)</p>
        <p class="adm-addr">📍 ${esc(row.addressRu)}${row.addressVi ? `<span>${esc(row.addressVi)}</span>` : ''}</p>
        <p class="adm-muted">Продавец: ${esc(row.seller)} · ${esc(row.sellerType)}${row.geo ? ` · точка: ${esc(row.geo)}` : ''}</p>
        ${row.titleChecked ? '' : '<p class="adm-warn">Заголовок не проверен: поправьте в листе «Заголовки» таблицы.</p>'}
        <p class="adm-links">
          ${hasPoint ? `<a href="${esc(mapsLink(row.lat, row.lng))}" target="_blank" rel="noopener noreferrer">Точка на карте</a>` : ''}
          ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Объявление</a>` : ''}
        </p>
      </div>`;
  };

  // Для каждого места карты-гида: готовые кнопки Google Maps (маршрут и карточка места) + ваши ссылки из листа «Ссылки мест»
  A.placeHtml = (id, info) => {
    if (!A.active) return '';
    const links = A.links.get(id) || [];
    const auto = [];
    if (info && Array.isArray(info.pos)) {
      const [lat, lng] = info.pos;
      // Карточка самого места (отзывы, часы работы): ищем по названию рядом с точкой
      const query = [info.vi || info.name, 'Đà Lạt'].filter(Boolean).join(', ');
      auto.push(['Место в Google Maps', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`]);
    }
    const buttons = auto.map(([label, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`).join('');
    // Ссылки Google Maps из листа, которые сайт и так показывает кнопками выше, второй раз не выводим
    const autoUrls = new Set(auto.map(([, url]) => url));
    const mine = links.filter((link) => !autoUrls.has(link.url) && !/^Google Maps:/i.test(link.type || ''));
    const own = mine.length
      ? `<ul class="adm-list">${mine.map((link) => `
          <li><a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.type || 'Ссылка')}</a>${link.note ? `<span>${esc(link.note)}</span>` : ''}</li>`).join('')}</ul>`
      : '';
    return `<div class="adm-box adm-box--place"><p class="adm-title">Для админа</p><p class="adm-links">${buttons}</p>${own}</div>`;
  };

  A.realPos = (code) => {
    const row = A.active && A.objects.get(code);
    return row && Number.isFinite(row.lat) && Number.isFinite(row.lng) ? [row.lat, row.lng] : null;
  };

  /* ---------- Панель на странице жилья ---------- */
  const slot = document.getElementById('admin-slot');
  let panel = null;
  let pollTimer = 0;
  let pollUntil = 0;

  const dayTime = (ms) => new Date(ms).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const codes = (list) => (list && list.length ? ` (№ ${list.join(', ')})` : '');

  const statusText = (r) => {
    if (r.state === 'queued') return 'Заявка принята, запускаю задание…';
    if (r.state === 'running') return 'Идёт обновление: скачиваю объявления и собираю каталог…';
    if (r.state === 'done' && Date.now() - r.at < FRESH_MS) {
      return `Готово: новых ${(r.added || []).length}${codes(r.added)}, снято ${(r.removed || []).length}${codes(r.removed)}, всего ${r.total}. На сайте каталог обновится через 1–3 минуты.${(r.unchecked || []).length ? ` Заголовки не проверены: № ${r.unchecked.join(', ')}.` : ''}`;
    }
    if (r.state === 'error' && Date.now() - r.at < FRESH_MS) return `Не получилось: ${r.message || 'причина неизвестна'}. Каталог остался прежним.`;
    return r.at ? `Последнее обновление: ${dayTime(r.at)}.` : '';
  };

  const renderPanel = () => {
    if (!slot) return;
    slot.hidden = !A.active;
    if (!A.active) { slot.innerHTML = ''; panel = null; return; }
    const r = A.refresh || { state: 'idle' };
    const busy = r.state === 'queued' || r.state === 'running';
    const finished = r.state === 'done' && Date.now() - r.at < FRESH_MS;
    if (!panel) {
      slot.innerHTML = `
        <div class="adm-panel">
          <p class="adm-panel__title"><b>Режим администратора</b><span>цены хозяев, адреса, настоящие точки, ссылки</span></p>
          <div class="adm-panel__actions">
            <button type="button" class="adm-btn adm-btn--primary" data-adm="refresh"></button>
            <button type="button" class="adm-btn" data-adm="reload" hidden>Показать новое</button>
            <button type="button" class="adm-btn" data-adm="logout">Выйти</button>
          </div>
          <p class="adm-status" role="status" aria-live="polite"></p>
        </div>`;
      panel = slot.firstElementChild;
      panel.addEventListener('click', (e) => {
        const action = e.target.closest('[data-adm]');
        if (!action) return;
        if (action.dataset.adm === 'refresh') startRefresh();
        if (action.dataset.adm === 'reload') location.reload();
        if (action.dataset.adm === 'logout') logout();
      });
    }
    const button = panel.querySelector('[data-adm="refresh"]');
    button.disabled = busy;
    button.textContent = busy ? 'Обновляется…' : 'Обновить жильё';
    panel.querySelector('[data-adm="reload"]').hidden = !finished;
    panel.querySelector('.adm-status').textContent = statusText(r);
  };

  const stopPoll = () => { clearTimeout(pollTimer); pollTimer = 0; };

  const poll = () => {
    stopPoll();
    pollTimer = setTimeout(async () => {
      try {
        const data = await call('refresh_status');
        if (data.ok && data.refresh) A.refresh = data.refresh;
      } catch (err) { /* нет связи — попробуем ещё раз */ }
      renderPanel();
      const busy = A.refresh.state === 'queued' || A.refresh.state === 'running';
      if (busy && Date.now() < pollUntil) poll();
    }, POLL_MS);
  };

  const REFRESH_ERRORS = {
    github_not_configured: 'GitHub ещё не подключён к таблице: выполните шаги из «Инструкция-админ.md».',
    github_forbidden: 'GitHub не принял токен: он мог истечь или не иметь прав. Создайте новый (шаг в инструкции).',
    forbidden: 'Ключ не подходит: подключите приложение «Свой CRM» заново.',
  };

  async function startRefresh() {
    A.refresh = { state: 'queued', at: Date.now() };
    renderPanel();
    try {
      const data = await call('refresh');
      if (!data.ok) {
        A.refresh = data.refresh || { state: 'idle', at: 0 };
        renderPanel();
        panel.querySelector('.adm-status').textContent = REFRESH_ERRORS[data.error] || `Не удалось запустить (${data.error}).`;
        return;
      }
      A.refresh = data.refresh;
      pollUntil = Date.now() + POLL_MAX_MS;
      renderPanel();
      poll();
    } catch (err) {
      A.refresh = { state: 'idle', at: 0 };
      renderPanel();
      panel.querySelector('.adm-status').textContent = 'Таблица не ответила. Проверьте интернет и попробуйте ещё раз.';
    }
  }

  /* ---------- Загрузка, вход и выход ---------- */
  const announce = () => window.dispatchEvent(new CustomEvent('svoy-admin'));

  async function load() {
    if (isOff() || !readCreds()) return;
    try {
      const data = await call('admin_data');
      if (!data.ok) return; // ключ не подходит или сервер ещё не обновлён — ведём себя как обычный посетитель
      A.objects = new Map((data.objects || []).map((row) => [row.code, row]));
      A.links = new Map();
      (data.links || []).forEach((link) => {
        if (!safeUrl(link.url)) return;
        const list = A.links.get(link.place) || [];
        list.push(link);
        A.links.set(link.place, list);
      });
      A.refresh = data.refresh || A.refresh;
      A.active = true;
      document.documentElement.classList.add('is-admin');
      renderPanel();
      announce();
      if (A.refresh.state === 'queued' || A.refresh.state === 'running') { pollUntil = Date.now() + POLL_MAX_MS; poll(); }
    } catch (err) { /* нет связи — обычный режим */ }
  }

  function logout() {
    setOff(true);
    stopPoll();
    A.active = false;
    A.objects = new Map();
    A.links = new Map();
    document.documentElement.classList.remove('is-admin');
    renderPanel();
    announce();
  }

  // Код подключения: «адрес#ключ» — тот же, что бот присылает на /connect
  const parseCode = (text) => {
    const raw = String(text || '').trim();
    const at = raw.lastIndexOf('#');
    if (at < 1) return null;
    const url = raw.slice(0, at).trim();
    const key = raw.slice(at + 1).trim();
    const okUrl = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) || (isLocalDev && /^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/?$/.test(url));
    return okUrl && /^[\w-]{16,}$/.test(key) ? { url, key } : null;
  };

  function openLogin() {
    let dialog = document.getElementById('admin-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'admin-dialog';
      dialog.className = 'adm-dialog';
      dialog.innerHTML = `
        <form method="dialog" class="adm-dialog__form">
          <h2>Режим администратора</h2>
          <p>Вставьте код подключения из бота (команда /connect). Он тот же, что в приложении «Свой CRM».</p>
          <input type="text" name="code" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://script.google.com/…#ключ" aria-label="Код подключения">
          <p class="adm-dialog__error" role="alert" hidden></p>
          <div class="adm-dialog__buttons">
            <button type="button" class="adm-btn" data-adm-cancel>Отмена</button>
            <button type="submit" class="adm-btn adm-btn--primary">Войти</button>
          </div>
        </form>`;
      document.body.appendChild(dialog);
      dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target.closest('[data-adm-cancel]')) dialog.close(); });
      dialog.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const field = dialog.querySelector('input[name="code"]');
        const error = dialog.querySelector('.adm-dialog__error');
        const creds = parseCode(field.value);
        if (!creds) { error.textContent = 'Код не похож на код подключения. Скопируйте его целиком из сообщения бота.'; error.hidden = false; return; }
        try {
          const existing = JSON.parse(localStorage.getItem(SYNC_KEY) || 'null') || {};
          localStorage.setItem(SYNC_KEY, JSON.stringify({ ...existing, ...creds }));
        } catch (err) { error.textContent = 'Память браузера недоступна — войти не получится.'; error.hidden = false; return; }
        field.value = '';
        error.hidden = true;
        setOff(false);
        await load();
        if (!A.active) { error.textContent = 'Ключ не подходит или таблица не ответила.'; error.hidden = false; return; }
        dialog.close();
      });
    }
    dialog.showModal();
    dialog.querySelector('input').focus();
  }

  // Адрес со знаком # в конце открывает окно входа; сам код в адресе не передаётся
  const checkHash = () => {
    if (location.hash === '#admin') {
      history.replaceState(null, '', location.pathname + location.search);
      if (A.active) return;
      if (readCreds() && isOff()) { setOff(false); load(); return; }
      openLogin();
    }
  };
  window.addEventListener('hashchange', checkHash);

  load().finally(checkHash);
})();
