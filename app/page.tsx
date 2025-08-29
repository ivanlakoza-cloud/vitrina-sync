import Link from 'next/link';
import { getCatalog } from '../lib/data';

export const revalidate = 0;

type Search = { city?: string };

export default async function Page({ searchParams }: { searchParams: Search }) {
  const { items, cities } = await getCatalog({ city: searchParams?.city });

  const list = (items ?? []) as any[];
  const cityList = (cities ?? []) as any[];

  return (
    <main className="p-6">
      <h1 className="text-3xl font-semibold">Каталог</h1>

      {/* Фильтр по городу (без onChange, чтобы не ломать SSR) */}
      <form method="GET" className="mt-3">
        <label htmlFor="city" className="mr-2">Город:</label>
        <select id="city" name="city" defaultValue={searchParams?.city ?? ''}>
          <option value="">Все города</option>
          {cityList.map((c: any) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {/* Если нужно автоприменение — сделаем позже через клиентский компонент */}
      </form>

      {/* Небольшой отступ после фильтра */}
      <div style={{ height: 12 }} />

      {/* 6 карточек в ряд */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {list.map((it: any) => (
          <article
            key={it.external_id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 12,
              background: '#fff',
            }}
          >
            {/* Обложка 180px с обрезкой */}
            {it.coverUrl ? (
              <img
                src={it.coverUrl}
                alt={it.title ?? it.address ?? it.external_id}
                loading="lazy"
                style={{
                  width: '100%',
                  height: 180,
                  objectFit: 'cover',
                  borderRadius: 8,
                  display: 'block',
                  background: '#f1f5f9',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 180,
                  borderRadius: 8,
                  background: '#f1f5f9',
                }}
              />
            )}

            {/* Текстовая часть */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{it.city ?? '—'}</div>
              <div style={{ marginTop: 4, marginBottom: 6 }}>
                <Link
                  href={`/p/${it.external_id}`}
                  style={{ fontWeight: 600, textDecoration: 'none' }}
                >
                  {it.title ?? it.address ?? it.external_id}
                </Link>
              </div>
              <div style={{ fontSize: 14 }}>
                Тип: {it.type ?? '—'}{it.floor ? ` · Этаж: ${it.floor}` : ''}
              </div>
              {it.price_text ? (
                <pre
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {it.price_text}
                </pre>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
