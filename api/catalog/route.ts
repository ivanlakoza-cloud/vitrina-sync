import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Row = {
  id: string | number | null;
  title: string | null;
  address: string | null;
  city: string | null;
  type: string | null;
  etazh: string | number | null;
  tip_pomescheniya: string | null;
  price_per_m2_20: number | null;
  price_per_m2_50: number | null;
  price_per_m2_100: number | null;
  price_per_m2_400: number | null;
  price_per_m2_700: number | null;
  price_per_m2_1500: number | null;
};

// Try both env names so it works on local & Vercel
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const sb = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function buildPricesLine(r: Row): string {
  const pairs: Array<[keyof Row, string]> = [
    ['price_per_m2_20', 'от 20'],
    ['price_per_m2_50', 'от 50'],
    ['price_per_m2_100', 'от 100'],
    ['price_per_m2_400', 'от 400'],
    ['price_per_m2_700', 'от 700'],
    ['price_per_m2_1500', 'от 1500'],
  ];
  return pairs
    .map(([k, label]) => {
      const v = (r as any)[k];
      if (v === undefined || v === null || v === '') return null;
      return `${label} — ${v}`;
    })
    .filter(Boolean)
    .join(' · ');
}

export async function GET() {
  try {
    if (!sb) {
      return NextResponse.json(
        { ok: false, message: 'Supabase env is not configured' },
        { status: 500 }
      );
    }

    // NOTE: intentionally do NOT reference uuid/external_id/city_name here
    const { data, error } = await sb
      .from('property_public_view')
      .select(
        [
          'id',
          'title',
          'address',
          'city',
          'type',
          'etazh',
          'tip_pomescheniya',
          'price_per_m2_20',
          'price_per_m2_50',
          'price_per_m2_100',
          'price_per_m2_400',
          'price_per_m2_700',
          'price_per_m2_1500',
        ].join(',')
      )
      .limit(2000);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    const rows: Row[] = (data as any[]) ?? [];

    const items = rows.map((r) => {
      const city = (r.city ?? '').toString().trim();
      const address = (r.address ?? '').toString().trim();

      // Header (Город, Адрес)
      const header = [city, address].filter(Boolean).join(', ');

      // Second line: tip_pomescheniya (fallback: type) + этаж
      const primary = (r.tip_pomescheniya || r.type || '').toString().trim();
      const etazh =
        r.etazh !== null && r.etazh !== undefined && `${r.etazh}` !== ''
          ? ` · этаж ${r.etazh}`
          : '';
      const subtitle = (primary + etazh).trim();

      // Prices
      const prices_line = buildPricesLine(r);

      return {
        external_id: String(r.id ?? ''), // avoid uuid usage
        // keep legacy fields to not break old frontend
        title: header,
        address,
        city_name: city, // legacy alias
        type: r.type,
        floor: r.etazh,
        cover_url: null, // can be filled later if needed
        // new fields (for the new homepage)
        subtitle,
        prices_line,
      };
    });

    const cities = Array.from(
      new Set(items.map((i) => i.city_name).filter(Boolean))
    ).sort((a, b) => a!.localeCompare(b!, 'ru'));

    return NextResponse.json({
      items,
      cities,
      debug: {
        v: 3,
        source: 'property_public_view',
        selected_columns:
          'id,title,address,city,type,etazh,tip_pomescheniya,price_per_m2_*',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: String(e?.message || e) }, { status: 500 });
  }
}
