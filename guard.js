/* =========================================================
   Свой в Далате — общий скрипт index.html, map.html и realty.html:
   запрет перетаскивания картинок, окно «Конфиденциальность», год в футере.
   Текст копируется, меню по долгому тапу и горячие клавиши работают как обычно.
   ========================================================= */
(() => {
  'use strict';

  document.addEventListener('dragstart', (e) => {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });

  /* ---------- Год в футере ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Окно «Конфиденциальность» ---------- */
  const dialog = document.getElementById('privacy-dialog');
  if (dialog) {
    const open = () => (typeof dialog.showModal === 'function' ? dialog.showModal() : dialog.setAttribute('open', ''));
    const close = () => (typeof dialog.close === 'function' ? dialog.close() : dialog.removeAttribute('open'));
    document.querySelectorAll('[data-privacy-open]').forEach((btn) => btn.addEventListener('click', open));
    // Клик по затемнению (по самому <dialog>) или по крестику закрывает окно; Escape закрывает его сам браузер
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-privacy-close]')) close();
    });
  }
})();
