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
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
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
const money = n => CONFIG.currency + " " + n.toLocaleString("es-GT", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const two = n => String(n).padStart(2, "0");
const sizeIdx = s => { const i = SIZE_ORDER.indexOf(s); return i < 0 ? 99 : i; };
const byCodeOrder = (a, b) => a.code.localeCompare(b.code, "es", { numeric: true });
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function hashColor(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
function luminance(hex) { const h = hex.replace("#", ""); const c = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function mk(id, code, marca, sizes, price, foto, stock, fotos, tipo) {
  const m = String(marca || "").trim();
  return {
    id: String(id), code: String(code), tipo: tipo === "gorra" ? "gorra" : "playera", marca: m, bk: norm(m),
    sizes: [...new Set(sizes || [])].sort((a, b) => sizeIdx(a) - sizeIdx(b) || a.localeCompare(b)),
    price: Number(price), foto: foto || "", fotos: (Array.isArray(fotos) && fotos.length ? fotos : (foto ? [foto] : [])).filter(Boolean), stock: !!stock, color: hashColor(norm(m))
  };
}
const fullName = (p, size) => p.tipo === "gorra" ? p.marca + " (gorra)" : p.marca + " talla " + size;
/* Foto real si existe; si no, una playera dibujada del color de la marca */
const ink2 = p => luminance(p.color) > .55 ? "#1b1b1b" : "#ffffff";
function pic(p, cls) {
  const c = cls === undefined ? "shirt" : cls;
  if (p.foto) return '<img class="' + c + ' photo" src="' + esc(p.foto) + '" alt="' + esc(p.marca + " " + p.code) + '" loading="lazy">';
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

/* Galería de la tarjeta: varias fotos que se deslizan, con flechas y puntos */
function gal(p) {
  if (!p.fotos || p.fotos.length < 2) return pic(p);
  const imgs = p.fotos.map((u, i) => '<img class="photo" src="' + esc(u) + '" alt="' + esc(p.marca + " " + p.code + " foto " + (i + 1)) + '" loading="lazy">').join("");
  const dots = p.fotos.map((_, i) => '<i' + (i === 0 ? ' class="on"' : "") + "></i>").join("");
  return '<div class="gal">' + imgs + "</div>"
    + '<button type="button" class="gp" data-d="-1" aria-label="Foto anterior">&#8249;</button>'
    + '<button type="button" class="gn" data-d="1" aria-label="Foto siguiente">&#8250;</button>'
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
let customer = { name: "", phone: "", addr: "", note: "" };
try { const s = localStorage.getItem("catalogo-cart-v2"); if (s) cart = JSON.parse(s) || {}; } catch (e) {}
try { const s = localStorage.getItem("catalogo-cliente"); if (s) customer = Object.assign(customer, JSON.parse(s) || {}); } catch (e) {}
function saveCart() { try { localStorage.setItem("catalogo-cart-v2", JSON.stringify(cart)); } catch (e) {} }
function saveCustomer() { try { localStorage.setItem("catalogo-cliente", JSON.stringify(customer)); } catch (e) {} }

/* ===== Textos fijos ===== */
$("#brandName").textContent = CONFIG.brand;
$("#kicker").textContent = "Catálogo · " + new Date().getFullYear();
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
  $("#ticker").innerHTML = '<div class="track">' + items.repeat(6) + "</div>";
}

/* ===== Carga de productos ===== */
function finish() {
  SIZES = [...new Set(PRODUCTS.filter(p => p.tipo !== "gorra").flatMap(p => p.sizes))].sort((a, b) => sizeIdx(a) - sizeIdx(b) || a.localeCompare(b));
  BRANDS = new Map();
  PRODUCTS.slice().sort(byCodeOrder).forEach(p => { if (p.bk && !BRANDS.has(p.bk)) BRANDS.set(p.bk, p.marca); });
  if (state.size && state.size !== GORRA && !SIZES.includes(state.size)) state.size = "";
  if (state.brand && !BRANDS.has(state.brand)) state.brand = "";
  fillBrandSel(); renderCats(); render(); renderCart();
}
function fillBrandSel() {
  const opts = [...BRANDS.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  $("#brandSel").innerHTML = '<option value="">Todas las marcas</option>' + opts.map(([k, v]) => '<option value="' + esc(k) + '">' + esc(v) + "</option>").join("");
  $("#brandSel").value = state.brand;
}
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
      .map(x => mk(x.id, x.codigo, x.marca, x.tallas, x.precio, x.foto_url, x.disponible, x.fotos, x.tipo));
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
  SIZES.forEach(s => {
    const n = PRODUCTS.filter(p => p.tipo !== "gorra" && p.sizes.includes(s)).length;
    h += '<button type="button" class="size" data-size="' + esc(s) + '" aria-pressed="' + (state.size === s ? "true" : "false") + '">' + esc(s) + "<sup>" + two(n) + '</sup><small>Talla</small></button>';
  });
  const g = PRODUCTS.filter(p => p.tipo === "gorra").length;
  if (g) h += '<button type="button" class="size" data-size="' + GORRA + '" aria-pressed="' + (state.size === GORRA ? "true" : "false") + '">Gorras<sup>' + two(g) + '</sup><small>Categoría</small></button>';
  $("#cats").innerHTML = h;
}
$("#cats").addEventListener("click", e => {
  const b = e.target.closest(".size"); if (!b) return;
  state.size = b.dataset.size; pick = {}; renderCats(); render();
});
function setOnly(v) { state.only = v; $("#avAll").setAttribute("aria-pressed", String(!v)); $("#avYes").setAttribute("aria-pressed", String(v)); render(); }
$("#avAll").onclick = () => setOnly(false);
$("#avYes").onclick = () => setOnly(true);
$("#sort").onchange = e => { state.sort = e.target.value; render(); };
$("#brandSel").onchange = e => { state.brand = e.target.value; render(); };
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
    $("#reset").onclick = () => { state.size = ""; state.brand = ""; state.q = ""; $("#q").value = ""; $("#brandSel").value = ""; setOnly(false); renderCats(); };
    return;
  }
  const grouped = state.sort === "";
  const counts = {};
  list.forEach(p => { counts[p.bk] = (counts[p.bk] || 0) + 1; });
  let html = "", last = null;
  list.forEach((p, i) => {
    if (grouped && p.bk !== last) {
      last = p.bk;
      html += '<div class="grp"><h3>' + esc(BRANDS.get(p.bk) || p.marca) + "</h3><span>" + two(counts[p.bk]) + (counts[p.bk] === 1 ? " modelo" : " modelos") + "</span></div>";
    }
    const sel = selSize(p);
    html += '<article class="card' + (p.stock ? "" : " off") + '" data-code="' + esc(p.code) + '" style="--i:' + Math.min(i, 14) + '"><div class="hang">'
      + '<div class="pic">' + gal(p) + '<span class="st' + (p.stock ? "" : " off") + '">' + (p.stock ? "Disponible" : "Agotado") + "</span></div>"
      + '<div class="info"><h3 class="nm">' + esc(p.marca) + '</h3><div class="meta"><span>' + esc(p.code) + "</span></div>"
      + (p.tipo === "gorra" ? '<div class="sz"><span class="uni">Gorra · talla única</span></div><div hidden>' : '<div class="sz" role="group" aria-label="Elegir talla">')
      + p.sizes.map(s => '<button type="button" class="szb" data-size="' + esc(s) + '" aria-pressed="' + (s === sel ? "true" : "false") + '"' + (p.stock ? "" : " disabled") + ">" + esc(s) + "</button>").join("")
      + "</div></div>"
      + '<div class="buy"><span class="price">' + money(p.price) + "</span>"
      + '<button class="add" type="button" data-code="' + esc(p.code) + '" data-size="' + esc(sel) + '"' + (p.stock ? "" : " disabled") + ">" + (p.stock ? "Agregar" : "Agotado") + "</button></div>"
      + "</div></article>";
  });
  $("#grid").innerHTML = html;
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
  const b = e.target.closest(".add"); if (!b || b.disabled) return;
  add(b.dataset.code + "|" + b.dataset.size, 1);
  fly(b.closest(".card"));
  const old = b.textContent; b.textContent = "Agregado · " + b.dataset.size; b.classList.add("done");
  setTimeout(() => { b.textContent = old; b.classList.remove("done"); }, 1100);
});

/* ===== Pedido (carrito) ===== */
const byCode = c => PRODUCTS.find(p => p.code === c);
function parseKey(k) { const i = k.lastIndexOf("|"); return { code: k.slice(0, i), size: k.slice(i + 1) }; }
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
    const { code, size } = parseKey(k), p = byCode(code);
    return '<div class="line"><div class="th">' + pic(p, "") + '</div><div class="t"><b>' + esc(fullName(p, size)) + "</b><span>" + esc(code) + " · " + money(p.price) + "</span>"
      + '<div class="qty"><button type="button" data-d="-1" data-c="' + esc(k) + '" aria-label="Quitar uno">−</button><output>' + cart[k] + '</output><button type="button" data-d="1" data-c="' + esc(k) + '" aria-label="Agregar uno">+</button></div></div>'
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
function fillForm() {
  $("#fName").value = customer.name; $("#fPhone").value = customer.phone;
  $("#fAddr").value = customer.addr; $("#fNote").value = customer.note;
}
$("#toForm").onclick = () => { if (!totals().count) return; fillForm(); show("form"); };
function setErr(msgId, boxId, msg) { $(msgId).textContent = msg; $(boxId).classList.toggle("bad", !!msg); }
$("#form").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#fName").value.trim(), addr = $("#fAddr").value.trim();
  setErr("#eName", "#gName", name ? "" : "Escribe tu nombre para identificar el pedido.");
  setErr("#eAddr", "#addrBox", addr ? "" : "Escribe la dirección para el envío.");
  if (!name) { $("#fName").focus(); return; }
  if (!addr) { $("#fAddr").focus(); return; }
  customer = { name, phone: $("#fPhone").value.trim(), addr, note: $("#fNote").value.trim() };
  saveCustomer(); buildSend(); show("send");
});

