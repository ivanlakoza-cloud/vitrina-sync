import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type PropRow = {
  external_id: string;
  title: string | null;
  address: string | null;
  city_name: string | null;
  type: string | null;
  total_area: number | null;
  floor?: number | null;
};

type FileEntry = { name: string };

const bannedCities = new Set<string>([
  "Обязательность данных",
  "",
]);

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars are missing");
  }
  return createClient(url, key);
}

async function firstPhotoUrl(supabase: SupabaseClient, externalId: string): Promise<string | null> {
  const bucket = supabase.storage.from("photos");

  // Try folder == externalId
  const candidates: string[] = [];
  for (const folder of [externalId]) {
    const { data: files, error } = await bucket.list(folder);
    if (error || !files) continue;

    const typedFiles = (files as unknown as FileEntry[]);
    const img = typedFiles
      .filter((f: FileEntry) => /\.(?:jpe?g|png|webp|gif|bmp)$/i.test(f.name))
      .sort((a: FileEntry, b: FileEntry) => a.name.localeCompare(b.name))[0];
    if (img) {
      candidates.push(`${folder}/${img.name}`);
    }
  }

  const path = candidates[0];
  if (!path) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  return `${url}/storage/v1/object/public/photos/${path}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") || "").trim();
  const id = (url.searchParams.get("id") || "").trim();

  const supabase = getSupabase();

  try {
    // 1) Items query
    let query = supabase
      .from("properties")
      .select("external_id,title,address,city_name,type,total_area,floor")
      .order("city_name", { ascending: true });

    if (id) {
      query = query.eq("external_id", id);
    } else if (city) {
      query = query.eq("city_name", city);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ items: [], cities: [], debug: { error } });
    }

    const rows = (data || []) as PropRow[];

    const items = await Promise.all(
      rows.map(async (p: PropRow) => ({
        external_id: p.external_id,
        title: p.title ?? "",
        address: p.address ?? "",
        city_name: p.city_name ?? "",
        type: p.type ?? "",
        total_area: p.total_area ?? null,
        floor: typeof p.floor === "number" ? p.floor : null,
        cover_url: await firstPhotoUrl(supabase, p.external_id),
      }))
    );

    // 2) Cities list (distinct from whole table)
    const { data: allCitiesData } = await supabase
      .from("properties")
      .select("city_name");

    let cities = ((allCitiesData || []) as { city_name: string | null }[])
      .map((r) => r.city_name ?? "")
      .filter((c): c is string => !!c && !bannedCities.has(String(c)));

    // cast to string[] explicitly to satisfy TS and then sort
    (cities as string[]).sort((a: string, b: string) => a.localeCompare(b, "ru"));

    return NextResponse.json({
      items,
      cities,
    });
  } catch (e: any) {
    return NextResponse.json({ items: [], cities: [], debug: { fatal: String(e && e.message || e) } });
  }
}