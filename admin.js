/* Panel de administración: inicio de sesión, subir/editar/borrar camisas con foto (marca, talla, precio, disponibilidad). */
const C = window.CATALOGO || {};
const $ = s => document.querySelector(s);
const configured = !!(C.supabaseUrl && C.supabaseKey && !/TU-PROYECTO/.test(C.supabaseUrl) && !/TU_CLAVE/.test(C.supabaseKey));
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const BUCKET = "productos";
const currency = C.currency || "Q";

let sb = null;
let rows = [];
let editing = null;      // fila que se está editando
let photoBlob = null;    // foto nueva ya reducida
let removePhoto = false;
let userId = null;
let delTimer = null;

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
const money = n => currency + " " + Number(n).toLocaleString("es-GT", { minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 });
function toast(msg, bad) {
  const t = $("#toast"); t.textContent = msg; t.classList.toggle("bad", !!bad); t.classList.add("on");
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("on"), 3200);
}
function friendly(err) {
  const m = (err && err.message) || String(err);
  if (/row-level security|violates|permission|not authorized|403/i.test(m)) return "No tienes permiso. Entra con el mismo correo que pusiste en setup.sql.";
  if (/network|failed to fetch/i.test(m)) return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  return "No se pudo completar: " + m;
}

$("#brand").innerHTML = esc(C.brand || "Catálogo") + "<i>.</i>";
document.title = "Panel · " + (C.brand || "Catálogo");
$("#fTalla").innerHTML = SIZES.map(s => '<option value="' + s + '">' + s + "</option>").join("");

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

/* ===== Datos ===== */
async function loadRows() {
  const { data, error } = await sb.from("productos").select("*").order("id", { ascending: false });
  if (error) { toast(friendly(error), true); return; }
  rows = data || [];
  $("#marcasList").innerHTML = [...new Set(rows.map(r => r.marca))].map(m => '<option value="' + esc(m) + '">').join("");
  renderList();
}
function renderList() {
  const q = $("#lq").value.trim().toLowerCase();
  const list = rows.filter(r => !q || (r.marca + " " + r.talla).toLowerCase().includes(q));
  $("#lTitle").textContent = "Camisas subidas (" + rows.length + ")";
  $("#list").innerHTML = list.length ? list.map((r, i) =>
    '<div class="row" style="animation-delay:' + Math.min(i, 10) * 40 + 'ms">'
    + '<div class="th">' + (r.foto_url ? '<img src="' + esc(r.foto_url) + '" alt="" loading="lazy">' : "Sin foto") + "</div>"
    + '<div class="i"><b>' + esc(r.marca) + "</b><span>Talla " + esc(r.talla) + " · " + money(r.precio) + " · P-" + String(r.id).padStart(3, "0") + "</span></div>"
    + '<div class="ops">'
    + '<button type="button" class="op ' + (r.disponible ? "on" : "off") + '" data-act="toggle" data-id="' + r.id + '">' + (r.disponible ? "Disponible" : "Agotado") + "</button>"
    + '<button type="button" class="op" data-act="edit" data-id="' + r.id + '">Editar</button>'
    + '<button type="button" class="op danger" data-act="del" data-id="' + r.id + '">Borrar</button>'
    + "</div></div>"
  ).join("") : '<div class="none">' + (rows.length ? "No hay resultados." : "Todavía no has subido camisas. Usa el formulario.") + "</div>";
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
    if (r.foto_path) await sb.storage.from(BUCKET).remove([r.foto_path]);
    if (editing && editing.id === r.id) resetForm();
    toast("Camisa borrada."); loadRows();
  }
});

/* ===== Formulario ===== */
function setPreview(url) {
  const img = $("#prev");
  if (url) { img.src = url; img.hidden = false; } else { img.removeAttribute("src"); img.hidden = true; }
  $("#rmPhoto").hidden = !url;
}
function resetForm() {
  editing = null; photoBlob = null; removePhoto = false;
  $("#pform").reset(); $("#fDisp").checked = true; $("#fFoto").value = "";
  setPreview(""); $("#fErr").textContent = "";
  $("#fTitle").textContent = "Subir camisa"; $("#fBtn").textContent = "Subir camisa"; $("#fCancel").hidden = true;
}
function startEdit(r) {
  editing = r; photoBlob = null; removePhoto = false;
  $("#fMarca").value = r.marca; $("#fTalla").value = r.talla; $("#fPrecio").value = r.precio; $("#fDisp").checked = !!r.disponible;
  setPreview(r.foto_url || ""); $("#fErr").textContent = "";
  $("#fTitle").textContent = "Editar camisa"; $("#fBtn").textContent = "Guardar cambios"; $("#fCancel").hidden = false;
  $("#pform").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#fMarca").focus({ preventScroll: true });
}
$("#fCancel").onclick = resetForm;

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
async function takeFile(file) {
  if (!file) return;
  if (!/^image\//.test(file.type)) { $("#fErr").textContent = "Elige un archivo de imagen."; return; }
  $("#fErr").textContent = "";
  try {
    photoBlob = await resizeImage(file, 1000); removePhoto = false;
    setPreview(URL.createObjectURL(photoBlob));
  } catch (e) { photoBlob = null; $("#fErr").textContent = "No se pudo leer esa foto. Prueba con otra."; }
}
$("#fFoto").addEventListener("change", e => takeFile(e.target.files[0]));
const drop = $("#drop");
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => takeFile(e.dataTransfer && e.dataTransfer.files[0]));
$("#rmPhoto").onclick = () => { photoBlob = null; removePhoto = true; $("#fFoto").value = ""; setPreview(""); };

$("#pform").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("#fErr"); err.textContent = "";
  const marca = $("#fMarca").value.trim(), talla = $("#fTalla").value;
  const precio = Number($("#fPrecio").value), disponible = $("#fDisp").checked;
  if (!marca) { err.textContent = "Escribe la marca."; $("#fMarca").focus(); return; }
  if (!$("#fPrecio").value || isNaN(precio) || precio < 0) { err.textContent = "Escribe un precio válido."; $("#fPrecio").focus(); return; }
  const btn = $("#fBtn"), label = btn.textContent;
  btn.disabled = true; btn.textContent = "Guardando…";
  try {
    let foto_url = editing ? editing.foto_url : null, foto_path = editing ? editing.foto_path : null, oldPath = null;
    if (photoBlob) {
      const path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
      const up = await sb.storage.from(BUCKET).upload(path, photoBlob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (up.error) throw up.error;
      oldPath = editing && editing.foto_path;
      foto_url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl; foto_path = path;
    } else if (removePhoto) {
      oldPath = editing && editing.foto_path; foto_url = null; foto_path = null;
    }
    const body = { marca, talla, precio, disponible, foto_url, foto_path };
    const res = editing ? await sb.from("productos").update(body).eq("id", editing.id) : await sb.from("productos").insert(body);
    if (res.error) throw res.error;
    if (oldPath) await sb.storage.from(BUCKET).remove([oldPath]);
    toast(editing ? "Cambios guardados." : "Camisa subida a la tienda.");
    resetForm(); await loadRows();
  } catch (ex) {
    err.textContent = friendly(ex);
  } finally {
    btn.disabled = false; if (!$("#fCancel").hidden || editing) btn.textContent = label; else btn.textContent = "Subir camisa";
  }
});

init();
