import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  external_id: string | null;
  address: string | null;
  city: string | null;
  type: string | null;
  etazh: string | null | number;
  tip_pomescheniya: string | null;
  price_per_m2_20: number | null;
  price_per_m2_50: number | null;
  price_per_m2_100: number | null;
  price_per_m2_400: number | null;
  price_per_m2_700: number | null;
  price_per_m2_1500: number | null;
};

type ItemOut = {
  external_id: string;
  title: string;        // "Город, Адрес"
  subline: string;      // "tip_pomescheniya · этаж N" (fallback к типу)
  prices_line: string;  // "от 20 — N · от 50 — N · …"
  cover_url: string | null;
  city: string | null;
};

const BUCKET = "photos";
const IMAGE_RE = /\.(?:jpe?g|png|webp|gif|bmp)$/i;

function money(n: number) {
  // без разделителей, чтобы не спорить о форматах: 120000 → "120 000 ₽/м²"
  return `${n.toLocaleString("ru-RU")} ₽/м²`;
}

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    // Параметры фильтра
    const cityFilter = (url.searchParams.get("city") || "").trim();

    // --- Supabase client ---
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, message: "Supabase env vars missing" },
        { status: 500 }
      );
    }
    const sb = createClient(supabaseUrl, supabaseKey);

    // 1) Чтение строк из представления (берём только необходимые поля)
    const columns =
      "external_id,address,city,type,etazh,tip_pomescheniya,price_per_m2_20,price_per_m2_50,price_per_m2_100,price_per_m2_400,price_per_m2_700,price_per_m2_1500";
    let query = sb.from("property_public_view").select(columns);
    if (cityFilter) query = query.eq("city", cityFilter);
    const { data: rows, error } = await query;
    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }
    const safeRows: Row[] = (rows || []) as Row[];

    // 2) Собираем список городов
    const citySet = new Set<string>();
    for (const r of safeRows) {
      if (r?.city) citySet.add(String(r.city));
    }
    const cities = Array.from(citySet).sort((a, b) =>
      a.localeCompare(b, "ru")
    );

    // 3) Хелпер для выбора обложки из Supabase Storage
    async function getCover(external_id: string | null): Promise<string | null> {
      if (!external_id) return null;
      // Сначала листинг файлов в папке external_id
      const { data: files, error: listErr } = await sb.storage
        .from(BUCKET)
        .list(external_id, { limit: 100, sortBy: { column: "name", order: "asc" } });
      if (listErr || !files || files.length === 0) return null;
      const img = files.find((f) => IMAGE_RE.test(f.name));
      if (!img) return null;
      const { data } = sb.storage.from(BUCKET).getPublicUrl(`${external_id}/${img.name}`);
      return data?.publicUrl || null;
    }

    // 4) Гидратируем карточки
    const items: ItemOut[] = [];
    for (const r of safeRows) {
      const ext = (r.external_id || "").trim();
      const cityName = (r.city || "").trim();
      const addr = (r.address || "").trim();
      const title = [cityName, addr].filter(Boolean).join(", ");

      const tip = (r.tip_pomescheniya || r.type || "").trim();
      const floorText = r.etazh !== null && r.etazh !== undefined && `${r.etazh}` !== ""
        ? `этаж ${r.etazh}`
        : "";
      const subline = [tip, floorText].filter(Boolean).join(" · ");

      const prices: string[] = [];
      const push = (label: string, val: number | null) => {
        if (typeof val === "number" && isFinite(val) && val > 0) {
          prices.push(`${label} — ${money(val)}`);
        }
      };
      push("от 20", r.price_per_m2_20);
      push("от 50", r.price_per_m2_50);
      push("от 100", r.price_per_m2_100);
      push("от 400", r.price_per_m2_400);
      push("от 700", r.price_per_m2_700);
      push("от 1500", r.price_per_m2_1500);
      const prices_line = prices.join(" · ");

      const cover_url = await getCover(ext);

      items.push({
        external_id: ext,
        title,
        subline,
        prices_line,
        cover_url,
        city: cityName || null,
      });
    }

    return NextResponse.json({
      ok: true,
      version: "v4",
      query: { city: cityFilter },
      counts: { items: items.length, cities: cities.length },
      cities,
      items,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
