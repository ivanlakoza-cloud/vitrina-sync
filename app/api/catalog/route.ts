// app/api/catalog/route.ts
// Robust catalog API with graceful fallback for missing DB columns
// - Tries to select preferred columns; if PostgREST returns 42703 (column missing),
//   removes the missing column and retries automatically.
// - Computes title, line2, prices on the server.
// - Keeps fast PostgREST access (no Supabase client).

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

const TABLE = "property_public_view";

const PREFERRED_COLS = [
  // identity & main props (order matters but is not strict)
  "uuid",
  "id",
  "external_id",
  "address",
  "city",
  "city_name",
  "type",
  "tip_pomescheniya",
  "etazh",
  "total_area",
  // prices (some may be missing in the view)
  "price_per_m2_20",
  "price_per_m2_50",
  "price_per_m2_100",
  "price_per_m2_400",
  "price_per_m2_700",
  "price_per_m2_1500",
];

const PRICE_KEYS = [
  ["price_per_m2_20", "20"],
  ["price_per_m2_50", "50"],
  ["price_per_m2_100", "100"],
  ["price_per_m2_400", "400"],
  ["price_per_m2_700", "700"],
  ["price_per_m2_1500", "1500"],
] as const;

function env(name: string): string {
  const v =
    process.env["NEXT_PUBLIC_" + name] ??
    process.env[name] ??
    "";
  return v;
}

function postgrestUrl(table: string, qs: string): string {
  const base = env("SUPABASE_URL").replace(/\/+$/, "");
  return `${base}/rest/v1/${table}?${qs}`;
}

function authHeaders(): HeadersInit {
  const key = env("SUPABASE_ANON_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function buildSelect(cols: string[]): string {
  // Deduplicate & keep order
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const c of cols) {
    if (!c) continue;
    const k = String(c).trim();
    if (k && !seen.has(k)) {
      seen.add(k);
      ordered.push(k);
    }
  }
  return ordered.join(",");
}

async function fetchWithFallback(cols: string[]): Promise<AnyRow[]> {
  // Try up to 8 times removing missing columns reported by PostgREST
  let wanted = cols.slice();
  let attempt = 0;
  while (attempt < 8 && wanted.length > 0) {
    const selectCols = buildSelect(wanted);
    const qs = [
      `select=${encodeURIComponent(selectCols)}`,
      "order=city.asc",
      "limit=600",
    ].join("&");
    const url = postgrestUrl(TABLE, qs);
    const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });

    if (res.ok) {
      return (await res.json()) as AnyRow[];
    }

    // If it's a "column ... does not exist" -> drop that column and retry
    let dropCol: string | null = null;
    try {
      const err = await res.json();
      if (err && err.message && typeof err.message === "string") {
        // Example: 'column property_public_view.etazh does not exist'
        const m = err.message.match(
          /column\s+[a-zA-Z0-9_."]*\.?("?)([a-zA-Z0-9_]+)\1\s+does\s+not\s+exist/i
        );
        if (m) dropCol = m[2];
      }
    } catch {
      // ignore parsing errors
    }

    if (dropCol) {
      wanted = wanted.filter((c) => c !== dropCol);
      attempt++;
      continue;
    }

    // Not a missing-column error -> throw up
    const text = await res.text();
    throw new Error(`PostgREST error (${res.status}): ${text}`);
  }

  // Nothing left to select — return empty
  return [];
}

function buildPrices(row: AnyRow): string {
  const parts: string[] = [];
  for (const [key, label] of PRICE_KEYS) {
    if (key in row) {
      const v = row[key];
      if (v !== null && v !== undefined && v !== "") {
        parts.push(`от ${label} — ${v}`);
      }
    }
  }
  return parts.join(" · ");
}

function firstNonEmpty(...vals: any[]): string {
  for (const v of vals) {
    if (v !== null && v !== undefined) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "";
}

export async function GET(req: Request) {
  try {
    // 1) Load rows with graceful column fallback
    const rows = await fetchWithFallback(PREFERRED_COLS);

    // 2) Map to public items
    const items = rows.map((r: AnyRow) => {
      // external_id preference order
      const external_id =
        firstNonEmpty(r["external_id"], r["uuid"], r["id"]) || "";

      const city = firstNonEmpty(r["city_name"], r["city"]);
      const address = firstNonEmpty(r["address"]);
      const title = [city, address].filter(Boolean).join(", ");

      // line2: tip_pomescheniya + этаж N ; fallback к type
      const tip = firstNonEmpty(r["tip_pomescheniya"]);
      const etazh = r.hasOwnProperty("etazh") ? firstNonEmpty(r["etazh"]) : "";
      const type = firstNonEmpty(r["type"]);
      const line2 = tip
        ? (etazh ? `${tip} · этаж ${etazh}` : tip)
        : type;

      const prices = buildPrices(r);

      return {
        external_id,
        title,
        address,
        city_name: city,
        type,
        total_area: r["total_area"] ?? null,
        floor: r["floor"] ?? null,
        cover_url: null as string | null, // filled later when we add photos
        line2,
        prices,
      };
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    return NextResponse.json(
      { ok: false, message: msg },
      { status: 500 }
    );
  }
}
