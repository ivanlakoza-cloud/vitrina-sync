// app/api/catalog/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PropertyRow = {
  external_id: string;
  title?: string | null;
  address?: string | null;
  city_name?: string | null;
  type?: string | null;
  total_area?: number | null;
  floor?: string | number | null;
  etazh?: string | number | null;
  cover_storage_path?: string | null; // если вдруг есть в view — используем
  [key: string]: any;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";

// try listing in several normalized folders
async function tryListFirstFile(supabase: any, folder: string) {
  const { data: files, error } = await supabase.storage.from(PHOTOS_BUCKET).list(folder, {
    limit: 50,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) {
    console.warn("storage.list error:", { folder, error });
    return null;
  }
  if (!files || files.length === 0) {
    console.log("storage.list empty:", { folder });
    return null;
  }
  const first = files.find((f: any) => !f.name.startsWith(".")) ?? files[0];
  const full = `${folder}${folder.endsWith("/") ? "" : "/"}${first.name}`;
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(full);
  return data?.publicUrl ?? null;
}

async function buildCoverUrl(supabase: any, p: PropertyRow): Promise<string | null> {
  // 0) прямой путь, если есть в строке (иногда включают 'photos/...')
  if (p.cover_storage_path) {
    const path = p.cover_storage_path.replace(/^\/?photos\//, "");
    const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  }

  // 1) пытаемся по external_id с разными нормализациями
  const raw = (p.external_id || "").trim();
  if (!raw) return null;

  const candidates = new Set<string>([
    `${raw}/`,
    `${raw.toLowerCase()}/`,
    `${raw.toUpperCase()}/`,
    `${raw.replace(/\s+/g, "-")}/`,
    `${raw.replace(/\s+/g, "_")}/`,
    `${raw.toLowerCase().replace(/\s+/g, "-")}/`,
    `${raw.toLowerCase().replace(/\s+/g, "_")}/`,
  ]);

  for (const folder of candidates) {
    const url = await tryListFirstFile(supabase, folder);
    if (url) return url;
  }
  return null;
}

export const revalidate = 0;

async function fetchCities(supabase: any): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("property_full_view")
      .select("city_name")
      .not("city_name", "is", null)
      .neq("city_name", "")
      .order("city_name", { ascending: true });
    if (error) throw error;
    const set = new Set<string>();
    (data || []).forEach((r: any) => { if (r?.city_name) set.add(String(r.city_name).trim()); });
    return Array.from(set);
  } catch {
    const { data } = await supabase
      .from("property_public_view")
      .select("city")
      .not("city", "is", null)
      .neq("city", "")
      .order("city", { ascending: true });
    const set = new Set<string>();
    (data || []).forEach((r: any) => { if (r?.city) set.add(String(r.city).trim()); });
    return Array.from(set);
  }
}

async function fetchProperties(supabase: any, { city, id }: { city?: string; id?: string }): Promise<PropertyRow[]> {
  // сначала пробуем property_full_view
  try {
    let q = supabase
      .from("property_full_view")
      .select("external_id,title,address,city_name,type,total_area,floor,etazh,cover_storage_path")
      .not("external_id", "is", null)
      .neq("external_id", "")
      .not("city_name", "is", null)
      .neq("city_name", "");
    if (city) q = q.eq("city_name", city);
    if (id) q = q.eq("external_id", id);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as PropertyRow[];
  } catch {
    // фолбэк на property_public_view
    let q = supabase
      .from("property_public_view")
      .select("id,title,address,city,type,total_area")
      .not("id", "is", null)
      .not("city", "is", null)
      .neq("city", "");
    if (city) q = q.eq("city", city);
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((p: any) => ({
      external_id: p.id,
      title: p.title,
      address: p.address,
      city_name: p.city,
      type: p.type,
      total_area: p.total_area ?? null,
    })) as PropertyRow[];
  }
}

export async function GET(request: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") || "").trim();
  const id = (url.searchParams.get("id") || "").trim();

  try {
    const [cities, rows] = await Promise.all([
      fetchCities(supabase),
      fetchProperties(supabase, { city, id }),
    ]);

    const items = await Promise.all(
      rows.map(async (p) => ({
        external_id: p.external_id,
        title: p.title ?? "",
        address: p.address ?? "",
        city_name: p.city_name ?? "",
        type: p.type ?? "",
        total_area: p.total_area ?? null,
        floor: p.floor ?? p.etazh ?? null,
        cover_url: await buildCoverUrl(supabase, p),
      }))
    );

    return NextResponse.json({ items, cities });
  } catch (error) {
    console.error("Catalog API fatal error:", error);
    return NextResponse.json({ error: "Catalog API error" }, { status: 500 });
  }
}
