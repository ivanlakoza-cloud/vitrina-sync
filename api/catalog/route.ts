
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase client (server-side)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper: first photo public URL from `photos/<external_id>/...`
async function firstPhotoUrl(id: string): Promise<string | null> {
  if (!id) return null;
  try {
    const list = await supabase.storage.from("photos").list(id, { limit: 100 });
    if (list.error) return null;
    const files = (list.data ?? [])
      .filter((f: { name: string }) => /\.(?:jpe?g|png|webp|gif|bmp)$/i.test(f.name))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
    const img = files[0];
    if (!img) return null;
    const pub = supabase.storage.from("photos").getPublicUrl(`${id}/${img.name}`);
    return pub.data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

type Row = {
  external_id: string | null;
  title: string | null;
  address: string | null;
  city: string | null;          // <— вьюха property_public_view использует city
  type: string | null;
  total_area: number | null;
  floor: string | number | null;
  tip_pomescheniya: string | null;
  etazh: string | number | null;
  price_per_m2_20: number | null;
  price_per_m2_50: number | null;
  price_per_m2_100: number | null;
  price_per_m2_400: number | null;
  price_per_m2_700: number | null;
  price_per_m2_1500: number | null;
};

function pricesLine(r: Row): string {
  const parts: string[] = [];
  const push = (k: number, v: any) => {
    if (v !== null && v !== undefined && `${v}`.trim() !== "") parts.push(`от ${k} — ${v}`);
  };
  push(20,   (r as any).price_per_m2_20);
  push(50,   (r as any).price_per_m2_50);
  push(100,  (r as any).price_per_m2_100);
  push(400,  (r as any).price_per_m2_400);
  push(700,  (r as any).price_per_m2_700);
  push(1500, (r as any).price_per_m2_1500);
  return parts.join(" · ");
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cityFilter = url.searchParams.get("city") ?? "";
  const idFilter   = url.searchParams.get("id") ?? "";

  // Берём только реальные поля из вьюхи.
  let query = supabase
    .from("property_public_view")
    .select(
      [
        "external_id",
        "title",
        "address",
        "city",
        "type",
        "total_area",
        "floor",
        "tip_pomescheniya",
        "etazh",
        "price_per_m2_20",
        "price_per_m2_50",
        "price_per_m2_100",
        "price_per_m2_400",
        "price_per_m2_700",
        "price_per_m2_1500",
      ].join(",")
    )
    .limit(2000);

  if (cityFilter) query = query.eq("city", cityFilter);
  if (idFilter)   query = query.eq("external_id", idFilter);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, message: error.message, code: error.code });
  }

  const banned = new Set<string>(["Обязательность данных"]);
  const citiesSet = new Set<string>();

  const rows: Row[] = (data ?? []) as any;

  const items = await Promise.all(
    rows.map(async (r) => {
      const external_id = (r.external_id ?? "") as string;
      const city = String(r.city ?? "").trim();
      if (city && !banned.has(city)) citiesSet.add(city);
      const address = r.address ?? "";
      const title = [city, address].filter(Boolean).join(", ");

      // tip_pomescheniya + " · этаж N" (если есть). Если нет tip — падение к type.
      const base = r.tip_pomescheniya || r.type || "";
      const etazh = (r.etazh ?? r.floor);
      const subline = [base || null, etazh ? `этаж ${etazh}` : null].filter(Boolean).join(" · ");

      const cover_url = await firstPhotoUrl(external_id);
      return {
        external_id,
        title,                         // "Город, Адрес"
        subline,                       // "тип · этаж N"
        prices_line: pricesLine(r),    // "от 20 — N · от 50 — N · ..."
        city_name: city,               // для обратной совместимости фронта
        address,
        type: r.type,
        floor: r.floor ?? r.etazh ?? null,
        cover_url,
      };
    })
  );

  const cities = Array.from(citiesSet)
    .filter((c: string) => !banned.has(String(c)))
    .sort((a: string, b: string) => a.localeCompare(b, "ru"));

  return NextResponse.json({ ok: true, items, cities });
}
