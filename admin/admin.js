/**
 * CULTURE MARKET — Admin
 * Authentification Supabase + CRUD simple sur toutes les tables.
 * Toutes les écritures passent par les policies RLS "admin full access"
 * définies dans supabase/schema.sql (accès réservé aux comptes authentifiés).
 */
(function () {
  const toastEl = document.getElementById("toast");
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  function sb() {
    return window.supabaseClient;
  }

  function money(n) {
    return Math.round(n || 0).toLocaleString("fr-FR") + " FC";
  }

  // ---------------------------------------------------------------
  // AUTHENTIFICATION
  // ---------------------------------------------------------------
  const loginScreen = document.getElementById("login-screen");
  const adminScreen = document.getElementById("admin-screen");

  async function checkSession() {
    if (!window.CULTURE_SUPABASE_READY) {
      toast("Configuration Supabase manquante — voir js/config.js");
      return;
    }
    const { data } = await sb().auth.getSession();
    if (data.session) {
      showAdmin();
    } else {
      loginScreen.style.display = "block";
      adminScreen.style.display = "none";
    }
  }

  function showAdmin() {
    loginScreen.style.display = "none";
    adminScreen.style.display = "block";
    loadAll();
  }

  document.getElementById("btn-login").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const errEl = document.getElementById("login-error");
    const { error } = await sb().auth.signInWithPassword({ email, password });
    if (error) {
      errEl.textContent = error.message;
      errEl.style.display = "block";
      return;
    }
    errEl.style.display = "none";
    showAdmin();
  });

  document.getElementById("btn-logout").addEventListener("click", async () => {
    await sb().auth.signOut();
    location.reload();
  });

  // ---------------------------------------------------------------
  // ONGLETS
  // ---------------------------------------------------------------
  document.querySelectorAll(".admin-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-tabs button").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.panel).classList.add("active");
    });
  });

  // ---------------------------------------------------------------
  // DONNÉES PARTAGÉES
  // ---------------------------------------------------------------
  let categories = [];
  let siteSettingsMap = {};

  async function loadAll() {
    const { data: cats } = await sb().from("categories").select("*").order("ordre");
    categories = cats || [];
    await Promise.all([
      loadCategories(),
      loadProducts(),
      loadZones(),
      loadPayments(),
      loadOrders(),
      loadSettings(),
      loadStorageStats(),
    ]);
  }

  // ---------------------------------------------------------------
  // PRODUITS
  // ---------------------------------------------------------------
  async function loadProducts() {
    const { data, error } = await sb().from("products").select("*").order("ordre");
    if (error) return toast("Erreur chargement produits");
    const tbody = document.querySelector("#table-products tbody");
    tbody.innerHTML = "";
    (data || []).forEach((p) => tbody.appendChild(productRow(p)));
  }

  function productRow(p) {
    const tr = document.createElement("tr");
    const catOptions = categories
      .map((c) => `<option value="${c.id}" ${c.id === p.category_id ? "selected" : ""}>${c.nom}</option>`)
      .join("");
    tr.innerHTML = `
      <td><input value="${p.nom || ""}" data-f="nom" /></td>
      <td><select data-f="category_id">${catOptions}</select></td>
      <td><input value="${p.unite || ""}" data-f="unite" style="width:80px;" /></td>
      <td><input type="number" value="${p.prix_fc || 0}" data-f="prix_fc" style="width:90px;" /></td>
      <td>
        <div class="admin-img-cell">
          <img class="admin-thumb" src="${p.image_url || '../images/placeholder.svg'}" alt="" data-thumb />
          <input value="${p.image_url || ""}" data-f="image_url" placeholder="URL de l'image" />
          <label class="mini-btn upload">
            Choisir une photo
            <input type="file" accept="image/*" data-file-input hidden />
          </label>
          <span class="upload-status" data-upload-status></span>
        </div>
      </td>
      <td style="text-align:center;"><input type="checkbox" data-f="disponible" ${p.disponible ? "checked" : ""} /></td>
      <td><input type="number" value="${p.ordre || 0}" data-f="ordre" style="width:60px;" /></td>
      <td class="actions">
        <button class="mini-btn save">Enregistrer</button>
        <button class="mini-btn delete">Suppr.</button>
      </td>
    `;
    tr.querySelector(".save").addEventListener("click", async () => {
      const payload = readRow(tr, ["nom", "unite", "image_url"], ["prix_fc", "category_id", "ordre"], ["disponible"]);
      const { error } = await sb().from("products").update(payload).eq("id", p.id);
      toast(error ? "Erreur d'enregistrement" : "Produit enregistré");
    });
    tr.querySelector(".delete").addEventListener("click", async () => {
      if (!confirm(`Supprimer "${p.nom}" ?`)) return;
      const { error } = await sb().from("products").delete().eq("id", p.id);
      if (!error) tr.remove();
      toast(error ? "Erreur de suppression" : "Produit supprimé");
    });

    // Aperçu en direct si on colle une URL à la main
    const urlInput = tr.querySelector('[data-f="image_url"]');
    const thumb = tr.querySelector("[data-thumb]");
    urlInput.addEventListener("input", () => {
      thumb.src = urlInput.value || "../images/placeholder.svg";
    });

    // Upload direct d'une photo vers Supabase Storage (bucket "produits")
    const fileInput = tr.querySelector("[data-file-input]");
    const statusEl = tr.querySelector("[data-upload-status]");
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast("Merci de choisir un fichier image.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast("Photo trop lourde (5 Mo maximum).");
        return;
      }

      statusEl.textContent = "Envoi en cours...";
      try {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `produits/${p.id}-${Date.now()}.${ext}`;

        const { error: upErr } = await sb()
          .storage.from("produits")
          .upload(path, file, { upsert: true, cacheControl: "3600" });
        if (upErr) throw upErr;

        const { data: pub } = sb().storage.from("produits").getPublicUrl(path);
        const publicUrl = pub.publicUrl;

        const { error: updErr } = await sb()
          .from("products")
          .update({ image_url: publicUrl })
          .eq("id", p.id);
        if (updErr) throw updErr;

        urlInput.value = publicUrl;
        thumb.src = publicUrl;
        statusEl.textContent = "Photo enregistrée.";
        toast("Photo envoyée et enregistrée.");
      } catch (err) {
        console.error(err);
        const msg = (err && err.message) || "";
        if (msg.toLowerCase().includes("bucket not found")) {
          statusEl.textContent = "Bucket manquant.";
          toast('Le stockage "produits" n\'existe pas encore — voir supabase/storage.sql dans le GUIDE.');
        } else {
          statusEl.textContent = "Erreur d'envoi.";
          toast("Erreur lors de l'envoi de la photo.");
        }
      } finally {
        fileInput.value = "";
      }
    });

    return tr;
  }

  document.getElementById("btn-add-product").addEventListener("click", async () => {
    const { data, error } = await sb()
      .from("products")
      .insert({ nom: "Nouveau produit", unite: "kg", prix_fc: 0, category_id: categories[0]?.id || null })
      .select()
      .single();
    if (error) return toast("Erreur de création");
    document.querySelector("#table-products tbody").appendChild(productRow(data));
  });

  function readRow(tr, textFields, numberFields, checkFields) {
    const payload = {};
    textFields.forEach((f) => {
      payload[f] = tr.querySelector(`[data-f="${f}"]`).value;
    });
    numberFields.forEach((f) => {
      payload[f] = parseFloat(tr.querySelector(`[data-f="${f}"]`).value) || 0;
    });
    checkFields.forEach((f) => {
      payload[f] = tr.querySelector(`[data-f="${f}"]`).checked;
    });
    return payload;
  }

  // ---------------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------------
  async function loadCategories() {
    const tbody = document.querySelector("#table-categories tbody");
    tbody.innerHTML = "";
    categories.forEach((c) => tbody.appendChild(categoryRow(c)));
  }

  function categoryRow(c) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input value="${c.nom || ""}" data-f="nom" /></td>
      <td><input value="${c.slug || ""}" data-f="slug" /></td>
      <td><input type="number" value="${c.ordre || 0}" data-f="ordre" style="width:60px;" /></td>
      <td class="actions">
        <button class="mini-btn save">Enregistrer</button>
        <button class="mini-btn delete">Suppr.</button>
      </td>
    `;
    tr.querySelector(".save").addEventListener("click", async () => {
      const payload = readRow(tr, ["nom", "slug"], ["ordre"], []);
      const { error } = await sb().from("categories").update(payload).eq("id", c.id);
      toast(error ? "Erreur d'enregistrement" : "Catégorie enregistrée");
    });
    tr.querySelector(".delete").addEventListener("click", async () => {
      if (!confirm(`Supprimer "${c.nom}" ? Les produits associés resteront mais sans catégorie.`)) return;
      const { error } = await sb().from("categories").delete().eq("id", c.id);
      if (!error) { tr.remove(); await loadAll(); }
      toast(error ? "Erreur de suppression" : "Catégorie supprimée");
    });
    return tr;
  }

  document.getElementById("btn-add-category").addEventListener("click", async () => {
    const nom = prompt("Nom de la nouvelle catégorie ?");
    if (!nom) return;
    const slug = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const { error } = await sb().from("categories").insert({ nom, slug });
    if (error) return toast("Erreur de création (slug déjà utilisé ?)");
    await loadAll();
  });

  // ---------------------------------------------------------------
  // ZONES DE LIVRAISON
  // ---------------------------------------------------------------
  async function loadZones() {
    const { data, error } = await sb().from("delivery_zones").select("*").order("ordre");
    if (error) return toast("Erreur chargement zones");
    const tbody = document.querySelector("#table-zones tbody");
    tbody.innerHTML = "";
    (data || []).forEach((z) => tbody.appendChild(zoneRow(z)));
  }

  function zoneRow(z) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input value="${z.nom_commune || ""}" data-f="nom_commune" /></td>
      <td><input type="number" value="${z.frais_fc || 0}" data-f="frais_fc" style="width:90px;" /></td>
      <td style="text-align:center;"><input type="checkbox" data-f="actif" ${z.actif ? "checked" : ""} /></td>
      <td><input type="number" value="${z.ordre || 0}" data-f="ordre" style="width:60px;" /></td>
      <td class="actions">
        <button class="mini-btn save">Enregistrer</button>
        <button class="mini-btn delete">Suppr.</button>
      </td>
    `;
    tr.querySelector(".save").addEventListener("click", async () => {
      const payload = readRow(tr, ["nom_commune"], ["frais_fc", "ordre"], ["actif"]);
      const { error } = await sb().from("delivery_zones").update(payload).eq("id", z.id);
      toast(error ? "Erreur d'enregistrement" : "Zone enregistrée");
    });
    tr.querySelector(".delete").addEventListener("click", async () => {
      if (!confirm(`Supprimer la zone "${z.nom_commune}" ?`)) return;
      const { error } = await sb().from("delivery_zones").delete().eq("id", z.id);
      if (!error) tr.remove();
      toast(error ? "Erreur de suppression" : "Zone supprimée");
    });
    return tr;
  }

  document.getElementById("btn-add-zone").addEventListener("click", async () => {
    const { data, error } = await sb()
      .from("delivery_zones")
      .insert({ nom_commune: "Nouvelle zone", frais_fc: 0 })
      .select()
      .single();
    if (error) return toast("Erreur de création");
    document.querySelector("#table-zones tbody").appendChild(zoneRow(data));
  });

  // ---------------------------------------------------------------
  // MOYENS DE PAIEMENT
  // ---------------------------------------------------------------
  async function loadPayments() {
    const { data, error } = await sb().from("payment_methods").select("*").order("ordre");
    if (error) return toast("Erreur chargement paiements");
    const tbody = document.querySelector("#table-payments tbody");
    tbody.innerHTML = "";
    (data || []).forEach((m) => tbody.appendChild(paymentRow(m)));
  }

  function paymentRow(m) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input value="${m.nom || ""}" data-f="nom" /></td>
      <td><input value="${m.instructions || ""}" data-f="instructions" style="min-width:220px;" /></td>
      <td style="text-align:center;"><input type="checkbox" data-f="actif" ${m.actif ? "checked" : ""} /></td>
      <td><input type="number" value="${m.ordre || 0}" data-f="ordre" style="width:60px;" /></td>
      <td class="actions">
        <button class="mini-btn save">Enregistrer</button>
        <button class="mini-btn delete">Suppr.</button>
      </td>
    `;
    tr.querySelector(".save").addEventListener("click", async () => {
      const payload = readRow(tr, ["nom", "instructions"], ["ordre"], ["actif"]);
      const { error } = await sb().from("payment_methods").update(payload).eq("id", m.id);
      toast(error ? "Erreur d'enregistrement" : "Moyen de paiement enregistré");
    });
    tr.querySelector(".delete").addEventListener("click", async () => {
      if (!confirm(`Supprimer "${m.nom}" ?`)) return;
      const { error } = await sb().from("payment_methods").delete().eq("id", m.id);
      if (!error) tr.remove();
      toast(error ? "Erreur de suppression" : "Moyen supprimé");
    });
    return tr;
  }

  document.getElementById("btn-add-payment").addEventListener("click", async () => {
    const { data, error } = await sb()
      .from("payment_methods")
      .insert({ nom: "Nouveau moyen de paiement", instructions: "" })
      .select()
      .single();
    if (error) return toast("Erreur de création");
    document.querySelector("#table-payments tbody").appendChild(paymentRow(data));
  });

  // ---------------------------------------------------------------
  // COMMANDES
  // ---------------------------------------------------------------
  const STATUTS = ["nouvelle", "confirmee", "en_livraison", "livree", "annulee"];

  async function loadOrders() {
    const { data, error } = await sb().from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) return toast("Erreur chargement commandes");
    const tbody = document.querySelector("#table-orders tbody");
    tbody.innerHTML = "";
    (data || []).forEach((o) => {
      const tr = document.createElement("tr");
      const date = new Date(o.created_at).toLocaleString("fr-FR");
      const options = STATUTS.map((s) => `<option value="${s}" ${s === o.statut ? "selected" : ""}>${s}</option>`).join("");
      tr.innerHTML = `
        <td>${o.numero}</td>
        <td>${o.nom_client}</td>
        <td>${o.telephone}</td>
        <td>${o.commune}</td>
        <td>${money(o.total_fc)}</td>
        <td><select data-f="statut">${options}</select></td>
        <td>${date}</td>
      `;
      tr.querySelector("select").addEventListener("change", async (e) => {
        const { error } = await sb().from("orders").update({ statut: e.target.value }).eq("id", o.id);
        toast(error ? "Erreur de mise à jour" : "Statut mis à jour");
      });
      tbody.appendChild(tr);
    });
  }

  // ---------------------------------------------------------------
  // RÉGLAGES DU SITE
  // ---------------------------------------------------------------
  const SETTINGS_LABELS = {
    nom_entreprise: "Nom affiché",
    slogan: "Slogan",
    description_accueil: "Description (page d'accueil)",
    ville: "Ville",
    horaires_livraison: "Horaires de livraison",
    commande_minimum_fc: "Commande minimum (FC)",
    responsable_nom: "Nom du responsable",
    responsable_role: "Rôle du responsable",
    telephone_contact: "Téléphone de contact",
    whatsapp_contact: "WhatsApp (format international, ex: 243970000000)",
    email_contact: "E-mail de contact",
    adresse_texte: "Adresse (texte affiché)",
    google_maps_url: "Lien Google Maps",
    facebook_url: "Lien Facebook",
    instagram_url: "Lien Instagram",
    tiktok_url: "Lien TikTok",
    limite_bdd_mo: "Limite base de données (Mo) — selon votre plan Supabase",
    limite_fichiers_mo: "Limite fichiers/photos (Mo) — selon votre plan Supabase",
    seuil_alerte_stockage_pct: "Seuil d'alerte stockage (%)",
  };

  async function loadSettings() {
    const { data, error } = await sb().from("site_settings").select("*");
    if (error) return toast("Erreur chargement réglages");
    siteSettingsMap = {};
    (data || []).forEach((r) => (siteSettingsMap[r.cle] = r.valeur));
    const grid = document.getElementById("settings-grid");
    grid.innerHTML = "";
    Object.entries(SETTINGS_LABELS).forEach(([key, label]) => {
      const l = document.createElement("label");
      l.textContent = label;
      const input = document.createElement("input");
      input.value = siteSettingsMap[key] || "";
      input.dataset.key = key;
      grid.appendChild(l);
      grid.appendChild(input);
    });
  }

  document.getElementById("btn-save-settings").addEventListener("click", async () => {
    const inputs = document.querySelectorAll("#settings-grid input");
    const rows = Array.from(inputs).map((i) => ({ cle: i.dataset.key, valeur: i.value }));
    const { error } = await sb().from("site_settings").upsert(rows, { onConflict: "cle" });
    toast(error ? "Erreur d'enregistrement" : "Réglages enregistrés");
    if (!error) { await loadSettings(); await loadStorageStats(); }
  });

  // ---------------------------------------------------------------
  // STOCKAGE & ARCHIVAGE
  // ---------------------------------------------------------------
  const MO = 1024 * 1024;
  let pendingArchiveIds = null; // rempli après un téléchargement réussi

  function settingNumber(key, fallback) {
    const v = parseFloat(siteSettingsMap[key]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  }

  function applyBarState(barEl, wrapEl, pct, seuil) {
    barEl.style.width = Math.min(100, pct) + "%";
    wrapEl.classList.remove("alert-ok", "alert-warning", "alert-critical");
    if (pct >= seuil) wrapEl.classList.add("alert-critical");
    else if (pct >= Math.max(0, seuil - 20)) wrapEl.classList.add("alert-warning");
    else wrapEl.classList.add("alert-ok");
  }

  async function loadStorageStats() {
    if (!window.CULTURE_SUPABASE_READY) return;
    const { data, error } = await sb().rpc("admin_storage_stats");
    const banner = document.getElementById("storage-alert-banner");
    if (error) {
      console.error(error);
      document.getElementById("db-usage-text").textContent = "indisponible";
      document.getElementById("files-usage-text").textContent = "indisponible";
      document.getElementById("db-usage-detail").textContent =
        "Exécutez supabase/fix-archivage.sql dans Supabase pour activer cette estimation.";
      banner.style.display = "none";
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const dbMB = (row.db_size_bytes || 0) / MO;
    const filesMB = (row.storage_bytes || 0) / MO;
    const limiteDb = settingNumber("limite_bdd_mo", 500);
    const limiteFiles = settingNumber("limite_fichiers_mo", 1024);
    const seuil = settingNumber("seuil_alerte_stockage_pct", 80);

    const dbPct = (dbMB / limiteDb) * 100;
    const filesPct = (filesMB / limiteFiles) * 100;

    document.getElementById("db-usage-text").textContent =
      `${dbMB.toFixed(1)} / ${limiteDb} Mo (${Math.round(dbPct)}%)`;
    document.getElementById("files-usage-text").textContent =
      `${filesMB.toFixed(1)} / ${limiteFiles} Mo (${Math.round(filesPct)}%)`;
    applyBarState(
      document.getElementById("db-usage-bar"),
      document.getElementById("db-usage-bar").parentElement,
      dbPct, seuil
    );
    applyBarState(
      document.getElementById("files-usage-bar"),
      document.getElementById("files-usage-bar").parentElement,
      filesPct, seuil
    );
    document.getElementById("db-usage-detail").textContent =
      `${row.orders_count || 0} commande(s) enregistrée(s)` +
      (row.oldest_order_date ? ` depuis le ${new Date(row.oldest_order_date).toLocaleDateString("fr-FR")}.` : ".");
    document.getElementById("files-usage-detail").textContent =
      "Photos stockées dans le bucket Supabase 'produits'.";

    const worstPct = Math.max(dbPct, filesPct);
    if (worstPct >= seuil) {
      banner.style.display = "block";
      banner.className = "storage-alert-banner critical";
      banner.textContent =
        `Alerte stockage : vous avez atteint ${Math.round(worstPct)}% de votre capacité Supabase. ` +
        `Pensez à archiver les anciennes commandes dans l'onglet "Stockage & archivage".`;
    } else if (worstPct >= Math.max(0, seuil - 20)) {
      banner.style.display = "block";
      banner.className = "storage-alert-banner warning";
      banner.textContent =
        `Stockage à ${Math.round(worstPct)}% de la capacité disponible — surveillez l'évolution.`;
    } else {
      banner.style.display = "none";
    }
  }

  function resetArchiveSelection() {
    pendingArchiveIds = null;
    document.getElementById("btn-archive-delete").disabled = true;
  }

  async function fetchArchivableOrders() {
    const beforeInput = document.getElementById("archive-before-date").value;
    if (!beforeInput) {
      toast("Choisissez une date limite pour l'archivage.");
      return null;
    }
    const onlyClosed = document.getElementById("archive-only-closed").checked;
    let query = sb()
      .from("orders")
      .select("*, order_items(*)")
      .lt("created_at", beforeInput + "T23:59:59")
      .order("created_at");
    if (onlyClosed) query = query.in("statut", ["livree", "annulee"]);
    const { data, error } = await query;
    if (error) {
      console.error(error);
      toast("Erreur lors de la recherche des commandes à archiver.");
      return null;
    }
    return data || [];
  }

  function buildArchiveCsv(orders) {
    const headers = [
      "Numero", "Date", "Client", "Telephone", "Commune", "Adresse",
      "Mode livraison", "Statut", "Moyen paiement",
      "Produit", "Unite", "Prix unitaire (FC)", "Quantite", "Sous-total article (FC)",
      "Frais livraison (FC)", "Total commande (FC)",
    ];
    const rows = [headers];
    orders.forEach((o) => {
      const items = (o.order_items && o.order_items.length) ? o.order_items : [null];
      items.forEach((it) => {
        rows.push([
          o.numero,
          new Date(o.created_at).toLocaleString("fr-FR"),
          o.nom_client, o.telephone, o.commune, o.adresse,
          o.mode_livraison, o.statut, o.moyen_paiement || "",
          it ? it.nom_produit : "", it ? it.unite : "",
          it ? it.prix_unitaire : "", it ? it.quantite : "", it ? it.sous_total : "",
          o.frais_livraison, o.total_fc,
        ]);
      });
    });
    const esc = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  }

  document.getElementById("archive-before-date").addEventListener("change", resetArchiveSelection);
  document.getElementById("archive-only-closed").addEventListener("change", resetArchiveSelection);

  document.getElementById("btn-archive-download").addEventListener("click", async () => {
    const btn = document.getElementById("btn-archive-download");
    btn.disabled = true;
    btn.textContent = "Recherche...";
    try {
      const orders = await fetchArchivableOrders();
      if (orders === null) return;
      if (!orders.length) {
        document.getElementById("archive-preview-text").textContent =
          "Aucune commande ne correspond à ces critères — rien à archiver.";
        resetArchiveSelection();
        return;
      }
      const csv = buildArchiveCsv(orders);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `culture-market-commandes-archivees-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      const total = orders.reduce((s, o) => s + Number(o.total_fc || 0), 0);
      pendingArchiveIds = orders.map((o) => o.id);
      document.getElementById("archive-preview-text").textContent =
        `${orders.length} commande(s) téléchargée(s) (total ${money(total)}). ` +
        `Vous pouvez maintenant confirmer l'archivage pour les retirer du site.`;
      document.getElementById("btn-archive-delete").disabled = false;
      toast("Fichier téléchargé.");
    } finally {
      btn.disabled = false;
      btn.textContent = "1. Télécharger l'archive (.csv)";
    }
  });

  document.getElementById("btn-archive-delete").addEventListener("click", async () => {
    if (!pendingArchiveIds || !pendingArchiveIds.length) return;
    const ok = confirm(
      `Confirmez-vous le retrait de ${pendingArchiveIds.length} commande(s) du site ? ` +
      `Elles restent disponibles dans le fichier .csv déjà téléchargé.`
    );
    if (!ok) return;
    const btn = document.getElementById("btn-archive-delete");
    btn.disabled = true;
    btn.textContent = "Archivage en cours...";
    try {
      const { error: itemsErr } = await sb().from("order_items").delete().in("order_id", pendingArchiveIds);
      if (itemsErr) throw itemsErr;
      const { error: ordersErr } = await sb().from("orders").delete().in("id", pendingArchiveIds);
      if (ordersErr) throw ordersErr;
      toast(`${pendingArchiveIds.length} commande(s) archivée(s) et retirée(s) du site.`);
      document.getElementById("archive-preview-text").textContent =
        "Archivage confirmé. L'espace sera libéré sous peu côté Supabase.";
      resetArchiveSelection();
      await Promise.all([loadOrders(), loadStorageStats()]);
    } catch (err) {
      console.error(err);
      toast("Erreur pendant l'archivage — rien n'a été supprimé partiellement, réessayez.");
      btn.disabled = false;
    } finally {
      btn.textContent = "2. Confirmer l'archivage (libérer l'espace)";
    }
  });

  // Date par défaut proposée : il y a 90 jours (modifiable par l'utilisateur)
  (function setDefaultArchiveDate() {
    const input = document.getElementById("archive-before-date");
    const d = new Date();
    d.setDate(d.getDate() - 90);
    input.value = d.toISOString().slice(0, 10);
  })();

  checkSession();
})();
