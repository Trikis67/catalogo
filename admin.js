/* Panel de administración: inicio de sesión y gestión de camisas.
   Cada foto tiene un código (#001), una marca (elegible o nueva), una o varias tallas y un precio. */
const C = window.CATALOGO || {};
const $ = s => document.querySelector(s);
const configured = !!(C.supabaseUrl && C.supabaseKey && !/TU-PROYECTO/.test(C.supabaseUrl) && !/TU_CLAVE/.test(C.supabaseKey));
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const BUCKET = "productos";
const currency = C.currency || "Q";

let sb = null;
let rows = [];
let editing = null;      // fila que se está editando
let photos = [];         // fotos del formulario: {url, path} ya subidas o {blob, url} nuevas
const MAX_PHOTOS = 6;
let userId = null;
let delTimer = null;

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const sizeIdx = s => { const i = SIZES.indexOf(s); return i < 0 ? 99 : i; };
const byCode = (a, b) => String(a.codigo).localeCompare(String(b.codigo), "es", { numeric: true });
const money = n => currency + " " + Number(n).toLocaleString("es-GT", { minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 });
function toast(msg, bad) {
  const t = $("#toast"); t.textContent = msg; t.classList.toggle("bad", !!bad); t.classList.add("on");
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("on"), 3600);
}
function friendly(err) {
  const m = (err && err.message) || String(err);
  const code = err && err.code;
  if (code === "23505" || /duplicate key|unique/i.test(m)) return "Ese código ya existe. Usa otro, por ejemplo " + nextCode() + ".";
  if (/column .*(fotos).* does not exist|could not find the .*(fotos)/i.test(m)) return "Falta ejecutar migracion_fotos.sql en Supabase (SQL Editor).";
  if (/column .*(codigo|tallas).* does not exist|could not find the .*(codigo|tallas)/i.test(m)) return "Falta ejecutar migracion.sql en Supabase (SQL Editor).";
  if (/row-level security|violates row|permission|not authorized|403/i.test(m)) return "No tienes permiso. Entra con el mismo correo que pusiste en el SQL de Supabase.";
  if (/network|failed to fetch/i.test(m)) return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  return "No se pudo completar: " + m;
}

$("#brand").textContent = C.brand || "Catálogo";
document.title = "Panel · " + (C.brand || "Catálogo");
$("#precioLab").textContent = "Precio (" + currency + ")";
$("#tallaChips").innerHTML = SIZES.map(s => '<label><input type="checkbox" value="' + s + '"><span>' + s + "</span></label>").join("");

function setView(v) {
  ["config", "login", "panel"].forEach(x => { $("#v-" + x).hidden = x !== v; });
  $("#logout").hidden = v !== "panel";
}

/* ===== Sesión ===== */
async function init() {
  if (!configured || !window.supabase) { setView("config"); return; }
  sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey);
  const { data } = await sb.auth.getSession();
  route(data.session);
  sb.auth.onAuthStateChange((_e, s) => route(s));
}
function route(session) {
  if (session && session.user) {
    if (userId === session.user.id) return;
    userId = session.user.id;
    setView("panel"); loadRows();
  } else {
    userId = null; setView("login");
  }
}
$("#lform").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("#lEmail").value.trim(), password = $("#lPass").value;
  const err = $("#lErr"); err.textContent = "";
  if (!email || !password) { err.textContent = "Escribe tu correo y tu contraseña."; return; }
  const b = $("#lBtn"); b.disabled = true; b.textContent = "Entrando…";
  const { error } = await sb.auth.signInWithPassword({ email, password });
  b.disabled = false; b.textContent = "Entrar";
  if (error) err.textContent = /invalid/i.test(error.message) ? "Correo o contraseña incorrectos." : friendly(error);
});
$("#logout").onclick = async () => { await sb.auth.signOut(); resetForm(); };

