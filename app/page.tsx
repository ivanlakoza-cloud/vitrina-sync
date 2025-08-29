// app/page.tsx
import Link from 'next/link';
import { getCatalog } from '../lib/data';
import CityFilter from './components/CityFilter';

export const revalidate = 120; // ISR: обновление каталога раз в 2 минуты

export default async function Page({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const items = await getCatalog();

  const cities = Array.from(new Set((items as any[]).map((it) => it.city).filter(Boolean)))
    .sort()
    .map((name) => ({ id: String(name), name: String(name) }));

  const list = searchParams.city
    ? (items as any[]).filter((it) => String(it.city) === String(searchParams.city))
    : (items as any[]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Каталог</h1>

      <div className="mb-6">
        <CityFilter cities={cities} current={searchParams.city} />
      </div>

      <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {list.map((it: any) => (
          <li key={it.id} className="border rounded-lg overflow-hidden">
            <Link href={`/p/${it.external_id ?? it.id}`} className="block">
              <div className="aspect-[4/3] bg-gray-100">
                {it.coverUrl ? (
                  <img
                    src={it.coverUrl}
                    alt={it.title ?? it.address ?? 'Фото'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-sm text-gray-500">
                    нет фото
                  </div>
                )}
              </div>
            </Link>

            <div className="p-3 space-y-1">
              <div className="text-xs text-gray-500">{it.city}</div>

              <Link
                href={`/p/${it.external_id ?? it.id}`}
                className="block font-medium hover:underline"
              >
                {it.title ?? it.address ?? 'Без названия'}
              </Link>

              <div className="text-sm text-gray-600">{it.address}</div>

              <div className="text-xs text-gray-500">
                Тип: {it.type} {it.floor ? ` • Этаж: ${it.floor}` : ''}
              </div>

              {it.price_text && (
                <pre className="text-xs whitespace-pre-line mt-1">{it.price_text}</pre>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
