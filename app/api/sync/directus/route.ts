// app/api/sync/directus/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
- import { getProperty } from '@/lib/data'
+ import { getProperty } from '../../lib/data'

/**
 * Directus → Next.js (Vercel) → Supabase sync webhook
 * - Auth: Bearer DIRECTUS_WEBHOOK_SECRET
 * - Actions supported: create | update | delete
 * - Collections: properties | units | photos (DB-first, use existing tables)
 * - Upsert uses SUPABASE_SERVICE_ROLE on server (runtime: nodejs)
 * - Soft delete:
 *    - properties/photos: is_public = false
 *    - units: available = false
 * - Revalidation tags:
 *    - Always: 'catalog'
 *    - Per-property: 'property:<id>' and 'property:<external_id>' (if exists)
 */

// Ensure Node runtime & no static caching
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---- Types & payload shape -------------------------------------------------

type DirectusTrigger = {
  collection?: 'properties' | 'units' | 'photos' | string
  action?: string // e.g. 'items.create' | 'items.update' | 'items.delete'
  key?: string | number
  keys?: Array<string | number>
  payload?: Record<string, any> | null
  meta?: any
  accountability?: any
}

type Collection = 'properties' | 'units' | 'photos'
const ALLOWED_COLLECTIONS: ReadonlySet<Collection> = new Set(['properties', 'units', 'photos'])

// Whitelists to avoid inserting unknown fields (safer upsert)
const ALLOWED_FIELDS: Record<Collection, readonly string[]> = {
  properties: [
    'id','external_id','city_id','district_id','address','title','type','lat','lng','total_area','status','is_public','created_at','updated_at'
  ],
  units: [
    'id','external_id','property_id','name','floor','area_m2','available','price_per_m2','currency','vat_included','utilities_included','created_at','updated_at'
  ],
  photos: [
    'id','property_id','unit_id','storage_path','sort_order','is_public','created_at'
  ],
}

// ---- Utilities -------------------------------------------------------------

function getEnv(name: string): string {
  const v = process.env[name]
  if (!v || !String(v).trim()) throw new Error(`Missing ENV ${name}`)
  return v
}

function isString(x: any): x is string { return typeof x === 'string' }

function assertAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  const secret = getEnv('DIRECTUS_WEBHOOK_SECRET').trim() // ← важное .trim()
  if (!auth) return false
  return auth.trim() === `Bearer ${secret}`
}


function makeServiceClient(): SupabaseClient {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL') // not secret
  const serviceRole = getEnv('SUPABASE_SERVICE_ROLE') // secret, server only
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'directus-sync' } },
  })
}

function pickAllowed(collection: Collection, obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  const allowed = ALLOWED_FIELDS[collection]
  for (const k of allowed) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]
  return out
}

function normalizeAction(action: string | undefined, body: DirectusTrigger): 'create'|'update'|'delete'|'unknown' {
  const a = (action || '').toLowerCase()
  if (a.includes('delete')) return 'delete'
  if (a.includes('create')) return 'create'
  if (a.includes('update')) return 'update'
  // Fallbacks: presence of payload usually means create/update
  if (body && body.payload && Object.keys(body.payload).length) return 'update'
  return 'unknown'
}

function extractIds(body: DirectusTrigger): string[] {
  const ids = new Set<string>()
  if (Array.isArray(body.keys)) for (const k of body.keys) if (k != null) ids.add(String(k))
  if (body.key != null) ids.add(String(body.key))
  const pid = (body.payload as any)?.id
  if (pid != null) ids.add(String(pid))
  return Array.from(ids)
}

function conflictTargetFor(collection: Collection, row: Record<string, any>): string {
  if ((collection === 'properties' || collection === 'units') && row.external_id && String(row.external_id).length > 0) {
    return 'external_id'
  }
  // photos have no external_id in provided schema → use id
  return 'id'
}

async function propertyTagsForExisting(
  supabase: SupabaseClient,
  collection: Collection,
  ids: string[],
): Promise<string[]> {
  // Return list of tag suffixes: <id> and <external_id> for affected properties
  const tags = new Set<string>()
  if (collection === 'properties') {
    const { data, error } = await supabase.from('properties').select('id, external_id').in('id', ids)
    if (error) throw error
    for (const r of data || []) {
      if (isString(r.id)) tags.add(String(r.id))
      if (r.external_id && isString(r.external_id)) tags.add(String(r.external_id))
    }
  } else if (collection === 'units') {
    const { data, error } = await supabase
      .from('units')
      .select('property_id, properties!inner(id, external_id)')
      .in('id', ids)
    if (error) throw error
    for (const row of data || []) {
      const p = (row as any).properties
      if (p?.id) tags.add(String(p.id))
      if (p?.external_id) tags.add(String(p.external_id))
    }
  } else if (collection === 'photos') {
    const { data, error } = await supabase
      .from('photos')
      .select('property_id, properties!inner(id, external_id)')
      .in('id', ids)
    if (error) throw error
    for (const row of data || []) {
      const p = (row as any).properties
      if (p?.id) tags.add(String(p.id))
      if (p?.external_id) tags.add(String(p.external_id))
    }
  }
  return Array.from(tags)
}

