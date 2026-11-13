/* =========================================================
   Свой в Далате — установка на экран телефона и работа без интернета:
   - регистрирует service worker (sw.js)
   - кнопки [data-install] показываются, когда сайт можно установить
   - плашка «Нет связи», когда пропал интернет
   ========================================================= */
(() => {
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  /* ---------- Плашка «Доступна новая версия» ---------- */
  let updateAsked = false; // человек нажал «Обновить»
  const offerUpdate = (worker) => {
    if (document.querySelector('.update-bar')) return;
    const box = document.createElement('div');
    box.className = 'update-bar';
    box.setAttribute('role', 'status');
    box.innerHTML = '<span>Доступна новая версия сайта</span>' +
      '<button type="button" class="update-bar__go">Обновить</button>' +
      '<button type="button" class="update-bar__later" aria-label="Напомнить позже">×</button>';
    box.querySelector('.update-bar__go').addEventListener('click', () => {
      updateAsked = true;
      box.querySelector('.update-bar__go').textContent = 'Обновляю…';
      worker.postMessage({ type: 'SKIP_WAITING' }); // новая версия включается, страница перезагрузится сама
    });
    box.querySelector('.update-bar__later').addEventListener('click', () => box.remove());
    document.body.appendChild(box);
  };

  if ('serviceWorker' in navigator && secure) {
    // Первый заход: версия ставится без вопросов и перезагрузки. Перезагружаем, только если страница уже работала под старой версией
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !(hadController || updateAsked)) return;
      reloading = true;
      location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(next);
          });
        });
        // Браузер сам проверяет новую версию редко: спрашиваем при возвращении в приложение и раз в час
        const check = () => reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
        setInterval(check, 60 * 60 * 1000);
      }).catch((err) => console.warn('Офлайн-режим недоступен', err));
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
  // Во встроенных браузерах мессенджеров и соцсетей «На экран Домой» нет — подсказку там не показываем
  const inApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Telegram|VK|YaSearchBrowser/i.test(navigator.userAgent);
  const isIos = !inApp && (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
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
