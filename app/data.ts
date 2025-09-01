
import { supabase } from "@/lib/supabase";

type AnyRec = Record<string, any>;

const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE as string;

// -------- Normalization layer (new/old columns compatibility) ----------
export function normalize(rec: AnyRec): AnyRec {
  const r: AnyRec = { ...rec };

  // City & address
  r.city = rec.city ?? rec.otobrazit_vse ?? null;
  r.address = rec.address ?? rec.adres_23_58 ?? rec.adres_avito ?? null;

  // Keep legacy keys too (so UI that still reads старые поля не ломается)
  if (r.city && !r.otobrazit_vse) r.otobrazit_vse = r.city;
  if (r.address && !r.adres_avito) r.adres_avito = r.address;

  // Route ID (external_id used in URLs) — fallback to id_obekta or id
  r.external_id = rec.external_id ?? rec.id_obekta ?? rec.id ?? null;
  if (r.external_id != null) r.external_id = String(r.external_id);

  // KM % and entry
  r.km_ = rec.km_ ?? rec.km ?? null;
  r.vkhod = rec.vkhod ?? rec.vhod ?? null;
  // also keep old aliases:
  r.km = r.km_;

  // Prices: fill both new and old keys
  const pairs: [string, string][] = [
    ["price_per_m2_20", "ot_20"],
    ["price_per_m2_50", "ot_50"],
    ["price_per_m2_100", "ot_100"],
    ["price_per_m2_400", "ot_400"],
    ["price_per_m2_700", "ot_700"],
    ["price_per_m2_1500", "ot_1500"],
  ];
  for (const [n, o] of pairs) {
    const val = rec[n] ?? rec[o] ?? null;
    r[n] = val;
    r[o] = val;
  }

  return r;
}

// ----------------- Queries -----------------

// List (catalog)
export async function fetchCatalog(city?: string) {
  let q = supabase.from(TABLE).select("*");
  if (city && city !== "Все города") {
    const c = city.trim();
    q = q.eq("city", c);
  }
  const { data, error } = await q.order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

// Single record by external_id (or id_obekta / id fallback)
export async function fetchByExternalId(extId: string) {
  const id = String(extId);
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .or(`external_id.eq.${id},id_obekta.eq.${id},id.eq.${id}`)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalize(data as AnyRec);
}

// Cities list for filter (robust to schema changes)
export async function getCities(): Promise<string[]> {
  const { data, error } = await supabase.from(TABLE).select("city");
  if (error) throw error;
  const set = new Set<string>();
  for (const row of data ?? []) {
    const c = (row as AnyRec).city;
    if (typeof c === "string" && c.trim().length) set.add(c.trim());
  }
  return ["Все города", ...Array.from(set).sort((a, b) => a.localeCompare(b, "ru"))];
}

// Aliases (backward compatibility)
export const fetchData = fetchCatalog;
export const getAll = fetchCatalog;
export const fetchRecord = fetchByExternalId;
