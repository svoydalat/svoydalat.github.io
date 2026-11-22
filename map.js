/* =========================================================
   Свой в Далате — интерактивная карта-гид
   - Leaflet + тайлы OpenStreetMap
   - категории и фильтры, кастомные маркеры (L.divIcon)
   - слой «районы для жизни»
   - карточка места: боковая панель на десктопе, шторка на телефоне
   - deep-ссылки: map.html#place=langbiang
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Данные ---------- */
  const CENTER = [11.9404, 108.4450];
  const TELEGRAM_CHAT = 'https://t.me/razumovdimka';

  const ICONS = {
    nature: 'M3 19 9.5 8l4 6 2-3L21 19z',
    culture: 'M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
    coffee: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3',
    food: 'M6 3v6a2 2 0 0 0 4 0V3M8 3v18M17 3c-2 2-3 4.5-3 7.5 0 1.6.9 2.7 2.2 3V21',
    activity: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM15.5 8.5l-2 5-5 2 2-5z',
    life: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 11v5M12 8h.01',
    star: 'M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z',
    transport: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'
  };

  // Иконка у конкретного места (поле icon у места). Цвет метки остаётся по категории,
  // а картинка подбирается под место; у места без icon берётся иконка его категории
  const PLACE_ICONS = {
    mountain: 'M3 19 9.5 8l4 6 2-3L21 19z',
    fish: 'M3 12c3-5 8-6 12-3l4-3v12l-4-3c-4 3-9 2-12-3zM15 11h.01',
    waves: 'M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
    drop: 'M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z',
    leaf: 'M5 19c0-9 5-14 15-14 0 10-5 15-13 15M5 19c3-4 6-7 10-9',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    pagoda: 'M7 8l5-3 5 3zM4.5 13 12 9l7.5 4zM7 13v7M17 13v7M4 20h16M12 2v3',
    church: 'M12 2v4M10 4h4M6 21V11l6-4 6 4v10M3 21h18M10 21v-5a2 2 0 0 1 4 0v5',
    train: 'M7 3h10a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 10h14M8 18l-2 3M16 18l2 3M9 14h.01M15 14h.01',
    castle: 'M4 21V7h3v3h3V7h4v3h3V7h3v14zM10 21v-5a2 2 0 0 1 4 0v5',
    arch: 'M3 21c0-9 4-15 9-15s9 6 9 15M8 21c0-6 1.5-9 4-9s4 3 4 9',
    cloud: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 .5 9z',
    store: 'M4 9l1.5-5h13L20 9M4 9a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0 2.67 2.67 0 0 0 5.33 0M5 12v8h14v-8M10 20v-4h4v4',
    cart: 'M3 4h2l2.5 11h10l2-8H6.5M9 20h.01M17 20h.01',
    bus: 'M5 17h14V8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2zM5 12h14M8 20v-3M16 20v-3M8.5 14.5h.01M15.5 14.5h.01',
    cross: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z',
    doc: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6',
    timer: 'M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z'
  };

  const CATEGORIES = [
    { id: 'nature', label: 'Природа и виды', short: 'Природа', color: '#3B6550' },
    { id: 'culture', label: 'Культура и архитектура', short: 'Культура', color: '#6F6AAE' },
    { id: 'food', label: 'Где поесть', short: 'Еда', color: '#9A5B1E' },
    { id: 'coffee', label: 'Кофе и рынки', short: 'Кофе и рынки', color: '#B5583A' },
    { id: 'activity', label: 'Активности и рыбалка', short: 'Активности', color: '#A8700A' },
    { id: 'transport', label: 'Транспорт', short: 'Транспорт', color: '#4F7186' },
    { id: 'life', label: 'Быт и инфраструктура', short: 'Быт', color: '#B8527A' }
  ];
  const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const iconFor = (p) => PLACE_ICONS[p.icon] || ICONS[p.cat];

  // Места — в places.js (общий файл для сайта и Telegram Mini App). Проверяем каждое:
  // место с ошибкой пропускаем с пояснением в консоли, а не ломаем всю карту
  const PLACES = (() => {
    const seen = new Set();
    return (window.SVOY_PLACES || []).filter((p) => {
      const bad = !p || !/^[a-z0-9-]+$/.test(p.id || '') ? 'нет id или в нём не латиница'
        : seen.has(p.id) ? 'такой id уже есть'
        : !CAT[p.cat] ? `нет категории «${p.cat}»`
        : !p.name || !p.vi || !p.desc || !p.tip ? 'не заполнены name, vi, desc или tip'
        : !Array.isArray(p.pos) || !(p.pos[0] > 11.6 && p.pos[0] < 12.2 && p.pos[1] > 108.2 && p.pos[1] < 108.7) ? 'координаты не в районе Далата'
        : '';
      if (bad) { console.warn(`places.js: место «${(p && (p.name || p.id)) || '?'}» пропущено — ${bad}`); return false; }
      seen.add(p.id);
      p.tags = Array.isArray(p.tags) ? p.tags : [];
      p.zoom = p.zoom || 16;
      return true;
    });
  })();

  // Маршруты — в routes.js. Шаг с неизвестным местом пропускаем, маршрут короче двух шагов — тоже
  const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]));
  const ROUTES = (() => {
    const seen = new Set();
    return (window.SVOY_ROUTES || []).filter((r) => {
      const bad = !r || !/^[a-z0-9-]+$/.test(r.id || '') ? 'нет id или в нём не латиница'
        : seen.has(r.id) ? 'такой id уже есть'
        : !r.title || !Array.isArray(r.steps) ? 'нет title или steps'
        : '';
      if (bad) { console.warn(`routes.js: маршрут «${(r && (r.title || r.id)) || '?'}» пропущен — ${bad}`); return false; }
      r.steps = r.steps.filter((s) => {
        if (s && PLACE_BY_ID[s.place]) return true;
        console.warn(`routes.js: в маршруте «${r.title}» шаг «${s && s.place}» пропущен — такого места нет в places.js`);
        return false;
      });
      if (r.steps.length < 2) { console.warn(`routes.js: маршрут «${r.title}» пропущен — меньше двух шагов`); return false; }
      seen.add(r.id);
      return true;
    });
  })();

  // Рельеф для тех, кто едет на байке или идёт пешком: ровно / холмы / крутой участок
  const SLOPE_LABEL = { flat: 'ровно', hills: 'холмы', steep: 'крутой участок' };

  // Районы для жизни. Круг — примерная зона, а не административная граница
  const ZONES = [
    {
      id: 'center', name: 'Центр и озеро Суан Хыонг', vi: 'Hồ Xuân Hương', color: '#E3A21A',
      center: [11.9420, 108.4400], radius: 1800,
      plus: 'Всё рядом, пешком: рынки, кафе, магазины, аптеки. Ровный рельеф вокруг озера — 5 км для прогулок и бега.',
      minus: 'Шумно по выходным и вечером, дорого, много туристов.'
    },
    {
      id: 'trieu-viet-vuong', name: 'Чьеу Вьет Выонг и Ан Шон', vi: 'Triệu Việt Vương / An Sơn', color: '#3B6550',
      center: [11.9215, 108.4420], radius: 1700,
      plus: 'Тихий зелёный район на южных холмах среди сосен и французских вилл. Подходит для спокойной жизни и удалённой работы: сухо, панорамные виды, 10 минут до центра.',
      minus: 'Нужен байк или такси, холмы и крутые подъёмы, мало магазинов.'
    },
    {
      id: 'tuyen-lam', name: 'Озеро Туен Лам', vi: 'Hồ Tuyền Lâm', color: '#4F7186',
      center: [11.8950, 108.4290], radius: 2800,
      plus: 'Курортная лесная зона у горного озера и монастыря Чуклам. Тихо и уединённо, туманы, сосны, рыбалка, резорты.',
      minus: 'Далеко от центра, мало магазинов и кафе, без байка не обойтись.'
    },
    {
      id: 'north', name: 'Север и Долина Любви', vi: 'Phường 8 / Thung Lũng Tình Yêu', color: '#D9809A',
      center: [11.9680, 108.4490], radius: 2200,
      plus: 'Студенческий и цветочный район: теплицы, фермы гортензий и спокойные жилые кварталы. Цены на жильё ниже, чем в центре.',
      minus: 'Меньше кофеен и сервисов для туристов, до озера — 15–20 минут на байке.'
    }
  ];

  const FAV_KEY = 'svoy-dalat-map-favs';

  /* ---------- Утилиты ---------- */
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Короткие слова и тире не остаются в конце строки: «в Далате», «Далат — город»
  const NB_RE = /(?<![\p{L}\d])(в|во|на|с|со|к|ко|по|до|и|о|об|у|а|но|за|из|от|не|ни|же|бы|для|без|при|под|над|про)\s+/giu;
  const nb = (str) => String(str).replace(NB_RE, '$1 ').replace(/\s+—/g, ' —');
  const svg = (path, attrs = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${attrs}><path d="${path}"/></svg>`;
  const iconUse = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isMobile = isAndroid || /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const desktopMq = window.matchMedia('(min-width: 900px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Как на главной: на телефоне Telegram открываем приложением, минуя заблокированный t.me
  const telegramHref = (httpsUrl) => {
    // В Mini App Telegram ссылку открывает сам tg-app.js — приложение уже запущено
    if (!isMobile || window.SvoyMiniApp) return httpsUrl;
    const url = new URL(httpsUrl);
    const domain = url.pathname.split('/')[1];
    const text = url.searchParams.get('text');
    const query = `domain=${domain}${text ? `&text=${encodeURIComponent(text)}` : ''}`;
    return isAndroid
      ? `intent://resolve?${query}#Intent;scheme=tg;S.browser_fallback_url=${encodeURIComponent(httpsUrl)};end`
      : `tg://resolve?${query}`;
  };

  const placeTelegramUrl = (p) => {
    const text = p.tg === 'airport'
      ? 'Здравствуйте! Подскажите, как добраться из аэропорта Льенкхыонг (DLI) в Далат, и дайте контакт партнёра по трансферу. Моя дата, рейс и количество человек: '
      : p.cat === 'life' || p.cat === 'food'
        ? `Здравствуйте! Я с карты Далата. Хочу уточнить про «${p.name}» (${p.vi}): `
        : `Здравствуйте! Я с карты Далата. Хочу съездить: «${p.name}» (${p.vi}). Подскажите, как лучше: `;
    return `${TELEGRAM_CHAT}?text=${encodeURIComponent(text)}`;
  };

  // Поиск: без регистра, «ё» как «е», вьетнамские буквы без значков (Xuân → xuan)
  const fold = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const searchText = (p) => fold([p.name, p.vi, CAT[p.cat].label, ...p.tags].join(' '));

  // Расстояние по прямой: «850 м», «1,2 км»
  const distLabel = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} м` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} км`);
  // В Mini App Telegram (tg-map/tg-app.js) ссылка ведёт обратно в приложение, а не на страницу
  const placeLink = (p) => (window.SvoyShareLink ? window.SvoyShareLink(p.id) : `${location.origin}${location.pathname}#place=${p.id}`);

  const toast = (msg) => {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('is-visible'), 2200);
  };

  /* ---------- Карта ---------- */
  const map = L.map('map', {
    center: CENTER,
    zoom: 13,
    minZoom: 10,
    maxZoom: 19,
    zoomControl: false,
    zoomSnap: 0.5
  });

  // CARTO Voyager из ТЗ теперь отдаёт заглушку «нужен API-ключ», поэтому берём OpenStreetMap
  // (как и карта жилья на главной); тёплый оттенок задаёт .leaflet-tile-pane в map.css
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
  }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');

  // Кнопки зума и «Где я»: слева-снизу на десктопе, справа-сверху (под чипсами) на телефоне
  let zoomControl = null;
  let locateControl = null;
  const placeControls = () => {
    if (zoomControl) zoomControl.remove();
    if (locateControl) locateControl.remove();
    const position = desktopMq.matches ? 'bottomleft' : 'topright';
    zoomControl = L.control.zoom({ position, zoomInTitle: 'Приблизить', zoomOutTitle: 'Отдалить' }).addTo(map);
    locateControl = L.control({ position });
    locateControl.onAdd = () => {
      const box = L.DomUtil.create('div', 'leaflet-bar locate-bar');
      box.innerHTML = '<button type="button" class="locate-btn" id="locate-btn" aria-label="Показать, где я нахожусь" title="Где я">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></svg>' +
        '<span>Где я</span></button>';
      L.DomEvent.disableClickPropagation(box);
      box.querySelector('button').addEventListener('click', locateMe);
      return box;
    };
    locateControl.addTo(map);
  };

  // Геолокация: пульсирующая точка и приближение, если человек в районе Далата
  let userMarker = null;
  let userCircle = null;
  let userPos = null;      // где человек сейчас (если разрешил и он в Далате): от неё считаем расстояния
  let sortNear = true;
  const DALAT_RADIUS_M = 80000;
  const distFromUser = (p) => (userPos ? userPos.distanceTo(L.latLng(p.pos)) : null);
  function locateMe() {
    const btn = $('#locate-btn');
    if (!navigator.geolocation) { toast('Браузер не умеет определять местоположение'); return; }
    btn.classList.add('is-loading');
    navigator.geolocation.getCurrentPosition((pos) => {
      btn.classList.remove('is-loading');
      const here = L.latLng(pos.coords.latitude, pos.coords.longitude);
      if (here.distanceTo(L.latLng(CENTER)) > DALAT_RADIUS_M) {
        toast('Вы сейчас далеко от Далата, но я жду вас в гости!');
        map.flyTo(CENTER, 13, { duration: reduceMotion ? 0 : 0.9 });
        return;
      }
      if (userMarker) userMarker.remove();
      if (userCircle) userCircle.remove();
      userCircle = L.circle(here, { radius: Math.min(pos.coords.accuracy || 30, 500), color: '#2F6FDB', weight: 1, fillColor: '#2F6FDB', fillOpacity: 0.12, interactive: false }).addTo(map);
      userMarker = L.marker(here, {
        icon: L.divIcon({ className: 'me-anchor', html: '<span class="me"><span class="me__pulse"></span><span class="me__dot"></span></span>', iconSize: [0, 0] }),
        keyboard: false, interactive: false, zIndexOffset: 2000
      }).addTo(map);
      const z = Math.max(map.getZoom(), 15);
      if (reduceMotion) map.setView(here, z, { animate: false });
      else map.flyTo(here, z, { duration: 1 });
      userPos = here;
      $('#near-toggle').hidden = false;
      renderList();
      refreshFavLink();
      if (currentId) renderDrawer(PLACES.find((x) => x.id === currentId));
      toast('Показываю расстояния от вас по прямой');
    }, (err) => {
      btn.classList.remove('is-loading');
      toast(err && err.code === 1 ? 'Разрешите доступ к геолокации в настройках браузера' : 'Не удалось определить местоположение');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }
  placeControls();
  desktopMq.addEventListener('change', placeControls);

  // Избранное хранится в localStorage; его может не быть (приватный режим) — тогда живёт до перезагрузки
  const favs = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    if (Array.isArray(saved)) saved.forEach((id) => favs.add(String(id)));
  } catch (e) { /* пусто */ }
  const saveFavs = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch (e) { /* пусто */ } };

  /* ---------- Маркеры ---------- */
  const markers = new Map();
  // Звёздочка на маркере: избранное видно прямо на карте
  const syncPinFav = (id) => {
    const el = markers.get(id) && markers.get(id).getElement();
    const pin = el && el.querySelector('.pin');
    if (pin) pin.classList.toggle('pin--fav', favs.has(id));
  };
  // Близкие места собираются в кружок с числом; с 15-го масштаба видны все метки
  const markerGroup = L.markerClusterGroup({
    maxClusterRadius: 48,
    animate: !L.Browser.mobile,
    removeOutsideVisibleBounds: false,
    chunkedLoading: true,
    showCoverageOnHover: false,
    disableClusteringAtZoom: 15,
    spiderfyOnMaxZoom: false,
    iconCreateFunction: (group) => L.divIcon({
      className: 'pin-anchor',
      html: `<span class="pin-cluster">${group.getChildCount()}</span>`,
      iconSize: [0, 0]
    })
  }).addTo(map);

  /* ---------- Режим «Сейчас»: что лучше посетить в этот час (время Далата) ---------- */
  const PERIODS = [
    { id: 'dawn', from: 5, label: 'рассвет' }, { id: 'morning', from: 8, label: 'утро' },
    { id: 'day', from: 11, label: 'день' }, { id: 'evening', from: 16, label: 'вечер' },
    { id: 'night', from: 21, label: 'ночь' }
  ];
  const dalatHour = () => {
    const h = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hourCycle: 'h23' }).format(new Date());
    return Number(h) % 24;
  };
  const currentPeriod = () => {
    const h = dalatHour();
    if (h >= 21 || h < 5) return PERIODS[4];
    return [...PERIODS].reverse().find((x) => h >= x.from && x.id !== 'night');
  };
  let nowMode = false;
  let period = currentPeriod();
  // Места без поля when не подсвечиваем и не притушиваем
  const nowState = (p) => (!nowMode || !p.when ? '' : p.when.includes(period.id) ? 'now' : 'dim');
  const isNow = (p) => nowState(p) === 'now';
  const syncPinNow = (id) => {
    const el = markers.get(id) && markers.get(id).getElement();
    const pin = el && el.querySelector('.pin');
    if (!pin) return;
    const s = nowState(PLACE_BY_ID[id]);
    pin.classList.toggle('pin--now', s === 'now');
    pin.classList.toggle('pin--dim', s === 'dim');
  };

  const makeIcon = (p) => L.divIcon({
    className: 'pin-anchor',
    html: `<span class="pin${p.approx ? ' pin--approx' : ''}" style="--c:${CAT[p.cat].color}">${svg(iconFor(p))}</span>`,
    iconSize: [0, 0]
  });

  PLACES.forEach((p, i) => {
    const m = L.marker(p.pos, { icon: makeIcon(p), title: p.name, alt: p.name, riseOnHover: true, zIndexOffset: i });
    m.on('add', () => { m.getElement().setAttribute('aria-label', p.name); syncPinFav(p.id); syncPinNow(p.id); });
    m.on('click', (e) => { L.DomEvent.stopPropagation(e); openPlace(p.id); });
    markers.set(p.id, m);
  });

  /* ---------- Избранное: «Мой список» ---------- */
  const zoneKey = (z) => `zone:${z.id}`;
  const favInner = (on) => `${svg(ICONS.star, on ? 'fill="currentColor"' : '')}${on ? 'В моём списке' : 'В мой список'}`;
  const favItems = () => [
    ...PLACES.filter((p) => favs.has(p.id)).map((p) => ({ key: p.id, name: p.name })),
    ...ZONES.filter((z) => favs.has(zoneKey(z))).map((z) => ({ key: zoneKey(z), name: `район «${z.name}»` }))
  ];

  /* ---------- Районы ---------- */
  const zonesGroup = L.featureGroup();
  ZONES.forEach((z) => {
    const circle = L.circle(z.center, {
      radius: z.radius, color: z.color, weight: 2, opacity: 0.8,
      fillColor: z.color, fillOpacity: 0.2, dashArray: '6 6'
    });
    circle.bindTooltip(esc(z.name), { permanent: true, direction: 'center', className: 'zone-label' });
    circle.bindPopup(() =>
      `<div class="zone-pop"><h3>${esc(z.name)}</h3><p class="vi">${esc(z.vi)}</p>` +
      `<p class="plus">+ ${esc(z.plus)}</p><p class="minus">− ${esc(z.minus)}</p>` +
      `<button type="button" class="fav-btn${favs.has(zoneKey(z)) ? ' is-on' : ''}" data-fav="${zoneKey(z)}" aria-pressed="${favs.has(zoneKey(z))}">${favInner(favs.has(zoneKey(z)))}</button></div>`,
      { maxWidth: 300, autoPanPaddingTopLeft: [30, 160], autoPanPaddingBottomRight: [30, 40] }
    );
    circle._zone = z;
    circle.addTo(zonesGroup);
  });

  /* ---------- Фильтры ---------- */
  let activeFilter = 'all';
  const filtersEl = $('#filters');

  const renderFilters = () => {
    const chips = [{ id: 'all', label: 'Все' }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, color: c.color }))];
    filtersEl.innerHTML = chips.map((c) =>
      `<button type="button" class="chip" data-filter="${c.id}" aria-pressed="${c.id === activeFilter}">` +
      `${c.color ? `<span class="chip__dot" style="--c:${c.color}"></span>` : ''}${esc(c.label)}</button>`
    ).join('') +
      `<button type="button" class="chip chip--routes" id="routes-toggle" aria-pressed="${!!(routeId || routeListOpen)}"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 17c6 0 2-10 8-10"/></svg>Маршруты</button>` +
      `<button type="button" class="chip chip--now" id="now-toggle" aria-pressed="${nowMode}"><span id="now-label"></span></button>` +
      `<button type="button" class="chip chip--fav" data-filter="fav" aria-pressed="${activeFilter === 'fav'}">` +
      `${svg(ICONS.star, 'fill="currentColor"')}<span id="fav-chip-label"></span></button>` +
      `<button type="button" class="chip chip--zones chip--sep" id="zones-toggle" aria-pressed="${map.hasLayer(zonesGroup)}">` +
      `<span class="chip__dot" style="--c:var(--sunflower)"></span><span id="zones-label"></span></button>`;
    updateZonesLabel();
    updateFavUi();
    updateNowUi();
  };

  const updateNowUi = () => {
    const label = $('#now-label');
    if (label) label.textContent = `Сейчас · ${period.label}`;
    const btn = $('#now-toggle');
    if (btn) btn.setAttribute('aria-pressed', String(nowMode));
    markers.forEach((m, id) => syncPinNow(id));
  };
  // Период меняется сам: раз в минуту сверяем время Далата
  setInterval(() => {
    const next = currentPeriod();
    if (next.id === period.id) return;
    period = next;
    updateNowUi();
    if (nowMode) renderList();
    if (currentId) renderDrawer(PLACE_BY_ID[currentId]);
  }, 60000);

  const updateZonesLabel = () => {
    const on = map.hasLayer(zonesGroup);
    const label = $('#zones-label');
    if (label) label.textContent = on ? 'Скрыть районы для жизни' : 'Показать районы для жизни';
    const btn = $('#zones-toggle');
    if (btn) btn.setAttribute('aria-pressed', String(on));
  };

  let query = '';
  const matchesFilter = (p) => activeFilter === 'all' || (activeFilter === 'fav' ? favs.has(p.id) : p.cat === activeFilter || (p.also && p.also.includes(activeFilter)));
  const visiblePlaces = () => PLACES.filter((p) => matchesFilter(p) && (!query || searchText(p).includes(query)));

  const applyFilter = () => {
    const visible = new Set(visiblePlaces().map((p) => p.id));
    markerGroup.clearLayers();
    markers.forEach((m, id) => { if (visible.has(id)) markerGroup.addLayer(m); });
    renderList();
    filtersEl.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === activeFilter)));
  };

  filtersEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    if (chip.id === 'zones-toggle') {
      if (map.hasLayer(zonesGroup)) map.removeLayer(zonesGroup);
      else {
        zonesGroup.addTo(map);
        map.flyToBounds(zonesGroup.getBounds(), { paddingTopLeft: [24, 120], paddingBottomRight: [24, 90], duration: reduceMotion ? 0 : 0.9 });
      }
      updateZonesLabel();
      return;
    }
    if (chip.id === 'routes-toggle') {
      if (routeId || routeListOpen) exitRoute(); else openRouteList();
      return;
    }
    if (chip.id === 'now-toggle') {
      nowMode = !nowMode;
      period = currentPeriod();
      updateNowUi();
      renderList();
      if (currentId) renderDrawer(PLACE_BY_ID[currentId]);
      return;
    }
    activeFilter = chip.dataset.filter;
    applyFilter();
    // Выбранное место пропало из фильтра — карточку закрываем
    if (currentId && !visiblePlaces().some((p) => p.id === currentId)) closePlace();
  });

  /* ---------- Список мест ---------- */
  const listBody = $('#list-body');

  const starBtn = (key) => {
    const on = favs.has(key);
    return `<button type="button" class="star${on ? ' is-on' : ''}" data-fav="${esc(key)}" aria-pressed="${on}" aria-label="${on ? 'Убрать из моего списка' : 'Добавить в мой список'}" title="${on ? 'Убрать из моего списка' : 'В мой список'}">${svg(ICONS.star, on ? 'fill="currentColor"' : '')}</button>`;
  };

  const renderList = () => {
    const items = visiblePlaces();
    if (userPos && sortNear) items.sort((a, b) => distFromUser(a) - distFromUser(b));
    // «Сейчас»: подходящие по времени места наверх, порядок внутри групп сохраняется
    if (nowMode) items.sort((a, b) => isNow(b) - isNow(a));
    const zoneItems = activeFilter === 'fav' && !query ? ZONES.filter((z) => favs.has(zoneKey(z))) : [];
    const total = items.length + zoneItems.length;
    $('#list-count').textContent = activeFilter === 'fav'
      ? `В вашем списке: ${total}`
      : `${total} ${total === 1 ? 'место' : total > 1 && total < 5 ? 'места' : 'мест'} · нажмите, чтобы открыть`;
    const rows = items.map((p) =>
      `<div class="card-row"><button type="button" class="card${p.id === currentId ? ' is-active' : ''}" data-id="${p.id}" style="--c:${CAT[p.cat].color}">` +
      `<span class="card__ico">${svg(iconFor(p))}</span>` +
      `<span class="card__txt"><span class="card__name">${esc(nb(p.name))}</span>` +
      `<span class="card__vi">${esc(p.vi)}</span>` +
      `<span class="card__meta">${isNow(p) ? '<b class="card__now">Сейчас лучше</b> · ' : ''}${userPos ? `<b class="card__dist">${distLabel(distFromUser(p))}</b> · ` : ''}${esc(CAT[p.cat].short)} · ${esc(p.tags[p.tags.length - 1])}</span></span></button>${starBtn(p.id)}</div>`
    ).concat(zoneItems.map((z) =>
      `<div class="card-row"><button type="button" class="card" data-zone="${z.id}" style="--c:${z.color}">` +
      `<span class="card__ico">${svg('M12 3 3 8v8l9 5 9-5V8z')}</span>` +
      `<span class="card__txt"><span class="card__name">${esc(z.name)}</span><span class="card__vi">${esc(z.vi)}</span>` +
      `<span class="card__meta">Район для жизни</span></span></button>${starBtn(zoneKey(z))}</div>`
    ));
    listBody.innerHTML = rows.length ? rows.join('')
      : `<p class="list__empty">${query ? 'Ничего не нашлось. Попробуйте другое слово: «озеро», «кофе», «рынок».' : activeFilter === 'fav' ? 'Пока пусто: нажмите ⭐ у места или района, чтобы собрать свой список.' : 'В этой категории пока ничего нет.'}</p>`;
  };

  // Поиск по местам: список и маркеры на карте сужаются вместе
  $('#place-search').addEventListener('input', (e) => {
    query = fold(e.target.value.trim());
    applyFilter();
    if (currentId && !visiblePlaces().some((p) => p.id === currentId)) closePlace();
    if (query) {
      const found = visiblePlaces();
      if (found.length) map.flyToBounds(L.latLngBounds(found.map((p) => p.pos)), { padding: [60, 60], maxZoom: 15, duration: reduceMotion ? 0 : 0.7 });
    }
  });

  $('#near-toggle').addEventListener('click', (e) => {
    sortNear = !sortNear;
    e.currentTarget.setAttribute('aria-pressed', String(sortNear));
    renderList();
  });

  listBody.addEventListener('click', (e) => {
    const star = e.target.closest('.star');
    if (star) { toggleFav(star.dataset.fav); return; }
    const card = e.target.closest('.card');
    if (!card) return;
    if (card.dataset.zone) focusZone(card.dataset.zone);
    else openPlace(card.dataset.id);
  });

  const showAllZones = () => {
    if (!map.hasLayer(zonesGroup)) { zonesGroup.addTo(map); updateZonesLabel(); }
    map.flyToBounds(zonesGroup.getBounds(), { paddingTopLeft: [24, 120], paddingBottomRight: [24, 90], duration: reduceMotion ? 0 : 0.9 });
  };

  const focusZone = (id) => {
    const z = ZONES.find((x) => x.id === id);
    if (!z) return;
    if (!map.hasLayer(zonesGroup)) { zonesGroup.addTo(map); updateZonesLabel(); }
    listSheet.set('closed');
    if (currentId) closePlace();
    // На телефоне попап растёт вверх от центра круга — центр кладём ниже середины экрана, чтобы заголовок не ушёл под чипсы
    const lift = desktopMq.matches ? 0 : Math.round(map.getSize().y * 0.12);
    const target = map.unproject(map.project(z.center, 13.5).subtract([0, lift]), 13.5);
    map.flyTo(target, 13.5, { duration: reduceMotion ? 0 : 0.9 });
    // Попап открываем, когда карта доехала: иначе автосдвиг не срабатывает и заголовок прячется под чипсами
    let opened = false;
    const openPopup = () => {
      if (opened) return;
      opened = true;
      zonesGroup.eachLayer((l) => { if (l._zone && l._zone.id === id) l.openPopup(); });
    };
    map.once('moveend', openPopup);
    setTimeout(openPopup, reduceMotion ? 0 : 1500);
  };

  /* ---------- Избранное: действия ---------- */
  const favBar = $('#fav-bar');
  const updateFavUi = () => {
    const n = favItems().length;
    const label = $('#fav-chip-label');
    if (label) label.textContent = `Мой список (${n})`;
    favBar.hidden = n === 0;
    $('#fav-bar-count').textContent = `В списке: ${n}`;
    markers.forEach((m, id) => syncPinFav(id));
    refreshFavLink();
    document.querySelectorAll('[data-fav]').forEach((b) => {
      const on = favs.has(b.dataset.fav);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
      if (b.classList.contains('star')) {
        b.innerHTML = svg(ICONS.star, on ? 'fill="currentColor"' : '');
        b.setAttribute('aria-label', on ? 'Убрать из моего списка' : 'Добавить в мой список');
        b.title = on ? 'Убрать из моего списка' : 'В мой список';
      } else b.innerHTML = favInner(on);
    });
  };

  function toggleFav(key) {
    if (favs.has(key)) favs.delete(key); else favs.add(key);
    saveFavs();
    if (activeFilter === 'fav') applyFilter();
    updateFavUi();
  }

  const favTelegramUrl = () => {
    const names = favItems().map((i) => i.name).join('; ');
    return `${TELEGRAM_CHAT}?text=${encodeURIComponent(`Здравствуйте! Я собрал список мест на карте Далата, хочу обсудить поездку: ${names}`)}`;
  };
  const favSend = $('#fav-send');

  const refreshFavLink = () => {
    favSend.href = telegramHref(favTelegramUrl());
    if (isMobile) favSend.removeAttribute('target');
  };
  ['click', 'focus', 'pointerenter', 'touchstart'].forEach((ev) => favSend.addEventListener(ev, refreshFavLink, { passive: true }));
  $('#fav-clear').addEventListener('click', () => {
    favs.clear(); saveFavs();
    if (activeFilter === 'fav') { activeFilter = 'all'; applyFilter(); }
    updateFavUi();
  });
  // Кнопки «в мой список» внутри карточки места и попапа района
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.fav-btn');
    if (b) toggleFav(b.dataset.fav);
  });

  /* ---------- Шторки (bottom sheet) ---------- */
  // Состояния шторки: closed / half / full. На десктопе drawer — боковая панель, list — колонка
  const listEl = $('#list');
  const drawerEl = $('#drawer');

  const makeSheet = (el, handles) => {
    const sheet = {
      el,
      state: 'closed',
      set(state) {
        sheet.state = state;
        el.classList.toggle('is-open', state !== 'closed');
        el.classList.toggle('is-half', state === 'half');
        el.style.removeProperty('--drag');
        el.classList.remove('is-dragging');
        if (state === 'closed') el.setAttribute('aria-hidden', 'true');
        else el.removeAttribute('aria-hidden');
      }
    };
    let startY = 0; let dy = 0; let dragging = false; let startT = 0;
    const onDown = (e) => {
      if (desktopMq.matches) return;
      dragging = true; startY = e.clientY; dy = 0; startT = e.timeStamp;
      el.classList.add('is-dragging');
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* без захвата тоже работает */ }
    };
    const onMove = (e) => {
      if (!dragging) return;
      dy = e.clientY - startY;
      // вверх можно тянуть, пока не раскрыли полностью; вниз — всегда
      const min = sheet.state === 'full' ? -12 : -window.innerHeight * 0.4;
      el.style.setProperty('--drag', `${Math.max(min, dy)}px`);
    };
    const onUp = (e) => {
      if (!dragging) return;
      dragging = false;
      const fast = Math.abs(dy) / Math.max(1, e.timeStamp - startT) > 0.5;
      const down = dy > (fast ? 24 : 80);
      const up = dy < -(fast ? 24 : 60);
      if (down) sheet.set(sheet.state === 'full' ? 'half' : 'closed');
      else if (up) sheet.set('full');
      else sheet.set(sheet.state);
      if (sheet.state === 'closed' && el === drawerEl) afterDrawerClosed();
    };
    handles.forEach((h) => {
      h.style.touchAction = 'none';
      h.addEventListener('pointerdown', onDown);
      h.addEventListener('pointermove', onMove);
      h.addEventListener('pointerup', onUp);
      h.addEventListener('pointercancel', onUp);
    });
    el.setAttribute('aria-hidden', 'true');
    return sheet;
  };

  const listSheet = makeSheet(listEl, [listEl.querySelector('.sheet-handle'), listEl.querySelector('.list__head')]);
  const drawerSheet = makeSheet(drawerEl, [drawerEl.querySelector('.sheet-handle')]);

  // На десктопе колонка со списком видна всегда
  const syncDesktop = () => {
    if (desktopMq.matches) {
      listEl.removeAttribute('aria-hidden');
      listEl.classList.remove('is-open', 'is-half');
    }
  };
  desktopMq.addEventListener('change', syncDesktop);
  syncDesktop();

  $('#open-list').addEventListener('click', () => {
    drawerSheet.set('closed');
    listSheet.set(listSheet.state === 'closed' ? 'half' : 'closed');
  });

  /* ---------- Карточка места ---------- */
  let currentId = null;
  const drawerBody = $('#drawer-body');

  const tgIcon = iconUse('i-tg');

  const renderDrawer = (p) => {
    const c = CAT[p.cat];
    const tgLabel = p.tg === 'airport' ? 'Контакт партнёра по трансферу в Telegram' : p.cat === 'life' || p.cat === 'food' ? 'Спросить в Telegram' : 'Спросить про поездку в Telegram';
    drawerBody.innerHTML =
      `<div class="place" style="--c:${c.color}">` +
      `<span class="place__cat">${svg(ICONS[p.cat])}${esc(c.label)}</span>` +
      `<p class="place__vi">${esc(p.vi)}</p>` +
      `<h2 class="place__name">${esc(nb(p.name))}</h2>` +
      `<ul class="place__tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` +
      (p.when && nowMode ? `<p class="place__now${isNow(p) ? ' is-now' : ''}">${isNow(p) ? `Сейчас (${period.label}) — хорошее время.` : `Сейчас лучше: ${p.when.map((w) => PERIODS.find((x) => x.id === w).label).join(', ')}.`}</p>` : '') +
      (p.slope ? `<p class="place__slope place__slope--${p.slope.kind}"><span class="place__slope-dot" aria-hidden="true"></span><b>Рельеф: ${SLOPE_LABEL[p.slope.kind]}.</b> ${esc(nb(p.slope.note))}</p>` : '') +
      `<p class="place__desc">${esc(nb(p.desc))}</p>` +
      `<div class="place__tip"><p class="place__tip-h">Совет от своего</p><p>${esc(nb(p.tip))}</p></div>` +
      (window.SvoyAdmin ? window.SvoyAdmin.placeHtml(p.id, { name: p.name, vi: p.vi, pos: p.pos, placeId: p.placeId }) : '') +
      (p.approx ? '<p class="place__approx">Точка на карте примерная — показывает район, а не точный адрес.</p>' : '') +
      (userPos ? `<p class="place__dist">От вас по прямой: <b>${distLabel(distFromUser(p))}</b>. По дорогам будет дальше.</p>` : '') +
      `<div class="place__actions">` +
      `<a class="btn btn--tg" id="place-tg" href="${placeTelegramUrl(p)}" target="_blank" rel="noopener noreferrer">${tgIcon}${tgLabel}</a>` +
      `<button type="button" class="btn btn--fav fav-btn${favs.has(p.id) ? ' is-on' : ''}" data-fav="${p.id}" aria-pressed="${favs.has(p.id)}">${favInner(favs.has(p.id))}</button>` +
      `<button type="button" class="btn btn--ghost" id="place-copy"><svg aria-hidden="true"><use href="#i-link"/></svg>${navigator.share ? 'Поделиться местом' : 'Скопировать ссылку на место'}</button>` +
      `</div></div>`;

    const tg = $('#place-tg');
    tg.href = telegramHref(placeTelegramUrl(p));
    if (isMobile) tg.removeAttribute('target');

    $('#place-copy').addEventListener('click', () => copyLink(p));
    drawerBody.scrollTop = 0;
  };

  // Режим администратора (admin.js) включился или выключился: открытую карточку перерисовываем
  window.addEventListener('svoy-admin', () => {
    const place = currentId && PLACES.find((x) => x.id === currentId);
    if (place) renderDrawer(place);
  });

  const copyLink = (p) => shareUrl(placeLink(p), `${p.name} — Далат`, `${p.name} (${p.vi}) на карте Далата`);

  const shareUrl = async (link, title, text) => {
    // На телефоне открываем системное окно «Поделиться» (Telegram, WhatsApp и т. д.)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: link });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // человек закрыл окно — это не ошибка
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      toast('Ссылка скопирована');
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = link; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
      toast(ok ? 'Ссылка скопирована' : link);
    }
  };

  const setActiveMarker = (id) => {
    markers.forEach((m, mid) => {
      const el = m.getElement();
      if (el) el.classList.toggle('is-active', mid === id);
    });
    listBody.querySelectorAll('.card').forEach((c) => c.classList.toggle('is-active', c.dataset.id === id));
  };

  // Точка должна оказаться в видимой части карты, а не под карточкой
  const focusOffset = () => {
    const size = map.getSize();
    // Десктоп: правая панель занимает ~414 px — сдвигаем точку левее центра
    if (desktopMq.matches) return [207, 0];
    // Телефон: шторка закрывает нижнюю половину — ставим точку в середину оставшегося неба
    const visibleMid = (130 + size.y * 0.48) / 2;
    return [0, size.y / 2 - visibleMid];
  };

  const flyToPlace = (p) => {
    const z = p.zoom || 15;
    // Холодный старт: карта ещё 0 px — без пересчёта размера точка считается как NaN
    if (map.getSize().x === 0) map.invalidateSize();
    if (map.getSize().x === 0) { map.setView(p.pos, z, { animate: false }); return; }
    const [dx, dy] = focusOffset();
    const pt = map.project(p.pos, z).add([dx, dy]);
    const target = map.unproject(pt, z);
    if (reduceMotion) map.setView(target, z, { animate: false });
    else map.flyTo(target, z, { duration: 1.1 });
  };

  function openPlace(id, { fly = true, updateHash = true } = {}) {
    const p = PLACES.find((x) => x.id === id);
    if (!p) return;
    // Выбранное место должно быть на карте, даже если фильтр его скрывает
    if (!visiblePlaces().includes(p)) { activeFilter = 'all'; query = ''; $('#place-search').value = ''; applyFilter(); }
    currentId = id;
    renderDrawer(p);
    drawerSheet.set('half');
    listSheet.set('closed');
    syncDesktop();
    setActiveMarker(id);
    syncRouteUi();
    if (updateHash) history.replaceState(null, '', `#place=${id}`);
    if (fly) flyToPlace(p);
  }

  function afterDrawerClosed() {
    currentId = null;
    setActiveMarker(null);
    if (location.hash.startsWith('#place=')) history.replaceState(null, '', location.pathname + location.search + routeHash());
    syncRouteUi();
  }

  function closePlace() {
    drawerSheet.set('closed');
    afterDrawerClosed();
  }

  $('#drawer-close').addEventListener('click', closePlace);
  map.on('click', () => { if (currentId) closePlace(); if (listSheet.state !== 'closed') listSheet.set('closed'); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    if (currentId) closePlace();
    else if (routeId || routeListOpen) exitRoute();
    else if (listSheet.state !== 'closed') listSheet.set('closed');
  });

  // Закрыли попап района — убираем #district= из адреса
  map.on('popupclose', () => {
    if (location.hash.startsWith('#district=')) history.replaceState(null, '', location.pathname + location.search);
  });

  // Маркер пересоздаётся при фильтре — подсветку возвращаем
  markerGroup.on('layeradd', () => { if (currentId) setActiveMarker(currentId); });

  /* ---------- Маршруты на день ---------- */
  // Панель поверх карты: список маршрутов → выбранный маршрут (линия по порядку точек + шаги со временем)
  let routeId = null;      // открытый маршрут
  let routeListOpen = false; // показан список маршрутов
  let routeLayer = null;
  const routePanel = document.createElement('section');
  routePanel.id = 'route-panel';
  routePanel.className = 'route-panel';
  routePanel.hidden = true;
  routePanel.setAttribute('aria-label', 'Маршруты на день');
  $('.stage').appendChild(routePanel);

  let myRoute = null; // «Мой день»: собирается из избранного на лету, в routes.js его нет
  const routeById = (id) => (id === 'my-day' ? myRoute : ROUTES.find((r) => r.id === id));
  const routeLink = (r) => (window.SvoyShareLink ? window.SvoyShareLink(r.id, 'route') : `${location.origin}${location.pathname}#route=${r.id}`);
  const stepsWord = (n) => `${n} ${n === 1 ? 'место' : n > 1 && n < 5 ? 'места' : 'мест'}`;
  const routeHash = () => (routeId ? `#route=${routeId}` : '');
  const setRouteHash = () => history.replaceState(null, '', location.pathname + location.search + routeHash());
  const routeTelegramUrl = (r) => `${TELEGRAM_CHAT}?text=${encodeURIComponent(r.custom
    ? `Здравствуйте! Я собрал маршрут на день по карте Далата: ${r.steps.map((s, i) => `${i + 1}) ${PLACE_BY_ID[s.place].name}`).join('; ')}. Помогите с поездкой и деталями: `
    : `Здравствуйте! Я с карты Далата. Хочу этот маршрут: «${r.title}». Помогите с поездкой и деталями: `)}`;

  const renderRoutePanel = () => {
    const r = routeId && routeById(routeId);
    const closeBtn = (id, label) => `<button type="button" class="route-panel__x" id="${id}" aria-label="${label}" title="${label}"><svg aria-hidden="true"><use href="#i-close"/></svg></button>`;
    if (r) {
      routePanel.innerHTML =
        `<div class="route-panel__head"><button type="button" class="route-panel__back" id="route-all">‹ Все маршруты</button>${closeBtn('route-exit', 'Выйти из маршрута')}</div>` +
        `<h2 class="route-panel__title">${esc(nb(r.title))}</h2>` +
        `<p class="route-panel__meta">${esc([r.duration, r.transport, stepsWord(r.steps.length)].filter(Boolean).join(' · '))}</p>` +
        `<ol class="route-steps">${r.steps.map((s, i) => {
          const p = PLACE_BY_ID[s.place];
          return `<li><button type="button" class="route-step" data-step="${p.id}" style="--c:${CAT[p.cat].color}">` +
            `<span class="route-step__num">${i + 1}</span><span class="route-step__txt">` +
            `<span class="route-step__name">${s.time ? `<b>${esc(s.time)}</b> ` : ''}${esc(nb(p.name))}</span>` +
            `${s.note ? `<span class="route-step__note">${esc(nb(s.note))}</span>` : ''}</span></button></li>`;
        }).join('')}</ol>` +
        `<p class="route-panel__hint">${r.custom ? 'Порядок: каждый раз к ближайшему месту. Расстояния по прямой, не по дорогам.' : 'Линия идёт по порядку точек, а не по дорогам.'}</p>` +
        `<div class="route-panel__actions">` +
        `<a class="btn btn--tg" id="route-tg" href="${routeTelegramUrl(r)}" target="_blank" rel="noopener noreferrer">${tgIcon}${r.custom ? 'Отправить маршрут в Telegram' : 'Хочу этот маршрут'}</a>` +
        (r.custom ? '' : `<button type="button" class="btn btn--ghost" id="route-share"><svg aria-hidden="true"><use href="#i-link"/></svg>${navigator.share ? 'Поделиться маршрутом' : 'Скопировать ссылку'}</button>`) + `</div>`;
      const tg = $('#route-tg');
      tg.href = telegramHref(routeTelegramUrl(r));
      if (isMobile) tg.removeAttribute('target');
    } else {
      routePanel.innerHTML =
        `<div class="route-panel__head"><h2 class="route-panel__title">Маршруты на день</h2>${closeBtn('route-exit', 'Закрыть маршруты')}</div>` +
        `<div class="route-cards">${ROUTES.map((x) =>
          `<button type="button" class="route-card" data-route="${x.id}"><span class="route-card__ico">${svg(PLACE_ICONS[x.icon] || ICONS.nature)}</span>` +
          `<span class="route-card__txt"><span class="route-card__name">${esc(nb(x.title))}</span>` +
          `${x.sub ? `<span class="route-card__sub">${esc(nb(x.sub))}</span>` : ''}` +
          `<span class="route-card__meta">${esc([x.duration, x.transport, stepsWord(x.steps.length)].filter(Boolean).join(' · '))}</span></span></button>`
        ).join('')}</div>`;
    }
  };

  const syncRouteUi = () => {
    const show = !!(routeId || routeListOpen);
    routePanel.hidden = !show || !!currentId; // карточка места открыта — панель уступает ей место
    document.body.classList.toggle('route-open', show);
    const chip = $('#routes-toggle');
    if (chip) chip.setAttribute('aria-pressed', String(show));
  };

  const clearRouteLayer = () => {
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    if (!map.hasLayer(markerGroup)) markerGroup.addTo(map);
  };

  const drawRoute = (r) => {
    clearRouteLayer();
    map.removeLayer(markerGroup);
    const pts = r.steps.map((s) => PLACE_BY_ID[s.place].pos);
    routeLayer = L.featureGroup();
    L.polyline(pts, { color: '#fff', weight: 8, opacity: 0.85, lineCap: 'round', interactive: false }).addTo(routeLayer);
    L.polyline(pts, { color: '#2B4F3F', weight: 4, dashArray: '2 9', lineCap: 'round', interactive: false }).addTo(routeLayer);
    r.steps.forEach((s, i) => {
      const p = PLACE_BY_ID[s.place];
      const m = L.marker(p.pos, {
        icon: L.divIcon({ className: 'pin-anchor', html: `<span class="route-num" style="--c:${CAT[p.cat].color}">${i + 1}</span>`, iconSize: [0, 0] }),
        title: `${i + 1}. ${p.name}`, alt: p.name, zIndexOffset: 1000 + i
      });
      m.on('click', (e) => { L.DomEvent.stopPropagation(e); openPlace(p.id); });
      m.addTo(routeLayer);
    });
    routeLayer.addTo(map);
    map.invalidateSize();
    const desk = desktopMq.matches;
    map.flyToBounds(L.latLngBounds(pts), {
      paddingTopLeft: desk ? [40, 110] : [30, 140], paddingBottomRight: desk ? [40, 300] : [75, 430],
      maxZoom: 15, duration: reduceMotion ? 0 : 0.9
    });
  };

  function openRouteList() {
    if (!ROUTES.length) return;
    if (currentId) closePlace();
    exitRoute({ keepList: true });
    routeListOpen = true;
    listSheet.set('closed');
    renderRoutePanel();
    syncRouteUi();
  }

  function openRoute(id, { fly = true, updateHash = true } = {}) {
    const r = routeById(id);
    if (!r) return;
    if (currentId) closePlace();
    routeId = id;
    routeListOpen = false;
    listSheet.set('closed');
    renderRoutePanel();
    syncRouteUi();
    if (fly) drawRoute(r);
    if (updateHash) setRouteHash();
  }

  function exitRoute({ keepList = false } = {}) {
    const had = routeId;
    routeId = null;
    if (!keepList) routeListOpen = false;
    if (had) clearRouteLayer();
    if (had || !keepList) {
      if (location.hash.startsWith('#route=')) history.replaceState(null, '', location.pathname + location.search);
    }
    if (!keepList) { renderRoutePanel(); syncRouteUi(); }
  }

  routePanel.addEventListener('click', (e) => {
    const t = e.target;
    const card = t.closest('[data-route]');
    if (card) return openRoute(card.dataset.route);
    const step = t.closest('[data-step]');
    if (step) return openPlace(step.dataset.step);
    if (t.closest('#route-all')) return openRouteList();
    if (t.closest('#route-exit')) return exitRoute();
    if (t.closest('#route-share')) {
      const r = routeById(routeId);
      if (r) shareUrl(routeLink(r), `${r.title} — маршрут по Далату`, `Маршрут «${r.title}» по Далату`);
    }
  });

  // «Мой день»: места из «Моего списка» по цепочке «ближайшее к предыдущему», старт — от человека или от центра
  const buildMyDay = () => {
    const left = PLACES.filter((p) => favs.has(p.id));
    if (left.length < 2) return null;
    let cur = userPos || L.latLng(CENTER);
    const steps = [];
    let total = 0;
    while (left.length) {
      let bi = 0, bd = Infinity;
      left.forEach((p, i) => { const d = cur.distanceTo(L.latLng(p.pos)); if (d < bd) { bd = d; bi = i; } });
      const [p] = left.splice(bi, 1);
      steps.push({ place: p.id, note: `${distLabel(bd)} ${steps.length ? 'от предыдущей точки' : userPos ? 'от вас' : 'от центра'}` });
      if (steps.length > 1) total += bd;
      cur = L.latLng(p.pos);
    }
    return { id: 'my-day', custom: true, title: 'Мой день', duration: `между точками ≈ ${distLabel(total)}`, transport: '', steps };
  };
  const favDay = document.createElement('button');
  favDay.type = 'button';
  favDay.id = 'fav-day';
  favDay.className = 'fav-bar__day';
  favDay.textContent = 'Мой день';
  favBar.insertBefore(favDay, $('#fav-send'));
  favDay.addEventListener('click', () => {
    const r = buildMyDay();
    if (!r) { toast('Добавьте в список хотя бы два места'); return; }
    myRoute = r;
    openRoute('my-day', { updateHash: false });
  });

  /* ---------- Deep-ссылки ---------- */
  // #place=<id> — карточка места, #district=<id> — район для жизни (center, trieu-viet-vuong, tuyen-lam, north),
  // #route=<id> — маршрут на день (routes.js)
  const readHash = () => {
    const m = location.hash.match(/^#(place|district|route)=([a-z0-9-]+)/i);
    return m ? { kind: m[1].toLowerCase(), id: m[2].toLowerCase() } : null;
  };
  const openFromHash = () => {
    const h = readHash();
    if (h && h.kind === 'route' && routeById(h.id)) { if (routeId !== h.id || currentId) openRoute(h.id, { updateHash: false }); }
    else if (h && h.kind === 'place' && PLACES.some((p) => p.id === h.id)) openPlace(h.id, { updateHash: false });
    else if (h && h.kind === 'district' && (h.id === 'all' || ZONES.some((z) => z.id === h.id))) {
      if (h.id === 'all') showAllZones(); else focusZone(h.id);
    } else if (!h && currentId) closePlace();
    else if (!h && (routeId || routeListOpen)) exitRoute();
  };
  window.addEventListener('hashchange', openFromHash);

  /* ---------- Старт ---------- */
  // Ссылка Telegram в шапке — через приложение на телефоне
  const hdrTg = $('#tg-header');
  hdrTg.href = telegramHref(`${TELEGRAM_CHAT}?text=${encodeURIComponent('Здравствуйте! Я с карты Далата на сайте «Свой в Далате». Хочу спросить: ')}`);
  if (isMobile) hdrTg.removeAttribute('target');
  // Кнопка «Написать» в нижней панели — тем же путём, иначе на телефоне откроется заблокированный t.me
  const tabTg = $('.tabbar__tg');
  if (tabTg) {
    tabTg.href = hdrTg.href;
    if (isMobile) tabTg.removeAttribute('target');
  }

  renderFilters();
  applyFilter();
  updateFavUi();
  openFromHash();

  // Подсказка: чипы листаются вбок. Один раз за сеанс слегка сдвигаем строку и возвращаем
  try {
    const row = $('#filters');
    if (!reduceMotion && !sessionStorage.getItem('svoy-chips-hint') && row.scrollWidth > row.clientWidth + 40) {
      sessionStorage.setItem('svoy-chips-hint', '1');
      setTimeout(() => row.scrollTo({ left: 64, behavior: 'smooth' }), 900);
      setTimeout(() => row.scrollTo({ left: 0, behavior: 'smooth' }), 1700);
    }
  } catch (err) { /* без sessionStorage подсказку пропускаем */ }
})();
