-- Creates a helper that returns (column, comment) for a given table.
-- Usage: select * from public.get_column_labels('public','domus_export');
create or replace function public.get_column_labels(p_schema text, p_table text)
returns table(column text, comment text)
language sql
stable
as $$
  select
    c.column_name::text as column,
    pgd.description::text as comment
  from information_schema.columns c
  join pg_catalog.pg_class cl
    on cl.relname = c.table_name
  join pg_catalog.pg_namespace ns
    on ns.oid = cl.relnamespace and ns.nspname = c.table_schema
  left join pg_catalog.pg_attribute a
    on a.attrelid = cl.oid and a.attname = c.column_name
  left join pg_catalog.pg_description pgd
    on pgd.objoid = cl.oid and pgd.objsubid = a.attnum
  where c.table_schema = p_schema
    and c.table_name = p_table
  order by c.ordinal_position;
$$;

-- Optional: allow PostgREST anonymous/authenticated to call it
-- grant execute on function public.get_column_labels(text, text) to anon, authenticated;
