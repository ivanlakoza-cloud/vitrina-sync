// app/api/catalog/route.ts
// Next.js Route Handler (Server Component). Robust to missing DB columns.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;

type ItemOut = {
  external_id: string;
  title: string;
  address: string;
  city_name: string;
  type: string | null;
  total_area: number | null;
  floor: string | number | null;
  cover_url: string | null;
  line2: string;
  prices: string;
};

function env(name: string, fallback?: string): string {
  const v =
    process.env[name] ??
    process.env[name.replace("NEXT_PUBLIC_", "")] ??
    fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function supabaseHeaders() {
  const key = env("NEXT_PUBLIC_SUPABASE_ANON_KEY", env("SUPABASE_ANON_KEY", ""));
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function supabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
}

// Remove a single missing column from the select string
function stripMissing(selectStr: string, missing: string): string {
  const cols = selectStr.split(",").map(s => s.trim()).filter(Boolean);
  const filtered = cols.filter(c => c !== missing);
  return filtered.join(",");
}

async function fetchRows(selectStr: string): Promise<Row[]> {
  const url = `${supabaseUrl()}/rest/v1/property_public_view?select=${encodeURIComponent(selectStr)}&limit=1000`;
  const res = await fetch(url, { headers: supabaseHeaders(), cache: "no-store" });
  if (res.ok) {
    return (await res.json()) as Row[];
  }
  // Try to parse "column property_public_view.xxx does not exist"
  const txt = await res.text();
  const m = txt.match(/column\s+[^.]*\.(\w+)\s+does\s+not\s+exist/i);
  if (m) {
    const missing = m[1];
    const nextSelect = stripMissing(selectStr, missing);
    if (nextSelect === selectStr) {
      throw new Error(txt);
    }
    // retry once recursively
    return fetchRows(nextSelect);
  }
  throw new Error(txt);
}

function idFromRow(r: Row): string {
  return String(r.external_id ?? r.uuid ?? r.id ?? "");
}

function normStr(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function buildPrices(r: Row): string {
  const map: Array<[key: string, label: string]> = [
    ["price_per_m2_20", "20"],
    ["price_per_m2_50", "50"],
    ["price_per_m2_100", "100"],
    ["price_per_m2_400", "400"],
    ["price_per_m2_700", "700"],
    ["price_per_m2_1500", "1500"],
  ];
  const parts: string[] = [];
  for (const [k, label] of map) {
    const v = r[k];
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      parts.push(`от ${label} — ${v}`);
    }
  }
  return parts.join(" · ");
}

export async function GET() {
  try {
    const selectCols = [
      "id",
      "uuid",
      "external_id",
      "address",
      "city",
      "type",
      "total_area",
      "etazh",
      "tip_pomescheniya",
      "price_per_m2_20",
      "price_per_m2_50",
      "price_per_m2_100",
      "price_per_m2_400",
      "price_per_m2_700",
      "price_per_m2_1500",
      "cover_url",
    ].join(",");

    const rows = await fetchRows(selectCols);

    const items: ItemOut[] = [];
    for (const r of rows) {
      const id = idFromRow(r);
      if (!id) continue; // skip rows without any id
      const city = normStr(r.city);
      const address = normStr(r.address);
      const title = [city, address].filter(Boolean).join(", ");

      // line2: tip_pomescheniya + этаж (если есть), иначе type
      const tip = normStr(r.tip_pomescheniya);
      const etazh = normStr(r.etazh);
      const type = normStr(r.type);
      const base = tip || type;
      const line2 = base + (etazh ? ` · этаж ${etazh}` : "");

      const item: ItemOut = {
        external_id: id,
        title,
        address,
        city_name: city,
        type: type || null,
        total_area: r.total_area ?? null,
        floor: etazh || null,
        cover_url: r.cover_url ? String(r.cover_url) : null,
        line2,
        prices: buildPrices(r),
      };
      items.push(item);
    }

    // client-side order (avoid 'order=' errors if column absent)
    items.sort((a, b) => a.title.localeCompare(b.title, "ru"));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: String(e?.message ?? e) });
  }
}
