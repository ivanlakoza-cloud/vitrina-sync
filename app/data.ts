// Minimal stubs/wrappers to be merged with your existing data.ts implementation.
// They expose fetchColumnLabels used by the detail page.

import { createClient as createSbClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const TABLE = process.env.NEXT_PUBLIC_DOMUS_TABLE || "domus_export";

const sb = createSbClient(URL, KEY);

export async function fetchByExternalId(external_id: string) {
  const { data, error } = await sb.from(TABLE).select("*").eq("external_id", external_id).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getGallery(id: string): Promise<string[]> {
  const { data, error } = await sb.storage.from("photos").list(`id${id}`, { limit: 100 });
  if (error) return [];
  // Public bucket expected
  return (data || []).map(f => `${URL}/storage/v1/object/public/photos/id${id}/${encodeURIComponent(f.name)}`);
}

// Column -> description map via Postgres catalog (fallback: empty map)
export async function fetchColumnLabels(): Promise<Record<string,string>> {
  try {
    const sql = `
      select c.column_name as key, (pgd.description)::text as label
      from information_schema.columns c
      left join pg_catalog.pg_statio_all_tables st on st.relname = c.table_name and st.schemaname = c.table_schema
      left join pg_catalog.pg_description pgd on pgd.objoid = st.relid and pgd.objsubid = c.ordinal_position
      where c.table_schema = 'public' and c.table_name = '${TABLE}';
    `;
    // Supabase SQL over RPC is not accessible from anon; return empty map, backend may replace this with RPC call
    return {};
  } catch {
    return {};
  }
}
