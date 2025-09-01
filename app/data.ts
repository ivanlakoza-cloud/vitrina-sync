// Server utilities for Vitrina
import { createClient as createSbClient } from "@supabase/supabase-js";
import type { DomusRow } from "@/lib/fields";
import { TABLE } from "@/lib/fields";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const sb = createSbClient(URL, KEY);

// City list (distinct), filtered and sorted
export async function fetchCities(): Promise<string[]> {
  const { data, error } = await sb.from(TABLE).select("city");
  if (error) {
    console.error("fetchCities error", error);
    return [];
  }
  const all = Array.from(new Set((data ?? []).map((r: any) => r.city).filter(Boolean)));
  return all.filter((c) => String(c).toLowerCase() !== "все города").sort((a, b) => a.localeCompare(b));
}

// List for main grid
export async function fetchList(city?: string): Promise<DomusRow[]> {
  let q = sb
    .from(TABLE)
    .select(
      [
        "id",
        "external_id",
        "city",
        "address",
        "zagolovok",
        "tip_pomescheniya",
        "etazh",
        "dostupnaya_ploschad",
        "km_",
        "price_per_m2_20",
        "price_per_m2_50",
        "price_per_m2_100",
        "price_per_m2_400",
        "price_per_m2_700",
        "price_per_m2_1500",
      ].join(",")
    )
    .order("id", { ascending: true });

  if (city && city !== "Все города") q = q.eq("city", city);
  const { data, error } = await q;
  if (error) {
    console.error("fetchList error", error);
    return [];
  }
  return (data ?? []) as DomusRow[];
}

// Detail fetch: param can be numeric id (with or without 'id' prefix) or external_id
export async function fetchByExternalId(param: string): Promise<DomusRow | null> {
  const p = decodeURIComponent(param);
  const m = p.match(/^id?\s*(\d+)$/i);
  let q = sb.from(TABLE).select("*").limit(1);
  if (m) {
    q = q.eq("id", Number(m[1]));
  } else {
    q = q.eq("external_id", p);
  }
  const { data, error } = await q;
  if (error) {
    console.error("fetchByExternalId error", error);
    return null;
  }
  return (data && data[0]) || null;
}

// Storage helpers
export async function getFirstPhoto(id: string): Promise<string | null> {
  const folder = `id${id.replace(/^id/i, "")}`;
  const { data, error } = await sb.storage.from("photos").list(folder, {
    limit: 1,
    sortBy: { column: "name", order: "asc" },
  });
  if (error || !data || data.length === 0) return null;
  const file = data[0].name;
  const { data: pub } = sb.storage.from("photos").getPublicUrl(`${folder}/${file}`);
  return pub?.publicUrl ?? null;
}

export async function getGallery(id: string): Promise<string[]> {
  const folder = `id${id.replace(/^id/i, "")}`;
  const { data, error } = await sb.storage.from("photos").list(folder, {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });
  if (error || !data) return [];
  const urls = data.map((f) => sb.storage.from("photos").getPublicUrl(`${folder}/${f.name}`).data.publicUrl);
  return urls;
}

// Column labels from Postgres comments (requires the SQL helper)
export async function loadColumnLabels(): Promise<Record<string, string>> {
  const { data, error } = await sb.rpc("get_column_labels", {
    p_schema: "public",
    p_table: TABLE,
  });
  if (error || !data) {
    console.warn("get_column_labels RPC failed", error);
    return {};
  }
  const map: Record<string, string> = {};
  for (const row of data as Array<{ col_name: string; label: string | null }>) {
    if (row.col_name && row.label) map[row.col_name] = row.label;
  }
  return map;
}
