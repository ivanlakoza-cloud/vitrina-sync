// lib/data.ts
// Каталог: Supabase (две вью + Storage) и Directus UI-конфиг.
// Кэш: ~5 минут на запросах к Supabase/Directus

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

const STORAGE_BUCKET = "photos";
const STORAGE_PREFIX =
  (process.env.NEXT_PUBLIC_STORAGE_PREFIX || "").replace(/^\/+|\/+$/g, "");

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

  // унифицированный URL обложки (и алиасы под старый код)
  coverUrl?: string | null;
  cover_url?: string | null;
  photo?: string | null;
  preview_url?: string | null;

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
function storagePublicUrl(key: string): string {
  const base = SUPABASE_URL.replace(/\/+$/, "");
  const path = [STORAGE_BUCKET, key.replace(/^\/+/, "")].filter(Boolean).join("/");
  return `${base}/storage/v1/object/public/${path}`;
}
async function fetchJSON<T>(url: string, init?: RequestInit & { revalidate?: number }): Promise<T> {
  const { revalidate, ...rest } = init || {};
  const res = await fetch(url, { ...rest, next: { revalidate: revalidate ?? 300 } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}${txt ? ` – ${txt.slice(0, 160)}` : ""}`);
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
    const data = await fetchJSON<{ data?: Array<{ card_fields_order?: any; show_city_filter?: boolean }> }>(url, {
      revalidate: 300,
      cache: "force-cache",
    });
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

// ===== Supabase: объекты =====
type RowBase = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  updated_at?: string | null;
};
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
  attachApikey(qs);

  const attempts = [
    () => qs.set("order", "updated_at.desc.nullslast"),
    () => qs.set("order", "updated_at.desc"),
    () => qs.delete("order"),
  ];

  for (const mut of attempts) {
    try {
      mut();
      const url = `${base}?${qs.toString()}`;
      return await fetchJSON<RowBase[]>(url, { headers: supaHeaders(), revalidate: 300 });
    } catch {
      // пробуем следующую стратегию
    }
  }

  // «последний шанс»: минимальный select без сортировки
  try {
    const qs2 = new URLSearchParams();
    qs2.set("select", "external_id,title,address,city,cover_storage_path,cover_ext_url");
    if (city) qs2.set("city", `eq.${city}`);
    attachApikey(qs2);
    const url = `${base}?${qs2.toString()}`;
    return await fetchJSON<RowBase[]>(url, { headers: supaHeaders(), revalidate: 300 });
  } catch {
    return [];
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
  const rows = await fetchJSON<RowMeta[]>(`${base}?${qs.toString()}`, {
    headers: supaHeaders(),
    revalidate: 300,
  });
  const m = new Map<string, RowMeta>();
  for (const r of rows) m.set(String(r.external_id), r);
  return m;
}

// ===== Storage: берём «первый файл» из photos/<external_id>/, если cover_storage_path пуст
type StorageListItem = { name: string };
const coverCache = new Map<string, string | null>();

async function listFirstStorageFile(external_id: string): Promise<string | null> {
  if (coverCache.has(external_id)) return coverCache.get(external_id)!;

  const prefixFolder = [STORAGE_PREFIX, external_id].filter(Boolean).join("/") + "/";
  const listUrl = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/list/${encodeURIComponent(STORAGE_BUCKET)}`;
  const body = {
    prefix: prefixFolder,
    limit: 100,
    offset: 0,
    sortBy: { column: "name", order: "asc" as const },
  };

  // Попытка 1: официальный endpoint Storage
  try {
    const res = await fetch(listUrl, {
      method: "POST",
      headers: { ...supaHeaders(), "content-type": "application/json" },
      body: JSON.stringify(body),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`list status ${res.status}`);
    const arr = (await res.json()) as StorageListItem[];
    const first = arr?.find((x) => !!x?.name) || null;
    const key = first ? prefixFolder + first.name : null; // list возвращает ТОЛЬКО имя файла
    const url = key ? storagePublicUrl(key) : null;
    coverCache.set(external_id, url);
    return url;
  } catch {
    // Попытка 2: через PostgREST -> storage.objects
    try {
      const qs = new URLSearchParams();
      qs.set("select", "name");
      qs.set("bucket_id", `eq.${STORAGE_BUCKET}`);
      qs.set("name", `like.${prefixFolder}%`);
      qs.set("order", "name.asc");
      qs.set("limit", "1");
      const restUrl = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/objects?${qs.toString()}`;
      const res2 = await fetch(restUrl, {
        method: "GET",
        headers: { ...supaHeaders(), "Accept-Profile": "storage" },
        next: { revalidate: 300 },
      });
      if (!res2.ok) throw new Error(`rest list status ${res2.status}`);
      const arr2 = (await res2.json()) as Array<{ name: string }>;
      const key = arr2?.[0]?.name || null; // тут уже ПОЛНЫЙ путь ('id53/xxx.jpg')
      const url = key ? storagePublicUrl(key) : null;
      coverCache.set(external_id, url);
      return url;
    } catch {
      coverCache.set(external_id, null);
      return null;
    }
  }
}

function coverFromRow(r: RowBase): string | null {
  const p = r.cover_storage_path;
  if (p && /^https?:\/\//i.test(String(p))) return String(p);
  if (p && String(p).trim() !== "") return storagePublicUrl(String(p).replace(/^\/+/, ""));
  const ext = r.cover_ext_url && String(r.cover_ext_url).trim() ? String(r.cover_ext_url) : null;
  return ext || null;
}

// ===== Итог: собираем карточки =====
async function getItems(city: string): Promise<CatalogItem[]> {
  const baseRows = await fetchBase(city);
  if (!baseRows.length) return [];

  const ids = Array.from(new Set(baseRows.map((r) => String(r.external_id)).filter(Boolean)));
  const metaMap = await fetchMeta(ids);

  const needStorage: Array<{ id: string; idx: number }> = [];
  const out: CatalogItem[] = baseRows.map((r, i) => {
    const m = metaMap.get(String(r.external_id));
    const c0 = coverFromRow(r);
    if (!c0) needStorage.push({ id: String(r.external_id), idx: i });

    const item: CatalogItem = {
      external_id: String(r.external_id),
      title: r.title ?? null,
      address: r.address ?? null,
      city: r.city ?? null,
      type: m?.type ?? null,
      available_area: null,
      total_area: m?.total_area ?? null,

      coverUrl: c0 ?? null,
      cover_url: c0 ?? null,
      photo: c0 ?? null,
      preview_url: c0 ?? null,

      price_per_m2_20: m?.price_per_m2_20 ?? null,
      price_per_m2_50: m?.price_per_m2_50 ?? null,
      price_per_m2_100: m?.price_per_m2_100 ?? null,
      price_per_m2_400: m?.price_per_m2_400 ?? null,
      price_per_m2_700: m?.price_per_m2_700 ?? null,
      price_per_m2_1500: m?.price_per_m2_1500 ?? null,
    };
    return item;
  });

  if (needStorage.length) {
    const covers = await Promise.all(needStorage.map(({ id }) => listFirstStorageFile(id)));
    covers.forEach((url, k) => {
      const idx = needStorage[k].idx;
      if (url) {
        out[idx].coverUrl = url;
        out[idx].cover_url = url;
        out[idx].photo = url;
        out[idx].preview_url = url;
      }
    });
  }

  return out;
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

export async function getProperty(external_id: string): Promise<CatalogItem | null> {
  if (!external_id) return null;
  const items = await getItems("");
  return items.find((x) => x.external_id === external_id) ?? null;
}
