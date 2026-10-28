-- ============================================================
-- CATÁLOGO: configuración de la base de datos (Supabase)
-- Pasos:
--   1) Cambia gabrielsolis8002@gmail.com por el correo con el que entrarás al panel.
--      Está escrito 8 veces: usa "buscar y reemplazar" en el editor.
--   2) Pégalo completo en Supabase > SQL Editor y pulsa Run.
-- ============================================================

-- Tabla de productos
create table if not exists public.productos (
  id          bigint generated always as identity primary key,
  marca       text not null,
  talla       text not null,
  precio      numeric(10,2) not null check (precio >= 0),
  foto_url    text,
  foto_path   text,
  disponible  boolean not null default true,
  creado      timestamptz not null default now()
);

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
  using (lower(auth.jwt() ->> 'email') = lower('gabrielsolis8002@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') = lower('gabrielsolis8002@gmail.com'));

-- Carpeta pública para las fotos
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

-- Solo tu correo puede subir, cambiar o borrar fotos
drop policy if exists "Admin sube fotos" on storage.objects;
create policy "Admin sube fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'productos' and lower(auth.jwt() ->> 'email') = lower('gabrielsolis8002@gmail.com'));

drop policy if exists "Admin cambia fotos" on storage.objects;
create policy "Admin cambia fotos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'productos' and lower(auth.jwt() ->> 'email') = lower('gabrielsolis8002@gmail.com'));

drop policy if exists "Admin borra fotos" on storage.objects;
create policy "Admin borra fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'productos' and lower(auth.jwt() ->> 'email') = lower('gabrielsolis8002@gmail.com'));