/* Tienda: lee los productos de Supabase (o muestra ejemplos si aún no lo conectas).
   Cada foto tiene un código (#001), una marca y una o varias tallas.
   Maneja filtros, grupos por marca, pedido y envío por WhatsApp. */
const C = window.CATALOGO || {};
const CONFIG = {
  brand: C.brand || "Catálogo",
  hero: C.hero || "Catálogo",
  tagline: C.tagline || "",
  whatsapp: C.whatsapp || "",
  whatsappLabel: C.whatsappLabel || "",
  currency: C.currency || "Q",
  ticker: Array.isArray(C.ticker) ? C.ticker : []
};
const configured = !!(C.supabaseUrl && C.supabaseKey && !/TU-PROYECTO/.test(C.supabaseUrl) && !/TU_CLAVE/.test(C.supabaseKey));
/* Abre la conexión con Supabase desde el inicio para que las fotos lleguen antes */
if (configured) {
  try {
    const o = new URL(C.supabaseUrl).origin;
    [false, true].forEach(cors => { const l = document.createElement("link"); l.rel = "preconnect"; l.href = o; if (cors) l.crossOrigin = "anonymous"; document.head.appendChild(l); });
  } catch (e) {}
}
const SIZE_ORDER =["XS", "S", "M", "L", "XL", "XXL"];
const PALETTE = ["#1F3A5F", "#2B2B2B", "#7A1F2B", "#2E6B4F", "#3C5A8A", "#B5483A", "#8E8E8E", "#C9A227"];
/* Productos de ejemplo: se usan solo mientras no conectes Supabase. [código, marca, tallas, precio, disponible] */
const DEMO = [
  ["#001", "Náutica", ["S", "M", "L", "XL"], 85, 1], ["#002", "Náutica", ["M", "L", "XL"], 85, 1],
  ["#003", "Náutica", ["S", "M"], 95, 0], ["#004", "Norte", ["S", "M", "L"], 77, 1],
  ["#005", "Norte", ["L", "XL"], 77, 1], ["#006", "Atlas", ["S", "M", "L", "XL"], 70, 1],
  ["#007", "Atlas", ["M", "L"], 70, 1], ["#008", "Volta", ["S", "L", "XL"], 90, 1],
  ["#009", "Kiru", ["M", "L", "XL"], 95, 1], ["#010", "Kiru", ["S", "M"], 95, 1]
];

