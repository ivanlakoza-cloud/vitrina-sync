// lib/data.ts
// Каталог для Next.js: Supabase (две вью) + Directus UI-конфиг

// ===== ENV =====
const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  process.env.DIRECTUS_URL ||
  "https://cms.vitran.ru";

const SUPABASE_URL_FALLBACK = "https://bhabvutmbxxcqgtmtudv.supabase.co";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  SUPABASE_URL_FALLBACK;

const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

// ===== Types =====
type UiConfig = { card_fields_order: string[] | null; show_city_filter: boolean };

export type CatalogItem = {
  external_id: string;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  type?: string | null;
  available_area?: number | string | null;
  total_area?: number | string | null;
  // совместимость со «старой» страницей и новой разметкой
  coverUrl?: string | null;     // вычисляемый единый URL
  cover_url?: string | null;    // алиас
  photo?: string | null;        // алиас на coverUrl
  preview_url?: string | null;  // алиас на coverUrl
  // цены (как есть во view)
  price_per_m2_20?: number | string | null;
  price_per_m2_50?: number | string | null;
  price_per_m2_100?: number | string | null;
  price_per_m2_400?: number | string | null;
  price_per_m2_700?: number | string | null;
  price_per_m2_1500?: number | string | null;
};

export type CatalogResponse = { items: CatalogItem[]; cities: string[]; ui: UiConfig };

const DEFAULT_ORDER = ["photo", "city", "address", "type", "area", "prices"];

// ===== Helpers =====
function supaHeaders(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (SUPABASE_ANON) {
    h["apikey"] = SUPABASE_ANON;
    h["Authorization"] = `Bearer ${SUPABASE_ANON}`;
  }
  return h;
}

function attachApikey(qs: URLSearchParams) {
  if (SUPABASE_ANON && !qs.has("apikey")) qs.set("apikey", SUPABASE_ANON);
}

