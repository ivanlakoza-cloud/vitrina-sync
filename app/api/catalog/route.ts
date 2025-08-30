import { NextResponse } from "next/server";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.RESOLVED_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type RawItem = {
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const n = Number(searchParams.get("n") ?? "60");
    const city = searchParams.get("city") || "";
    const id = searchParams.get("id") || "";

    const url = new URL(`${SB_URL}/rest/v1/view_property_with_cover`);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "updated_at.desc.nullslast");
    url.searchParams.set("limit", String(Math.min(Math.max(n, 1), 200)));
    if (city) url.searchParams.set("city", `eq.${encodeURIComponent(city)}`);
    if (id) url.searchParams.set("external_id", `eq.${encodeURIComponent(id)}`);

    const res = await fetch(url.toString(), {
      headers: { apikey: SB_KEY as string, Authorization: `Bearer ${SB_KEY}` },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `HTTP ${res.status}`, details: err }, { status: 500 });
    }

    const rows = (await res.json()) as RawItem[];

    const cities = Array.from(new Set(rows.map(r => r.city?.trim()).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, "ru"));

    const items = await Promise.all(rows.map(async (r) => ({
      ...r,
      coverUrl: await resolveCoverUrl(r),
      priceRangeLabel: buildPriceRange(r),
    })));

    return NextResponse.json({ items, cities }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

function fmt(num: number) { return new Intl.NumberFormat("ru-RU").format(num); }

function buildPriceRange(r: RawItem): string | null {
  const keys: (keyof RawItem)[] = [
    "price_per_m2_20","price_per_m2_50","price_per_m2_100",
    "price_per_m2_400","price_per_m2_700","price_per_m2_1500",
  ];
  const vals = keys.map(k => (r[k]==null?null:Number(r[k])))
    .filter((n): n is number => !!n && isFinite(n) && n > 0)
    .sort((a,b)=>a-b);
  if (!vals.length) return null;
  const [min, max] = [vals[0], vals[vals.length-1]];
  return min===max ? `от ${fmt(min)} ₽/м²` : `от ${fmt(min)} до ${fmt(max)} ₽/м²`;
}

async function resolveCoverUrl(r: RawItem): Promise<string | null> {
  if (r.cover_storage_path) {
    const p = r.cover_storage_path.replace(/^\/+/, "");
    return `${SB_URL}/storage/v1/object/public/photos/${encodeURIComponent(p)}`;
  }
  if (SB_URL && SB_KEY && r.external_id) {
    try {
      const listUrl = `${SB_URL}/storage/v1/object/list/photos`;
      const body = { prefix: `${r.external_id}/`, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" as const } };
      const resp = await fetch(listUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY as string },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (resp.ok) {
        const arr: { name: string }[] = await resp.json();
        const first = arr?.[0]?.name;
        if (first) return `${SB_URL}/storage/v1/object/public/photos/${encodeURIComponent(`${r.external_id}/${first}`)}`;
      }
    } catch {}
  }
  if (r.cover_ext_url) return r.cover_ext_url;
  return null;
}
