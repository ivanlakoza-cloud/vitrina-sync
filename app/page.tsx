import Link from 'next/link';
import Script from 'next/script';
import { getCatalog } from '../lib/data';
import { SUPABASE_URL, SUPABASE_ANON } from '../lib/supabase';

type Search = { city?: string };

const DEFAULT_ORDER = ['photo', 'city', 'address', 'type', 'floor', 'prices'];

/** Быстрый fetch JSON с кэшем 5 минут и мягким таймаутом ~500мс */
async function fetchJSON<T>(url: string, init?: RequestInit & { revalidate?: number }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 500);
  try {
    const { revalidate, ...rest } = init ?? {};
    const res = await fetch(url, {
      ...rest,
      signal: ctrl.signal,
      next: { revalidate: revalidate ?? 300 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

/** Читаем порядок полей и флаг фильтра из Directus */
async function getUIConfig(): Promise<{ card_fields_order: string[]; show_city_filter: boolean }> {
  const base =
    process.env.NEXT_PUBLIC_DIRECTUS_URL ||
    process.env.DIRECTUS_URL ||
    'https://cms.vitran.ru';

  try {
    const data = await fetchJSON<{ data: Array<{ card_fields_order?: any; show_city_filter?: boolean }> }>(
      `${base.replace(/\/+$/, '')}/items/ui_home_config?limit=1&fields=card_fields_order,show_city_filter`,
      { revalidate: 300, cache: 'force-cache' },
    );

    const row = data?.data?.[0] ?? {};
    const order = Array.isArray(row?.card_fields_order) ? (row.card_fields_order as string[]) : [];
    return {
      card_fields_order: order.length ? order : DEFAULT_ORDER,
      show_city_filter: typeof row?.show_city_filter === 'boolean' ? row.show_city_filter : true,
    };
  } catch {
    return { card_fields_order: DEFAULT_ORDER, show_city_filter: true };
  }
}

/** Пытаемся получить список городов из БД (properties → distinct city_id → cities.name) */
async function getCitiesFromDB(): Promise<string[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON) return [];
  const headers: HeadersInit = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };

  // 1) distinct city_id из публичных свойств
  const props = await fetchJSON<Array<{ city_id: string | null }>>(
    `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/properties?select=city_id&is_public=eq.true&city_id=not.is.null`,
    { headers, revalidate: 300 },
  );
  const ids = Array.from(new Set(props.map((r) => r.city_id).filter(Boolean) as string[]));
  if (!ids.length) return [];

  // 2) названия городов по id
  const inList = `in.(${ids.join(',')})`;
  const cities = await fetchJSON<Array<{ id: string; name: string }>>(
    `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/cities?select=id,name&id=${encodeURIComponent(inList)}&order=name.asc`,
    { headers, revalidate: 300 },
  );
  return cities.map((c) => c.name).filter(Boolean);
}

/** Достаём имя города из карточки, если backend не отдаёт его явно */
function extractCity(it: any): string | null {
  if (!it || typeof it !== 'object') return null;

  const tryKeys = [
    'city', 'city_name', 'city_title', 'cityTitle', 'cityName',
    'city_ru', 'display_city', 'geo_city', 'settlement',
  ];
  for (const k of tryKeys) {
    const v = it?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }

  // вложенный объект
  const nested = it.city || it.location || it.geo || it.address_obj;
  const nk =
    nested?.name ?? nested?.title ?? nested?.city ?? nested?.city_name ?? nested?.city_title ?? null;
  if (typeof nk === 'string' && nk.trim()) return nk.trim();

  return null;
}

/** Текстовый блок цен по разным ключам (берём то, что уже пишет твой backend) */
function buildPriceText(p: any): string | null {
  const blocks = [
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
      if (p?.[k] !== undefined && p?.[k] !== null && String(p[k]).trim()) { val = p[k]; break; }
    }
    if (val !== null) lines.push(`${b.label}: ${val}`);
  }
  return lines.length ? lines.join('\n') : null;
}

/** Рендер поля карточки по ключу порядка */
function renderFieldByKey(key: string, p: any) {
  switch (key) {
    case 'city': {
      const v = extractCity(p);
      return v ? <div style={{ fontWeight: 600, marginBottom: 4 }}>{v}</div> : null;
    }
    case 'address': {
      const v = p?.address;
      return v ? <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{v}</div> : null;
    }
    case 'type': {
      const v = p?.type;
      return v ? <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Тип: {String(v)}</div> : null;
    }
    case 'floor': {
      const v = p?.floor;
      return v ? <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Этаж: {String(v)}</div> : null;
    }
    case 'prices': {
      const txt = p?.price_text ?? buildPriceText(p);
      return txt ? <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{txt}</pre> : null;
    }
    default:
      return null;
  }
}

export default async function Page({ searchParams }: { searchParams: Search }) {
  const currentCity = searchParams?.city ?? '';

  // Параллельно: UI-конфиг из Directus + каталог из Supabase
  const [ui, result] = await Promise.all([getUIConfig(), (getCatalog as any)()]);

  const order: string[] = Array.isArray(ui.card_fields_order) ? ui.card_fields_order : DEFAULT_ORDER;

  // Каталог приходит МАССИВОМ (PropertyRow[])
  const rawItems: any[] = Array.isArray(result) ? result : [];
  // Фоллбэк: города из БД; если не получилось — собираем из карточек
  const dbCities = await getCitiesFromDB();

  const fromItems = Array.from(
    new Set(rawItems.map((it) => extractCity(it)).filter(Boolean) as string[]),
  );
  const cities = (dbCities.length ? dbCities : fromItems).sort((a, b) => a.localeCompare(b, 'ru'));

  // Локальная фильтрация по названию города (на случай, если бэкенд пока не фильтрует)
  const norm = (v: any) => String(v ?? '').trim().toLowerCase();
  const items =
    currentCity && currentCity.trim()
      ? rawItems.filter((p) => norm(extractCity(p)) === norm(currentCity))
      : rawItems;

  return (
    <main style={{ padding: 24 }}>
      {/* фильтр городов + отступ 16px под ним */}
      {ui.show_city_filter && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="city-select" style={{ fontSize: 14 }}>Город:</label>
          <select id="city-select" defaultValue={currentCity} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', fontSize: 14 }}>
            <option value="">Все города</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* Авто-применение фильтра (изменяем URL) */}
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

      {/* сетка карточек: 6 колонок на ≥1280px, иначе адаптивно */}
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        }}
      >
        <style>{`
          @media (min-width: 768px)  { .grid-override { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
          @media (min-width: 1280px) { .grid-override { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
        `}</style>
      </div>

      <div className="grid-override"
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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
                borderRadius: 12,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              {cover && (
                <Link href={href} style={{ display: 'block' }}>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundImage: `url(${cover})`,
                    }}
                  />
                </Link>
              )}
              <div style={{ padding: 12, fontSize: 14 }}>
                {/* рендер по порядку (кроме фото) */}
                {order.filter((k) => k !== 'photo').map((k) => (
                  <div key={k}>{renderFieldByKey(k, p)}</div>
                ))}
                <div style={{ marginTop: 8 }}>
                  <Link href={href} style={{ color: '#2563eb', textDecoration: 'none' }}>
                    Подробнее →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 24 }}>
          Нет объектов по выбранному фильтру.
        </div>
      )}
    </main>
  );
}
