// app/api/catalog/route.ts
import { NextResponse } from "next/server";

/**
 * Robust /api/catalog that:
 * - Works with any of these id columns: external_id | uuid | id | property_id
 * - Tolerates missing columns (etazh, tip_pomescheniya, city_name, etc.)
 * - Fills cover_url either from the view itself or from the `photos` table (best effort)
 * - Builds title = "Город, Адрес", line2 and prices as agreed
 */

type J = Record<string, any>;

function env(name: string): string | undefined {
  return process.env[name];
}

function supaURL(): string {
  return (
    env("SUPABASE_URL") ||
    env("NEXT_PUBLIC_SUPABASE_URL") ||
    ""
  );
}

function supaKey(): string {
  return (
    env("SUPABASE_ANON_KEY") ||
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    env("SUPABASE_SERVICE_ROLE_KEY") ||
    ""
  );
}

async function rest(table: string, qs: string): Promise<Response> {
  const url = supaURL();
  const key = supaKey();
  if (!url || !key) {
    const err = !url ? "SUPABASE_URL" : "SUPABASE_ANON_KEY";
    return new Response(
      JSON.stringify({ items: [], error: `Missing env: ${err}` }),
      { status: 500, headers: { "content-type": "application/json; charset=utf-8" } }
    );
  }
  const endpoint = `${url.replace(/\/?$/, "")}/rest/v1/${table}?${qs}`;
  return fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    // Next will cache aggressively; we want fresh
    cache: "no-store",
  });
}

// Try to fetch a sample row to discover available columns
async function getSample(): Promise<J | null> {
  const r = await rest("property_public_view", "select=*&limit=1");
  if (!r.ok) return null;
  const a = await r.json();
  if (Array.isArray(a) && a.length > 0) return a[0] as J;
  return null;
}

function pickIdKey(sample: J | null): string | null {
  const candidates = ["external_id", "uuid", "id", "property_id"];
  for (const k of candidates) {
    if (sample && Object.prototype.hasOwnProperty.call(sample, k)) return k;
  }
  // as a last resort assume "id"
  return sample ? Object.keys(sample).includes("id") ? "id" : null : null;
}

function have(sample: J | null, k: string): boolean {
  return !!(sample && Object.prototype.hasOwnProperty.call(sample, k));
}

// Safe number-ish format (no currency suffix here, UI decides)
function fmt(v: any): string {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  // group by spaces
  return n.toLocaleString("ru-RU");
}

function buildPrices(row: J, keys: string[]): string {
  const label: Record<string,string> = {
    price_per_m2_20: "20",
    price_per_m2_50: "50",
    price_per_m2_100: "100",
    price_per_m2_400: "400",
    price_per_m2_700: "700",
    price_per_m2_1500: "1500",
  };
  const parts: string[] = [];
  for (const k of keys) {
    const v = row[k];
    if (v !== null && v !== undefined && v !== "") {
      parts.push(`от ${label[k] ?? k.replace("price_per_m2_", "")} — ${fmt(v)}`);
    }
  }
  return parts.join(" · ");
}

function makeTitle(row: J): string {
  const city = row.city_name ?? row.city ?? "";
  const addr = row.address ?? "";
  return [city, addr].filter(Boolean).join(", ");
}

function makeLine2(row: J): string {
  const tip = row.tip_pomescheniya ?? row.type ?? "";
  const etazh = row.etazh ?? row.floor ?? null;
  const et = etazh !== null && etazh !== undefined && String(etazh).trim() !== "" ? ` · этаж ${etazh}` : "";
  return `${tip}${et}`.trim();
}

function firstNonEmpty(row: J, cols: string[]): any {
  for (const c of cols) {
    if (row[c] !== null && row[c] !== undefined && String(row[c]).trim() !== "") return row[c];
  }
  return null;
}

