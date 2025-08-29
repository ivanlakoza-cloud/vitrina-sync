import Link from 'next/link';
import Script from 'next/script';
import { getCatalog } from '../lib/data';

type Search = { city?: string };

// === 1) Получаем конфиг UI из Directus (ui_home_config) ===
async function getUIConfig(): Promise<{
  card_fields_order: string[];
  show_city_filter: boolean;
}> {
  const base =
    process.env.NEXT_PUBLIC_DIRECTUS_URL ||
    process.env.DIRECTUS_URL ||
    'https://cms.vitran.ru';

  try {
    const url = `${base.replace(/\/+$/, '')}/items/ui_home_config?limit=1&fields=card_fields_order,show_city_filter`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('ui_home_config fetch failed');
    const data = await r.json();
    const row = Array.isArray(data?.data) ? data.data[0] : data?.data;
    const order = Array.isArray(row?.card_fields_order)
      ? row.card_fields_order
      : [];

    return {
      card_fields_order:
        order.length > 0
          ? order
          : ['photo', 'city', 'address', 'type', 'floor', 'prices'],
      show_city_filter:
        typeof row?.show_city_filter === 'boolean' ? row.show_city_filter : true,
    };
  } catch {
    // Фолбэк, если Directus недоступен / нет прав и т.п.
    return {
      card_fields_order: ['photo', 'city', 'address', 'type', 'floor', 'prices'],
      show_city_filter: true,
    };
  }
}

// === 2) Достаём "город" из карточки максимально гибко ===
function extractCity(it: any): string | null {
  if (!it || typeof it !== 'object') return null;

  const direct =
    it.city ??
    it.city_name ??
    it.city_title ??
    it.cityTitle ??
    it.city_ru ??
    it.city_name_ru ??
    it.city_short ??
    it.cityTitleShort ??
    it.city_display ??
    it.display_city ??
    it.geo_city ??
    it.geoCity ??
    it.settlement ??
    null;

  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const c = it.city;
  if (c && typeof c === 'object') {
    const nested =
      c.name ?? c.title ?? c.ru ?? c.label ?? c.caption ?? c.title_short ?? null;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }

  const loc = it.location || it.geo || it.address_obj || null;
  if (loc && typeof loc === 'object') {
    const nested =
      loc.city ??
      loc.city_name ??
      loc.city_title ??
      loc.name ??
      loc.title ??
      null;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }

  if (typeof direct === 'number') return null;
  return null;
}

// === 3) Компоновка блока «prices» ===
function buildPricesBlock(p: any): string | null {
  // Если уже есть собранный текст — используем его
  if (typeof p?.price_text === 'string' && p.price_text.trim()) {
    return p.price_text.trim();
  }

  // Иначе пытаемся собрать из известных паттернов
  // Поддержим разные названия: price_from_20, from20, p20 и т.п.
  const candidates: { label: string; keys: string[] }[] = [
    { label: 'от 20', keys: ['price_from_20', 'from20', 'p20', 'price20'] },
    { label: 'от 50', keys: ['price_from_50', 'from50', 'p50', 'price50'] },
    { label: 'от 100', keys: ['price_from_100', 'from100', 'p100', 'price100'] },
    { label: 'от 400', keys: ['price_from_400', 'from400', 'p400', 'price400'] },
    { label: 'от 700', keys: ['price_from_700', 'from700', 'p700', 'price700'] },
    { label: 'от 1500', keys: ['price_from_1500', 'from1500', 'p1500', 'price1500'] },
  ];

  const lines: string[] = [];
  for (const c of candidates) {
    let val: any = null;
    for (const k of c.keys) {
      if (p?.[k] !== undefined && p?.[k] !== null && p?.[k] !== '') {
        val = p[k];
        break;
      }
    }
    if (val !== null && val !== undefined && String(val).trim()) {
      // просто выводим как есть; валюту/единицы вы уже кладёте в значение
      lines.push(`${c.label}: ${val}`);
    }
  }

  return lines.length ? lines.join('\n') : null;
}

