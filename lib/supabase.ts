import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export const DOMUS_TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";
export const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || "photos";
