import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const WEBHOOK_SECRET = process.env.DIRECTUS_WEBHOOK_SECRET!; // == WEBHOOKS_SIGNATURE_SECRET в Directus

function timingSafeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function verifySignature(raw: string, sig: string | null) {
  if (!sig || !WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  return timingSafeEqual(expected, sig);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get('x-directus-signature') || req.headers.get('x-signature');

  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ ok: false, error: 'invalid-signature' }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 }); }

  const action = evt?.action || evt?.event;       // items.create|update|delete
  const collection = evt?.collection;
  const payload = evt?.payload;

  try {
    // Пример: синк коллекций CMS → боевые таблицы. Адаптируйте под свои поля.
    if (collection === 'cms_properties') {
      if (action === 'items.delete') {
        await supabase.from('properties').update({ is_public: false }).eq('external_id', payload?.external_id);
      } else {
        const up = {
          external_id: payload.external_id,
          title: payload.title,
          address: payload.address,
          city: payload.city,
          type: payload.type,
          total_area: payload.total_area,
          is_public: payload.is_public ?? true,
          updated_at: new Date().toISOString()
        };
        await supabase.from('properties').upsert(up, { onConflict: 'external_id' });
      }
    }

    if (collection === 'cms_units') {
      if (action === 'items.delete') {
        await supabase.from('units').update({ available: false }).eq('external_id', payload?.external_id);
      } else {
        const up = {
          external_id: payload.external_id,
          property_id: payload.property_id,
          name: payload.name,
          floor: payload.floor,
          area_m2: payload.area_m2,
          price_per_m2: payload.price_per_m2,
          currency: payload.currency ?? 'RUB',
          available: payload.available ?? true,
          updated_at: new Date().toISOString()
        };
        await supabase.from('units').upsert(up, { onConflict: 'external_id' });
      }
    }

    if (collection === 'cms_photos' && action !== 'items.delete') {
      const up = {
        external_id: payload.external_id,
        property_id: payload.property_id,
        unit_id: payload.unit_id,
        storage_path: payload.storage_path,
        sort_order: payload.sort_order ?? 0,
        is_public: payload.is_public ?? true,
        updated_at: new Date().toISOString()
      };
      await supabase.from('photos').upsert(up, { onConflict: 'external_id' });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('sync-error', e);
    // Не валим вебхук 5xx без необходимости — чтобы Directus не ретраил бесконечно
    return NextResponse.json({ ok: false, error: e?.message ?? 'sync-failed' });
  }
}
