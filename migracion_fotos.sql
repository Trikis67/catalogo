-- ============================================================
-- VARIAS FOTOS POR CAMISA
-- Supabase > SQL Editor > New query > pega todo > Run.
-- No lleva tu correo, no borra nada y es seguro correrlo varias veces.
-- ============================================================

alter table public.productos add column if not exists fotos text[] not null default '{}';
alter table public.productos add column if not exists fotos_paths text[] not null default '{}';

-- Las camisas que ya tenían una foto la conservan como foto principal
update public.productos
set fotos = array[foto_url],
    fotos_paths = array[coalesce(foto_path, '')]
where cardinality(fotos) = 0 and foto_url is not null;

notify pgrst, 'reload schema';
