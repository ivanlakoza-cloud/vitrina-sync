"use client";

import React, { useEffect, useMemo, useState } from "react";

type Item = {
  external_id: string;
  title?: string | null;
  address: string;
  city_name: string;
  type?: string | null;
  tip_pomescheniya?: string | null;
  total_area?: number | null;
  floor?: number | string | null;
  etazh?: number | string | null;
  cover_url?: string | null;
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
  retail: "торговое",
  office: "офис",
  warehouse: "склад",
  industrial: "производство",
  other: "другое",
};

function typeLabel(it: Item) {
  const tip = (it.tip_pomescheniya ?? "").trim();
  if (tip) return tip;
  const t = (it.type ?? "").trim().toLowerCase();
  return TYPE_MAP[t] ?? t;
}

function floorLabel(it: Item) {
  const f = it.floor ?? it.etazh;
  if (f === null || f === undefined || String(f).trim() === "") return "";
  return `этаж ${f}`;
}

function priceParts(it: Item) {
  const mapping: Array<[keyof Item, string]> = [
    ["price_per_m2_20", "от 20"],
    ["price_per_m2_50", "от 50"],
    ["price_per_m2_100", "от 100"],
    ["price_per_m2_400", "от 400"],
    ["price_per_m2_700", "от 700"],
    ["price_per_m2_1500", "от 1500"],
  ];
  const parts: string[] = [];
  for (const [key, label] of mapping) {
    const v = (it as any)[key];
    if (v === null || v === undefined) continue;
    const num = Number(v);
    if (Number.isNaN(num)) continue;
    parts.push(`${label} — ${num.toLocaleString("ru-RU")} ₽/м²`);
  }
  return parts;
}

async function fetchCatalog(city: string) {
  const qs = city ? `?city=${encodeURIComponent(city)}` : "";
  const res = await fetch(`/api/catalog${qs}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Catalog API error: ${res.status}`);
  }
  return (await res.json()) as ApiResponse;
}

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  async function load(c: string) {
    try {
      setLoading(true);
      setError("");
      const data = await fetchCatalog(c);
      setItems(data.items ?? []);
      setCities(data.cities ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Ошибка загрузки");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  const counts = useMemo(
    () => ({
      items: items.length,
      cities: cities.length,
    }),
    [items, cities]
  );

  const debugHref = `/api/catalog${city ? `?city=${encodeURIComponent(city)}` : ""}`;

  return (
    <main className="wrap">
      <header className="topbar">
        <label className="label">Город:</label>
        <select
          className="select"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="counts">
          Найдено: <b>{counts.items}</b> объектов, городов: <b>{counts.cities}</b>
        </div>

        <a className="debug" href={debugHref} target="_blank" rel="noreferrer">
          Открыть JSON (debug)
        </a>
      </header>

      {error && <div className="error">Ошибка: {error}</div>}
      {loading && <div className="loading">Загрузка...</div>}

      <section className="grid">
        {items.map((it) => {
          const title = `${it.city_name}${it.address ? ", " + it.address : ""}`;
          const meta = [typeLabel(it), floorLabel(it)].filter(Boolean).join(" · ");
          const prices = priceParts(it).join(" · ");
          return (
            <article key={it.external_id} className="card">
              {it.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="photo"
                  src={it.cover_url}
                  alt={title}
                  loading="lazy"
                />
              ) : (
                <div className="photo placeholder">нет фото</div>
              )}

              <div className="body">
                <h3 className="title">{title}</h3>
                {meta && <div className="meta">{meta}</div>}
                {prices && <p className="prices">{prices}</p>}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
