
// Server utilities for Vitrina
import { createClient as createSbClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";

const sb = createSbClient(URL, KEY);

export type DomusRow = Record<string, any>;

const PRICE_KEYS = ["price_per_m2_20","price_per_m2_50","price_per_m2_100","price_per_m2_400","price_per_m2_700","price_per_m2_1500"];

export async function fetchCities(): Promise<string[]> {
  const { data, error } = await sb
    .from(TABLE)
    .select("city")
    .not("city", "is", null);
  if (error) return [];
  const set = new Set<string>();
  for (const r of data as any[]) {
    const c = (r.city || "").trim();
    if (!c) continue;
    if (c.toLowerCase() === "все города") continue; // исключаем служебное
    set.add(c);
  }
  return Array.from(set).sort((a,b) => a.localeCompare(b, "ru"));
}

export async function fetchList(city?: string) {
  let q = sb.from(TABLE).select("*");
  if (city && city !== "Все города") q = q.eq("city", city);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return (data || []).map((rec: any) => {
    const id = String(rec.id ?? rec.external_id ?? rec.id_obekta ?? "");
    return { id, rec };
  });
}

export async function fetchByExternalId(key: string): Promise<DomusRow | null> {
  // key might be like "id83" or plain external id
  const norm = key?.startsWith("id") ? key.slice(2) : key;
  // try by external_id
  let { data, error } = await sb.from(TABLE).select("*").eq("external_id", key).maybeSingle();
  if (!data) {
    // try by numeric id
    const asNum = Number(norm);
    if (!Number.isNaN(asNum)) {
      const r = await sb.from(TABLE).select("*").eq("id", asNum).maybeSingle();
      data = r.data || null;
    }
  }
  return (data as any) || null;
}

export async function getGallery(id: string): Promise<string[]> {
  // We expect bucket "photos" with folders like id{ID}/image.jpg
  const storage = sb.storage.from("photos");
  const folder = `id${id}`;
  const { data, error } = await storage.list(folder, { limit: 100 });
  if (error) return [];
  const urls: string[] = [];
  for (const f of data || []) {
    const { data: pub } = storage.getPublicUrl(`${folder}/${f.name}`);
    if (pub?.publicUrl) urls.push(pub.publicUrl);
  }
  return urls;
}

export async function getFirstPhoto(id: string): Promise<string | null> {
  const list = await getGallery(id);
  return list?.[0] || null;
}

// ---- Field order / labels ----
export type FieldOrder = {
  column_name: string;
  display_name_ru: string | null;
  sort_order: number | null;
  visible: boolean | null;
};

export async function fetchFieldOrder(): Promise<Map<string, FieldOrder>> {
  const { data, error } = await sb
    .from("domus_field_order")
    .select("column_name, display_name_ru, sort_order, visible");
  if (error) return new Map();
  const map = new Map<string, FieldOrder>();
  (data || []).forEach((r: any) => map.set(r.column_name, r as FieldOrder));
  return map;
}

export function mainKeys(rec: DomusRow): string[] {
  const base = [
    "tip_pomescheniya", // будет переименован в «Тип помещения» на клиенте
    "etazh",
    "dostupnaya_ploschad",
    ...PRICE_KEYS,
    "km_","km"
  ];
  // only keep keys that are present
  return base.filter(k => k in rec);
}
