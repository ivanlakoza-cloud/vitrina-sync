// lib/data.ts
// Источники: Supabase REST + (опционально) Directus для UI-настроек.
// Кэш: 5 минут для каталога и списка городов.

export type CatalogItem = {
  id?: number;
  external_id: string;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  type?: string | null;
  total_area?: number | null;
  available_area?: number | null;

  // обложка (сырые поля из view)
  cover_storage_path?: string | null;
  cover_ext_url?: string | null;

  // вычисляемое поле
  coverUrl?: string | null;

  // возможные цены (если есть во view)
  price_per_m2_20?: number | null;
  price_per_m2_50?: number | null;
  price_per_m2_100?: number | null;
  price_per_m2_400?: number | null;
  price_per_m2_700?: number | null;
  price_per_m2_1500?: number | null;

  updated_at?: string | null;
};

export type CatalogResult = {
  items: CatalogItem[];
  cities: string[];
  ui: {
    card_fields_order: string[];
    show_city_filter: boolean;
  };
};

const FIVE_MIN = 300;

// ========= ENV & helpers =========

function supabaseEnv() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (process.env.SUPABASE_URL as string) ||
    "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (process.env.SUPABASE_ANON_KEY as string) ||
    "";
  return { url: url.replace(/\/+$/, ""), anon };
}

function cmsEnv() {
  const url =
    process.env.NEXT_PUBLIC_DIRECTUS_URL ||
    process.env.NEXT_PUBLIC_CMS_URL ||
    "";
  return { url: url.replace(/\/+$/, "") };
}

function publicStorageUrl(bucket: string, key: string) {
  const { url } = supabaseEnv();
  // Разрешаем слэши в key; кодируем сегменты
  const parts = key.split("/").map(encodeURIComponent).join("/");
  return `${url}/storage/v1/object/public/${encodeURIComponent(
    bucket
  )}/${parts}`;
}

async function supa<T>(
  pathWithQuery: string,
  init?: RequestInit,
  revalidateSec: number = FIVE_MIN
): Promise<T> {
  const { url, anon } = supabaseEnv();
  const full =
    pathWithQuery.includes("?") && !pathWithQuery.includes("apikey=")
      ? `${url}${pathWithQuery}&apikey=${anon}`
      : `${url}${pathWithQuery}${
          pathWithQuery.includes("?") ? "&" : "?"
        }apikey=${anon}`;
  const res = await fetch(full, {
    ...init,
    next: { revalidate: revalidateSec },
    // На листинг storage нужен Authorization: Bearer <anon>
    headers: {
      ...(init && init.headers),
      Authorization: `Bearer ${anon}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${full} :: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Вернуть первый ключ из photos/<external_id>/… (если есть)
async function getFirstPhotoKey(external_id: string): Promise<string | null> {
  const body = {
    // Важно: prefix БЕЗ ведущего слэша
    prefix: `${external_id}/`,
    limit: 1,
    offset: 0,
    sortBy: { column: "name", order: "asc" as const },
  };
  const { url } = supabaseEnv();
  const res = await fetch(`${url}/storage/v1/object/list/photos`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseEnv().anon}`,
    },
    next: { revalidate: FIVE_MIN },
  });
  if (!res.ok) return null;
  const arr: Array<{ name: string }> = await res.json().catch(() => []);
  if (!arr || !arr.length) return null;
  // API отдаёт name без префикса, добавим сами
  const name = arr[0]?.name || "";
  const key =
    name.startsWith(`${external_id}/`) ? name : `${external_id}/${name}`;
  return key;
}

function compact<T>(arr: (T | null | undefined)[]) {
  return arr.filter(Boolean) as T[];
}

// ========= Публичное API для страницы =========

