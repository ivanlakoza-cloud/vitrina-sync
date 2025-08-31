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
  floor?: string | number | null;
  etazh?: string | number | null;
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

async function firstPhotoUrl(supabase: any, code: string): Promise<string | null> {
  if (!code) return null;
  const tried = new Set<string>();
  const variants = [
    `${code}/`,
    `${code.toLowerCase()}/`,
    `${code.toUpperCase()}/`,
    `${code.replace(/\s+/g, "-")}/`,
    `${code.replace(/\s+/g, "_")}/`,
    `${code.toLowerCase().replace(/\s+/g, "-")}/`,
    `${code.toLowerCase().replace(/\s+/g, "_")}/`,
  ];
  for (const v of variants) {
    if (tried.has(v)) continue;
    tried.add(v);
    const url = await tryListFirstFile(supabase, v);
    if (url) return url;
  }
  return null;
}

function mapRowToItem(r: RowBase): Item {
  return {
    external_id: (r.external_id || r.id) as string,
    title: r.title ?? "",
    address: r.address ?? "",
    city_name: (r.city_name ?? r.city ?? "") as string,
    type: r.type ?? "",
    total_area: r.total_area ?? null,
    floor: (r.floor ?? r.etazh ?? null) as any,
    cover_url: null,
  };
}

async function getCities(supabase: any, preferred: "full" | "public" | "auto") {
  const tryFull = async () => {
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
  };

  const tryPublic = async () => {
    const { data, error } = await supabase
      .from("property_public_view")
      .select("city")
      .not("city", "is", null)
      .neq("city", "")
      .order("city", { ascending: true });
    if (error) throw error;
    const s = new Set<string>();
    (data || []).forEach((r: any) => r?.city && s.add(String(r.city).trim()));
    return Array.from(s);
  };

  if (preferred === "full") {
    try {
      const cities = await tryFull();
      return { cities, source: "property_full_view" };
    } catch {
      const cities = await tryPublic();
      return { cities, source: "property_public_view" };
    }
  }

  if (preferred === "public") {
    try {
      const cities = await tryPublic();
      return { cities, source: "property_public_view" };
    } catch {
      const cities = await tryFull();
      return { cities, source: "property_full_view" };
    }
  }

  // auto: prefer full, but fallback if empty OR error
  try {
    const cities = await tryFull();
    if (cities.length === 0) {
      const cities2 = await tryPublic();
      return { cities: cities2, source: "property_public_view" };
    }
    return { cities, source: "property_full_view" };
  } catch {
    const cities = await tryPublic();
    return { cities, source: "property_public_view" };
  }
}

async function getItems(supabase: any, city: string, id: string, preferred: "full" | "public" | "auto") {
  const selectFull = async () => {
    let q = supabase
      .from("property_full_view")
      .select("id,external_id,title,address,city_name,city,type,total_area,floor,etazh")
      .not("id", "is", null)
      .neq("id", "")
      .or("city_name.not.is.null,city.not.is.null");
    if (city) q = q.or(`city_name.eq.${city},city.eq.${city}`);
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapRowToItem);
  };

  const selectPublic = async () => {
    let q = supabase
      .from("property_public_view")
      .select("id,title,address,city,type,total_area")
      .not("id", "is", null)
      .neq("id", "")
      .not("city", "is", null)
      .neq("city", "");
    if (city) q = q.eq("city", city);
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapRowToItem);
  };

  if (preferred === "full") {
    try {
      const items = await selectFull();
      return { items, source: "property_full_view" };
    } catch {
      const items = await selectPublic();
      return { items, source: "property_public_view" };
    }
  }

  if (preferred === "public") {
    try {
      const items = await selectPublic();
      return { items, source: "property_public_view" };
    } catch {
      const items = await selectFull();
      return { items, source: "property_full_view" };
    }
  }

  // auto: prefer full, but fallback if empty OR error
  try {
    const items = await selectFull();
    if (items.length === 0) {
      const items2 = await selectPublic();
      return { items: items2, source: "property_public_view" };
    }
    return { items, source: "property_full_view" };
  } catch {
    const items = await selectPublic();
    return { items, source: "property_public_view" };
  }
}

export const revalidate = 0;

export async function GET(request: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(request.url);

  const city = (url.searchParams.get("city") || "").trim();
  const id = (url.searchParams.get("id") || "").trim();
  const preferred = ((url.searchParams.get("source") || "auto").toLowerCase() as any) as "auto" | "full" | "public";
  const debug = url.searchParams.get("debug") === "1";

  try {
    const [{ cities, source: citiesSource }, { items, source: itemsSource }] = await Promise.all([
      getCities(supabase, preferred),
      getItems(supabase, city, id, preferred),
    ]);

    // build cover urls (annotate p explicitly to avoid implicit any)
    const withCovers: Item[] = await Promise.all(
      items.map(async (p: Item) => ({
        ...p,
        cover_url: await firstPhotoUrl(supabase, p.external_id),
      }))
    );

    const payload: any = { items: withCovers, cities };
    if (debug) {
      payload.debug = {
        query: { city, id, preferred },
        counts: { items: withCovers.length, cities: cities.length },
        sources: { citiesSource, itemsSource },
        sample: withCovers.slice(0, 3).map((x) => ({ id: x.external_id, city: x.city_name, hasCover: !!x.cover_url })),
      };
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Catalog API fatal error:", error);
    return NextResponse.json({ error: "Catalog API error" }, { status: 500 });
  }
}
