// lib/data.ts
// Серверные утилиты для каталога: Supabase + Directus
// Версия: robust-select + smart field mapping

// ---------- ENV / constants ----------
const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  process.env.DIRECTUS_URL ||
  "https://cms.vitran.ru";

// Жёсткий fallback на проект Supabase
const SUPABASE_URL_FALLBACK = "https://bhabvutmbxxcqgtmtudv.supabase.co";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  SUPABASE_URL_FALLBACK;

const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

// ---------- types ----------
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
  // опциональные прайсы
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

// ---------- helpers ----------
function supaHeaders(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (SUPABASE_ANON) {
    h["apikey"] = SUPABASE_ANON;
    h["Authorization"] = `Bearer ${SUPABASE_ANON}`;
  }
  return h;
}

// на случай, если прокси срежут заголовки
function attachApikey(qs: URLSearchParams) {
  if (SUPABASE_ANON && !qs.has("apikey")) qs.set("apikey", SUPABASE_ANON);
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

function pick<T = any>(obj: any, keys: string[]): T | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v as T;
  }
  return null;
}

// ---------- Directus UI config ----------
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

// ---------- Supabase data ----------
async function getCities(): Promise<string[]> {
  if (!SUPABASE_URL) return [];
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
  return rows.map((r) => r.city_name).filter((x) => !!x && x.trim().length > 0);
}

// попытка с сортировкой и фоллбэками (если нет updated_at)
async function fetchRowsWithOrder(base: string, qsBase: URLSearchParams): Promise<any[]> {
  const p1 = new URLSearchParams(qsBase);
  p1.set("order", "updated_at.desc.nullslast");
  attachApikey(p1);
  try {
    return await fetchJSON<any[]>(`${base}?${p1.toString()}`, {
      headers: supaHeaders(),
      revalidate: 300,
    });
  } catch {
    const p2 = new URLSearchParams(qsBase);
    p2.set("order", "updated_at.desc");
    attachApikey(p2);
    try {
      return await fetchJSON<any[]>(`${base}?${p2.toString()}`, {
        headers: supaHeaders(),
        revalidate: 300,
      });
    } catch {
      const p3 = new URLSearchParams(qsBase);
      p3.delete("order");
      attachApikey(p3);
      return await fetchJSON<any[]>(`${base}?${p3.toString()}`, {
        headers: supaHeaders(),
        revalidate: 300,
      });
    }
  }
}

// теперь всегда берём select=* (никаких 400 из-за незнакомых полей)
async function fetchRowsAllColumns(base: string, qsBase: URLSearchParams): Promise<any[]> {
  const qs = new URLSearchParams(qsBase);
  qs.set("select", "*");
  return fetchRowsWithOrder(base, qs);
}

function mapRow(r: any): CatalogItem {
  // URL обложки: сначала явные внешние URL, затем public path из Storage
  const coverExternal = pick<string>(r, [
    "cover_ext_url",
    "cover_url",
    "photo_url",
    "image_url",
    "preview_url",
    "main_photo_url",
  ]);

  const storagePath = pick<string>(r, [
    "cover_storage_path",
    "storage_path",
    "photo_path",
    "image_path",
    "cover_path",
  ]);

  const cover_url = coverExternal || storagePublicUrl(storagePath);

  const available_area = pick<number | string>(r, [
    "available_area",
    "free_area",
    "area_available",
    "area_free",
    "area_avail",
  ]);

  const total_area = pick<number | string>(r, [
    "total_area",
    "area_total",
    "area",
    "square",
  ]);

  const type = pick<string>(r, ["type", "property_type", "category", "kind"]);

  // прайсы (если есть — хорошо; если нет — null)
  const price_per_m2_20 = pick(r, ["price_per_m2_20", "price20"]);
  const price_per_m2_50 = pick(r, ["price_per_m2_50", "price50"]);
  const price_per_m2_100 = pick(r, ["price_per_m2_100", "price100"]);
  const price_per_m2_400 = pick(r, ["price_per_m2_400", "price400"]);
  const price_per_m2_700 = pick(r, ["price_per_m2_700", "price700"]);
  const price_per_m2_1500 = pick(r, ["price_per_m2_1500", "price1500"]);

  return {
    external_id: String(r.external_id),
    title: r.title ?? null,
    address: r.address ?? pick(r, ["addr", "address_text"]) ?? null,
    city: r.city ?? pick(r, ["city_name"]) ?? null,
    type: type ?? null,
    available_area: available_area ?? null,
    total_area: total_area ?? null,
    cover_url: cover_url ?? null,
    price_per_m2_20,
    price_per_m2_50,
    price_per_m2_100,
    price_per_m2_400,
    price_per_m2_700,
    price_per_m2_1500,
  };
}

async function getItems(city: string): Promise<CatalogItem[]> {
  if (!SUPABASE_URL) return [];
  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/view_property_with_cover`;

  const qsBase = new URLSearchParams();
  if (city) qsBase.set("city", `eq.${city}`);

  const rows = await fetchRowsAllColumns(base, qsBase);
  return rows.map(mapRow);
}

export async function getCatalog({ city }: { city: string }): Promise<CatalogResponse> {
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

// ---------- Детальная карточка ----------
export async function getProperty(external_id: string): Promise<CatalogItem | null> {
  if (!SUPABASE_URL || !external_id) return null;

  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/view_property_with_cover`;

  const qsBase = new URLSearchParams();
  qsBase.set("external_id", `eq.${external_id}`);
  qsBase.set("limit", "1");

  const rows = await fetchRowsAllColumns(base, qsBase).catch(() => [] as any[]);
  const r = rows?.[0];
  if (!r) return null;

  return mapRow(r);
}
