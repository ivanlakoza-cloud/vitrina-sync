
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BaseRow = {
  id: string;
  address: string | null;
  city: string | null;
  type: string | null;
  total_area: number | null;
};

type ExtRow = {
  property_id: string;
  etazh_avito: string | number | null;
  price_per_m2_20: number | null;
  price_per_m2_50: number | null;
  price_per_m2_100: number | null;
  price_per_m2_400: number | null;
  price_per_m2_700: number | null;
  price_per_m2_1500: number | null;
};

type PhotoRow = {
  property_id: string;
  url: string;
};

type ItemOut = {
  external_id: string;
  title: string;
  line2: string; // tip/etazh string
  prices: string; // "от 20 — N · от 50 — N · ..."
  cover_url: string | null;
};

const VERSION = "api-v3-" + new Date().toISOString();

function money(n: number | null | undefined) {
  if (typeof n !== "number" || !isFinite(n)) return null;
  return Math.round(n).toLocaleString("ru-RU");
}

function buildPrices(ext?: ExtRow): string {
  if (!ext) return "";
  const parts: string[] = [];
  const m: Array<[string, number | null | undefined]> = [
    ["20", ext.price_per_m2_20],
    ["50", ext.price_per_m2_50],
    ["100", ext.price_per_m2_100],
    ["400", ext.price_per_m2_400],
    ["700", ext.price_per_m2_700],
    ["1500", ext.price_per_m2_1500],
  ];
  for (const [lbl, v] of m) {
    const s = money(v as any);
    if (s) parts.push(`от ${lbl} — ${s}`);
  }
  return parts.join(" · ");
}

export async function GET(req: Request) {
  try {
    const url = process.env.SUPABASE_REST_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { ok: false, message: "Missing SUPABASE_REST_URL/SUPABASE_URL or KEY env" },
        { status: 500, headers: { "x-api-version": VERSION } }
      );
    }

    const rest = (path: string, qs: string) =>
      fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}?${qs}`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
        // disable edge cache
        cache: "no-store",
      });

    // 1) Base list (NO 'uuid' here; use 'id')
    const baseSel = [
      "id",
      "address",
      "city",
      "type",
      "total_area",
    ].join(",");

    const baseRes = await rest("property_public_view", f"select={baseSel}");
    if (!baseRes.ok) {
      const txt = await baseRes.text();
      return NextResponse.json(
        { ok: false, step: "base", error: txt },
        { status: 500, headers: { "x-api-version": VERSION } }
      );
    }
    const baseRows = (await baseRes.json()) as BaseRow[];

    // Pack IDs
    const ids = baseRows.map(r => r.id).filter(Boolean);
    const inList = ids.map(i => `"${i}"`).join(",");

    // 2) Ext
    let extMap = new Map<string, ExtRow>();
    if (ids.length) {
      const extSel = [
        "property_id",
        "etazh_avito",
        "price_per_m2_20",
        "price_per_m2_50",
        "price_per_m2_100",
        "price_per_m2_400",
        "price_per_m2_700",
        "price_per_m2_1500",
      ].join(",");
      const extRes = await rest("property_ext", f"select={extSel}&property_id=in.({inList})");
      if (extRes.ok) {
        const extRows = (await extRes.json()) as ExtRow[];
        for (const e of extRows) extMap.set(e.property_id, e);
      }
    }

    // 3) Photos (first by created_at asc)
    let photoMap = new Map<string, string>();
    if (ids.length) {
      const photoSel = "property_id,url";
      const phRes = await rest("photos", f"select={photoSel}&property_id=in.({inList})&order=created_at.asc");
      if (phRes.ok) {
        const phRows = (await phRes.json()) as PhotoRow[];
        for (const p of phRows) if (!photoMap.has(p.property_id)) photoMap.set(p.property_id, p.url);
      }
    }

    // 4) Compose output
    const items: ItemOut[] = baseRows.map(r => {
      const ext = extMap.get(r.id);
      const title = [r.city || "", r.address || ""].filter(Boolean).join(", ");
      const line2Parts: string[] = [];
      if (r.type) line2Parts.push(r.type);
      const etazh = ext?.etazh_avito;
      if (etazh !== null && etazh !== undefined && String(etazh).trim() !== "") {
        line2Parts.push(`этаж ${etazh}`);
      }
      const line2 = line2Parts.join(" · ");
      const prices = buildPrices(ext);
      const cover = photoMap.get(r.id) || null;

      return {
        external_id: r.id,
        title,
        line2,
        prices,
        cover_url: cover,
      };
    });

    // Cities list
    const citySet = new Set<string>();
    for (const r of baseRows) {
      const c = (r.city || "").trim();
      if (c) citySet.add(c);
    }
    const cities = Array.from(citySet).sort((a, b) => a.localeCompare(b, "ru"));

    const res = NextResponse.json(
      { ok: true, items, cities, version: VERSION },
      { headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          "x-api-version": VERSION
        }
      }
    );
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: String(err?.message || err), version: VERSION },
      { status: 500, headers: { "x-api-version": VERSION } }
    );
  }
}
