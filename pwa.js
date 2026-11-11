/* =========================================================
   Свой в Далате — установка на экран телефона и работа без интернета:
   - регистрирует service worker (sw.js)
   - кнопки [data-install] показываются, когда сайт можно установить
   - плашка «Нет связи», когда пропал интернет
   ========================================================= */
(() => {
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Офлайн-режим недоступен', err));
    });
  }

  /* ---------- Плашка с коротким сообщением ---------- */
  let bar = null;
  let timer = 0;
  const notice = (text, ms) => {
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'net-toast';
      bar.setAttribute('role', 'status');
      document.body.appendChild(bar);
    }
    bar.textContent = text;
    bar.classList.add('is-on');
    clearTimeout(timer);
    if (ms) timer = setTimeout(() => bar.classList.remove('is-on'), ms);
  };

  /* ---------- Установка ---------- */
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const buttons = document.querySelectorAll('[data-install]');
  let deferred = null;

  const setShown = (on) => buttons.forEach((b) => { b.hidden = !on; });

  if (!standalone) {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; setShown(true); });
    if (isIos) setShown(true); // у iPhone нет системного окна установки — показываем подсказку
  }
  window.addEventListener('appinstalled', () => { deferred = null; setShown(false); });

  buttons.forEach((b) => b.addEventListener('click', async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice.catch(() => {});
      deferred = null;
      setShown(false);
    } else if (isIos) {
      notice('На iPhone: нажмите «Поделиться» внизу браузера и выберите «На экран Домой».', 9000);
    }
  }));

  /* ---------- Нет связи ---------- */
  window.addEventListener('offline', () => notice('Нет связи. Сохранённые страницы и участки карты работают без интернета.', 6000));
  window.addEventListener('online', () => { if (bar) bar.classList.remove('is-on'); });
})();