// === 4) Рендер поля карточки по ключу из card_fields_order ===
function renderFieldByKey(key: string, p: any) {
  switch (key) {
    case 'city': {
      const v = extractCity(p);
      return v ? <div style={{ fontWeight: 600, marginBottom: 4 }}>{v}</div> : null;
    }
    case 'address': {
      const v = p?.address;
      return v ? (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{v}</div>
      ) : null;
    }
    case 'type': {
      const v = p?.type;
      return v ? (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
          Тип: {String(v)}
        </div>
      ) : null;
    }
    case 'floor': {
      const v = p?.floor;
      return v ? (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
          Этаж: {String(v)}
        </div>
      ) : null;
    }
    case 'prices': {
      const text = buildPricesBlock(p);
      return text ? (
        <div style={{ fontSize: 12, whiteSpace: 'pre-line', marginTop: 4 }}>{text}</div>
      ) : null;
    }
    // Если появятся дополнительные ключи — добавляйте сюда кейсы
    default:
      return null;
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Search;
}) {
  const currentCity = searchParams?.city ?? '';

  // 1) Подтягиваем конфиг UI
  const ui = await getUIConfig();
  const order: string[] = Array.isArray(ui.card_fields_order)
    ? ui.card_fields_order
    : ['photo', 'city', 'address', 'type', 'floor', 'prices'];

  // 2) Каталог (поддерживаем обе сигнатуры: массив или {items, cities})
  let result: any;
  try {
    result = await (getCatalog as any)();
  } catch {
    result = [];
  }
  const allItems: any[] = Array.isArray(result) ? result : result?.items ?? [];

  // 3) Города
  const apiCities: string[] = Array.isArray(result) ? [] : result?.cities ?? [];
  const citySet = new Set<string>();
  for (const c of apiCities) if (typeof c === 'string' && c.trim()) citySet.add(c.trim());
  for (const it of allItems) {
    const name = extractCity(it);
    if (name) citySet.add(name);
  }
  const cityOptions = Array.from(citySet).sort((a, b) => a.localeCompare(b, 'ru'));

  // 4) Фильтр
  const norm = (v: any) => String(v ?? '').trim().toLowerCase();
  const items =
    currentCity && currentCity.trim()
      ? allItems.filter((p) => norm(extractCity(p)) === norm(currentCity))
      : allItems;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Каталог</h1>

      {ui.show_city_filter && (
        <div className="mb-6 flex items-center gap-2">
          <label htmlFor="city-select">Город:</label>
          <select id="city-select" defaultValue={currentCity} className="border rounded px-2 py-1">
            <option value="">Все города</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* авто-применение фильтра */}
      <Script id="city-autosubmit">{`
        (function(){
          var sel = document.getElementById('city-select');
          if(!sel) return;
          sel.addEventListener('change', function(){
            var url = new URL(window.location.href);
            var v = sel.value;
            if (v) url.searchParams.set('city', v);
            else url.searchParams.delete('city');
            window.location.href = url.toString();
          });
        })();
      `}</Script>

      <div style={{ height: 16 }} />

      {/* 6-колоночная сетка */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {items.map((p: any) => {
          const href = `/p/${encodeURIComponent(p.external_id ?? p.id ?? '')}`;
          const cover =
            p.coverUrl ||
            p.photo ||
            p.preview_url ||
            p.cover ||
            p.image_url ||
            null;

          // Фото выводим только если оно перечислено в order
          const showPhoto = order.includes('photo');

          return (
            <div
              key={p.id ?? p.external_id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              {showPhoto && (
                <Link href={href} style={{ display: 'block' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '4 / 3',
                      background: '#f3f4f6',
                    }}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={p.title ?? p.address ?? p.external_id}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                </Link>
              )}

              <div style={{ padding: 12 }}>
                {/* Заголовок/адрес как кликабельная ссылка */}
                <Link
                  href={href}
                  style={{
                    display: 'block',
                    color: '#4f46e5',
                    textDecoration: 'underline',
                    marginBottom: 6,
                    fontWeight: 600,
                  }}
                >
                  {p.title ?? p.address ?? p.external_id}
                </Link>

                {/* Динамические поля в нужном порядке, кроме 'photo' */}
                {order
                  .filter((k) => k !== 'photo')
                  .map((k) => (
                    <div key={k}>{renderFieldByKey(k, p)}</div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