/* ===== Marcas y códigos ===== */
function brandMap() {   // clave sin acentos -> nombre a mostrar
  const m = new Map();
  rows.slice().sort(byCode).forEach(r => { const k = norm(r.marca); if (k && !m.has(k)) m.set(k, r.marca); });
  return m;
}
function nextCode() {
  let max = 0;
  rows.forEach(r => { const m = /^#(\d+)$/.exec(r.codigo || ""); if (m) max = Math.max(max, Number(m[1])); });
  return "#" + String(max + 1).padStart(3, "0");
}
function cleanCode(v) {
  let c = String(v).trim().replace(/\s+/g, "");
  if (c && c[0] !== "#") c = "#" + c;
  return c;
}
function renderBrandChips() {
  const map = brandMap(), cur = norm($("#fMarca").value);
  const names = [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  $("#marcaChips").innerHTML = names.map(([k, v]) =>
    '<button type="button" class="chip" data-b="' + esc(v) + '" aria-pressed="' + (k === cur ? "true" : "false") + '">' + esc(v) + "</button>").join("");
  const h = $("#marcaHint");
  if (!cur) { h.textContent = names.length ? "Toca una marca de la lista o escribe una nueva." : "Escribe la primera marca."; h.className = "hint"; }
  else if (map.has(cur)) { h.textContent = "Se guardará como «" + map.get(cur) + "» (ya existe)."; h.className = "hint ok"; }
  else { h.textContent = "Marca nueva: «" + $("#fMarca").value.trim() + "»."; h.className = "hint"; }
}
$("#marcaChips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  $("#fMarca").value = b.dataset.b; renderBrandChips();
});
$("#fMarca").addEventListener("input", renderBrandChips);

function checkCodeHint() {
  const c = cleanCode($("#fCodigo").value), h = $("#codeHint");
  if (!c) { h.textContent = "Identifica esta foto. Empieza con # y no se repite."; h.className = "hint"; return true; }
  if (!/^#[A-Za-z0-9-]{1,20}$/.test(c)) { h.textContent = "Usa solo letras, números o guion después del #."; h.className = "hint bad"; return false; }
  const dup = rows.find(r => norm(r.codigo) === norm(c) && (!editing || r.id !== editing.id));
  if (dup) { h.textContent = c + " ya lo usa " + dup.marca + ". Elige otro."; h.className = "hint bad"; return false; }
  h.textContent = "Código disponible."; h.className = "hint ok"; return true;
}
$("#fCodigo").addEventListener("input", checkCodeHint);
$("#fCodigo").addEventListener("blur", () => { $("#fCodigo").value = cleanCode($("#fCodigo").value); checkCodeHint(); });

/* ===== Tallas ===== */
const sizeBoxes = () => [...document.querySelectorAll("#tallaChips input")];
const getSizes = () => sizeBoxes().filter(i => i.checked).map(i => i.value).sort((a, b) => sizeIdx(a) - sizeIdx(b));
const setSizes = arr => sizeBoxes().forEach(i => { i.checked = arr.includes(i.value); });
$("#qSXL").onclick = () => setSizes(["S", "M", "L", "XL"]);
$("#qNone").onclick = () => setSizes([]);

/* ===== Fotos de una camisa ===== */
function rowPhotos(r) {
  const urls = (r.fotos && r.fotos.length) ? r.fotos : (r.foto_url ? [r.foto_url] : []);
  const paths = (r.fotos_paths && r.fotos_paths.length) ? r.fotos_paths : (r.foto_path ? [r.foto_path] : []);
  return urls.map((u, i) => ({ url: u, path: paths[i] || "" }));
}

/* ===== Datos ===== */
async function loadRows() {
  const { data, error } = await sb.from("productos").select("*").order("id", { ascending: false });
  if (error) { toast(friendly(error), true); return; }
  rows = data || [];
  renderBrandChips(); renderList();
  if (!editing && !$("#fCodigo").value) { $("#fCodigo").value = nextCode(); checkCodeHint(); }
}
function renderList() {
  const q = $("#lq").value.trim().toLowerCase();
  const list = rows.filter(r => !q || ((r.codigo || "") + " " + r.marca + " " + (r.tallas || []).join(" ")).toLowerCase().includes(q))
    .sort((a, b) => norm(a.marca).localeCompare(norm(b.marca), "es") || byCode(a, b));
  const counts = {};
  list.forEach(r => { const k = norm(r.marca); counts[k] = (counts[k] || 0) + 1; });
  $("#lTitle").textContent = "Camisas subidas (" + rows.length + ")";
  let html = "", last = null, i = 0;
  list.forEach(r => {
    const k = norm(r.marca);
    if (k !== last) { last = k; html += '<div class="gh">' + esc(r.marca) + "<span>" + counts[k] + (counts[k] === 1 ? " foto" : " fotos") + "</span></div>"; }
    const tallas = (r.tallas || []).slice().sort((a, b) => sizeIdx(a) - sizeIdx(b));
    html += '<div class="row" style="animation-delay:' + Math.min(i++, 10) * 40 + 'ms">'
      + '<div class="th">' + (rowPhotos(r)[0] ? '<img src="' + esc(rowPhotos(r)[0].url) + '" alt="" loading="lazy">' : "Sin foto") + (rowPhotos(r).length > 1 ? '<b class="nf">' + rowPhotos(r).length + "</b>" : "") + "</div>"
      + '<div class="i"><span class="code">' + esc(r.codigo || "") + "</span><b>" + esc(r.marca) + "</b>"
      + '<div class="sz">' + tallas.map(t => "<i>" + esc(t) + "</i>").join("") + "<em>" + money(r.precio) + "</em></div></div>"
      + '<div class="ops">'
      + '<button type="button" class="op ' + (r.disponible ? "on" : "off") + '" data-act="toggle" data-id="' + r.id + '">' + (r.disponible ? "Disponible" : "Agotado") + "</button>"
      + '<button type="button" class="op" data-act="edit" data-id="' + r.id + '">Editar</button>'
      + '<button type="button" class="op danger" data-act="del" data-id="' + r.id + '">Borrar</button>'
      + "</div></div>";
  });
  $("#list").innerHTML = html || '<div class="none">' + (rows.length ? "No hay resultados." : "Todavía no has subido camisas. Usa el formulario.") + "</div>";
}
$("#lq").oninput = renderList;

$("#list").addEventListener("click", async e => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const r = rows.find(x => String(x.id) === b.dataset.id); if (!r) return;
  const act = b.dataset.act;
  if (act === "edit") { startEdit(r); return; }
  if (act === "toggle") {
    const { error } = await sb.from("productos").update({ disponible: !r.disponible }).eq("id", r.id);
    if (error) { toast(friendly(error), true); return; }
    r.disponible = !r.disponible; renderList();
    toast(r.disponible ? "Marcada como disponible." : "Marcada como agotada.");
    return;
  }
  if (act === "del") {
    if (!b.classList.contains("confirm")) {
      document.querySelectorAll(".op.confirm").forEach(x => { x.classList.remove("confirm"); x.textContent = "Borrar"; });
      b.classList.add("confirm"); b.textContent = "¿Seguro? Borrar";
      clearTimeout(delTimer); delTimer = setTimeout(() => { b.classList.remove("confirm"); b.textContent = "Borrar"; }, 3500);
      return;
    }
    const { error } = await sb.from("productos").delete().eq("id", r.id);
    if (error) { toast(friendly(error), true); return; }
    const paths = rowPhotos(r).map(p => p.path).filter(Boolean);
    if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    if (editing && editing.id === r.id) resetForm();
    toast("Camisa borrada."); loadRows();
  }
});

/* ===== Formulario ===== */
function renderStrip() {
  $("#gstrip").innerHTML = photos.map((p, i) =>
    '<div class="gi"><img src="' + esc(p.url) + '" alt="">' + (i === 0 ? '<span class="main">Principal</span>' : "")
    + '<div class="go">' + (i > 0 ? '<button type="button" data-a="first" data-i="' + i + '" title="Hacer principal">★</button>' : "")
    + '<button type="button" data-a="rm" data-i="' + i + '" title="Quitar">×</button></div></div>').join("");
  $("#drop").hidden = photos.length >= MAX_PHOTOS;
}
$("#gstrip").addEventListener("click", e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const i = Number(b.dataset.i);
  if (b.dataset.a === "rm") photos.splice(i, 1);
  else photos.unshift(photos.splice(i, 1)[0]);
  renderStrip();
});
function resetForm(keepBrand) {
  const marca = keepBrand ? $("#fMarca").value : "";
  editing = null; photos = [];
  $("#pform").reset(); $("#fDisp").checked = true; $("#fFoto").value = "";
  $("#fMarca").value = marca; setSizes([]);
  $("#fCodigo").value = nextCode();
  renderStrip(); $("#fErr").textContent = "";
  $("#fTitle").textContent = "Subir camisa"; $("#fBtn").textContent = "Subir camisa"; $("#fCancel").hidden = true;
  renderBrandChips(); checkCodeHint();
}
function startEdit(r) {
  editing = r; photos = rowPhotos(r);
  $("#fCodigo").value = r.codigo || ""; $("#fMarca").value = r.marca; setSizes(r.tallas || []);
  $("#fPrecio").value = r.precio; $("#fDisp").checked = !!r.disponible;
  renderStrip(); $("#fErr").textContent = "";
  $("#fTitle").textContent = "Editar camisa"; $("#fBtn").textContent = "Guardar cambios"; $("#fCancel").hidden = false;
  renderBrandChips(); checkCodeHint();
  $("#pform").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#fMarca").focus({ preventScroll: true });
}
$("#fCancel").onclick = () => resetForm(false);

/* Reduce la foto antes de subirla (máx. 1000 px por lado, JPG) para ahorrar espacio y cargar rápido */
async function resizeImage(file, max) {
  let src;
  try { src = await createImageBitmap(file); }
  catch (e) {
    src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  }
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  const k = Math.min(1, max / Math.max(w, h));
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(src, 0, 0, cv.width, cv.height);
  return new Promise(res => cv.toBlob(res, "image/jpeg", 0.82));
}
async function takeFiles(files) {
  const list = [...(files || [])];
  if (!list.length) return;
  $("#fErr").textContent = "";
  let skipped = 0;
  for (const f of list) {
    if (photos.length >= MAX_PHOTOS) { skipped++; continue; }
    if (!/^image\//.test(f.type)) { skipped++; continue; }
    try {
      const blob = await resizeImage(f, 1000);
      photos.push({ blob, url: URL.createObjectURL(blob) });
    } catch (e) { skipped++; }
  }
  renderStrip();
  if (skipped) $("#fErr").textContent = skipped + " archivo(s) no se agregaron (máximo " + MAX_PHOTOS + " fotos o formato no válido).";
}
$("#fFoto").addEventListener("change", e => { takeFiles(e.target.files).then(() => { e.target.value = ""; }); });
const drop = $("#drop");
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => takeFiles(e.dataTransfer && e.dataTransfer.files));

$("#pform").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("#fErr"); err.textContent = "";
  const codigo = cleanCode($("#fCodigo").value);
  $("#fCodigo").value = codigo;
  if (!codigo || !checkCodeHint()) { err.textContent = "Revisa el código: empieza con # y no puede repetirse."; $("#fCodigo").focus(); return; }
  const typed = $("#fMarca").value.trim();
  if (!typed) { err.textContent = "Escribe o elige la marca."; $("#fMarca").focus(); return; }
  const marca = brandMap().get(norm(typed)) || typed;     // usa la marca que ya existe si es la misma
  const tallas = getSizes();
  if (!tallas.length) { err.textContent = "Elige al menos una talla."; return; }
  const precio = Number($("#fPrecio").value), disponible = $("#fDisp").checked;
  if (!$("#fPrecio").value || isNaN(precio) || precio < 0) { err.textContent = "Escribe un precio válido."; $("#fPrecio").focus(); return; }

  const btn = $("#fBtn"), label = btn.textContent, wasEditing = !!editing;
  btn.disabled = true; btn.textContent = "Guardando…";
  try {
    const before = editing ? rowPhotos(editing) : [];
    const keepPaths = new Set(photos.filter(p => !p.blob).map(p => p.path));
    const uploaded = [];
    const final = [];
    for (const p of photos) {
      if (!p.blob) { final.push({ url: p.url, path: p.path }); continue; }
      const path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
      const up = await sb.storage.from(BUCKET).upload(path, p.blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (up.error) { if (uploaded.length) await sb.storage.from(BUCKET).remove(uploaded); throw up.error; }
      uploaded.push(path);
      final.push({ url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, path });
    }
    const oldPaths = before.map(p => p.path).filter(pa => pa && !keepPaths.has(pa));
    const body = { codigo, marca, tallas, precio, disponible,
      foto_url: final[0] ? final[0].url : null, foto_path: final[0] ? final[0].path : null,
      fotos: final.map(p => p.url), fotos_paths: final.map(p => p.path) };
    const res = editing ? await sb.from("productos").update(body).eq("id", editing.id) : await sb.from("productos").insert(body);
    if (res.error) { if (uploaded.length) await sb.storage.from(BUCKET).remove(uploaded); throw res.error; }
    if (oldPaths.length) await sb.storage.from(BUCKET).remove(oldPaths);
    toast(wasEditing ? "Cambios guardados." : codigo + " subida a la tienda.");
    await loadRows();
    $("#fMarca").value = marca;  // deja escrita la marca tal como quedó guardada
    resetForm(!wasEditing);      // al subir varias seguidas, se queda la marca
  } catch (ex) {
    err.textContent = friendly(ex);
    btn.textContent = label;
  } finally {
    btn.disabled = false;
  }
});

init();
