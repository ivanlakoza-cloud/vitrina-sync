// lib/data.ts
// Safe Supabase fetchers + cover URL resolution.
// Uses REST for table reads and Storage REST for listing photos (anon policy required).

type Row = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  updated_at: string | null;
};

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function q(obj: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    p.set(k, String(v));
  }
  return p.toString();
}

function publicUrlForStoragePath(path: string): string {
  // path like "id53/img_abc.jpg"
  const segments = path.split('/').map(encodeURIComponent).join('%2F');
  return `${SB_URL}/storage/v1/object/public/photos/${segments}`;
}

async function storageFirstKeyFor(id: string): Promise<string | null> {
  // POST /storage/v1/object/list/:bucket
  const url = `${SB_URL}/storage/v1/object/list/photos`;
  const body = {
    prefix: `${id.replace(/^\/+|\/+$/g, "")}/`,
    limit: 1,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SB_ANON,
      "Authorization": `Bearer ${SB_ANON}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const arr = await r.json();
  if (Array.isArray(arr) && arr.length && arr[0]?.name) {
    return String(arr[0].name);
  }
  return null;
}

async function resolveCoverUrl(row: Row): Promise<string | null> {
  // 1) First photo from Storage (photos/<id>/...) if exists
  const first = await storageFirstKeyFor(row.external_id);
  if (first) return publicUrlForStoragePath(first);

  // 2) cover_storage_path as public URL
  if (row.cover_storage_path) return publicUrlForStoragePath(row.cover_storage_path);

  // 3) External URL from Yandex Disk (may be 410, but last fallback)
  if (row.cover_ext_url) return row.cover_ext_url;

  return null;
}

export async function getCatalog(opts: { city?: string } = {}) {
  const select =
    "external_id,title,address,city,cover_storage_path,cover_ext_url,updated_at";
  let url = `${SB_URL}/rest/v1/view_property_with_cover?` + q({
    select,
    order: "updated_at.desc.nullslast",
  });

  if (opts.city) {
    url += `&city=eq.${encodeURIComponent(opts.city)}`;
  }

  const r = await fetch(url, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    cache: "no-store",
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`HTTP ${r.status} for ${url} :: ${text}`);
  }
  const rows: Row[] = await r.json();

  const out = [];
  for (const row of rows) {
    const coverUrl = await resolveCoverUrl(row);
    out.push({
      ...row,
      coverUrl,
    });
  }
  return out;
}

export async function getProperty(external_id: string) {
  const select = "*";
  const url =
    `${SB_URL}/rest/v1/view_property_with_cover?` +
    q({ select, external_id: `eq.${external_id}`, limit: 1 });
  const r = await fetch(url, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const arr: Row[] = await r.json();
  const row = arr[0] || null;
  if (!row) return null;

  // Gallery: list up to 24 photos under the folder
  const listUrl = `${SB_URL}/storage/v1/object/list/photos`;
  const lr = await fetch(listUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SB_ANON,
      Authorization: `Bearer ${SB_ANON}`,
    },
    body: JSON.stringify({
      prefix: `${external_id}/`,
      limit: 24,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    }),
    cache: "no-store",
  });
  const gallery: string[] = [];
  if (lr.ok) {
    const items = await lr.json();
    if (Array.isArray(items)) {
      for (const it of items) {
        if (it?.name) gallery.push(publicUrlForStoragePath(it.name));
      }
    }
  }

  const coverUrl = await resolveCoverUrl(row);
  return { ...row, coverUrl, gallery };
}