import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** Row shape we read from `properties` */
type PropertyRow = {
  external_id: string;
  address: string | null;
  city_name: string | null;
  type: string | null;
  tip_pomescheniya: string | null;
  etazh: number | null;
  floor: number | null;
  price_per_m2_20: number | null;
  price_per_m2_50: number | null;
  price_per_m2_100: number | null;
  price_per_m2_400: number | null;
  price_per_m2_700: number | null;
  price_per_m2_1500: number | null;
};

function getSupabase(): SupabaseClient<any, "public", any> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase credentials are not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Returns first public image url for the external id (photos/{externalId}/...) */
async function firstPhotoUrl(
  supabase: SupabaseClient<any, "public", any>,
  externalId: string
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !externalId) return null;

  const bucket = "photos";
  const folders = [externalId];

  for (const folder of folders) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit: 100, sortBy: { column: "name", order: "asc" } });

    if (error || !files || files.length === 0) continue;

    const imgs = (files as Array<{ name: string }>)
      .filter((f: { name: string }) => /\.(?:jpe?g|png|webp|gif|bmp)$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    const img = imgs[0];
    if (img) {
      return `${url}/storage/v1/object/public/${bucket}/${folder}/${img.name}`;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = (searchParams.get("city") || "").trim();
  const id = (searchParams.get("id") || "").trim();

  const supabase = getSupabase();

  const selectCols = `
    external_id,
    address,
    city_name,
    type,
    tip_pomescheniya,
    etazh,
    floor,
    price_per_m2_20,
    price_per_m2_50,
    price_per_m2_100,
    price_per_m2_400,
    price_per_m2_700,
    price_per_m2_1500
  `;

  let query = supabase.from("properties").select(selectCols);

  if (id) query = query.eq("external_id", id);
  if (city) query = query.eq("city_name", city);

  const { data: rows, error } = await query;

  if (error) {
    return NextResponse.json(
      { items: [], cities: [], debug: { error } },
      { status: 200 }
    );
  }

  // Build items with computed display fields
  const items = await Promise.all(
    (rows as PropertyRow[]).map(async (p) => {
      const cover_url = await firstPhotoUrl(supabase, p.external_id);
      const floorN = p.etazh ?? p.floor ?? null;
      const header = `${p.city_name ?? ""}${p.address ? `, ${p.address}` : ""}`.trim();

      const roomType =
        (p.tip_pomescheniya && p.tip_pomescheniya.trim()) ||
        (p.type && p.type.trim()) ||
        "";

      const subline = `${roomType}${floorN ? ` · этаж ${floorN}` : ""}`.trim();

      const pricePairs: Array<[string, number | null | undefined]> = [
        ["20", p.price_per_m2_20],
        ["50", p.price_per_m2_50],
        ["100", p.price_per_m2_100],
        ["400", p.price_per_m2_400],
        ["700", p.price_per_m2_700],
        ["1500", p.price_per_m2_1500],
      ];

      const prices_line = pricePairs
        .filter(([, v]) => v !== null && v !== undefined && v !== 0)
        .map(([k, v]) => `от ${k} — ${v}`)
        .join(" · ");

      return {
        external_id: p.external_id,
        cover_url,
        header,
        subline,
        prices_line,

        // raw fields (keep for details/future)
        city_name: p.city_name,
        address: p.address,
        type: p.type,
        tip_pomescheniya: p.tip_pomescheniya,
        etazh: p.etazh,
        floor: p.floor,
      };
    })
  );

  // Build city list from all properties (ignores filters)
  const { data: all, error: allErr } = await supabase
    .from("properties")
    .select("city_name");
  let cities: string[] = [];
  if (!allErr && all) {
    const set = new Set<string>();
    for (const r of all as Array<{ city_name: string | null }>) {
      const c = (r.city_name || "").trim();
      if (!c) continue;
      set.add(c);
    }
    cities = Array.from(set.values());
  }

  // Exclude service artifacts
  const banned = new Set(["Обязательность данных"]);
  cities = cities.filter((c) => !banned.has(String(c)));

  // Sort RU
  cities.sort((a: string, b: string) => a.localeCompare(b, "ru"));

  return NextResponse.json(
    {
      items,
      cities,
    },
    { status: 200 }
  );
}