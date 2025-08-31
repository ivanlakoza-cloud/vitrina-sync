import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET!;
export const DOMUS_TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";

export function publicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${path}`;
}
