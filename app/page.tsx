import Link from 'next/link'
import CityFilter from './ui/CityFilter'
import {
  getCities,
  getCatalog,
  firstPhotoPath,
  publicPhotoUrl,
  priceLadder,
  minFloor,
} from '../lib/data'

export default async function Page({ searchParams }: { searchParams: { city?: string } }) {
  const cityId = searchParams?.city
  const [cities, items] = await Promise.all([
    getCities(),
    getCatalog({ cityId }),
  ])

  // словарь id→name, чтобы печатать имя города
  const cityById = new Map(cities.map(c => [String(c.id), c.name]))

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Каталог</h1>

      <CityFilter cities={cities} />

      <div className="catalog-grid">
        {items.map((it: any) => {
          const imgPath = firstPhotoPath(it.photos ?? [])
          const imgUrl = publicPhotoUrl(imgPath)
          const ladder = priceLadder(it.units ?? [])
          const floor = minFloor(it.units ?? [])
          const cityName = cityById.get(String(it.city_id)) ?? ''

          return (
            <article key={it.id ?? it.external_id} className="card">
              <Link href={`/p/${it.external_id ?? it.id}`} className="block">
                {imgUrl ? (
                  <img src={imgUrl} alt="" className="card-img" />
                ) : (
                  <div className="card-img" />
                )}
              </Link>

              <div className="card-body">
                <Link href={`/p/${it.external_id ?? it.id}`} className="card-title hover:underline">
                  {it.title ?? it.address ?? it.external_id}
                </Link>

                <div className="card-meta">
                  {cityName && <>{cityName} · </>}
                  {it.address}
                </div>

                <div className="card-meta">
                  Тип: {it.type}{typeof floor === 'number' ? ` · Этаж: ${floor}` : ''}
                </div>

                {ladder.length > 0 && (
                  <div className="price-list">
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
