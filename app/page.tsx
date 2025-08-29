- import { getCatalog } from '@/lib/data'
+ import { getCatalog } from '../lib/data'


export default async function Page() {
  const items = await getCatalog()
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Каталог</h1>
      <ul className="space-y-2">
        {items.map((it: any) => (
          <li key={it.id ?? it.external_id} className="border rounded p-3">
            <div className="font-medium">{it.title ?? it.external_id}</div>
            <div className="text-sm opacity-70">
              {it.address} · {it.type}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
