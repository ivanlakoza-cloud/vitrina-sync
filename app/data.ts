import { supabase, PHOTOS_BUCKET, publicUrl, DOMUS_TABLE } from "@/lib/supabase";
import type { DomusRecord } from "@/lib/fields";

export async function fetchCities(): Promise<string[]> {
  const { data } = await supabase.from(DOMUS_TABLE).select("otobrazit_vse").not("otobrazit_vse","is",null);
  const set = new Set<string>();
  for (const row of (data as any[]) || []) {
    const v = (row.otobrazit_vse || "").toString().trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}

export async function fetchList(city?: string): Promise<DomusRecord[]> {
  let query = supabase.from(DOMUS_TABLE).select("*").order("created_at", { ascending: false });
  if (city) query = query.eq("otobrazit_vse", city);
  const { data } = await query;
  return (data || []) as DomusRecord[];
}

export async function fetchByExternalId(external_id: string): Promise<DomusRecord | null> {
  const { data } = await supabase.from(DOMUS_TABLE).select("*").eq("id_obekta", external_id).maybeSingle();
  return (data as DomusRecord) || null;
}

export async function getFirstPhoto(id: string): Promise<string> {
  const { data } = await supabase.storage.from(PHOTOS_BUCKET).list(id + "/", { limit: 100 });
  if (!data || data.length === 0) return "/placeholder.svg";
  const first = data[0].name;
  return publicUrl(`${PHOTOS_BUCKET}/${id}/${first}`);
}

export async function getGallery(id: string): Promise<string[]> {
  const { data } = await supabase.storage.from(PHOTOS_BUCKET).list(id + "/", { limit: 100 });
  if (!data || data.length === 0) return ["/placeholder.svg"];
  return data.map((f) => publicUrl(`${PHOTOS_BUCKET}/${id}/${f.name}`));
}
