#!/usr/bin/env python3
"""
Сбор открытых объявлений об АРЕНДЕ жилья в Далате для сайта «Свой в Далате».

1. Берёт свежие объявления об аренде квартир, домов и комнат в Далате
   из открытого API Chợ Tốt / Nhà Tốt (gateway.chotot.com/v1/public/ad-listing).
2. Заголовки на русском берёт из private/titles_ru.json ({"<list_id>": "Заголовок"}),
   а для новых объявлений пробует автоперевод (бесплатный MyMemory) — его стоит поправить руками.
3. Описание собирает из параметров объявления (тип, площадь, спальни, мебель).
4. Публикует на сайт только то, что можно показывать посетителям:
   - цену с наценкой (MARKUP), фото, тип, площадь, описание;
   - номер объекта (№ 7) — по нему вы находите объект в личном списке;
   - ПРИМЕРНУЮ точку: координаты сдвинуты на 220–420 м, чтобы по карте нельзя было найти дом.
   Адреса, точные координаты, продавцов и ссылки на оригинал в ../dalat_realty.json НЕТ.
5. Всё закрытое кладёт в папку ../private/ — она не публикуется (см. .gitignore):
   - адреса-объектов.html — личный список: номер, цена хозяина и цена для клиента,
     адрес, точка на Google Maps, продавец, ссылка на объявление;
   - realty_private.json — то же самое для программ;
   - codes.json — постоянные номера объектов, salt.txt — секрет для сдвига точек;
   - raw_ads.json — последние скачанные объявления (для запуска с --reuse без интернета).

Запуск:  python tools/collect_dalat_realty.py           — скачать свежие объявления
         python tools/collect_dalat_realty.py --reuse   — пересобрать из raw_ads.json
Нужен только Python 3.9+ без дополнительных библиотек.
"""
import html
import json
import math
import random
import re
import secrets
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent
OUT_FILE = SITE / 'dalat_realty.json'
PRIVATE = SITE / 'private'
TITLE_OVERRIDES = PRIVATE / 'titles_ru.json'
CODES_FILE = PRIVATE / 'codes.json'
SALT_FILE = PRIVATE / 'salt.txt'
RAW_FILE = PRIVATE / 'raw_ads.json'
PRIVATE_JSON = PRIVATE / 'realty_private.json'
PRIVATE_HTML = PRIVATE / 'адреса-объектов.html'

USER_AGENT = 'SvoyDalatSite/1.0 (+https://svoydalat.github.io)'
LISTING_API = 'https://gateway.chotot.com/v1/public/ad-listing'
TRANSLATE_API = 'https://api.mymemory.translated.net/get'
GEOCODER_API = 'https://nominatim.openstreetmap.org/search'

REGION_LAM_DONG = 9057
AREA_DA_LAT = 905701
DALAT_CENTER = (11.9404, 108.4583)        # центр карты на сайте
DALAT_MARKET = (11.94344, 108.43718)      # «центр города» для расстояний — рынок Далата
DALAT_BOUNDS = (11.80, 12.10, 108.30, 108.65)  # широта от/до, долгота от/до

MARKUP = 0.20                 # наценка к цене хозяина: 0.20 = +20 %
RENT_MIN, RENT_MAX = 1_500_000, 150_000_000   # отсекаем посуточные цены и ошибки в объявлениях
JITTER_M = (220, 420)         # насколько сдвигаем точку на публичной карте, метров

# (категория Chợ Tốt, наш тип, сколько взять) — только аренда (st=u)
PLAN = [
    (1010, 'apartment', 14),
    (1020, 'house', 14),
    (1050, 'room', 8),
]

KIND_RU = {'apartment': 'Квартира', 'house': 'Дом', 'room': 'Комната'}

# Значения параметров объявления → русский текст. Неизвестные значения пропускаем,
# чтобы в описании не оставалось вьетнамских слов.
FEATURE_RU = {
    'Nhà mặt phố, mặt tiền': 'дом с фасадом на улицу',
    'Nhà ngõ, hẻm': 'дом в переулке',
    'Nhà biệt thự': 'вилла',
    'Nhà phố liền kề': 'таунхаус',
    'Chung cư': 'квартира в жилом комплексе',
    'Căn hộ dịch vụ, mini': 'сервисные апартаменты',
    'Duplex': 'двухуровневая квартира',
    'Penthouse': 'пентхаус',
    'Tập thể, cư xá': 'квартира в старом доме',
    'Officetel': 'офис-апартаменты',
    'Nội thất cao cấp': 'премиальная мебель',
    'Nội thất đầy đủ': 'полностью меблировано',
    'Hoàn thiện cơ bản': 'базовая отделка',
    'Bàn giao thô': 'без отделки',
    'Nhà trống': 'без мебели',
}
FEATURE_IDS = ('house_type', 'apartment_type', 'furnishing_rent')
FURNISHED = {'Nội thất cao cấp', 'Nội thất đầy đủ'}

