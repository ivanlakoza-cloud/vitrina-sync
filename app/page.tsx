import Link from 'next/link';
import { getCatalog } from '../lib/data';

type Search = { city?: string };

export default async function Page({ searchParams }: { searchParams: Search }) {
  // Be liberal about getCatalog signature/return shape across deployments
  const result: any = await (getCatalog as any)({ city: searchParams?.city });
  const items: any[] = Array.isArray(result) ? result : (result?.items ?? []);
  const cities: string[] = Array.isArray(result?.cities)
    ? result.cities
    : Array.from(new Set(items.map((p: any) => p?.city).filter(Boolean))).sort();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-3">Каталог</h1>

      {/* Фильтр по городам */}
      <form>
        <label className="text-sm mr-2">Город:</label>
        <select
          name="city"
          defaultValue={searchParams?.city ?? ''}
          onChange={(e) => {
            const v = e.currentTarget.value;
            const url = new URL(window.location.href);
            if (v) url.searchParams.set('city', v);
            else url.searchParams.delete('city');
            window.location.href = url.toString();
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </form>

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
