"use client";

import { useEffect, useState } from "react";

type CardItem = {
  external_id: string;
  cover_url: string | null;
  header: string;
  subline: string;
  prices_line: string;
};

type ApiResp = {
  items: CardItem[];
  cities: string[];
};

async function fetchCatalog(city: string): Promise<ApiResp> {
  const qs = new URLSearchParams();
  if (city) qs.set("city", city);
  const resp = await fetch(`/api/catalog?${qs.toString()}`, { cache: "no-store" });
  return resp.json();
}

export default function HomePage() {
  const [city, setCity] = useState<string>("");
  const [cities, setCities] = useState<string[]>([]);
  const [items, setItems] = useState<CardItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCatalog(city).then((data) => {
      if (cancelled) return;
      setItems(data.items || []);
      setCities(data.cities || []);
    });
    return () => {
      cancelled = true;
    };
  }, [city]);

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="city" className="text-sm text-gray-600">Город</label>
        <select
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {items.map((p) => (
          <article key={p.external_id} className="rounded-xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-[4/3] bg-gray-100">
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.cover_url}
                  alt={p.header}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  нет фото
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-2">{p.header}</h3>
              {p.subline && (
                <p className="mt-1 text-[13px] text-gray-600 line-clamp-1">
                  {p.subline}
                </p>
              )}
              {p.prices_line && (
                <p className="mt-1 text-[13px] text-gray-800 line-clamp-2">
                  {p.prices_line}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}