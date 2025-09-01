// Server utilities for Vitrina
import { createClient as createSbClient } from "@supabase/supabase-js";

export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
export const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
export const TABLE = (process.env.NEXT_PUBLIC_DOMUS_TABLE as string) || "domus_export";
const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";

export const sb = createSbClient(URL, KEY, { auth: { persistSession: false } });

export async function fetchCities(): Promise<string[]> {
  const { data, error } = await sb.from(TABLE).select("city").neq("city", null);
  if (error) throw error;
  const set = new Set<string>();
  for (const row of (data ?? [])) {
    const v = (row as any).city as string | null;
    if (v) set.add(v);
  }
  const list = Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  return list;
}

export async function fetchList(city?: string) {
  let q = sb.from(TABLE).select("*").order("id", { ascending: true }).limit(300);
  if (city && city !== "Все города") q = q.eq("city", city);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function fetchByExternalId(external_id: string) {
  const { data, error } = await sb.from(TABLE).select("*").eq("external_id", external_id).single();
  if (error) throw error;
  return data as any;
}

export async function getGallery(external_id: string): Promise<string[]> {
  if (!external_id) return [];
  const { data, error } = await sb
    .storage
    .from(PHOTOS_BUCKET)
    .list(external_id, { sortBy: { column: "name", order: "asc" } });
  if (error) return [];
  return (data ?? [])
    .filter(o => /\.(jpe?g|png|webp)$/i.test(o.name))
    .map(o => sb.storage.from(PHOTOS_BUCKET).getPublicUrl(`${external_id}/${o.name}`).data.publicUrl);
}

export async function getFirstPhoto(external_id?: string | null): Promise<string | null> {
  if (!external_id) return null;
  const urls = await getGallery(external_id);
  return urls[0] || null;
}

export type FieldOrder = {
  column_name: string;
  display_name_ru: string | null;
  sort_order: number | null;
  visible: boolean | null;
};

export async function fetchFieldOrder(): Promise<Record<string, FieldOrder>> {
  // берем из таблицы domus_field_order (или вью, если нужна) — сортировка будет применяться на уровне страницы
  const { data, error } = await sb
    .from("domus_field_order")
    .select("column_name, display_name_ru, sort_order, visible");
  if (error) return {};
  const map: Record<string, FieldOrder> = {};
  for (const r of (data ?? []) as any[]) {
    map[r.column_name] = r as FieldOrder;
  }
  return map;
}

export function mainKeys() {
  return [
    "tip_pomescheniya",
    "etazh",
    "dostupnaya_ploschad",
    "price_per_m2_20",
    "price_per_m2_50",
    "price_per_m2_100",
    "price_per_m2_400",
    "price_per_m2_700",
    "price_per_m2_1500",
    "km_",
  ];
}