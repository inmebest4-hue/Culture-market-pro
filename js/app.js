/**
 * CULTURE MARKET — Application front-end
 */
(function () {
  document.getElementById("annee").textContent = new Date().getFullYear();

  // ---------------------------------------------------------------
  // TOAST
  // ---------------------------------------------------------------
  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  // ---------------------------------------------------------------
  // NAVIGATION ENTRE SECTIONS
  // ---------------------------------------------------------------
  const sections = document.querySelectorAll("main > section");
  const navButtons = document.querySelectorAll(
    ".tab-nav button, .bottom-nav button, [data-nav]"
  );

  function goTo(target) {
    sections.forEach((s) => s.classList.toggle("active", "#" + s.id === target));
    document.querySelectorAll(".tab-nav button, .bottom-nav button").forEach((b) => {
      b.classList.toggle("active", b.dataset.target === target);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target || btn.dataset.nav;
      if (target) goTo(target);
    });
  });

  // ---------------------------------------------------------------
  // RENDU DU CATALOGUE
  // ---------------------------------------------------------------
  let activeCategory = "all";

  function money(n) {
    return Math.round(n).toLocaleString("fr-FR").replace(/\u202F|\u00A0/g, " ") + " FC";
  }

  function renderCategoryRow() {
    const homeRow = document.getElementById("cat-scroll-home");
    const filters = document.getElementById("cat-filters");
    homeRow.innerHTML = "";
    filters.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.className = "cat-filters-all";
    allBtn.textContent = "Tout";
    allBtn.classList.add("active");
    allBtn.addEventListener("click", () => {
      activeCategory = "all";
      renderCategoryRow();
      renderProducts();
      goTo("#produits");
    });
    filters.appendChild(allBtn);

    CultureStore.categories.forEach((cat) => {
      const pill = document.createElement("button");
      pill.className = "cat-pill";
      pill.textContent = cat.nom;
      pill.addEventListener("click", () => {
        activeCategory = cat.id;
        renderProducts();
        renderFilterActive();
        goTo("#produits");
      });
      homeRow.appendChild(pill);

      const filterBtn = document.createElement("button");
      filterBtn.textContent = cat.nom;
      filterBtn.dataset.cat = cat.id;
      filterBtn.addEventListener("click", () => {
        activeCategory = cat.id;
        renderProducts();
        renderFilterActive();
      });
      filters.appendChild(filterBtn);
    });
    renderFilterActive();
  }

  function renderFilterActive() {
    document.querySelectorAll("#cat-filters button").forEach((b) => {
      const isAll = !b.dataset.cat;
      b.classList.toggle("active", isAll ? activeCategory === "all" : String(b.dataset.cat) === String(activeCategory));
    });
  }

  function renderProducts() {
    const grid = document.getElementById("produits-grid");
    grid.innerHTML = "";
    const list = CultureStore.products.filter(
      (p) => activeCategory === "all" || String(p.category_id) === String(activeCategory)
    );

    if (!list.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;">Aucun produit dans cette catégorie pour le moment.</p>';
      return;
    }

    list.forEach((p) => {
      const card = document.createElement("div");
      card.className = "produit-card";
      const qty = CultureStore.getQty(p.id);
      card.innerHTML = `
        <div class="produit-img-wrap">
          <img src="${p.image_url || 'images/placeholder.svg'}" alt="${escapeHtml(p.nom)}" loading="lazy" />
          <span class="produit-prix">${money(p.prix_fc)}</span>
        </div>
        <div class="produit-body">
          <h4>${escapeHtml(p.nom)}</h4>
          <div class="produit-unite">par ${escapeHtml(p.unite)}</div>
          <div class="qty-row">
            <button class="qty-btn" data-action="dec">−</button>
            <input class="qty-input" type="number" min="0" value="${qty}" data-qty-input />
            <button class="qty-btn" data-action="inc">+</button>
          </div>
          <button class="btn-add" data-action="add">Ajouter au panier</button>
        </div>
      `;
      const input = card.querySelector("[data-qty-input]");
      card.querySelector('[data-action="dec"]').addEventListener("click", () => {
        input.value = Math.max(0, (parseFloat(input.value) || 0) - 1);
      });
      card.querySelector('[data-action="inc"]').addEventListener("click", () => {
        input.value = (parseFloat(input.value) || 0) + 1;
      });
      card.querySelector('[data-action="add"]').addEventListener("click", () => {
        const val = parseFloat(input.value) || 0;
        if (val <= 0) {
          toast("Choisissez une quantité avant d'ajouter au panier.");
          return;
        }
        CultureStore.setQty(p.id, val);
        toast(`${p.nom} ajouté au panier.`);
      });
      grid.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  // ---------------------------------------------------------------
  // BARRE / TIROIR PANIER
  // ---------------------------------------------------------------
  const cartBar = document.getElementById("cart-bar");
  const overlay = document.getElementById("drawer-overlay");

  function refreshCartBar() {
    const count = CultureStore.cartCount();
    const total = CultureStore.cartTotal();
    document.getElementById("cart-bar-count").textContent =
      count + (count > 1 ? " articles" : " article");
    document.getElementById("cart-bar-amount").textContent = money(total);
    cartBar.classList.toggle("show", count > 0);
    document.body.classList.toggle("cart-bar-visible", count > 0);
    renderProducts(); // garde les quantités affichées synchronisées
  }

  document.addEventListener("cart:changed", refreshCartBar);

  function showStep(id) {
    document.querySelectorAll(".drawer-step").forEach((el) => {
      el.style.display = el.id === id ? "block" : "none";
    });
    document.getElementById("drawer").scrollTop = 0;
  }

  function openCart() {
    renderCartLines();
    showStep("step-panier");
    overlay.classList.add("open");
  }
  function closeCart() {
    overlay.classList.remove("open");
  }

  document.getElementById("btn-open-cart").addEventListener("click", openCart);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCart();
  });
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", closeCart)
  );
  document.querySelectorAll("[data-back]").forEach((b) =>
    b.addEventListener("click", () => showStep(b.dataset.back))
  );

  function renderCartLines() {
    const container = document.getElementById("cart-lines");
    const lines = CultureStore.cartLines();
    container.innerHTML = "";
    document.getElementById("cart-empty").style.display = lines.length ? "none" : "block";

    lines.forEach((l) => {
      const row = document.createElement("div");
      row.className = "cart-line";
      row.innerHTML = `
        <img src="${l.product.image_url || 'images/placeholder.svg'}" alt="" />
        <div class="cart-line-info">
          <h5>${escapeHtml(l.product.nom)}</h5>
          <span>${l.qty} ${escapeHtml(l.product.unite)} × ${money(l.product.prix_fc)}</span>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:600; color:var(--vert-fonce); margin-bottom:4px;">${money(l.sousTotal)}</div>
          <button class="cart-line-remove" data-id="${l.product.id}">Retirer</button>
        </div>
      `;
      row.querySelector(".cart-line-remove").addEventListener("click", () => {
        CultureStore.setQty(l.product.id, 0);
        renderCartLines();
        renderMinOrderBox();
      });
      container.appendChild(row);
    });

    document.getElementById("cart-total").textContent = money(CultureStore.cartTotal());
    renderMinOrderBox();
  }

  function renderMinOrderBox() {
    const total = CultureStore.cartTotal();
    const min = CultureStore.minOrder();
    const box = document.getElementById("min-order-box");
    const pct = Math.min(100, (total / min) * 100 || 0);
    document.getElementById("min-order-progress").style.width = pct + "%";
    const goBtn = document.getElementById("btn-goto-livraison");

    if (total >= min) {
      box.classList.add("ok");
      document.getElementById("min-order-text").textContent =
        `Minimum atteint — ${money(total)} sur ${money(min)}.`;
      goBtn.disabled = CultureStore.cartLines().length === 0;
    } else {
      box.classList.remove("ok");
      document.getElementById("min-order-text").textContent =
        `Commande minimum : ${money(min)} — il vous manque ${money(min - total)}.`;
      goBtn.disabled = true;
    }
  }

  // ---------------------------------------------------------------
  // ÉTAPE LIVRAISON
  // ---------------------------------------------------------------
  let selectedZone = null;

  function renderZoneOptions() {
    const select = document.getElementById("cmd-commune");
    select.innerHTML = "";
    CultureStore.zones.forEach((z, i) => {
      const opt = document.createElement("option");
      opt.value = z.id;
      opt.textContent = `${z.nom_commune} — ${money(z.frais_fc)}`;
      select.appendChild(opt);
    });
    select.addEventListener("change", updateLivraisonSummary);
    if (CultureStore.zones.length) updateLivraisonSummary();
  }

  function updateLivraisonSummary() {
    const select = document.getElementById("cmd-commune");
    const zone = CultureStore.zones.find((z) => String(z.id) === String(select.value));
    selectedZone = zone || null;
    const sousTotal = CultureStore.cartTotal();
    const frais = zone ? zone.frais_fc : 0;
    document.getElementById("liv-sous-total").textContent = money(sousTotal);
    document.getElementById("liv-frais").textContent = money(frais);
    document.getElementById("liv-total").textContent = money(sousTotal + frais);
  }

  document.getElementById("btn-goto-livraison").addEventListener("click", () => {
    renderZoneOptions();
    showStep("step-livraison");
  });

  document.getElementById("btn-goto-paiement").addEventListener("click", () => {
    const nom = document.getElementById("cmd-nom").value.trim();
    const tel = document.getElementById("cmd-tel").value.trim();
    const adresse = document.getElementById("cmd-adresse").value.trim();
    const error = document.getElementById("liv-error");

    if (!nom || !tel || !adresse || !selectedZone) {
      error.style.display = "block";
      return;
    }
    error.style.display = "none";
    renderPaymentOptions();
    document.getElementById("pay-total").textContent = document.getElementById("liv-total").textContent;
    showStep("step-paiement");
  });

  // ---------------------------------------------------------------
  // ÉTAPE PAIEMENT
  // ---------------------------------------------------------------
  let selectedPayment = null;

  function renderPaymentOptions() {
    const container = document.getElementById("pay-options");
    container.innerHTML = "";
    CultureStore.paymentMethods.forEach((m, i) => {
      const opt = document.createElement("label");
      opt.className = "pay-option" + (i === 0 ? " selected" : "");
      opt.innerHTML = `
        <input type="radio" name="pay" value="${m.id}" ${i === 0 ? "checked" : ""} />
        <div><strong>${escapeHtml(m.nom)}</strong><small>${escapeHtml(m.instructions || "")}</small></div>
      `;
      opt.querySelector("input").addEventListener("change", () => {
        document.querySelectorAll(".pay-option").forEach((o) => o.classList.remove("selected"));
        opt.classList.add("selected");
        selectedPayment = m;
      });
      container.appendChild(opt);
      if (i === 0) selectedPayment = m;
    });
  }

  document.getElementById("btn-confirmer-commande").addEventListener("click", async () => {
    const btn = document.getElementById("btn-confirmer-commande");
    btn.disabled = true;
    btn.textContent = "Envoi en cours...";
    try {
      const order = await CultureStore.submitOrder({
        nom: document.getElementById("cmd-nom").value.trim(),
        telephone: document.getElementById("cmd-tel").value.trim(),
        commune: selectedZone.nom_commune,
        adresse: document.getElementById("cmd-adresse").value.trim(),
        mode: document.getElementById("cmd-mode").value,
        moyenPaiement: selectedPayment ? selectedPayment.nom : "",
      });

      document.getElementById("conf-numero").textContent = order.numero;
      const whatsappNum =
        CultureStore.getSetting("whatsapp_contact", window.CULTURE_CONFIG.WHATSAPP_FALLBACK) || "";
      const msg = encodeURIComponent(
        `Bonjour Culture Market, je viens de passer la commande ${order.numero} (${money(order.total_fc)}).`
      );
      document.getElementById("conf-whatsapp").href =
        `https://wa.me/${whatsappNum.replace(/\D/g, "")}?text=${msg}`;

      showStep("step-confirmation");
    } catch (err) {
      console.error(err);
      const m = (err && err.message) || "";
      toast(m.startsWith("CM:") ? m.slice(3).trim()
        : "Une erreur est survenue. Vérifiez votre connexion et réessayez.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Valider ma commande";
    }
  });

  // ---------------------------------------------------------------
  // MES COMMANDES
  // ---------------------------------------------------------------
  document.getElementById("btn-lookup").addEventListener("click", async () => {
    const tel = document.getElementById("lookup-tel").value.trim();
    const container = document.getElementById("mes-commandes-liste");
    if (!tel) {
      toast("Entrez votre numéro de téléphone.");
      return;
    }
    container.innerHTML = '<p style="text-align:center;">Recherche en cours...</p>';
    try {
      const orders = await CultureStore.lookupOrders(tel);
      if (!orders.length) {
        container.innerHTML = '<p style="text-align:center;">Aucune commande trouvée pour ce numéro.</p>';
        return;
      }
      container.innerHTML = "";
      orders.forEach((o) => {
        const date = new Date(o.created_at).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const el = document.createElement("div");
        el.className = "order-result";
        el.innerHTML = `
          <div class="row1">
            <strong>${o.numero}</strong>
            <span class="statut">${escapeHtml(o.statut)}</span>
          </div>
          <p style="margin:8px 0 0; font-size:.86rem;">${date} — ${escapeHtml(o.commune)} — ${money(o.total_fc)}</p>
        `;
        container.appendChild(el);
      });
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p style="text-align:center;">Impossible de récupérer vos commandes pour le moment.</p>';
    }
  });

  // ---------------------------------------------------------------
  // CONTACT / RÉGLAGES DU SITE
  // ---------------------------------------------------------------
  function applySettings() {
    const s = (key, fallback) => CultureStore.getSetting(key, fallback);

    document.getElementById("nom-entreprise").textContent = s("nom_entreprise", "Culture Market");
    document.getElementById("slogan").textContent = s("slogan", "Le marché vient à vous");
    document.getElementById("presentation-text").textContent = s(
      "description_accueil",
      "Culture est une entreprise agri-marketing qui cultive et distribue des produits frais, sains et locaux."
    );

    document.getElementById("home-ville").textContent = s("ville", "Lubumbashi");
    document.getElementById("home-horaires").textContent = s("horaires_livraison", "Lun. — Sam. | 9h — 11h");
    document.getElementById("cc-ville").textContent = s("ville", "Lubumbashi");
    document.getElementById("cc-horaires").textContent = "du lundi au samedi, de 9h à 11h";

    const min = money(CultureStore.minOrder());
    document.getElementById("home-min").textContent = min;
    document.getElementById("cc-min").textContent = min;

    document.getElementById("contact-responsable").textContent =
      `${s("responsable_nom", "—")} — ${s("responsable_role", "")}`;

    const tel = s("telephone_contact", "");
    const telEl = document.getElementById("contact-tel");
    telEl.textContent = tel || "À compléter";
    telEl.href = tel ? `tel:${tel.replace(/\s/g, "")}` : "#";

    const email = s("email_contact", "");
    const emailEl = document.getElementById("contact-email");
    emailEl.textContent = email || "À compléter";
    emailEl.href = email ? `mailto:${email}` : "#";

    const whatsapp = s("whatsapp_contact", window.CULTURE_CONFIG.WHATSAPP_FALLBACK);
    document.getElementById("contact-whatsapp").href = `https://wa.me/${whatsapp.replace(/\D/g, "")}`;

    document.getElementById("adresse-texte").textContent = s("adresse_texte", "Lubumbashi, RDC");
    const mapsUrl = s("google_maps_url", "");
    document.getElementById("btn-maps").href = mapsUrl && !mapsUrl.includes("COMPLÉTER") ? mapsUrl : "#";

    const socialRow = document.getElementById("social-row");
    socialRow.innerHTML = "";
    [
      ["facebook_url", "Facebook"],
      ["instagram_url", "Instagram"],
      ["tiktok_url", "TikTok"],
    ].forEach(([key, label]) => {
      const url = s(key, "");
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = label;
        socialRow.appendChild(a);
      }
    });
  }

  // ---------------------------------------------------------------
  // INSTALLATION PWA
  // ---------------------------------------------------------------
  let deferredPrompt = null;
  const installBtn = document.getElementById("btn-install");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.add("show");
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.remove("show");
  });

  window.addEventListener("appinstalled", () => {
    installBtn.classList.remove("show");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.warn("Service worker non enregistré :", err);
      });
    });
  }

  // ---------------------------------------------------------------
  // DÉMARRAGE
  // ---------------------------------------------------------------
  async function init() {
    if (!window.CULTURE_SUPABASE_READY) {
      toast("Configuration Supabase manquante — voir js/config.js");
    }
    try {
      await CultureStore.loadCatalog();
    } catch (err) {
      console.error(err);
      toast("Impossible de charger le catalogue. Vérifiez la configuration Supabase.");
    }
    renderCategoryRow();
    renderProducts();
    applySettings();
    refreshCartBar();
  }

  init();
})();
