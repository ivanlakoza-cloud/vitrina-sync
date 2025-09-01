// @ts-nocheck
// Server utilities for Vitrina (safe, minimal types)
import { createClient as createSbClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export function sb() {
  return createSbClient(URL, KEY, { auth: { persistSession: false } });
}

const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";

export async function fetchByExternalId(external_id: string) {
  const s = sb();
  const { data, error } = await s.from(TABLE).select("*").eq("external_id", external_id).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getGallery(rec: any): Promise<string[]> {
  // Heuristic: use Supabase Storage 'photos' bucket, folder by "idXX"
  // If you already have a better gallery function in your project, this will be ignored.
  try {
    const s = sb();
    const id = String(rec?.id_obekta || rec?.external_id || rec?.id || "");
    if (!id) return [];
    const folder = `id${id}`;
    const { data, error } = await s.storage.from("photos").list(folder, { limit: 100 });
    if (error || !data) return [];
    const urls: string[] = [];
    for (const f of data) {
      const { data: signed } = await s.storage.from("photos").createSignedUrl(`${folder}/${f.name}`, 60 * 60);
      if (signed?.signedUrl) urls.push(signed.signedUrl);
    }
    return urls;
  } catch {
    return [];
  }
}

/**
 * Column labels from DB comments via RPC.
 * Provide SQL from /db/get_column_labels.sql
 */
export async function fetchColumnLabels(table: string = TABLE): Promise<Record<string, string>> {
  const s = sb();
  try {
    const { data, error } = await s.rpc("get_column_labels", { p_schema: "public", p_table: table });
    if (error || !data) return {};
    const map: Record<string,string> = {};
    data.forEach((r: any) => { if (r.column_name && r.label) map[r.column_name] = r.label; });
    return map;
  } catch {
    return {};
  }
}

export async function fetchCities(): Promise<string[]> {
  const s = sb();
  const { data, error } = await s.from(TABLE).select("city").not("city","is","null");
  if (error || !data) return [];
  const set = new Set<string>();
  data.forEach((r: any) => { if (r.city) set.add(r.city); });
  return Array.from(set).sort((a,b)=>a.localeCompare(b,"ru"));
}
