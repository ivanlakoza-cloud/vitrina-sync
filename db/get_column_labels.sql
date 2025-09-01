
-- Optional helper: returns column -> description mapping for a table
create or replace function public.get_column_labels(schema text, table text)
returns table(column text, comment text)
language sql stable as $$
  select c.column_name as column, pgd.description as comment
  from information_schema.columns c
  left join pg_catalog.pg_statio_all_tables as st
    on st.relname = c.table_name and st.schemaname = c.table_schema
  left join pg_catalog.pg_description pgd
    on pgd.objoid = st.relid and pgd.objsubid = c.ordinal_position
  where c.table_schema = schema and c.table_name = table;
$$;
