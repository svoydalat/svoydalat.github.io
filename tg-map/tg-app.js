/* =========================================================
   Свой в Далате — карта внутри Telegram (Mini App)
   Работает и в обычном браузере: вне Telegram ничего не делает.

   Настройка (один раз, после создания приложения в @BotFather):
   BOT_APP = 'имя_бота/короткое_имя_приложения', например 'svoydalat_bot/map'.
   Пока пусто, кнопка «Поделиться» отправляет обычную ссылку на эту страницу.
   ========================================================= */
(() => {
  'use strict';

  const BOT_APP = '';
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
  const m = start.match(/^(place|district)-([a-z0-9-]+)$/i);
  if (m) history.replaceState(null, '', `${location.pathname}${location.search}#${m[1]}=${m[2]}`);

  /* ---------- Ссылки: Telegram открываем внутри, остальные — во встроенном браузере ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.href;
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

  /* ---------- Кнопка «Назад» Telegram закрывает карточку места ---------- */
  const drawer = document.getElementById('drawer');
  if (drawer && tg.BackButton) {
    const sync = () => {
      if (drawer.classList.contains('is-open')) tg.BackButton.show(); else tg.BackButton.hide();
    };
    tg.BackButton.onClick(() => {
      const close = document.getElementById('drawer-close');
      if (close) close.click();
    });
    new MutationObserver(sync).observe(drawer, { attributes: true, attributeFilter: ['class'] });
    sync();
  }
})();
