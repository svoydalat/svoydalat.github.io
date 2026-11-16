/* =========================================================
   Свой в Далате — установка на экран телефона и работа без интернета:
   - регистрирует service worker (sw.js)
   - кнопки [data-install] показываются, когда сайт можно установить: Android/Chrome — системное окно,
     iPhone в Safari — шаги «На экран Домой», iPhone во встроенном окне (Telegram, VK…) — просьба открыть Safari
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
  const ua = navigator.userAgent;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIos = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS маскируется под Mac
  // Встроенное окно внутри приложения (Telegram, VK, Instagram…): в его меню «Поделиться» нет «На экран Домой».
  // Надёжный признак на iPhone — в user agent нет «Safari/»: он есть у Safari и у Chrome, Firefox, Edge на iOS.
  const IN_APP = /Telegram|FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|VKClient|VK\/|VKApp|Threads|MAX\/|YaSearchBrowser|YaApp|Twitter|Snapchat|TikTok|musical_ly|OKApp|Viber|WhatsApp/i;
  const OTHER_IOS_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo/i;
  const inAppIos = isIos && (IN_APP.test(ua) || (!/Safari\//.test(ua) && !OTHER_IOS_BROWSER.test(ua)));
  const isIpad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIosChrome = /CriOS/i.test(ua);
  const buttons = document.querySelectorAll('[data-install]');
  let deferred = null;

  const setShown = (on) => buttons.forEach((b) => { b.hidden = !on; });

  if (!standalone) {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; setShown(true); });
    if (isIos) setShown(true); // у iPhone нет системного окна установки — показываем подсказку или просим открыть Safari
  }
  window.addEventListener('appinstalled', () => { deferred = null; setShown(false); });

  // Скопировать текст: сначала современный способ, при отказе — через временное поле (старые iOS, встроенные окна)
  const copyText = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (err) { /* пробуем запасной путь */ }
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    field.remove();
    return ok;
  };

  // Иллюстрации: простые схемы, рисуются кодом (картинок и библиотек не нужно)
  const ART_SHARE = '<svg class="install-dialog__art" viewBox="0 0 300 118" role="img" aria-label="Схема: внизу экрана кнопка «Поделиться» — квадрат со стрелкой вверх">' +
    '<text x="150" y="18" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Нажмите «Поделиться»</text>' +
    '<path d="M150 26v22m-7-7 7 7 7-7" fill="none" stroke="#B5583A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="8" y="62" width="284" height="48" rx="16" fill="rgba(22,37,31,.07)"/>' +
    '<path d="m44 78-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>' +
    '<circle cx="150" cy="86" r="21" fill="rgba(227,162,26,.28)" stroke="#E3A21A" stroke-width="2"/>' +
    '<path d="M150 90V76m-5 5 5-5 5 5M143 83h-2v12h18V83h-2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M246 78v16l-6-4-6 4V78z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" opacity=".55"/></svg>';
  const ART_MENU = '<svg class="install-dialog__art" viewBox="0 0 300 96" role="img" aria-label="Схема: в верхнем углу окна кнопка с тремя точками">' +
    '<rect x="8" y="34" width="284" height="48" rx="16" fill="rgba(22,37,31,.07)"/>' +
    '<path d="m36 52 12 12m0-12L36 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>' +
    '<rect x="96" y="52" width="108" height="12" rx="6" fill="rgba(22,37,31,.12)"/>' +
    '<circle cx="262" cy="58" r="21" fill="rgba(227,162,26,.28)" stroke="#E3A21A" stroke-width="2"/>' +
    '<circle cx="253" cy="58" r="2.6" fill="currentColor"/><circle cx="262" cy="58" r="2.6" fill="currentColor"/><circle cx="271" cy="58" r="2.6" fill="currentColor"/>' +
    '<text x="262" y="16" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Меню</text>' +
    '<path d="M262 22v10m-6-6 6 6 6-6" fill="none" stroke="#B5583A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let installDialog = null;
  const showInstallDialog = (mode) => {
    if (!installDialog) {
      installDialog = document.createElement('dialog');
      installDialog.className = 'privacy-dialog install-dialog';
      installDialog.setAttribute('aria-labelledby', 'install-dialog-title');
      installDialog.addEventListener('click', (e) => {
        if (e.target === installDialog || e.target.closest('[data-install-close]')) installDialog.close();
      });
      document.body.appendChild(installDialog);
    }
    const pageUrl = location.href.split('#')[0].replace(/[?&]source=pwa$/, '');
    const shareWhere = isIpad ? 'вверху экрана' : (isIosChrome ? 'в адресной строке' : 'внизу экрана');
    const head = (title) => '<div class="privacy-dialog__head"><h2 id="install-dialog-title" class="privacy-dialog__title">' + title + '</h2>' +
      '<button type="button" class="privacy-dialog__close" data-install-close aria-label="Закрыть окно">&times;</button></div>';
    if (mode === 'safari') {
      installDialog.innerHTML = '<div class="privacy-dialog__inner">' + head('Откройте сайт в Safari') +
        '<p class="install-dialog__lead">В этом окне установить сайт на экран нельзя: у него нет пункта «На экран «Домой»». Нужен обычный браузер Safari.</p>' +
        ART_MENU +
        '<ol class="install-dialog__steps">' +
        '<li>Нажмите «⋯» в углу окна и выберите <b>«Открыть в Safari»</b>.</li>' +
        '<li>Если такого пункта нет, скопируйте ссылку кнопкой ниже, откройте Safari и вставьте её в адресную строку.</li>' +
        '<li>В Safari нажмите «Установить на телефон» ещё раз: покажу, что делать дальше.</li></ol>' +
        '<input class="install-dialog__url allow-select" type="text" readonly value="' + pageUrl.replace(/"/g, '&quot;') + '" aria-label="Ссылка на сайт">' +
        '<button type="button" class="install-dialog__btn" data-install-copy>Скопировать ссылку</button>' +
        '<p class="install-dialog__ok" role="status" aria-live="polite" hidden></p></div>';
      const copyBtn = installDialog.querySelector('[data-install-copy]');
      const ok = installDialog.querySelector('.install-dialog__ok');
      const input = installDialog.querySelector('.install-dialog__url');
      copyBtn.addEventListener('click', async () => {
        const done = await copyText(pageUrl);
        ok.hidden = false;
        if (done) {
          ok.textContent = 'Ссылка скопирована. Откройте Safari и вставьте её в адресную строку.';
        } else {
          ok.textContent = 'Не удалось скопировать сам. Нажмите на ссылку выше, выберите «Скопировать» и вставьте её в Safari.';
          input.focus();
          input.select();
        }
      });
    } else {
      installDialog.innerHTML = '<div class="privacy-dialog__inner">' + head('Установить на экран «Домой»') +
        '<p class="install-dialog__lead">Сайт откроется как приложение: своя иконка и экран на весь экран.</p>' +
        ART_SHARE +
        '<ol class="install-dialog__steps">' +
        '<li>Нажмите <b>«Поделиться»</b> (квадрат со стрелкой вверх) ' + shareWhere + '.</li>' +
        '<li>Прокрутите список вниз. Если пункта нет, нажмите «Ещё» или «Показать больше».</li>' +
        '<li>Выберите <b>«На экран «Домой»»</b>.</li>' +
        '<li>Нажмите <b>«Добавить»</b> в правом верхнем углу.</li></ol>' +
        '<button type="button" class="install-dialog__btn" data-install-close>Понятно</button></div>';
    }
    if (typeof installDialog.showModal === 'function') installDialog.showModal(); else installDialog.setAttribute('open', '');
  };

  buttons.forEach((b) => b.addEventListener('click', async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice.catch(() => {});
      deferred = null;
      setShown(false);
    } else if (isIos) {
      showInstallDialog(inAppIos ? 'safari' : 'share');
    }
  }));

  /* ---------- Нет связи ---------- */
  window.addEventListener('offline', () => notice('Нет связи. Сохранённые страницы и участки карты работают без интернета.', 6000));
  window.addEventListener('online', () => { if (bar) bar.classList.remove('is-on'); });
})();
