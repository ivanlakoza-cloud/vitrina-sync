// app/api/catalog/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RowBase = {
  id: string;
  external_id?: string | null;
  title?: string | null;
  address?: string | null;
  type?: string | null;
  total_area?: number | null;
  city_name?: string | null;
  city?: string | null;
};

type Item = {
  external_id: string; // the code we will use for URLs and storage lookup
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

async function tryListFirstFile(supabase: any, folder: string) {
  const { data: files, error } = await supabase.storage.from(PHOTOS_BUCKET).list(folder, {
    limit: 50,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) return null;
  if (!files || files.length === 0) return null;
  const first = files.find((f: any) => !f.name.startsWith(".")) ?? files[0];
  const path = `${folder}${folder.endsWith("/") ? "" : "/"}${first.name}`;
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

async function firstPhotoUrl(supabase: any, codes: string[]): Promise<string | null> {
  // Try multiple code variants (id, external_id, normalized forms)
  const tried = new Set<string>();
  for (const raw of codes) {
    if (!raw) continue;
    const base = raw.trim();
    if (!base) continue;
    const variants = [
      `${base}/`,
      `${base.toLowerCase()}/`,
      `${base.toUpperCase()}/`,
      `${base.replace(/\s+/g, "-")}/`,
      `${base.replace(/\s+/g, "_")}/`,
      `${base.toLowerCase().replace(/\s+/g, "-")}/`,
      `${base.toLowerCase().replace(/\s+/g, "_")}/`,
    ];
    for (const v of variants) {
      if (tried.has(v)) continue;
      tried.add(v);
      const url = await tryListFirstFile(supabase, v);
      if (url) return url;
    }
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
    const s = new Set<string>();
    (data || []).forEach((r: any) => r?.city_name && s.add(String(r.city_name).trim()));
    return Array.from(s);
  } catch {
    const { data } = await supabase
      .from("property_public_view")
      .select("city")
      .not("city", "is", null)
      .neq("city", "")
      .order("city", { ascending: true });
    const s = new Set<string>();
    (data || []).forEach((r: any) => r?.city && s.add(String(r.city).trim()));
    return Array.from(s);
  }
}

async function fetchFromFullView(supabase: any, city?: string, id?: string): Promise<Item[]> {
  // Try with external_id present
  try {
    let q = supabase
      .from("property_full_view")
      .select("id,external_id,title,address,type,total_area,city_name,city")
      .not("id", "is", null)
      .neq("id", "");
    if (city) {
      // prefer city_name, fallback to city
      q = q.or(`city_name.eq.${city},city.eq.${city}`);
    }
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((r: RowBase) => ({
      external_id: (r.external_id || r.id) as string,
      title: r.title ?? "",
      address: r.address ?? "",
      city_name: (r.city_name ?? r.city ?? "") as string,
      type: r.type ?? "",
      total_area: r.total_area ?? null,
      floor: null,
      cover_url: null,
    }));
  } catch {
    // If external_id column truly doesn't exist, select without it
    let q = supabase
      .from("property_full_view")
      .select("id,title,address,type,total_area,city_name,city")
      .not("id", "is", null)
      .neq("id", "");
    if (city) q = q.or(`city_name.eq.${city},city.eq.${city}`);
    if (id) q = q.eq("id", id);
    const { data } = await q;
    return (data || []).map((r: RowBase) => ({
      external_id: r.id,
      title: r.title ?? "",
      address: r.address ?? "",
      city_name: (r.city_name ?? r.city ?? "") as string,
      type: r.type ?? "",
      total_area: r.total_area ?? null,
      floor: null,
      cover_url: null,
    }));
  }
}

async function fetchFromPublicView(supabase: any, city?: string, id?: string): Promise<Item[]> {
  // Try with external_id present
  try {
    let q = supabase
      .from("property_public_view")
      .select("id,external_id,title,address,city,type,total_area")
      .not("id", "is", null)
      .neq("id", "")
      .not("city", "is", null)
      .neq("city", "");
    if (city) q = q.eq("city", city);
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((r: any) => ({
      external_id: (r.external_id || r.id) as string,
      title: r.title ?? "",
      address: r.address ?? "",
      city_name: r.city ?? "",
      type: r.type ?? "",
      total_area: r.total_area ?? null,
      floor: null,
      cover_url: null,
    }));
  } catch {
    let q = supabase
      .from("property_public_view")
      .select("id,title,address,city,type,total_area")
      .not("id", "is", null)
      .neq("id", "")
      .not("city", "is", null)
      .neq("city", "");
    if (city) q = q.eq("city", city);
    if (id) q = q.eq("id", id);
    const { data } = await q;
    return (data || []).map((r: any) => ({
      external_id: r.id,
      title: r.title ?? "",
      address: r.address ?? "",
      city_name: r.city ?? "",
      type: r.type ?? "",
      total_area: r.total_area ?? null,
      floor: null,
      cover_url: null,
    }));
  }
}

export async function GET(request: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") || "").trim();
  const id = (url.searchParams.get("id") || "").trim();

  try {
    const [cities, primary] = await Promise.all([
      fetchCities(supabase),
      fetchFromFullView(supabase, city, id),
    ]);

    const base = primary.length ? primary : await fetchFromPublicView(supabase, city, id);

    const items = await Promise.all(
      base.map(async (p) => ({
        ...p,
        // try both: UUID id (current) and any external_id like "id53"
        cover_url: await firstPhotoUrl(supabase, [p.external_id]),
      }))
    );

    return NextResponse.json({ items, cities });
  } catch (error) {
    console.error("Catalog API fatal error:", error);
    return NextResponse.json({ error: "Catalog API error" }, { status: 500 });
  }
}
