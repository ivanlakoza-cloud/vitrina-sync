
create or replace function public.get_column_labels(p_schema text, p_table text)
returns table (column_name text, comment text)
language sql
stable
as $$
  select c.column_name::text as column_name,
         d.description::text as comment
  from information_schema.columns c
  join pg_catalog.pg_class cl on cl.relname = c.table_name
  join pg_catalog.pg_namespace ns on ns.oid = cl.relnamespace
  left join pg_catalog.pg_description d
    on d.objoid = cl.oid and d.objsubid = c.ordinal_position
  where c.table_schema = p_schema
    and c.table_name = p_table;
$$;
