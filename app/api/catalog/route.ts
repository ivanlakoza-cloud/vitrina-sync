// app/api/catalog/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Row = {
  external_id: string
  title: string | null
  address: string | null
  city: string | null
  cover_storage_path: string | null
  updated_at: string | null
}

export const dynamic = 'force-dynamic'

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  if (!url || !key) throw new Error('Supabase env vars are missing')
  return createClient(url, key, { auth: { persistSession: false } })
}

async function buildCoverUrl(supabase: ReturnType<typeof createClient>, external_id: string, cover_storage_path: string | null) {
  const bucket = 'photos'

  if (cover_storage_path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(cover_storage_path)
    if (data?.publicUrl) return data.publicUrl
  }

  const { data: files, error } = await supabase
    .storage
    .from(bucket)
    .list(external_id, { limit: 1, offset: 0, sortBy: { column: 'name', order: 'asc' } })

  if (!error && files && files.length > 0) {
    const path = `${external_id}/${files[0].name}`
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    if (data?.publicUrl) return data.publicUrl
  }

  return '/no-photo.jpg'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const city = (searchParams.get('city') || '').trim()

    const supabase = getClient()

    let query = supabase
      .from('view_property_with_cover')
      .select('external_id,title,address,city,cover_storage_path,updated_at')
      .order('updated_at', { ascending: false })

    if (city) {
      query = query.eq('city', city)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const rows = (data || []) as Row[]

    const cities = Array.from(new Set(rows.map(r => r.city).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b))

    const items = await Promise.all(
      rows.map(async (r) => {
        const coverUrl = await buildCoverUrl(supabase, r.external_id, r.cover_storage_path)
        return {
          external_id: r.external_id,
          title: r.title,
          address: r.address,
          city: r.city,
          coverUrl,
          updated_at: r.updated_at,
        }
      })
    )

    return NextResponse.json({ items, cities })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}