export async function getCatalog({
  city = "",
}: {
  city?: string;
} = {}): Promise<CatalogResult> {
  const { url } = supabaseEnv();
  if (!url) {
    return {
      items: [],
      cities: [],
      ui: {
        card_fields_order: [
          "photo",
          "city",
          "address",
          "type",
          "floor",
          "prices",
        ],
        show_city_filter: true,
      },
    };
  }

  // 1) Тянем список объектов
  const params = new URLSearchParams();
  params.set(
    "select",
    [
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
    ].join(",")
  );
  if (city) params.set("city", `eq.${city}`);
  params.set("order", "updated_at.desc");

  const rawItems = await supa<CatalogItem[]>(
    `/rest/v1/view_property_with_cover?${params.toString()}`
  );

  // 1a) Рассчитаем coverUrl
  const items: CatalogItem[] = [];
  for (const it of rawItems) {
    let cover: string | null = null;

    // a) если указан cover_storage_path — используем его
    if (it.cover_storage_path) {
      cover = publicStorageUrl("photos", it.cover_storage_path);
    }

    // b) иначе — берём первый файл из photos/<id>/…
    if (!cover && it.external_id) {
      const key = await getFirstPhotoKey(it.external_id).catch(() => null);
      if (key) cover = publicStorageUrl("photos", key);
    }

    // c) иначе — внешняя ссылка (если она ещё жива)
    if (!cover && it.cover_ext_url) {
      cover = it.cover_ext_url;
    }

    items.push({ ...it, coverUrl: cover });
  }

  // 2) Список городов (из вьюхи-агрегатора, если есть)
  let cities: string[] = [];
  try {
    const cs = await supa<Array<{ city_name: string; count: number }>>(
      "/rest/v1/view_facets_city?select=city_name,count&order=count.desc"
    );
    cities = compact(cs.map((x) => x.city_name)).sort((a, b) =>
      a.localeCompare(b, "ru")
    );
  } catch {
    // Fallback: соберём из данных
    const set = new Set<string>();
    for (const it of items) if (it.city) set.add(it.city);
    cities = Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }

  // 3) UI-конфиг из Directus (не обязателен)
  let ui: CatalogResult["ui"] = {
    card_fields_order: [
      "photo",
      "city",
      "address",
      "type",
      "floor",
      "prices",
    ],
    show_city_filter: true,
  };
  try {
    const { url: cms } = cmsEnv();
    if (cms) {
      const resp = await fetch(
        `${cms}/items/ui_home_config?limit=1&fields=card_fields_order,show_city_filter`,
        { next: { revalidate: FIVE_MIN } }
      );
      if (resp.ok) {
        const j = await resp.json().catch(() => ({} as any));
        const row = Array.isArray(j?.data) ? j.data[0] : null;
        const order = Array.isArray(row?.card_fields_order)
          ? row.card_fields_order
          : ui.card_fields_order;
        const show = typeof row?.show_city_filter === "boolean" ? row.show_city_filter : ui.show_city_filter;
        ui = { card_fields_order: order, show_city_filter: show };
      }
    }
  } catch {
    // молча — фоллбэк уже есть
  }

  return { items, cities, ui };
}

// Детальная: получить один объект по external_id
export async function getProperty(external_id: string): Promise<CatalogItem | null> {
  if (!external_id) return null;
  const params = new URLSearchParams();
  params.set(
    "select",
    [
      "external_id",
      "title",
      "address",
      "city",
      "type",
      "total_area",
      "available_area",
      "cover_storage_path",
      "cover_ext_url",
      "updated_at",
      "price_per_m2_20",
      "price_per_m2_50",
      "price_per_m2_100",
      "price_per_m2_400",
      "price_per_m2_700",
      "price_per_m2_1500",
    ].join(",")
  );
  params.set("external_id", `eq.${external_id}`);
  params.set("limit", "1");

  const rows = await supa<CatalogItem[]>(
    `/rest/v1/view_property_with_cover?${params.toString()}`
  );
  const it = rows[0];
  if (!it) return null;

  let cover: string | null = null;
  if (it.cover_storage_path) cover = publicStorageUrl("photos", it.cover_storage_path);
  if (!cover) {
    const key = await getFirstPhotoKey(it.external_id).catch(() => null);
    if (key) cover = publicStorageUrl("photos", key);
  }
  if (!cover && it.cover_ext_url) cover = it.cover_ext_url;

  return { ...it, coverUrl: cover };
}
