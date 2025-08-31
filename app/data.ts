import { supabase, DOMUS_TABLE, PHOTOS_BUCKET } from "@/lib/supabase";
import { DomusRecord } from "@/lib/fields";

export async function fetchAll(): Promise<DomusRecord[]> {
  const { data, error } = await supabase
    .from(DOMUS_TABLE)
    .select("*")
    .order("external_id", { ascending: true })
    .limit(1000);
  if (error) {
    console.error(error);
    return [];
  }
  return data as DomusRecord[];
}

export async function fetchByExternalId(id: string): Promise<DomusRecord | null> {
  const { data, error } = await supabase
    .from(DOMUS_TABLE)
    .select("*")
    .eq("external_id", id)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return data as DomusRecord | null;
}

// Первое фото из бакета или заглушка
export async function getCoverUrl(externalId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .storage
      .from(PHOTOS_BUCKET)
      .list(externalId, { limit: 100, sortBy: { column: "name", order: "asc" } });
    if (!error && data && data.length) {
      const first = data.find(x => /\.(jpg|jpeg|png|webp|gif)$/i.test(x.name)) || data[0];
      const { data: pub } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(`${externalId}/${first.name}`);
      if (pub?.publicUrl) return pub.publicUrl;
    }
  } catch (e) { console.error(e); }
  return "/placeholder.svg";
}

// Только фото из бакета (без других источников)
export async function getGallery(externalId: string): Promise<string[]> {
  const urls: string[] = [];
  try {
    const { data, error } = await supabase
      .storage
      .from(PHOTOS_BUCKET)
      .list(externalId, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (!error && data) {
      for (const f of data) {
        if (/\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)) {
          const { data: pub } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(`${externalId}/${f.name}`);
          if (pub?.publicUrl) urls.push(pub.publicUrl);
        }
      }
    }
  } catch (e) { console.error(e); }
  return urls;
}
