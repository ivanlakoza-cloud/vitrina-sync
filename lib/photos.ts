// lib/photos.ts
const BUCKET = "photos";

function getEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return { url, anon };
}

export async function listPhotoKeys(externalId: string): Promise<string[]> {
  const { url, anon } = getEnv();
  if (!url || !anon || !externalId) return [];

  const listUrl = `${url}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`;
  const prefix = `${externalId.replace(/^\/+|\/+$/g, "")}/`;
  const body = {
    prefix,
    limit: 100,
    offset: 0,
    sortBy: { column: "name", order: "asc" as const },
  };

  const res = await fetch(listUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const items = (await res.json()) as Array<{ name: string }>;
  return items.map((it) => `${prefix}${it.name}`);
}

export function toPublicUrl(key: string): string | null {
  const { url } = getEnv();
  if (!url || !key) return null;
  return `${url}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(key)}`;
}
