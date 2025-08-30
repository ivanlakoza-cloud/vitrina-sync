/* lib/data.ts
 * Источники данных для главной и карточки объекта.
 * Работает через REST Supabase + Storage.
 */

export type PropertyRow = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  updated_at: string | null;
  // другие поля можем добавлять по мере готовности схемы
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

// Кодирует путь для public URL Storage (поштучно по сегментам)
function encodeStoragePath(p: string) {
  return p
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

async function supaGET(
  path: string,
  params: Record<string, string | undefined> = {}
) {
  const { url, anonKey } = getEnv();
  const u = new URL(url + path);
  // Для PostgREST допускаем апикей в query (удобно для edge/SSR)
  u.searchParams.set("apikey", anonKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) u.searchParams.set(k, v);
  }
  const r = await fetch(u.toString(), { cache: "no-store" });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} for ${u.toString()} :: ${txt}`);
  }
  return r.json();
}

// Первый файл в photos/<external_id>/ (если политика SELECT на storage.objects разрешена)
async function storageFirstPublicUrl(externalId: string) {
  const { url, anonKey } = getEnv();

  const listUrl = `${url}/storage/v1/object/list/photos`;
  const body = {
    prefix: `${externalId.replace(/^\/+/, "").replace(/\/+$/, "")}/`,
    limit: 1,
    offset: 0,
    sortBy: { column: "name", order: "asc" as const },
  };

  const r = await fetch(listUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!r.ok) return null;

  const arr: { name?: string }[] = await r.json();
  if (!Array.isArray(arr) || !arr.length || !arr[0]?.name) return null;

  const key = arr[0].name; // например: "id53/img_...jpg"
  const publicUrl = `${url}/storage/v1/object/public/photos/${encodeStoragePath(
    key
  )}`;
  return publicUrl;
}

function storagePublicUrlFromPath(path: string | null) {
  if (!path) return null;
  const { url } = getEnv();
  const normalized = path.replace(/^\/+/, "");
  return `${url}/storage/v1/object/public/${encodeStoragePath(normalized)}`;
}

async function chooseCover(p: PropertyRow): Promise<string | null> {
  // 1) Явный путь в Storage
  const fromStorageField = storagePublicUrlFromPath(p.cover_storage_path);
  if (fromStorageField) return fromStorageField;

  // 2) Первый файл в photos/<external_id>/
  if (p.external_id) {
    const fromBucket = await storageFirstPublicUrl(p.external_id);
    if (fromBucket) return fromBucket;
  }

  // 3) Внешняя ссылка как совсем крайний вариант
  return p.cover_ext_url ?? null;
}

/* ========= API ========= */

export async function getCatalog(
  opts: { city?: string } = {}
): Promise<CatalogResult> {
  const safeSelect = [
    "external_id",
    "title",
    "address",
    "city",
    "cover_storage_path",
    "cover_ext_url",
    "updated_at",
  ].join(",");

  const params: Record<string, string> = {
    select: safeSelect,
    order: "updated_at.desc.nullslast",
  };

  if (opts.city) {
    params["city"] = `eq.${opts.city}`;
  }

  const rows: PropertyRow[] = await supaGET(
    "/rest/v1/view_property_with_cover",
    params
  );

  // Параллельно подберём обложки (ограничим одновременность, чтобы не палить лимиты)
  const concurrency = 6;
  const queue: Promise<void>[] = [];
  const out: (PropertyRow & { coverUrl: string | null })[] = [];
  let i = 0;

  async function worker() {
    while (i < rows.length) {
      const idx = i++;
      const row = rows[idx];
      const coverUrl = await chooseCover(row);
      out[idx] = { ...row, coverUrl };
    }
  }
  for (let k = 0; k < Math.min(concurrency, rows.length); k++) {
    queue.push(worker());
  }
  await Promise.all(queue);

  // Список городов для фильтра (если понадобится)
  let cities: string[] = [];
  try {
    const facets: { city_name: string; count: number }[] = await supaGET(
      "/rest/v1/view_facets_city",
      { select: "city_name,count", order: "count.desc" }
    );
    cities = facets.map((f) => f.city_name).filter(Boolean);
  } catch {
    // опционально — игнорим
  }

  return { items: out, cities };
}

export async function getProperty(externalId: string) {
  const safeSelect = [
    "external_id",
    "title",
    "address",
    "city",
    "cover_storage_path",
    "cover_ext_url",
    "updated_at",
  ].join(",");

  const rows: PropertyRow[] = await supaGET(
    "/rest/v1/view_property_with_cover",
    {
      select: safeSelect,
      "external_id": `eq.${externalId}`,
      limit: "1",
    }
  );

  const row = rows[0];
  if (!row) return null;

  const coverUrl = await chooseCover(row);
  return { ...row, coverUrl };
}

// Все фото объекта (для галереи карточки, если потребуется)
export async function getPropertyPhotos(externalId: string): Promise<string[]> {
  const { url, anonKey } = getEnv();

  const listUrl = `${url}/storage/v1/object/list/photos`;
  const body = {
    prefix: `${externalId.replace(/^\/+/, "").replace(/\/+$/, "")}/`,
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" as const },
  };

  const r = await fetch(listUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok) return [];

  const arr: { name?: string }[] = await r.json();
  const { url: base } = getEnv();

  return arr
    .map((o) => o.name)
    .filter((n): n is string => !!n)
    .map(
      (name) =>
        `${base}/storage/v1/object/public/photos/${encodeStoragePath(name)}`
    );
}
