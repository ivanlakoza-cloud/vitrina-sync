-- db/get_column_labels.sql
-- Creates RPC get_column_labels(schema, table) -> rows(column_name text, label text)
create or replace function public.get_column_labels(p_schema text, p_table text)
returns table(column_name text, label text)
language sql
stable
as $$
  select c.column_name::text,
         pg_catalog.col_description((quote_ident(p_schema)||'.'||quote_ident(p_table))::regclass::oid, c.ordinal_position)::text as label
  from information_schema.columns c
  where c.table_schema = p_schema and c.table_name = p_table
  order by c.ordinal_position;
$$;
grant execute on function public.get_column_labels(text, text) to anon, authenticated, service_role;
