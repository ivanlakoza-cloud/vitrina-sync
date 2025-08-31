// app/api/catalog/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  id: string;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  type?: string | null;
  total_area?: number | null;
};

type Item = {
  external_id: string;
  title: string;
  address: string;
  city_name: string;
  type: string;
  total_area: number | null;
  floor: string | number | null;
  cover_url: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";
const BAD_CITY_LABEL = "Обязательность данных";

function isUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function tryListFirstFile(supabase: any, folder: string) {
  const { data: files, error } = await supabase.storage.from(PHOTOS_BUCKET).list(folder, {
    limit: 50,
    sortBy: { column: "name", order: "asc" },
  });
  if (error || !files || files.length === 0) return null;
  const first = files.find((f: any) => !f.name.startsWith(".")) ?? files[0];
  const path = `${folder}${folder.endsWith("/") ? "" : "/"}${first.name}`;
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

async function firstPhotoUrl(supabase: any, code: string): Promise<string | null> {
  if (!code) return null;
  const variants = new Set<string>([
    `${code}/`,
    `${code.toLowerCase()}/`,
    `${code.toUpperCase()}/`,
  ]);
  for (const v of variants) {
    const url = await tryListFirstFile(supabase, v);
    if (url) return url;
  }
  return null;
}

export const revalidate = 0;

export async function GET(request: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") || "").trim();
  const id = (url.searchParams.get("id") || "").trim();
  const debug = url.searchParams.get("debug") === "1";

  // 1) города (исключаем плейсхолдер)
  const { data: citiesRaw } = await supabase
    .from("property_public_view")
    .select("city")
    .not("city", "is", null)
    .neq("city", "")
    .neq("city", BAD_CITY_LABEL)
    .order("city", { ascending: true });

  const citiesSet = new Set<string>();
  (citiesRaw || []).forEach((r: any) => {
    if (r?.city && typeof r.city === "string") citiesSet.add(r.city.trim());
  });
  const cities = Array.from(citiesSet);

  // 2) объекты
  let q = supabase
    .from("property_public_view")
    .select("id,title,address,city,type,total_area")
    .not("id", "is", null)
    .not("city", "is", null)
    .neq("city", "")
    .neq("city", BAD_CITY_LABEL);

  if (city) q = q.eq("city", city);
  // ВАЖНО: фильтруем по id только если это валидный UUID
  if (id && isUUID(id)) q = q.eq("id", id);

  const { data, error } = await q;
  if (error) {
    const payload: any = { items: [], cities };
    if (debug) payload.debug = { error };
    return NextResponse.json(payload);
  }

  const baseItems: Item[] = (data || []).map((r: Row) => ({
    external_id: r.id,
    title: r.title ?? "",
    address: r.address ?? "",
    city_name: r.city ?? "",
    type: r.type ?? "",
    total_area: r.total_area ?? null,
    floor: null,
    cover_url: null,
  }));

  const items: Item[] = await Promise.all(
    baseItems.map(async (p) => ({
      ...p,
      cover_url: await firstPhotoUrl(supabase, p.external_id),
    }))
  );

  const payload: any = { items, cities };
  if (debug) {
    payload.debug = {
      query: { city, id },
      counts: { items: items.length, cities: cities.length },
      sample: items.slice(0, 3).map((x) => ({ id: x.external_id, city: x.city_name, hasCover: !!x.cover_url })),
    };
  }

  return NextResponse.json(payload);
}
