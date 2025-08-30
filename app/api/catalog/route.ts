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
  [key: string]: any;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function buildCoverUrl(supabase: any, external_id: string): Promise<string | null> {
  if (!external_id) return null;
  const folder = `${external_id}/`;
  const { data: files, error } = await supabase.storage.from("photos").list(folder, {
    limit: 50,
    sortBy: { column: "name", order: "asc" },
  });
  if (!error && files && files.length) {
    const first = files.find((f: any) => !f.name.startsWith(".")) ?? files[0];
    const { data } = supabase.storage.from("photos").getPublicUrl(`${external_id}/${first.name}`);
    return data?.publicUrl ?? null;
  }
  return null;
}

export const revalidate = 0;

async function fetchCities(supabase: any): Promise<string[]> {
  // Try property_full_view.city_name first
  try {
    const { data, error } = await supabase
      .from("property_full_view")
      .select("city_name")
      .not("city_name", "is", null)
      .neq("city_name", "")
      .order("city_name", { ascending: true });
    if (error) throw error;
    const set = new Set<string>();
    (data || []).forEach((r: any) => {
      if (r?.city_name && typeof r.city_name === "string") set.add(r.city_name.trim());
    });
    return Array.from(set);
  } catch (_) {
    // Fallback to property_public_view.city
    const { data } = await supabase
      .from("property_public_view")
      .select("city")
      .not("city", "is", null)
      .neq("city", "")
      .order("city", { ascending: true });
    const set = new Set<string>();
    (data || []).forEach((r: any) => {
      if (r?.city && typeof r.city === "string") set.add(r.city.trim());
    });
    return Array.from(set);
  }
}

async function fetchProperties(
  supabase: any,
  { city, id }: { city?: string; id?: string }
): Promise<PropertyRow[]> {
  // Prefer property_full_view (richer), otherwise fallback to property_public_view
  try {
    let q = supabase
      .from("property_full_view")
      .select("external_id,title,address,city_name,type,total_area,floor,etazh")
      .not("external_id", "is", null)
      .neq("external_id", "")
      .not("city_name", "is", null)
      .neq("city_name", "");
    if (city) q = q.eq("city_name", city);
    if (id) q = q.eq("external_id", id);

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as PropertyRow[];
  } catch (_) {
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

    // map/alias to PropertyRow shape
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
        cover_url: await buildCoverUrl(supabase, p.external_id),
      }))
    );

    return NextResponse.json({ items, cities });
  } catch (error) {
    console.error("Catalog API fatal error:", error);
    return NextResponse.json({ error: "Catalog API error" }, { status: 500 });
  }
}
