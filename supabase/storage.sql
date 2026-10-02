-- =====================================================================
-- CULTURE MARKET — Stockage des photos produits (Supabase Storage)
-- À exécuter APRÈS schema.sql et seed.sql, dans Supabase > SQL Editor.
-- Crée un espace de stockage "produits" public en lecture, où l'espace
-- Admin peut envoyer directement les photos depuis le site.
-- =====================================================================

-- Crée le bucket (dossier de stockage) "produits", public en lecture
insert into storage.buckets (id, name, public)
values ('produits', 'produits', true)
on conflict (id) do nothing;

-- Tout le monde peut VOIR les photos (nécessaire pour qu'elles s'affichent
-- sur le site pour vos clients, qui ne sont pas connectés)
create policy "public read produits bucket"
  on storage.objects for select
  using (bucket_id = 'produits');

-- Seuls les comptes admin connectés peuvent ENVOYER une photo
create policy "admin upload produits bucket"
  on storage.objects for insert
  with check (bucket_id = 'produits' and auth.role() = 'authenticated');

-- Seuls les comptes admin connectés peuvent REMPLACER une photo existante
create policy "admin update produits bucket"
  on storage.objects for update
  using (bucket_id = 'produits' and auth.role() = 'authenticated');

-- Seuls les comptes admin connectés peuvent SUPPRIMER une photo
create policy "admin delete produits bucket"
  on storage.objects for delete
  using (bucket_id = 'produits' and auth.role() = 'authenticated');
