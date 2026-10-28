/* Tienda: lee los productos de Supabase (o muestra ejemplos si aún no lo conectas)
   y maneja filtros, pedido y envío por WhatsApp. */
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
/* Productos de ejemplo: se usan solo mientras no conectes Supabase. [marca, talla, precio, disponible] */
const DEMO = [
  ["Norte", "S", 77, 1], ["Atlas", "S", 85, 1], ["Volta", "S", 77, 0], ["Kiru", "S", 95, 1],
  ["Norte", "M", 60, 1], ["Atlas", "M", 85, 1], ["Volta", "M", 77, 1], ["Brisa", "M", 70, 0],
  ["Norte", "L", 77, 1], ["Kiru", "L", 95, 1], ["Atlas", "L", 85, 1], ["Brisa", "L", 70, 1],
  ["Volta", "XL", 77, 1], ["Norte", "XL", 77, 1], ["Kiru", "XL", 95, 0], ["Atlas", "XL", 85, 1]
];

/* ===== Utilidades ===== */
const $ = s => document.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const money = n => CONFIG.currency + " " + n.toLocaleString("es-GT", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const fullName = p => p.marca + " talla " + p.size;
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function hashColor(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
function luminance(hex) { const h = hex.replace("#", ""); const c = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
/* Foto real si existe; si no, una playera dibujada del color de la marca */
function pic(p, cls) {
  const c = cls === undefined ? "shirt" : cls;
  if (p.foto) return '<img class="' + c + ' photo" src="' + esc(p.foto) + '" alt="' + esc(fullName(p)) + '" loading="lazy">';
  const ink = luminance(p.color) > .55 ? "#1b1b1b" : "#ffffff";
  return '<svg class="' + c + '" viewBox="0 0 120 120" role="img" aria-label="Playera">'
    + '<path d="M42 10 L18 24 L6 48 L26 56 L32 46 L32 108 L88 108 L88 46 L94 56 L114 48 L102 24 L78 10 C74 22 46 22 42 10 Z" fill="' + p.color + '" stroke="#0A0A0A" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<path d="M44 12 C48 24 72 24 76 12" fill="none" stroke="' + ink + '" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>'
    + '<text x="60" y="92" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" font-weight="500" fill="' + ink + '" fill-opacity=".9">' + esc(p.size) + '</text></svg>';
}

/* ===== Estado ===== */
let PRODUCTS = [];
let SIZES = [];
const state = { size: "", only: false, sort: "", q: "" };
let cart = {};
let customer = { name: "", phone: "", mode: "recoger", addr: "", note: "" };
try { const s = localStorage.getItem("catalogo-cart"); if (s) cart = JSON.parse(s) || {}; } catch (e) {}
try { const s = localStorage.getItem("catalogo-cliente"); if (s) customer = Object.assign(customer, JSON.parse(s) || {}); } catch (e) {}
function saveCart() { try { localStorage.setItem("catalogo-cart", JSON.stringify(cart)); } catch (e) {} }
function saveCustomer() { try { localStorage.setItem("catalogo-cliente", JSON.stringify(customer)); } catch (e) {} }

/* ===== Textos fijos ===== */
$("#brandName").textContent = CONFIG.brand;
$("#kicker").textContent = "Catálogo · " + new Date().getFullYear();
$("#hero").textContent = CONFIG.hero;
$("#tagline").textContent = CONFIG.tagline;
$("#num").textContent = CONFIG.whatsappLabel;
$("#footBrand").textContent = CONFIG.brand;
$("#yr").textContent = new Date().getFullYear();
document.title = CONFIG.brand;
function waUrl(text) { return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(text); }
$("#waMain").href = waUrl("Hola, vi tu catálogo y quería consultar algo.");
if (CONFIG.ticker.length) {
  const items = CONFIG.ticker.map(t => "<span>" + esc(t) + "</span>").join("");
  $("#ticker").innerHTML = '<div class="track">' + items.repeat(6) + "</div>";
}

/* ===== Carga de productos ===== */
function finish() {
  SIZES = [...new Set(PRODUCTS.map(p => p.size))].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  if (state.size && !SIZES.includes(state.size)) state.size = "";
  renderCats(); render(); renderCart();
}
async function load() {
  $("#grid").innerHTML = '<div class="skel"></div>'.repeat(6);
  $("#count").textContent = "Cargando…";
  if (!configured) {
    PRODUCTS = DEMO.map((r, i) => ({
      id: String(i + 1), code: "P-" + String(i + 1).padStart(3, "0"), marca: r[0], size: r[1],
      price: r[2], foto: "", stock: !!r[3], color: hashColor(r[0])
    }));
    $("#notice").hidden = false;
    finish();
    return;
  }
  try {
    const url = C.supabaseUrl.replace(/\/$/, "") + "/rest/v1/productos?select=id,marca,talla,precio,foto_url,disponible&order=id.desc";
    const r = await fetch(url, { headers: { apikey: C.supabaseKey }, cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const rows = await r.json();
    PRODUCTS = rows.map(x => ({
      id: String(x.id), code: "P-" + String(x.id).padStart(3, "0"), marca: x.marca, size: x.talla,
      price: Number(x.precio), foto: x.foto_url || "", stock: !!x.disponible, color: hashColor(x.marca || "")
    }));
  } catch (e) {
    $("#grid").innerHTML = '<div class="empty">No se pudieron cargar los productos.<br>Revisa tu conexión e inténtalo de nuevo.<br><button type="button" id="retry">Reintentar</button></div>';
    $("#retry").onclick = load;
    $("#count").textContent = "";
    return;
  }
  finish();
}

/* ===== Índice de tallas y filtros ===== */
const two = n => String(n).padStart(2, "0");
function renderCats() {
  let h = '<button type="button" class="size" data-size="" aria-pressed="' + (state.size === "" ? "true" : "false") + '">Todo<sup>' + two(PRODUCTS.length) + '</sup><small>Ver todo</small></button>';
  SIZES.forEach(s => {
    const n = PRODUCTS.filter(p => p.size === s).length;
    h += '<button type="button" class="size" data-size="' + esc(s) + '" aria-pressed="' + (state.size === s ? "true" : "false") + '">' + esc(s) + '<sup>' + two(n) + '</sup><small>Talla</small></button>';
  });
  $("#cats").innerHTML = h;
}
$("#cats").addEventListener("click", e => {
  const b = e.target.closest(".size"); if (!b) return;
  state.size = b.dataset.size; renderCats(); render();
});
function setOnly(v) { state.only = v; $("#avAll").setAttribute("aria-pressed", String(!v)); $("#avYes").setAttribute("aria-pressed", String(v)); render(); }
$("#avAll").onclick = () => setOnly(false);
$("#avYes").onclick = () => setOnly(true);
$("#sort").onchange = e => { state.sort = e.target.value; render(); };
$("#q").oninput = e => { state.q = e.target.value.trim().toLowerCase(); render(); };

function visible() {
  let list = PRODUCTS.filter(p =>
    (!state.size || p.size === state.size) && (!state.only || p.stock) &&
    (!state.q || (fullName(p) + " " + p.code).toLowerCase().includes(state.q)));
  if (state.sort === "asc") list = list.slice().sort((a, b) => a.price - b.price);
  if (state.sort === "desc") list = list.slice().sort((a, b) => b.price - a.price);
  return list;
}
function render() {
  if (!PRODUCTS.length) {
    $("#count").textContent = "0 productos";
    $("#grid").innerHTML = '<div class="empty">Todavía no hay productos en el catálogo.<br>Vuelve pronto.</div>';
    return;
  }
  const list = visible();
  $("#count").textContent = (state.size ? "Talla " + state.size + " — " : "") + list.length + (list.length === 1 ? " producto" : " productos");
  if (!list.length) {
    $("#grid").innerHTML = '<div class="empty">No hay productos con esos filtros.<br><button type="button" id="reset">Quitar filtros</button></div>';
    $("#reset").onclick = () => { state.size = ""; state.q = ""; $("#q").value = ""; setOnly(false); renderCats(); };
    return;
  }
  $("#grid").innerHTML = list.map((p, i) =>
    '<article class="card' + (p.stock ? "" : " off") + '" style="--i:' + Math.min(i, 14) + '"><div class="hang">'
    + '<div class="pic">' + pic(p) + '<span class="st' + (p.stock ? "" : " off") + '">' + (p.stock ? "Disponible" : "Agotado") + '</span></div>'
    + '<div class="info"><h3 class="nm">' + esc(p.marca) + '</h3><div class="meta"><span>' + p.code + '</span><b>Talla ' + esc(p.size) + '</b></div></div>'
    + '<div class="buy"><span class="price">' + money(p.price) + '</span>'
    + '<button class="add" type="button" data-code="' + p.code + '"' + (p.stock ? "" : " disabled") + '>' + (p.stock ? "Agregar" : "Agotado") + '</button></div>'
    + '</div></article>'
  ).join("");
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
  const b = e.target.closest(".add"); if (!b || b.disabled) return;
  add(b.dataset.code, 1);
  fly(b.closest(".card"));
  const old = b.textContent; b.textContent = "Agregado"; b.classList.add("done");
  setTimeout(() => { b.textContent = old; b.classList.remove("done"); }, 1000);
});

/* ===== Pedido (carrito) ===== */
const byCode = c => PRODUCTS.find(p => p.code === c);
function totals() {
  const codes = Object.keys(cart).filter(c => byCode(c));
  return { codes, count: codes.reduce((s, c) => s + cart[c], 0), total: codes.reduce((s, c) => s + cart[c] * byCode(c).price, 0) };
}
function add(code, d) {
  cart[code] = (cart[code] || 0) + d;
  if (cart[code] <= 0) delete cart[code];
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
  $("#lines").innerHTML = t.codes.length ? t.codes.map(c => {
    const p = byCode(c);
    return '<div class="line"><div class="th">' + pic(p, "") + '</div><div class="t"><b>' + esc(fullName(p)) + '</b><span>' + p.code + ' · ' + money(p.price) + '</span>'
      + '<div class="qty"><button type="button" data-d="-1" data-c="' + c + '" aria-label="Quitar uno">−</button><output>' + cart[c] + '</output><button type="button" data-d="1" data-c="' + c + '" aria-label="Agregar uno">+</button></div></div>'
      + '<div class="sub">' + money(cart[c] * p.price) + '</div></div>';
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
function syncMode() { $("#addrBox").hidden = !$("#mEnv").checked; }
function fillForm() {
  $("#fName").value = customer.name; $("#fPhone").value = customer.phone;
  $("#fAddr").value = customer.addr; $("#fNote").value = customer.note;
  $("#mRec").checked = customer.mode !== "envio"; $("#mEnv").checked = customer.mode === "envio";
  syncMode();
}
document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener("change", syncMode));
$("#toForm").onclick = () => { if (!totals().count) return; fillForm(); show("form"); };
function setErr(msgId, boxId, msg) { $(msgId).textContent = msg; $(boxId).classList.toggle("bad", !!msg); }
$("#form").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#fName").value.trim(), env = $("#mEnv").checked, addr = $("#fAddr").value.trim();
  setErr("#eName", "#gName", name ? "" : "Escribe tu nombre para identificar el pedido.");
  setErr("#eAddr", "#addrBox", env && !addr ? "Escribe la dirección para el envío." : "");
  if (!name) { $("#fName").focus(); return; }
  if (env && !addr) { $("#fAddr").focus(); return; }
  customer = { name, phone: $("#fPhone").value.trim(), mode: env ? "envio" : "recoger", addr: env ? addr : "", note: $("#fNote").value.trim() };
  saveCustomer(); buildSend(); show("send");
});

/* Paso 3: mensaje y enlace de WhatsApp */
function buildSend() {
  const t = totals();
  const lines = t.codes.map(c => { const p = byCode(c); return "• " + cart[c] + " x " + fullName(p) + " (" + p.code + ") - " + money(cart[c] * p.price); });
  let msg = "Hola, quiero hacer este pedido:\n" + lines.join("\n") + "\n\nTotal: " + money(t.total) + "\n\nNombre: " + customer.name;
  if (customer.phone) msg += "\nTeléfono: " + customer.phone;
  msg += customer.mode === "envio" ? "\nEntrega: Envío a domicilio\nDirección: " + customer.addr : "\nEntrega: Recoger";
  if (customer.note) msg += "\nNotas: " + customer.note;
  $("#waGo").href = waUrl(msg);
  const rows = [["Productos", t.count], ["Total", money(t.total)], ["Nombre", customer.name], ["Entrega", customer.mode === "envio" ? "Envío a domicilio" : "Recoger"]];
  if (customer.mode === "envio") rows.push(["Dirección", customer.addr]);
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
function selectNum() { const r = document.createRange(); r.selectNodeContents($("#num")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
$("#copyNum").onclick = () => {
  const b = $("#copyNum");
  const ok = () => { b.textContent = "Copiado"; setTimeout(() => b.textContent = "Copiar número", 1200); };
  try { navigator.clipboard.writeText(CONFIG.whatsappLabel).then(ok, selectNum); } catch (e) { selectNum(); }
};
$("#brand").addEventListener("click", e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

renderCats(); renderCart(); load();
