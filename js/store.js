/**
 * CULTURE MARKET — Store
 * Couche de données : lecture du catalogue Supabase + gestion du panier
 * (le panier est conservé dans localStorage tant que la commande n'est
 * pas validée).
 */
const CultureStore = (function () {
  const CART_KEY = "culture_market_cart_v1";

  let cache = {
    categories: [],
    products: [],
    zones: [],
    paymentMethods: [],
    settings: {},
  };

  function sb() {
    if (!window.supabaseClient) {
      throw new Error("Supabase non configuré");
    }
    return window.supabaseClient;
  }

  // ---------------------------------------------------------------
  // CATALOGUE
  // ---------------------------------------------------------------
  async function loadCatalog() {
    if (!window.CULTURE_SUPABASE_READY) return cache;

    const [catRes, prodRes, zoneRes, payRes, setRes] = await Promise.all([
      sb().from("categories").select("*").order("ordre"),
      sb().from("products").select("*").eq("disponible", true).order("ordre"),
      sb().from("delivery_zones").select("*").eq("actif", true).order("ordre"),
      sb().from("payment_methods").select("*").eq("actif", true).order("ordre"),
      sb().from("site_settings").select("*"),
    ]);

    if (catRes.error) console.error(catRes.error);
    if (prodRes.error) console.error(prodRes.error);
    if (zoneRes.error) console.error(zoneRes.error);
    if (payRes.error) console.error(payRes.error);
    if (setRes.error) console.error(setRes.error);

    cache.categories = catRes.data || [];
    cache.products = prodRes.data || [];
    cache.zones = zoneRes.data || [];
    cache.paymentMethods = payRes.data || [];
    cache.settings = {};
    (setRes.data || []).forEach((row) => {
      cache.settings[row.cle] = row.valeur;
    });

    return cache;
  }

  function getSetting(key, fallback = "") {
    return cache.settings[key] || fallback;
  }

  function minOrder() {
    return parseFloat(getSetting("commande_minimum_fc", "22000")) || 0;
  }

  // ---------------------------------------------------------------
  // PANIER (localStorage)
  // ---------------------------------------------------------------
  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent("cart:changed"));
  }

  function setQty(productId, qty) {
    const cart = readCart();
    if (qty <= 0) {
      delete cart[productId];
    } else {
      cart[productId] = qty;
    }
    writeCart(cart);
  }

  function getQty(productId) {
    return readCart()[productId] || 0;
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    document.dispatchEvent(new CustomEvent("cart:changed"));
  }

  function cartLines() {
    const cart = readCart();
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = cache.products.find((p) => String(p.id) === String(id));
        if (!product) return null;
        return {
          product,
          qty,
          sousTotal: product.prix_fc * qty,
        };
      })
      .filter(Boolean);
  }

  function cartTotal() {
    return cartLines().reduce((sum, l) => sum + l.sousTotal, 0);
  }

  function cartCount() {
    return cartLines().reduce((sum, l) => sum + l.qty, 0);
  }

  // ---------------------------------------------------------------
  // COMMANDE
  // ---------------------------------------------------------------
  async function submitOrder({ nom, telephone, commune, adresse, mode, moyenPaiement }) {
    const lines = cartLines();
    if (!lines.length) throw new Error("Panier vide");

    // La commande est créée par une fonction serveur sécurisée (create_order) :
    // les prix, les frais de livraison et le minimum sont recalculés côté serveur.
    const { data, error } = await sb().rpc("create_order", {
      p_nom: nom,
      p_telephone: cleanPhone(telephone),
      p_commune: commune,
      p_adresse: adresse,
      p_mode: mode,
      p_moyen_paiement: moyenPaiement || "",
      p_items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Réponse vide du serveur");

    clearCart();
    return { numero: row.order_numero, total_fc: row.order_total };
  }

  function cleanPhone(t) {
    return String(t || "").replace(/\s+/g, "");
  }

  async function lookupOrders(telephone) {
    const { data, error } = await sb().rpc("get_orders_by_phone", {
      p_telephone: cleanPhone(telephone),
    });
    if (error) throw error;
    return data || [];
  }

  async function lookupOrderItems(numero, telephone) {
    const { data, error } = await sb().rpc("get_order_items", {
      p_numero: numero,
      p_telephone: cleanPhone(telephone),
    });
    if (error) throw error;
    return data || [];
  }

  return {
    loadCatalog,
    getSetting,
    minOrder,
    get categories() {
      return cache.categories;
    },
    get products() {
      return cache.products;
    },
    get zones() {
      return cache.zones;
    },
    get paymentMethods() {
      return cache.paymentMethods;
    },
    setQty,
    getQty,
    clearCart,
    cartLines,
    cartTotal,
    cartCount,
    submitOrder,
    lookupOrders,
    lookupOrderItems,
  };
})();
