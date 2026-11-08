/* =========================================================
   Свой в Далате — карта и каталог аренды жилья
   - объявления из dalat_realty.json (собирает tools/collect_dalat_realty.py)
   - в файле нет адресов: точки на карте примерные, цены — для клиента
   - карта Leaflet + OpenStreetMap, на пинах — цены за месяц
   - фильтры: тип жилья, спальни, цена, сортировка
   - «Показать на карте» и заявка по объекту в бот «Свой CRM»: в заявке номер объекта,
     по нему адрес находится в личном списке private/адреса-объектов.html
   ========================================================= */
(() => {
  const mapEl = document.getElementById('realty-map');
  const site = window.SvoySite;
  if (!mapEl || !site) return;

  const grid = document.getElementById('realty-grid');
  const countEl = document.getElementById('realty-count');
  const sourceEl = document.getElementById('realty-source');
  const minSelect = document.getElementById('price-min');
  const maxSelect = document.getElementById('price-max');
  const roomsSelect = document.getElementById('realty-rooms');
  const sortSelect = document.getElementById('realty-sort');
  const moreWrap = document.getElementById('realty-more-wrap');
  const moreBtn = document.getElementById('realty-more');
  const kindTabs = document.querySelectorAll('[data-kind]');

  const DALAT = [11.9404, 108.4583];
  // Рамка вокруг Далата: точка за её пределами — ошибка в данных, такой объект на карту не попадает
  const DALAT_BOUNDS = { south: 11.8, north: 12.1, west: 108.3, east: 108.6 };
  const KIND_RU = { apartment: 'Квартира', house: 'Дом', room: 'Комната' };
  const PRICE_STEPS = [0, 3e6, 5e6, 8e6, 12e6, 20e6, 40e6, 80e6];
  const PAGE_SIZE = 12; // сколько карточек показываем за раз, остальные — по кнопке «Показать ещё»
  const APPROX_RADIUS_M = 450; // точка сдвинута до 420 м — настоящий дом внутри круга

  const state = { items: [], list: [], limit: PAGE_SIZE, kind: 'all', rooms: 0, min: 0, max: Infinity, sort: 'new' };
  const markers = new Map();

  /* ---------- Помощники ---------- */
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
  const safeUrl = (url) => (/^https:\/\/[^\s"'<>]+$/.test(url || '') ? url : '');

  const plural = (n, one, few, many) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  // 7 200 000 → «7,2 млн»
  const shortMoney = (vnd) => {
    const [value, unit] = vnd >= 1e6 ? [vnd / 1e6, 'млн'] : [vnd / 1e3, 'тыс.'];
    return `${Number(value.toFixed(2)).toLocaleString('ru-RU')} ${unit}`;
  };
  const priceLabel = (item) => `${shortMoney(item.price)} ₫/мес`;
  const distanceLabel = (item) => (item.distance ? `≈ ${item.distance.toLocaleString('ru-RU')} км от центра` : 'Далат');

  const ICON_PIN = '<svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>';
  const ICON_CAMERA = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>';
  // Замок: адрес закрыт до заявки
  const ICON_LOCK = '<svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  /* ---------- Данные ---------- */
  const normalize = (raw) => {
    const lat = Number(raw && raw.lat);
    const lng = Number(raw && raw.lng);
    const price = Number(raw && raw.price_vnd);
    if (!raw || !raw.id || !KIND_RU[raw.kind] || !Number.isFinite(lat) || !Number.isFinite(lng) || !(price > 0)) return null;
    if (lat < DALAT_BOUNDS.south || lat > DALAT_BOUNDS.north || lng < DALAT_BOUNDS.west || lng > DALAT_BOUNDS.east) return null;
    const photos = (raw.photos || [])
      .map((photo) => ({ thumb: safeUrl(photo.thumb), full: safeUrl(photo.full) || safeUrl(photo.thumb) }))
      .filter((photo) => photo.thumb);
    return {
      id: String(raw.id),
      code: Number(raw.code) || 0,
      kind: raw.kind,
      title: raw.title_ru || 'Жильё в аренду',
      description: raw.description_ru || '',
      rooms: Number(raw.rooms) || 0,
      distance: Number(raw.distance_km) || 0,
      posted: Date.parse(raw.posted_at) || 0,
      pos: [lat, lng],
      price,
      photos
    };
  };

  /* ---------- Карта ---------- */
  // Приближение ограничено: точки примерные, улицу и дом по ним искать бессмысленно
  const map = L.map(mapEl, {
    center: DALAT,
    zoom: 13,
    maxZoom: 16,
    scrollWheelZoom: false,
    dragging: !L.Browser.mobile
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 16,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
  }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');

  // Колёсико мыши масштабирует карту только после клика по ней — страница прокручивается свободно
  map.on('click', () => map.scrollWheelZoom.enable());
  mapEl.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

  // На телефоне одним пальцем прокручивается страница, двумя — двигается карта
  if (L.Browser.mobile) {
    const hint = document.getElementById('map-hint');
    let hintTimer;
    if (hint) mapEl.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1) return;
      hint.classList.add('is-visible');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => hint.classList.remove('is-visible'), 1300);
    }, { passive: true });
  }

  // После анимации появления блока пересчитываем размер карты
  const mapWrap = document.getElementById('realty-map-wrap');
  mapWrap.addEventListener('animationend', () => map.invalidateSize());

  // Круг «где-то здесь» вокруг открытого объекта
  const approxCircle = L.circle(DALAT, {
    radius: APPROX_RADIUS_M,
    color: '#3B6550',
    weight: 1.5,
    dashArray: '4 6',
    fillColor: '#4E7A61',
    fillOpacity: 0.12,
    interactive: false
  });

  // Близкие объекты собираются в кружок «5 · от 4,8 млн»; с 15-го масштаба видны все цены
  const cluster = L.markerClusterGroup({
    maxClusterRadius: 56,
    showCoverageOnHover: false,
    disableClusteringAtZoom: 15,
    spiderfyOnMaxZoom: false,
    iconCreateFunction: (group) => {
      const prices = group.getAllChildMarkers().map((marker) => marker.options.price);
      return L.divIcon({
        className: 'price-pin-anchor',
        html: `<span class="price-cluster"><b>${prices.length}</b><span>от ${esc(shortMoney(Math.min(...prices)))}</span></span>`,
        iconSize: null,
        iconAnchor: [0, 0]
      });
    }
  }).addTo(map);

  const pinIcon = (item, active) => L.divIcon({
    className: 'price-pin-anchor',
    html: `<span class="price-pin${active ? ' is-active' : ''}">${esc(shortMoney(item.price))}</span>`,
    iconSize: null,
    iconAnchor: [0, 0],
    popupAnchor: [0, -38]
  });

  const popupHtml = (item) => {
    const photo = item.photos[0];
    const gallery = item.photos.length > 1
      ? `<button type="button" class="gallery-btn gallery-btn--prev" data-gallery-step="-1" aria-label="Предыдущее фото">‹</button>
         <button type="button" class="gallery-btn gallery-btn--next" data-gallery-step="1" aria-label="Следующее фото">›</button>
         <span class="gallery-count" data-gallery-count>1 / ${item.photos.length}</span>`
      : '';
    return `
      <div class="realty-popup" data-id="${esc(item.id)}" data-index="0">
        ${photo ? `<div class="realty-popup__media">
          <img src="${esc(photo.full)}" alt="${esc(item.title)}" loading="lazy" referrerpolicy="no-referrer" data-gallery-img>
          <span class="deal-badge">${KIND_RU[item.kind]} · № ${item.code}</span>
          ${gallery}
        </div>` : ''}
        <div class="realty-popup__body">
          <p class="realty-popup__price">${esc(priceLabel(item))}</p>
          <p class="realty-popup__title">${esc(item.title)}</p>
          ${item.description ? `<p class="realty-popup__desc">${esc(item.description)}</p>` : ''}
          <p class="realty-popup__line">${ICON_LOCK}<span>${esc(distanceLabel(item))} · точный адрес — после заявки</span></p>
          <button type="button" class="realty-popup__cta" data-lead="${esc(item.id)}">Оставить заявку</button>
        </div>
      </div>`;
  };

  const setActivePin = (id) => {
    markers.forEach((marker, markerId) => {
      const item = state.items.find((it) => it.id === markerId);
      marker.setIcon(pinIcon(item, markerId === id));
      marker.setZIndexOffset(markerId === id ? 1000 : 0);
    });
  };

  const createMarkers = () => {
    state.items.forEach((item) => {
      const marker = L.marker(item.pos, { icon: pinIcon(item, false), title: `№ ${item.code}: ${item.title} — ${priceLabel(item)}`, riseOnHover: true, price: item.price });
      marker.bindPopup(popupHtml(item), {
        maxWidth: 300,
        minWidth: 260,
        className: 'realty-leaflet-popup',
        autoPanPadding: [12, 12]
      });
      marker.on('popupopen', () => {
        setActivePin(item.id);
        approxCircle.setLatLng(item.pos).addTo(map);
      });
      marker.on('popupclose', () => {
        setActivePin(null);
        approxCircle.remove();
      });
      markers.set(item.id, marker);
    });
  };

  // Пока открыт попап, легенду прячем — иначе она перекрывает его низ
  map.on('popupopen', () => mapWrap.classList.add('has-popup'));
  map.on('popupclose', () => mapWrap.classList.remove('has-popup'));

  // Клики внутри попапа: Leaflet не пускает их дальше по странице, поэтому слушаем сам попап
  map.on('popupopen', (e) => {
    const root = e.popup.getElement();
    if (!root || root.dataset.bound) return;
    root.dataset.bound = '1';
    root.addEventListener('click', (event) => {
      const lead = event.target.closest('[data-lead]');
      if (lead) {
        openLead(lead.dataset.lead);
        return;
      }
      const step = event.target.closest('[data-gallery-step]');
      if (!step) return;
      const box = step.closest('.realty-popup');
      const item = state.items.find((it) => it.id === box.dataset.id);
      const index = (Number(box.dataset.index) + Number(step.dataset.galleryStep) + item.photos.length) % item.photos.length;
      box.dataset.index = index;
      box.querySelector('[data-gallery-img]').src = item.photos[index].full;
      box.querySelector('[data-gallery-count]').textContent = `${index + 1} / ${item.photos.length}`;
    });
  });

  const showOnMap = (id) => {
    const marker = markers.get(id);
    if (!marker || !cluster.hasLayer(marker)) return;
    site.scrollToElement(mapWrap);
    setTimeout(() => {
      map.closePopup();
      // Подлетаем к объекту; на 15-м масштабе группы распадаются, и пин можно открыть
      let opened = false;
      const open = () => {
        if (opened) return;
        opened = true;
        cluster.zoomToShowLayer(marker, () => marker.openPopup());
      };
      map.once('moveend', open);
      map.flyTo(marker.getLatLng(), 15, { duration: site.reduceMotion ? 0 : 0.9 });
      setTimeout(open, 1400);
    }, site.reduceMotion ? 0 : 650);
  };

  /* ---------- Фильтры и каталог ---------- */
  const fillPriceSelects = () => {
    minSelect.innerHTML = PRICE_STEPS.map((v) => `<option value="${v}">${v ? `от ${shortMoney(v)} ₫` : 'Любая'}</option>`).join('');
    maxSelect.innerHTML = `${PRICE_STEPS.slice(1).map((v) => `<option value="${v}">до ${shortMoney(v)} ₫</option>`).join('')}<option value="" selected>Любая</option>`;
  };

  const updateTabCounts = () => {
    kindTabs.forEach((tab) => {
      const kind = tab.dataset.kind;
      const count = state.items.filter((item) => kind === 'all' || item.kind === kind).length;
      let badge = tab.querySelector('.tab-count');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'tab-count';
        tab.append(badge);
      }
      badge.textContent = count;
    });
  };

  const visibleItems = () => {
    const list = state.items.filter((item) => (state.kind === 'all' || item.kind === state.kind)
      && (!state.rooms || item.rooms >= state.rooms)
      && item.price >= state.min && item.price <= state.max);
    const sorters = {
      new: (a, b) => b.posted - a.posted,
      cheap: (a, b) => a.price - b.price,
      expensive: (a, b) => b.price - a.price
    };
    return list.sort(sorters[state.sort]);
  };

  const cardHtml = (item) => {
    const photo = item.photos[0];
    return `
      <article class="realty-card group" data-id="${esc(item.id)}">
        <div class="realty-card__media">
          ${photo ? `<img src="${esc(photo.thumb)}" alt="${esc(item.title)}" loading="lazy" referrerpolicy="no-referrer">` : ''}
          <span class="deal-badge">${KIND_RU[item.kind]}</span>
          <span class="code-chip">№ ${item.code}</span>
          ${item.photos.length > 1 ? `<span class="photo-count">${ICON_CAMERA}${item.photos.length}</span>` : ''}
        </div>
        <div class="flex flex-1 flex-col p-5">
          <p class="font-serif text-[1.75rem] font-bold leading-none">${esc(shortMoney(item.price))} ₫<span class="font-sans text-sm font-medium text-ink-soft">/мес</span></p>
          <h3 class="mt-2 line-clamp-2 font-semibold leading-snug">${esc(item.title)}</h3>
          ${item.description ? `<p class="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">${esc(item.description)}</p>` : ''}
          <p class="mt-3 flex items-start gap-1.5 text-sm text-ink-soft">${ICON_PIN}<span>${esc(distanceLabel(item))}</span></p>
          <div class="mt-auto grid grid-cols-2 gap-2 pt-5">
            <button type="button" class="realty-btn realty-btn--ghost" data-show-on-map="${esc(item.id)}">Показать на карте</button>
            <button type="button" class="realty-btn realty-btn--primary" data-lead="${esc(item.id)}">Оставить заявку</button>
          </div>
        </div>
      </article>`;
  };

  // Карточки под картой: первые PAGE_SIZE, остальные подгружаются по кнопке
  const drawGrid = () => {
    const list = state.list;
    const shown = list.slice(0, state.limit);

    countEl.textContent = list.length
      ? `${list.length} ${plural(list.length, 'объект', 'объекта', 'объектов')} в аренду${shown.length < list.length ? ` · показано ${shown.length}` : ''}`
      : 'Ничего не нашлось';
    grid.innerHTML = list.length
      ? shown.map(cardHtml).join('')
      : '<p class="col-span-full rounded-[1.5rem] bg-white/60 p-8 text-center text-ink-soft ring-1 ring-ink/[0.05]">По этим условиям вариантов нет — попробуйте расширить цену или выбрать другой тип жилья. А ещё можно просто написать мне: подберу вариант не из списка.</p>';

    if (moreWrap) {
      moreWrap.classList.toggle('hidden', shown.length >= list.length);
      if (moreBtn) moreBtn.textContent = `Показать ещё ${Math.min(PAGE_SIZE, list.length - shown.length)}`;
    }
  };

  const render = () => {
    const list = visibleItems();
    const ids = new Set(list.map((item) => item.id));

    state.list = list;
    state.limit = PAGE_SIZE;
    drawGrid();

    map.closePopup();
    cluster.clearLayers();
    cluster.addLayers([...markers].filter(([id]) => ids.has(id)).map(([, marker]) => marker));
    // Показываем город, где стоит большинство вариантов; дальние окраины видны при отдалении карты
    const core = list.filter((item) => item.distance <= 4);
    const framed = core.length >= 3 ? core : list;
    if (framed.length) map.fitBounds(L.latLngBounds(framed.map((item) => item.pos)), { padding: [40, 40], maxZoom: 14 });
  };

  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      state.limit += PAGE_SIZE;
      drawGrid();
    });
  }

  kindTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      state.kind = tab.dataset.kind;
      kindTabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-pressed', String(on));
      });
      render();
    });
  });

  const onPriceChange = () => {
    state.min = Number(minSelect.value) || 0;
    state.max = maxSelect.value ? Number(maxSelect.value) : Infinity;
    if (state.max < state.min) {
      state.max = Infinity;
      maxSelect.value = '';
    }
    render();
  };
  minSelect.addEventListener('change', onPriceChange);
  maxSelect.addEventListener('change', onPriceChange);
  roomsSelect.addEventListener('change', () => {
    state.rooms = Number(roomsSelect.value) || 0;
    render();
  });
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    render();
  });

  grid.addEventListener('click', (e) => {
    const showButton = e.target.closest('[data-show-on-map]');
    if (showButton) showOnMap(showButton.dataset.showOnMap);
    const leadButton = e.target.closest('[data-lead]');
    if (leadButton) openLead(leadButton.dataset.lead);
  });

  /* ---------- Заявка по объекту ---------- */
  const dialog = document.getElementById('object-dialog');
  const form = document.getElementById('object-form');
  const summary = document.getElementById('object-summary');
  const statusEl = document.getElementById('object-status');
  let leadItem = null;
  let closeTimer = 0;

  const showStatus = (html, ok) => {
    statusEl.innerHTML = html;
    statusEl.className = `rounded-2xl px-4 py-3 text-sm ${ok ? 'bg-pine-50 text-pine-700' : 'bg-clay/10 text-ink'}`;
  };

  function openLead(id) {
    leadItem = state.items.find((item) => item.id === id);
    if (!leadItem) return;
    clearTimeout(closeTimer);
    const photo = leadItem.photos[0];
    summary.innerHTML = `
      ${photo ? `<img src="${esc(photo.thumb)}" alt="" class="h-16 w-20 shrink-0 rounded-xl object-cover" referrerpolicy="no-referrer">` : ''}
      <div class="min-w-0">
        <p class="font-semibold">${esc(priceLabel(leadItem))} <span class="font-normal text-ink-soft">· № ${leadItem.code}</span></p>
        <p class="line-clamp-2 text-sm leading-snug">${esc(leadItem.title)}</p>
        <p class="mt-0.5 line-clamp-1 text-xs text-ink-soft">${esc(distanceLabel(leadItem))}</p>
      </div>`;
    statusEl.className = 'hidden';
    map.closePopup();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    form.elements.name.focus();
  }

  const closeDialog = () => (typeof dialog.close === 'function' ? dialog.close() : dialog.removeAttribute('open'));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close-dialog]')) closeDialog();
  });

  form.elements.channel.addEventListener('change', (e) => {
    form.elements.contact.placeholder = site.contactPlaceholder(e.target.value);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!leadItem || form.dataset.sending) return; // защита от двойной отправки
    const data = new FormData(form);
    const comment = String(data.get('message') || '').trim();
    // Адреса в заявке нет: по номеру объекта вы находите его в личном списке
    const lead = {
      name: String(data.get('name') || '').trim(),
      channel: data.get('channel'),
      contact: String(data.get('contact') || '').trim(),
      services: ['housing'],
      website: data.get('website'),
      message: [
        `Объект № ${leadItem.code}: ${leadItem.title} — ${priceLabel(leadItem)} (цена на сайте)`,
        comment && `Комментарий: ${comment}`
      ].filter(Boolean).join('\n')
    };

    // required пропускает строку из одних пробелов — проверяем после обрезки
    if (!lead.name || !lead.contact) {
      showStatus('Укажите имя и контакт — иначе я не смогу вам ответить.', false);
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    form.dataset.sending = '1';
    button.disabled = true;
    try {
      if (await site.sendLead(lead)) {
        form.reset();
        form.elements.contact.placeholder = site.contactPlaceholder('telegram');
        showStatus('Спасибо! Заявка по объекту отправлена — скоро свяжусь с вами.', true);
        closeTimer = setTimeout(closeDialog, 2500);
      } else {
        site.openTelegram(site.leadTelegramUrl(lead));
        showStatus('Открываю Telegram с готовой заявкой — осталось нажать «Отправить».', true);
      }
    } catch (err) {
      console.error('Не удалось отправить заявку по объекту', err);
      showStatus(`Не получилось отправить заявку. ${site.telegramFallbackLink(lead)} — текст уже готов.`, false);
    } finally {
      delete form.dataset.sending;
      button.disabled = false;
    }
  });

  /* ---------- Загрузка объявлений ---------- */
  fetch('dalat_realty.json', { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      state.items = (Array.isArray(data.items) ? data.items : []).map(normalize).filter(Boolean);
      createMarkers();
      if (data.generated_at) {
        sourceEl.append(` Данные на ${new Date(data.generated_at).toLocaleDateString('ru-RU')}.`);
      }
      fillPriceSelects();
      updateTabCounts();
      render();
    })
    .catch((err) => {
      console.error('Не удалось загрузить dalat_realty.json', err);
      countEl.textContent = 'Не удалось загрузить объявления — обновите страницу.';
    });
})();
