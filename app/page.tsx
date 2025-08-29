// app/page.tsx
import Link from 'next/link'
import CityFilter from './ui/CityFilter'
import { getCities, getCatalog, firstPhotoPath, publicPhotoUrl, priceLadder, minFloor } from '../lib/data'

export default async function Page({ searchParams }: { searchParams: { city?: string } }) {
  const cityId = searchParams?.city
  const [cities, items] = await Promise.all([
    getCities(),
    getCatalog({ cityId }),
  ])

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Каталог</h1>

      <CityFilter cities={cities} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it: any) => {
          const imgPath = firstPhotoPath(it.photos ?? [])
          const imgUrl = publicPhotoUrl(imgPath)
          const ladder = priceLadder(it.units ?? [])
          const floor = minFloor(it.units ?? [])
          return (
            <article key={it.id ?? it.external_id} className="border rounded-xl overflow-hidden shadow-sm">
              <Link href={`/p/${it.external_id ?? it.id}`} className="block">
                {imgUrl ? (
                  <img src={imgUrl} alt="" className="w-full aspect-video object-cover" />
                ) : (
                  <div className="w-full aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                    нет фото
                  </div>
                )}
              </Link>

              <div className="p-3 space-y-1">
                <Link href={`/p/${it.external_id ?? it.id}`} className="font-medium hover:underline">
                  {it.title ?? it.address ?? it.external_id}
                </Link>
                <div className="text-sm opacity-80">
                  {/* Город берём из названия города, если в properties его нет, оставим пустым */}
                  {it.city_name ?? ''}{it.city_name && it.address ? ' · ' : ''}{it.address}
                </div>
                <div className="text-sm opacity-80">
                  Тип: {it.type}{typeof floor === 'number' ? ` · Этаж: ${floor}` : ''}
                </div>

                {ladder.length > 0 && (
                  <div className="text-sm pt-1 border-t mt-2">
                    {ladder.map(row => (
                      <div key={row.label}>{row.label}: {row.value}</div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}
