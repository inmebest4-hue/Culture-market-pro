-- =====================================================================
-- CULTURE MARKET — Données de départ
-- À exécuter APRÈS schema.sql, dans Supabase > SQL Editor
-- Vous pourrez ensuite tout modifier depuis l'espace Admin du site.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------
insert into public.categories (slug, nom, ordre) values
  ('legumes',   'Légumes',            1),
  ('aromates',  'Aromates & Herbes',  2),
  ('piments',   'Piments & Poivrons', 3),
  ('tubercules','Tubercules',         4),
  ('paniers',   'Paniers de la semaine', 5)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- PRODUITS
-- (Les images pointent vers /images/... — remplacez-les progressivement
-- depuis l'espace Admin dès que vous aurez les photos définitives.)
-- ---------------------------------------------------------------------
insert into public.products (category_id, nom, unite, prix_fc, image_url, ordre)
select c.id, v.nom, v.unite, v.prix, v.image, v.ordre
from (values
  ('legumes',  'Carottes',                         'kg',    3000, 'images/carottes.jpg',        1),
  ('legumes',  'Oignons',                           'kg',    2500, 'images/oignons.jpg',         2),
  ('legumes',  'Poivrons verts',                    'kg',    4000, 'images/poivrons-verts.jpg',  3),
  ('legumes',  'Concombres',                        'kg',    2500, 'images/placeholder.svg',     4),
  ('legumes',  'Gombo',                             'kg',    3000, 'images/placeholder.svg',     5),
  ('legumes',  'Aubergine locale (garden egg)',     'kg',    5000, 'images/placeholder.svg',     6),
  ('legumes',  'Chou',                              'kg',    2500, 'images/placeholder.svg',     7),
  ('legumes',  'Tomates',                           'kg',    3500, 'images/placeholder.svg',     8),
  ('aromates', 'Cresson',                           'botte', 4000, 'images/placeholder.svg',     1),
  ('aromates', 'Coriandre',                         'botte', 3500, 'images/placeholder.svg',     2),
  ('aromates', 'Persil',                            'botte', 3000, 'images/placeholder.svg',     3),
  ('aromates', 'Gingembre',                         'kg',    5000, 'images/placeholder.svg',     4),
  ('aromates', 'Ail',                               'kg',    6000, 'images/placeholder.svg',     5),
  ('piments',  'Piment vert',                       'kg',    4500, 'images/piments.jpg',         1),
  ('piments',  'Piment habanero (scotch bonnet)',   'kg',    9000, 'images/placeholder.svg',     2),
  ('tubercules','Pommes de terre',                  'kg',    2500, 'images/placeholder.svg',     1),
  ('tubercules','Patates douces',                   'kg',    2000, 'images/placeholder.svg',     2),
  ('tubercules','Manioc frais',                     'kg',    1800, 'images/placeholder.svg',     3),
  ('tubercules','Banane plantain',                  'kg',    2200, 'images/placeholder.svg',     4)
) as v(cat_slug, nom, unite, prix, image, ordre)
join public.categories c on c.slug = v.cat_slug
on conflict do nothing;

-- ---------------------------------------------------------------------
-- ZONES DE LIVRAISON — Lubumbashi (à ajuster selon vos secteurs réels)
-- ---------------------------------------------------------------------
insert into public.delivery_zones (nom_commune, frais_fc, ordre) values
  ('Lubumbashi (centre-ville)', 3000, 1),
  ('Kampemba',                  4000, 2),
  ('Katuba',                    4000, 3),
  ('Kenya',                     4500, 4),
  ('Ruashi',                    5000, 5),
  ('Annexe',                    5000, 6)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- MOYENS DE PAIEMENT — À CONFIRMER / adapter avec les moyens réels
-- ---------------------------------------------------------------------
insert into public.payment_methods (nom, instructions, ordre) values
  ('Paiement à la livraison (espèces)', 'Réglez en espèces au livreur à la réception de votre commande.', 1),
  ('Mobile Money (Airtel Money)', 'Un numéro de paiement vous sera communiqué par WhatsApp après validation de la commande.', 2),
  ('Mobile Money (Orange Money)', 'Un numéro de paiement vous sera communiqué par WhatsApp après validation de la commande.', 3)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- PARAMÈTRES DU SITE — À COMPLÉTER avec vos vraies coordonnées
-- ---------------------------------------------------------------------
insert into public.site_settings (cle, valeur) values
  ('nom_entreprise',        'Culture Market'),
  ('slogan',                'Le marché vient à vous.'),
  ('description_accueil',   'Culture est une entreprise agri-marketing qui cultive et distribue des produits frais, sains et locaux : légumes, aromates et paniers hebdomadaires livrés directement chez vous ou en point relais. Notre mission : rapprocher le marché local de votre table.'),
  ('ville',                 'Lubumbashi'),
  ('horaires_livraison',    'Lundi — Samedi | 9h — 11h'),
  ('commande_minimum_fc',   '22000'),
  ('responsable_nom',       'Precylia Felo'),
  ('responsable_role',      'Responsable Marketing — Culture Market'),
  ('telephone_contact',     'À COMPLÉTER'),
  ('whatsapp_contact',      'À COMPLÉTER (format international, ex: 243970000000)'),
  ('email_contact',         'contact@culture-market.cd'),
  ('adresse_texte',         'Lubumbashi, Haut-Katanga, RDC — adresse exacte à compléter'),
  ('google_maps_url',       'À COMPLÉTER'),
  ('limite_bdd_mo',          '500'),
  ('limite_fichiers_mo',     '1024'),
  ('seuil_alerte_stockage_pct', '80'),
  ('facebook_url',          ''),
  ('instagram_url',         ''),
  ('tiktok_url',            '')
on conflict (cle) do nothing;
