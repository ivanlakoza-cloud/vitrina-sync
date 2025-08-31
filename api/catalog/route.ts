// app/api/catalog/route.ts
// Next.js App Router API endpoint to fetch catalog items and city list
// Queries Supabase "properties" table directly; builds cover_url from Storage "photos" bucket.
// Supports optional filters: ?city=<exact city name>&id=<external_id or UUID>
// Excludes service rows like "Обязательность данных" from the cities list.
// Returns: { items: Item[], cities: string[], debug?: {...} }

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Item = {
  external_id: string;
  title: string | null;
  address: string | null;
  city_name: string | null;
  type: string | null;
  total_area: number | null;
  floor: number | null;
  cover_url: string | null;
};

// Some rows in sheets bring a non-city string; filter it out from cities dropdown
const BANNED_CITY_NAMES = new Set<string>(["Обязательность данных"]);

// Try to detect UUID shape
function looksLikeUUID(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

// Build Supabase client from env
function makeSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars missing: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Build public URL for the first photo inside photos/<folder>/...
async function firstPhotoUrl(supabase: any, folder: string | null | undefined): Promise<string | null> {
  if (!folder) return null;
  const bucket = supabase.storage.from("photos");
  try {
    // List files at photos/<folder>/
    const { data: files, error } = await bucket.list(folder);
    if (error) return null;
    if (!files || files.length === 0) return null;
    // Choose the first image-like file deterministically (sorted by name)
    const img = files
      .filter(f => /\.(?:jpe?g|png|webp|gif|bmp)$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name))[0];
    if (!img) return null;
    const path = `${folder}/${img.name}`;
    const { data: pub } = bucket.getPublicUrl(path);
    return pub?.publicUrl ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qp = url.searchParams;
  const filterId = (qp.get("id") ?? "").trim();
  const filterCity = (qp.get("city") ?? "").trim();
  const wantDebug = qp.get("debug") === "1";

  let supabase;
  try {
    supabase = makeSupabase();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Supabase client error" }, { status: 500 });
  }

  // Base query against "properties"
  // We only select the columns needed by the frontend.
  let query = supabase
    .from("properties")
    .select("id, external_id, title, address, city_name, type, total_area, floor")
    .order("city_name", { ascending: true })
    .order("title", { ascending: true });

  // Apply ID filter (match external_id or UUID id)
  if (filterId) {
    if (looksLikeUUID(filterId)) {
      query = query.eq("id", filterId);
    } else {
      query = query.eq("external_id", filterId);
    }
  }

  // Apply city filter (exact match)
  if (filterCity) {
    query = query.eq("city_name", filterCity);
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ items: [], cities: [], debug: { error } }, { status: 500 });
  }

  // Prepare items and compute cover urls
  const items: Item[] = [];
  for (const r of rows ?? []) {
    const external_id: string = (r as any).external_id ?? (r as any).id; // fallback
    const folder = external_id || (r as any).id || null;

    const cover_url =
      (await firstPhotoUrl(supabase, folder)) ||
      (looksLikeUUID(folder) ? await firstPhotoUrl(supabase, (r as any).external_id) : null) ||
      null;

    items.push({
      external_id,
      title: (r as any).title ?? null,
      address: (r as any).address ?? null,
      city_name: (r as any).city_name ?? null,
      type: (r as any).type ?? null,
      total_area: typeof (r as any).total_area === "number" ? (r as any).total_area : null,
      floor: typeof (r as any).floor === "number" ? (r as any).floor : null,
      cover_url,
    });
  }

  // Build city list from all properties (separate lightweight query)
  const { data: allCitiesRows } = await supabase
    .from("properties")
    .select("city_name");

  let cities: string[] = Array.from(
    new Set(
      (allCitiesRows ?? [])
        .map((r: any) => (r?.city_name ?? "").trim())
        .filter(Boolean)
        .filter((name: string) => !BANNED_CITY_NAMES.has(String(name)))
    )
  );
  cities.sort((a: string, b: string) => a.localeCompare(b, "ru"));

  const body: any = { items, cities };
  if (wantDebug) {
    body.debug = {
      query: { id: filterId, city: filterCity },
      counts: { items: items.length, cities: cities.length },
      sample: items.slice(0, 5).map(i => ({ id: i.external_id, city: i.city_name, hasCover: !!i.cover_url })),
      note: "Города и список берутся из таблицы properties; фото ищется по папкам external_id/ и UUID/ в бакете 'photos'.",
    };
  }

  return NextResponse.json(body);
}