async function fetchPhotosMap(ids: string[], sampleRow: J | null): Promise<Record<string,string>> {
  // Discover photos table columns
  let photoSample: J | null = null;
  try {
    const s = await rest("photos", "select=*&limit=1");
    if (s.ok) {
      const arr = await s.json();
      if (Array.isArray(arr) && arr.length) photoSample = arr[0] as J;
    }
  } catch {}
  if (!photoSample) return {};

  const idCols = ["property_id", "external_id", "uuid", "object_id", "prop_id", "property_uuid", "property"];
  const urlCols = ["public_url", "url", "cover_url", "src", "path"];
  const idCol = idCols.find(c => Object.prototype.hasOwnProperty.call(photoSample!, c));
  const urlCol = urlCols.find(c => Object.prototype.hasOwnProperty.call(photoSample!, c));
  if (!idCol || !urlCol) return {};

  // Build IN filter (escape commas/parentheses in UUIDs not needed)
  const inList = ids.map(x => `${x}`).join(",");
  const qs = [
    `select=${idCol},${urlCol}`,
    `${idCol}=in.(${inList})`,
    "order=position.asc,created_at.asc",
  ].join("&");

  const r = await rest("photos", qs);
  if (!r.ok) return {};

  const rows = await r.json() as J[];
  const map: Record<string,string> = {};
  for (const p of rows) {
    const pid = String(p[idCol]);
    let u = String(p[urlCol] ?? "");
    if (u && !/^https?:\/\//i.test(u)) {
      // looks like a storage path; assume bucket "photos"
      const url = supaURL().replace(/\/?$/, "");
      u = `${url}/storage/v1/object/public/photos/${u.replace(/^\/+/, "")}`;
    }
    if (pid && u && !map[pid]) map[pid] = u;
  }
  return map;
}

export async function GET(req: Request) {
  try {
    // 1) Discover columns
    const sample = await getSample();
    const idKey = pickIdKey(sample);
    if (!idKey) {
      // couldn't detect id column — return soft error
      return NextResponse.json({ items: [], error: "Id column not found in property_public_view" });
    }

    // 2) Build a safe select list from existent columns only
    const possible = [
      idKey,
      "address",
      "city",
      "city_name",
      "type",
      "tip_pomescheniya",
      "etazh",
      // price columns
      "price_per_m2_20",
      "price_per_m2_50",
      "price_per_m2_100",
      "price_per_m2_400",
      "price_per_m2_700",
      "price_per_m2_1500",
      // maybe cover in the view
      "cover_url",
    ];
    const present = possible.filter(k => have(sample, k));
    const selectCols = present.join(",");

    // 3) Load base rows (limit to reasonable amount)
    const baseQs = [
      `select=${selectCols || "*"}`,
      "order=city.asc,city_name.asc,address.asc",
      "limit=500",
    ].join("&");
    const baseRes = await rest("property_public_view", baseQs);
    if (!baseRes.ok) {
      const txt = await baseRes.text();
      return NextResponse.json({ items: [], error: txt });
    }
    const baseRows = await baseRes.json() as J[];

    // 4) If we don't have cover_url in the view, try photos table
    let photoMap: Record<string,string> = {};
    if (!present.includes("cover_url") && baseRows.length > 0) {
      const ids = baseRows.map(r => String(r[idKey!])).filter(Boolean);
      photoMap = await fetchPhotosMap(ids, sample);
    }

    const priceKeys = possible.filter(k => k.startsWith("price_per_m2_") && present.includes(k));

    const items = baseRows.map(r => {
      const id = String(r[idKey!]);
      const cover = present.includes("cover_url")
        ? (r.cover_url ?? null)
        : (photoMap[id] ?? null);
      return {
        external_id: id,
        title: makeTitle(r),
        address: r.address ?? "",
        city_name: r.city_name ?? r.city ?? "",
        type: r.type ?? "",
        total_area: r.total_area ?? null, // if present — harmless if missing
        floor: r.etazh ?? r.floor ?? null,
        cover_url: cover,
        line2: makeLine2(r),
        prices: buildPrices(r, priceKeys),
      };
    });

    // 5) Cities list
    const citiesSet = new Set<string>();
    for (const r of baseRows) {
      const c = (r.city_name ?? r.city ?? "").toString().trim();
      if (c) citiesSet.add(c);
    }
    const cities = Array.from(citiesSet).sort((a, b) => a.localeCompare(b, "ru"));

    return NextResponse.json({ items, cities });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: String(e?.message || e) }, { status: 500 });
  }
}
