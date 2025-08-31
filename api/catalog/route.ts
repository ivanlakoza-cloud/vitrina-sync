
import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type PriceRow = {
  price_per_m2_20: number | null;
  price_per_m2_50: number | null;
  price_per_m2_100: number | null;
  price_per_m2_400: number | null;
  price_per_m2_700: number | null;
  price_per_m2_1500: number | null;
};

type PubRow = {
  id: string; // external id (folder in storage)
  address: string | null;
  city: string | null;
  type: string | null;
  total_area: number | null;
  floor?: number | null;
};

type PropRow = PriceRow & {
  id: string;
  tip_pomescheniya: string | null;
  etazh: string | number | null;
};

function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }
function notEmpty<T>(x: T | null | undefined): x is T { return x !== null && x !== undefined; }

async function firstPhotoUrl(supabase: SupabaseClient, externalId: string): Promise<string | null> {
  // look for the first file in photos/<externalId>/
  const { data, error } = await supabase
    .from("storage.objects")
    .select("name")
    .eq("bucket_id", "photos")
    .ilike("name", `${externalId}/%`)
    .order("name", { ascending: true })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  const path = data[0].name as string;
  const { data: pub } = supabase.storage.from("photos").getPublicUrl(path);
  return pub?.publicUrl ?? null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cityQuery = (url.searchParams.get("city") || "").trim();
  const idQuery = (url.searchParams.get("id") || "").trim();

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnon);

  // base select from public view
  let pubSel = supabase
    .from("property_public_view")
    .select("id,address,city,type,total_area,floor")
    .order("city", { ascending: true }) as any;

  if (cityQuery) pubSel = pubSel.eq("city", cityQuery);
  if (idQuery) pubSel = pubSel.eq("id", idQuery);

  const { data: pubRows, error: pubErr } = await pubSel;
  if (pubErr) {
    return NextResponse.json({ error: "Catalog API query error", detail: pubErr }, { status: 500 });
  }

  const ids = (pubRows ?? []).map((r: PubRow) => r.id);
  // pull additional fields from base table in one go
  let propRows: PropRow[] = [];
  if (ids.length) {
    const { data: propsData, error: propsErr } = await supabase
      .from("properties")
      .select("id,tip_pomescheniya,etazh,price_per_m2_20,price_per_m2_50,price_per_m2_100,price_per_m2_400,price_per_m2_700,price_per_m2_1500")
      .in("id", ids);
    if (propsErr) {
      return NextResponse.json({ error: "Catalog API query error", detail: propsErr }, { status: 500 });
    }
    propRows = (propsData || []) as PropRow[];
  }
  const propsById = new Map(propRows.map(r => [r.id, r]));

  // build items with covers
  const items = await Promise.all(
    (pubRows || []).map(async (p: PubRow) => {
      const extra = propsById.get(p.id);
      const cover_url = await firstPhotoUrl(supabase, p.id);
      return {
        external_id: p.id,
        address: p.address,
        city_name: p.city,
        tip_pomescheniya: extra?.tip_pomescheniya ?? null,
        etazh: (extra?.etazh ?? p.floor ?? null),
        // keep for backwards compatibility, but FE can ignore
        type: p.type,
        total_area: p.total_area,
        cover_url,
        // price fields as-is; FE will format only those present
        price_per_m2_20: extra?.price_per_m2_20 ?? null,
        price_per_m2_50: extra?.price_per_m2_50 ?? null,
        price_per_m2_100: extra?.price_per_m2_100 ?? null,
        price_per_m2_400: extra?.price_per_m2_400 ?? null,
        price_per_m2_700: extra?.price_per_m2_700 ?? null,
        price_per_m2_1500: extra?.price_per_m2_1500 ?? null,
        // convenience headline "Город, Адрес"
        headline: [p.city, p.address].filter(Boolean).join(", "),
      };
    })
  );

  // cities list from view + optional cities table
  const viewCities = uniq((pubRows || []).map((r: PubRow) => r.city).filter(notEmpty));
  let cities = viewCities;
  // try to union with cities table if present, ignore errors
  try {
    const { data: cityRows } = await supabase.from("cities").select("name");
    if (Array.isArray(cityRows)) {
      const names = cityRows.map((c: any) => c.name).filter(notEmpty);
      cities = uniq(cities.concat(names));
    }
  } catch {}

  // filter out service/invalid names
  const banned = new Set(["Обязательность данных", "обязательность данных"]);
  cities = cities.filter(c => !banned.has(String(c)));

  cities.sort((a, b) => a.localeCompare(b, "ru"));

  return NextResponse.json({
    items,
    cities,
    debug: {
      query: { city: cityQuery, id: idQuery },
      counts: { items: items.length, cities: cities.length },
      sample: items.slice(0, 5).map(i => ({ id: i.external_id, city: i.city_name, hasCover: !!i.cover_url })),
      note: "price_* поля отдаются как есть; фронт форматирует только непустые значения (от 20, от 50, ...)."
    }
  });
}
