// No "use server" pragma here to avoid Next.js restriction errors.

import { NextResponse } from "next/server";

type Row = Record<string, any>;

function pickExternalId(r: Row): string {
  return String(
    r.external_id ?? r.id ?? r.uuid ?? r.property_id ?? r.object_id ?? ""
  );
}

function notEmpty<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined && (typeof v !== "string" || v.trim() !== "");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url || "http://localhost");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, message: "Supabase env vars are missing" },
        { status: 500 }
      );
    }

    // Build query: select everything to be resilient to column name differences
    const selectCols = "*";
    const qs: string[] = [
      `select=${selectCols}`,
      "limit=500"
    ];

    // Optional filtering by id or city (for future-proofing; harmless if unused)
    const qId = url.searchParams.get("id") ?? "";
    const qCity = url.searchParams.get("city") ?? "";
    if (qId) qs.push(`external_id=eq.${encodeURIComponent(qId)}`);
    if (qCity) qs.push(`city=eq.${encodeURIComponent(qCity)}`);

    const restUrl = `${supabaseUrl}/rest/v1/property_public_view?${qs.join("&")}`;
    const res = await fetch(restUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "count=exact"
      },
      // Don't revalidate at edge; always fresh
      cache: "no-store"
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ ok: false, message: txt || res.statusText }, { status: 500 });
    }

    const rows: Row[] = await res.json();

    const banned = new Set(["Обязательность данных"]);
    const items = rows.map((r: Row) => {
      const city = String(r.city_name ?? r.city ?? "").trim();
      const addr = String(r.address ?? r.address_line ?? r.addr ?? "").trim();

      const tip = String(r.tip_pomescheniya ?? "").trim();
      const type = String(r.type ?? "").trim();
      const floor =
        r.etazh ?? r.floor ?? r.level ?? r.storey ?? null;

      const line2Parts: string[] = [];
      if (tip) line2Parts.push(tip);
      if (!tip && type) line2Parts.push(type);
      if (notEmpty(floor)) line2Parts.push(`этаж ${floor}`);
      const line2 = line2Parts.join(" · ");

      const priceMap: Record<string, any> = {
        "20": r.price_per_m2_20,
        "50": r.price_per_m2_50,
        "100": r.price_per_m2_100,
        "400": r.price_per_m2_400,
        "700": r.price_per_m2_700,
        "1500": r.price_per_m2_1500
      };
      const priceParts: string[] = [];
      for (const label of ["20","50","100","400","700","1500"]) {
        const v = priceMap[label];
        if (notEmpty(v)) {
          priceParts.push(`от ${label} — ${v}`);
        }
      }
      const prices = priceParts.join(" · ");

      const out = {
        external_id: pickExternalId(r),
        title: [city, addr].filter(Boolean).join(", "),
        address: addr || null,
        city_name: city || null,
        type: type || null,
        total_area: r.total_area ?? r.area_total ?? r.area ?? null,
        floor: notEmpty(floor) ? floor : null,
        cover_url: null as string | null, // fast API: no storage roundtrips
        line2,
        prices
      };
      return out;
    }).filter((it) => !banned.has(String(it.city_name)));

    // Unique cities list
    const citySet = new Set<string>();
    for (const it of items) {
      if (it.city_name) citySet.add(String(it.city_name));
    }
    const cities = Array.from(citySet);
    cities.sort((a, b) => a.localeCompare(b, "ru"));

    return NextResponse.json({
      items,
      cities,
      debug: {
        counts: { items: items.length, cities: cities.length },
        query: { id: qId, city: qCity }
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Catalog API error" },
      { status: 500 }
    );
  }
}
