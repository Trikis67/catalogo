-- ============================================================
-- OFERTAS: precio anterior (tachado) en la tienda
-- Supabase > SQL Editor > New query > pega todo > Run.
-- No lleva tu correo, no borra nada y es seguro correrlo varias veces.
-- ============================================================

alter table public.productos add column if not exists precio_antes numeric;

alter table public.productos drop constraint if exists precio_antes_valido;
alter table public.productos add constraint precio_antes_valido check (precio_antes is null or precio_antes >= 0);

notify pgrst, 'reload schema';
