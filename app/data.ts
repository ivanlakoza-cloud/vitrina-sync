// Server data helpers (no client imports)
import { unstable_noStore as noStore } from "next/cache";
import { createClient as createSbClient } from "@supabase/supabase-js";
import type { FieldOrder } from "@/lib/fields";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";
const BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";

function sb() {
  return createSbClient(URL, KEY);
}

// ---------- Home page helpers ----------

/** Список городов из колонок: city / City / "Город" (уникальные, отсортированы). */
export async function fetchCities(): Promise<string[]> {
  noStore();
  const client = sb();
  // Берём все три возможные колонки и собираем Set на клиенте
  const { data, error } = await client
    .from(TABLE)
    .select('city, City, "Город"')
    .limit(1000);
  if (error) {
    console.warn("fetchCities error:", error.message);
  }
  const set = new Set<string>();
  (data || []).forEach((row: any) => {
    const v = String(row?.city ?? row?.City ?? row?.["Город"] ?? "").trim();
    if (v) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

/** Список типов помещений (уникальные, отсортированы). */
export async function fetchTypes(): Promise<string[]> {
  noStore();
  const client = sb();
  const { data, error } = await client
    .from(TABLE)
    .select("tip_pomescheniya")
    .not("tip_pomescheniya", "is", null)
    .limit(2000);
  if (error) {
    console.warn("fetchTypes error:", error.message);
  }
  const set = new Set<string>();
  (data || []).forEach((r: any) => {
    const v = String(r?.tip_pomescheniya ?? "").trim();
    if (v) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

/** Карточки для главной с AND-фильтром по городу и типу. */
export async function fetchList(city?: string, type?: string): Promise<any[]> {
  noStore();
  const client = sb();
  let q = client.from(TABLE).select("*").order("id", { ascending: true }).limit(120);

  const selectedCity = (city ?? "").trim();
  if (selectedCity && selectedCity !== "Все города") {
    // OR-фильтр по нескольким колонкам города
    // Значение город может содержать запятую — заключаем в кавычки
    const quoted = selectedCity.replace(/"/g, '\"');
    q = q.or(`city.eq."${quoted}",City.eq."${quoted}","Город".eq."${quoted}"` as any);
  }
  if ((type ?? "").trim()) {
    q = q.eq("tip_pomescheniya", type);
  }

  const { data, error } = await q;
  if (error) {
    console.warn("fetchList error:", error.message);
  }
  return (data || []) as any[];
}

// ---------- Detail page helpers ----------

/** Заказ полей с русскими названиями и флагом видимости. */
export async function fetchFieldOrder(): Promise<Record<string, FieldOrder>> {
  noStore();
  const client = sb();
  const { data, error } = await client
    .from("domus_field_order_view")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.warn("fetchFieldOrder error:", error.message);
  }
  const rows = data || [];
  const dict: Record<string, FieldOrder> = {};
  rows.forEach((r: any) => {
    dict[r.column_name] = {
      display_name_ru: r.display_name_ru,
      sort_order: r.sort_order,
      visible: typeof r.visible === "boolean" ? r.visible : true,
    };
  });
  return dict;
}

/** Получить запись по external_id. */
export async function fetchByExternalId(external_id: string): Promise<any | null> {
  noStore();
  const client = sb();
  const { data, error } = await client.from(TABLE).select("*").eq("external_id", external_id).maybeSingle();
  if (error) {
    console.warn("fetchByExternalId error:", error.message);
  }
  return data ?? null;
}

/** Список публичных ссылок на фото из бакета по папке external_id/. */
export async function getGallery(external_id: string): Promise<string[]> {
  noStore();
  const client = sb();
  const prefix = external_id.endsWith("/") ? external_id : `${external_id}/`;
  const { data, error } = await client.storage.from(BUCKET).list(prefix, { limit: 200, offset: 0 });
  if (error || !data) return [];
  const urls: string[] = [];
  for (const f of data) {
    if (f.name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)) {
      const pub = client.storage.from(BUCKET).getPublicUrl(prefix + f.name);
      urls.push(pub.data.publicUrl);
    }
  }
  return urls;
}

export async function getFirstPhoto(external_id: string): Promise<string | null> {
  const photos = await getGallery(external_id);
  return photos[0] || null;
}
