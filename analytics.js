/* =========================================================
   Свой в Далате — счётчик посещений и ссылка на канал.
   Подключён на всех страницах. Пока поля пустые, ничего не загружается и не показывается.

   metrikaId — номер счётчика Яндекс Метрики (только цифры, в кавычках): metrika.yandex.ru → «Добавить счётчик».
   tgChannel — адрес Telegram-канала без @, например 'svoydalat'. Пусто — ссылки на канал скрыты.

   Цели для Метрики (создать в «Настройки → Цели → JavaScript-событие», идентификатор — как ниже):
     tg_place   — «Спросить в Telegram» в карточке места
     tg_route   — «Хочу этот маршрут» / «Отправить маршрут в Telegram»
     tg_favs    — «Отправить мой список» из избранного
     tg_lead    — форма заявки: открыт Telegram с готовой заявкой
     tg_other   — любая другая кнопка Telegram (шапка, подвал, подбор жилья)
     gmaps      — «Открыть в Google Maps» в карточке места
     channel    — переход в Telegram-канал
   После правки: поднимите VERSION в sw.js и закоммитьте.
   ========================================================= */
(() => {
  const CONFIG = {
    metrikaId: '114716215',
    tgChannel: ''
  };

  const id = /^\d+$/.test(CONFIG.metrikaId) ? Number(CONFIG.metrikaId) : 0;

  // Отправка цели. Без счётчика — тихо ничего не делаем
  const goal = (name, params) => {
    if (!id || typeof window.ym !== 'function') return;
    try { window.ym(id, 'reachGoal', name, params || {}); } catch (e) { /* счётчик заблокирован — не страшно */ }
  };
  window.svoyGoal = goal;

  if (id) {
    // Официальный код Метрики, без Вебвизора: записи экрана не ведутся
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://mc.yandex.ru/metrika/tag.js';
    document.head.appendChild(s);
    window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
  }

  // Какая кнопка нажата. Слушаем в фазе захвата: Telegram Mini App перехватывает клики по ссылкам позже
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const page = location.pathname.split('/').pop() || 'index.html';
    if (a.id === 'place-gmaps') return goal('gmaps', { page });
    if (a.closest('[data-channel]')) return goal('channel', { page });
    if (!/^https:\/\/t\.me\//.test(a.href)) return;
    if (a.id === 'place-tg') return goal('tg_place', { page });
    if (a.id === 'route-tg') return goal('tg_route', { page });
    if (a.id === 'fav-send') return goal('tg_favs', { page });
    goal('tg_other', { page, from: a.dataset.tg || '' });
  }, true);

  // Ссылки на канал: на странице стоят скрытыми (data-channel), показываем, когда адрес задан
  const showChannel = () => {
    const name = CONFIG.tgChannel.replace(/^@/, '').trim();
    if (!/^[A-Za-z0-9_]{5,32}$/.test(name)) return;
    document.querySelectorAll('[data-channel]').forEach((el) => {
      const link = el.matches('a') ? el : el.querySelector('a');
      if (link) link.href = `https://t.me/${name}`;
      const label = el.querySelector('[data-channel-name]');
      if (label) label.textContent = `@${name}`;
      el.hidden = false;
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showChannel);
  else showChannel();
})();
