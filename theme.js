/* Тёмная тема «Далат вечером»: кнопки [data-theme-toggle] переключают <html data-theme>.
   Начальную тему ставит строчка в <head> каждой страницы (до отрисовки, без вспышки);
   здесь — только переключатель. Выбор хранится в localStorage, без него — системная тема. */
(() => {
  const KEY = 'svoy:theme';
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const sync = () => {
    const dark = root.dataset.theme === 'dark';
    if (meta) meta.content = dark ? '#13231D' : '#F5F2EB';
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Светлая тема' : 'Тёмная тема');
    });
  };
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, root.dataset.theme); } catch (err) { /* без памяти — до перезагрузки */ }
    sync();
  });
  // Пока посетитель сам не выбрал — следуем за системной темой
  try {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => {
      let saved = null;
      try { saved = localStorage.getItem(KEY); } catch (err) { /* нет доступа */ }
      if (saved) return;
      root.dataset.theme = e.matches ? 'dark' : 'light';
      sync();
    });
  } catch (err) { /* старый браузер */ }
  sync();
})();
