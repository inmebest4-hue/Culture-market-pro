# Guide de prise en main — Culture Market

Ce guide vous accompagne pas à pas pour mettre votre site en ligne, même sans
connaissances techniques poussées. Comptez environ 30 à 45 minutes pour la
mise en route complète.

---

## Ce que vous avez reçu

```
culture-market/
├── index.html              → la page du site (catalogue, panier, commande)
├── manifest.json            → fichier d'installation de l'app (PWA)
├── sw.js                    → service worker (installation + cache)
├── css/style.css             → toute l'apparence visuelle du site
├── js/
│   ├── config.js             → VOS clés Supabase (à remplir — étape 2)
│   ├── supabase-client.js    → connexion technique à Supabase (ne pas modifier)
│   ├── store.js               → gestion du catalogue et du panier (ne pas modifier)
│   └── app.js                 → toute l'interface (ne pas modifier sauf besoin précis)
├── images/                   → photos des produits (à remplacer progressivement)
├── icons/                    → icônes de l'application (générées depuis votre logo)
├── admin/
│   ├── index.html             → l'espace d'administration
│   ├── admin.js
│   └── admin.css
└── supabase/
    ├── schema.sql             → structure de la base de données
    ├── seed.sql               → données de départ (catégories, produits, zones...)
    ├── storage.sql             → espace de stockage pour l'upload des photos produits
    ├── fix-commandes.sql       → correctif commandes (uniquement si installé avant le 28/09/2026)
    └── fix-archivage.sql       → statistiques de stockage pour l'onglet "Stockage & archivage"
```

Vous n'avez besoin de toucher au code que pour l'étape 2 (`js/config.js`).
Tout le reste (produits, prix, zones, contact...) se gère depuis l'espace
**Admin**, une fois le site en ligne.

---

## Étape 1 — Créer votre projet Supabase (gratuit)

Supabase est le service qui héberge votre base de données (produits,
commandes, clients) et qui permet au site de fonctionner en temps réel sur
tous les téléphones.

1. Allez sur **[supabase.com](https://supabase.com)** et créez un compte
   (gratuit).
2. Cliquez sur **New Project**.
3. Choisissez un nom (ex. `culture-market`), un mot de passe pour la base de
   données (à conserver précieusement), et une région proche (Europe de
   préférence).
4. Attendez 1 à 2 minutes que le projet soit prêt.

### Installer la structure de la base

1. Dans le menu de gauche, ouvrez **SQL Editor**.
2. Cliquez sur **New query**.
3. Ouvrez le fichier `supabase/schema.sql` fourni, copiez tout son contenu,
   collez-le dans l'éditeur, puis cliquez sur **Run**.
4. Répétez l'opération avec le fichier `supabase/seed.sql` (dans une nouvelle
   requête). Cela crée vos catégories, produits de démarrage, zones de
   livraison et moyens de paiement.
5. Répétez une dernière fois avec le fichier `supabase/storage.sql`. Cela crée
   l'espace de stockage "produits", nécessaire pour pouvoir envoyer vos photos
   directement depuis l'espace Admin (voir étape 6).

Vous pouvez à tout moment revenir modifier ces informations depuis l'espace
Admin — ces fichiers ne servent qu'à démarrer.

---

## Étape 2 — Connecter le site à votre projet Supabase

1. Dans Supabase, allez dans **Settings** (roue crantée) → **API**.
2. Copiez la valeur **Project URL**.
3. Copiez la valeur **anon public** (dans "Project API keys").
4. Ouvrez le fichier `js/config.js` avec un éditeur de texte (Bloc-notes,
   VS Code...) et remplacez :

```js
window.CULTURE_CONFIG = {
  SUPABASE_URL: "https://VOTRE-PROJET.supabase.co",
  SUPABASE_ANON_KEY: "VOTRE_CLE_ANON_PUBLIC",
  ...
};
```

par vos propres valeurs. Enregistrez le fichier. **C'est la seule
modification technique obligatoire.**

> La clé "anon" est publique par nature (elle est visible dans le code du
> site) : ce n'est pas un problème de sécurité, car toutes les règles d'accès
> sont contrôlées côté Supabase (voir `schema.sql`, section RLS).

---

## Étape 3 — Mettre le site en ligne

Le site est 100 % statique (HTML/CSS/JS) : il peut être hébergé gratuitement
sur de nombreuses plateformes. Deux options simples :

