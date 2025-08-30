
/* lib/data.ts (v2)
 * Упрощённый и более надёжный источник данных.
 * - Больше не запрашиваем несуществующие поля.
 * - Обложка: сначала ищем в Storage (photos/<external_id>/...), затем cover_storage_path, в конце cover_ext_url.
 * - Запросы без агрессивных order-параметров.
 */

export type PropertyRow = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  updated_at: string | null;
};

type CatalogResult = {
  items: (PropertyRow & { coverUrl: string | null })[];
  cities: string[];
};

/* ========= ENV ========= */

function getEnv() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    "";

  if (!url) throw new Error("SUPABASE_URL is not set");
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is not set");

  return { url: url.replace(/\/+$/, ""), anonKey };
}

/* ========= helpers ========= */

function enc(p: string) {
  return p
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

async function supaGET(path: string, params: Record<string, string> = {}) {
  const { url, anonKey } = getEnv();
  const u = new URL(url + path);
  u.searchParams.set("apikey", anonKey);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { cache: "no-store" });
  if (!r.ok) {
    let msg = "";
    try { msg = await r.text(); } catch {}
    throw new Error(`HTTP ${r.status} for ${u.toString()} :: ${msg}`);
  }
  return r.json();
}

function publicUrlFromStoragePath(path: string | null) {
  if (!path) return null;
  const { url } = getEnv();
  return `${url}/storage/v1/object/public/${enc(path)}`;
}

async function firstFromBucket(externalId: string) {
  const { url, anonKey } = getEnv();
  const listUrl = `${url}/storage/v1/object/list/photos`;
  const body = {
    prefix: `${externalId.replace(/^\/+/, "").replace(/\/+$/, "")}/`,
    limit: 1,
    offset: 0,
    sortBy: { column: "name", order: "asc" as const },
  };
  try {
    const r = await fetch(listUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: "no-store",
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const arr: { name?: string }[] = await r.json();
    if (!arr?.length || !arr[0]?.name) return null;
    return `${url}/storage/v1/object/public/photos/${enc(arr[0].name!)}`;
  } catch {
    return null;
  }
}

async function chooseCover(p: PropertyRow): Promise<string | null> {
  // 1) Пробуем bucket (самый надёжный источник)
  if (p.external_id) {
    const fromBucket = await firstFromBucket(p.external_id);
    if (fromBucket) return fromBucket;
  }
  // 2) Явный путь в Storage
  const fromPath = publicUrlFromStoragePath(p.cover_storage_path);
  if (fromPath) return fromPath;
  // 3) Внешняя ссылка как запасной вариант
  return p.cover_ext_url ?? null;
}

/* ========= API ========= */

export async function getCatalog(opts: { city?: string } = {}): Promise<CatalogResult> {
  const select = [
    "external_id",
    "title",
    "address",
    "city",
    "cover_storage_path",
    "cover_ext_url",
    "updated_at",
  ].join(",");

  const params: Record<string, string> = { select };
  if (opts.city) params["city"] = `eq.${opts.city}`;

  const rows: PropertyRow[] = await supaGET("/rest/v1/view_property_with_cover", params);

  // Параллельно подберём обложки (ограничим конкурентность)
  const out: (PropertyRow & { coverUrl: string | null })[] = Array(rows.length);
  let i = 0;
  const workers = Math.min(6, rows.length);
  async function worker() {
    while (i < rows.length) {
      const idx = i++;
      const row = rows[idx];
      const coverUrl = await chooseCover(row);
      out[idx] = { ...row, coverUrl };
    }
  }
  await Promise.all(Array.from({ length: workers }, worker));

  // Города
  let cities: string[] = [];
  try {
    const facets: { city_name: string }[] = await supaGET("/rest/v1/view_facets_city", {
      select: "city_name",
      order: "count.desc",
    });
    cities = facets.map((f) => f.city_name).filter(Boolean);
  } catch {}

  return { items: out.filter(Boolean), cities };
}

export async function getProperty(externalId: string) {
  const select = [
    "external_id",
    "title",
    "address",
    "city",
    "cover_storage_path",
    "cover_ext_url",
    "updated_at",
  ].join(",");
  const rows: PropertyRow[] = await supaGET("/rest/v1/view_property_with_cover", {
    select,
    external_id: `eq.${externalId}`,
    limit: "1",
  });
  const row = rows[0];
  if (!row) return null;
  const coverUrl = await chooseCover(row);
  return { ...row, coverUrl };
}

export async function getPropertyPhotos(externalId: string): Promise<string[]> {
  const { url, anonKey } = getEnv();
  const listUrl = `${url}/storage/v1/object/list/photos`;
  const body = {
    prefix: `${externalId.replace(/^\/+/, "").replace(/\/+$/, "")}/`,
    limit: 100,
    offset: 0,
    sortBy: { column: "name", order: "asc" as const },
  };
  try {
    const r = await fetch(listUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: "no-store",
      body: JSON.stringify(body),
    });
    if (!r.ok) return [];
    const arr: { name?: string }[] = await r.json();
    return arr
      .map((o) => o.name)
      .filter((n): n is string => !!n)
      .map((name) => `${url}/storage/v1/object/public/photos/${enc(name)}`);
  } catch {
    return [];
  }
}
