
// Server data helpers for Vitrina (Supabase)
// This file purposely exports the names used by the app entrypoints.

import { createClient as createSbClient } from "@supabase/supabase-js";

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  as string;
const KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const TABLE = (process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export") as string;
const BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";

const sb = createSbClient(URL, KEY);

// Transparent 1x1 GIF (works as always-valid string src)
const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

// ---- Labels (from column descriptions via optional RPC) ----
export async function fetchColumnLabels(): Promise<Record<string,string>> {
  try {
    const { data, error } = await sb.rpc("get_column_labels", { schema: "public", table: TABLE });
    if (error || !data) return {};
    // expect [{column:'name', comment:'label'}]
    const map: Record<string,string> = {};
    (data as any[]).forEach((r:any) => { if (r?.column && r?.comment) map[r.column] = r.comment; });
    return map;
  } catch (_) {
    return {};
  }
}

// ---- Cities ----
export async function fetchCities(): Promise<string[]> {
  const { data, error } = await sb
    .from(TABLE)
    .select("city", { count: "exact" })
    .not("city", "is", null);
  if (error || !data) return ["Все города"];
  const set = new Set<string>();
  data.forEach((r:any) => { if (r.city) set.add(String(r.city)); });
  const list = Array.from(set).sort((a,b)=>a.localeCompare(b, "ru"));
  // убрать потенциальное "Все города" из данных
  const filtered = list.filter(c => c.trim().toLowerCase() !== "все города");
  return ["Все города", ...filtered];
}

// ---- List ----
export async function fetchList(city?: string): Promise<any[]> {
  let q = sb.from(TABLE).select("*").order("id", { ascending: true }).limit(1000);
  if (city && city !== "Все города") q = q.eq("city", city);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as any[];
}

// ---- Single by id/external_id ----
export async function fetchByExternalId(idOrExternal: string): Promise<any|null> {
  // try as external_id then as id
  let { data, error } = await sb.from(TABLE).select("*").eq("external_id", idOrExternal).single();
  if (error) {
    const { data: d2 } = await sb.from(TABLE).select("*").eq("id", idOrExternal).single();
    return d2 ?? null;
  }
  return data ?? null;
}

// ---- Photos ----
export async function getFirstPhoto(id: string): Promise<string> {
  const gal = await getGallery(id);
  if (gal.length) return gal[0];
  // fallback: attempt to read disk_foto_plan column (comma/space separated urls)
  try {
    const { data } = await sb.from(TABLE).select("disk_foto_plan").eq("id", id).single();
    const raw = (data as any)?.disk_foto_plan as string | null;
    if (raw) {
      const guess = raw.split(/[\s,;\n]+/).find(Boolean);
      if (guess) return guess;
    }
  } catch {}
  return BLANK_IMG;
}

export async function getGallery(id: string): Promise<string[]> {
  try {
    const folder = `id${id}`;
    const { data, error } = await sb.storage.from(BUCKET).list(folder);
    if (error || !data) return [];
    // public URLs
    const urls = data
      .filter((f:any) => !f.name.startsWith(".") )
      .map((f:any) => sb.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl)
      .filter(Boolean);
    return urls;
  } catch {
    return [];
  }
}
