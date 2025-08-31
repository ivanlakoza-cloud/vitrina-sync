// app/api/catalog/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  id: string;                 // UUID
  external_id?: string | null;// короткий код из таблицы/скрипта (id53 и т.п.)
  title?: string | null;
  address?: string | null;
  type?: string | null;
  total_area?: number | null;
  city?: string | null;       // c.name
};

type Item = {
  external_id: string;        // что будем использовать как код карточки и папку фоток
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

export const revalidate = 0;

function normalizeCity(s: any): string {
  return typeof s === "string" ? s.trim() : "";
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

async function firstPhotoUrl(supabase: any, code: string, fallbackCode?: string): Promise<string | null> {
  const candidates = Array.from(new Set([code, fallbackCode].filter(Boolean))) as string[];
  const variants: string[] = [];
  for (const c of candidates) {
    variants.push(`${c}/`, `${c.toLowerCase()}/`, `${c.toUpperCase()}/`);
  }
  for (const v of variants) {
    const url = await tryListFirstFile(supabase, v);
    if (url) return url;
  }
  return null;
}

export async function GET(request: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(request.url);
  const city = normalizeCity(url.searchParams.get("city"));
  const id = normalizeCity(url.searchParams.get("id"));
  const debug = url.searchParams.get("debug") === "1";

  // Список городов из cities join (исключаем плейсхолдер)
  const { data: citiesRaw } = await supabase
    .from("properties")
    .select("city:cities(name)")
    .neq("status", "archived") // на всякий случай
    .eq("is_public", true);

  const citySet = new Set<string>();
  (citiesRaw || []).forEach((r: any) => {
    const name = normalizeCity(r?.city?.name);
    if (name && name !== BAD_CITY_LABEL) citySet.add(name);
  });
  const cities = Array.from(citySet).sort((a, b) => a.localeCompare(b, "ru"));

  // Основной список объектов — напрямую из properties + join cities (чтобы получить внешний id и город)
  let q = supabase
    .from("properties")
    .select("id, external_id, title, address, type, total_area, city: cities(name)")
    .eq("is_public", true)
    .eq("status", "active");

  if (city) q = q.eq("cities.name", city); // фильтр по тексту города
  if (id) q = q.eq("id", id);              // если придёт, это UUID

  const { data, error } = await q;
  if (error) {
    const payload: any = { items: [], cities };
    if (debug) payload.debug = { error };
    return NextResponse.json(payload);
  }

  const baseItems: Item[] = (data || [])
    .map((r: any) => {
      const cityName = normalizeCity(r?.city?.name);
      if (!cityName || cityName === BAD_CITY_LABEL) return null;
      const externalCode = (r.external_id || r.id) as string;
      const it: Item = {
        external_id: externalCode,
        title: r.title ?? "",
        address: r.address ?? "",
        city_name: cityName,
        type: r.type ?? "",
        total_area: r.total_area ?? null,
        floor: null,
        cover_url: null,
      };
      return it;
    })
    .filter(Boolean) as Item[];

  // Фото: используем external_id как основной код папки, fallback — UUID id
  const items: Item[] = await Promise.all(
    baseItems.map(async (p, idx) => ({
      ...p,
      cover_url: await firstPhotoUrl(supabase, p.external_id, data?.[idx]?.id),
    }))
  );

  const payload: any = { items, cities };
  if (debug) {
    payload.debug = {
      query: { city, id },
      counts: { items: items.length, cities: cities.length },
      sample: items.slice(0, 5).map((x, i) => ({
        id: x.external_id, city: x.city_name, hasCover: !!x.cover_url
      })),
      note: "Города и список берутся напрямую из properties + cities; фото ищется по папкам external_id/ и UUID/.",
    };
  }

  return NextResponse.json(payload);
}
