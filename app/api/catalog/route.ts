import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient<any, "public", any>;

// Build public URL for a cover image using only Supabase Storage.
// 1) If the row already has cover_storage_path, use it.
// 2) Else take the first file inside photos/<external_id>/
// 3) If nothing found — return null (frontend should show /no-photo.jpg)
async function buildCoverUrl(
  client: AnyClient,
  externalId: string,
  coverPath: string | null
): Promise<string | null> {
  const bucket = "photos";

  // Direct path set in DB
  if (coverPath) {
    const { data } = client.storage.from(bucket).getPublicUrl(coverPath);
    return data?.publicUrl ?? null;
  }

  // Try list photos/<external_id>/
  const prefix = `${externalId}/`;
  const { data: files, error } = await client.storage.from(bucket).list(prefix, {
    limit: 1,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) {
    console.error("storage.list error:", error);
    return null;
  }
  const first = files?.[0];
  if (!first) return null;

  const { data } = client.storage
    .from(bucket)
    .getPublicUrl(`${prefix}${first.name}`);
  return data?.publicUrl ?? null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const city = (url.searchParams.get("city") || "").trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Base query to view
    let query = supabase
      .from("view_property_with_cover")
      .select(
        "external_id,title,address,city,cover_storage_path,updated_at",
      )
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (city) {
      query = query.eq("city", city);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("view query error:", error);
      return NextResponse.json(
        { ok: false, error: error.message, items: [], cities: [] },
        { status: 500 },
      );
    }

    // Build images strictly from Storage (no external/Yandex links).
    const items = await Promise.all(
      (rows ?? []).map(async (r) => {
        const coverUrl =
          (await buildCoverUrl(
            supabase as AnyClient,
            r.external_id,
            r.cover_storage_path,
          )) ?? null;

        return {
          external_id: r.external_id as string,
          title: r.title as string | null,
          address: r.address as string | null,
          city: r.city as string | null,
          coverUrl,
          updated_at: r.updated_at as string | null,
        };
      }),
    );

    // Distinct cities from all rows (ignoring nulls/empties)
    const cities = Array.from(
      new Set((rows ?? []).map((r) => (r.city || "").trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "ru"));

    return NextResponse.json({ ok: true, items, cities });
  } catch (e: any) {
    console.error("GET /api/catalog error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
