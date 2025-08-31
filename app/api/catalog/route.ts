import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Important: DO NOT add "use server" here — it breaks static option exports in route handlers.
export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type ItemOut = {
  external_id: string;
  title: string;
  address: string | null;
  city_name: string | null;
  type: string | null;
  total_area: number | null;
  floor: number | null;
  cover_url: string | null;
  line2?: string;
  prices?: string;
};

const BUCKET = "photos";
const IMG_RE = /\.(?:jpe?g|png|webp|gif|bmp)$/i;

function firstNonEmpty<T>(...vals: (T | null | undefined | "" | 0)[]): T | null {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      // @ts-ignore - we know it's the correct generic at runtime
      return v as T;
    }
  }
  return null;
}

function toIntOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatPrice(v: any): string | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("ru-RU");
}

function buildTitle(row: AnyRow): string {
  const city = firstNonEmpty<string>(row.city_name, row.city) ?? "";
  const addr = firstNonEmpty<string>(row.address, row.adres, row.adres_full) ?? "";
  return [city, addr].filter(Boolean).join(", ");
}

function buildLine2(row: AnyRow): string | undefined {
  const tip = firstNonEmpty<string>(row.tip_pomescheniya, row.tip, row.property_type, row.type);
  const floorRaw = firstNonEmpty<string | number>(row.etazh, row.floor, row.floor_num);
  const floor = floorRaw !== null ? String(floorRaw).trim() : null;
  const parts: string[] = [];
  if (tip) parts.push(String(tip));
  if (floor) parts.push(`этаж ${floor}`);
  if (parts.length === 0) {
    const fallback = firstNonEmpty<string>(row.type, row.property_type);
    if (fallback) parts.push(String(fallback));
  }
  return parts.length ? parts.join(" · ") : undefined;
}

function buildPrices(row: AnyRow): string | undefined {
  const labels: Record<string, string> = {
    price_per_m2_20: "20",
    price_per_m2_50: "50",
    price_per_m2_100: "100",
    price_per_m2_400: "400",
    price_per_m2_700: "700",
    price_per_m2_1500: "1500",
  };
  const parts: string[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const val = row[key];
    const formatted = formatPrice(val);
    if (formatted) parts.push(`от ${label} — ${formatted}`);
  }
  return parts.length ? parts.join(" · ") : undefined;
}

