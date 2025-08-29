import Image from 'next/image';
import Link from 'next/link';
import { getCatalog } from '@/lib/data';
import { assetUrl, pickPhotoId, priceLines } from '@/lib/data';

export default async function Page() {
  const items = await getCatalog(); // уже возвращает [{ id, external_id, title, city, address, type, floor, photos?.., p20..p1500 }]

  // список городов из данных
  const cities = Array.from(new Set(items.map((it: any) => it.city).filter(Boolean))).sort();

  return (
    <main className="p-6">
      <h1 className="text-3xl font-semibold mb-4">Каталог</h1>

      {/* фильтр по городу */}
      <div className="mb-6">
        <label className="mr-3">Город:</label>
        <select
          className="border rounded px-2 py-1"
          onChange={(e) => {
            const v = e.target.value;
            const url = new URL(window.location.href);
            if (v) url.searchParams.set('city', v);
            else url.searchParams.delete('city');
            window.location.href = url.toString();
          }}
          defaultValue={typeof window === 'undefined'
            ? ''
            : new URLSearchParams(window.location.search).get('city') ?? ''}
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* сетка 6 колонок на больших экранах */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        {items.map((it: any) => {
          const imgId = pickPhotoId(it);
          const img = assetUrl(imgId, 480, 300); // поменьше фото, чтобы влезало плиткой
          const lines = priceLines(it);

          return (
            <article key={it.id ?? it.external_id} className="bg-white border rounded shadow-sm overflow-hidden">
              {/* картинка */}
              <div className="relative bg-gray-100" style={{ aspectRatio: '16 / 10' }}>
                {img ? (
                  <Image
                    src={img}
                    alt={it.title ?? it.address ?? 'Фото объекта'}
                    fill
                    sizes="(max-width: 1280px) 33vw, 16vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    нет фото
                  </div>
                )}
              </div>

              {/* контент карточки */}
              <div className="p-3 space-y-2">
                {it.city && <div className="text-xs text-gray-500">{it.city}</div>}

                <h2 className="leading-tight">
                  <Link
                    href={`/p/${encodeURIComponent(it.external_id ?? it.id)}`}
                    className="text-violet-700 hover:underline font-medium"
                  >
                    {it.title ?? it.address ?? 'Объект'}
                  </Link>
                </h2>

                {/* адрес */}
                {it.address && (
                  <div className="text-sm text-gray-700">{it.address}</div>
                )}

                <div className="text-sm text-gray-600">
                  Тип: <span className="text-gray-800">{it.type ?? '—'}</span>
                  {typeof it.floor !== 'undefined' && (
                    <> · Этаж: <span className="text-gray-800">{it.floor}</span></>
                  )}
                </div>

                {/* цены */}
                {lines.length > 0 && (
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    {lines.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
