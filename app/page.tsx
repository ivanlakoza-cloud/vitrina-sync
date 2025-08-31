'use client';

import { useEffect, useMemo, useState } from 'react';

type Item = {
  external_id: string;
  address: string;
  city_name: string;
  tip_pomescheniya?: string | null;
  etazh?: string | number | null;
  type?: string | null;
  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;
  cover_url: string | null;
};

type CatalogResponse = {
  items: Item[];
  cities: string[];
  debug?: any;
};

const ALL = '';

function formatNumber(n: number) {
  try { return n.toLocaleString('ru-RU'); } catch { return String(n); }
}

function priceLine(p: Item): string {
  const pairs: Array<[string, number | null | undefined]> = [
    ['от 20', p.price_per_m2_20],
    ['от 50', p.price_per_m2_50],
    ['от 100', p.price_per_m2_100],
    ['от 400', p.price_per_m2_400],
    ['от 700', p.price_per_m2_700],
    ['от 1500', p.price_per_m2_1500],
  ];
  const parts = pairs
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v as number))
    .map(([label, v]) => `${label} — ${formatNumber(v as number)}`);
  return parts.join(' · ');
}

export default function HomePage() {
  const [city, setCity] = useState<string>(ALL);
  const [cities, setCities] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function load(selectedCity: string) {
    try {
      setLoading(true);
      setError(null);
      const q = selectedCity ? `?city=${encodeURIComponent(selectedCity)}` : '';
      const res = await fetch(`/api/catalog${q}`, { cache: 'no-store' });
      const data: CatalogResponse = await res.json();
      if (!res.ok) {
        setError('Catalog API error');
        setItems([]);
        setCities(data?.cities || []);
      } else {
        setItems(Array.isArray(data?.items) ? data.items : []);
        setCities(Array.isArray(data?.cities) ? data.cities : []);
      }
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(city); }, [city]);

  const stats = useMemo(() => ({
    items: items.length,
    cities: cities.length,
  }), [items, cities]);

  return (
    <main className="p-4 mx-auto max-w-[1600px]" data-ui="home-1.1">
      <div className="flex flex-wrap gap-4 items-center">
        <label className="text-lg">Город:</label>
        <select
          aria-label="Фильтр по городу"
          value={city}
          onChange={e => setCity(e.target.value)}
          className="border rounded-md px-3 py-2 min-w-[260px]"
        >
          <option value={ALL}>Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <span className="text-gray-600">
          Найдено: {stats.items} объектов, городов: {stats.cities}
        </span>

        <a href="/api/catalog" className="ml-auto text-sm text-blue-600 hover:underline">Открыть JSON (debug)</a>
      </div>

      {/* GRID */}
      <section className="mt-5 grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {loading ? Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse border rounded-2xl overflow-hidden">
            <div className="h-[180px] bg-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-5 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        )) : null}

        {!loading && !items.length && (
          <div className="col-span-full text-gray-500">Ничего не найдено</div>
        )}

        {!loading && items.map((p) => {
          const header = [p.city_name, p.address].filter(Boolean).join(', ');
          const tip = p.tip_pomescheniya || p.type || null;
          const second = [tip, p.etazh != null && p.etazh !== '' ? `этаж ${p.etazh}` : null]
            .filter(Boolean).join(' · ');
          const third = priceLine(p);

          return (
            <div key={p.external_id} className="border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
              <div className="h-[180px] bg-gray-100">
                {p.cover_url ? (
                  <img
                    src={p.cover_url}
                    alt={header}
                    className="w-full h-[180px] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-[180px] grid place-items-center text-gray-400 text-sm">нет фото</div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold leading-snug">{header}</h3>
                {second ? <p className="text-gray-600 text-sm mt-1">{second}</p> : null}
                {third ? <p className="text-gray-500 text-sm mt-1">{third}</p> : null}
              </div>
            </div>
          );
        })}
      </section>

      {error && (
        <div className="mt-6 text-sm text-red-600">Ошибка: {error}</div>
      )}
    </main>
  );
}
