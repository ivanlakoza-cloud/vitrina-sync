// API route for /api/catalog
// Next.js App/Pages compatible handler (placed under /api/).
// Returns: items (with cover_url, type, floor, tip_pomescheniya, etazh, price_per_m2_*),
//          cities (unique list, RU-sorted, with banned values removed).

import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Nullable<T> = T | null;

type Row = {
  id: string;                 // external id or path fragment
  external_id?: string | null;
  title: string | null;
  city_name: string | null;
  address: string | null;
  type: string | null;
  total_area: number | null;
  floor: number | null;
  tip_pomescheniya: string | null;
  etazh: string | number | null;
  price_per_m2_20: number | null;
  price_per_m2_50: number | null;
  price_per_m2_100: number | null;
  price_per_m2_400: number | null;
  price_per_m2_700: number | null;
  price_per_m2_1500: number | null;
};

type Item = {
  external_id: string;
  title: string;
  address: string | null;
  city_name: string | null;
  type: string | null;
  total_area: number | null;
  floor: number | null;
  tip_pomescheniya: string | null;
  etazh: string | number | null;
  price_per_m2_20: number | null;
  price_per_m2_50: number | null;
  price_per_m2_100: number | null;
  price_per_m2_400: number | null;
  price_per_m2_700: number | null;
  price_per_m2_1500: number | null;
  cover_url: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Helper: first photo URL from storage folder photos/<folder>/ ordered by name asc
async function firstPhotoUrl(supabase: SupabaseClient, folder: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .storage
      .from("photos")
      .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });

    if (error) return null;
    const first = (data || []).find(f => f.name.toLowerCase().endsWith(".jpg") || f.name.toLowerCase().endsWith(".jpeg") || f.name.toLowerCase().endsWith(".png"));
    if (!first) return null;

    const { data: pub } = supabase
      .storage
      .from("photos")
      .getPublicUrl(`${folder}/${first.name}`);

    return pub?.publicUrl || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const queryId = (url.searchParams.get("id") || "").trim();
  const cityFilter = (url.searchParams.get("city") || "").trim();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase env is missing" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Columns we need from the view
  const columns = [
    "id",
    "external_id",
    "title",
    "city_name",
    "address",
    "type",
    "total_area",
    "floor",
    "tip_pomescheniya",
    "etazh",
    "price_per_m2_20",
    "price_per_m2_50",
    "price_per_m2_100",
    "price_per_m2_400",
    "price_per_m2_700",
    "price_per_m2_1500",
  ].join(",");

  // Base query
  let q = supabase
    .from("property_public_view")
    .select(columns)
    .order("city_name", { ascending: true })
    .order("title", { ascending: true })
    .limit(500);

  // Filters
  if (queryId) {
    q = q.eq("id", queryId).limit(1);
  }
  if (cityFilter) {
    q = q.eq("city_name", cityFilter);
  }

  const { data, error } = await q as unknown as { data: Row[] | null, error: any };

  if (error) {
    return NextResponse.json({ error: "Catalog API query error", details: error }, { status: 500 });
  }

  const rows: Row[] = (data || []);

  // Build items
  const items: Item[] = await Promise.all(
    rows.map(async (r): Promise<Item> => {
      const externalId = (r.external_id ?? r.id ?? "").toString();
      const cover = externalId ? await firstPhotoUrl(supabase, externalId) : null;

      return {
        external_id: externalId,
        title: r.title ?? "",
        address: r.address ?? null,
        city_name: r.city_name ?? null,
        type: r.type ?? null,
        total_area: r.total_area ?? null,
        floor: r.floor ?? null,
        tip_pomescheniya: r.tip_pomescheniya ?? null,
        etazh: r.etazh ?? null,
        price_per_m2_20: r.price_per_m2_20 ?? null,
        price_per_m2_50: r.price_per_m2_50 ?? null,
        price_per_m2_100: r.price_per_m2_100 ?? null,
        price_per_m2_400: r.price_per_m2_400 ?? null,
        price_per_m2_700: r.price_per_m2_700 ?? null,
        price_per_m2_1500: r.price_per_m2_1500 ?? null,
        cover_url: cover,
      };
    })
  );

  // Build city list
  const banned = new Set<string>(["Обязательность данных", ""]);
  let cities: string[] = Array.from(
    new Set(items.map(i => (i.city_name ?? "")).filter(Boolean))
  );
  cities = cities.filter(c => !banned.has(String(c)));
  cities.sort((a: string, b: string) => a.localeCompare(b, "ru"));

  return NextResponse.json({
    items,
    cities,
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
