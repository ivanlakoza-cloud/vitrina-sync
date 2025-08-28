// app/api/sync/directus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';

// Гарантируем Node.js среду и отсутствие статического кэша
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DirectusTrigger =
  | {
      // Типичный payload из Event Hook ($trigger)
      collection?: string;
      action?: string; // 'items.create' | 'items.update' | 'items.delete'
      key?: string; // при create часто $trigger.key
      keys?: (string | number)[]; // при update/delete часто $trigger.keys
      payload?: Record<string, any> | null; // сам объект при create/update
      meta?: any;
      accountability?: any;
      // Доп. поля на всякий случай:
      event?: string; // иногда встречается
    }
  | any;

const ALLOWED_COLLECTIONS = new Set(['properties', 'units', 'photos'] as const);

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ENV ${name}`);
  return v;
}

function assertAuth(req: NextRequest) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  const secret = getEnv('DIRECTUS_WEBHOOK_SECRET');
  const ok = !!auth && auth.trim() === `Bearer ${secret}`;
  return ok;
}

function makeServiceClient(): SupabaseClient {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL'); // URL не секретный
  const serviceRole = getEnv('SUPABASE_SERVICE_ROLE'); // секретный, только сервер!
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

/** Берём id или external_id для точечного revalidateTag */
function getEntityTagFromRow(row: Record<string, any> | undefined | null): string | null {
  if (!row) return null;
  if (row.external_id && typeof row.external_id === 'string' && row.external_id.length > 0) {
    return row.external_id;
  }
  if (row.id && typeof row.id === 'string') return row.id;
  return null;
}

/** Фильтруем undefined (не присланные поля) чтобы не затирать в БД */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj || {})) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

/** Получить единый список ID из key/keys/payload */
function extractIds(body: DirectusTrigger): string[] {
  const ids = new Set<string>();
  if (Array.isArray(body?.keys)) {
    for (const k of body.keys) if (k != null) ids.add(String(k));
  }
  if (body?.key != null) ids.add(String(body.key));
  const pid = (body?.payload as any)?.id;
  if (pid != null) ids.add(String(pid));
  return Array.from(ids);
}

/** Чтение из БД чтобы вытащить property_id / external_id для тегов при delete */
async function preReadForTags(
  supabase: SupabaseClient,
  collection: 'properties' | 'units' | 'photos',
  ids: string[]
): Promise<{ propertyTags: string[]; entityTags: string[] }> {
  const entityTags: string[] = [];
  const propertyTags: string[] = [];

  if (collection === 'properties') {
    // Вытащим external_id/id свойств
    const { data } = await supabase
      .from('properties')
      .select('id, external_id')
      .in('id', ids);
    for (const row of data || []) {
      const t = getEntityTagFromRow(row);
      if (t) entityTags.push(t);
    }
  } else if (collection === 'units') {
    // Нужно также знать к какому property относится
    const { data } = await supabase
      .from('units')
      .select('id, external_id, property_id')
      .in('id', ids);
    for (const row of data || []) {
      const unitTag = getEntityTagFromRow(row);
      if (unitTag) entityTags.push(unitTag);
      if (row.property_id) propertyTags.push(String(row.property_id));
    }
  } else if (collection === 'photos') {
    const { data } = await supabase
      .from('photos')
      .select('id, external_id, property_id, unit_id')
      .in('id', ids);
    for (const row of data || []) {
      const photoTag = getEntityTagFromRow(row);
      if (photoTag) entityTags.push(photoTag);
      if (row.property_id) propertyTags.push(String(row.property_id));
    }
  }

  return {
    propertyTags: Array.from(new Set(propertyTags)),
    entityTags: Array.from(new Set(entityTags)),
  };
}

/** Стабильно приводим названия actions к трём вариантам */
function normalizeAction(raw: string | undefined | null, body: DirectusTrigger): 'createOrUpdate' | 'delete' | 'unknown' {
  const a = (raw || '').toLowerCase();
  if (a.includes('delete')) return 'delete';
  if (a.includes('create') || a.includes('update')) return 'createOrUpdate';

  // Fallback: если нет payload, но есть keys — скорее delete; если есть payload — create/update
  const hasPayload = body && typeof body.payload === 'object' && body.payload !== null && Object.keys(body.payload).length > 0;
  const hasKeys = (Array.isArray(body?.keys) && body.keys.length > 0) || body?.key != null;
  if (!hasPayload && hasKeys) return 'delete';
  if (hasPayload) return 'createOrUpdate';
  return 'unknown';
}

/** Основная логика обработки одного события */
async function processEvent(body: DirectusTrigger) {
  const supabase = makeServiceClient();

  // 1) Базовая валидация входа
  const collection = (body.collection || '').toString();
  const actionNorm = normalizeAction(body.action, body);

  if (!ALLOWED_COLLECTIONS.has(collection as any)) {
    throw new Error(`Unsupported collection "${collection}". Allowed: properties, units, photos`);
  }
  if (actionNorm === 'unknown') {
    throw new Error(`Cannot determine action (create/update/delete) from payload`);
  }

  // 2) Определяем ids которые участвуют
  const ids = extractIds(body);

  // 3) Ветки: upsert vs soft-delete
  if (actionNorm === 'delete') {
    if (ids.length === 0) {
      throw new Error(`Delete event without keys`);
    }

    // Для корректного revalidate тегов вытащим прежние связи
    const { propertyTags, entityTags } = await preReadForTags(supabase, collection as any, ids);

    // Soft-delete: is_public=false (+ updated_at)
    const now = new Date().toISOString();
    const { error } = await supabase
      .from(collection)
      .update({ is_public: false, updated_at: now } as any)
      .in('id', ids);

    if (error) throw error;

    // revalidate: общий каталог + затронутые property/* + сами сущности
    revalidateTag('catalog');
    for (const t of [...entityTags, ...propertyTags]) {
      revalidateTag(`property:${t}`);
    }

    return { ok: true, mode: 'soft-delete', collection, ids, revalidated: { catalog: true, perProperty: [...new Set([...entityTags, ...propertyTags])] } };
  }

  // create/update → upsert
  const item = (body.payload || {}) as Record<string, any>;
  // Берём только присланные поля (undefined не отправляем), чтобы не затирать существующие значения
  const upsertRow = stripUndefined(item);

  // Проставим updated_at если поля нет
  if (upsertRow.updated_at === undefined) {
    upsertRow.updated_at = new Date().toISOString();
  }

  // Сконфликтуем по external_id если он есть, иначе по id
  const conflictTarget = (upsertRow.external_id && String(upsertRow.external_id).length > 0) ? 'external_id' : 'id';

  // Safety: без id и без external_id upsert некорректен — потребуем хотя бы одно из них
  if (!upsertRow.id && !upsertRow.external_id) {
    throw new Error(`Upsert requires "id" or "external_id" in payload`);
  }

  const { error } = await supabase
    .from(collection)
    .upsert(upsertRow as any, { onConflict: conflictTarget, ignoreDuplicates: false, returning: 'minimal' });

  if (error) throw error;

  // Сформируем набор тегов для revalidate
  const tags = new Set<string>();
  // 1) тэг самой сущности (external_id/id)
  const entityTag = getEntityTagFromRow(upsertRow);
  if (entityTag) tags.add(entityTag);
  // 2) для units/photos — подтолкнём revalidate по родительскому property
  if (collection === 'units' || collection === 'photos') {
    const propertyId = upsertRow.property_id || upsertRow?.property?.id;
    if (propertyId) tags.add(String(propertyId));
  }
  // 3) если это properties — revalidate по самому объекту уже покрыт entityTag

  // revalidate
  revalidateTag('catalog');
  for (const t of tags) {
    revalidateTag(`property:${t}`);
  }

  return { ok: true, mode: 'upsert', collection, conflictTarget, tags: Array.from(tags) };
}

export async function GET() {
  return NextResponse.json({ ok: true, ping: 'directus-sync' });
}

export async function POST(req: NextRequest) {
  try {
    if (!assertAuth(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as DirectusTrigger;
    // Немного логов для отладки (без секретов)
    console.log('[directus-sync] incoming', {
      collection: body?.collection,
      action: body?.action,
      key: body?.key,
      keys: Array.isArray(body?.keys) ? body.keys : undefined,
      hasPayload: !!(body && body.payload && Object.keys(body.payload || {}).length),
    });

    const result = await processEvent(body);
    console.log('[directus-sync] processed', result);

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error('[directus-sync] ERROR', { message: e?.message, stack: e?.stack });
    return NextResponse.json({ ok: false, error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
