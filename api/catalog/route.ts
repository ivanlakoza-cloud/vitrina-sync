// app/api/catalog/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Item = {
  external_id: string;
  address: string;
  city_name: string;
  tip_pomescheniya?: string | null;
  etazh?: string | number | null;
  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;
  cover_url: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";
const BAD_CITY_LABEL = "Обязательность данных";

function isUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function listFirstFileUrl(supabase: any, folder: string) {
  const { data: files } = await supabase.storage.from(PHOTOS_BUCKET).list(folder, { limit: 50, sortBy: { column: "name", order: "asc" } });
  if (!files || !files.length) return null;
  const file = files.find((f: any) => !f.name.startsWith(".")) ?? files[0];
  const path = `${folder}${folder.endsWith("/") ? "" : "/"}${file.name}`;
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

async function buildCoverUrl(supabase: any, external_id?: string | null, uuid?: string | null) {
  const variants = new Set<string>();
  if (external_id) { variants.add(`${external_id}/`); variants.add(`${external_id.toLowerCase()}/`); variants.add(`${external_id.toUpperCase()}/`); }
  if (uuid) variants.add(`${uuid}/`);
  for (const folder of variants) {
    const url = await listFirstFileUrl(supabase, folder);
    if (url) return url;
  }
  return null;
}

export const revalidate = 0;

export async function GET(request: Request) {
  const supabase: any = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") || "").trim();
  const id = (url.searchParams.get("id") || "").trim();
  const debug = url.searchParams.get("debug") === "1";

  // Города
  const { data: cityRows } = await supabase
    .from("properties")
    .select("cities(name)")
    .eq("is_public", true)
    .eq("status", "active");

  const citiesSet = new Set<string>();
  (cityRows || []).forEach((r: any) => {
    const name = r?.cities?.name;
    if (name && name !== BAD_CITY_LABEL) citiesSet.add(String(name));
  });
  const cities = Array.from(citiesSet).sort((a, b) => a.localeCompare(b, "ru"));

  // Объекты (базовые поля)
  let q = supabase
    .from("properties")
    .select("id, external_id, address, cities(name)")
    .eq("is_public", true)
    .eq("status", "active");

  if (city) q = q.eq("cities.name", city);
  if (id && isUUID(id)) q = q.eq("id", id);

  const { data: baseRows, error } = await q;
  if (error) {
    const payload: any = { items: [], cities };
    if (debug) payload.debug = { error };
    return NextResponse.json(payload, { status: 200 });
  }

  const ids = (baseRows || []).map((r: any) => r.id).filter(Boolean);
  let extraById: Record<string, any> = {};

  if (ids.length) {
    const { data: extras } = await supabase
      .from("property_full_view")
      .select("id, city_name, tip_pomescheniya, etazh, price_per_m2_20, price_per_m2_50, price_per_m2_100, price_per_m2_400, price_per_m2_700, price_per_m2_1500")
      .in("id", ids);
    (extras || []).forEach((e: any) => { extraById[e.id] = e; });
  }

  const items: Item[] = [];
  for (const r of (baseRows || [])) {
    const e = extraById[r.id] || {};
    const city_name = (e.city_name || r?.cities?.name || "").trim();
    if (!city_name || city_name === BAD_CITY_LABEL) continue;

    const cover_url = await buildCoverUrl(supabase, r.external_id, r.id);

    items.push({
      external_id: r.external_id || r.id,
      address: r.address || "",
      city_name,
      tip_pomescheniya: e.tip_pomescheniya ?? null,
      etazh: e.etazh ?? null,
      price_per_m2_20: e.price_per_m2_20 ?? null,
      price_per_m2_50: e.price_per_m2_50 ?? null,
      price_per_m2_100: e.price_per_m2_100 ?? null,
      price_per_m2_400: e.price_per_m2_400 ?? null,
      price_per_m2_700: e.price_per_m2_700 ?? null,
      price_per_m2_1500: e.price_per_m2_1500 ?? null,
      cover_url,
    });
  }

  const payload: any = { items, cities };
  if (debug) payload.debug = { counts: { items: items.length, cities: cities.length } };
  return NextResponse.json(payload, { status: 200 });
}
