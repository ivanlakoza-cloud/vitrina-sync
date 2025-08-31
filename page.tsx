/**
 * Главная страница витрины
 * UI v1.2 — заголовок "Город, Адрес"; подпись "тип · этаж";
 * строка цен "от 20 / от 50 / ...", если соответствующие поля есть.
 */
'use client'

import { useEffect, useMemo, useState } from 'react'

type Item = {
  external_id: string
  city_name: string
  address: string
  type?: string | null
  floor?: number | string | null
  total_area?: number | null
  cover_url?: string | null
  // Цены могут отсутствовать — делаем опциональными
  price_per_m2_20?: number | null
  price_per_m2_50?: number | null
  price_per_m2_100?: number | null
  price_per_m2_400?: number | null
  price_per_m2_700?: number | null
  price_per_m2_1500?: number | null
}

type ApiResponse = {
  items: Item[]
  cities: string[]
  debug?: any
}

function formatArea(m2?: number | null) {
  if (!m2 || m2 <= 0) return ''
  return new Intl.NumberFormat('ru-RU').format(m2) + ' м²'
}

function formatMoney(n?: number | null) {
  if (n == null) return ''
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽/м²'
}

function buildPricesLine(p: Item): string | null {
  const pairs: [string, number | null | undefined][] = [
    ['от 20', p.price_per_m2_20],
    ['от 50', p.price_per_m2_50],
    ['от 100', p.price_per_m2_100],
    ['от 400', p.price_per_m2_400],
    ['от 700', p.price_per_m2_700],
    ['от 1500', p.price_per_m2_1500],
  ]
  const chunks: string[] = []
  for (const [label, value] of pairs) {
    if (value != null && !isNaN(value as any)) {
      chunks.push(`${label} — ${formatMoney(value)}`)
    }
  }
  return chunks.length ? chunks.join(' · ') : null
}

export default function HomePage() {
  const [city, setCity] = useState<string>('')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  async function load(cityValue: string) {
    setLoading(true)
    setError(null)
    try {
      const qs = cityValue ? `?city=${encodeURIComponent(cityValue)}` : ''
      const resp = await fetch(`/api/catalog${qs}`, { cache: 'no-store' })
      const json: ApiResponse = await resp.json()
      if (!resp.ok) {
        setError('Не удалось загрузить каталог')
      }
      setData(json)
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(city)
  }, [city])

  const cities = useMemo(() => (data?.cities || []), [data])

  return (
    <main className="p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="text-lg font-medium">Город:</label>
        <select
          className="border rounded px-3 py-2 min-w-[240px]"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="text-gray-600">
          {loading ? 'Загрузка…' : (
            <>Найдено: {data?.items?.length ?? 0} объектов, городов: {cities.length}</>
          )}
        </div>

        <a href={`/api/catalog${city ? `?city=${encodeURIComponent(city)}` : ''}`}
           className="text-indigo-600 hover:underline ml-auto"
           target="_blank" rel="noreferrer">
          Открыть JSON (debug)
        </a>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-5">
        {(data?.items || []).map((p) => {
          const title = `${p.city_name}${p.address ? ', ' + p.address : ''}`
          const sub = [p.type || '', (p.floor != null && p.floor !== '' ? `этаж ${p.floor}` : '')]
            .filter(Boolean)
            .join(' · ')
          const prices = buildPricesLine(p)
          const area = formatArea(p.total_area || null)
          return (
            <article key={p.external_id} className="rounded-2xl overflow-hidden shadow-sm border bg-white flex flex-col">
              <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                {p.cover_url
                  ? <img src={p.cover_url!} alt={title} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-400">нет фото</div>}
              </div>

              <div className="p-3 flex flex-col gap-2">
                <h3 className="font-semibold leading-snug">{title}</h3>
                {sub && <div className="text-sm text-gray-600">{sub}</div>}
                {prices && <div className="text-sm">{prices}</div>}
                {area && <div className="text-sm text-gray-500">{area}</div>}
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}
