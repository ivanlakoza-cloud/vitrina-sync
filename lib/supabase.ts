
import { createClient as createSbClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export function createClient() {
  if (!URL || !KEY) throw new Error("Supabase env vars missing");
  return createSbClient(URL, KEY);
}
