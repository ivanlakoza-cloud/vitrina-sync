// Server-side data helpers for Vitrina
// NOTE: gallery paths in storage use the *external_id* (e.g., "id83")
import { createClient as createSbClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";

const sb = createSbClient(URL, KEY);

// Return public URLs of photos for given external_id (folder in the bucket)
export async function getGallery(external_id: string): Promise<string[]> {
  if (!external_id) return [];

  const folder = external_id.replace(/\/+$/g, "").replace(/^\/+/, ""); // sanitize
  const { data, error } = await sb.storage.from(BUCKET).list(folder, {
    limit: 200,
    sortBy: { column: "name", order: "asc" },
  });
  if (error || !data) return [];

  return data
    .filter((f) => f && f.name && /\.(jpe?g|png|webp|gif)$/i.test(f.name))
    .map((f) => sb.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl);
}

// First photo for card preview — uses external_id as well
export async function getFirstPhoto(external_id: string): Promise<string | null> {
  const arr = await getGallery(external_id);
  return arr[0] || null;
}
