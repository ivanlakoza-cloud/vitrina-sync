// app/api/catalog/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  updated_at: string | null;
  tip_pomescheniya?: string | null;
  etazh?: string | number | null;
  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// build cover URL strictly from Supabase Storage (bucket 'photos')
async function buildCoverUrl(supabase: any, externalId: string, coverStoragePath: string | null): Promise<string | null> {
  // 1) If DB has exact path inside bucket, try it
  const tryPath = async (path: string): Promise<string | null> => {
    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  if (coverStoragePath && !coverStoragePath.startsWith("http")) {
    const direct = await tryPath(coverStoragePath);
    if (direct) return direct;
  }

  // 2) Probe folder "<externalId>/" and take the first file
  const folder = `${externalId}/`;
  const { data: files, error } = await supabase.storage.from("photos").list(folder, {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });
  if (!error && files && files.length > 0) {
    const first = files.find((f: any) => !f.name.startsWith(".")) || files[0];
    const fullPath = folder + first.name;
    const { data } = supabase.storage.from("photos").getPublicUrl(fullPath);
    return data?.publicUrl ?? null;
  }

  return null;
}

export const revalidate = 0; // always fresh

export async function GET(request: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const url = new URL(request.url);
  const city = url.searchParams.get("city")?.trim() || "";
  const id = url.searchParams.get("id")?.trim() || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "500", 10) || 500, 1000);

  let query = supabase
    .from("view_property_with_cover")
    .select(
      "external_id,title,address,city,tip_pomescheniya,etazh,cover_storage_path,cover_ext_url,price_per_m2_20,price_per_m2_50,price_per_m2_100,price_per_m2_400,price_per_m2_700,price_per_m2_1500,updated_at"
    )
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (city) query = query.eq("city", city);
  if (id) query = query.eq("external_id", id);

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const items = await Promise.all(
    (rows as Row[]).map(async (r) => {
      const coverUrl = await buildCoverUrl(supabase, r.external_id, r.cover_storage_path);

      // derive price range from available numeric columns
      const prices = [
        r.price_per_m2_20, r.price_per_m2_50, r.price_per_m2_100,
        r.price_per_m2_400, r.price_per_m2_700, r.price_per_m2_1500
      ].filter((v): v is number => typeof v === "number");

      const price_min = prices.length ? Math.min(...prices) : null;
      const price_max = prices.length ? Math.max(...prices) : null;

      return {
        external_id: r.external_id,
        coverUrl,
        title: r.title,
        address: r.address,
        city: r.city,
        tip_pomescheniya: r.tip_pomescheniya ?? null,
        etazh: r.etazh ?? null,
        price_min,
        price_max,
        updated_at: r.updated_at,
      };
    })
  );

  // Also return distinct list of cities for the filter
  const cities = Array.from(new Set((rows as Row[]).map((x) => x.city).filter(Boolean))) as string[];

  return NextResponse.json({ ok: true, items, cities });
}
