import { NextResponse } from "next/server";

type Row = Record<string, any>;

type ItemOut = {
  external_id: string;
  title: string;
  address: string | null;
  city_name: string | null;
  type: string | null;
  total_area: number | null;
  floor: number | null;
  cover_url: string | null;
  line2: string;
  prices: string;
};

function getEnv() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  return { url, key };
}

function buildQuery(url: string, table: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const trimmed = url.replace(/\/$/, "");
  return `${trimmed}/rest/v1/${table}?${qs}`;
}

async function restFetch(url: string, key: string, table: string, params: Record<string, string>) {
  const full = buildQuery(url, table, params);
  const res = await fetch(full, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    // never cache in Next
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function GET() {
  const { url, key } = getEnv();
  if (!url || !key) {
    return NextResponse.json({
      items: [],
      error:
        "Missing env: SUPABASE_URL and/or SUPABASE_ANON_KEY (also checks NEXT_PUBLIC_* and SUPABASE_SERVICE_ROLE_KEY). Set them in Vercel → Project → Settings → Environment Variables.",
    });
  }

  // Desired columns (we'll automatically drop the ones that don't exist)
  let cols = [
    "external_id",
    "uuid",
    "id",
    "address",
    "city",
    "city_name",
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
  ];

  const table = "property_public_view";
  let rows: Row[] = [];

  const asSelect = () => cols.join(",");

  try {
    rows = await restFetch(url, key, table, {
      select: asSelect(),
      // no ordering to avoid "order on missing column" issues
      limit: "1000",
    });
  } catch (err: any) {
    // If PostgREST complains about an unknown column, remove it and retry (up to 5 times)
    let txt = String(err?.message || err || "");
    const rx = /column\s+[^"]*"([a-zA-Z0-9_]+)"/i;
    let attempts = 0;
    while (attempts < 5) {
      const m = rx.exec(txt);
      if (!m) break;
      const bad = m[1];
      cols = cols.filter((c) => c !== bad);
      try {
        rows = await restFetch(url, key, table, {
          select: asSelect(),
          limit: "1000",
        });
        txt = "";
        break;
      } catch (e2: any) {
        txt = String(e2?.message || e2 || "");
        attempts += 1;
      }
    }
    if (!rows.length && txt) {
      return NextResponse.json({ items: [], error: txt });
    }
  }

  const items: ItemOut[] = rows.map((r: Row) => {
    const id =
      (r["external_id"] ?? r["uuid"] ?? r["id"] ?? "").toString();
    const city =
      (r["city_name"] ?? r["city"] ?? "").toString().trim();
    const address = (r["address"] ?? "").toString().trim();
    const title = [city, address].filter(Boolean).join(", ");

    const tip = (r["tip_pomescheniya"] ?? "").toString().trim();
    const floorVal = r["etazh"];
    const etazh =
      floorVal !== null && floorVal !== undefined && `${floorVal}` !== ""
        ? `этаж ${floorVal}`
        : "";
    const line2Raw = [tip, etazh].filter(Boolean).join(" · ");
    const line2 =
      line2Raw || (r["type"] ? String(r["type"]) : "");

    const priceFields: Array<[string, string]> = [
      ["20", "price_per_m2_20"],
      ["50", "price_per_m2_50"],
      ["100", "price_per_m2_100"],
      ["400", "price_per_m2_400"],
      ["700", "price_per_m2_700"],
      ["1500", "price_per_m2_1500"],
    ];
    const prices = priceFields
      .map(([label, key]) => [label, r[key]] as const)
      .filter(([, v]) => v !== null && v !== undefined && `${v}` !== "")
      .map(([label, v]) => `от ${label} — ${v}`)
      .join(" · ");

    const cover_url =
      (r["cover_url"] ?? null) as string | null;

    return {
      external_id: id,
      title,
      address: address || null,
      city_name: city || null,
      type: (r["type"] ?? null) as string | null,
      total_area:
        r["total_area"] !== undefined && r["total_area"] !== null
          ? Number(r["total_area"])
          : null,
      floor:
        floorVal !== undefined && floorVal !== null
          ? Number(floorVal)
          : null,
      cover_url,
      line2,
      prices,
    };
  });

  return NextResponse.json({ items });
}