### Option A — Netlify (le plus simple, glisser-déposer)
1. Allez sur [netlify.com](https://netlify.com), créez un compte gratuit.
2. Sur la page d'accueil, glissez-déposez le dossier `culture-market`
   complet dans la zone prévue ("Deploy manually").
3. Netlify vous donne une adresse en quelques secondes
   (ex. `culture-market.netlify.app`). Vous pouvez ensuite y attacher votre
   propre nom de domaine dans **Domain settings**.

### Option B — Vercel
1. Allez sur [vercel.com](https://vercel.com), créez un compte.
2. Créez un nouveau projet et importez le dossier (ou un dépôt GitHub
   contenant les fichiers).
3. Laissez les réglages par défaut (site statique) et déployez.

Dans les deux cas, **le dossier `admin/` est inclus automatiquement** —
votre espace d'administration sera accessible à
`https://votre-site.com/admin/`.

> Pensez à protéger l'accès : seules les personnes ayant un compte Supabase
> Auth (étape 4) pourront se connecter à l'admin, mais l'URL elle-même reste
> publique. Vous pouvez éventuellement la renommer ou la restreindre plus
> tard si besoin.

---

## Étape 4 — Créer votre compte administrateur

1. Dans Supabase, allez dans **Authentication** → **Users**.
2. Cliquez sur **Add user** → **Create new user**.
3. Renseignez votre e-mail et un mot de passe.
4. Décochez "Send confirmation email" si présent, ou confirmez le compte
   manuellement (bouton disponible dans la liste des utilisateurs).
5. Allez sur `https://votre-site.com/admin/` et connectez-vous avec cet
   e-mail et ce mot de passe.

Vous pouvez créer plusieurs comptes (un pour vous, un pour Precylia, etc.).
Toute personne connectée à l'admin a accès à toutes les fonctions
(produits, commandes, réglages).

---

## Étape 5 — Compléter vos informations réelles

Dans l'espace Admin → onglet **Réglages du site**, remplissez notamment :

- **Téléphone de contact** et **WhatsApp** (au format international, sans
  espaces ni "+", ex. `243970000000`)
- **E-mail de contact**
- **Lien Google Maps** : ouvrez Google Maps, cherchez votre adresse,
  cliquez sur "Partager" → "Copier le lien"
- **Liens Facebook / Instagram / TikTok** (laissez vide si inexistant — le
  bouton n'apparaîtra simplement pas sur le site)

Dans l'onglet **Zones de livraison**, ajustez les communes et les frais
réels de livraison. Dans **Moyens de paiement**, ajustez selon ce que vous
proposez réellement (Mobile Money, espèces, etc.) — supprimez ou ajoutez
des lignes librement.

---

## Étape 6 — Ajouter vos vraies photos de produits

Les produits sans photo définitive affichent un visuel provisoire ("Photo à
venir"). Vous pouvez les remplacer directement depuis l'admin, sans manipuler
aucun lien :

1. Ouvrez l'espace Admin → onglet **Produits**.
2. Sur la ligne du produit concerné, cliquez sur **Choisir une photo**
   (sous la miniature).
3. Sélectionnez une image sur votre téléphone ou votre ordinateur (JPG ou
   PNG, 5 Mo maximum).
4. La photo est envoyée automatiquement, la miniature se met à jour, et
   c'est enregistré immédiatement — pas besoin de cliquer sur "Enregistrer"
   en plus.

> Cette fonctionnalité nécessite d'avoir exécuté `supabase/storage.sql`
> (étape 1). Si un message signale que le stockage "produits" n'existe pas
> encore, retournez exécuter ce fichier dans Supabase > SQL Editor.

Si vous préférez malgré tout utiliser une image déjà hébergée ailleurs
(Google Drive en lien public, etc.), le champ texte sous la miniature reste
disponible : collez-y directement l'URL de l'image.

Les photos déjà intégrées (carottes, oignons, poivrons, piments) viennent de
vos propres visuels et peuvent rester telles quelles ou être remplacées de
la même façon.

---

## Mettre à jour le site (après un correctif)

À chaque fois que je vous livre une nouvelle version corrigée, deux étapes
seulement, dans cet ordre — pas besoin de trier les fichiers un par un :

1. **Base de données (Supabase)** : SQL Editor > New query. S'il y a un
   fichier `supabase/fix-*.sql` dans la livraison, collez son contenu et
   cliquez sur **Run**. (Rien à publier, c'est immédiat.)
2. **Site** : remplacez **tout le dossier** en ligne par le nouveau dossier
   `culture-market` reçu — exactement comme la toute première mise en ligne
   (glisser-déposer sur Netlify, ou remplacement du dossier sur votre
   hébergeur / dépôt GitHub). Pas besoin de repérer quels fichiers ont
   changé : remplacer l'ensemble ne casse rien.

Les téléphones ayant installé l'app récupèrent la nouvelle version à la
prochaine ouverture (parfois à la deuxième, le temps que l'app se mette à
jour toute seule en arrière-plan).

---

## Stockage & archivage (gérer la limite du plan gratuit)

Le plan gratuit de Supabase inclut 500 Mo de base de données et 1 Go de
stockage de fichiers (photos). C'est largement suffisant au départ, mais les
commandes s'accumulent avec le temps. L'onglet **Stockage & archivage** de
l'admin vous permet de garder la main dessus, sans jamais rien perdre — et
reste utile même après un passage au plan payant (il suffit d'ajuster les
limites dans Réglages).

### Mise en place (une seule fois)

Dans Supabase > SQL Editor > New query, collez le contenu de
`supabase/fix-archivage.sql` puis **Run**. Cela ajoute uniquement une
fonction de lecture des statistiques — aucune donnée n'est modifiée.

### Ce que vous voyez

Deux jauges : l'une pour la base de données, l'autre pour les photos
produits, avec le pourcentage utilisé. Une bannière d'alerte apparaît
automatiquement en haut de l'admin dès que l'une des deux dépasse le seuil
configuré (80 % par défaut).

### Comment archiver sans rien perdre

1. Choisissez une date ("commandes antérieures au...") — 90 jours avant
   aujourd'hui est proposé par défaut, modifiable librement.
2. Laissez coché "Uniquement celles livrées ou annulées" pour ne jamais
   toucher à une commande en cours.
3. Cliquez sur **1. Télécharger l'archive (.csv)** — un fichier tableur se
   télécharge sur votre appareil (ouvrable dans Excel, Google Sheets, ou
   directement sur votre téléphone). Gardez-le précieusement : à partir de
   l'étape suivante, c'est votre seule copie de ces commandes.
4. Une fois le fichier téléchargé, le bouton **2. Confirmer l'archivage**
   devient actif. En cliquant dessus (avec confirmation), ces commandes et
   leurs lignes sont retirées de la base en ligne, ce qui libère de
   l'espace. Rien n'est supprimé avant que vous ayez vous-même validé cette
   seconde étape.

Si vous changez la date ou la case à cocher après un téléchargement, il
faudra retélécharger avant de pouvoir confirmer — cela évite d'archiver un
lot différent de celui que vous avez sauvegardé.

### Quand vous changerez de plan

Si vous passez au plan Pro (8 Go base de données, 100 Go fichiers), ouvrez
**Réglages du site** et mettez à jour `Limite base de données (Mo)` et
`Limite fichiers/photos (Mo)` avec vos nouvelles valeurs. Les jauges et
l'alerte continueront de fonctionner avec les nouveaux seuils — l'outil
d'archivage reste disponible à tout moment, même largement en dessous de la
limite, si vous préférez garder une base de données légère par habitude.

---

## Comprendre le parcours client

Le site suit exactement le parcours prévu :

**Accueil → Produits (composer son panier) → Panier → Livraison → Paiement
→ Confirmation → Mes commandes (suivi)**

- Le panier reste enregistré sur l'appareil du client tant qu'il n'a pas
  validé sa commande (s'il ferme l'app et revient, son panier est toujours
  là).
- Le bouton "Continuer" du panier reste désactivé tant que le minimum de
  commande (22 000 FC par défaut, modifiable dans Réglages) n'est pas
  atteint — une barre de progression l'indique clairement.
- À la validation, un numéro de commande est généré automatiquement
  (ex. `CM-260927-4F8A2`) et le client peut le retrouver à tout moment via
  "Mes commandes" en indiquant son numéro de téléphone.
- Chaque commande peut être suivie et son statut mis à jour depuis l'admin
  (nouvelle → confirmée → en livraison → livrée).

---

## Installation de l'application (PWA)

Le site peut être installé comme une vraie application sur le téléphone du
client, sans passer par un store :

- **Android (Chrome)** : un bandeau "Installer l'app" apparaît
  automatiquement en haut du site après quelques secondes de navigation.
- **iPhone (Safari)** : Safari ne propose pas d'installation automatique.
  Le client doit utiliser le bouton **Partager** → **Sur l'écran d'accueil**.
  Vous pouvez l'indiquer dans une story ou un message de bienvenue.

Une fois installée, l'icône "Culture" (votre logo) apparaît sur l'écran
d'accueil du téléphone, et l'app s'ouvre en plein écran, sans barre de
navigateur.

---

## Notifications par e-mail (option à activer plus tard)

Le cahier des charges prévoit, si possible, des notifications e-mail liées
aux commandes. Supabase permet cela via des **Edge Functions** connectées à
un service d'envoi d'e-mails (ex. [Resend](https://resend.com), gratuit
jusqu'à un certain volume). Cette mise en place demande une configuration
technique supplémentaire (clé API Resend + petite fonction serveur) — nous
pouvons la construire dans un second temps si vous le souhaitez. En
attendant, chaque commande peut être confirmée manuellement par WhatsApp
(un bouton "Confirmer sur WhatsApp" est déjà proposé au client après
validation).

---

## Modifier les textes et l'apparence

- **Textes de la page d'accueil, slogan, description** : onglet Réglages de
  l'admin (pas besoin de toucher au code).
- **Couleurs, polices, mise en page** : dans `css/style.css`, tout est
  organisé par section avec des commentaires. Les couleurs principales sont
  regroupées tout en haut du fichier (`:root { --vert-fonce: ...; }`) — les
  modifier là suffit à changer l'ensemble du site de façon cohérente.
- **Logo** : remplacez les fichiers dans `icons/` en conservant les mêmes
  noms et tailles si vous changez de logo (192×192 et 512×512 sont les
  tailles essentielles).

---

## Tests effectués avant livraison

Avant de vous livrer ce projet, j'ai vérifié avec un navigateur automatisé
(simulation de données) :

- Affichage mobile et ordinateur de toutes les pages
- Ajout au panier, modification de quantité, suppression
- Calcul du minimum de commande et de la barre de progression
- Sélection d'une zone de livraison et calcul des frais
- Sélection d'un moyen de paiement
- Validation complète d'une commande de bout en bout (génération du numéro,
  lien WhatsApp)
- Recherche d'une commande via "Mes commandes"
- Toutes les fonctions de l'espace Admin (produits, catégories, zones,
  paiements, commandes, réglages)
- Comportement du site tant que Supabase n'est pas encore configuré
  (aucun plantage, message clair)
- Envoi d'une photo produit depuis l'admin (upload réel vers Supabase
  Storage, aperçu immédiat)
- Validation complète d'une commande via la fonction serveur sécurisée
  `create_order` (le point qui provoquait l'erreur de paiement signalée —
  revérifié de bout en bout après correction)
- Onglet Stockage & archivage : jauges, déclenchement de l'alerte au seuil,
  téléchargement de l'archive .csv (contenu vérifié ligne par ligne),
  confirmation de suppression limitée à l'exact lot téléchargé, et blocage
  du bouton de confirmation tant qu'aucun fichier n'a été téléchargé pour
  les critères en cours

Deux bugs ont été détectés et corrigés pendant ces tests : la barre de
panier flottante recouvrait partiellement la barre de navigation basse sur
mobile (résolu), et la validation de commande échouait systématiquement à
l'étape du paiement à cause d'une règle de sécurité de la base de données
(résolu via la fonction `create_order`).

**Restant à faire avant la mise en ligne réelle** (informations que vous
seul pouvez fournir, non testables en amont) :
- Connexion à votre vrai projet Supabase (étapes 1 et 2)
- Vos vraies coordonnées de contact et moyens de paiement définitifs
- Vos photos de produits définitives
- Un test de commande réel une fois en ligne, avec votre équipe

---

## Besoin d'aide ?

Si un bouton ne fonctionne pas comme attendu ou si vous souhaitez une
fonctionnalité supplémentaire (notifications e-mail automatiques, export
des commandes en Excel, statistiques de ventes...), tout est possible en
prolongement de ce projet — la base technique (Supabase) est prévue pour
évoluer sans tout reconstruire.
