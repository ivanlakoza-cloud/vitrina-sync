
import { createClient } from "@/lib/supabase";
import type { DomusRow } from "@/lib/fields";

const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";
const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";

export async function fetchCities(): Promise<string[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from(TABLE)
    .select("city")
    .order("city", { ascending: true });
  if (error) { console.error(error); return []; }
  const set = new Set<string>();
  for (const r of data || []) {
    if (r.city) set.add(r.city);
  }
  return Array.from(set);
}

export async function fetchList(city?: string) {
  const sb = createClient();
  let q = sb.from(TABLE).select("*").order("id", { ascending: true }).limit(1000);
  if (city && city !== "Все города") q = q.eq("city", city);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return data as DomusRow[];
}

export async function fetchByExternalId(slug: string): Promise<DomusRow | null> {
  const sb = createClient();
  const idNum = slug.startsWith("id") ? Number(slug.slice(2)) : Number(slug);
  if (!Number.isNaN(idNum)) {
    const r1 = await sb.from(TABLE).select("*").eq("id", idNum).maybeSingle();
    if (r1.data) return r1.data as DomusRow;
  }
  const r2 = await sb.from(TABLE).select("*").eq("external_id", slug).maybeSingle();
  return (r2.data as DomusRow) ?? null;
}

export async function getFirstPhoto(idLike: string | number): Promise<string | null> {
  const sb = createClient();
  const folder = `id${idLike}`;
  const { data, error } = await sb.storage.from(PHOTOS_BUCKET).list(folder, { limit: 1 });
  if (error) { return null; }
  if (!data || data.length === 0) return null;
  const file = data[0].name;
  const { data: pub } = sb.storage.from(PHOTOS_BUCKET).getPublicUrl(`${folder}/${file}`);
  return pub?.publicUrl ?? null;
}

export async function getGallery(idLike: string | number): Promise<string[]> {
  const sb = createClient();
  const folder = `id${idLike}`;
  const { data, error } = await sb.storage.from(PHOTOS_BUCKET).list(folder, { limit: 100 });
  if (error || !data) return [];
  const out: string[] = [];
  for (const f of data) {
    const { data: pub } = sb.storage.from(PHOTOS_BUCKET).getPublicUrl(`${folder}/${f.name}`);
    if (pub?.publicUrl) out.push(pub.publicUrl);
  }
  return out;
}

export async function fetchColumnLabels(): Promise<Record<string,string>> {
  const sb = createClient();
  try {
    const { data, error } = await (sb.rpc as any)("get_column_labels", { p_schema: "public", p_table: TABLE });
    if (error || !Array.isArray(data)) return {};
    const map: Record<string,string> = {};
    for (const row of data) {
      const col = row.column || row.column_name;
      const label = row.comment || row.label || row.description;
      if (col && label) map[col] = label;
    }
    return map;
  } catch (e) {
    return {};
  }
}
