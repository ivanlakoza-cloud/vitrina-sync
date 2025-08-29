import Link from 'next/link';
import { getCatalog } from './lib/data';

type Search = { city?: string };

export default async function Page({ searchParams }: { searchParams: Search }) {
  const currentCity = searchParams?.city ?? '';
  const { items, cities } = await getCatalog({ city: currentCity });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Каталог</h1>

      {/* Фильтр без onChange — форма GET */}
      <form action="/" method="get" className="mb-6 flex items-center gap-2">
        <label htmlFor="city">Город:</label>
        <select
          id="city"
          name="city"
          defaultValue={currentCity}
          className="border rounded px-2 py-1"
        >
          <option value="">Все города</option>
          {(cities ?? []).map((c: string) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" className="border rounded px-3 py-1">
          Применить
        </button>
      </form>

      {/* небольшой отступ */}
      <div style={{ height: 16 }} />

      {/* Сетка карточек 6 в ряд на широких экранах */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {(items ?? []).map((p: any) => (
          <div
            key={p.id ?? p.external_id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <Link href={`/p/${p.external_id}`} style={{ display: 'block' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  /* 4:3, чтобы фото не растягивалось по высоте*