/* ===== Utilidades ===== */
const $ = s => document.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
/* Cada foto aparece con un fundido cuando termina de cargar (antes se ve una silueta) */
const loaded = e => { const t = e.target; if (t.tagName === "IMG") t.classList.add("ld"); };
document.addEventListener("load", loaded, true);
document.addEventListener("error", loaded, true);
const markLoaded = root => root.querySelectorAll("img").forEach(i => { if (i.complete) i.classList.add("ld"); });
const money = n => CONFIG.currency + " " + n.toLocaleString("es-GT", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const two = n => String(n).padStart(2, "0");
const sizeIdx = s => { const i = SIZE_ORDER.indexOf(s); return i < 0 ? 99 : i; };
const byCodeOrder = (a, b) => a.code.localeCompare(b.code, "es", { numeric: true });
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function hashColor(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
function luminance(hex) { const h = hex.replace("#", ""); const c = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function mk(id, code, marca, sizes, price, foto, stock, fotos, tipo, antes) {
  const m = String(marca || "").trim(), pr = Number(price), bf = Number(antes);
  return {
    id: String(id), code: String(code), tipo: tipo === "gorra" ? "gorra" : "playera", marca: m, bk: norm(m),
    sizes: [...new Set(sizes || [])].sort((a, b) => sizeIdx(a) - sizeIdx(b) || a.localeCompare(b)),
    price: pr, before: bf > pr ? bf : 0, foto: foto || "", fotos: (Array.isArray(fotos) && fotos.length ? fotos : (foto ? [foto] : [])).filter(Boolean), stock: !!stock, color: hashColor(norm(m))
  };
}
/* Código sin "#" para el enlace directo (?p=015) */
const slug = code => String(code).replace(/^#/, "");
/* Enlaces con el dominio de la tienda (el de <link rel="canonical">), aunque se abra desde otra dirección */
const siteBase = (() => { const l = document.querySelector('link[rel="canonical"]'); return l ? l.href : location.origin + location.pathname.replace(/index\.html$/, ""); })();
const productUrl = (p, f) => siteBase + "?p=" + encodeURIComponent(slug(p.code)) + (p.fotos.length > 1 && Number(f) > 0 ? "&f=" + (Number(f) + 1) : "");
let NEWEST = new Set();            // códigos de los productos más recientes (etiqueta "Nuevo")
const off = p => p.before ? Math.round((1 - p.price / p.before) * 100) : 0;
/* Etiquetas sobre la foto: Oferta, Nuevo, Gorra */
function tags(p) {
  let h = "";
  if (p.before) h += '<span class="tg sale">Oferta −' + off(p) + "%</span>";
  if (NEWEST.has(p.code)) h += '<span class="tg new">Nuevo</span>';
  if (p.tipo === "gorra") h += '<span class="tg">Gorra</span>';
  if (multi(p)) h += '<span class="tg">' + p.fotos.length + " fotos</span>";
  return h ? '<div class="tags">' + h + "</div>" : "";
}
const priceHtml = p => (p.before ? '<s class="was">' + money(p.before) + "</s>" : "") + "<span>" + money(p.price) + "</span>";
const notifyUrl = p => waUrl("Hola, me interesa " + (p.tipo === "gorra" ? "la gorra " : "la playera ") + p.marca + " " + p.code + ". ¿Me avisas cuando vuelva a estar disponible?");
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("on"), 2600);
}
/* Si el producto tiene varias fotos, el cliente elige una (por ejemplo, un color) y se guarda en el pedido */
const multi = p => p.fotos.length > 1;
const fotoIdx = (p, f) => { const i = Number(f) || 0; return i >= 0 && i < p.fotos.length ? i : 0; };
const fotoOf = (p, f) => p.fotos[fotoIdx(p, f)] || p.foto || "";
const keyOf = (p, size, f) => p.code + "|" + size + (multi(p) ? "|" + fotoIdx(p, f) : "");
const fullName = (p, size, f) => (p.tipo === "gorra" ? p.marca + " (gorra)" : p.marca + " talla " + size) + (multi(p) ? " · foto " + (fotoIdx(p, f) + 1) : "");
/* Foto real si existe; si no, una playera dibujada del color de la marca */
const ink2 = p => luminance(p.color) > .55 ? "#1b1b1b" : "#ffffff";
function pic(p, cls) {
  const c = cls === undefined ? "shirt" : cls;
  if (p.foto) return '<img class="' + c + ' photo" src="' + esc(p.foto) + '" alt="' + esc(p.marca + " " + p.code) + '" loading="lazy" decoding="async">';
  const ink = luminance(p.color) > .55 ? "#1b1b1b" : "#ffffff";
  if (p.tipo === "gorra") {
    return '<svg class="' + c + '" viewBox="0 0 120 120" role="img" aria-label="Gorra">'
      + '<path d="M20 78 C20 40 44 24 66 24 C88 24 104 44 104 78 Z" fill="' + p.color + '" stroke="#0A0A0A" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<path d="M16 78 C40 70 80 70 112 86 C112 94 100 96 88 92 C60 84 36 84 16 86 Z" fill="' + p.color + '" stroke="#0A0A0A" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<circle cx="66" cy="24" r="4" fill="' + ink2(p) + '" stroke="#0A0A0A" stroke-width="2"/>'
      + '<text x="62" y="62" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" font-weight="500" fill="' + ink2(p) + '" fill-opacity=".9">' + esc(p.code) + '</text></svg>';
  }
  return '<svg class="' + c + '" viewBox="0 0 120 120" role="img" aria-label="Playera">'
    + '<path d="M42 10 L18 24 L6 48 L26 56 L32 46 L32 108 L88 108 L88 46 L94 56 L114 48 L102 24 L78 10 C74 22 46 22 42 10 Z" fill="' + p.color + '" stroke="#0A0A0A" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<path d="M44 12 C48 24 72 24 76 12" fill="none" stroke="' + ink + '" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>'
    + '<text x="60" y="92" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" font-weight="500" fill="' + ink + '" fill-opacity=".9">' + esc(p.code) + '</text></svg>';
}

/* Íconos dibujados (trazo de 2px), en lugar de símbolos de texto */
const ICO = {
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>'
};

/* Galería de la tarjeta: varias fotos que se deslizan, con flechas y puntos */
function gal(p) {
  if (!p.fotos || p.fotos.length < 2) return pic(p);
  const imgs = p.fotos.map((u, i) => '<img class="photo" src="' + esc(u) + '" alt="' + esc(p.marca + " " + p.code + " foto " + (i + 1)) + '" loading="lazy" decoding="async">').join("");
  const dots = p.fotos.map((_, i) => '<i' + (i === 0 ? ' class="on"' : "") + "></i>").join("");
  return '<div class="gal">' + imgs + "</div>"
    + '<button type="button" class="gp" data-d="-1" aria-label="Foto anterior">' + ICO.prev + '</button>'
    + '<button type="button" class="gn" data-d="1" aria-label="Foto siguiente">' + ICO.next + '</button>'
    + '<div class="dots">' + dots + "</div>";
}

/* ===== Estado ===== */
let PRODUCTS = [];
let SIZES = [];
const GORRA = "__gorra";
let BRANDS = new Map();            // clave sin acentos -> nombre a mostrar
const state = { size: "", brand: "", only: false, sort: "", q: "" };
let pick = {};                     // código -> talla elegida en la tarjeta
let cart = {};                     // "código|talla" -> cantidad
let customer = { name: "", phone: "", dep: "", mun: "", addr: "", note: "" };
try { const s = localStorage.getItem("catalogo-cart-v2"); if (s) cart = JSON.parse(s) || {}; } catch (e) {}
try { const s = localStorage.getItem("catalogo-cliente"); if (s) customer = Object.assign(customer, JSON.parse(s) || {}); } catch (e) {}
function saveCart() { try { localStorage.setItem("catalogo-cart-v2", JSON.stringify(cart)); } catch (e) {} }
function saveCustomer() { try { localStorage.setItem("catalogo-cliente", JSON.stringify(customer)); } catch (e) {} }

/* ===== Textos fijos ===== */
$("#brandName").textContent = CONFIG.brand;
if ($("#kicker")) $("#kicker").textContent = "Catálogo · " + new Date().getFullYear();
$("#hero").textContent = CONFIG.hero;
$("#tagline").textContent = CONFIG.tagline;
(function () {
  var C = window.CATALOGO || {};
  [["#lnkTiktok", C.tiktok], ["#lnkFacebook", C.facebook]].forEach(function (x) {
    var a = $(x[0]); if (!a) return;
    if (x[1]) a.href = x[1]; else a.hidden = true;
  });
})();
$("#footBrand").textContent = CONFIG.brand;
$("#yr").textContent = new Date().getFullYear();
document.title = CONFIG.brand;
function waUrl(text) { return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(text); }
(function () {
  const list = Array.isArray(C.contactos) && C.contactos.length ? C.contactos : [{ label: CONFIG.whatsappLabel, whatsapp: CONFIG.whatsapp }];
  const ico = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="round"><path d="M4 20l1.5-4.2A8 8 0 1 1 8.2 18.6z"/></svg>';
  $("#was").innerHTML = list.map(n =>
    '<a class="wa" href="https://wa.me/' + esc(n.whatsapp) + "?text=" + encodeURIComponent("Hola, vi tu catálogo y quería consultar algo.") + '" target="_blank" rel="noopener">'
    + ico + "<span><small>WhatsApp</small>" + esc(n.label) + "</span></a>").join("");
})();
if (CONFIG.ticker.length) {
  const items = CONFIG.ticker.map(t => "<span>" + esc(t) + "</span>").join("");
  $("#ticker").innerHTML = '<div class="track">' + items + "</div>";
}

/* ===== Carga de productos ===== */
function finish() {
  SIZES = [...new Set(PRODUCTS.filter(p => p.tipo !== "gorra").flatMap(p => p.sizes))].sort((a, b) => sizeIdx(a) - sizeIdx(b) || a.localeCompare(b));
  BRANDS = new Map();
  PRODUCTS.slice().sort(byCodeOrder).forEach(p => { if (p.bk && !BRANDS.has(p.bk)) BRANDS.set(p.bk, p.marca); });
  if (state.size && state.size !== GORRA && !SIZES.includes(state.size)) state.size = "";
  if (state.brand && !BRANDS.has(state.brand)) state.brand = "";
  const nNew = Number.isFinite(C.nuevos) ? C.nuevos : 6;
  NEWEST = new Set(PRODUCTS.filter(p => p.stock).sort((a, b) => Number(b.id) - Number(a.id)).slice(0, nNew).map(p => p.code));
  renderBrands(); renderCats(); render(); renderCart(); renderHero(); openFromUrl();
}
/* Botones de marca: filtran el catálogo por marca */
function renderBrands() {
  const opts = [...BRANDS.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  const n = k => PRODUCTS.filter(p => p.bk === k).length;
  $("#brands").innerHTML = opts.length < 2 ? "" : '<button type="button" class="bch" data-b="" aria-pressed="' + (state.brand === "" ? "true" : "false") + '">Todas las marcas</button>'
    + opts.map(([k, v]) => '<button type="button" class="bch" data-b="' + esc(k) + '" aria-pressed="' + (state.brand === k ? "true" : "false") + '">' + esc(v) + "<sup>" + n(k) + "</sup></button>").join("");
}
$("#brands").addEventListener("click", e => {
  const b = e.target.closest(".bch"); if (!b) return;
  state.brand = state.brand === b.dataset.b ? "" : b.dataset.b;
  renderBrands(); render();
});
/* Portada: mosaico con fotos de los productos más recientes */
function renderHero() {
  const list = PRODUCTS.filter(p => p.stock && p.foto).sort((a, b) => Number(b.id) - Number(a.id));
  const seen = new Set(), pickList = [];
  list.forEach(p => { if (pickList.length < 4 && !seen.has(p.bk)) { seen.add(p.bk); pickList.push(p); } });
  list.forEach(p => { if (pickList.length < 4 && !pickList.includes(p)) pickList.push(p); });
  $("#heroPics").innerHTML = pickList.length < 3 ? "" : pickList.slice(0, 4).map(p =>
    '<a class="hp" href="?p=' + encodeURIComponent(slug(p.code)) + '" data-code="' + esc(p.code) + '"><img class="photo" src="' + esc(p.foto) + '" alt="' + esc(p.marca + " " + p.code) + '" decoding="async"><span>' + esc(p.marca) + "</span></a>").join("");
  $(".hero").classList.toggle("has-pics", pickList.length >= 3);
  markLoaded($("#heroPics"));
}
$("#heroPics").addEventListener("click", e => {
  const a = e.target.closest(".hp"); if (!a) return;
  e.preventDefault(); openDetail(a.dataset.code);
});
async function load() {
  $("#grid").innerHTML = '<div class="skel"></div>'.repeat(6);
  $("#count").textContent = "Cargando…";
  if (!configured) {
    PRODUCTS = DEMO.map((r, i) => mk(i + 1, r[0], r[1], r[2], r[3], "", r[4]));
    $("#notice").hidden = false;
    finish();
    return;
  }
  try {
    const url = C.supabaseUrl.replace(/\/$/, "") + "/rest/v1/productos?select=id,codigo,marca,tallas,precio,*&order=id.desc";
    const r = await fetch(url, { headers: { apikey: C.supabaseKey }, cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const rows = await r.json();
    PRODUCTS = rows.filter(x => Array.isArray(x.tallas) && x.tallas.length)
      .map(x => mk(x.id, x.codigo, x.marca, x.tallas, x.precio, x.foto_url, x.disponible, x.fotos, x.tipo, x.precio_antes));
  } catch (e) {
    console.warn("No se pudieron cargar los productos:", e);
    $("#grid").innerHTML = '<div class="empty">No se pudieron cargar los productos.<br>Revisa tu conexión e inténtalo de nuevo.<br><button type="button" id="retry">Reintentar</button></div>';
    $("#retry").onclick = load;
    $("#count").textContent = "";
    return;
  }
  finish();
}

/* ===== Índice de tallas y filtros ===== */
function renderCats() {
  let h = '<button type="button" class="size" data-size="" aria-pressed="' + (state.size === "" ? "true" : "false") + '">Todo<sup>' + two(PRODUCTS.length) + '</sup><small>Ver todo</small></button>';
  /* Gorras va justo después de "Todo" para que se vea aunque el índice no quepa completo */
  const g = PRODUCTS.filter(p => p.tipo === "gorra").length;
  if (g) h += '<button type="button" class="size" data-size="' + GORRA + '" aria-pressed="' + (state.size === GORRA ? "true" : "false") + '">Gorras<sup>' + two(g) + '</sup><small>Categoría</small></button>';
  SIZES.forEach(s => {
    const n = PRODUCTS.filter(p => p.tipo !== "gorra" && p.sizes.includes(s)).length;
    h += '<button type="button" class="size" data-size="' + esc(s) + '" aria-pressed="' + (state.size === s ? "true" : "false") + '">' + esc(s) + "<sup>" + two(n) + '</sup><small>Talla</small></button>';
  });
  $("#cats").innerHTML = h;
  catsMore();
}
/* Difumina el borde derecho mientras queden opciones por deslizar */
function catsMore() {
  const s = $("#cats");
  s.classList.toggle("more", s.scrollLeft + s.clientWidth < s.scrollWidth - 4);
}
$("#cats").addEventListener("scroll", catsMore, { passive: true });
addEventListener("resize", catsMore);
$("#cats").addEventListener("click", e => {
  const b = e.target.closest(".size"); if (!b) return;
  state.size = b.dataset.size; pick = {}; renderCats(); render();
});
function setOnly(v) { state.only = v; $("#avAll").setAttribute("aria-pressed", String(!v)); $("#avYes").setAttribute("aria-pressed", String(v)); render(); }
$("#avAll").onclick = () => setOnly(false);
$("#avYes").onclick = () => setOnly(true);
$("#sort").onchange = e => { state.sort = e.target.value; render(); };
$("#q").oninput = e => { state.q = e.target.value.trim().toLowerCase(); render(); };

function visible() {
  let list = PRODUCTS.filter(p =>
    (!state.size || (state.size === GORRA ? p.tipo === "gorra" : (p.tipo !== "gorra" && p.sizes.includes(state.size)))) && (!state.brand || p.bk === state.brand) &&
    (!state.only || p.stock) &&
    (!state.q || (p.marca + " " + p.code + " " + (p.tipo === "gorra" ? "gorra gorras" : p.sizes.join(" "))).toLowerCase().includes(state.q)));
  if (state.sort === "asc") list.sort((a, b) => a.price - b.price);
  else if (state.sort === "desc") list.sort((a, b) => b.price - a.price);
  else if (state.sort === "new") list.sort((a, b) => Number(b.id) - Number(a.id));
  else list.sort((a, b) => (BRANDS.get(a.bk) || "").localeCompare(BRANDS.get(b.bk) || "", "es") || byCodeOrder(a, b));
  return list;
}
function selSize(p) {
  const k = pick[p.code];
  if (k && p.sizes.includes(k)) return k;
  if (state.size && state.size !== GORRA && p.sizes.includes(state.size)) return state.size;
  return p.sizes[0];
}
function render() {
  if (!PRODUCTS.length) {
    $("#count").textContent = "0 productos";
    $("#grid").innerHTML = '<div class="empty">Todavía no hay productos en el catálogo.<br>Vuelve pronto.</div>';
    return;
  }
  const list = visible();
  const ctx = [state.size === GORRA ? "Gorras" : (state.size ? "Talla " + state.size : ""), state.brand ? BRANDS.get(state.brand) : ""].filter(Boolean).join(" · ");
  $("#count").textContent = (ctx ? ctx + " — " : "") + list.length + (list.length === 1 ? " producto" : " productos");
  if (!list.length) {
    $("#grid").innerHTML = '<div class="empty">No hay productos con esos filtros.<br><button type="button" id="reset">Quitar filtros</button></div>';
    $("#reset").onclick = () => { state.size = ""; state.brand = ""; state.q = ""; $("#q").value = ""; setOnly(false); renderCats(); renderBrands(); };
    return;
  }
  const grouped = state.sort === "";
  const counts = {};
  list.forEach(p => { counts[p.bk] = (counts[p.bk] || 0) + 1; });
  let html = "", last = null;
  list.forEach((p, i) => {
    if (grouped && p.bk !== last) {
      last = p.bk;
      html += '<div class="grp"><h2>' + esc(BRANDS.get(p.bk) || p.marca) + "</h2><span>" + two(counts[p.bk]) + (counts[p.bk] === 1 ? " modelo" : " modelos") + "</span></div>";
    }
    const sel = selSize(p);
    html += '<article class="card' + (p.stock ? "" : " off") + '" data-code="' + esc(p.code) + '" style="--i:' + Math.min(i, 14) + '"><div class="hang">'
      + '<div class="pic" data-open="1">' + gal(p) + tags(p) + '<span class="st' + (p.stock ? "" : " off") + '">' + (p.stock ? "Disponible" : "Agotado") + "</span></div>"
      + '<div class="info"><h3 class="nm"><a href="?p=' + encodeURIComponent(slug(p.code)) + '" data-open="1">' + esc(p.marca) + '</a></h3><div class="meta"><span>' + esc(p.code) + "</span></div>"
      + (p.tipo === "gorra" ? '<div class="sz"><span class="uni">Gorra · talla única</span></div><div hidden>' : '<div class="sz" role="group" aria-label="Elegir talla">')
      + p.sizes.map(s => '<button type="button" class="szb" data-size="' + esc(s) + '" aria-pressed="' + (s === sel ? "true" : "false") + '"' + (p.stock ? "" : " disabled") + ">" + esc(s) + "</button>").join("")
      + "</div></div>"
      + '<div class="buy"><span class="price' + (p.before ? " sale" : "") + '">' + priceHtml(p) + "</span>"
      + (p.stock
        ? '<button class="add" type="button" data-code="' + esc(p.code) + '" data-size="' + esc(sel) + '">Agregar</button>'
        : '<a class="add notify" href="' + esc(notifyUrl(p)) + '" target="_blank" rel="noopener">Avísame</a>') + "</div>"
      + "</div></article>";
  });
  $("#grid").innerHTML = html;
  /* Las primeras tarjetas cargan su foto de inmediato y con prioridad */
  [...$("#grid").querySelectorAll(".card")].slice(0, 4).forEach(c => {
    const im = c.querySelector("img.photo");
    if (im) { im.loading = "eager"; im.fetchPriority = "high"; }
  });
  markLoaded($("#grid"));
}

/* ===== Animación al agregar ===== */
function pulse() {
  const n = $("#cartN"), b = $("#cartBtn");
  n.classList.remove("pop"); b.classList.remove("bump");
  void n.offsetWidth;
  n.classList.add("pop"); b.classList.add("bump");
}
function fly(card) {
  const box = card.querySelector(".pic"), el = card.querySelector(".shirt");
  if (reduce || !box || !el || !el.animate) { pulse(); return; }
  const r = box.getBoundingClientRect(), c = $("#cartBtn").getBoundingClientRect();
  const g = document.createElement("div"); g.className = "fly";
  g.innerHTML = el.outerHTML;
  const sx = r.left + r.width / 2 - 34, sy = r.top + r.height / 2 - 34;
  g.style.left = sx + "px"; g.style.top = sy + "px";
  document.body.appendChild(g);
  const dx = c.left + c.width / 2 - 34 - sx, dy = c.top + c.height / 2 - 34 - sy;
  const a = g.animate([
    { transform: "translate(0,0) scale(1.4) rotate(0deg)", opacity: 1 },
    { transform: "translate(" + dx * .55 + "px," + (dy * .55 - 70) + "px) scale(1) rotate(-8deg)", opacity: 1, offset: .5 },
    { transform: "translate(" + dx + "px," + dy + "px) scale(.25) rotate(6deg)", opacity: .3 }
  ], { duration: 720, easing: "cubic-bezier(.45,0,.25,1)" });
  a.onfinish = () => { g.remove(); pulse(); };
  a.oncancel = () => g.remove();
}
$("#grid").addEventListener("click", e => {
  const arrow = e.target.closest(".gp,.gn");
  if (arrow) {
    const g = arrow.closest(".pic").querySelector(".gal");
    g.scrollBy({ left: Number(arrow.dataset.d) * g.clientWidth, behavior: "smooth" });
    return;
  }
  const sb = e.target.closest(".szb");
  if (sb && !sb.disabled) {
    const card = sb.closest(".card"), code = card.dataset.code;
    pick[code] = sb.dataset.size;
    card.querySelectorAll(".szb").forEach(x => x.setAttribute("aria-pressed", String(x === sb)));
    card.querySelector(".add").dataset.size = sb.dataset.size;
    return;
  }
  if (e.target.closest(".notify")) return;
  const b = e.target.closest("button.add");
  if (!b) {
    const o = e.target.closest("[data-open]");
    if (o) { e.preventDefault(); openDetail(o.closest(".card").dataset.code); }
    return;
  }
  if (b.disabled) return;
  const card = b.closest(".card"), cp = byCode(b.dataset.code);
  add(keyOf(cp, b.dataset.size, card.dataset.f), 1);
  fly(card);
  const old = b.textContent; b.textContent = "Agregado · " + b.dataset.size; b.classList.add("done");
  setTimeout(() => { b.textContent = old; b.classList.remove("done"); }, 1100);
});

/* ===== Pedido (carrito) ===== */
const byCode = c => PRODUCTS.find(p => p.code === c);
function parseKey(k) { const [code, size, f] = k.split("|"); return { code, size, f: Number(f) || 0 }; }
const thumb = (p, f) => fotoOf(p, f) ? '<img class="photo" src="' + esc(fotoOf(p, f)) + '" alt="" loading="lazy" decoding="async">' : pic(p, "");
function totals() {
  const keys = Object.keys(cart).filter(k => { const { code, size } = parseKey(k); const p = byCode(code); return p && p.sizes.includes(size); });
  return {
    keys,
    count: keys.reduce((s, k) => s + cart[k], 0),
    total: keys.reduce((s, k) => s + cart[k] * byCode(parseKey(k).code).price, 0)
  };
}
function add(key, d) {
  cart[key] = (cart[key] || 0) + d;
  if (cart[key] <= 0) delete cart[key];
  saveCart(); renderCart();
}
function renderCart() {
  const t = totals();
  $("#cartN").textContent = t.count;
  $("#total").textContent = money(t.total);
  $("#total2").textContent = money(t.total);
  $("#dockN").textContent = t.count + (t.count === 1 ? " producto" : " productos");
  $("#dockT").textContent = money(t.total);
  $("#dock").classList.toggle("on", t.count > 0 && !$("#drawer").classList.contains("on"));
  $("#toForm").disabled = t.count === 0;
  $("#lines").innerHTML = t.keys.length ? t.keys.map(k => {
    const { code, size, f } = parseKey(k), p = byCode(code);
    return '<div class="line"><div class="th">' + thumb(p, f) + '</div><div class="t"><b>' + esc(fullName(p, size, f)) + "</b><span>" + esc(code) + " · " + money(p.price) + "</span>"
      + '<div class="qty"><button type="button" data-d="-1" data-c="' + esc(k) + '" aria-label="Quitar uno">' + ICO.minus + '</button><output>' + cart[k] + '</output><button type="button" data-d="1" data-c="' + esc(k) + '" aria-label="Agregar uno">' + ICO.plus + '</button></div></div>'
      + '<div class="sub">' + money(cart[k] * p.price) + "</div></div>";
  }).join("") : '<div class="none">Tu pedido está vacío.<br>Agrega productos desde el catálogo.</div>';
}
$("#lines").addEventListener("click", e => {
  const b = e.target.closest("button[data-c]"); if (!b) return;
  add(b.dataset.c, Number(b.dataset.d));
});
$("#clear").onclick = () => { cart = {}; saveCart(); renderCart(); };

/* ===== Panel por pasos ===== */
let step = "cart";
const TITLES = { cart: "Tu pedido", form: "Tus datos", send: "Enviar" };
const ORDER = ["cart", "form", "send"];
function show(v) {
  step = v;
  ORDER.forEach((x, i) => { $("#v-" + x).hidden = x !== v; $("#s" + (i + 1)).classList.toggle("on", x === v); });
  $("#dTitle").textContent = TITLES[v];
  $("#backBtn").hidden = v === "cart";
}
function openCart(v) {
  $("#drawer").classList.toggle("on", v); $("#scrim").classList.toggle("on", v);
  $("#drawer").setAttribute("aria-hidden", String(!v));
  if (v) show("cart");
  renderCart();
}
$("#cartBtn").onclick = () => openCart(true);
$("#dockBtn").onclick = () => openCart(true);
$("#closeCart").onclick = () => openCart(false);
$("#scrim").onclick = () => openCart(false);
$("#backBtn").onclick = () => show(step === "send" ? "form" : "cart");
document.addEventListener("keydown", e => { if (e.key === "Escape") openCart(false); });

/* Paso 2: datos */
const GT = window.GUATEMALA || {};
const DEPS = Object.keys(GT).sort((a, b) => a.localeCompare(b, "es"));
$("#fDep").innerHTML = '<option value="">Elige…</option>' + DEPS.map(d => '<option value="' + esc(d) + '">' + esc(d) + "</option>").join("");
function fillMun(dep, val) {
  const m = $("#fMun"), list = GT[dep] || [];
  m.innerHTML = list.length ? '<option value="">Elige…</option>' + list.map(x => '<option value="' + esc(x) + '">' + esc(x) + "</option>").join("") : '<option value="">Primero el departamento</option>';
  m.disabled = !list.length;
  m.value = list.includes(val) ? val : "";
}
$("#fDep").addEventListener("change", e => { fillMun(e.target.value, ""); setErr("#eDep", "#gDep", ""); if (e.target.value) $("#fMun").focus(); });
$("#fMun").addEventListener("change", () => setErr("#eMun", "#gMun", ""));
function fillForm() {
  $("#fName").value = customer.name; $("#fPhone").value = customer.phone;
  $("#fAddr").value = customer.addr; $("#fNote").value = customer.note;
  $("#fDep").value = GT[customer.dep] ? customer.dep : "";
  fillMun($("#fDep").value, customer.mun);
}
$("#toForm").onclick = () => { if (!totals().count) return; fillForm(); show("form"); };
function setErr(msgId, boxId, msg) { $(msgId).textContent = msg; $(boxId).classList.toggle("bad", !!msg); }
$("#form").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#fName").value.trim(), addr = $("#fAddr").value.trim(), dep = $("#fDep").value, mun = $("#fMun").value;
  setErr("#eName", "#gName", name ? "" : "Escribe tu nombre para identificar el pedido.");
  setErr("#eDep", "#gDep", dep ? "" : "Elige tu departamento.");
  setErr("#eMun", "#gMun", mun ? "" : "Elige tu municipio.");
  setErr("#eAddr", "#addrBox", addr ? "" : "Escribe la dirección para el envío.");
  if (!name) { $("#fName").focus(); return; }
  if (!dep) { $("#fDep").focus(); return; }
  if (!mun) { $("#fMun").focus(); return; }
  if (!addr) { $("#fAddr").focus(); return; }
  customer = { name, phone: $("#fPhone").value.trim(), dep, mun, addr, note: $("#fNote").value.trim() };
  saveCustomer(); buildSend(); show("send");
});

/* Paso 3: mensaje y enlace de WhatsApp */
/* Mensaje ordenado con el formato de WhatsApp: *negritas* y _cursivas_ */
const LINEA = "────────────────";
function orderMessage() {
  const t = totals();
  const items = t.keys.map((k, i) => {
    const { code, size, f } = parseKey(k), p = byCode(code);
    const det = [p.tipo === "gorra" ? "Gorra · talla única" : "Talla " + size];
    if (multi(p)) det.push("Foto " + (fotoIdx(p, f) + 1));
    det.push("Cantidad: " + cart[k]);
    return "*" + (i + 1) + ". " + p.marca.toUpperCase() + "*  " + code + "\n"
      + det.join(" · ") + "\n"
      + money(cart[k] * p.price) + (cart[k] > 1 ? "  _(" + money(p.price) + " c/u)_" : "") + "\n"
      + "Ver: " + productUrl(p, f);
  });
  const datos = ["Nombre: " + customer.name];
  if (customer.phone) datos.push("Teléfono: " + customer.phone);
  datos.push("Departamento: " + customer.dep, "Municipio: " + customer.mun, "Dirección: " + customer.addr);
  if (customer.note) datos.push("Notas: " + customer.note);
  return "Hola 👋 quiero hacer este pedido:\n\n"
    + "🛍️ *PEDIDO · " + CONFIG.brand.toUpperCase() + "*\n" + LINEA + "\n\n"
    + items.join("\n\n") + "\n\n" + LINEA + "\n"
    + "*TOTAL: " + money(t.total) + "*  (" + t.count + (t.count === 1 ? " producto" : " productos") + ")\n"
    + "_El costo del envío se confirma por aquí._\n\n"
    + "📍 *DATOS DE ENTREGA*\n" + datos.join("\n");
}
function buildSend() {
  const t = totals();
  $("#waGo").href = waUrl(orderMessage());
  const rows = [["Productos", t.count], ["Total", money(t.total)], ["Nombre", customer.name], ["Entrega", "Envío a domicilio"], ["Lugar", customer.mun + ", " + customer.dep], ["Dirección", customer.addr]];
  $("#recap").innerHTML = "";
  rows.forEach(r => {
    const d = document.createElement("div"); d.className = "r";
    const a = document.createElement("span"), b = document.createElement("span");
    a.textContent = r[0]; b.textContent = r[1]; d.append(a, b); $("#recap").appendChild(d);
  });
}
$("#editOrder").onclick = () => show("form");
$("#done").onclick = () => { cart = {}; saveCart(); renderCart(); openCart(false); };

/* ===== Ficha del producto (con enlace directo ?p=015) ===== */
let pdCode = null, pdSize = "", pdAt = 0, pdLast = null;
const findCode = c => { const s = norm(slug(c)); return PRODUCTS.find(p => norm(slug(p.code)) === s); };
function sizeGuide() {
  const g = C.guiaTallas;
  if (!g || !Array.isArray(g.filas) || !g.filas.length) return "";
  const cols = Array.isArray(g.columnas) ? g.columnas : ["Talla", "Ancho (cm)", "Largo (cm)"];
  return '<details class="guide"><summary>Guía de tallas</summary><table><thead><tr>' + cols.map(c => "<th>" + esc(c) + "</th>").join("") + "</tr></thead><tbody>"
    + g.filas.map(r => "<tr>" + r.map(c => "<td>" + esc(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table>"
    + (g.nota ? "<p>" + esc(g.nota) + "</p>" : "") + "</details>";
}
function pdMedia(p) {
  const fs = p.fotos.length ? p.fotos : [];
  $("#pdMain").innerHTML = fs.length ? '<img class="photo" src="' + esc(fs[pdAt]) + '" alt="' + esc(p.marca + " " + p.code) + '">' : pic(p);
  markLoaded($("#pdMain"));
  $("#pdTh").innerHTML = fs.length > 1 ? fs.map((u, i) => '<button type="button" data-i="' + i + '" aria-label="Foto ' + (i + 1) + '" aria-pressed="' + (i === pdAt) + '"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async"></button>').join("") : "";
}
function pdRender() {
  const p = byCode(pdCode); if (!p) return;
  pdMedia(p);
  const gorra = p.tipo === "gorra";
  $("#pdInfo").innerHTML = tags(p).replace('class="tags"', 'class="tags flow"')
    + '<h2 id="pdName">' + esc(p.marca) + "</h2>"
    + '<p class="pd-code">' + esc(p.code) + " · " + (gorra ? "Gorra" : "Playera") + "</p>"
    + '<p class="pd-price' + (p.before ? " sale" : "") + '">' + priceHtml(p) + "</p>"
    + '<p class="pd-st' + (p.stock ? "" : " off") + '">' + (p.stock ? "Disponible" : "Agotado por ahora") + "</p>"
    + (gorra ? '<p class="uni">Talla única</p>'
      : '<div class="pd-sz"><span class="lab">Talla</span><div class="sz" role="group" aria-label="Elegir talla">'
        + p.sizes.map(s => '<button type="button" class="szb" data-size="' + esc(s) + '" aria-pressed="' + (s === pdSize) + '"' + (p.stock ? "" : " disabled") + ">" + esc(s) + "</button>").join("") + "</div></div>")
    + (multi(p) ? '<div class="pd-pick"><span class="lab">Modelo</span><span>Foto ' + (pdAt + 1) + " de " + p.fotos.length + " · toca una miniatura para elegir</span></div>" : "")
    + (gorra ? "" : sizeGuide())
    + (p.stock ? '<button class="btn" type="button" id="pdAdd">Agregar al pedido</button>'
      : '<a class="btn blue" href="' + esc(notifyUrl(p)) + '" target="_blank" rel="noopener">Avísame cuando vuelva</a>')
    + '<div class="pd-share"><button class="btn ghost" type="button" id="pdShare">Compartir</button>'
    + '<a class="btn ghost" href="https://wa.me/?text=' + encodeURIComponent("Mira esta " + (gorra ? "gorra " : "playera ") + p.marca + " " + p.code + ": " + productUrl(p, pdAt)) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a></div>';
}
/* La dirección refleja el producto y la foto elegida (?p=022&f=3) */
function syncUrl() {
  const p = byCode(pdCode); if (!p) return;
  const u = new URL(location.href); u.searchParams.set("p", slug(p.code));
  if (multi(p) && pdAt > 0) u.searchParams.set("f", pdAt + 1); else u.searchParams.delete("f");
  history.replaceState(null, "", u.pathname + u.search);
}
function openDetail(code, fromUrl, f) {
  const p = findCode(code); if (!p) return;
  pdLast = fromUrl ? null : document.activeElement;
  const card = document.querySelector('.card[data-code="' + CSS.escape(p.code) + '"]');
  pdCode = p.code; pdAt = fotoIdx(p, f != null ? f : card && card.dataset.f); pdSize = selSize(p);
  pdRender();
  $("#pd").hidden = false; document.body.classList.add("lock");
  $("#pdX").focus({ preventScroll: true });
  syncUrl();
  document.title = p.marca + " " + p.code + " · " + CONFIG.brand;
}
function closeDetail() {
  if ($("#pd").hidden) return;
  $("#pd").hidden = true; document.body.classList.remove("lock"); pdCode = null;
  const u = new URL(location.href); u.searchParams.delete("p"); u.searchParams.delete("f");
  history.replaceState(null, "", u.pathname + u.search);
  document.title = CONFIG.brand;
  if (pdLast && pdLast.focus) pdLast.focus({ preventScroll: true });
}
function openFromUrl() {
  const q = new URLSearchParams(location.search), c = q.get("p"), f = Number(q.get("f"));
  if (c && findCode(c)) openDetail(c, true, f > 0 ? f - 1 : null);
}
$("#pdX").onclick = closeDetail;
$("#pdBg").onclick = closeDetail;
$("#pdTh").addEventListener("click", e => {
  const b = e.target.closest("button[data-i]"); if (!b) return;
  pdAt = Number(b.dataset.i); pdRender(); syncUrl();
});
$("#pdMain").addEventListener("click", e => {
  if (!e.target.closest("img.photo")) return;
  window.openLb(byCode(pdCode).fotos, pdAt);
});
$("#pdInfo").addEventListener("click", async e => {
  const p = byCode(pdCode); if (!p) return;
  const sb = e.target.closest(".szb");
  if (sb && !sb.disabled) { pdSize = sb.dataset.size; pick[p.code] = pdSize; pdRender(); return; }
  if (e.target.closest("#pdAdd")) {
    add(keyOf(p, pdSize, pdAt), 1); pulse();
    toast("Agregado: " + fullName(p, pdSize, pdAt));
    const c = document.querySelector('.card[data-code="' + CSS.escape(p.code) + '"]');
    if (c) { c.dataset.f = pdAt; const g = c.querySelector(".gal"); if (g) g.scrollTo({ left: pdAt * g.clientWidth }); c.querySelectorAll(".szb").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.size === pdSize))); const a = c.querySelector("button.add"); if (a) a.dataset.size = pdSize; }
    return;
  }
  if (e.target.closest("#pdShare")) {
    const url = productUrl(p, pdAt), title = p.marca + " " + p.code + " · " + CONFIG.brand;
    if (navigator.share) { try { await navigator.share({ title, text: title, url }); } catch (x) {} return; }
    try { await navigator.clipboard.writeText(url); toast("Enlace copiado"); }
    catch (x) { prompt("Copia el enlace:", url); }
  }
});
/* Escape cierra primero la ficha y después el pedido */
document.addEventListener("keydown", e => {
  if (e.key !== "Escape" || $("#pd").hidden || !$("#lb").hidden) return;
  e.stopImmediatePropagation(); closeDetail();
}, true);
$("#pd").addEventListener("keydown", e => {
  if (e.key !== "Tab") return;
  const f = [...$("#pd").querySelectorAll("button:not([disabled]),a[href],summary")].filter(x => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ===== Contacto ===== */
$("#brand").addEventListener("click", e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

renderCats(); renderCart(); load();

/* ===== Galería: puntos al deslizar ===== */
$("#grid").addEventListener("scroll", e => {
  const g = e.target; if (!g.classList || !g.classList.contains("gal")) return;
  const i = Math.round(g.scrollLeft / g.clientWidth);
  const card = g.closest(".card"); if (card) card.dataset.f = i;
  g.parentNode.querySelectorAll(".dots i").forEach((d, k) => d.classList.toggle("on", k === i));
}, true);

/* ===== Ampliar foto (con flechas si hay varias) ===== */
(function () {
  const lb = $("#lb"), img = $("#lbImg"), prev = $("#lbP"), next = $("#lbN"), cnt = $("#lbC");
  let list = [], at = 0;
  function show() {
    img.src = list[at]; prev.hidden = next.hidden = list.length < 2;
    cnt.hidden = list.length < 2; cnt.textContent = (at + 1) + " / " + list.length;
  }
  function step(d) { at = (at + d + list.length) % list.length; show(); }
  function close() { lb.hidden = true; img.src = ""; }
  /* Se abre desde la ficha del producto al tocar la foto grande */
  window.openLb = (urls, i) => { list = urls.slice(); at = Math.max(0, i || 0); show(); lb.hidden = false; };
  prev.onclick = e => { e.stopPropagation(); step(-1); };
  next.onclick = e => { e.stopPropagation(); step(1); };
  lb.addEventListener("click", close);
  $("#lbX").onclick = close;
  let x0 = null;
  lb.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (x0 === null || list.length < 2) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) { e.preventDefault(); step(dx < 0 ? 1 : -1); }
  });
  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") { e.stopImmediatePropagation(); close(); }
    if (e.key === "ArrowRight" && list.length > 1) step(1);
    if (e.key === "ArrowLeft" && list.length > 1) step(-1);
  });
})();
