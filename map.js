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
    activity: 'M3 12c3-5 8-6 12-3l4-3v12l-4-3c-4 3-9 2-12-3zM15 11h.01',
    transport: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'
  };

  const CATEGORIES = [
    { id: 'nature', label: 'Природа и виды', short: 'Природа', color: '#3B6550' },
    { id: 'culture', label: 'Культура и архитектура', short: 'Культура', color: '#6F6AAE' },
    { id: 'coffee', label: 'Кофе и рынки', short: 'Кофе и рынки', color: '#B5583A' },
    { id: 'activity', label: 'Активности и рыбалка', short: 'Активности', color: '#C98A0F' },
    { id: 'transport', label: 'Транспорт', short: 'Транспорт', color: '#4F7186' }
  ];
  const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

  // approx: true — точка показывает район, а не конкретный адрес
  const PLACES = [
    {
      id: 'xuan-huong', cat: 'nature', name: 'Озеро Суан Хыонг', vi: 'Hồ Xuân Hương',
      pos: [11.9428, 108.4419], zoom: 15,
      tags: ['Бесплатно', 'Лучше на рассвете', 'Центр города'],
      desc: 'Сердце Далата: искусственное озеро в форме полумесяца, вокруг него — ровная дорожка примерно на 5 км. Здесь бегают, гуляют, катаются на лебединых педальных лодках, а вокруг — кафе и рынок в пяти минутах пешком.',
      tip: 'Приходите к 6–7 утра: над водой туман, на дорожке почти никого, а кофе рядом уже работает. По выходным вечером вокруг озера шумно и людно — гулять лучше в будни или с утра.'
    },
    {
      id: 'night-market', cat: 'coffee', name: 'Ночной рынок Далата', vi: 'Chợ đêm Đà Lạt',
      pos: [11.9427, 108.4368], zoom: 16,
      tags: ['Вечером', 'Уличная еда', 'Центр города'],
      desc: 'Вечерний рынок у большого рынка Далата: уличная еда, тёплая одежда, шапки, шарфы и сувениры. Идеальное место, чтобы поужинать «с рук» и согреться горячим соевым молоком.',
      tip: 'Приходите около 18:00, пока нет давки. Обязательно попробуйте bánh tráng nướng (рисовая «пицца» на углях) и тёплое молоко из сои. На одежду торгуйтесь — первая цена обычно завышена. Телефон и кошелёк держите в переднем кармане.'
    },
    {
      id: 'dalat-station', cat: 'culture', also: ['transport'], name: 'Старый ж/д вокзал Далата', vi: 'Ga Đà Lạt',
      pos: [11.9416, 108.4583], zoom: 16,
      tags: ['Небольшой билет', 'Ар-деко 1930-х', '10 мин от центра'],
      desc: 'Красивый вокзал времён французской колонии в стиле ар-деко с тремя «шпилями» на крыше. Регулярного сообщения с побережьем давно нет, зато ходит туристический поезд до посёлка Чайматы (Trại Mát) — рядом с пагодой Линь Фуок.',
      tip: 'Совместите с пагодой: на поезде доезжаете до Чайматы, а обратно возвращаетесь на байке или такси. Старые паровозы во дворе лучше снимать днём, когда на платформе меньше туристов. Расписание поезда уточняйте на месте.'
    },
    {
      id: 'crazy-house', cat: 'culture', name: 'Сумасшедший дом', vi: 'Crazy House · Biệt thự Hằng Nga',
      pos: [11.9347, 108.4307], zoom: 17,
      tags: ['Платный вход', 'Фото', '5 мин от центра'],
      desc: 'Гостевой дом-сказка архитектора Данг Вьет Нга: сросшиеся со стволами «деревьев» лестницы, туннели, окна-соты и жирафы на крыше. Здесь можно переночевать или просто пройти по лабиринту переходов.',
      tip: 'Приходите к открытию или после 16:00 — днём туристические автобусы забивают узкие лестницы. Обувь нужна на плоской подошве: ступени неровные и скользкие после дождя.'
    },
    {
      id: 'cathedral', cat: 'culture', name: 'Кафедральный собор Св. Николая', vi: 'Nhà thờ Chánh tòa (Con Gà)',
      pos: [11.9362, 108.4376], zoom: 17,
      tags: ['Бесплатно', 'Витражи', 'Центр города'],
      desc: 'Розовый собор 1930–40-х годов с колокольней и флюгером-петушком — поэтому его зовут «Церковью с петушком» (Nhà thờ Con Gà). Витражи изготовили во Франции.',
      tip: 'Изнутри смотрите витражи утром, когда в окна бьёт низкое солнце. Одевайтесь скромно — плечи и колени закрыты. На службах не ходите по залу.'
    },
    {
      id: 'truc-lam', cat: 'culture', name: 'Монастырь Чуклам', vi: 'Thiền viện Trúc Lâm',
      pos: [11.9038, 108.4352], zoom: 15,
      tags: ['Бесплатно', 'Тишина', '20 мин от центра'],
      desc: 'Дзен-монастырь на холме Фунг Хоанг над озером Туен Лам, построенный в начале 1990-х. Сады, пруды с цветами лотоса и вид на сосновые склоны. До монастыря можно подняться на канатной дороге от холма Робин.',
      tip: 'Приезжайте утром в будни — в выходные на дорожках много экскурсий. Одежда закрытая, говорите тихо. Сочетайте с прогулкой к озеру Туен Лам: пирс в десяти минутах.'
    },
    {
      id: 'tuyen-lam', cat: 'activity', name: 'Озеро Туен Лам — пирс и рыбалка', vi: 'Hồ Tuyền Lâm',
      pos: [11.8955, 108.4312], zoom: 15,
      tags: ['Рыбалка', 'Лучше на рассвете', '20 мин от центра'],
      desc: 'Самое большое озеро вокруг Далата, окружённое сосновыми холмами и резортами. Здесь прогулки по берегу, лодки и рыбалка с берега, а по утрам — густой туман.',
      tip: 'На рыбалку — на рассвете или перед закатом, днём клёв слабее. Возьмите тёплую куртку: у воды холоднее, чем в центре. Хотите на рыбалку с местным — напишите, организую выезд.'
    },
    {
      id: 'datanla', cat: 'nature', name: 'Водопад Датанла и альпийские горки', vi: 'Thác Datanla',
      pos: [11.9016, 108.4497], zoom: 15,
      tags: ['Платный вход', 'Аттракцион', '20 мин от центра'],
      desc: 'Водопад в лесном ущелье у перевала Прен: к нему ведёт тропа вниз по ступеням, а на склоне работает «альпийский» горный аттракцион — тележка, которая несётся по рельсам через лес.',
      tip: 'Ехать лучше в будни с утра — очередь на аттракцион короче. На мокрых ступенях нужна обувь с протектором, шлёпанцы не подойдут. Спуск пешком быстрый, а подъём обратно — по лестнице или на горке.'
    },
    {
      id: 'langbiang', cat: 'activity', name: 'Гора Лангбианг — треккинг и джипы', vi: 'Núi Lang Biang',
      pos: [12.0473, 108.4406], zoom: 14,
      tags: ['Треккинг', 'Вид на плато', '40 мин от центра'],
      desc: 'Главная вершина вокруг Далата — около 2 160 м. От подножия на вершину ведёт дорога: можно подняться пешком за полтора-два часа или доехать на местных джипах. Сверху видна долина и сам Далат.',
      tip: 'Выезжайте к 7:00 — к полудню вершину закрывают облака, а у джипов растёт очередь. Возьмите воду и ветровку: наверху заметно холоднее и дует. Точка на карте — район подножия, парковку лучше уточнить на месте.',
      approx: true
    },
    {
      id: 'cau-dat', cat: 'nature', name: 'Чайные холмы Каудат', vi: 'Đồi chè Cầu Đất',
      pos: [11.8770, 108.5710], zoom: 13,
      tags: ['Рассвет', 'Облака', '50 мин от центра'],
      desc: 'Чайные террасы на холмах к востоку от Далата, на высоте около 1 500 м. Знаменитое место для «охоты за облаками»: на рассвете море тумана ложится прямо на чайные ряды.',
      tip: 'Чтобы увидеть облака, выезжайте затемно, к 5:30–6:00. Тёплая куртка обязательна. Точка на карте — район холмов, а не конкретная ферма: уточняйте адрес накануне, у чайных плантаций несколько входов.',
      approx: true
    },
    {
      id: 'valley-of-love', cat: 'nature', name: 'Долина Любви', vi: 'Thung Lũng Tình Yêu',
      pos: [11.9775, 108.4489], zoom: 15,
      tags: ['Платный вход', 'Цветы', '15 мин от центра'],
      desc: 'Парк с цветочными садами, озером и холмами на севере Далата. Здесь много цветочных композиций, фигур и площадок для фото — особенно популярна у местных на выходных.',
      tip: 'Приезжайте к открытию в будни — после обеда и по выходным здесь много экскурсий. Лучше всего цветы сезона смотреть в солнечное утро. Рядом сразу много теплиц и ферм гортензий — можно заехать по пути.'
    },
    {
      id: 'bao-dai-palace', cat: 'culture', name: 'Летний дворец Бао Дая — Дворец III', vi: 'Dinh III Bảo Đại',
      pos: [11.9301, 108.4293], zoom: 16,
      tags: ['Платный вход', 'История', '10 мин от центра'],
      desc: 'Летняя резиденция последнего императора Вьетнама Бао Дая, построенная в 1930-х на сосновом холме. Сохранились кабинет, спальни и залы с мебелью той эпохи, а вокруг дворца — тенистый парк.',
      tip: 'Приходите к открытию — в обед дворец занят экскурсиями, и в комнатах тесно. Фотографировать внутри можно, но без вспышки. Сочетайте с Crazy House — они в паре кварталов друг от друга.'
    },
    {
      id: 'linh-phuoc', cat: 'culture', name: 'Пагода Линь Фуок (Бутылочный храм)', vi: 'Chùa Linh Phước · Chùa Ve Chai',
      pos: [11.9442, 108.4995], zoom: 16,
      tags: ['Бесплатно', 'Мозаика', '25 мин от центра'],
      desc: 'Пагода, украшенная мозаикой из стеклянных бутылок, черепков и керамики. Особенно впечатляют дракон во дворе и башня с видом на окрестности посёлка Чайматы.',
      tip: 'Приезжайте утром — во дворе спокойно, в храме идёт служба. Одежда закрытая, обувь снимается у входа. Хорошо комбинируется с поездкой на туристическом поезде от вокзала Далата.'
    },
    {
      id: 'prenn', cat: 'nature', name: 'Водопад Пренн', vi: 'Thác Prenn',
      pos: [11.8765, 108.4701], zoom: 15,
      tags: ['Платный вход', 'По пути в аэропорт', '25 мин от центра'],
      desc: 'Небольшой, но живописный водопад у горного перевала Прен на дороге к аэропорту. За водопадом можно пройти по тропе, вокруг — сосны и аккуратные сады.',
      tip: 'Удобно заезжать по пути из аэропорта или в аэропорт — будет остановка на полчаса, а не отдельная поездка. Тропа скользкая, обувь с протектором. Если едете с багажом, напишите заранее — договорюсь о трансфере с остановкой.'
    },
    {
      id: 'clay-tunnel', cat: 'culture', name: 'Глиняный туннель скульптур', vi: 'Đường hầm điêu khắc',
      pos: [11.8829, 108.4112], zoom: 16,
      tags: ['Платный вход', 'Фото', '20 мин от центра'],
      desc: 'Коридор-галерея с глиняными скульптурами и уменьшенными копиями знаменитых памятников: от вьетнамских храмов до мировых достопримечательностей. Хороший вариант в дождливый день.',
      tip: 'Приходите утром в будни — снимать скульптуры без толпы проще. Отдельная поездка на байке ради него не обязательна: заезжайте по пути к озеру Туен Лам.'
    },
    {
      id: 'airport', cat: 'transport', name: 'Аэропорт Льенкхыонг (DLI)', vi: 'Sân bay Liên Khương',
      pos: [11.7504, 108.3612], zoom: 14,
      tags: ['Встреча', 'Трансфер', '~30 км от центра'],
      desc: 'Единственный аэропорт Далата, около 30 км от центра по горной дороге. От него до города ехать порядка 40 минут, по пути — перевал Прен и сосновые склоны.',
      tip: 'Встречаю у выхода из зала прилёта с табличкой — такси на выходе берут дороже, а ночью машин может не быть. Пишите заранее свой рейс и время прилёта, и я организую машину под ваш багаж.',
      tg: 'airport'
    },
    {
      id: 'cloud-cafes', cat: 'coffee', name: 'Кофейни над облаками', vi: 'Quán cà phê săn mây',
      pos: [11.9230, 108.4390], zoom: 14,
      tags: ['Рассвет', 'Облака', 'Район Чьеу Вьет Выонг'],
      desc: 'На склонах южных холмов — район Триеу Вьет Выонг — и ещё в посёлке Чайматы работает целая россыпь кофеен с панорамными верандами: утром туман лежит прямо под ногами.',
      tip: 'Выезжайте к 6:00–6:30 и берите места у окна заранее. Кофе с ca phe sua da (с молоком и льдом) здесь хорош даже в холод, а ещё лучше — горячий. Точка на карте — район, а не адрес: подберу кофейню под вашу дорогу.',
      approx: true
    }
  ];

  // Районы для жизни. Круг — примерная зона, а не административная граница
  const ZONES = [
    {
      id: 'center', name: 'Центр и озеро Суан Хыонг', vi: 'Hồ Xuân Hương', color: '#E3A21A',
      center: [11.9420, 108.4400], radius: 1800,
      plus: 'Вся инфраструктура пешком: рынки, кафе, магазины, аптеки. Ровный рельеф вокруг озера — 5 км для прогулок и бега.',
      minus: 'Шумно по выходным и вечером, дорого, много туристов.'
    },
    {
      id: 'trieu-viet-vuong', name: 'Чьеу Вьет Выонг и Ан Шон', vi: 'Triệu Việt Vương / An Sơn', color: '#3B6550',
      center: [11.9215, 108.4420], radius: 1700,
      plus: 'Тихий зелёный район на южных холмах среди сосен и французских вилл. Идеально для спокойной жизни и удалённой работы: сухо, панорамные виды, 10 минут до центра.',
      minus: 'Нужен байк или такси, холмы и крутые подъёмы, мало магазинов.'
    },
    {
      id: 'tuyen-lam', name: 'Озеро Туен Лам', vi: 'Hồ Tuyền Lâm', color: '#4F7186',
      center: [11.8950, 108.4290], radius: 2800,
      plus: 'Курортная лесная зона у горного озера и монастыря Чуклам. Максимальное уединение, туманы, сосны, рыбалка, резорты.',
      minus: 'Далеко от центра, мало магазинов и кафе, без байка не обойтись.'
    },
    {
      id: 'north', name: 'Север и Долина Любви', vi: 'Phường 8 / Thung Lũng Tình Yêu', color: '#D9809A',
      center: [11.9680, 108.4490], radius: 2200,
      plus: 'Студенческий и цветочный район: теплицы, фермы гортензий и спокойные локальные кварталы. Цены на жильё ниже, чем в центре.',
      minus: 'Меньше кофеен и сервисов для туристов, до озера — 15–20 минут на байке.'
    }
  ];

  /* ---------- Утилиты ---------- */
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (path, attrs = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${attrs}><path d="${path}"/></svg>`;
  const iconUse = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isMobile = isAndroid || /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const desktopMq = window.matchMedia('(min-width: 900px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Как на главной: на телефоне Telegram открываем приложением, минуя заблокированный t.me
  const telegramHref = (httpsUrl) => {
    if (!isMobile) return httpsUrl;
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
      ? 'Привет! Нужна встреча в аэропорту Льенкхыонг (DLI) и трансфер до Далата. Мои дата, рейс и количество человек: '
      : `Привет! Я с карты Далата. Хочу поехать: «${p.name}» (${p.vi}). Помоги с поездкой и деталями: `;
    return `${TELEGRAM_CHAT}?text=${encodeURIComponent(text)}`;
  };

  const googleMapsUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${p.pos[0]},${p.pos[1]}`;
  const placeLink = (p) => `${location.origin}${location.pathname}#place=${p.id}`;

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

  // Кнопки зума: слева-снизу на десктопе, справа-сверху (под чипсами) на телефоне
  let zoomControl = null;
  const placeZoom = () => {
    if (zoomControl) zoomControl.remove();
    zoomControl = L.control.zoom({
      position: desktopMq.matches ? 'bottomleft' : 'topright',
      zoomInTitle: 'Приблизить', zoomOutTitle: 'Отдалить'
    }).addTo(map);
  };
  placeZoom();
  desktopMq.addEventListener('change', placeZoom);

  /* ---------- Маркеры ---------- */
  const markers = new Map();
  const markerGroup = L.layerGroup().addTo(map);

  const makeIcon = (p) => L.divIcon({
    className: 'pin-anchor',
    html: `<span class="pin${p.approx ? ' pin--approx' : ''}" style="--c:${CAT[p.cat].color}">${svg(ICONS[p.cat])}</span>`,
    iconSize: [0, 0]
  });

  PLACES.forEach((p, i) => {
    const m = L.marker(p.pos, { icon: makeIcon(p), title: p.name, alt: p.name, riseOnHover: true, zIndexOffset: i });
    m.on('click', (e) => { L.DomEvent.stopPropagation(e); openPlace(p.id); });
    markers.set(p.id, m);
  });

  /* ---------- Районы ---------- */
  const zonesGroup = L.layerGroup();
  ZONES.forEach((z) => {
    const circle = L.circle(z.center, {
      radius: z.radius, color: z.color, weight: 2, opacity: 0.8,
      fillColor: z.color, fillOpacity: 0.2, dashArray: '6 6'
    });
    circle.bindTooltip(esc(z.name), { permanent: true, direction: 'center', className: 'zone-label' });
    circle.bindPopup(
      `<div class="zone-pop"><h3>${esc(z.name)}</h3><p class="vi">${esc(z.vi)}</p>` +
      `<p class="plus">+ ${esc(z.plus)}</p><p class="minus">− ${esc(z.minus)}</p></div>`,
      { maxWidth: 300, autoPanPadding: [30, 120] }
    );
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
      `<button type="button" class="chip chip--zones chip--sep" id="zones-toggle" aria-pressed="${map.hasLayer(zonesGroup)}">` +
      `<span class="chip__dot" style="--c:var(--sunflower)"></span><span id="zones-label"></span></button>`;
    updateZonesLabel();
  };

  const updateZonesLabel = () => {
    const on = map.hasLayer(zonesGroup);
    const label = $('#zones-label');
    if (label) label.textContent = on ? 'Скрыть районы для жизни' : 'Показать районы для жизни';
    const btn = $('#zones-toggle');
    if (btn) btn.setAttribute('aria-pressed', String(on));
  };

  const visiblePlaces = () => PLACES.filter((p) => activeFilter === 'all' || p.cat === activeFilter || (p.also && p.also.includes(activeFilter)));

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
    activeFilter = chip.dataset.filter;
    applyFilter();
    // Выбранное место пропало из фильтра — карточку закрываем
    if (currentId && !visiblePlaces().some((p) => p.id === currentId)) closePlace();
  });

  /* ---------- Список мест ---------- */
  const listBody = $('#list-body');

  const renderList = () => {
    const items = visiblePlaces();
    $('#list-count').textContent = `${items.length} ${items.length === 1 ? 'место' : items.length < 5 ? 'места' : 'мест'} · нажмите, чтобы открыть`;
    listBody.innerHTML = items.length ? items.map((p) =>
      `<button type="button" class="card${p.id === currentId ? ' is-active' : ''}" data-id="${p.id}" style="--c:${CAT[p.cat].color}">` +
      `<span class="card__ico">${svg(ICONS[p.cat])}</span>` +
      `<span class="card__txt"><span class="card__name">${esc(p.name)}</span>` +
      `<span class="card__vi">${esc(p.vi)}</span>` +
      `<span class="card__meta">${esc(CAT[p.cat].short)} · ${esc(p.tags[p.tags.length - 1])}</span></span></button>`
    ).join('') : '<p class="list__empty">В этой категории пока ничего нет.</p>';
  };

  listBody.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card) openPlace(card.dataset.id);
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
    const tgLabel = p.tg === 'airport' ? 'Заказать встречу и трансфер в ТГ' : 'Спросить / заказать поездку в ТГ';
    drawerBody.innerHTML =
      `<div class="place" style="--c:${c.color}">` +
      `<span class="place__cat">${svg(ICONS[p.cat])}${esc(c.label)}</span>` +
      `<p class="place__vi">${esc(p.vi)}</p>` +
      `<h2 class="place__name">${esc(p.name)}</h2>` +
      `<ul class="place__tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` +
      `<p class="place__desc">${esc(p.desc)}</p>` +
      `<div class="place__tip"><p class="place__tip-h">Совет от своего</p><p>${esc(p.tip)}</p></div>` +
      (p.approx ? '<p class="place__approx">Точка на карте примерная — показывает район, а не точный адрес.</p>' : '') +
      `<div class="place__actions">` +
      `<a class="btn btn--primary" href="${googleMapsUrl(p)}" target="_blank" rel="noopener noreferrer"><svg aria-hidden="true"><use href="#i-route"/></svg>Маршрут в Google Maps</a>` +
      `<a class="btn btn--tg" id="place-tg" href="${placeTelegramUrl(p)}" target="_blank" rel="noopener noreferrer">${tgIcon}${tgLabel}</a>` +
      `<button type="button" class="btn btn--ghost" id="place-copy"><svg aria-hidden="true"><use href="#i-link"/></svg>Скопировать ссылку на место</button>` +
      `</div></div>`;

    const tg = $('#place-tg');
    tg.href = telegramHref(placeTelegramUrl(p));
    if (isMobile) tg.removeAttribute('target');

    $('#place-copy').addEventListener('click', () => copyLink(p));
    drawerBody.scrollTop = 0;
  };

  const copyLink = async (p) => {
    const link = placeLink(p);
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
    if (!visiblePlaces().includes(p)) { activeFilter = 'all'; applyFilter(); }
    currentId = id;
    renderDrawer(p);
    drawerSheet.set('half');
    listSheet.set('closed');
    syncDesktop();
    setActiveMarker(id);
    if (updateHash) history.replaceState(null, '', `#place=${id}`);
    if (fly) flyToPlace(p);
  }

  function afterDrawerClosed() {
    currentId = null;
    setActiveMarker(null);
    if (location.hash.startsWith('#place=')) history.replaceState(null, '', location.pathname + location.search);
  }

  function closePlace() {
    drawerSheet.set('closed');
    afterDrawerClosed();
  }

  $('#drawer-close').addEventListener('click', closePlace);
  map.on('click', () => { if (currentId) closePlace(); if (listSheet.state !== 'closed') listSheet.set('closed'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && currentId) closePlace(); });

  // Маркер пересоздаётся при фильтре — подсветку возвращаем
  markerGroup.on('layeradd', () => { if (currentId) setActiveMarker(currentId); });

  /* ---------- Deep-ссылки ---------- */
  const readHash = () => {
    const m = location.hash.match(/^#place=([a-z0-9-]+)/i);
    return m ? m[1].toLowerCase() : null;
  };
  const openFromHash = () => {
    const id = readHash();
    if (id && PLACES.some((p) => p.id === id)) openPlace(id, { updateHash: false });
    else if (!id && currentId) closePlace();
  };
  window.addEventListener('hashchange', openFromHash);

  /* ---------- Старт ---------- */
  // Ссылка Telegram в шапке — через приложение на телефоне
  const hdrTg = $('#tg-header');
  hdrTg.href = telegramHref(`${TELEGRAM_CHAT}?text=${encodeURIComponent('Привет! Я с карты Далата на сайте Свой в Далате. Хочу проконсультироваться: ')}`);
  if (isMobile) hdrTg.removeAttribute('target');

  renderFilters();
  applyFilter();
  openFromHash();
})();
