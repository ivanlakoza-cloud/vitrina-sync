
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  external_id: string;
  address: string | null;
  city_name: string | null;
  type: string | null;
  floor: string | number | null;
  title: string | null;
  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;
};

const PRICE_KEYS: Array<keyof Row> = [
  "price_per_m2_20",
  "price_per_m2_50",
  "price_per_m2_100",
  "price_per_m2_400",
  "price_per_m2_700",
  "price_per_m2_1500",
];

function formatPriceKey(k: string): string {
  const m = k.match(/price_per_m2_(\d+)/);
  return m ? `от ${m[1]}` : k;
}

function typeRu(t: string | null | undefined): string | null {
  if (!t) return null;
  const map: Record<string, string> = {
    office: "офис",
    retail: "ритейл",
    warehouse: "склад",
    industrial: "производство",
    other: "другое",
  };
  return map[t] ?? t;
}

export async function GET() {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE as string;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data, error } = await supabase
      .from("property_public_view")
      .select("*")
      .order("city_name", { ascending: true })
      .order("address", { ascending: true });

    if (error) throw error;

    const items = (data as Row[]).map((r) => {
      const title = [r.city_name, r.address].filter(Boolean).join(", ");

      const etazh = r.floor != null && String(r.floor).trim() !== "" ? `этаж ${r.floor}` : null;
      const tip = r.title && r.title.trim() ? r.title.trim() : typeRu(r.type);
      const subline = [tip, etazh].filter(Boolean).join(" · ") || (typeRu(r.type) ?? "");

      const priceParts: string[] = [];
      for (const key of PRICE_KEYS) {
        const val = (r as any)[key];
        if (val != null && val !== "") {
          priceParts.push(`${formatPriceKey(String(key))} — ${val}`);
        }
      }
      const prices_line = priceParts.join(" · ");

      return {
        external_id: r.external_id,
        cover_url: r.external_id
          ? `${SUPABASE_URL}/storage/v1/object/public/photos/${r.external_id}/img_01.jpg`
          : null,
        title,
        subline,
        prices_line,
      };
    });

    const cities = Array.from(new Set(items.map((i) => (i.title.split(", ")[0] || "").trim())))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ru"));

    const json = {
      ok: true,
      api_version: "v2",
      build_time: "2025-08-31 07:41:10",
      items,
      cities,
    };

    return new NextResponse(JSON.stringify(json), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate",
        "CDN-Cache-Control": "no-store",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? String(e) }, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
