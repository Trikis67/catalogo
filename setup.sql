-- ============================================================
-- CATÁLOGO: configuración de la base de datos (Supabase)
-- SOLO para una instalación nueva. Si ya ejecutaste una versión anterior,
-- usa migracion.sql en su lugar.
-- Pasos:
--   1) Cambia TU_CORREO@gmail.com por el correo con el que entrarás al panel.
--      Usa "buscar y reemplazar" para cambiarlo en todos los lugares.
--   2) Pégalo completo en Supabase > SQL Editor y pulsa Run.
--   3) No subas a GitHub la versión con tu correo.
-- ============================================================

-- Tabla de productos: una fila por foto, con una o varias tallas
create table if not exists public.productos (
  id          bigint generated always as identity primary key,
  codigo      text not null,
  marca       text not null,
  tallas      text[] not null,
  precio      numeric(10,2) not null check (precio >= 0),
  foto_url    text,
  foto_path   text,
  disponible  boolean not null default true,
  creado      timestamptz not null default now(),
  constraint codigo_formato check (codigo ~ '^#[A-Za-z0-9-]{1,20}$'),
  constraint tallas_no_vacias check (cardinality(tallas) > 0)
);

create unique index if not exists productos_codigo_unico on public.productos (lower(codigo));

alter table public.productos enable row level security;

-- Cualquier persona puede VER el catálogo
drop policy if exists "Todos pueden ver" on public.productos;
create policy "Todos pueden ver"
  on public.productos for select
  to anon, authenticated
  using (true);

-- Solo tu correo puede agregar, cambiar o borrar productos
drop policy if exists "Solo el admin escribe" on public.productos;
create policy "Solo el admin escribe"
  on public.productos for all
  to authenticated
  using (lower(auth.jwt() ->> 'email') = lower('TU_CORREO@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') = lower('TU_CORREO@gmail.com'));

-- Carpeta pública para las fotos
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

-- Solo tu correo puede subir, cambiar o borrar fotos
drop policy if exists "Admin sube fotos" on storage.objects;
create policy "Admin sube fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'productos' and lower(auth.jwt() ->> 'email') = lower('TU_CORREO@gmail.com'));

drop policy if exists "Admin cambia fotos" on storage.objects;
create policy "Admin cambia fotos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'productos' and lower(auth.jwt() ->> 'email') = lower('TU_CORREO@gmail.com'));

drop policy if exists "Admin borra fotos" on storage.objects;
create policy "Admin borra fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'productos' and lower(auth.jwt() ->> 'email') = lower('TU_CORREO@gmail.com'));
