import Link from 'next/link'
import CityFilter from './ui/CityFilter'
import { getCities, getCatalog, firstPhotoPath, publicPhotoUrl, priceLadder, minFloor } from '../lib/data'
import { getHomeConfig } from '../lib/config'

export default async function Page({ searchParams }: { searchParams: { city?: string } }) {
  const [cfg, cities] = await Promise.all([ getHomeConfig(), getCities() ])
  const items = await getCatalog({ cityId: searchParams?.city })
  const cityById = new Map(cities.map(c => [String(c.id), c.name]))
  const show = new Set(cfg.card_fields_order)

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">{cfg.title || 'Каталог'}</h1>

      {cfg.show_city_filter && <CityFilter cities={cities} />}

      <div className="catalog-grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(6, cfg.columns))}, minmax(280px, 1fr))` }}>
        {items.map((it:any) => {
          const imgPath = firstPhotoPath(it.photos ?? [])
          const imgUrl = publicPhotoUrl(imgPath)
          const ladder = priceLadder(it.units ?? [], cfg.thresholds)
          const floor = minFloor(it.units ?? [])
          const cityName = cityById.get(String(it.city_id)) ?? ''

          // готовим «слоты» по порядку из CMS
          const slots: Record<string, JSX.Element | null> = {
            photo: (
              <Link href={`/p/${it.external_id ?? it.id}`} className="block">
                {imgUrl ? <img src={imgUrl} alt="" className="card-img" /> : <div className="card-img" />}
              </Link>
            ),
            city:  <div className="card-meta">{cityName}</div>,
            address: <Link href={`/p/${it.external_id ?? it.id}`} className="card-title hover:underline">{it.title ?? it.address ?? it.external_id}</Link>,
            type: <div className="card-meta">Тип: {it.type}</div>,
            floor: typeof floor === 'number' ? <div className="card-meta">Этаж: {floor}</div> : null,
            ladder: ladder.length ? (
              <div className="price-list">
                {ladder.map(r => <div key={r.label}>{r.label}: {r.value}</div>)}
              </div>
            ) : null,
          }

          return (
            <article key={it.id ?? it.external_id} className="card">
              {/* верхняя зона — если первым идёт фото */}
              {show.has('photo') && cfg.card_fields_order[0] === 'photo' ? slots.photo : null}

              <div className="card-body">
                {cfg.card_fields_order.filter(k => k !== 'photo').map(k => slots[k]).filter(Boolean)}
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}
