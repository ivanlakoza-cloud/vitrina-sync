import Link from 'next/link';
import CityFilter from './components/CityFilter';
import { getCatalog } from '@/lib/data';

export default async function Page({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const { items, cities } = await getCatalog({ city: searchParams.city });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Каталог</h1>

      {/* Фильтр – клиентский компонент, передаём только простые данные */}
      <CityFilter
        cities={cities.map((c: any) => ({ id: c.id, name: c.name }))}
        current={searchParams.city}
      />

      {/* Сетка: до 6 карточек в ряд на очень широких экранах */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-6">
        {items.map((it: any) => (
          <li key={it.external_id}>
            <Link
              href={`/p/${it.external_id}`}
              className="block rounded-lg border hover:shadow-md transition"
            >
              <div className="aspect-[16/10] bg-gray-100 overflow-hidden rounded-t-lg">
                {/* корректный урл фото или заглушка */}
                <img
                  src={it.photo_url ?? '/no-photo.svg'}
                  alt={it.title ?? it.address ?? 'Фото'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <div className="text-xs text-gray-500">{it.city}</div>
                <div className="font-medium underline">
                  {it.title ?? it.address}
                </div>
                {it.address && (
                  <div className="text-sm text-gray-700">{it.address}</div>
                )}
                <div className="text-xs text-gray-600 mt-1">
                  Тип: {it.type}
                  {it.floor ? ` · Этаж: ${it.floor}` : ''}
                </div>

                {/* цены — выводим только поля с значениями */}
                <div className="text-xs mt-2 whitespace-pre-line">
                  {[
                    ['от 20', it.price20],
                    ['от 50', it.price50],
                    ['от 100', it.price100],
                    ['от 400', it.price400],
                    ['от 700', it.price700],
                    ['от 1500', it.price1500],
                  ]
                    .filter(([, v]) => v != null && v !== '')
                    .map(([label, v]) => `${label}: ${v} RUB/м²`)
                    .join('\n')}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
