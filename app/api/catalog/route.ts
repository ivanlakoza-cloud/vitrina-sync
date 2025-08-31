import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

const REST_BASE =
  process.env.SUPABASE_REST_URL ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}/rest/v1`
    : (process.env.SUPABASE_URL
        ? `${process.env.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1`
        : ""));

const API_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

function badEnv() {
  return !REST_BASE || !API_KEY;
}

async function rest(table: string, query: string) {
  const url = `${REST_BASE}/${table}?${query}`;
  return fetch(url, {
    method: "GET",
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Prefer: "count=none",
    },
    cache: "no-store",
  });
}

function uniqSorted(arr: (string | null | undefined)[]) {
  const set = new Set(arr.filter(Boolean).map((x) => String(x).trim()));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

function buildPriceLine(ext: AnyRow | undefined) {
  if (!ext) return "";
  const keys: [string, string][] = [
    ["price_per_m2_20", "20"],
    ["price_per_m2_50", "50"],
    ["price_per_m2_100", "100"],
    ["price_per_m2_400", "400"],
    ["price_per_m2_700", "700"],
    ["price_per_m2_1500", "1500"],
  ];
  const parts: string[] = [];
  for (const [k, label] of keys) {
    const v = ext[k];
    if (v !== null && v !== undefined && v !== "") {
      parts.append ? parts.append("") : null; // no-op (defensive for some bundlers)
      parts.push(`от ${label} — ${v}`);
    }
  }
  return parts.join(" · ");
}

export async function GET() {
  const version = `api-v3-${new Date().toISOString()}`;

  if (badEnv()) {
    return NextResponse.json(
      { ok: false, message: "Supabase REST env is not configured", version },
      {
        status: 500,
        headers: { "x-api-version": version, "Cache-Control": "no-store" },
      }
    );
  }

  try {
    // 1) Базовые поля из представления
    const baseSel = [
      "id",
      "address",
      "city",
      "type"
    ].join(",");
    const baseRes = await rest(
      "property_public_view",
      `select=${encodeURIComponent(baseSel)}&order=city.asc,address.asc&limit=2000`
    );
    if (!baseRes.ok) {
      const text = await baseRes.text();
      return NextResponse.json(
        { ok: false, message: `property_public_view: ${text}`, version },
        { status: 500, headers: { "x-api-version": version, "Cache-Control": "no-store" } }
      );
    }
    const baseRows: AnyRow[] = await baseRes.json();

    const ids: string[] = baseRows
      .map((r) => (r.id ?? "").toString())
      .filter((x) => x);

    // 2) Расширения/цены/этаж
    let extMap: Record<string, AnyRow> = {};
    if (ids.length) {
      const extSel = [
        "property_id",
        "tip_pomescheniya",
        "etazh",
        "price_per_m2_20",
        "price_per_m2_50",
        "price_per_m2_100",
        "price_per_m2_400",
        "price_per_m2_700",
        "price_per_m2_1500",
      ].join(",");
      const inList = encodeURIComponent(`(${ids.join(",")})`);
      const extRes = await rest(
        "property_ext",
        `select=${encodeURIComponent(extSel)}&property_id=in.${inList}`
      );
      if (extRes.ok) {
        const extRows: AnyRow[] = await extRes.json();
        for (const e of extRows) {
          extMap[String(e.property_id)] = e;
        }
      }
    }

    // 3) Фото (если есть таблица photos с property_id, url)
    let photoMap: Record<string, string> = {};
    if (ids.length) {
      const photoSel = ["property_id", "url", "created_at"].join(",");
      const inList = encodeURIComponent(`(${ids.join(",")})`);
      const phRes = await rest(
        "photos",
        `select=${encodeURIComponent(photoSel)}&property_id=in.${inList}&order=created_at.asc`
      );
      if (phRes.ok) {
        const photos: AnyRow[] = await phRes.json();
        for (const p of photos) {
          const k = String(p.property_id);
          if (!photoMap[k] && p.url) {
            photoMap[k] = p.url;
          }
        }
      }
    }

    const items = baseRows.map((r) => {
      const id = String(r.id);
      const city = (r.city ?? "").toString().trim();
      const address = (r.address ?? "").toString().trim();
      const title = [city, address].filter(Boolean).join(", ");

      const ext = extMap[id];
      const typeOrTip = (ext?.tip_pomescheniya ?? r.type ?? "").toString().trim();
      const etazh = (ext?.etazh ?? "").toString().trim();
      const line2 = typeOrTip
        ? `${typeOrTip}${etazh ? ` · этаж ${etazh}` : ""}`
        : (etazh ? `этаж ${etazh}` : "");

      const prices = buildPriceLine(ext);
      const cover_url = photoMap[id] ?? null;

      return {
        external_id: id,
        title,
        line2,
        prices,
        cover_url,
        type: r.type ?? null,
        city,
        address,
      };
    });

    const cities = uniqSorted(baseRows.map((r) => r.city));

    return NextResponse.json(
      { ok: true, items, cities, version },
      { headers: { "x-api-version": version, "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Unexpected error", version },
      { status: 500, headers: { "x-api-version": version, "Cache-Control": "no-store" } }
    );
  }
}
