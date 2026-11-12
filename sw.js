/* =========================================================
   Свой в Далате — service worker: сайт, карта и каталог жилья открываются без интернета.
   После изменения файлов сайта увеличьте номер версии в VERSION.
   CRM (/crm/) живёт отдельно, у неё свой service worker — здесь она не обрабатывается.
   ========================================================= */
const VERSION = 'svoy-dalat-v3';
const SHELL = `${VERSION}-shell`;
const TILES = `${VERSION}-tiles`;
const MAX_TILES = 400; // тайлы OpenStreetMap: храним только то, что человек сам открывал, без массовой загрузки

// Всё, без чего страницы не откроются
const PRECACHE = [
  './', 'index.html', 'map.html', 'realty.html', 'offline.html',
  'style.css', 'tw.css', 'map.css', 'guard.css', 'fonts.css',
  'script.js', 'map.js', 'realty.js', 'guard.js', 'pwa.js',
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
  'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      // addAll падает целиком, если один файл не скачался, — поэтому по одному: сайт ставится и с частью файлов
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('svoy-dalat-') && !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const trimCache = async (name, max) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
};

// Сначала сеть, а без интернета — сохранённая копия
const networkFirst = async (request, fallbackUrl) => {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return (await cache.match(request, { ignoreSearch: true })) || (fallbackUrl && await cache.match(fallbackUrl)) || Response.error();
  }
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
  if (url.origin !== self.location.origin) return; // погода, фото объектов и прочее — как обычно, через сеть
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
  event.respondWith(staleWhileRevalidate(request, SHELL));
});
