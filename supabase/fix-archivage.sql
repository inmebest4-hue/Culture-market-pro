-- =====================================================================
-- CULTURE MARKET — AJOUT : statistiques de stockage (admin)
-- À exécuter UNE FOIS dans Supabase > SQL Editor > New query > Run
--
-- Ajoute une fonction qui permet à l'espace Admin d'estimer l'espace utilisé
-- (base de données + photos produits), pour afficher les jauges et alertes
-- de l'onglet "Stockage & archivage". Lecture seule, réservée aux comptes
-- admin connectés (authenticated) — aucune donnée client n'est exposée.
-- =====================================================================

create or replace function public.admin_storage_stats()
returns table (
  db_size_bytes       bigint,
  storage_bytes       bigint,
  orders_count        bigint,
  order_items_count   bigint,
  oldest_order_date   timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    pg_database_size(current_database()),
    coalesce((
      select sum((metadata->>'size')::bigint)
      from storage.objects
      where bucket_id = 'produits'
    ), 0),
    (select count(*) from public.orders),
    (select count(*) from public.order_items),
    (select min(created_at) from public.orders);
$$;

grant execute on function public.admin_storage_stats() to authenticated;

-- Réglages par défaut utilisés pour les jauges (modifiables ensuite dans
-- l'onglet Réglages du site — à mettre à jour si vous changez de formule).
insert into public.site_settings (cle, valeur) values
  ('limite_bdd_mo', '500'),
  ('limite_fichiers_mo', '1024'),
  ('seuil_alerte_stockage_pct', '80')
on conflict (cle) do nothing;
