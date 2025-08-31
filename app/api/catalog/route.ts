import { NextResponse } from "next/server";

type AnyRow = Record<string, any>;

// ---- Helpers ----
const BANNED_CITIES = new Set(["Обязательность данных"]);

function safeStr(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function buildLine2(row: AnyRow): string {
  const tip = safeStr(row.tip_pomescheniya).trim();
  const floor = row.etazh ?? row.floor ?? null;
  const floorStr = floor !== null && floor !== undefined && floor !== "" ? ` · этаж ${floor}` : "";
  if (tip) return `${tip}${floorStr}`;
  // fallback к type, если tip_pomescheniya пуст
  const typeStr = safeStr(row.type).trim();
  return typeStr ? `${typeStr}${floorStr}` : "";
}

function buildPriceLine(row: AnyRow): string | null {
  const labels: Record<string, string> = {
    price_per_m2_20: "от 20",
    price_per_m2_50: "от 50",
    price_per_m2_100: "от 100",
    price_per_m2_400: "от 400",
    price_per_m2_700: "от 700",
    price_per_m2_1500: "от 1500",
  };
  const parts: string[] = [];
  for (const k of Object.keys(labels)) {
    const v = row[k];
    if (v !== null && v !== undefined && v !== "") {
      parts.push(`${labels[k]} — ${v}`);
    }
  }
  return parts.length ? parts.join(" · ") : null;
}

export async function GET(req: Request) {
  // --- Parse query ---
  const { searchParams } = new URL(req.url);
  // v параметр — игнорируем логически, этот обработчик уже быстрая версия
  const cityFilter = searchParams.get("city") ?? "";
  const idFilter = searchParams.get("id") ?? "";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ ok: false, message: "Missing Supabase env vars" }, { status: 500 });
  }

  // --- Minimal select из публичного вью, только нужные поля ---
  const selectCols = [
    "external_id",
    "address",
    "city_name",
    "type",
    "total_area",
    "tip_pomescheniya",
    "etazh",
    "floor",
    "price_per_m2_20",
    "price_per_m2_50",
    "price_per_m2_100",
    "price_per_m2_400",
    "price_per_m2_700",
    "price_per_m2_1500",
  ].join(",");

  const qs: string[] = [
    f"select={selectCols}",
    "order=city_name.asc",
    "limit=500",
  ];

  if (cityFilter) {
    qs.push(`city_name=eq.${encodeURIComponent(cityFilter)}`);
  }
  if (idFilter) {
    qs.push(`external_id=eq.${encodeURIComponent(idFilter)}`);
  }

  const url = `${supabaseUrl}/rest/v1/property_public_view?${qs.join("&")}`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      // избегаем ISR кеша, чтобы чувствовать обновления
      cache: "no-store",
      // Страховка на таймауты
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ ok: false, message: txt }, { status: res.status });
    }

    const rows: AnyRow[] = await res.json();

    // --- Сборка элементов без походов в Storage (быстро) ---
    const items = rows.map((r) => {
      const city = safeStr(r.city_name).trim();
      const addr = safeStr(r.address).trim();
      const title = [city, addr].filter(Boolean).join(", ");
      return {
        external_id: r.external_id,
        title,
        address: addr,
        city_name: city,
        type: r.type ?? null,
        total_area: r.total_area ?? null,
        floor: r.etazh ?? r.floor ?? null,
        cover_url: null as string | null, // умышленно не подставляем — снимем нагрузку со Storage
        line2: buildLine2(r),
        prices: buildPriceLine(r),
      };
    });

    // --- Города для фильтров ---
    let cities = Array.from(
      new Set(
        rows
          .map((r) => safeStr(r.city_name).trim())
          .filter(Boolean)
      )
    ).filter((c) => !BANNED_CITIES.has(String(c)));
    cities.sort((a, b) => a.localeCompare(b, "ru"));

    return NextResponse.json({
      items,
      cities,
      debug: {
        query: { city: cityFilter, id: idFilter },
        counts: { items: items.length, cities: cities.length },
        note: "Кавер не вычисляется здесь, чтобы API отвечал быстро. На странице можно лениво достраивать URL фото.",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "fetch error" },
      { status: 500 }
    );
  }
}
