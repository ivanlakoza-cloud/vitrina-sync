// app/data.ts
import { supabase } from "@/lib/supabase";

/**
 * Centralized configuration with safe defaults.
 * You can override via env vars on Vercel:
 *  - NEXT_PUBLIC_DOMUS_TABLE
 *  - NEXT_PUBLIC_PHOTOS_BUCKET
 */
const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE ?? "domus_export";
const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET ?? "photos";

/** Narrow row type only for fields we actually use in UI */
export type DomusRow = {
  id: number;
  id_obekta: string | null;
  city: string | null;
  address: string | null;
  // keep remainder loose to avoid compile breaks on schema changes
  [k: string]: any;
};

/** Convert anything like "12" or "id12" to normalized folder key "id12" */
function normalizeFolderKey(idOrSlug: string | number | null | undefined): string | null {
  if (idOrSlug === null || idOrSlug === undefined) return null;
  const raw = String(idOrSlug).trim();
  if (!raw) return null;
  if (/^id\d+$/i.test(raw)) return raw.toLowerCase();
  const num = Number(String(raw).replace(/[^\d]/g, ""));
  if (Number.isFinite(num)) return `id${num}`;
  return null;
}

/** Public URL helper for storage object path */
function publicUrl(path: string): string {
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * List cities (deduped, sorted), intentionally ignoring
 * the service option "Все города" if it appears in the data.
 */
export async function fetchCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("city")
    .not("city", "is", null)     // drop NULLs
    .neq("city", "Все города");  // drop service value if present
  if (error) throw error;

  const set = new Set<string>(
    (data ?? [])
      .map((r: any) => (r.city ?? "").toString().trim())
      .filter(Boolean)
  );
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

/**
 * Main listing for index page. Optional city filter.
 * Returns normalized id (folder key) and first photo URL (never null).
 */
export async function fetchList(city?: string): Promise<Array<{ id: string; rec: DomusRow; photo: string }>> {
  let q = supabase.from(TABLE).select("*").order("id", { ascending: false }).limit(5000);
  if (city && city !== "Все города") q = q.eq("city", city);

  const { data, error } = await q;
  if (error) throw error;

  const rows: DomusRow[] = (data as any[]) as DomusRow[];

  const mapped = await Promise.all(rows.map(async (rec) => {
    const idKey = normalizeFolderKey(rec.id_obekta ?? rec.id) || `id${rec.id}`;
    const photo = await getFirstPhoto(idKey);
    return { id: idKey, rec, photo };
  }));

  return mapped;
}

/**
 * Fetch single record by external slug.
 * Never throws for "not found" — returns null instead.
 */
export async function fetchByExternalId(slug: string): Promise<DomusRow | null> {
  // 1) Try exact external id
  let resp = await supabase.from(TABLE).select("*").eq("id_obekta", slug).maybeSingle();
  if (resp.error && resp.error.code !== "PGRST116") {
    // unexpected error
    console.error("[fetchByExternalId] error(id_obekta)", { slug, error: resp.error });
  }
  if (resp.data) return resp.data as DomusRow;

  // 2) Fallback: take any digits from slug and match by numeric id
  const num = Number(String(slug).replace(/[^\d]/g, ""));
  if (Number.isFinite(num)) {
    const alt = await supabase.from(TABLE).select("*").eq("id", num).maybeSingle();
    if (alt.error && alt.error.code !== "PGRST116") {
      console.error("[fetchByExternalId] error(id)", { slug, error: alt.error });
    }
    if (alt.data) return alt.data as DomusRow;
  }

  return null;
}

/**
 * Load gallery (array of public URLs) from storage/photos/<idKey>.
 * id can be "id12" or just 12 or a row containing id/id_obekta.
 */
export async function getGallery(id: string | number | DomusRow): Promise<string[]> {
  const idKey = typeof id === "object"
    ? normalizeFolderKey((id as DomusRow).id_obekta ?? (id as DomusRow).id)
    : normalizeFolderKey(id as any);

  if (!idKey) return [];

  const { data, error } = await supabase.storage.from(PHOTOS_BUCKET)
    .list(idKey, { limit: 100, sortBy: { column: "name", order: "asc" } });

  if (error) {
    console.warn("[getGallery] storage.list error", error);
    return [];
  }

  return (data ?? [])
    .filter(f => !f.name.startsWith(".")) // skip hidden/system
    .map(f => publicUrl(`${idKey}/${f.name}`));
}

/** First photo or a placeholder; always returns string */
export async function getFirstPhoto(id: string | number | DomusRow): Promise<string> {
  const gallery = await getGallery(id);
  return gallery[0] ?? "/placeholder.svg";
}
