import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Row = {
  id?: string | null;
  uuid?: string | null;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  type?: string | null;
  etazh?: number | null;
  tip_pomescheniya?: string | null;
  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;
};

type ItemOut = {
  external_id: string;
  cover_url: string | null;
  title: string; // "Город, Адрес"
  address: string | null;
  city_name: string | null;
  type: string | null;
  tip_pomescheniya: string | null;
  etazh: number | null;
  prices_line: string; // "от 20 — N · от 50 — N · ..."
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_KEY =
  (process.env.SUPABASE_SERVICE_ROLE_KEY as string) ||
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);

function makeClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase env vars are missing");
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function priceLine(r: Row): string {
  const parts: string[] = [];
  const push = (label: string, val: number | null | undefined) => {
    if (val != null) parts.push(`${label} — ${val}`);
  };
  push("от 20", r.price_per_m2_20);
  push("от 50", r.price_per_m2_50);
  push("от 100", r.price_per_m2_100);
  push("от 400", r.price_per_m2_400);
  push("от 700", r.price_per_m2_700);
  push("от 1500", r.price_per_m2_1500);
  return parts.join(" · ");
}

async function resolveCover(supabase: SupabaseClient, folders: (string | null | undefined)[]): Promise<string | null> {
  const bucket = supabase.storage.from("photos");
  for (const f of folders) {
    const folder = (f ?? "").trim();
    if (!folder) continue;
    const { data, error } = await bucket.list(folder, { limit: 100 });
    if (error || !data || data.length === 0) continue;
    const img = data
      .filter((fi: { name: string }) => /\.(?:jpe?g|png|webp|gif|bmp)$/i.test(fi.name))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))[0];
    if (!img) continue;
    // public bucket expected
    return `${SUPABASE_URL}/storage/v1/object/public/photos/${folder}/${img.name}`;
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const cityFilter = url.searchParams.get("city")?.trim() ?? "";
    const supabase = makeClient();

    const selectCols = [
      "uuid",
      "id",
      "title",
      "address",
      "city",
      "type",
      "etazh",
      "tip_pomescheniya",
      "price_per_m2_20",
      "price_per_m2_50",
      "price_per_m2_100",
      "price_per_m2_400",
      "price_per_m2_700",
      "price_per_m2_1500",
    ].join(",");

    let query = supabase.from("property_public_view").select(selectCols);
    if (cityFilter) query = query.eq("city", cityFilter);

    const { data, error } = await query.limit(2000);
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    const rows: Row[] = Array.isArray(data) ? (data as Row[]) : [];
    // gather unique cities
    let cities = Array.from(
      new Set(rows.map((r) => (r.city ?? "").trim()).filter(Boolean))
    );
    cities.sort((a, b) => a.localeCompare(b, "ru"));

    const items: ItemOut[] = [];
    for (const r of rows) {
      const title = [r.city, r.address].filter(Boolean).join(", ");

      const typeOrTip = (r.tip_pomescheniya ?? r.type ?? "").trim();
      const etazhPart = r.etazh == null ? "" : ` · этаж ${r.etazh}`;
      const line2 = `${typeOrTip}${etazhPart}`.trim();

      const prices_line = priceLine(r);

      const external_id = String(r.uuid ?? r.id ?? "");

      const cover_url = await resolveCover(supabase, [r.uuid, r.id, r.title]);

      items.push({
        external_id,
        cover_url,
        title,
        address: r.address ?? null,
        city_name: r.city ?? null,
        type: r.type ?? null,
        tip_pomescheniya: r.tip_pomescheniya ?? null,
        etazh: r.etazh ?? null,
        prices_line,
      });
    }

    const debug = {
      query: { city: cityFilter },
      counts: { items: items.length, cities: cities.length },
      sample: items.slice(0, 5).map((i) => ({ id: i.external_id, title: i.title, hasCover: !!i.cover_url })),
      note: "Using property_public_view.city (no city_name) and uuid/id as external_id",
    };

    return NextResponse.json({ items, cities, debug });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
