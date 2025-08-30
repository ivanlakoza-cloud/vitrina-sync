
'use client';

import { useState, useEffect } from "react";

async function fetchCatalog(city: string) {
  const base = window.location.origin;
  console.log("Fetching catalog for city:", city);  // Логируем город, который передаем
  const resp = await fetch(`${base}/api/catalog?city=${encodeURIComponent(city)}`, { cache: "no-store" });
  if (!resp.ok) {
    console.error("Failed to fetch catalog", resp);  // Логируем ошибку запроса
    throw new Error("Catalog API error");
  }
  return resp.json();
}

export default function Page({ searchParams }: { searchParams: { city?: string } }) {
  const [items, setItems] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState<string>(searchParams?.city ?? "");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchCatalog(city);
        console.log("Received data:", data);  // Логируем полученные данные
        setItems(data.items || []);
        setCities(data.cities || []);
      } catch (err) {
        console.error("Error loading data:", err);  // Логируем ошибку загрузки данных
      }
    }

    loadData();
  }, [city]);

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCity(e.target.value);
  };

  return (
    <main className="p-4">
      <div className="mb-4">
        <form action="/" method="get">
          <label htmlFor="city" className="mr-2">Город:</label>
          <select
            id="city"
            name="city"
            value={city}
            onChange={handleCityChange}
          >
            <option value="">Все города</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </form>
      </div>

      <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
        {items.map((p) => {
          const caption = [p.city, p.address].filter(Boolean).join(", ");
          const href = `/p/${p.external_id}`;

          return (
            <div key={p.external_id} className="border rounded-lg p-2">
              <Link href={href} aria-label={caption}>
                <Image src={p.cover_url} alt={caption} width={260} height={160} />
                <h3>{p.title}</h3>
                <p>{caption}</p>
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}
