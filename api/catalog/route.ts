// Next.js App Router API: /app/api/catalog/route.ts
// Returns catalog items + city list in the shape the frontend expects.
// This version reads column `city` (NOT `city_name`) from `property_public_view`
// and builds computed fields: title (City, Address), subline, prices_line.
// It also fetches a cover photo from Supabase Storage bucket `photos/<external_id>/`.

import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Row = {
  external_id: string;
  address: string | null;
  city: string | null;
  type: string | null;
  total_area: number | null;
  etazh: string | number | null;
  tip_pomescheniya: string | null;
  price_per_m2_20: number | null;
  price_per_m2_50: number | null;
  price_per_m2_100: number | null;
  price_per_m2_400: number | null;
  price_per_m2_700: number | null;
  price_per_m2_1500: number | null;
};

type ItemOut = {
  external_id: string;
  cover_url: string | null;
  title: string;        // «Город, Адрес»
  subline: string;      // tip_pomescheniya + · этаж N (или падение к type)
  prices_line: string;  // «от 20 — N · от 50 — N · …»
  city_name: string;    // для совместимости фронта
};

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`env ${name} is not set`);
  return v;
}

function createSupabase(): SupabaseClient {
  const url = envOrThrow("SUPABASE_URL");
  const key = envOrThrow("SUPABASE_ANON_KEY") || envOrThrow("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

async function firstPhotoUrl(supabase: SupabaseClient, folder: string): Promise<string | null> {
  const { data: files, error } = await supabase
    .storage
    .from("photos")
    .list(folder, { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (error || !files || files.length === 0) return null;

  // Choose the first image-looking file
  const imgs = (files as Array<{ name: string }>)
    .filter((f: { name: string }) => /\.(?:jpe?g|png|webp|gif|bmp)$/i.test(f.name))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
  if (imgs.length === 0) return null;

  const path = `${folder}/${imgs[0].name}`;
  const pub = supabase.storage.from("photos").getPublicUrl(path);
  return pub.data?.publicUrl ?? null;
}

function buildSubline(row: Row): string {
  const left = (row.tip_pomescheniya && row.tip_pomescheniya.trim().length > 0)
    ? row.tip_pomescheniya.trim()
    : (row.type ?? "").trim();
  const parts = [left].filter(Boolean);
  if (row.etazh !== null && row.etazh !== undefined && String(row.etazh).trim() !== "") {
    parts.push(`этаж ${row.etazh}`);
  }
  return parts.join(" · ");
}

const PRICE_LABELS: Array<[keyof Row, string]> = [
  ["price_per_m2_20", "от 20"],
  ["price_per_m2_50", "от 50"],
  ["price_per_m2_100", "от 100"],
  ["price_per_m2_400", "от 400"],
  ["price_per_m2_700", "от 700"],
  ["price_per_m2_1500", "от 1500"],
];

function buildPricesLine(row: Row): string {
  const segments: string[] = [];
  for (const [key, label] of PRICE_LABELS) {
    const val = row[key] as unknown as number | null;
    if (val !== null && val !== undefined) {
      segments.push(`${label} — ${val}`);
    }
  }
  return segments.join(" · ");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qCity = url.searchParams.get("city") ?? "";
  const qId = url.searchParams.get("id") ?? "";

  const supabase = createSupabase();

  // 1) Items
  const select =
    "external_id,address,city,type,total_area,etazh,tip_pomescheniya," +
    "price_per_m2_20,price_per_m2_50,price_per_m2_100,price_per_m2_400,price_per_m2_700,price_per_m2_1500";

  let query = supabase.from("property_public_view").select(select);
  if (qCity) query = query.eq("city", qCity);
  if (qId) query = query.eq("external_id", qId);

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  // 2) Cities
  const { data: cityRows } = await supabase
    .from("property_public_view")
    .select("city");
  let cities = Array.isArray(cityRows) ? cityRows.map((r: { city: string | null }) => r.city).filter(Boolean) as string[] : [];
  const banned = new Set(["Обязательность данных"]);
  cities = Array.from(new Set(cities)).filter((c: string) => !banned.has(String(c)));
  cities.sort((a: string, b: string) => a.localeCompare(b, "ru"));

  // 3) Hydrate covers & computed fields
  const items: ItemOut[] = [];
  for (const r of (rows ?? []) as Row[]) {
    const cityName = (r.city ?? "").trim();
    const addr = (r.address ?? "").trim();
    const title = [cityName, addr].filter(Boolean).join(", ");
    const subline = buildSubline(r);
    const prices_line = buildPricesLine(r);
    const cover_url = await firstPhotoUrl(supabase, r.external_id);

    items.push({
      external_id: r.external_id,
      cover_url,
      title,
      subline,
      prices_line,
      city_name: cityName,
    });
  }

  return NextResponse.json({
    ok: true,
    version: "v4",
    counts: { items: items.length, cities: cities.length },
    items,
    cities,
  });
}
