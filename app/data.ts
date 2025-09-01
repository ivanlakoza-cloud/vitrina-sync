
import { supabase } from "@/lib/supabase";

type AnyRec = Record<string, any>;

// Map new DB column names -> legacy keys used in UI
function normalize(rec: AnyRec): AnyRec {
  const r: AnyRec = { ...rec };

  // City/address
  r.city = rec.city ?? rec.otobrazit_vse ?? null;
  r.address = rec.address ?? rec.adres_23_58 ?? rec.adres_avito ?? null;

  // Keep legacy keys alive so существующие компоненты не ломались
  if (r.city && !r.otobrazit_vse) r.otobrazit_vse = r.city;
  if (r.address && !r.adres_avito) r.adres_avito = r.address;

  // KM %, вход
  r.km = rec.km_ ?? rec.km ?? null;
  r.vhod = rec.vkhod ?? rec.vhod ?? null;

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

const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE as string;

// ----- Catalog (list) -----

export async function fetchCatalog(city?: string) {
  let q = supabase.from(TABLE).select("*");
  if (city && city !== "Все города") {
    // New column
    q = q.eq("city", city);
  }
  const { data, error } = await q.order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

// aliases for backward compatibility with older imports
export const fetchData = fetchCatalog;
export const getAll = fetchCatalog;

// ----- Single record -----
export async function fetchByExternalId(external_id: string) {
  const { data, error } = await supabase.from(TABLE).select("*").eq("external_id", external_id).limit(1).single();
  if (error) throw error;
  return normalize(data as AnyRec);
}
export const fetchRecord = fetchByExternalId;

// ----- Cities list -----
export async function getCities(): Promise<string[]> {
  // Read both columns to be safe
  const { data, error } = await supabase.from(TABLE).select("city, otobrazit_vse");
  if (error) throw error;
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.city) set.add(row.city);
    else if (row.otobrazit_vse) set.add(row.otobrazit_vse);
  }
  return ["Все города", ...Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'))];
}
