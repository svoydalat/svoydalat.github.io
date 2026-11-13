/* =========================================================
   Свой в Далате — service worker: сайт, карта и каталог жилья открываются без интернета.
   После изменения файлов сайта увеличьте номер версии в VERSION.
   CRM (/crm/) живёт отдельно, у неё свой service worker — здесь она не обрабатывается.
   ========================================================= */
const VERSION = 'svoy-dalat-v20';
const SHELL = `${VERSION}-shell`;
const TILES = `${VERSION}-tiles`;
const PHOTOS = `${VERSION}-photos`;
const NETWORK_TIMEOUT_MS = 3000; // дольше ждать сеть не стоим: на слабом интернете открываем сохранённую копию
const MAX_PHOTOS = 150; // фото каталога: храним недавно открытые, снятые с публикации объекты не копятся
const MAX_TILES = 400; // тайлы OpenStreetMap: храним только то, что человек сам открывал, без массовой загрузки

// Всё, без чего страницы не откроются
const PRECACHE = [
  './', 'index.html', 'map.html', 'realty.html', 'offline.html',
  'style.css', 'tw.css', 'map.css', 'guard.css', 'fonts.css',
  'script.js', 'map.js', 'realty.js', 'guard.js', 'pwa.js', 'admin.js', 'admin.css',
  'dalat_realty.json', 'manifest.webmanifest',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/layers.png', 'vendor/leaflet/images/layers-2x.png',
  'vendor/leaflet/images/marker-icon.png', 'vendor/leaflet/images/marker-icon-2x.png', 'vendor/leaflet/images/marker-shadow.png',
  'vendor/markercluster/leaflet.markercluster.js',
  'fonts/onest-cyrillic.woff2', 'fonts/onest-latin.woff2',
  'fonts/cormorant-garamond-cyrillic.woff2', 'fonts/cormorant-garamond-cyrillic-i.woff2',
  'fonts/cormorant-garamond-latin.woff2', 'fonts/cormorant-garamond-latin-i.woff2',
  'fonts/cormorant-garamond-vietnamese.woff2', 'fonts/caveat-cyrillic.woff2', 'fonts/caveat-latin.woff2',
  'img/hero-xuan-huong.webp', 'img/hero-xuan-huong-640.webp',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      // addAll падает целиком, если один файл не скачался, — поэтому по одному: сайт ставится и с частью файлов.
      // cache: 'reload' — берём файлы с сервера, а не из HTTP-кэша браузера, чтобы не сохранить устаревшие
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {}))))
    // skipWaiting здесь нет: новая версия ждёт, пока человек нажмёт «Обновить» (pwa.js присылает SKIP_WAITING)
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('svoy-dalat-') && !k.startsWith(`${VERSION}-`)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const trimCache = async (name, max) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
};

// Сначала сеть, но не дольше 3 секунд: потом — сохранённая копия (она же без интернета)
const networkFirst = async (request, fallbackUrl) => {
  const cache = await caches.open(SHELL);
  const saved = async () => (await cache.match(request, { ignoreSearch: true })) || (fallbackUrl && await cache.match(fallbackUrl)) || null;
  const network = fetch(request).then((response) => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  });
  network.catch(() => {}); // если сеть ответит с ошибкой после таймера, это уже никому не нужно
  const timer = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS));
  try {
    const response = await Promise.race([network, timer]);
    if (response && response.ok) return response;
    // Сервер ответил ошибкой (5xx, 404) — лучше сохранённая копия, чем страница ошибки
    if (response) return (await saved()) || response;
  } catch (err) { /* сети нет — берём копию */ }
  return (await saved()) || network.catch(() => Response.error());
};

// Сразу из кэша, в фоне обновляем: следующий заход уже со свежей версией
const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || network;
};

// Фото каталога: из кэша сразу, свежее подтягиваем в фоне; в кэше держим только последние MAX_PHOTOS
const photoCache = async (request) => {
  const cache = await caches.open(PHOTOS);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response && response.ok) cache.put(request, response.clone()).then(() => trimCache(PHOTOS, MAX_PHOTOS));
    return response;
  }).catch(() => cached || Response.error());
  return cached || network;
};

const cacheFirstTile = async (request) => {
  const cache = await caches.open(TILES);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    cache.put(request, response.clone()).then(() => trimCache(TILES, MAX_TILES));
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // заявки (POST) всегда идут напрямую

  const url = new URL(request.url);

  // Плитки карты OpenStreetMap
  if (url.hostname === 'tile.openstreetmap.org') {
    event.respondWith(cacheFirstTile(request).catch(() => Response.error()));
    return;
  }
  if (url.origin !== self.location.origin) return; // погода, курсы валют и прочее — как обычно, через сеть
  if (url.pathname.includes('/crm/')) return;       // у CRM свой service worker

  // Страницы: свежие при наличии интернета, без него — сохранённые
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, 'offline.html'));
    return;
  }
  // Каталог жилья обновляется часто — берём свежий, если есть сеть
  if (url.pathname.endsWith('/dalat_realty.json')) {
    event.respondWith(networkFirst(request));
    return;
  }
  // Фото объектов лежат на сайте: отдельный кэш с лимитом
  if (url.pathname.includes('/img/realty/')) {
    event.respondWith(photoCache(request));
    return;
  }
  // Стили и скрипты — сеть первой, иначе после обновления новая страница откроется со старым оформлением
  if (/\.(css|js)$/.test(url.pathname) || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(networkFirst(request));
    return;
  }
  // Шрифты, картинки сайта: сразу из кэша, в фоне обновляем
  event.respondWith(staleWhileRevalidate(request, SHELL));
});
