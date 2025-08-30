// app/api/catalog/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Fields we expect from the view; keep most optional to be robust to schema diffs
type Property = {
  external_id: string;
  title?: string | null;
  address?: string | null;
  city_name?: string | null;
  type?: string | null;
  etazh?: string | number | null; // этаж
  floor?: string | number | null; // иногда поле может называться floor
  total_area?: number | null;

  // image-related
  cover_storage_path?: string | null;
  cover_ext_url?: string | null;

  // any other fields
  [key: string]: any;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Build cover url from storage path or by listing first image in the folder `${external_id}/`
async function buildCoverUrl(
  supabase: ReturnType<typeof createClient>,
  p: Property
): Promise<string | null> {
  // 1) direct storage path if provided
  if (p.cover_storage_path) {
    const path = p.cover_storage_path.replace(/^\/?photos\//, "");
    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    return data?.publicUrl ?? null;
  }

  // 2) fallback to external url if present
  if (p.cover_ext_url) {
    return p.cover_ext_url;
  }

  // 3) list first file in `photos/${external_id}/`
  if (p.external_id) {
    const folder = `${p.external_id}/`;
    const { data: files, error } = await supabase.storage.from("photos").list(folder, {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });

    if (!error && files && files.length > 0) {
      // take first non-dot file
      const first = files.find(f => !f.name.startsWith(".")) ?? files[0];
      const filePath = `${p.external_id}/${first.name}`;
      const { data } = supabase.storage.from("photos").getPublicUrl(filePath);
      return data?.publicUrl ?? null;
    }
  }

  return null;
}

export const revalidate = 0;

export async function GET(req: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(req.url);

  const city = (url.searchParams.get("city") || "").trim();
  const id = (url.searchParams.get("id") || "").trim(); // optional filter by external_id

  // 1) fetch cities for the dropdown (distinct, not-null, not-empty)
  const { data: citiesRaw } = await supabase
    .from("property_full_view")
    .select("city_name")
    .not("city_name", "is", null)
    .neq("city_name", "")
    .order("city_name", { ascending: true });

  const citySet = new Set<string>();
  (citiesRaw || []).forEach((r: any) => {
    if (typeof r.city_name === "string" && r.city_name.trim()) {
      citySet.add(r.city_name.trim());
    }
  });
  const cities = Array.from(citySet);

  // 2) fetch properties
  let query = supabase
    .from("property_full_view")
    .select(
      "external_id,title,address,city_name,type,etazh,floor,total_area,cover_storage_path,cover_ext_url"
    )
    // фильтруем мусор: без города, без external_id или скрытые/внутренние нулевые записи
    .not("city_name", "is", null)
    .neq("city_name", "")
    .not("external_id", "is", null)
    .neq("external_id", "");

  if (city) {
    query = query.eq("city_name", city);
  }
  if (id) {
    query = query.eq("external_id", id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Catalog API query error:", error);
    return NextResponse.json({ error: "Catalog API error" }, { status: 500 });
  }

  const items = await Promise.all(
    (data || []).map(async (p: Property) => {
      const cover_url = await buildCoverUrl(supabase, p);
      const floor = p.floor ?? p.etazh ?? null;

      return {
        external_id: p.external_id,
        title: p.title ?? "",
        address: p.address ?? "",
        city_name: p.city_name ?? "",
        type: p.type ?? "",
        total_area: p.total_area ?? null,
        floor,
        cover_url,
      };
    })
  );

  return NextResponse.json({ items, cities });
}
