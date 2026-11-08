# Свой в Далате

Сайт русскоязычного помощника в Далате: встреча в аэропорту, подбор жилья, аренда байка, помощь на месте.

- `index.html`, `style.css`, `script.js` — сайт; заявки уходят в бот «Свой CRM» (Google Apps Script).
- `realty.js` + `dalat_realty.json` — карта Leaflet / OpenStreetMap и каталог жилья.
- `crm/` — приложение «Свой CRM» для телефона.
- `tools/collect_dalat_realty.py` — сбор свежих объявлений об аренде в `dalat_realty.json`: цены с наценкой,
  точки на карте примерные, адресов нет. Запуск: `python tools/collect_dalat_realty.py`.
- `private/` — личные данные владельца (адреса, цены хозяев, ручные заголовки). Папка не публикуется.
