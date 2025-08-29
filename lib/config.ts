// lib/config.ts
import { createClient } from '@supabase/supabase-js'
import { unstable_cache as cache } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

export type HomeConfig = {
  title?: string | null
  show_city_filter: boolean
  card_fields_order: string[]      // ['photo','city','address','type','floor','ladder']
  thresholds: number[]             // [20,50,100,400,700,1500]
  columns: number                  // 1..6
}

export const getHomeConfig = cache(async (): Promise<HomeConfig> => {
  const { data } = await supabase
    .from('ui_home_config')
    .select('*')
    .single()
  return {
    title: data?.title ?? 'Каталог',
    show_city_filter: !!data?.show_city_filter,
    card_fields_order: data?.card_fields_order ?? ['photo','city','address','type','floor','ladder'],
    thresholds: data?.thresholds ?? [20,50,100,400,700,1500],
    columns: Number(data?.columns ?? 3),
  }
}, ['home-config'], { tags: ['catalog'] })