function makeSupabase(): SupabaseClient<any, "public", any> | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function firstPhotoUrl(
  client: SupabaseClient<any, "public", any>,
  folder: string
): Promise<string | null> {
  try {
    const list = await client.storage.from(BUCKET).list(folder, { limit: 100 });
    if (list.error || !list.data) return null;
    const img = list.data
      .filter((f: any) => IMG_RE.test(f.name))
      .sort((a: any, b: any) => a.name.localeCompare(b.name))[0];
    if (!img) return null;
    const path = `${folder}/${img.name}`;
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

async function resolveCoverUrl(row: AnyRow): Promise<string | null> {
  const explicit =
    firstNonEmpty<string>(row.cover_url, row.cover_ext_url, row.photo_url, row.image_url) ?? null;
  if (explicit) return explicit;

  // If there is a storage path, try to build public URL from it
  const storagePath =
    firstNonEmpty<string>(row.cover_storage_path, row.photo_storage_path) ?? null;
  const storageBucket =
    firstNonEmpty<string>(row.cover_storage_bucket, row.photo_bucket) ?? BUCKET;
  const supa = makeSupabase();
  if (storagePath && supa) {
    const bucket = storageBucket || BUCKET;
    try {
      const { data } = supa.storage.from(bucket).getPublicUrl(storagePath);
      if (data?.publicUrl) return data.publicUrl;
    } catch {}
  }

  // Otherwise try to list photos/<external_id>/ or photos/<uuid>/
  if (!supa) return null;
  const ext = firstNonEmpty<string>(row.external_id, row.id, row.uuid, row.code);
  if (ext) {
    const u1 = await firstPhotoUrl(supa, String(ext));
    if (u1) return u1;
  }
  const uid = firstNonEmpty<string>(row.uuid, row.id, row.external_id);
  if (uid) {
    const u2 = await firstPhotoUrl(supa, String(uid));
    if (u2) return u2;
  }
  return null;
}

function pickExternalId(row: AnyRow): string {
  return (
    firstNonEmpty<string>(row.external_id, row.id, row.uuid, row.code) ?? ""
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cityFilter = (searchParams.get("city") || "").trim();
    const idFilter = (searchParams.get("id") || "").trim();
    const wantV2 = (searchParams.get("v") || "").trim() === "2";

    // 1) Pull base rows from PostgREST with very tolerant select=*
    // We can't import the Supabase SQL client here; instead, the app already exposes a PostgREST endpoint
    // under the project URL. We'll use fetch to avoid type/deploy issues.
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "";
    if (!supabaseUrl) {
      return NextResponse.json(
        { ok: false, message: "SUPABASE_URL is not configured" },
        { status: 500 }
      );
    }

    // Build query params
    const table = "property_public_view";
    // We fetch all columns, filters will be applied client-side (still fast for modest datasets)
    const qs: string[] = ["select=*"];
    if (cityFilter) {
      // try both "city_name" and "city" filters via or logic
      qs.push(`or=(city_name.eq.${encodeURIComponent(cityFilter)},city.eq.${encodeURIComponent(cityFilter)})`);
    }
    if (idFilter) {
      qs.push(
        `or=(external_id.eq.${encodeURIComponent(idFilter)},id.eq.${encodeURIComponent(
          idFilter
        )},uuid.eq.${encodeURIComponent(idFilter)})`
      );
    }
    const url = `${supabaseUrl}/rest/v1/${table}?${qs.join("&")}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
      Prefer: "return=representation",
      // anon is enough for public selects
      apikey:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        "",
      Authorization: `Bearer ${
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        ""
      }`,
    };

    const baseRes = await fetch(url, { headers, cache: "no-store" });
    if (!baseRes.ok) {
      const txt = await baseRes.text();
      return NextResponse.json(
        { ok: false, message: `Catalog base query failed: ${txt}` },
        { status: 500 }
      );
    }
    const rows = (await baseRes.json()) as AnyRow[];

    // 2) Derive cities directly from rows (fallbacks to support different schemas)
    let cities: string[] = rows
      .map((r) => String(firstNonEmpty<string>(r.city_name, r.city) ?? ""))
      .filter((s) => s && s.trim() !== "");

    // Ban obvious service values
    const banned = new Set(["Обязательность данных"]);
    cities = cities.filter((c) => !banned.has(String(c)));
    cities.sort((a, b) => a.localeCompare(b, "ru"));

    // 3) Hydrate items
    const items: ItemOut[] = [];
    for (const r of rows ?? []) {
      const external_id = pickExternalId(r);
      const city_name =
        firstNonEmpty<string>(r.city_name, r.city) ?? null;
      const address =
        firstNonEmpty<string>(r.address, r.adres, r.adres_full) ?? null;
      const type = firstNonEmpty<string>(r.type, r.property_type) ?? null;
      const total_area = toIntOrNull(
        firstNonEmpty<number | string>(r.total_area, r.ploschad, r.area)
      );
      const floor = toIntOrNull(firstNonEmpty<number | string>(r.etazh, r.floor));

      const title = buildTitle(r);
      const line2 = buildLine2(r);
      const prices = buildPrices(r);
      const cover_url = await resolveCoverUrl(r);

      items.push({
        external_id,
        title,
        address,
        city_name,
        type,
        total_area,
        floor,
        cover_url,
        line2,
        prices,
      });
    }

    if (wantV2) {
      return NextResponse.json({ ok: true, items, cities });
    }
    // legacy shape for homepage (backwards compatible)
    return NextResponse.json({ items, cities });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Catalog API fatal error" },
      { status: 500 }
    );
  }
}
