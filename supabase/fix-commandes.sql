-- =====================================================================
-- CULTURE MARKET — CORRECTIF : validation des commandes
-- À exécuter UNE FOIS dans Supabase > SQL Editor > New query > Run
-- (pour les projets déjà installés avec l'ancien schema.sql)
--
-- Problème corrigé : l'ancienne méthode insérait la commande depuis le
-- navigateur puis tentait de la relire, ce que les règles de sécurité
-- (RLS) refusent pour les clients non connectés. Désormais, la commande
-- est créée par une fonction serveur sécurisée, qui recalcule aussi les
-- prix, les frais de livraison et le minimum de commande côté serveur.
-- =====================================================================

create or replace function public.create_order(
  p_nom            text,
  p_telephone      text,
  p_commune        text,
  p_adresse        text,
  p_mode           text,
  p_moyen_paiement text,
  p_items          jsonb          -- [{ "id": 3, "qty": 2 }, ...]
)
returns table (order_numero text, order_total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item       jsonb;
  v_prod       public.products%rowtype;
  v_qty        numeric;
  v_sous_total numeric := 0;
  v_frais      numeric;
  v_min        numeric := 22000;
  v_total      numeric;
  v_order_id   bigint;
  v_numero     text;
  v_min_txt    text;
begin
  if coalesce(trim(p_nom),'') = '' or coalesce(trim(p_telephone),'') = ''
     or coalesce(trim(p_adresse),'') = '' then
    raise exception 'CM: Merci de compléter nom, téléphone et adresse.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CM: Votre panier est vide.';
  end if;

  select z.frais_fc into v_frais
  from public.delivery_zones z
  where z.nom_commune = p_commune and z.actif
  limit 1;
  if not found then
    raise exception 'CM: Zone de livraison invalide.';
  end if;

  -- 1re passe : validation + calcul du sous-total avec les prix du serveur
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::numeric;
    select * into v_prod from public.products
      where id = (v_item->>'id')::bigint and disponible;
    if not found then
      raise exception 'CM: Un produit de votre panier n''est plus disponible.';
    end if;
    if v_qty is null or v_qty <= 0 then
      raise exception 'CM: Quantité invalide.';
    end if;
    v_sous_total := v_sous_total + v_prod.prix_fc * v_qty;
  end loop;

  select valeur into v_min_txt from public.site_settings where cle = 'commande_minimum_fc';
  if v_min_txt ~ '^[0-9]+(\.[0-9]+)?$' then
    v_min := v_min_txt::numeric;
  end if;
  if v_sous_total < v_min then
    raise exception 'CM: Le minimum de commande n''est pas atteint.';
  end if;

  v_total := v_sous_total + v_frais;

  insert into public.orders
    (nom_client, telephone, commune, adresse, mode_livraison,
     frais_livraison, sous_total_fc, total_fc, moyen_paiement)
  values
    (trim(p_nom), trim(p_telephone), p_commune, trim(p_adresse),
     coalesce(nullif(p_mode,''),'domicile'),
     v_frais, v_sous_total, v_total, p_moyen_paiement)
  returning orders.id, orders.numero into v_order_id, v_numero;

  -- 2e passe : lignes de commande
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::numeric;
    select * into v_prod from public.products where id = (v_item->>'id')::bigint;
    insert into public.order_items
      (order_id, product_id, nom_produit, unite, prix_unitaire, quantite, sous_total)
    values
      (v_order_id, v_prod.id, v_prod.nom, v_prod.unite, v_prod.prix_fc, v_qty, v_prod.prix_fc * v_qty);
  end loop;

  return query select v_numero, v_total;
end;
$$;

grant execute on function public.create_order(text,text,text,text,text,text,jsonb)
  to anon, authenticated;

-- Sécurité : on retire l'insertion directe depuis le navigateur.
-- Toute commande passe désormais obligatoirement par create_order().
drop policy if exists "public insert orders"      on public.orders;
drop policy if exists "public insert order_items" on public.order_items;
