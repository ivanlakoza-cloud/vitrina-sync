import { createClient as createSbClient } from "@supabase/supabase-js";
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !key) throw new Error("Supabase env is missing");
  return createSbClient(url, key);
}
