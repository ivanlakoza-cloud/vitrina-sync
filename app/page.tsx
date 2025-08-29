import Link from 'next/link';
import { getCatalog } from '../lib/data';

type Search = { city?: string };

// ...вверху файла остаётся как было (импорты и т.д.)

export default async function Page({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const currentCity = searchParams?.city ?? '';

  // что у тебя уже было:
  const { items, cities } = await getCatalog({ city: currentCity });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Каталог</h1>

      {/* ФИЛЬТР БЕЗ onChange — обычная форма GET */}
      <form action="/" method="get" className="mb-6 flex items-center gap-2">
        <label htmlFor="city">Город:</label>
        <select id="city" name="city" defaultValue={currentCity} className="border rounded px-2 py-1">
          <option value="">Все города</option>
          {(cities ?? []).map((c: string) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="border rounded px-3 py-1">Применить</button>
      </form>

      {/* …дальше твоя сетка/плитка объектов */}
    </main>
  );
}


      {/* отступ под фильтром */}
      <div style={{ height: 16 }} />

      {/* Сетка карточек 6 в ряд на широких экранах */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {items.map((p: any) => {
          const href = `/p/${encodeURIComponent(p.external_id ?? p.id ?? '')}`;
          const cover = p.coverUrl || p.photo || p.preview_url || null;

          return (
            <article key={p.id ?? p.external_id} className="rounded border border-gray-200 overflow-hidden">
              <Link href={href}>
                <img
                  src={cover ?? '/no-photo.svg'}
                  alt={p.title ?? p.external_id ?? 'объект'}
                  style={{
                    width: '100%',
                    height: 180,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  loading="lazy"
                />
              </Link>

              <div className="p-3 space-y-1">
                <div className="text-xs opacity-70">{p.city ?? ''}</div>
                <Link href={href} className="block font-medium hover:underline">
                  {p.title ?? p.external_id ?? 'Без названия'}
                </Link>
                <div className="text-sm opacity-80">{p.address ?? p.address_text ?? ''}</div>

                {/* краткая сводка по ценам */}
                {p.price_text && (
                  <div className="text-xs whitespace-pre-line opacity-80">{p.price_text}</div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
