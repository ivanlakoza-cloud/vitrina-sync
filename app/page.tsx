// app/page.tsx
'use client';
import { useState, useEffect } from "react";

async function fetchCatalog(city: string) {
  const resp = await fetch(`/api/catalog?city=${encodeURIComponent(city)}`);
  if (!resp.ok) {
    throw new Error("Catalog API error");
  }
  return resp.json();
}

export default function Page({ searchParams }: { searchParams: { city?: string } }) {
  const [items, setItems] = useState<any[]>([]);
  const [city, setCity] = useState(searchParams?.city || "");

  useEffect(() => {
    async function loadData() {
      const data = await fetchCatalog(city);
      setItems(data.items || []);
    }

    loadData();
  }, [city]);

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCity(e.target.value);
  };

  return (
    <div>
      <div>
        <label htmlFor="city">Город:</label>
        <select id="city" value={city} onChange={handleCityChange}>
          <option value="">Все города</option>
          <option value="Москва">Москва</option>
          <option value="Барнаул">Барнаул</option>
          <option value="Златоуст">Златоуст</option>
          <option value="Прокопьевск">Прокопьевск</option>
          <option value="Шахтеров">Шахтеров</option>
        </select>
      </div>

      <div className="grid">
        {items.map(item => (
          <div key={item.external_id} className="property-tile">
            <img src={item.cover_url} alt={item.title} />
            <h3>{item.title}</h3>
            <p>{item.city_name}</p>
            <p>{item.address}</p>
            <p>{item.floor} этаж</p>
            <p>Цена от {item.price_min} до {item.price_max}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
