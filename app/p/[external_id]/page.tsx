// app/p/[external_id]/page.tsx
import Link from 'next/link';
import { getProperty } from '../../../lib/data';
import { getGalleryUrlsByExternalId } from '../../../lib/photos';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { external_id: string } }) {
  const p = await getProperty(params.external_id);
  if (!p) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold mb-2">Проект не найден</h1>
        <Link href="/" className="text-blue-600 hover:underline">← Вернуться в каталог</Link>
      </main>
    );
  }

  const gallery = await getGalleryUrlsByExternalId(params.external_id);

  return (
    <main className="p-6 space-y-6">
      <div>
        <Link href="/" className="text-blue-600 hover:underline">← Каталог</Link>
        <h1 className="text-2xl font-semibold mt-2">{p.title ?? p.address ?? 'Проект'}</h1>
        <div className="text-gray-600">{p.city}{p.type ? ` • ${p.type}` : ''}{p.floor ? ` • этаж ${p.floor}` : ''}</div>
        <div className="text-gray-700">{p.address}</div>
      </div>

      {gallery.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {gallery.map((src, i) => (
            <img key={i} src={src} alt={`Фото ${i + 1}`} className="w-full h-40 object-cover rounded" loading="lazy" />
          ))}
        </div>
      )}

      {p.units && p.units.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Помещения</h2>
          <ul className="list-disc pl-6">
            {p.units.map((u: any) => (
              <li key={u.id}>
                {(u.name ?? u.id)} · {u.area_m2} м² · {u.available ? 'доступно' : 'занято'}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
