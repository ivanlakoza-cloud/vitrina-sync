import { getProperty } from '../../../lib/data'

export default async function Page({ params }: { params: { external_id: string } }) {
  const p = await getProperty(params.external_id)
  if (!p) return <div className="p-6">Объект не найден</div>

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{p.title ?? p.external_id}</h1>
      <div>{p.address}</div>
      <div>Тип: {p.type}</div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Помещения</h2>
        <ul className="list-disc pl-6">
          {(p.units ?? []).map((u: any) => (
            <li key={u.id}>
              {(u.name ?? u.id)} · {u.area_m2} м² · {u.available ? 'доступно' : 'занято'}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Фото</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(p.photos ?? []).map((ph: any) => (
            <img key={ph.id} src={`https://YOUR_SUPABASE_CDN/${ph.storage_path}`} alt="" className="rounded" />
          ))}
        </div>
      </section>
    </main>
  )
}
