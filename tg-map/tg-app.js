/* =========================================================
   Свой в Далате — карта внутри Telegram (Mini App)
   Работает и в обычном браузере: вне Telegram ничего не делает.

   Настройка (один раз, после создания приложения в @BotFather):
   BOT_APP = 'имя_бота/короткое_имя_приложения', например 'svoydalat_bot/map'.
   Пока пусто, кнопка «Поделиться» отправляет обычную ссылку на эту страницу.
   ========================================================= */
(() => {
  'use strict';

  const BOT_APP = 'dima_vacancy_bot/map';
  const BG = '#F4EFE5';

  const tg = window.Telegram && window.Telegram.WebApp;
  if (!tg || !tg.initData) return; // открыто не из Telegram — обычная карта

  window.SvoyMiniApp = true; // map.js: ссылки на Telegram оставляем https://t.me/..., открываем их через Mini App

  const safe = (fn) => { try { fn(); } catch (err) { /* старая версия Telegram — пропускаем */ } };
  safe(() => tg.ready());
  safe(() => tg.expand());
  safe(() => tg.setHeaderColor(BG));
  safe(() => tg.setBackgroundColor(BG));
  safe(() => tg.setBottomBarColor(BG));
  // Свайп вниз закрывал бы приложение вместо того, чтобы двигать шторку места
  safe(() => tg.disableVerticalSwipes());

  /* ---------- Открыть нужное место по ссылке t.me/бот/приложение?startapp=place-xxx ---------- */
  const start = (tg.initDataUnsafe && tg.initDataUnsafe.start_param) || '';
  const m = start.match(/^(place|district|route)-([a-z0-9-]+)$/i);
  if (m) history.replaceState(null, '', `${location.pathname}${location.search}#${m[1]}=${m[2]}`);

  /* ---------- Ссылки: Telegram открываем внутри, остальные — во встроенном браузере ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    let href = a.href;
    // Запасной путь: если ссылка всё же стала tg:// или intent://, возвращаем её к https://t.me/...
    const deep = href.match(/^(?:tg|intent):\/\/resolve\?([^#]*)/i);
    if (deep) {
      const q = new URLSearchParams(deep[1]);
      if (q.get('domain')) href = `https://t.me/${q.get('domain')}${q.get('text') ? `?text=${encodeURIComponent(q.get('text'))}` : ''}`;
    }
    if (/^https:\/\/t\.me\//i.test(href)) {
      e.preventDefault();
      safe(() => tg.openTelegramLink(href));
    } else if (/^https?:\/\//i.test(href) && new URL(href).origin !== location.origin) {
      e.preventDefault();
      safe(() => tg.openLink(href));
    }
  }, true);

  /* ---------- «Поделиться местом»: выбор чата в Telegram ---------- */
  window.SvoyShareLink = (id, kind = 'place') => (BOT_APP
    ? `https://t.me/${BOT_APP}?startapp=${kind}-${id}`
    : `${location.origin}${location.pathname}#${kind}=${id}`);
  navigator.share = ({ text, url }) => {
    const link = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || '')}`;
    safe(() => tg.openTelegramLink(link));
    return Promise.resolve();
  };

  /* ---------- Кнопка «Назад» Telegram закрывает карточку места, а затем маршрут ---------- */
  const drawer = document.getElementById('drawer');
  if (drawer && tg.BackButton) {
    const sync = () => {
      if (drawer.classList.contains('is-open') || document.body.classList.contains('route-open')) tg.BackButton.show(); else tg.BackButton.hide();
    };
    tg.BackButton.onClick(() => {
      const target = drawer.classList.contains('is-open') ? document.getElementById('drawer-close') : document.getElementById('route-exit');
      if (target) target.click();
    });
    new MutationObserver(sync).observe(drawer, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    sync();
  }
})();
