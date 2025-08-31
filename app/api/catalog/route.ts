
import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Minimal row type from property_public_view we read
type PropertyRow = {
  id: string;
  external_id: string;
  title: string | null;
  address: string | null;
  city_name: string | null;
  type: string | null;
  total_area: number | null;
  tip_pomescheniya?: string | null;
  etazh?: string | number | null;
};

// util: get env and client
function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key =
    (process.env.SUPABASE_SERVICE_ROLE_KEY as string) ||
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);

  if (!url || !key) {
    throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / KEY');
  }
  return createClient(url, key);
}

async function firstPhotoUrl(supabase: SupabaseClient, idOrExt: string): Promise<string | null> {
  const bucket = supabase.storage.from('photos');

  // Try <external_id>/ then <UUID>/
  const candidates = [`${idOrExt}/`];

  // When idOrExt is a UUID-like without "id" prefix, also try with no prefix variants are handled by caller.
  // List first directory that exists and has files
  for (const prefix of candidates) {
    const { data, error } = await bucket.list(prefix, {
      limit: 1,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) continue;
    if (data && data.length > 0) {
      const path = `${prefix}${data[0].name}`;
      const pub = bucket.getPublicUrl(path);
      return pub?.data?.publicUrl ?? null;
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const supabase = getClient();
    const { searchParams } = new URL(req.url);

    const qCity = (searchParams.get('city') ?? '').trim();
    const qId = (searchParams.get('id') ?? '').trim();

    // base query
    let query = supabase
      .from('property_public_view')
      .select(
        'id, external_id, title, address, city_name, type, total_area, tip_pomescheniya, etazh'
      )
      .limit(500);

    if (qId) {
      query = query.eq('external_id', qId);
    }
    if (qCity) {
      query = query.eq('city_name', qCity);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ items: [], cities: [], debug: { error } }, { status: 200 });
    }

    const rows: PropertyRow[] = (data ?? []) as any[];

    // items + covers
    const items = await Promise.all(
      rows.map(async (p) => {
        const cover =
          (await firstPhotoUrl(supabase, p.external_id)) ??
          (await firstPhotoUrl(supabase, p.id));
        return {
          external_id: p.external_id,
          title: (p.title ?? '').trim(),
          address: p.address ?? '',
          city_name: p.city_name ?? '',
          type: p.type ?? '',
          total_area: p.total_area ?? null,
          floor: (p as any).floor ?? p.etazh ?? null,
          cover_url: cover,
        };
      })
    );

    // Cities list (unique, filtered, sorted)
    const citySet = new Set<string>();
    for (const r of rows) {
      if (r.city_name && typeof r.city_name === 'string') citySet.add(r.city_name);
    }
    let cities: string[] = Array.from(citySet);

    const banned = new Set<string>(['Обязательность данных']);
    cities = cities.filter((c: string) => !banned.has(String(c)));

    // <-- explicit parameter types fix the TS "unknown" complaint
    cities.sort((a: string, b: string) => a.localeCompare(b, 'ru'));

    return NextResponse.json(
      {
        items,
        cities,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { items: [], cities: [], debug: { fatal: String(e?.message ?? e) } },
      { status: 200 }
    );
  }
}
