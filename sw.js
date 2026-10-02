/**
 * CULTURE MARKET — Service Worker
 * Met en cache l'app shell (HTML/CSS/JS/icônes) pour permettre
 * l'installation et un premier affichage rapide, même en réseau lent.
 * Les données du catalogue et des commandes viennent toujours de
 * Supabase en direct (jamais mises en cache ici).
 */
const CACHE_NAME = "culture-market-shell-v2";
const APP_SHELL = [
  "./",
  "index.html",
  "admin/index.html",
  "css/style.css",
  "js/config.js",
  "js/supabase-client.js",
  "js/store.js",
  "js/app.js",
  "manifest.json",
  "images/placeholder.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ne jamais mettre en cache les appels Supabase : toujours en direct.
  if (url.hostname.includes("supabase.co")) return;
  if (event.request.method !== "GET") return;

  // Réseau d'abord (le site est toujours à jour après une mise à jour),
  // cache en secours si la connexion est absente ou très lente.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
