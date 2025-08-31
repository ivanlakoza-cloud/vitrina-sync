'use client';

import { useEffect, useMemo, useState } from 'react';

type Item = {
  external_id: string;
  title?: string | null;
  address: string;
  city_name: string;
  type?: string | null;
  tip_pomescheniya?: string | null;
  etazh?: number | string | null;
  floor?: number | string | null;
  cover_url?: string | null;
  total_area?: number | null;

  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;
};

type ApiResponse = {
  items: Item[];
  cities: string[];
  debug?: any;
};

const TYPE_MAP: Record<string, string> = {
  retail: 'торговое',
  office: 'офис',
  warehouse: 'склад',
  industrial: 'производство',
  other: 'другое',
};

function fmt(n?: number | null) {
  if (n === null || n === undefined) return '';
  try {
    return n.toLocaleString('ru-RU');
  } catch {
    return String(n);
  }
}

function typeLabel(item: Item) {
  if (item.tip_pomescheniya && item.tip_pomescheniya.trim()) return item.tip_pomescheniya.trim();
  if (item.type && TYPE_MAP[item.type]) return TYPE_MAP[item.type];
  return 'помещение';
}

function floorLabel(item: Item) {
  const f = item.floor ?? item.etazh;
  if (f === null || f === undefined || f === '') return '';
  return `${f} эт.`;
}

function buildPriceLine(item: Item) {
  const rows: [string, number | null | undefined][] = [
    ['от 20', item.price_per_m2_20],
    ['от 50', item.price_per_m2_50],
    ['от 100', item.price_per_m2_100],
    ['от 400', item.price_per_m2_400],
    ['от 700', item.price_per_m2_700],
    ['от 1500', item.price_per_m2_1500],
  ];
  const parts = rows
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([label, v]) => `${label} — ${fmt(v)} ₽/м²`);
  return parts.length ? parts.join(' · ') : '';
}

export default function Page() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [city, setCity] = useState<string>('');

  useEffect(() => {
    const url = `/api/catalog${city ? `?city=${encodeURIComponent(city)}` : ''}`;
    fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch((e) => {
        console.error('Catalog fetch error', e);
        setData({ items: [], cities: [], debug: { error: String(e) } });
      });
  }, [city]);

  const counts = useMemo(() => ({
    items: data?.items?.length ?? 0,
    cities: data?.cities?.length ?? 0,
  }), [data]);

  return (
    <main className="container">
      <header className="topbar">
        <label className="label">Город:</label>
        <select
          className="select"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Все города</option>
          {(data?.cities ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="spacer" />

        <div className="counts">
          Найдено: <b>{counts.items}</b> объектов, городов: <b>{counts.cities}</b>
        </div>

        <a className="debug" href={`/api/catalog${city ? `?city=${encodeURIComponent(city)}` : ''}`}>
          Открыть JSON (debug)
        </a>
      </header>

      <section className="grid">
        {(data?.items ?? []).map((p) => (
          <article key={p.external_id} className="card">
            <div className="thumb">
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" />
              ) : (
                <div className="no-photo">нет фото</div>
              )}
            </div>

            <div className="body">
              <h3 className="title">
                {p.city_name}
                {p.address ? `, ${p.address}` : ''}
              </h3>

              <div className="meta">
                {typeLabel(p)}
                {floorLabel(p) ? ` · ${floorLabel(p)}` : ''}
              </div>

              {buildPriceLine(p) && (
                <p className="prices">{buildPriceLine(p)}</p>
              )}

              {p.total_area ? (
                <div className="area">
                  Площадь: {fmt(p.total_area)} м²
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
