/* =========================================================
   Свой в Далате — страница «Подбор жилья»
   Анкета собирает готовое сообщение и открывает Telegram. Ничего не сохраняется: ни на сайте, ни в браузере.
   ========================================================= */
(() => {
  'use strict';

  const TELEGRAM_USER = 'razumovdimka';
  const form = document.getElementById('podbor-form');
  if (!form) return;

  /* ---------- Telegram на телефоне — сразу в приложении (как на остальных страницах сайта) ---------- */
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isMobile = isAndroid || /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const telegramHref = (httpsUrl) => {
    if (!isMobile) return httpsUrl;
    const url = new URL(httpsUrl);
    const domain = url.pathname.split('/')[1];
    const text = url.searchParams.get('text');
    const query = `domain=${domain}${text ? `&text=${encodeURIComponent(text)}` : ''}`;
    return isAndroid
      ? `intent://resolve?${query}#Intent;scheme=tg;S.browser_fallback_url=${encodeURIComponent(httpsUrl)};end`
      : `tg://resolve?${query}`;
  };

  const preview = document.getElementById('podbor-preview');
  const status = document.getElementById('podbor-status');
  const dateInput = form.elements.arrival;

  // Нельзя выбрать дату в прошлом (по местному времени)
  const today = new Date();
  dateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const field = (name) => String(form.elements[name].value || '').replace(/\s+/g, ' ').trim();
  const ruDate = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('.') : '');

  const buildMessage = () => {
    const lines = [
      ['Бюджет в месяц', field('budget')],
      ['Заезд', ruDate(field('arrival'))],
      ['Срок', field('term')],
      ['Сколько человек', field('guests')],
      ['Спален', field('rooms')],
      ['Район', field('area')],
      ['Питомцы', field('pets')],
      ['Пожелания', String(form.elements.wishes.value || '').trim().slice(0, 600)]
    ].filter(([, value]) => value);
    return ['Здравствуйте! Хочу подобрать жильё в Далате.', '', ...lines.map(([label, value]) => `${label}: ${value}`)].join('\n');
  };

  const refresh = () => {
    preview.textContent = buildMessage();
    status.textContent = '';
  };
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  refresh();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const httpsUrl = `https://t.me/${TELEGRAM_USER}?text=${encodeURIComponent(buildMessage())}`;
    if (isMobile) window.location.href = telegramHref(httpsUrl);
    else window.open(httpsUrl, '_blank', 'noopener,noreferrer');
    status.textContent = 'Открываю Telegram. Если не открылся, нажмите «Скопировать текст» и отправьте мне вручную.';
  });

  document.getElementById('podbor-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(buildMessage());
      status.textContent = 'Текст скопирован. Вставьте его в Telegram или WhatsApp.';
    } catch {
      preview.closest('details').open = true;
      status.textContent = 'Не удалось скопировать автоматически: выделите текст ниже и скопируйте.';
    }
  });
})();