PHONE_RE = re.compile(r'(?:\+?84|0)[\s.\-]?\d(?:[\s.\-]?\d){7,9}')
EMOJI_RE = re.compile('[\U0001F000-\U0001FAFF☀-➿️‍]')


def log(message):
    print(message, flush=True)


def get_json(url, params=None, timeout=25):
    if params:
        url = f'{url}?{urllib.parse.urlencode(params)}'
    request = urllib.request.Request(url, headers={
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Accept-Language': 'ru,vi;q=0.8,en;q=0.5',
    })
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    return None


def read_json(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def plural(n, one, few, many):
    n = abs(int(n))
    if n % 10 == 1 and n % 100 != 11:
        return one
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return few
    return many


def format_price(vnd):
    """7200000 → «7,2 млн ₫/мес»."""
    value, unit = (vnd / 1_000_000, 'млн') if vnd >= 1_000_000 else (vnd / 1_000, 'тыс.')
    number = f'{value:.2f}'.rstrip('0').rstrip('.').replace('.', ',')
    return f'{number} {unit} ₫/мес'


def client_price(vnd):
    """Цена хозяина + наценка, округлённая до красивой суммы: до 100 тыс., от 20 млн — до 500 тыс."""
    step = 500_000 if vnd >= 20_000_000 else 100_000
    return int(math.ceil(vnd * (1 + MARKUP) / step) * step)


def format_area(value):
    """94.0198 → «94», 45.5 → «45,5»."""
    return f'{round(float(value), 1):g}'.replace('.', ',')


def in_dalat(lat, lng):
    lat_min, lat_max, lng_min, lng_max = DALAT_BOUNDS
    return lat is not None and lng is not None and lat_min <= lat <= lat_max and lng_min <= lng <= lng_max


def nfc(text):
    return unicodedata.normalize('NFC', text or '').strip()


def distance_km(a, b):
    lat1, lng1, lat2, lng2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


# ---------- Заголовок ----------

def clean_title_vi(title):
    """Убираем телефоны, эмодзи, район и крик капсом."""
    text = nfc(title)
    text = PHONE_RE.sub(' ', text)
    text = EMOJI_RE.sub(' ', text)
    text = re.sub(r'\b(?:lh|liên hệ)\b[:\s]*', ' ', text, flags=re.I)
    text = re.sub(r'\b(?:phường|p\.)\s*\d+\b', ' ', text, flags=re.I)
    text = re.sub(r'\b(?:tp\.?\s*)?đà lạt\b', ' ', text, flags=re.I)
    text = re.sub(r'\b(\d+)\s*pn\b', r'\1 phòng ngủ', text, flags=re.I)
    text = re.sub(r'\b(\d+)\s*wc\b', r'\1 nhà vệ sinh', text, flags=re.I)
    text = re.sub(r'\bfull nội thất\b', 'đầy đủ nội thất', text, flags=re.I)
    text = re.sub(r'[|•*–—_]+', ' - ', text)
    text = re.sub(r'\s*-\s*(-\s*)+', ' - ', text)
    text = re.sub(r'\s+', ' ', text).strip(' -–,.')
    if text.isupper() or sum(c.isupper() for c in text) > len(text) * 0.5:
        text = text.lower()
    return text[:1].upper() + text[1:]


def translate_ru(text):
    if not text:
        return ''
    try:
        data = get_json(TRANSLATE_API, {'q': text, 'langpair': 'vi|ru'})
        result = (data or {}).get('responseData', {}).get('translatedText', '')
        if data.get('responseStatus') == 200 and result and 'MYMEMORY' not in result.upper():
            result = re.sub(r'\s+', ' ', result).strip(' -,.')
            result = re.sub(r'\bм2\b', 'м²', result)
            return result[:1].upper() + result[1:]
    except Exception as error:
        log(f'  перевод не удался: {error}')
    return ''


def fallback_title(kind, area, rooms):
    kind_gen = {'apartment': 'квартиры', 'house': 'дома', 'room': 'комнаты'}[kind]
    details = [f'{format_area(area)} м²' if area else '', f'{rooms} {plural(rooms, "спальня", "спальни", "спален")}' if rooms else '']
    return f'Аренда {kind_gen}' + ''.join(f', {d}' for d in details if d)


# ---------- Описание и адрес ----------

def feature_values(ad):
    values = {}
    for group in (ad.get('feature_params') or {}).values():
        for item in (group or {}).get('items', []):
            if item.get('id') in FEATURE_IDS and item.get('value'):
                values[item['id']] = nfc(item['value'])
    return values


def describe_ru(ad, kind):
    area = ad.get('size')
    rooms = ad.get('rooms')
    toilets = ad.get('toilets')
    floors = ad.get('floors')
    parts = [KIND_RU[kind]]
    if area:
        parts.append(f'{format_area(area)} м²')
    if rooms:
        parts.append(f'{rooms} {plural(rooms, "спальня", "спальни", "спален")}')
    if toilets:
        parts.append(f'{toilets} {plural(toilets, "санузел", "санузла", "санузлов")}')
    if floors and kind == 'house':
        parts.append(f'{floors} {plural(floors, "этаж", "этажа", "этажей")}')
    for value in feature_values(ad).values():
        if value in FEATURE_RU:
            parts.append(FEATURE_RU[value])
    return ' · '.join(dict.fromkeys(parts))


def address_parts(ad):
    street = nfc(ad.get('street_name'))
    ward = nfc(ad.get('ward_name') or ad.get('ward_name_v3'))
    vi = ', '.join(p for p in (street, ward, 'Đà Lạt', 'Lâm Đồng') if p)
    street_ru = re.sub(r'^Đường\s+', 'ул. ', street)
    ward_ru = re.sub(r'^Phường\s+', 'район ', ward)
    ward_ru = re.sub(r'^Xã\s+', 'община ', ward_ru)
    ru = ', '.join(p for p in (street_ru, ward_ru, 'Далат') if p)
    return vi, ru


# ---------- Координаты ----------

_last_geocode = 0.0


def geocode(query):
    """OpenStreetMap Nominatim: не чаще 1 запроса в секунду, с понятным User-Agent."""
    global _last_geocode
    wait = 1.1 - (time.time() - _last_geocode)
    if wait > 0:
        time.sleep(wait)
    _last_geocode = time.time()
    try:
        found = get_json(GEOCODER_API, {'q': query, 'format': 'json', 'limit': 1, 'countrycodes': 'vn'})
        if found:
            lat, lng = float(found[0]['lat']), float(found[0]['lon'])
            if in_dalat(lat, lng):
                return lat, lng
    except Exception as error:
        log(f'  геокодер не ответил: {error}')
    return None


def locate(ad):
    lat, lng = ad.get('latitude'), ad.get('longitude')
    if in_dalat(lat, lng):
        return round(lat, 6), round(lng, 6), 'listing'
    # После реформы 2025 года старые названия районов («Phường 10») в OSM не находятся,
    # поэтому ищем сначала по улице, затем по району — оба в коротком виде «…, Đà Lạt»
    street = re.sub(r'^Đường\s+', '', nfc(ad.get('street_name')))
    ward = nfc(ad.get('ward_name'))
    for query, precision in ((street, 'address'), (ward, 'ward')):
        point = geocode(f'{query}, Đà Lạt') if query else None
        if point:
            return round(point[0], 6), round(point[1], 6), precision
    return DALAT_CENTER[0], DALAT_CENTER[1], 'city'


def public_point(lat, lng, list_id, salt):
    """Сдвигаем точку на 220–420 м в случайную сторону. Сдвиг зависит от секретной соли,
    поэтому по публичной точке и коду скрипта настоящий адрес не восстановить."""
    rng = random.Random(f'{salt}:{list_id}')
    angle = rng.uniform(0, 2 * math.pi)
    meters = rng.uniform(*JITTER_M)
    dlat = meters * math.cos(angle) / 111_320
    dlng = meters * math.sin(angle) / (111_320 * math.cos(math.radians(lat)))
    return round(lat + dlat, 5), round(lng + dlng, 5)


# ---------- Сбор ----------

def photos_of(ad):
    photos = []
    for item in ad.get('image_thumbnails') or []:
        if item.get('thumbnail') or item.get('image'):
            photos.append({'thumb': item.get('thumbnail') or item.get('image'), 'full': item.get('image') or item.get('thumbnail')})
    if not photos and ad.get('image'):
        photos.append({'thumb': ad['image'], 'full': ad['image']})
    return photos[:6]


def fetch_group(category, want):
    """Листаем выдачу страницами по 50, пока не наберём кандидатов с запасом."""
    ads = []
    for page in range(4):
        data = get_json(LISTING_API, {
            'cg': category,
            'region_v2': REGION_LAM_DONG,
            'area_v2': AREA_DA_LAT,
            'st': 'u',
            'limit': 50,
            'o': page * 50,
        })
        batch = (data or {}).get('ads', [])
        ads.extend(batch)
        if len(batch) < 50 or len(ads) >= want * 4:
            break
        time.sleep(1)
    return ads


def suitable(ad):
    price = ad.get('price') or 0
    return bool(ad.get('subject')) and bool(photos_of(ad)) and RENT_MIN <= price <= RENT_MAX


def code_for(list_id, codes):
    """Постоянный номер объекта: у старых объявлений номер не меняется, новым — следующий."""
    key = str(list_id)
    if key not in codes:
        codes[key] = max(codes.values(), default=0) + 1
    return codes[key]


def build(ad, kind, overrides, codes, salt):
    list_id = ad['list_id']
    title_vi = nfc(ad.get('subject'))
    area = round(float(ad['size']), 1) if ad.get('size') else None
    rooms = ad.get('rooms')
    manual = overrides.get(str(list_id))
    title_ru = manual or translate_ru(clean_title_vi(title_vi)) or fallback_title(kind, area, rooms)
    lat, lng, geo = locate(ad)
    pub_lat, pub_lng = public_point(lat, lng, list_id, salt)
    address_vi, address_ru = address_parts(ad)
    posted = ad.get('list_time')
    posted_at = datetime.fromtimestamp(posted / 1000, tz=timezone.utc).isoformat() if posted else None
    owner_price = int(ad['price'])
    price = client_price(owner_price)
    code = code_for(list_id, codes)
    furnishing = feature_values(ad).get('furnishing_rent')

    public = {
        'id': f'dl-{code}',
        'code': code,
        'kind': kind,
        'title_ru': title_ru,
        'description_ru': describe_ru(ad, kind),
        'price_vnd': price,
        'area_m2': area,
        'rooms': rooms,
        'toilets': ad.get('toilets'),
        'furnished': furnishing in FURNISHED if furnishing else None,
        'lat': pub_lat,
        'lng': pub_lng,
        'distance_km': max(0.5, round(distance_km((pub_lat, pub_lng), DALAT_MARKET) * 2) / 2),
        'photos': photos_of(ad),
        'posted_at': posted_at,
    }
    private = {
        'code': code,
        'kind': kind,
        'title_ru': title_ru,
        'title_vi': title_vi,
        'title_checked': bool(manual),
        'client_price_vnd': price,
        'owner_price_vnd': owner_price,
        'address_ru': address_ru,
        'address_vi': address_vi,
        'lat': lat,
        'lng': lng,
        'geo': geo,
        'seller': nfc(ad.get('account_name') or ad.get('full_name')) or 'не указан',
        'seller_type': 'агентство' if ad.get('company_ad') else 'частное лицо',
        'source_url': f'https://www.chotot.com/{list_id}.htm',
        'list_id': list_id,
        'posted_at': posted_at,
        'photo': public['photos'][0]['thumb'] if public['photos'] else '',
    }
    return public, private


# ---------- Личный список для владельца ----------

def private_page(rows, generated):
    esc = lambda value: html.escape(str(value or ''))
    money = lambda vnd: format_price(vnd).replace('/мес', '')
    cards = []
    for row in sorted(rows, key=lambda r: r['code']):
        maps = f'https://www.google.com/maps?q={row["lat"]},{row["lng"]}'
        cards.append(f'''
    <article>
      <img src="{esc(row["photo"])}" alt="" loading="lazy" referrerpolicy="no-referrer">
      <div>
        <p class="code">№ {row["code"]} · {esc(KIND_RU[row["kind"]])}</p>
        <h2>{esc(row["title_ru"])}</h2>
        <p class="vi">{esc(row["title_vi"])}</p>
        <p class="price"><b>{esc(money(row["client_price_vnd"]))}</b> на сайте · хозяину {esc(money(row["owner_price_vnd"]))}</p>
        <p class="addr">📍 {esc(row["address_ru"])}<br><span>{esc(row["address_vi"])}</span></p>
        <p>Продавец: <b>{esc(row["seller"])}</b> · {esc(row["seller_type"])}</p>
        <p class="links"><a href="{esc(maps)}" target="_blank" rel="noopener">Точка на карте</a>
          <a href="{esc(row["source_url"])}" target="_blank" rel="noopener">Объявление на Chợ Tốt</a></p>
      </div>
    </article>''')
    return f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Мои объекты — адреса (только для меня)</title>
<style>
  body {{ margin: 0; padding: 24px 16px 48px; background: #F4EFE5; color: #16251F; font: 15px/1.5 system-ui, sans-serif; }}
  header, main {{ max-width: 980px; margin: 0 auto; }}
  h1 {{ margin: 0; font: 600 30px/1.1 Georgia, serif; }}
  header p {{ margin: 8px 0 24px; color: #4F5D55; }}
  main {{ display: grid; gap: 14px; }}
  article {{ display: grid; grid-template-columns: 160px 1fr; gap: 16px; padding: 14px; border-radius: 18px; background: #FFFDF8; box-shadow: inset 0 0 0 1px rgb(22 37 31 / .08); }}
  article img {{ width: 160px; height: 120px; object-fit: cover; border-radius: 12px; background: #EAE2D2; }}
  article p {{ margin: 4px 0; }}
  h2 {{ margin: 2px 0; font-size: 17px; }}
  .code {{ font-weight: 700; color: #3B6550; }}
  .vi, .addr span {{ color: #4F5D55; font-size: 13px; }}
  .price b {{ font-size: 17px; }}
  .links a {{ display: inline-block; margin: 6px 10px 0 0; padding: 6px 12px; border-radius: 999px; background: #132A22; color: #F4EFE5; text-decoration: none; font-weight: 600; font-size: 13px; }}
  @media (max-width: 560px) {{ article {{ grid-template-columns: 1fr; }} article img {{ width: 100%; height: 180px; }} }}
</style>
</head>
<body>
<header>
  <h1>Мои объекты — адреса</h1>
  <p>Только для вас: этого файла нет на сайте. Номер объекта совпадает с номером в заявке из бота.
  Наценка {round(MARKUP * 100)} %, данные на {esc(generated[:10])}, объектов: {len(rows)}.</p>
</header>
<main>{"".join(cards)}
</main>
</body>
</html>
'''


def main():
    reuse = '--reuse' in sys.argv
    PRIVATE.mkdir(exist_ok=True)
    overrides = read_json(TITLE_OVERRIDES, {})
    codes = read_json(CODES_FILE, {})
    if not SALT_FILE.exists():
        SALT_FILE.write_text(secrets.token_hex(16), encoding='utf-8')
    salt = SALT_FILE.read_text(encoding='utf-8').strip()

    raw = read_json(RAW_FILE, {}) if reuse else {}
    public_items, private_rows, seen_ids, seen_titles = [], [], set(), set()
    for category, kind, want in PLAN:
        log(f'— {KIND_RU[kind]}, аренда: нужно {want}')
        ads = raw.get(kind, []) if reuse else fetch_group(category, want)
        raw[kind] = ads
        taken = 0
        for ad in ads:
            if taken >= want:
                break
            title_key = re.sub(r'\W+', '', nfc(ad.get('subject')).lower())
            if ad.get('list_id') in seen_ids or title_key in seen_titles or not suitable(ad):
                continue
            seen_ids.add(ad['list_id'])
            seen_titles.add(title_key)
            public, private = build(ad, kind, overrides, codes, salt)
            public_items.append(public)
            private_rows.append(private)
            taken += 1
            mark = '' if private['title_checked'] else '  ← проверить заголовок'
            log(f'  № {public["code"]:>3} {format_price(public["price_vnd"]):>16} | {public["title_ru"][:55]} | {private["geo"]}{mark}')
        if not reuse:
            time.sleep(1)

    generated = datetime.now(timezone.utc).isoformat(timespec='seconds')
    write_json(OUT_FILE, {
        'generated_at': generated,
        'note': 'Аренда жилья в Далате. Цены — для клиента, точки на карте примерные, адреса не публикуются.',
        'city': {'name': 'Далат', 'lat': DALAT_CENTER[0], 'lng': DALAT_CENTER[1]},
        'count': len(public_items),
        'items': public_items,
    })
    write_json(CODES_FILE, codes)
    write_json(RAW_FILE, raw)
    write_json(PRIVATE_JSON, {'generated_at': generated, 'markup': MARKUP, 'items': private_rows})
    PRIVATE_HTML.write_text(private_page(private_rows, generated), encoding='utf-8')
    log(f'Готово: {len(public_items)} объектов → {OUT_FILE.name}; личный список → {PRIVATE_HTML}')
    return 0 if len(public_items) >= 20 else 1


if __name__ == '__main__':
    sys.exit(main())
