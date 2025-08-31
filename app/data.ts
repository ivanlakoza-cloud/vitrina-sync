import { supabase, PHOTOS_BUCKET, publicUrl, DOMUS_TABLE } from "@/lib/supabase";
import type { DomusRecord } from "@/lib/fields";

export async function fetchCities(): Promise<string[]> {
  const { data } = await supabase.from(DOMUS_TABLE).select("otobrazit_vse").not("otobrazit_vse","is",null);
  const s = new Set<string>(); for (const r of (data as any[])||[]) { const v=(r.otobrazit_vse||"").toString().trim(); if(v) s.add(v); }
  return Array.from(s).sort();
}

export async function fetchList(city?: string): Promise<DomusRecord[]> {
  let q = supabase.from(DOMUS_TABLE).select("*").order("created_at",{ascending:false});
  if (city) q = q.eq("otobrazit_vse", city);
  const { data } = await q;
  return (data||[]) as DomusRecord[];
}

export async function fetchByExternalId(external_id: string): Promise<DomusRecord | null> {
  const { data } = await supabase.from(DOMUS_TABLE).select("*").eq("id_obekta", external_id).maybeSingle();
  return (data as DomusRecord) || null;
}

async function listAny(bucket: string, id: string) {
  const variants = [id, id + "/", id.replace(/^\/+|\/+$/g,"")];
  for (const p of variants) {
    const { data } = await supabase.storage.from(bucket).list(p, { limit: 100 });
    if (data && data.length) return data;
  }
  return null;
}

export async function getFirstPhoto(id: string): Promise<string> {
  const data = await listAny(PHOTOS_BUCKET, id);
  if (data && data.length) return publicUrl(`${PHOTOS_BUCKET}/${id}/${data[0].name}`);
  return "/placeholder.svg";
}

export async function getGallery(id: string): Promise<string[]> {
  const data = await listAny(PHOTOS_BUCKET, id);
  if (data && data.length) return data.map(f => publicUrl(`${PHOTOS_BUCKET}/${id}/${f.name}`));
  return ["/placeholder.svg"];
}
