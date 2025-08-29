// app/ui/CityFilter.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function CityFilter({ cities }: { cities: { id: string; name: string }[] }) {
  const router = useRouter()
  const sp = useSearchParams()
  const current = sp.get('city') ?? ''

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value
    const params = new URLSearchParams(Array.from(sp.entries()))
    if (v) params.set('city', v); else params.delete('city')
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="mb-4">
      <label className="text-sm mr-2">Город:</label>
      <select value={current} onChange={onChange} className="border rounded px-2 py-1">
        <option value="">Все города</option>
        {cities.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}