function storagePublicUrl(path?: string | null): string | null {
  if (!path) return null;
  const clean = String(path).replace(/^\/+/, "");
  // если path уже абсолютный URL — вернём как есть
  if (/^https?:\/\//i.test(clean)) return clean;
  return `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/photos/${clean}`;
}

async function fetchJSON<T>(url: string, init?: RequestInit & { revalidate?: number }): Promise<T> {
  const { revalidate, ...rest } = init || {};
  const res = await fetch(url, { ...rest, next: { revalidate: revalidate ?? 300 } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}${txt ? ` – ${txt.slice(0, 200)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

// ===== Directus UI =====
async function getUiConfig(): Promise<UiConfig> {
  try {
    const url = `${DIRECTUS_URL.replace(
      /\/+$/,
      ""
    )}/items/ui_home_config?limit=1&fields=card_fields_order,show_city_filter`;
    const data = await fetchJSON<{ data?: Array<{ card_fields_order?: any; show_city_filter?: boolean }> }>(
      url,
      { revalidate: 300, cache: "force-cache" }
    );
    const row = data?.data?.[0] ?? {};
    return {
      card_fields_order: Array.isArray(row.card_fields_order) ? (row.card_fields_order as string[]) : null,
      show_city_filter: typeof row.show_city_filter === "boolean" ? row.show_city_filter : true,
    };
  } catch {
    return { card_fields_order: null, show_city_filter: true };
  }
}

// ===== Supabase: города =====
async function getCities(): Promise<string[]> {
  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/view_facets_city`;
  const qs = new URLSearchParams();
  qs.set("select", "city_name,count");
  qs.set("order", "count.desc");
  attachApikey(qs);
  const url = `${base}?${qs.toString()}`;
  const rows = await fetchJSON<Array<{ city_name: string; count: number }>>(url, {
    headers: supaHeaders(),
    revalidate: 300,
  });
  return rows.map((r) => r.city_name).filter(Boolean);
}

// ===== Supabase: каталожные строки =====
// База (обложка, адрес, город) — из view_property_with_cover
type RowBase = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  updated_at?: string | null;
};

// Доп. поля — из property_full_view (тип, площади, цены)
type RowMeta = {
  external_id: string;
  type: string | null;
  total_area: number | string | null;
  price_per_m2_20?: number | string | null;
  price_per_m2_50?: number | string | null;
  price_per_m2_100?: number | string | null;
  price_per_m2_400?: number | string | null;
  price_per_m2_700?: number | string | null;
  price_per_m2_1500?: number | string | null;
};

async function fetchBase(city: string): Promise<RowBase[]> {
  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/view_property_with_cover`;
  const qs = new URLSearchParams();
  qs.set("select", "external_id,title,address,city,cover_storage_path,cover_ext_url,updated_at");
  if (city) qs.set("city", `eq.${city}`);
  // порядок с фоллбэком
  qs.set("order", "updated_at.desc.nullslast");
  attachApikey(qs);
  const url = `${base}?${qs.toString()}`;
  try {
    return await fetchJSON<RowBase[]>(url, { headers: supaHeaders(), revalidate: 300 });
  } catch {
    qs.set("order", "updated_at.desc");
    const url2 = `${base}?${qs.toString()}`;
    try {
      return await fetchJSON<RowBase[]>(url2, { headers: supaHeaders(), revalidate: 300 });
    } catch {
      qs.delete("order");
      const url3 = `${base}?${qs.toString()}`;
      return await fetchJSON<RowBase[]>(url3, { headers: supaHeaders(), revalidate: 300 });
    }
  }
}

async function fetchMeta(externalIds: string[]): Promise<Map<string, RowMeta>> {
  if (!externalIds.length) return new Map();
  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/property_full_view`;
  const qs = new URLSearchParams();
  qs.set(
    "select",
    [
      "external_id",
      "type",
      "total_area",
      "price_per_m2_20",
      "price_per_m2_50",
      "price_per_m2_100",
      "price_per_m2_400",
      "price_per_m2_700",
      "price_per_m2_1500",
    ].join(",")
  );
  qs.set("external_id", `in.(${externalIds.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")})`);
  attachApikey(qs);
  const url = `${base}?${qs.toString()}`;
  const rows = await fetchJSON<RowMeta[]>(url, { headers: supaHeaders(), revalidate: 300 });

  const map = new Map<string, RowMeta>();
  for (const r of rows) map.set(String(r.external_id), r);
  return map;
}

function buildCoverUrl(row: RowBase): string | null {
  // приоритет: Storage → внешний URL
  const fromStorage = storagePublicUrl(row.cover_storage_path);
  if (fromStorage) return fromStorage;
  const ext = row.cover_ext_url && String(row.cover_ext_url).trim() ? String(row.cover_ext_url) : null;
  return ext || null;
}

async function getItems(city: string): Promise<CatalogItem[]> {
  const baseRows = await fetchBase(city);
  if (!baseRows.length) return [];

  const ids = Array.from(new Set(baseRows.map((r) => String(r.external_id)).filter(Boolean)));
  const metaMap = await fetchMeta(ids);

  return baseRows.map((r) => {
    const m = metaMap.get(String(r.external_id));
    const cover = buildCoverUrl(r);

    const item: CatalogItem = {
      external_id: String(r.external_id),
      title: r.title ?? null,
      address: r.address ?? null,
      city: r.city ?? null,
      type: m?.type ?? null,
      available_area: null,
      total_area: m?.total_area ?? null,
      // единый URL + алиасы для совместимости со «старой» страницей
      coverUrl: cover,
      cover_url: cover,
      photo: cover,
      preview_url: cover,
      price_per_m2_20: m?.price_per_m2_20 ?? null,
      price_per_m2_50: m?.price_per_m2_50 ?? null,
      price_per_m2_100: m?.price_per_m2_100 ?? null,
      price_per_m2_400: m?.price_per_m2_400 ?? null,
      price_per_m2_700: m?.price_per_m2_700 ?? null,
      price_per_m2_1500: m?.price_per_m2_1500 ?? null,
    };

    return item;
  });
}

export async function getCatalog({ city }: { city: string }): Promise<CatalogResponse> {
  const [ui, cities, items] = await Promise.all([
    getUiConfig().catch(() => ({ card_fields_order: null, show_city_filter: true })),
    getCities().catch(() => [] as string[]),
    getItems(city).catch(() => [] as CatalogItem[]),
  ]);

  return {
    items,
    cities: cities.length ? cities : Array.from(new Set(items.map((i) => i.city).filter(Boolean) as string[])),
    ui: {
      card_fields_order:
        (Array.isArray(ui.card_fields_order) && ui.card_fields_order.length ? ui.card_fields_order : DEFAULT_ORDER),
      show_city_filter: !!ui.show_city_filter,
    },
  };
}

// Деталка при необходимости
export async function getProperty(external_id: string): Promise<CatalogItem | null> {
  if (!external_id) return null;
  const items = await getItems("");
  return items.find((x) => x.external_id === external_id) ?? null;
}
