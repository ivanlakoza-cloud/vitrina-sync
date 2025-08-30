// lib/data.ts
import { listPhotoKeys, toPublicUrl } from "./photos";

export type CatalogItem = {
  external_id: string;
  title: string | null;
  address: string | null;
  city: string | null;
  type: string | null;
  total_area: number | null;
  available_area: number | null;
  cover_storage_path: string | null;
  cover_ext_url: string | null;
  price_per_m2_20: number | string | null;
  price_per_m2_50: number | string | null;
  price_per_m2_100: number | string | null;
  price_per_m2_400: number | string | null;
  price_per_m2_700: number | string | null;
  price_per_m2_1500: number | string | null;
  updated_at: string | null;
  // заполняем на фронт:
  coverUrl?: string | null;
};

function env() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return { url, anon, ok: !!url && !!anon };
}

function storagePublicUrl(path: string): string {
  const { url } = env();
  const clean = path.replace(/^photos\/+/i, ""); // на всякий случай
  return `${url}/storage/v1/object/public/photos/${encodeURIComponent(clean)}`;
}

async function pickCoverUrl(
  it: CatalogItem
): Promise<string | null | undefined> {
  // 1) Явно сохранённый путь в сторедже (предпочтительно)
  if (it.cover_storage_path && it.cover_storage_path.trim()) {
    return storagePublicUrl(it.cover_storage_path.trim());
  }

  // 2) Поищем первую фотку в photos/<external_id>/
  if (it.external_id) {
    try {
      const keys = await listPhotoKeys(it.external_id);
      if (keys.length) return toPublicUrl(keys[0]);
    } catch {
      // игнор — попробуем внешний URL
    }
  }

  // 3) Внешняя обложка (Я.Диск может отдавать 410 — но вдруг где-то есть 200)
  if (it.cover_ext_url && /^https?:\/\//i.test(it.cover_ext_url)) {
    return it.cover_ext_url;
  }

  return null;
}

export async function getCatalog({ city = "" }: { city?: string }) {
  const E = env();
  if (!E.ok) {
    return { items: [] as CatalogItem[], cities: [] as string[] };
  }

  // Базовый SELECT из view
  const base = [
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

  const params = new URLSearchParams();
  params.set("select", base);
  params.set("order", "updated_at.desc,nullslast");
  params.set("apikey", E.anon);
  if (city) params.set("city", `eq.${city}`);

  const url = `${E.url}/rest/v1/view_property_with_cover?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      apikey: E.anon,
      Authorization: `Bearer ${E.anon}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    // мягкий фоллбэк
    return { items: [] as CatalogItem[], cities: [] as string[] };
  }

  const raw = (await res.json()) as CatalogItem[];

  // Обогащаем coverUrl (storage → external)
  const items = await Promise.all(
    raw.map(async (it) => ({
      ...it,
      coverUrl: await pickCoverUrl(it),
    }))
  );

  // Список городов
  const citySet = new Set<string>();
  for (const it of raw) {
    if (it.city) citySet.add(String(it.city));
  }
  const cities = Array.from(citySet).sort((a, b) => a.localeCompare(b, "ru"));

  return { items, cities };
}
