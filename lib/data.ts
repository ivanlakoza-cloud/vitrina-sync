// lib/data.ts
// Серверные утилиты для каталога: Supabase + Directus

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  process.env.DIRECTUS_URL ||
  "https://cms.vitran.ru";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

type UiConfig = {
  card_fields_order: string[] | null;
  show_city_filter: boolean;
};

export type CatalogItem = {
  external_id: string;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  type?: string | null;
  available_area?: number | string | null;
  total_area?: number | string | null;
  cover_url?: string | null;
  price_per_m2_20?: number | string | null;
  price_per_m2_50?: number | string | null;
  price_per_m2_100?: number | string | null;
  price_per_m2_400?: number | string | null;
  price_per_m2_700?: number | string | null;
  price_per_m2_1500?: number | string | null;
};

export type CatalogResponse = {
  items: CatalogItem[];
  cities: string[];
  ui: UiConfig;
};

const DEFAULT_ORDER = ["photo", "city", "address", "type", "area", "prices"];

// -------------------------- helpers -----------------------------------------

function supaHeaders(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (SUPABASE_ANON) {
    h["apikey"] = SUPABASE_ANON;
    h["Authorization"] = `Bearer ${SUPABASE_ANON}`;
  }
  return h;
}

function withTimeout<T>(p: Promise<T>, ms = 500): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return new Promise<T>((resolve, reject) => {
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

async function fetchJSON<T>(input: string, init?: RequestInit & { revalidate?: number }): Promise<T> {
  const { revalidate, ...rest } = init || {};
  const res = await withTimeout(
    fetch(input, {
      ...rest,
      next: { revalidate: revalidate ?? 300 },
    }),
    500
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${input}`);
  return res.json() as Promise<T>;
}

function storagePublicUrl(storagePath?: string | null): string | null {
  if (!storagePath || !SUPABASE_URL) return null;
  return `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/photos/${String(storagePath).replace(/^\/+/, "")}`;
}

// -------------------------- Directus UI config ------------------------------

async function getUiConfig(): Promise<UiConfig> {
  try {
    const url = `${DIRECTUS_URL.replace(
      /\/+$/,
      ""
    )}/items/ui_home_config?limit=1&fields=card_fields_order,show_city_filter`;
    const data = await fetchJSON<{
      data?: Array<{ card_fields_order?: any; show_city_filter?: boolean }>;
    }>(url, { revalidate: 300, cache: "force-cache" });

    const row = data?.data?.[0] ?? {};
    const order = Array.isArray(row.card_fields_order) ? (row.card_fields_order as string[]) : null;
    const show = typeof row.show_city_filter === "boolean" ? row.show_city_filter : true;

    return { card_fields_order: order, show_city_filter: show };
  } catch {
    return { card_fields_order: null, show_city_filter: true };
  }
}

// -------------------------- Supabase data -----------------------------------

async function getCities(): Promise<string[]> {
  if (!SUPABASE_URL) return [];
  // вью фасетов по городам (city_name,count)
  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/view_facets_city`;
  const url = `${base}?select=city_name,count&order=count.desc`;
  const rows = await fetchJSON<Array<{ city_name: string; count: number }>>(url, {
    headers: supaHeaders(),
    revalidate: 300,
  });
  return rows.map((r) => r.city_name).filter((x) => !!x && x.trim().length > 0);
}

// Универсальная попытка забора строк с fallback по order
async function fetchRowsWithOrder(base: string, qsBase: URLSearchParams): Promise<any[]> {
  // 1) правильный синтаксис: desc.nullslast
  const p1 = new URLSearchParams(qsBase);
  p1.set("order", "updated_at.desc.nullslast");
  try {
    return await fetchJSON<any[]>(`${base}?${p1.toString()}`, {
      headers: supaHeaders(),
      revalidate: 300,
    });
  } catch (e: any) {
    // 2) fallback: только desc
    const p2 = new URLSearchParams(qsBase);
    p2.set("order", "updated_at.desc");
    try {
      return await fetchJSON<any[]>(`${base}?${p2.toString()}`, {
        headers: supaHeaders(),
        revalidate: 300,
      });
    } catch {
      // 3) финальный fallback: вообще без order
      const p3 = new URLSearchParams(qsBase);
      p3.delete("order");
      return await fetchJSON<any[]>(`${base}?${p3.toString()}`, {
        headers: supaHeaders(),
        revalidate: 300,
      });
    }
  }
}

async function getItems(city: string): Promise<CatalogItem[]> {
  if (!SUPABASE_URL) return [];
  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/view_property_with_cover`;

  // поля для карточки
  const select = [
    "external_id",
    "title",
    "address",
    "city",
    "type",
    "total_area",
    "available_area",
    "cover_storage_path",
    "cover_ext_url",
    "price_per_m2_20",
    "price_per_m2_50",
    "price_per_m2_100",
    "price_per_m2_400",
    "price_per_m2_700",
    "price_per_m2_1500",
    "updated_at",
  ].join(",");

  const qsBase = new URLSearchParams();
  qsBase.set("select", select);
  if (city) qsBase.set("city", `eq.${city}`);

  const rows = await fetchRowsWithOrder(base, qsBase);

  return rows.map((r) => ({
    external_id: r.external_id,
    title: r.title ?? null,
    address: r.address ?? null,
    city: r.city ?? null,
    type: r.type ?? null,
    available_area: r.available_area ?? null,
    total_area: r.total_area ?? null,
    cover_url: r.cover_ext_url || storagePublicUrl(r.cover_storage_path),
    price_per_m2_20: r.price_per_m2_20 ?? null,
    price_per_m2_50: r.price_per_m2_50 ?? null,
    price_per_m2_100: r.price_per_m2_100 ?? null,
    price_per_m2_400: r.price_per_m2_400 ?? null,
    price_per_m2_700: r.price_per_m2_700 ?? null,
    price_per_m2_1500: r.price_per_m2_1500 ?? null,
  }));
}

export async function getCatalog({ city }: { city: string }): Promise<CatalogResponse> {
  // мягкие промисы — ошибки → пустые данные, без 500
  const uiP = getUiConfig().catch(() => ({ card_fields_order: null, show_city_filter: true }));
  const citiesP = getCities().catch(() => [] as string[]);
  const itemsP = getItems(city).catch(() => [] as CatalogItem[]);

  const [ui, cities, items] = await Promise.all([uiP, citiesP, itemsP]);

  return {
    items,
    cities: cities.length
      ? cities
      : Array.from(new Set(items.map((i) => i.city).filter(Boolean) as string[])),
    ui: {
      card_fields_order:
        (Array.isArray(ui.card_fields_order) && ui.card_fields_order.length
          ? ui.card_fields_order
          : DEFAULT_ORDER),
      show_city_filter: !!ui.show_city_filter,
    },
  };
}

// -------------------------- Детальная карточка ------------------------------

export async function getProperty(external_id: string): Promise<CatalogItem | null> {
  if (!SUPABASE_URL || !external_id) return null;

  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/view_property_with_cover`;
  const select = [
    "external_id",
    "title",
    "address",
    "city",
    "type",
    "total_area",
    "available_area",
    "cover_storage_path",
    "cover_ext_url",
    "price_per_m2_20",
    "price_per_m2_50",
    "price_per_m2_100",
    "price_per_m2_400",
    "price_per_m2_700",
    "price_per_m2_1500",
    "updated_at",
  ].join(",");

  const qsBase = new URLSearchParams();
  qsBase.set("select", select);
  qsBase.set("external_id", `eq.${external_id}`);
  qsBase.set("limit", "1");

  // пробуем с order (на случай одинаковых external_id в истории)
  const rows = await fetchRowsWithOrder(base, qsBase).catch(() => [] as any[]);
  const r = rows?.[0];
  if (!r) return null;

  return {
    external_id: r.external_id,
    title: r.title ?? null,
    address: r.address ?? null,
    city: r.city ?? null,
    type: r.type ?? null,
    available_area: r.available_area ?? null,
    total_area: r.total_area ?? null,
    cover_url: r.cover_ext_url || storagePublicUrl(r.cover_storage_path),
    price_per_m2_20: r.price_per_m2_20 ?? null,
    price_per_m2_50: r.price_per_m2_50 ?? null,
    price_per_m2_100: r.price_per_m2_100 ?? null,
    price_per_m2_400: r.price_per_m2_400 ?? null,
    price_per_m2_700: r.price_per_m2_700 ?? null,
    price_per_m2_1500: r.price_per_m2_1500 ?? null,
  };
}
