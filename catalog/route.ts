import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type DBRow = {
  external_id: string;
  title: string | null;
  address: string | null;
  city_name: string | null;
  type: string | null;
  total_area: number | null;
  uuid?: string | null;
  cover_storage_path?: string | null;
};

type Item = {
  external_id: string;
  title: string;
  address: string;
  city_name: string;
  type: string | null;
  total_area: number | null;
  floor: number | null;
  cover_url: string | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const city = (url.searchParams.get("city") ?? "").trim();
    const id = (url.searchParams.get("id") ?? "").trim();
    const debug = url.searchParams.has("debug");

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase env is not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Base query against properties only
    let baseQuery = supabase
      .from("properties")
      .select(
        "external_id,title,address,city_name,type,total_area,uuid,cover_storage_path"
      );

    if (id) {
      baseQuery = baseQuery.eq("external_id", id).limit(1);
    } else if (city) {
      baseQuery = baseQuery.eq("city_name", city).limit(500);
    } else {
      baseQuery = baseQuery.limit(500);
    }

    const { data, error } = await baseQuery;
    if (error) {
      return NextResponse.json(
        { items: [], cities: [], debug: { error } },
        { status: 200 }
      );
    }

    // Cities list from properties.city_name
    const citiesRes = await supabase
      .from("properties")
      .select("city_name")
      .neq("city_name", "")
      .not("city_name", "is", null);

    const banned = new Set<string>(["Обязательность данных"]);
    let cities: string[] = [];

    if (!citiesRes.error && citiesRes.data) {
      cities = Array.from(
        new Set(
          (citiesRes.data as { city_name: string | null }[])
            .map((r) => r.city_name || "")
            .filter((c) => !!c && !banned.has(String(c)))
        )
      );
      cities.sort((a: string, b: string) => a.localeCompare(b, "ru"));
    }

    // Build items + cover urls
    const items: Item[] = await Promise.all(
      (data ?? []).map(async (p: DBRow) => {
        const cover_url = await firstPhotoUrl(
          supabase,
          p.external_id,
          p.uuid || null
        );

        return {
          external_id: p.external_id,
          title: p.title ?? "",
          address: p.address ?? "",
          city_name: p.city_name ?? "",
          type: p.type,
          total_area: p.total_area,
          floor: null,
          cover_url,
        };
      })
    );

    const debugOut = debug
      ? {
          query: { city, id },
          counts: { items: items.length, cities: cities.length },
          sample: items.slice(0, 5).map((i) => ({
            id: i.external_id,
            city: i.city_name,
            hasCover: !!i.cover_url,
          })),
          note:
            "Города и список берутся из properties; фото ищется по папкам external_id/ и UUID/.",
        }
      : undefined;

    return NextResponse.json({ items, cities, debug: debugOut });
  } catch (e) {
    return NextResponse.json({ error: "Catalog API error" }, { status: 500 });
  }
}

async function firstPhotoUrl(
  supabase: SupabaseClient,
  externalId: string,
  uuid: string | null
): Promise<string | null> {
  const bucket = "photos";
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const candidates: string[] = [externalId];
  if (uuid) candidates.push(uuid);

  for (const folder of candidates) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit: 100 });
    if (error || !files) continue;

    const imageFiles = (files as { name: string }[])
      .filter((f: { name: string }) =>
        /\.(?:jpe?g|png|webp|gif|bmp)$/i.test(f.name)
      )
      .sort((a: { name: string }, b: { name: string }) =>
        a.name.localeCompare(b.name)
      );

    const img = imageFiles[0];
    if (img) {
      const path = `${folder}/${img.name}`;
      return `${base}/storage/v1/object/public/${bucket}/${path}`;
    }
  }

  return null;
}
