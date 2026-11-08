/* =========================================================
   Свой в Далате — общий скрипт index.html и map.html:
   защита контента, окно «Конфиденциальность», год в футере.
   Защита не трогает скролл, ссылки, кнопки и поля ввода.
   ========================================================= */
(() => {
  'use strict';

  const EDITABLE = 'input, textarea, select, [contenteditable="true"]';
  const ALLOW_COPY = `${EDITABLE}, .allow-select, a[href^="tel:"], a[href^="mailto:"]`;
  const inside = (node, selector) => {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    return Boolean(el && el.closest(selector));
  };

  /* ---------- Правая кнопка и копирование ---------- */
  document.addEventListener('contextmenu', (e) => {
    if (!inside(e.target, EDITABLE)) e.preventDefault();
  });

  document.addEventListener('copy', (e) => {
    const sel = window.getSelection();
    if (inside(e.target, ALLOW_COPY) || (sel && inside(sel.anchorNode, ALLOW_COPY))) return;
    e.preventDefault();
    if (e.clipboardData) e.clipboardData.setData('text/plain', '');
  });

  document.addEventListener('dragstart', (e) => {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });

  /* ---------- Горячие клавиши: копирование, сохранение, печать, исходный код ---------- */
  const BLOCKED_KEYS = new Set(['c', 's', 'p', 'u']);
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    // Буква берётся по физической клавише — работает и в русской раскладке
    const key = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : String(e.key).toLowerCase();
    if (!BLOCKED_KEYS.has(key)) return;
    // В полях ввода копировать и вставлять можно: пользователь правит собственный текст
    if (key === 'c' && inside(e.target, EDITABLE)) return;
    e.preventDefault();
  });

  // PrintScreen: браузер не даёт отменить снимок, но может очистить буфер обмена
  const clearClipboard = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('').catch(() => {});
    } catch (err) { /* нет доступа к буферу — ничего страшного */ }
  };
  document.addEventListener('keyup', (e) => { if (e.key === 'PrintScreen') clearClipboard(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'PrintScreen') clearClipboard(); });

  /* ---------- Размытие страницы, когда окно потеряло фокус ---------- */
  const shield = document.createElement('div');
  shield.className = 'focus-shield';
  shield.setAttribute('aria-hidden', 'true');
  document.body.appendChild(shield);
  const shieldOn = () => shield.classList.add('is-on');
  const shieldOff = () => shield.classList.remove('is-on');
  window.addEventListener('blur', shieldOn);
  window.addEventListener('focus', shieldOff);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && document.hasFocus()) shieldOff(); });

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
