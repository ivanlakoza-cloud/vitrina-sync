import { createClient } from '@supabase/supabase-js'
import { unstable_cache as cache } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

export const getCatalog = cache(async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('id, external_id, title, address, type, city_id, total_area, is_public, updated_at')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  return data ?? []
}, ['catalog-key'], { tags: ['catalog'] })

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
