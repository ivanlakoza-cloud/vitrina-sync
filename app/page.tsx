import Link from 'next/link';
import { getCatalog } from './lib/data';

type Search = { city?: string };

export default async function Page({ searchParams }: { searchParams: Search }) {
  const currentCity = searchParams?.city ?? '';
  const { items, cities } = await getCatalog({ city: currentCity });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Каталог</h1>

      {/* Фильтр без onChange — обычная форма GET */}
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
                  // 4:3 — чтобы фото выглядело как плитка
                  aspectRatio: '4 / 3',
                  background: '#f3f4f6',
                }}
              >
                {p.coverUrl ? (
                  <img
                    src={p.coverUrl}
                    alt={p.title ?? p.address ?? p.external_id}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    loading="lazy"
                  />
                ) : null}
              </div>
            </Link>

            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {p.city ?? '—'}
              </div>

              <Link
                href={`/p/${p.external_id}`}
                style={{
                  display: 'block',
                  color: '#4f46e5',
                  textDecoration: 'underline',
                  marginBottom: 4,
                }}
              >
                {p.title ?? p.address ?? p.external_id}
              </Link>

              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {p.address ? `${p.address}` : null}
                {p.type ? ` · Тип: ${p.type}` : null}
                {p.floor ? ` · Этаж: ${p.floor}` : null}
              </div>

              {p.price_text ? (
                <div
                  style={{ fontSize: 12, marginTop: 8, whiteSpace: 'pre-line' }}
                >
                  {p.price_text}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
