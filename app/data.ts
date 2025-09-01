
// Server utilities for Vitrina
import { createClient as createSbClient } from "@supabase/supabase-js";

export type Row = Record<string, any>;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const TABLE = (process.env.NEXT_PUBLIC_DOMUS_TABLE as string) || "domus_export";
const ORDER_TABLE = "domus_field_order"; // columns: column_name, description, sort_order
const STORAGE_BUCKET = (process.env.NEXT_PUBLIC_STORAGE_BUCKET as string) || "photos";

function sb() {
  return createSbClient(URL, KEY, { auth: { persistSession: false } });
}

// ---- field order + labels (ru) ----
export type FieldMeta = { column_name: string; description?: string | null; sort_order?: number | null };
export async function fetchFieldOrder(): Promise<FieldMeta[]> {
  try {
    const { data, error } = await sb()
      .from(ORDER_TABLE)
      .select("column_name, description, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    // graceful fallback
    return [];
  }
}

export const mainKeys = [
  "tip_pomescheniya",
  "etazh",
  "dostupnaya_ploschad",
  "price_per_m2_20",
  "price_per_m2_50",
  "price_per_m2_100",
  "price_per_m2_400",
  "price_per_m2_700",
  "price_per_m2_1500",
];

// ---- list / cities ----
export async function fetchCities(): Promise<string[]> {
  const client = sb();
  const { data, error } = await client.from(TABLE).select("city").not("city","is",null);
  if (error) {
    return ["Все города"];
  }
  const uniq = Array.from(new Set((data ?? []).map(r => r.city).filter(Boolean))).sort((a:string,b:string)=>a.localeCompare(b));
  // Ensure single "Все города"
  return ["Все города", ...uniq.filter(c => c !== "Все города")];
}

export type Prices = Partial<{
  price_per_m2_20: number | string | null;
  price_per_m2_50: number | string | null;
  price_per_m2_100: number | string | null;
  price_per_m2_400: number | string | null;
  price_per_m2_700: number | string | null;
  price_per_m2_1500: number | string | null;
}>;

export async function fetchList(city?: string) {
  const client = sb();
  let query = client
    .from(TABLE)
    .select(`id, external_id, address, city, dostupnaya_ploschad, tip_pomescheniya, etazh,
      price_per_m2_20, price_per_m2_50, price_per_m2_100, price_per_m2_400, price_per_m2_700, price_per_m2_1500`)
    .limit(200);
  if (city && city !== "Все города") {
    query = query.eq("city", city);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Row[];
}

export async function fetchByExternalId(external_id: string) {
  const { data, error } = await sb().from(TABLE).select("*").eq("external_id", external_id).single();
  if (error) throw error;
  return data as Row;
}

// ---- storage (photos by external_id folder) ----
const IMAGE_EXT = [".jpg",".jpeg",".png",".webp",".gif"];
function isImage(name: string) {
  const lower = name.toLowerCase();
  return IMAGE_EXT.some(ext => lower.endsWith(ext));
}

export async function getGallery(external_id: string): Promise<string[]> {
  try {
    const client = sb();
    const { data, error } = await client.storage.from(STORAGE_BUCKET).list(external_id, {
      limit: 200, sortBy: { column: "name", order: "asc" }
    });
    if (error) throw error;
    const list = (data ?? []).filter(f => !f.id || f.name).filter(f => isImage(f.name));
    const urls = list.map(f => client.storage.from(STORAGE_BUCKET).getPublicUrl(`${external_id}/${f.name}`).data.publicUrl);
    return urls;
  } catch (e) {
    return [];
  }
}

export async function getFirstPhoto(external_id: string): Promise<string | null> {
  const g = await getGallery(external_id);
  return g[0] ?? null;
}
