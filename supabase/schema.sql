-- =====================================================================
-- CULTURE MARKET — Schéma Supabase (PostgreSQL)
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- Extension utile pour générer des identifiants lisibles
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. CATEGORIES
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  nom          text not null,
  ordre        int not null default 0,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. PRODUITS
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id            bigint generated always as identity primary key,
  category_id   bigint references public.categories(id) on delete set null,
  nom           text not null,
  description   text,
  unite         text not null default 'kg',      -- kg, botte, pièce, panier...
  prix_fc       numeric(12,2) not null check (prix_fc >= 0),
  image_url     text,                              -- URL publique (Supabase Storage ou externe)
  disponible    boolean not null default true,
  ordre         int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_dispo on public.products(disponible);

-- ---------------------------------------------------------------------
-- 3. ZONES DE LIVRAISON (Lubumbashi, par quartier/commune)
-- ---------------------------------------------------------------------
create table if not exists public.delivery_zones (
  id              bigint generated always as identity primary key,
  nom_commune     text not null,
  frais_fc        numeric(12,2) not null default 0,
  actif           boolean not null default true,
  ordre           int not null default 0
);

-- ---------------------------------------------------------------------
-- 4. MOYENS DE PAIEMENT
-- ---------------------------------------------------------------------
create table if not exists public.payment_methods (
  id            bigint generated always as identity primary key,
  nom           text not null,               -- Ex: "Mobile Money (Airtel Money)"
  instructions  text,                        -- Ex: "Envoyez à 09xx xxx xxx, référence = numéro de commande"
  actif         boolean not null default true,
  ordre         int not null default 0
);

-- ---------------------------------------------------------------------
-- 5. PARAMÈTRES DU SITE (contact, horaires, montant minimum...)
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  cle     text primary key,
  valeur  text
);

-- ---------------------------------------------------------------------
-- 6. COMMANDES
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                bigint generated always as identity primary key,
  numero            text not null unique default ('CM-' || to_char(now(),'YYMMDD') || '-' || substr(md5(random()::text),1,5)),
  nom_client        text not null,
  telephone         text not null,
  commune           text not null,
  adresse           text not null,
  mode_livraison    text not null default 'domicile', -- domicile | relais | retrait
  frais_livraison   numeric(12,2) not null default 0,
  sous_total_fc     numeric(12,2) not null,
  total_fc          numeric(12,2) not null,
  moyen_paiement    text,
  statut            text not null default 'nouvelle', -- nouvelle | confirmee | en_livraison | livree | annulee
  note              text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_orders_tel on public.orders(telephone);
create index if not exists idx_orders_statut on public.orders(statut);

-- ---------------------------------------------------------------------
-- 7. LIGNES DE COMMANDE
-- ---------------------------------------------------------------------
create table if not exists public.order_items (
  id            bigint generated always as identity primary key,
  order_id      bigint not null references public.orders(id) on delete cascade,
  product_id    bigint references public.products(id) on delete set null,
  nom_produit   text not null,      -- copie du nom au moment de la commande
  unite         text not null,
  prix_unitaire numeric(12,2) not null,
  quantite      numeric(12,2) not null check (quantite > 0),
  sous_total    numeric(12,2) not null
);

create index if not exists idx_order_items_order on public.order_items(order_id);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.delivery_zones   enable row level security;
alter table public.payment_methods  enable row level security;
alter table public.site_settings    enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- Lecture publique (catalogue, zones, paiements, réglages) : tout le monde peut LIRE
create policy "public read categories" on public.categories for select using (true);
create policy "public read products" on public.products for select using (true);
create policy "public read delivery_zones" on public.delivery_zones for select using (true);
create policy "public read payment_methods" on public.payment_methods for select using (true);
create policy "public read site_settings" on public.site_settings for select using (true);

-- Un visiteur peut CRÉER une commande et ses lignes (mais pas les lire directement :
-- la lecture des commandes passe uniquement par la fonction get_orders_by_phone ci-dessous,
-- ou par le compte admin authentifié)
-- (pas d'insertion directe : les commandes passent par la fonction create_order(), voir plus bas)

-- Les admins authentifiés (voir section "Admin" plus bas) peuvent tout faire
create policy "admin full access categories" on public.categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full access products" on public.products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full access delivery_zones" on public.delivery_zones for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full access payment_methods" on public.payment_methods for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full access site_settings" on public.site_settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full access orders" on public.orders for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full access order_items" on public.order_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =====================================================================
-- FONCTION : retrouver mes commandes par numéro de téléphone
-- (SECURITY DEFINER = contourne le RLS de façon contrôlée : on ne renvoie
-- que les commandes du numéro demandé, jamais toute la table)
-- =====================================================================
create or replace function public.get_orders_by_phone(p_telephone text)
returns table (
  id bigint,
  numero text,
  statut text,
  total_fc numeric,
  mode_livraison text,
  commune text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.id, o.numero, o.statut, o.total_fc, o.mode_livraison, o.commune, o.created_at
  from public.orders o
  where o.telephone = p_telephone
  order by o.created_at desc;
$$;

grant execute on function public.get_orders_by_phone(text) to anon, authenticated;

-- Détail des articles d'une commande (uniquement si on connaît déjà son numéro + téléphone)
create or replace function public.get_order_items(p_numero text, p_telephone text)
returns table (
  nom_produit text,
  unite text,
  prix_unitaire numeric,
  quantite numeric,
  sous_total numeric
)
language sql
security definer
set search_path = public
as $$
  select oi.nom_produit, oi.unite, oi.prix_unitaire, oi.quantite, oi.sous_total
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.numero = p_numero and o.telephone = p_telephone;
$$;

grant execute on function public.get_order_items(text, text) to anon, authenticated;

-- =====================================================================
-- Mise à jour automatique de updated_at sur products
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- =====================================================================
-- FONCTION : création sécurisée d'une commande (prix recalculés côté serveur)
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


-- =====================================================================
-- FONCTION : statistiques de stockage (admin)
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

