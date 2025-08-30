// app/page.tsx
'use client';

import { useEffect, useMemo, useState } from "react";

type Item = {
  external_id: string;
  title: string;
  address: string;
  city_name: string;
  type: string;
  total_area?: number | null;
  floor?: string | number | null;
  cover_url?: string | null;
};

type ApiResponse = {
  items: Item[];
  cities: string[];
};

async function fetchCatalog(city: string): Promise<ApiResponse> {
  const qs = city ? `?city=${encodeURIComponent(city)}` : "";
  const resp = await fetch(`/api/catalog${qs}`, { cache: "no-store" });
  if (!resp.ok) throw new Error("Catalog API error");
  return resp.json();
}

export default function Page() {
  const [city, setCity] = useState<string>("");
  const [cities, setCities] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchCatalog(city);
        if (cancelled) return;
        setItems(data.items ?? []);
        setCities(data.cities ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [city]);

  const gridItems = useMemo(() => items, [items]);

  return (
    <main style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="city" style={{ marginRight: 8 }}>Город:</label>
        <select
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{ padding: 8, minWidth: 220 }}
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading && <p>Загрузка…</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        {gridItems.map((p) => {
          const caption = [p.city_name, p.address].filter(Boolean).join(", ");
          const href = `/p/${p.external_id}`;
          return (
            <a
              key={p.external_id}
              href={href}
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
              aria-label={caption}
            >
              <div style={{ aspectRatio: "13/8", background: "#f3f4f6" }}>
                {p.cover_url ? (
                  <img
                    src={p.cover_url}
                    alt={caption || p.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#9ca3af", fontSize: 12
                  }}>
                    нет фото
                  </div>
                )}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, lineHeight: 1.2 }}>{p.title}</div>
                <div style={{ color: "#374151", fontSize: 14, marginBottom: 6 }}>{caption}</div>
                <div style={{ display: "flex", gap: 12, color: "#4b5563", fontSize: 12 }}>
                  {p.type && <span>{p.type}</span>}
                  {p.total_area ? <span>{p.total_area} м²</span> : null}
                  {p.floor ? <span>{p.floor} эт.</span> : null}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </main>
  );
}
