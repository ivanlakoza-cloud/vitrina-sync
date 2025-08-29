import Link from 'next/link';
import Script from 'next/script';
import { getCatalog } from '../lib/data';

type Search = { city?: string };

const DEFAULT_ORDER = ['photo', 'city', 'address', 'type', 'floor', 'prices'];

async function getUIConfig(): Promise<{
  card_fields_order: string[];
  show_city_filter: boolean;
}> {
  const base =
    process.env.NEXT_PUBLIC_DIRECTUS_URL ||
    process.env.DIRECTUS_URL ||
    'https://cms.vitran.ru';

  const url = `${base.replace(/\/+$/, '')}/items/ui_home_config?limit=1&fields=card_fields_order,show_city_filter`;

  // КОРОТКИЙ ТАЙМАУТ + кэш на 5 минут — чтобы не тормозить, если CMS "спит"
  try {
    const resp: any = await Promise.race([
      fetch(url, { next: { revalidate: 300 } }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 400)),
    ]);
    if (!resp?.ok) throw new Error('bad response');
    const data = await resp.json();
    const row = Array.isArray(data?.data) ? data.data[0] : data?.data;
    const order = Array.isArray(row?.card_fields_order)
      ? row.card_fields_order
      : [];

    return {
      card_fields_order: order.length ? order : DEFAULT_ORDER,
      show_city_filter:
        typeof row?.show_city_filter === 'boolean' ? row.show_city_filter : true,
    };
  } catch {
    return { card_fields_order: DEFAULT_ORDER, show_city_filter: true };
  }
}

// Вытаскиваем имя города из карточки (много разных вариантов ключей)
function extractCity(it: any): string | null {
  if (!it || typeof it !== 'object') return null;

  const tryKeys = [
    'city',
    'city_name',
    'city_title',
    'cityTitle',
    'cityName',
    'city_ru',
    'display_city',
    'geo_city',
    'settlement',
  ];

  for (const k of tryKeys) {
    const v = it?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }

  // вложенные варианты
  const nested = it.city || it.location || it.geo || it.address_obj;
  if (nested && typeof nested === 'object') {
    const nk =
      nested.name ||
      nested.title ||
      nested.city ||
      nested.city_name ||
      nested.city_title ||
      null;
    if (typeof nk === 'string' && nk.trim()) return nk.trim();
  }

  return null;
}

// Сборка блока цен
function buildPricesBlock(p: any): string | null {
  if (typeof p?.price_text === 'string' && p.price_text.trim()) {
    return p.price_text.trim();
  }
  const blocks: { label: string; keys: string[] }[] = [
    { label: 'от 20', keys: ['price_from_20', 'from20', 'p20', 'price20'] },
    { label: 'от 50', keys: ['price_from_50', 'from50', 'p50', 'price50'] },
    { label: 'от 100', keys: ['price_from_100', 'from100', 'p100', 'price100'] },
    { label: 'от 400', keys: ['price_from_400', 'from400', 'p400', 'price400'] },
    { label: 'от 700', keys: ['price_from_700', 'from700', 'p700', 'price700'] },
    { label: 'от 1500', keys: ['price_from_1500', 'from1500', 'p1500', 'price1500'] },
  ];
  const lines: string[] = [];
  for (const b of blocks) {
    let val: any = null;
    for (const k of b.keys) {
      if (p?.[k] !== undefined && p?.[k] !== null && String(p[k]).trim()) {
        val = p[k];
        break;
      }
    }
    if (val !== null) lines.push(`${b.label}: ${val}`);
  }
  return lines.length ? lines.join('\n') : null;
}

// Рендер поля карточки по ключу order
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
      const t = buildPricesBlock(p);
      return t ? <div style={{ fontSize: 12, whiteSpace: 'pre-line' }}>{t}</div> : null;
    }
    default:
      return null;
  }
}

export default async function Page({ searchParams }: { searchParams: Search }) {
  const currentCity = searchParams?.city ?? '';

  // Тянем конфиг и каталог ПАРАЛЛЕЛЬНО
  const [ui, result] = await Promise.all([
    getUIConfig(),
    // getCatalog как раньше с параметром city; as any — чтобы TS не мешал
    (getCatalog as any)({ city: currentCity }),
  ]);

  const order: string[] = Array.isArray(ui.card_fields_order)
    ? ui.card_fields_order
    : DEFAULT_ORDER;

  // Каталог может прийти как массив или как { items, cities }
  const rawItems: any[] = Array.isArray(result) ? result : result?.items ?? [];
  const apiCities: string[] = Array.isArray(result) ? [] : result?.cities ?? [];

  // Собираем общий список городов: сначала из API, затем дополняем по карточкам
  const citySet = new Set<string>();
  for (const c of apiCities) if (typeof c === 'string' && c.trim()) citySet.add(c.trim());
  for (const it of rawItems) {
    const c = extractCity(it);
    if (c) citySet.add(c);
  }
  const cities = Array.from(citySet).sort((a, b) => a.localeCompare(b, 'ru'));

  // Фильтрация по выбранному городу (на случай, если бэкенд не фильтрует)
  const norm = (v: any) => String(v ?? '').trim().toLowerCase();
  const items =
    currentCity && currentCity.trim()
      ? rawItems.filter((p) => norm(extractCity(p)) === norm(currentCity))
      : rawItems;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Каталог</h1>

      {ui.show_city_filter && (
        <div className="mb-6 flex items-center gap-2">
          <label htmlFor="city-select" className="text-sm">
            Город:
          </label>
          <select id="city-select" defaultValue={currentCity} className="border rounded px-2 py-1 text-sm">
            <option value="">Все города</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Автоприменение фильтра — без кнопки */}
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
            (order.includes('photo') &&
              (p.coverUrl || p.photo || p.preview_url || p.cover || p.image_url)) ||
            null;

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
              {cover && (
                <Link href={href} style={{ display: 'block' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '4 / 3',
                      background: '#f3f4f6',
                    }}
                  >
                    <img
                      src={cover}
                      alt={p.title ?? p.address ?? p.external_id}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </div>
                </Link>
              )}

              <div style={{ padding: 12 }}>
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
