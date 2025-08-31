
"use server";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type ItemOut = {
  external_id: string;
  title: string;
  line2: string | null;
  prices: string | null;
  cover_url: string | null;
};

function getEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function resolveRestUrl(): string {
  const base =
    process.env.SUPABASE_REST_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  if (!base) throw new Error("No Supabase URL env");
  return base.includes("/rest/v1") ? base : `${base}/rest/v1`;
}

function resolveStorageBase(): string {
  // for public object URL construction
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_REST_URL ||
    "";
  if (!base) throw new Error("No Supabase URL env");
  return base.replace(/\/rest\/v1\/?$/, "");
}

function resolveApiKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

async function rest(path: string, qs?: string) {
  const url = `${resolveRestUrl()}/${path}${qs ? (qs.startsWith("?") ? qs : `?${qs}`) : ""}`;
  const key = resolveApiKey();
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    // Do not cache DB responses
    cache: "no-store",
  });
  return res;
}

type StorageFile = { name: string; updated_at?: string; created_at?: string };

async function listFirstImagePublicUrl(folder: string): Promise<string | null> {
  if (!folder) return null;
  const base = resolveStorageBase();
  const key = resolveApiKey();
  // Supabase storage list endpoint
  const listUrl = `${base}/storage/v1/object/list/photos`;
  try {
    const res = await fetch(listUrl, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prefix: folder,
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      }),
    });
    if (!res.ok) return null;
    const files: StorageFile[] = await res.json();
    const img = files
      .filter((f: StorageFile) => /\.(?:jpe?g|png|webp|gif|bmp)$/i.test(String(f.name || "")))
      .sort((a: StorageFile, b: StorageFile) => String(a.name).localeCompare(String(b.name)))[0];
    if (!img) return null;
    const path = `${folder}/${img.name}`.replace(/\/+/g, "/");
    return `${base}/storage/v1/object/public/photos/${path}`;
  } catch {
    return null;
  }
}

function coalesce<T>(...vals: T[]): T | null {
  for (const v of vals) {
    // @ts-ignore
    if (v !== undefined && v !== null && String(v) !== "") return v;
  }
  return null;
}

function buildPrices(ext: AnyRow): string | null {
  const map: Array<[string, string]> = [
    ["price_per_m2_20", "20"],
    ["price_per_m2_50", "50"],
    ["price_per_m2_100", "100"],
    ["price_per_m2_400", "400"],
    ["price_per_m2_700", "700"],
    ["price_per_m2_1500", "1500"],
  ];
  const parts: string[] = [];
  for (const [k, label] of map) {
    const v = ext?.[k];
    if (v !== null && v !== undefined && String(v) !== "") {
      parts.push(`от ${label} — ${v}`);
    }
  }
  return parts.length ? parts.join(" · ") : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;
    const cityParam = params.get("city")?.trim() || "";
    const idParam = params.get("id")?.trim() || "";

    // 1) Base rows (select * to avoid column name drift)
    const baseRes = await rest("property_public_view", "select=*");
    if (!baseRes.ok) {
      const txt = await baseRes.text();
      return NextResponse.json({ ok: false, message: txt || "Query error (base)" }, { status: 500 });
    }
    const baseRows: AnyRow[] = (await baseRes.json()) ?? [];

    // Optional client-side filtering when schema varies
    const filteredRows = baseRows.filter((r) => {
      const extId = coalesce(r.external_id, r.id, r.uuid, r.pk) as any;
      const city = coalesce(r.city_name, r.city) as any;
      const passCity = cityParam ? String(city || "").trim() === cityParam : true;
      const passId = idParam ? String(extId || "").trim() === idParam : true;
      return passCity && passId;
    });

    // Collect identifiers
    const exts: string[] = [];
    for (const r of filteredRows) {
      const extId = (coalesce(r.external_id, r.id, r.uuid, r.pk) as any) || "";
      if (extId) exts.push(String(extId));
    }

    // 2) Extension rows (extra fields like prices, tip_pomescheniya, etazh)
    let extMap: Record<string, AnyRow> = {};
    if (exts.length) {
      const inList = exts.map((e) => `"${String(e).replace(/"/g, '\\"')}"`).join(",");
      const qs = `select=*&external_id=in.(${inList})`;
      const extRes = await rest("property_ext", qs);
      if (extRes.ok) {
        const extRows: AnyRow[] = (await extRes.json()) ?? [];
        extMap = Object.fromEntries(extRows.map((e) => [String(e.external_id), e]));
      }
    }

    // 3) Hydrate output
    const items: ItemOut[] = [];
    for (const r of filteredRows) {
      const extId = (coalesce(r.external_id, r.id, r.uuid, r.pk) as any) || "";
      const ext = extMap[extId] || r || {};

      const city = (coalesce(r.city_name, r.city) as any) || "";
      const address = (coalesce(r.address, r.addr, r.full_address) as any) || "";
      const title = [city, address].filter(Boolean).join(", ");

      const tip = (coalesce(ext.tip_pomescheniya, r.tip_pomescheniya) as any) || (r.type ?? "");
      const floorRaw = coalesce(ext.etazh, r.etazh, r.floor) as any;
      const floor = floorRaw !== null ? String(floorRaw).trim() : "";
      const line2 = [tip, floor ? `этаж ${floor}` : ""].filter(Boolean).join(" · ") || null;

      const prices = buildPrices(ext);

      // cover: 1) explicit url 2) storage path 3) search in folders by extId/uuid
      let cover: string | null =
        (coalesce(ext.cover_ext_url, r.cover_ext_url, ext.cover_url, r.cover_url) as any) || null;

      if (!cover) {
        const storagePath = (coalesce(ext.cover_storage_path, r.cover_storage_path) as any) || "";
        if (storagePath) {
          const base = resolveStorageBase();
          cover = `${base}/storage/v1/object/public/photos/${String(storagePath).replace(/^\/+/, "")}`;
        }
      }
      if (!cover) {
        // try to list from storage by folders
        cover =
          (await listFirstImagePublicUrl(String(extId))) ||
          (await listFirstImagePublicUrl(String(coalesce(ext.uuid, r.uuid) || ""))) ||
          null;
      }

      items.push({
        external_id: String(extId),
        title,
        line2,
        prices,
        cover_url: cover,
      });
    }

    // Cities list
    const banned = new Set(["Обязательность данных"]);
    let cities: string[] = [];
    for (const r of baseRows) {
      const c = String(coalesce(r.city_name, r.city) || "").trim();
      if (!c || banned.has(c)) continue;
      if (!cities.includes(c)) cities.push(c);
    }
    cities.sort((a, b) => a.localeCompare(b, "ru"));

    return NextResponse.json(
      { items, cities },
      {
        headers: {
          "Cache-Control": "no-store",
          "x-api-version": "2",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: String(e?.message || e) }, { status: 500 });
  }
}
