-- ============================================================
-- MIGRACIÓN: varias tallas por foto + códigos que empiezan con #
-- Ejecútalo UNA vez en Supabase > SQL Editor > New query > Run.
-- No necesita tu correo. No borra tus camisas: las convierte al formato nuevo.
-- Si lo ejecutas dos veces no pasa nada.
-- ============================================================

-- 1) Columnas nuevas
alter table public.productos add column if not exists codigo text;
alter table public.productos add column if not exists tallas text[] not null default '{}';

-- 2) Pasar la talla vieja a la lista de tallas y quitar la columna vieja
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'productos' and column_name = 'talla'
  ) then
    execute 'update public.productos set tallas = array[talla] where cardinality(tallas) = 0 and talla is not null';
    execute 'alter table public.productos drop column talla';
  end if;
end $$;

-- 3) Dar un código (#001, #002...) a las camisas que ya existían
update public.productos
set codigo = '#' || lpad(id::text, 3, '0')
where codigo is null;

-- 4) Reglas: código obligatorio, con #, sin repetirse; al menos una talla
alter table public.productos alter column codigo set not null;
alter table public.productos alter column tallas drop default;

alter table public.productos drop constraint if exists codigo_formato;
alter table public.productos add constraint codigo_formato check (codigo ~ '^#[A-Za-z0-9-]{1,20}$');

alter table public.productos drop constraint if exists tallas_no_vacias;
alter table public.productos add constraint tallas_no_vacias check (cardinality(tallas) > 0);

create unique index if not exists productos_codigo_unico on public.productos (lower(codigo));

-- 5) Avisar a Supabase que la tabla cambió
notify pgrst, 'reload schema';
