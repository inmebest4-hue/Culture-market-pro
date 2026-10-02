/**
 * CULTURE MARKET — Configuration
 * ------------------------------------------------------------------
 * 1. Créez un projet sur https://supabase.com (gratuit pour démarrer)
 * 2. Dans Supabase : Settings > API
 *    - copiez "Project URL"        -> SUPABASE_URL
 *    - copiez "anon public" key    -> SUPABASE_ANON_KEY
 * 3. Collez les deux valeurs ci-dessous. C'est la SEULE modification
 *    obligatoire avant la mise en ligne (voir GUIDE.md, étape 2).
 * ------------------------------------------------------------------
 * La clé "anon" est publique par nature (elle circule côté navigateur) :
 * c'est normal et sans danger, car toute la sécurité est gérée par les
 * règles RLS définies dans supabase/schema.sql.
 */
window.CULTURE_CONFIG = {
  SUPABASE_URL: "https://examckeiacqhysbqwsyu.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_7xctkyUksEKz8Cz4T5ZsIw_QQAmE25x",

  // Nom affiché si Supabase est momentanément injoignable (mode dégradé)
  APP_NAME: "Culture Market",

  // Numéro WhatsApp de secours utilisé pour le bouton "Écrire sur WhatsApp"
  // si aucun réglage n'est trouvé dans la table site_settings.
  WHATSAPP_FALLBACK: "243900000000"
};