function propertyTagsFromRow(collection: Collection, row: Record<string, any>): string[] {
  const tags = new Set<string>()
  if (collection === 'properties') {
    if (row.id) tags.add(String(row.id))
    if (row.external_id) tags.add(String(row.external_id))
  } else if (collection === 'units' || collection === 'photos') {
    if (row.property_id) tags.add(String(row.property_id))
    // We might not have property external_id in the payload; let the GET-after-upsert fallback below enrich
  }
  return Array.from(tags)
}

async function enrichPropertyExternalIds(
  supabase: SupabaseClient,
  propertyTags: string[],
): Promise<string[]> {
  // Given a mix of property IDs/external_ids, ensure both variants are present
  const out = new Set<string>(propertyTags)
  const ids = propertyTags.filter((t) => /^[0-9a-f-]{10,}$/i.test(t)) // very rough UUID check
  if (ids.length) {
    const { data } = await supabase.from('properties').select('id, external_id').in('id', ids)
    for (const r of data || []) if (r.external_id) out.add(String(r.external_id))
  }
  const exts = propertyTags.filter((t) => !/^[0-9a-f-]{10,}$/i.test(t))
  if (exts.length) {
    const { data } = await supabase.from('properties').select('id, external_id').in('external_id', exts)
    for (const r of data || []) if (r.id) out.add(String(r.id))
  }
  return Array.from(out)
}

function revalidateCatalogAndProperties(propertyTagSuffixes: string[]): void {
  // Always revalidate catalog
  revalidateTag('catalog')
  // Then revalidate each property:<suffix>
  const uniq = Array.from(new Set(propertyTagSuffixes))
  for (const suf of uniq) revalidateTag(`property:${suf}`)
}

// ---- Core processing -------------------------------------------------------

async function processEvent(body: DirectusTrigger) {
  const supabase = makeServiceClient()

  const collection = String(body.collection || '') as Collection
  if (!ALLOWED_COLLECTIONS.has(collection)) throw new Error(`Unsupported collection "${collection}"`)

  const action = normalizeAction(body.action, body)
  if (action === 'unknown') throw new Error('Cannot determine action (create/update/delete)')

  const ids = extractIds(body)

  if (action === 'delete') {
    if (ids.length === 0) throw new Error('Delete event without keys')

    // Pre-read affected properties to build tags
    const preTags = await propertyTagsForExisting(supabase, collection, ids)

    // Soft delete by collection
    const now = new Date().toISOString()
    if (collection === 'properties') {
      const { error } = await supabase.from('properties').update({ is_public: false, updated_at: now }).in('id', ids)
      if (error) throw error
    } else if (collection === 'units') {
      const { error } = await supabase.from('units').update({ available: false, updated_at: now }).in('id', ids)
      if (error) throw error
    } else if (collection === 'photos') {
      const { error } = await supabase.from('photos').update({ is_public: false }).in('id', ids)
      if (error) throw error
    }

    // Revalidate
    const tags = await enrichPropertyExternalIds(supabase, preTags)
    revalidateCatalogAndProperties(tags)

    return { ok: true, mode: 'soft-delete', collection, ids, revalidated: { catalog: true, property: tags } }
  }

  // create/update → upsert
  const raw = (body.payload || {}) as Record<string, any>
  const upsertRow = pickAllowed(collection, raw)
  if (upsertRow.updated_at === undefined) upsertRow.updated_at = new Date().toISOString()

  const onConflict = conflictTargetFor(collection, upsertRow)
  const { error: upsertError } = await supabase.from(collection).upsert(upsertRow as any, {
    onConflict,
    ignoreDuplicates: false,
    returning: 'minimal',
  })
  if (upsertError) throw upsertError

  // Build tags from payload → then enrich with missing id/external_id
  let propertyTags = propertyTagsFromRow(collection, upsertRow)
  if (!propertyTags.length) propertyTags = await propertyTagsForExisting(supabase, collection, ids)
  const finalTags = await enrichPropertyExternalIds(supabase, propertyTags)
  revalidateCatalogAndProperties(finalTags)

  return { ok: true, mode: 'upsert', collection, onConflict, ids, revalidated: { catalog: true, property: finalTags } }
}

// ---- Route handlers --------------------------------------------------------

export async function GET() {
  return NextResponse.json({ ok: true, ping: 'directus-sync' })
}

export async function POST(req: NextRequest) {
  try {
    if (!assertAuth(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    let body: DirectusTrigger
    try {
      body = (await req.json()) as DirectusTrigger
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
    }

    // Basic payload guardrails (defensive, but not over-strict)
    if (!body || !body.collection) return NextResponse.json({ ok: false, error: 'Missing collection' }, { status: 400 })

    const result = await processEvent(body)
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[directus-sync] ERROR', { message: e?.message, stack: e?.stack })
    return NextResponse.json({ ok: false, error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
