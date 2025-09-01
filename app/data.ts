// Server data helpers (no client imports)
import { createClient as createSbClient } from "@supabase/supabase-js";
import type { FieldOrder } from "@/lib/fields";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";
const BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";

function sb() {
  return createSbClient(URL, KEY);
}

export async function fetchCities(): Promise<string[]> {
  const client = sb();
  const { data, error } = await client
    .from(TABLE)
    .select("city")
    .not("city", "is", null);
  if (error) return [];
  const set = new Set<string>();
  data.forEach((r: any) => {
    if (r.city && r.city !== 'Все города') set.add(r.city);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
}

export async function fetchList(city?: string) {
  const client = sb();
  let q = client.from(TABLE).select("*").order("id", { ascending: true }).limit(120);
  if (city && city !== "Все города") {
    q = q.eq("city", city);
  }
  const { data } = await q;
  return (data || []) as any[];
}

export async function fetchByExternalId(external_id: string) {
  const client = sb();
  const { data } = await client.from(TABLE).select("*").eq("external_id", external_id).single();
  return data as any;
}

export async function fetchFieldOrder(): Promise<Record<string, FieldOrder>> {
  const client = sb();
  // allow either a view or the base table
  const { data: view } = await client.from("domus_field_order_view").select("*").order("sort_order", { ascending: true });
  const rows = view || [];
  const dict: Record<string, FieldOrder> = {};
  rows.forEach((r: any) => {
    dict[r.column_name] = {
      display_name_ru: r.display_name_ru ?? undefined,
      sort_order: typeof r.sort_order === "number" ? r.sort_order : undefined,
      visible: typeof r.visible === "boolean" ? r.visible : true,
    };
  });
  return dict;
}

export async function getGallery(external_id: string): Promise<string[]> {
  const client = sb();
  const prefix = `${external_id}/`;
  const { data, error } = await client.storage.from(BUCKET).list(prefix, { limit: 100 });
  if (error || !data) return [];
  const urls: string[] = [];
  for (const f of data) {
    if (f.name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)) {
      const pub = client.storage.from(BUCKET).getPublicUrl(prefix + f.name);
      urls.push(pub.data.publicUrl);
    }
  }
  return urls;
}

export async function getFirstPhoto(external_id: string): Promise<string | null> {
  const photos = await getGallery(external_id);
  return photos[0] || null;
}
