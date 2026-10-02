/**
 * CULTURE MARKET — Client Supabase partagé
 * Nécessite que la librairie UMD Supabase soit chargée avant ce fichier
 * (voir la balise <script> dans index.html) et que config.js soit chargé.
 */
(function () {
  const cfg = window.CULTURE_CONFIG || {};
  const notConfigured =
    !cfg.SUPABASE_URL ||
    !cfg.SUPABASE_ANON_KEY ||
    cfg.SUPABASE_URL.includes("VOTRE-PROJET") ||
    cfg.SUPABASE_ANON_KEY.includes("VOTRE_CLE");

  window.CULTURE_SUPABASE_READY = !notConfigured;

  if (notConfigured) {
    console.warn(
      "[Culture Market] Supabase n'est pas encore configuré. " +
      "Ouvrez js/config.js et renseignez SUPABASE_URL et SUPABASE_ANON_KEY."
    );
    window.supabaseClient = null;
    return;
  }

  window.supabaseClient = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY
  );
})();
