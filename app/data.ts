// Server data helpers (no client imports)
import { unstable_noStore as noStore } from "next/cache";
import { createClient as createSbClient } from "@supabase/supabase-js";
import type { FieldOrder } from "@/lib/fields";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";
const BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";

function sb() { return createSbClient(URL, KEY); }
function cityKey(r: any): string {
  return String(r?.city ?? r?.City ?? r?.["Город"] ?? "").trim();
}

// ---------- Home page helpers ----------

/** Список городов (уникальные) из колонок City и city. Безопасно для prod (игнорирует ошибки). */
export async function fetchCities(): Promise<string[]> {
  noStore();
  const client = sb();
  const set = new Set<string>();

  try {
    const { data } = await client.from(TABLE).select("City").not("City", "is", null).limit(5000);
    (data || []).forEach((r: any) => { const v = String(r?.City ?? "").trim(); if (v) set.add(v); });
  } catch {}

  try {
    const { data } = await client.from(TABLE).select("city").not("city", "is", null).limit(5000);
    (data || []).forEach((r: any) => { const v = String(r?.city ?? "").trim(); if (v) set.add(v); });
  } catch {}

  // Если в таблице есть локализованная "Город" — попытаемся, но молча игнорируем ошибку
  try {
    const { data } = await client.from(TABLE).select('"Город"').not('"Город"', "is", null).limit(5000);
    (data || []).forEach((r: any) => { const v = String(r?.["Город"] ?? "").trim(); if (v) set.add(v); });
  } catch {}

  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

/** Типы помещений (уникальные). */
export async function fetchTypes(): Promise<string[]> {
  noStore();
  const client = sb();
  const { data } = await client.from(TABLE).select("tip_pomescheniya").not("tip_pomescheniya", "is", null).limit(5000);
  const set = new Set<string>();
  (data || []).forEach((r: any) => { const v = String(r?.tip_pomescheniya ?? "").trim(); if (v) set.add(v); });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

/** Список карточек. Фильтр по type — на БД, по city — на сервере по полям city/City/Город. */
export async function fetchList(city?: string, type?: string): Promise<any[]> {
  noStore();
  const client = sb();
  let q = client.from(TABLE).select("*").order("id", { ascending: true }).limit(120);
  if ((type ?? "").trim()) q = q.eq("tip_pomescheniya", type);
  const { data } = await q;
  const rows = (data || []) as any[];

  const selected = String(city ?? "").trim();
  if (!selected || selected === "Все города") return rows;

  return rows.filter((r) => cityKey(r) === selected);
}

// ---------- Detail page helpers ----------

/** Порядок/названия полей. */
export async function fetchFieldOrder(): Promise<Record<string, FieldOrder>> {
  noStore();
  const client = sb();
  const { data } = await client.from("domus_field_order_view").select("*").order("sort_order", { ascending: true });
  const dict: Record<string, FieldOrder> = {};
  (data || []).forEach((r: any) => {
    dict[r.column_name] = {
      display_name_ru: r.display_name_ru,
      sort_order: r.sort_order,
      visible: typeof r.visible === "boolean" ? r.visible : true,
    };
  });
  return dict;
}

export async function fetchByExternalId(external_id: string): Promise<any | null> {
  noStore();
  const client = sb();
  const { data } = await client.from(TABLE).select("*").eq("external_id", external_id).maybeSingle();
  return data ?? null;
}

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
