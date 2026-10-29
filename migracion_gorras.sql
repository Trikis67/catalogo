-- ============================================================
-- APARTADO DE GORRAS
-- Supabase > SQL Editor > New query > pega todo > Run.
-- No lleva tu correo, no borra nada y es seguro correrlo varias veces.
-- ============================================================

alter table public.productos add column if not exists tipo text not null default 'playera';

alter table public.productos drop constraint if exists tipo_valido;
alter table public.productos add constraint tipo_valido check (tipo in ('playera', 'gorra'));

notify pgrst, 'reload schema';
