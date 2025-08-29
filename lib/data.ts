// lib/data.ts
import { createClient } from '@supabase/supabase-js'
import { unstable_cache as cache } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

// помогаем собирать публичный URL для фото из bucket `photos`
export function publicPhotoUrl(path?: string | null): string | null {
  if (!path) return null
  // не тянем SDK storage тут, соберём URL вручную:
  // https://<project-ref>.supabase.co/storage/v1/object/public/photos/<path>
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/,'')
  return `${base}/storage/v1/object/public/photos/${path}`
}

// Фасет: список городов (id, name, count). Если таблицы cities нет, упадём на distinct по properties.
export const getCities = cache(async () => {
  // 1) пытаемся из cities
  const { data: cData, error: cErr } = await supabase
    .from('cities')
    .select('id, name')
    .order('name', { ascending: true })
  if (!cErr && cData) return cData as { id: string; name: string }[]

  // 2) fallback: distinct по properties (если нет cities)
  const { data: pData } = await supabase
    .from('properties')
    .select('city_id')
    .neq('city_id', null)
  const ids = Array.from(new Set((pData ?? []).map((r: any) => r.city_id)))
  return ids.map((id) => ({ id, name: String(id) }))
}, ['city-facet'], { tags: ['catalog'] })

// Каталог: тянем properties + units + photos, с фильтром по городу
export const getCatalog = cache(async (opts?: { cityId?: string }) => {
  const { cityId } = opts ?? {}
  let q = supabase
    .from('properties')
    .select(`
      id, external_id, title, address, type, city_id,
      units ( id, area_m2, floor, available, price_per_m2, currency ),
      photos ( id, storage_path, sort_order, is_public )
    `)
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(1000)

  if (cityId) q = q.eq('city_id', cityId)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as any[]
}, ['catalog-list'], { tags: ['catalog'] })

// Для страницы карточки оставляем как было:
export function getProperty(idOrExternal: string) {
  return cache(async () => {
    let q = supabase
      .from('properties')
      .select('id, external_id, title, address, type, city_id, total_area, status, is_public, updated_at, photos(*), units(*)')
      .eq('is_public', true)
      .limit(1)

    const isUUIDish = /^[0-9a-f-]{10,}$/i.test(idOrExternal)
    q = isUUIDish ? q.eq('id', idOrExternal) : q.eq('external_id', idOrExternal)

    const { data, error } = await q
    if (error) throw error
    return data?.[0] ?? null
  }, [`property-${idOrExternal}`], { tags: [`property:${idOrExternal}`] })()
}

// Утилиты для плиток
const PRICE_THRESHOLDS = [20, 50, 100, 400, 700, 1500]

// было: export function priceLadder(units: any[]) {
export function priceLadder(units: any[], thresholds?: number[]) {
  const usable = (units ?? []).filter((u:any)=>u?.available && u?.area_m2 && u?.price_per_m2)
  const T = (thresholds?.length ? thresholds : [20,50,100,400,700,1500])
  const out: { label: string; value: string }[] = []
  for (const t of T) {
    const fit = usable.filter((u:any) => u.area_m2 >= t)
    if (!fit.length) continue
    const minP = Math.min(...fit.map((u:any)=>Number(u.price_per_m2)))
    const curr = (fit.find((u:any)=>u.currency)?.currency ?? '₽').toString()
    out.push({ label: `от ${t}`, value: `${Math.round(minP).toLocaleString('ru-RU')} ${curr}/м²` })
  }
  return out
}


export function minFloor(units: any[]): number | null {
  const fl = (units ?? [])
    .map((u: any) => (typeof u.floor === 'number' ? u.floor : null))
    .filter((v: number | null): v is number => v !== null)
  return fl.length ? Math.min(...fl) : null
}

export function firstPhotoPath(photos: any[]): string | null {
  if (!photos?.length) return null
  const visible = photos.filter((p: any) => p?.is_public !== false)
  const sorted = visible.sort((a: any, b: any) => (a?.sort_order ?? 9999) - (b?.sort_order ?? 9999))
  return sorted[0]?.storage_path ?? null
}
const CMS = process.env.NEXT_PUBLIC_CMS_URL ?? '';

export function assetUrl(id?: string, w = 640, h = 360) {
  if (!id) return null;
  // Directus трансформы: fit=cover, webp, q=80
  const qs = new URLSearchParams({
    width: String(w),
    height: String(h),
    fit: 'cover',
    format: 'webp',
    quality: '80',
  }).toString();

  return `${CMS}/assets/${id}?${qs}`;
}

/**
 * Достаём id файла из объекта property, независимо от того,
 * как он к нам пришёл (photos[0].file, first_photo_id и т.п.)
 */
export function pickPhotoId(p: any): string | undefined {
  return (
    p?.photo_id ||
    p?.photo ||
    p?.first_photo_id ||
    p?.photos?.[0]?.file ||            // если хранится ссылка на directus_files.id
    p?.photos?.[0]?.directus_file_id ||// если поле так названо
    undefined
  );
}

/** Формат цен одной строкой */
export function priceLines(p: any): string[] {
  const items: Array<[string, number | null | undefined]> = [
    ['от 20', p?.p20],
    ['от 50', p?.p50],
    ['от 100', p?.p100],
    ['от 400', p?.p400],
    ['от 700', p?.p700],
    ['от 1500', p?.p1500],
  ];
  return items
    .filter(([, v]) => v != null)
    .map(([label, v]) => `${label}: ${Number(v).toLocaleString('ru-RU')} RUB/м²`);
}