/* Paso 3: mensaje y enlace de WhatsApp */
function buildSend() {
  const t = totals();
  const lines = t.keys.map(k => {
    const { code, size } = parseKey(k), p = byCode(code);
    return "• " + cart[k] + " x " + fullName(p, size) + " (" + code + ") - " + money(cart[k] * p.price);
  });
  let msg = "Hola, quiero hacer este pedido:\n" + lines.join("\n") + "\n\nTotal: " + money(t.total) + "\n\nNombre: " + customer.name;
  if (customer.phone) msg += "\nTeléfono: " + customer.phone;
  msg += "\nEntrega: Envío a domicilio\nDirección: " + customer.addr;
  if (customer.note) msg += "\nNotas: " + customer.note;
  $("#waGo").href = waUrl(msg);
  const rows = [["Productos", t.count], ["Total", money(t.total)], ["Nombre", customer.name], ["Entrega", "Envío a domicilio"], ["Dirección", customer.addr]];
  $("#recap").innerHTML = "";
  rows.forEach(r => {
    const d = document.createElement("div"); d.className = "r";
    const a = document.createElement("span"), b = document.createElement("span");
    a.textContent = r[0]; b.textContent = r[1]; d.append(a, b); $("#recap").appendChild(d);
  });
}
$("#editOrder").onclick = () => show("form");
$("#done").onclick = () => { cart = {}; saveCart(); renderCart(); openCart(false); };

/* ===== Contacto ===== */
$("#brand").addEventListener("click", e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

renderCats(); renderCart(); load();

/* ===== Galería: puntos al deslizar ===== */
$("#grid").addEventListener("scroll", e => {
  const g = e.target; if (!g.classList || !g.classList.contains("gal")) return;
  const i = Math.round(g.scrollLeft / g.clientWidth);
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
  $("#grid").addEventListener("click", e => {
    const t = e.target.closest("img.photo"); if (!t) return;
    const pic = t.closest(".pic");
    list = pic ? [...pic.querySelectorAll("img.photo")].map(x => x.src) : [t.src];
    at = Math.max(0, list.indexOf(t.src)); show(); lb.hidden = false;
  });
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
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight" && list.length > 1) step(1);
    if (e.key === "ArrowLeft" && list.length > 1) step(-1);
  });
})();
