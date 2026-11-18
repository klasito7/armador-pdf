/* Carga rápida — panel de teclado para el empadronamiento de Diabetes en SURGE.
   Solo completa los campos de la página. Guardar, Guardar todo y Enviar a revisión los aprieta la persona. */
(() => {
  const VER = "v10";
  if (window.__cr) { window.__cr.toggle(); return; }
  const $ = window.jQuery;
  const LS = (k, d) => { try { return JSON.parse(localStorage.getItem("cr_" + k)) ?? d; } catch (e) { return d; } };
  const SS = (k, v) => { try { localStorage.setItem("cr_" + k, JSON.stringify(v)); } catch (e) {} };

  /* ---------- Vue de la página ---------- */
  const vms = [];
  const walk = v => { vms.push(v); v.$children.forEach(walk); };
  const rootEl = [...document.querySelectorAll("*")].find(e => e.__vue__);
  if (rootEl) walk(rootEl.__vue__.$root);
  const vmEdit = vms.find(v => v.$data && Array.isArray(v.$data.abm_requisitos));
  const vmCreate = !vmEdit && vms.find(v => v.$data && v.$data.abm && "can_completar_resto" in v.$data);
  const vmParent = vms.find(v => v.$options.methods && v.$options.methods.enviar_a_revision);
  const mode = vmEdit ? "edit" : vmCreate ? "create" : "";
  const solicitud = (location.pathname.match(/empadronamientos\/(\d+)/) || [])[1] || "";

  /* ---------- Fechas ---------- */
  const pad = n => String(n).padStart(2, "0");
  const fmt = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  function parseDate(txt) {
    const t = String(txt || "").trim();
    if (!t) return "";
    if (/^\d{4}$/.test(t)) return `01/01/${t}`;
    let d, m, y;
    const p = t.split(/[\/\-\.\s]+/);
    if (p.length === 3) [d, m, y] = p;
    else if (/^\d{6}$/.test(t)) [d, m, y] = [t.slice(0, 2), t.slice(2, 4), t.slice(4)];
    else if (/^\d{8}$/.test(t)) [d, m, y] = [t.slice(0, 2), t.slice(2, 4), t.slice(4)];
    else return null;
    d = +d; m = +m; y = +y; if (y < 100) y += 2000;
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return fmt(dt);
  }
  const toDate = s => { const [d, m, y] = s.split("/").map(Number); return new Date(y, m - 1, d); };
  const isoToFmt = s => /^\d{4}-\d{2}-\d{2}/.test(s || "") ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : (s || "");

  /* ---------- Requisitos de Diabetes (id SURGE) ---------- */
  const R = { hc: 61, tipo: 148, comorb: 149, compl: 150, gluc: 151, hba1c: 152, ldl: 153, tg: 154, tas: 155, tad: 156, creat: 157, peso: 104, talla: 103, fondo: 158, pies: 159, tratCom: 160, tratDbt: 161 };
  const MODELOS = {
    1: { nombre: "Certificado Swiss (Jul 25)", orden: ["peso", "talla", "tas", "tad", "tipo", "fdiag", "comorb", "compl", "gluc", "hba1c", "ldl", "tg", "creat", "fondo", "pies", "tratDbt", "tratCom", "medico", "matricula", "tipomat", "hc"] },
    2: { nombre: "Planilla DBT + consentimiento", orden: ["tipo", "fdiag", "peso", "talla", "tas", "tad", "compl", "comorb", "tratCom", "hba1c", "gluc", "fondo", "pies", "tratDbt", "ldl", "tg", "creat", "medico", "matricula", "tipomat", "hc"] },
    3: { nombre: "Anexo III SSSalud", orden: ["tipo", "fdiag", "comorb", "peso", "talla", "compl", "gluc", "hba1c", "ldl", "tg", "creat", "tas", "tad", "fondo", "pies", "tratDbt", "tratCom", "medico", "matricula", "tipomat", "hc"] }
  };
  const KEYS = "123456789abcdefghijk";
  const isExcl = o => !!o.excluyente;

  /* ---------- Estilos (con el nonce de la página, por su CSP) ---------- */
  const nonce = (document.querySelector("script[nonce],style[nonce]") || {}).nonce || "";
  const st = document.createElement("style"); if (nonce) st.nonce = nonce;
  st.textContent = `
#crp{position:fixed;top:60px;right:10px;width:400px;max-height:calc(100vh - 70px);overflow:auto;z-index:99999;background:#fff;border:2px solid #f0a020;border-radius:10px;box-shadow:0 8px 30px #0004;font:13px/1.35 system-ui,Segoe UI,Arial;color:#222;padding:10px}
#crp[hidden]{display:none}
#crp h3{cursor:move;user-select:none}
#cr_pill{position:fixed;right:10px;top:60px;z-index:99999;background:#f0a020;color:#fff;border-radius:18px;padding:6px 12px;font:600 13px system-ui;cursor:pointer;box-shadow:0 4px 14px #0004}
#cr_pill[hidden]{display:none}
#crp .cola{background:#fff6e5;border-radius:8px;padding:6px 8px;margin:6px 0;font-size:12.5px}
#crp .cola b{color:#c77800}
#crp textarea{width:100%;font:12px monospace;margin-top:4px}
#crp .cd{font-weight:700;color:#c77800}
#crp h3{margin:0 0 6px;font-size:15px;display:flex;justify-content:space-between;align-items:center}
#crp .x{border:0;background:none;font-size:16px;cursor:pointer}
#crp .top{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #eee}
#crp input{font:inherit;padding:3px 6px;border:1px solid #bbb;border-radius:5px;min-width:0}
#crp input:focus{outline:2px solid #f0a020;border-color:#f0a020}
#crp .row{display:grid;grid-template-columns:1fr 92px;gap:2px 6px;padding:5px 4px;border-radius:6px;align-items:center}
#crp .row.cur{background:#fff6e5}
#crp .row.bad{background:#fde8e8}
#crp .lbl{grid-column:1/3;font-weight:600;font-size:12px;color:#555;display:flex;justify-content:space-between}
#crp .lbl small{font-weight:400;color:#999}
#crp .ops{grid-column:1/3;display:flex;flex-wrap:wrap;gap:3px}
#crp .op{border:1px solid #ccc;border-radius:12px;padding:1px 7px;font-size:11.5px;cursor:pointer;background:#fafafa}
#crp .op b{color:#c77800;margin-right:3px}
#crp .op.on{background:#f0a020;color:#fff;border-color:#f0a020}
#crp .op.on b{color:#fff}
#crp .msg{font-size:12px;color:#b00;min-height:16px}
#crp .ok{color:#087}
#crp .btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#crp button.b{font:inherit;padding:5px 10px;border-radius:6px;border:1px solid #bbb;background:#f5f5f5;cursor:pointer}
#crp button.p{background:#f0a020;border-color:#f0a020;color:#fff;font-weight:600}
#crp .hint{font-size:11.5px;color:#777;margin-top:6px}
#crp kbd{background:#eee;border:1px solid #ccc;border-radius:3px;padding:0 4px;font-size:11px}`;
  document.head.appendChild(st);

  const box = document.createElement("div"); box.id = "crp";
  document.body.appendChild(box);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const say = (t, ok) => { const m = box.querySelector(".msg"); if (m) { m.textContent = t; m.className = "msg" + (ok ? " ok" : ""); } };

  /* ---------- Atajos sobre los botones de SURGE (andan con el panel abierto o cerrado) ---------- */
  const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const btnTxt = el => (el.innerText || el.value || "").replace(/\s+/g, " ").trim().toLowerCase();
  const boton = (...txts) => {
    const all = [...document.querySelectorAll("button, a.btn, input[type=submit], input[type=button]")].filter(b => visible(b) && !b.disabled && !b.closest("#crp"));
    for (const t of txts) { const b = all.find(x => btnTxt(x) === t); if (b) return b; }
    return null;
  };
  const toast = t => { let el = document.getElementById("cr_toast"); if (!el) { el = document.createElement("div"); el.id = "cr_toast"; el.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:8px 16px;border-radius:8px;z-index:100000;font:14px system-ui"; document.body.appendChild(el); } el.textContent = t; el.style.display = "block"; clearTimeout(el._t); el._t = setTimeout(() => el.style.display = "none", 2500); };
  const pestanas = () => [...document.querySelectorAll(".nav-tabs .nav-link, .nav-pills .nav-link, [role=tab]")].filter(visible);
  let revisionArmada = 0;
  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (e.ctrlKey && !e.shiftKey && !e.altKey && k === "s") {
      e.preventDefault(); e.stopPropagation();
      const activa = (pestanas().find(t => t.classList.contains("active")) || {}).innerText || "";
      const b = /datos b/i.test(activa) ? boton("guardar", "siguiente") : boton("siguiente", "guardar todo", "guardar");
      if (b) { toast("▶ " + btnTxt(b)); b.click(); } else toast("No hay botón Siguiente ni Guardar a la vista.");
    } else if (e.ctrlKey && e.shiftKey && !e.altKey && k === "s") {
      e.preventDefault(); e.stopPropagation();
      const b = boton("enviar a revisión", "enviar a revision");
      if (!b) { toast("No hay botón Enviar a revisión a la vista."); return; }
      if (Date.now() - revisionArmada < 3000) { revisionArmada = 0; toast("📤 Enviar a revisión"); b.click(); }
      else { revisionArmada = Date.now(); toast("¿Enviar a revisión? Apretá Ctrl + Shift + S otra vez para confirmar."); }
    } else if (e.altKey && !e.ctrlKey && !e.shiftKey && k === "c") {
      e.preventDefault(); e.stopPropagation();
      if (window.__cr && window.__cr.excel) window.__cr.excel(); else toast("Abrí el panel en el empadronamiento para copiar al Excel.");
    } else if (e.altKey && !e.ctrlKey && k === "p") {
      e.preventDefault(); e.stopPropagation();
      if (window.__cr && window.__cr.ver) window.__cr.ver(e.shiftKey);
    } else if (e.key === "F2") {
      const ts = pestanas(); if (!ts.length) return;
      e.preventDefault(); e.stopPropagation();
      const i = ts.findIndex(t => t.classList.contains("active"));
      const n = ts[(i + (e.shiftKey ? -1 : 1) + ts.length) % ts.length]; n.click(); toast("📑 " + n.innerText.trim());
    }
  }, true);
  // Al enviar a revisión (con atajo o con el mouse) se prepara lo del Excel
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("button, a.btn");
    if (b && !b.closest("#crp") && /^enviar a revisi/.test(btnTxt(b)) && window.__cr && window.__cr.onEnviar) window.__cr.onEnviar();
  }, true);

  // Minimizar (no se cierra) y mover arrastrando el título; la posición se recuerda
  const pill = document.createElement("div"); pill.id = "cr_pill"; pill.hidden = true; pill.textContent = "⚡ Carga rápida"; document.body.appendChild(pill);
  const minimizar = () => { box.hidden = true; pill.hidden = false; };
  const restaurar = () => { box.hidden = false; pill.hidden = true; focusFirst(); };
  pill.onclick = restaurar;
  const pos = LS("pos", null);
  if (pos) { box.style.left = Math.min(pos.x, innerWidth - 120) + "px"; box.style.top = Math.max(0, Math.min(pos.y, innerHeight - 60)) + "px"; box.style.right = "auto"; }
  box.addEventListener("mousedown", e => {
    const h = e.target.closest("h3"); if (!h || e.target.closest("button")) return;
    e.preventDefault();
    const r0 = box.getBoundingClientRect(), dx = e.clientX - r0.left, dy = e.clientY - r0.top;
    const mv = ev => { box.style.left = Math.max(0, Math.min(ev.clientX - dx, innerWidth - 80)) + "px"; box.style.top = Math.max(0, Math.min(ev.clientY - dy, innerHeight - 40)) + "px"; box.style.right = "auto"; };
    const up = () => { removeEventListener("mousemove", mv); removeEventListener("mouseup", up); const r1 = box.getBoundingClientRect(); SS("pos", { x: Math.round(r1.left), y: Math.round(r1.top) }); };
    addEventListener("mousemove", mv); addEventListener("mouseup", up);
  });
  window.__cr = { toggle() { box.hidden ? restaurar() : minimizar(); } };

  /* ---------- Cola de datos que vienen del Armador ---------- */
  const cola = () => LS("cola", {});
  const setCola = c => SS("cola", c);
  const normN = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z ,]/g, " ").replace(/\s+/g, " ").trim();
  // ¿El nombre que trae SURGE es el mismo socio? Alcanza con que coincida el apellido
  const mismoSocio = (a, b) => { a = normN(a); b = normN(b); if (!a || !b) return true; const ap = x => x.split(",")[0].trim().split(" ")[0]; return a.includes(ap(b)) || b.includes(ap(a)); };
  function pegarCola(txt) {
    const i = txt.indexOf("CARGARAPIDA:"); if (i < 0) return -1;
    let recs; try { recs = JSON.parse(txt.slice(i + 12).trim()); } catch (e) { return -1; }
    const c = cola(); let n = 0;
    for (const r of recs) { if (!r.cuil) continue; const prev = c[r.cuil]; c[r.cuil] = { ...r, estado: prev && prev.estado !== "pendiente" ? prev.estado : "pendiente", sol: prev && prev.sol || "", t: Date.now() }; n++; }
    setCola(c); return n;
  }
  const pendientes = () => Object.values(cola()).filter(r => r.estado === "pendiente").sort((a, b) => a.t - b.t);
  function colaHtml() {
    const c = Object.values(cola()), p = c.filter(r => r.estado === "pendiente").length, b = c.filter(r => r.estado === "borrador").length;
    return `<div class="cola">📥 Cola del Armador: <b>${p}</b> por cargar · ${b} en borrador <button class="b" id="cr_pegar" style="padding:1px 8px">Pegar datos</button>
      <div id="cr_pegarBox" hidden><textarea id="cr_pegarTxt" rows="3" placeholder="Ctrl + V acá lo que copiaste con 📋 Datos para SURGE"></textarea></div></div>`;
  }
  function wireCola(after) {
    const b = box.querySelector("#cr_pegar"); if (!b) return;
    b.onclick = () => { const x = box.querySelector("#cr_pegarBox"); x.hidden = !x.hidden; if (!x.hidden) box.querySelector("#cr_pegarTxt").focus(); };
    box.querySelector("#cr_pegarTxt").addEventListener("input", e => {
      const n = pegarCola(e.target.value);
      if (n < 0) { say("Eso no es lo que copia el Armador (📋 Datos para SURGE)."); return; }
      say(`📥 ${n} socio${n === 1 ? "" : "s"} en la cola.`, true); after && after();
    });
  }
  // Cuenta regresiva antes de apretar un botón de SURGE (Esc la cancela)
  let cancelado = false;
  addEventListener("keydown", e => { if (e.key === "Escape") cancelado = true; }, true);
  function cuenta(seg, txt) {
    cancelado = false;
    return new Promise(res => {
      let n = seg; const m = box.querySelector(".msg");
      const t = setInterval(() => {
        if (cancelado) { clearInterval(t); say("⏸ Cancelado. Seguí a mano o tocá ▶ de nuevo."); res(false); return; }
        if (n <= 0) { clearInterval(t); res(true); return; }
        if (m) { m.className = "msg ok"; m.innerHTML = `${esc(txt)} en <span class="cd">${n}</span>… (Esc cancela)`; }
        n--;
      }, 1000);
    });
  }
  const esperar = (cond, ms) => new Promise(res => { const t0 = Date.now(); const t = setInterval(() => { if (cond()) { clearInterval(t); res(true); } else if (Date.now() - t0 > ms) { clearInterval(t); res(false); } }, 300); });
  const focusFirst = () => setTimeout(() => { const i = box.querySelector("[data-first]") || box.querySelector("input"); if (i) i.focus(); }, 30);

  if (!mode) {
    box.innerHTML = `<h3>⚡ Carga rápida <small style="font-weight:400;color:#999">${VER}</small> <button class="x" data-close>✕</button></h3><p>Abrí un empadronamiento (Alta, Editar o Reempadronar) y volvé a tocar el marcador.</p>`;
    box.querySelector("[data-close]").onclick = minimizar;
    return;
  }

  /* ---------- Planilla firmada desde la carpeta Firmados ---------- */
  const idb = () => new Promise((res, rej) => { const q = indexedDB.open("carga-rapida", 1); q.onupgradeneeded = () => q.result.createObjectStore("kv"); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  const kv = async (k, val) => { const db = await idb(); return new Promise(res => { const tx = db.transaction("kv", val === undefined ? "readonly" : "readwrite"); const s = tx.objectStore("kv"); const q = val === undefined ? s.get(k) : s.put(val, k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); };
  async function carpetaFirmados(nueva) {
    let dir = nueva ? null : await kv("firmados");
    if (dir) { let p = await dir.queryPermission({ mode: "read" }); if (p !== "granted") p = await dir.requestPermission({ mode: "read" }); if (p !== "granted") dir = null; }
    if (!dir) { dir = await window.showDirectoryPicker({ id: "firmados", mode: "read" }); await kv("firmados", dir); }
    return dir;
  }
  // Busca en Firmados el PDF de ese CUIL (o su DNI): primero los _signed, después el más nuevo
  async function findFirmado(cuil, otra) {
    const dni = cuil.slice(2, 10).replace(/^0+/, "");
    const dir = await carpetaFirmados(!!otra);
    const hits = [];
    for await (const [name, h] of dir.entries()) {
      if (h.kind !== "file" || !/\.pdf$/i.test(name)) continue;
      const nums = name.match(/\d{7,11}/g) || [];
      if (nums.some(n => n === cuil || n.replace(/^0+/, "") === dni)) hits.push(await h.getFile());
    }
    hits.sort((a, b) => (/_signed/i.test(b.name) - /_signed/i.test(a.name)) || b.lastModified - a.lastModified);
    return { file: hits[0] || null, n: hits.length, dir: dir.name };
  }
  // Abre la planilla en una ventana aparte, a la izquierda, para leerla mientras cargás
  let pdfUrl = "";
  function verPlanilla(file) {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = URL.createObjectURL(file);
    // Abre donde la dejaste la última vez (sirve para mandarla al segundo monitor)
    const pos = LS("pdfpos", null) || { x: 0, y: 0, w: Math.round(screen.availWidth * 0.5), h: screen.availHeight };
    const win = window.open(pdfUrl, "cr_planilla", `popup,left=${pos.x},top=${pos.y},width=${pos.w},height=${pos.h}`);
    if (!win) { say("Chrome bloqueó la ventana: tocá el ícono de la barra de direcciones y permití ventanas emergentes para SURGE."); return false; }
    try { win.focus(); } catch (e) {}
    clearInterval(verPlanilla._t);
    verPlanilla._t = setInterval(() => {
      try { if (win.closed) { clearInterval(verPlanilla._t); return; } SS("pdfpos", { x: win.screenX, y: win.screenY, w: win.outerWidth, h: win.outerHeight }); } catch (e) { clearInterval(verPlanilla._t); }
    }, 2000);
    return true;
  }
  async function abrirPlanilla(cuil, otra) {
    try {
      cuil = String(cuil || "").replace(/\D/g, "");
      if (cuil.length !== 11) { say("Primero el CUIL."); return null; }
      const r = await findFirmado(cuil, otra);
      if (!r.file) { say(`No hay PDF de ${cuil} en "${r.dir}". (Para elegir otra carpeta: Alt + Shift + P.)`); return null; }
      const age = Math.round((Date.now() - r.file.lastModified) / 864e5);
      if (verPlanilla(r.file)) say(`📄 ${r.file.name} (${age === 0 ? "de hoy" : "hace " + age + " días"})${r.n > 1 ? ` · había ${r.n}, abrí el más nuevo` : ""}`, true);
      return r.file;
    } catch (e) { if (e.name !== "AbortError") say("No pude leer la carpeta Firmados: " + e.message); return null; }
  }

  /* ---------- Médicos recordados ---------- */
  const medicos = LS("medicos", {});
  const medicoList = () => Object.entries(medicos).map(([mat, m]) => `<option value="${esc(mat)}">${esc(m.nombre)} · ${m.tipo === "2" ? "Prov" : "Nac"}</option>`).join("");

  let fp = LS("fp_" + solicitud, "") || "";
  const fpInput = `<label>📅 Fecha planilla</label><input id="cr_fp" data-first placeholder="ddmmaa" value="${esc(fp)}">`;

  /* ================= ALTA ================= */
  if (mode === "create") {
    const v = vmCreate;
    const minFecha = isoToFmt(v.minDataFechaInicio || "");
    box.innerHTML = `<h3>⚡ Carga rápida <small style="font-weight:400;color:#999">${VER}</small> · Alta <button class="x" data-close>✕</button></h3>
      <div class="top">${fpInput}
        <label>Fecha alta</label><b id="cr_alta">—</b>
        <label>CUIL</label><input id="cr_cuil" placeholder="20123456789">
      </div>
      <div id="cr_paso2" ${v.can_completar_resto ? "" : "hidden"}>
        <div class="top">
          <label>Fecha diagnóstico</label><input id="cr_fdiag" placeholder="año o ddmmaa">
          <label>Matrícula</label><input id="cr_mat" list="cr_meds" placeholder="número"><datalist id="cr_meds">${medicoList()}</datalist>
          <label>Médico</label><input id="cr_med" placeholder="APELLIDO, Nombre">
          <label>Tipo matrícula</label><input id="cr_tmat" placeholder="1 Nacional · 2 Provincial">
        </div>
      </div>
      ${colaHtml()}
      <div class="msg"></div>
      <div class="btns"><button class="b p" id="cr_auto" hidden>▶ Cargar el siguiente de la cola</button><button class="b" id="cr_go">Completar <kbd>Ctrl+Enter</kbd></button><button class="b" id="cr_ver">📄 Ver planilla <kbd>Alt+P</kbd></button></div>
      <p class="hint"><kbd>Ctrl+S</kbd> Siguiente / Guardar · <kbd>F2</kbd> pestaña siguiente (<kbd>Shift+F2</kbd> anterior) · <kbd>Alt+P</kbd> ver la planilla firmada.<br>Paso 1: fecha de planilla y CUIL → Completar → <b>Siguiente</b>. Paso 2: diagnóstico y médico → Completar → apretá <b>Guardar</b>. Mínimo permitido: ${esc(minFecha)}.</p>`;
    const altaDe = s => {
      const d = toDate(s); d.setFullYear(d.getFullYear() - 1); d.setDate(1);   // siempre el 01 del mes
      let alta = fmt(d), aviso = "";
      if (minFecha && toDate(alta) < toDate(minFecha)) { alta = minFecha; aviso = " (límite)"; }
      return [alta, aviso];
    };
    const upd = () => {
      const f = parseDate(box.querySelector("#cr_fp").value);
      box.querySelector("#cr_alta").textContent = f ? altaDe(f).join("") : "—";
      box.querySelector("#cr_paso2").hidden = !v.can_completar_resto;
    };
    box.querySelector("#cr_fp").addEventListener("input", upd); upd();
    box.querySelector("#cr_mat").addEventListener("input", e => {
      const m = medicos[e.target.value.trim()];
      if (m) { box.querySelector("#cr_med").value = m.nombre; box.querySelector("#cr_tmat").value = m.tipo; }
    });
    const setPicker = (input, ddmmyyyy) => {
      try {
        const dp = $ && $(input).data("DateTimePicker");
        if (dp && window.moment) {
          const m = window.moment(ddmmyyyy, "DD/MM/YYYY");
          dp.date(m);
          // SURGE toma la fecha recién cuando el calendario se cierra (evento dp.hide)
          $(input).trigger($.Event("dp.hide", { date: m }));
          return true;
        }
      } catch (e) {}
      input.value = ddmmyyyy; input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true }));
      return false;
    };
    const go = () => {
      const f = parseDate(box.querySelector("#cr_fp").value);
      if (!f) { say("Fecha de planilla inválida."); box.querySelector("#cr_fp").focus(); return; }
      SS("fp_last", f);
      if (!v.can_completar_resto) {
        const cuil = box.querySelector("#cr_cuil").value.replace(/\D/g, "");
        if (cuil.length !== 11) { say("El CUIL tiene que tener 11 números."); box.querySelector("#cr_cuil").focus(); return; }
        const [alta] = altaDe(f);
        const sel = document.querySelector("select.select2-hidden-accessible");
        if (sel && $) $(sel).val("381").trigger("change"); else v.$set(v.abm, "patologia_id", 381);
        v.$set(v.abm, "cuil_beneficiario", cuil);
        const ci = document.querySelector('input[placeholder="Ingrese cuil beneficiario"]');
        if (ci) { ci.value = cuil; ci.dispatchEvent(new Event("input", { bubbles: true })); }
        const fi = document.querySelector('input[placeholder="Fecha alta de empadronamiento"]');
        if (fi) setPicker(fi, alta);
        if (!v.abm.fecha_inicio_tratamiento) v.$set(v.abm, "fecha_inicio_tratamiento", alta);
        SS("pend", { cuil, fp: f });
        abrirPlanilla(cuil);
        say(`✓ Diabetes · ${cuil} · alta ${alta}. Revisá y apretá Siguiente.`, true);
        const wait = setInterval(() => { if (v.can_completar_resto) { clearInterval(wait); upd(); const x = box.querySelector("#cr_fdiag"); if (x) x.focus(); } }, 400);
        return;
      }
      const fdiag = parseDate(box.querySelector("#cr_fdiag").value);
      if (box.querySelector("#cr_fdiag").value && !fdiag) { say("Fecha de diagnóstico inválida."); return; }
      const mat = box.querySelector("#cr_mat").value.trim(), med = box.querySelector("#cr_med").value.trim(), tmat = box.querySelector("#cr_tmat").value.trim();
      if (tmat && !/^[12]$/.test(tmat)) { say("Tipo de matrícula: 1 Nacional o 2 Provincial."); return; }
      if (fdiag) { const i = document.querySelector('input[placeholder="Ingrese fecha diagnóstico"]'); if (i) setPicker(i, fdiag); v.$set(v.abm, "fecha_diagnostico", fdiag); }
      if (med) v.$set(v.abm, "nombre_matriculado", med);
      if (mat) v.$set(v.abm, "matricula_prescriptor", mat);
      if (tmat) { v.$set(v.abm, "tipo_matricula_id", tmat); const sels = document.querySelectorAll("select.select2-hidden-accessible"); const s = [...sels].find(x => [...x.options].some(o => /nacional/i.test(o.text))); if (s && $) $(s).val(tmat).trigger("change"); }
      if (mat && med) { medicos[mat] = { nombre: med, tipo: tmat || "1" }; SS("medicos", medicos); }
      say("✓ Completado. Revisá y apretá Guardar.", true);
    };
    box.querySelector("#cr_go").onclick = go;
    // Automático con la cola: alta → Siguiente → chequeo de nombre → paso 2 → Guardar (queda en Borrador)
    const autoBtn = box.querySelector("#cr_auto");
    const updAuto = () => { const p = pendientes(); autoBtn.hidden = !p.length || v.can_completar_resto; if (p.length) autoBtn.textContent = `▶ Cargar el siguiente de la cola (${p[0].cuil}${p[0].nombre ? " · " + p[0].nombre : ""})`; };
    wireCola(updAuto); updAuto();
    autoBtn.onclick = async () => {
      const rec = pendientes()[0]; if (!rec) return;
      autoBtn.hidden = true;
      box.querySelector("#cr_fp").value = rec.fp; box.querySelector("#cr_cuil").value = rec.cuil; upd();
      go();
      if (!(await cuenta(2, "Siguiente"))) return;
      const sig = boton("siguiente"); if (!sig) { say("No encuentro el botón Siguiente."); return; }
      sig.click();
      if (!(await esperar(() => v.can_completar_resto, 20000))) { say("⚠ SURGE no dejó pasar a la segunda parte. Fijate el mensaje en la página (¿el CUIL está en la obra social?, ¿la fecha?)."); return; }
      upd();
      await new Promise(r0 => setTimeout(r0, 600));
      const nomS = (v.abm.beneficiario && v.abm.beneficiario.nombre) || (document.querySelector("input[disabled]") || {}).value || "";
      if (rec.nombre && !mismoSocio(nomS, rec.nombre)) {
        say(`⚠ OJO: SURGE dice "${nomS}" y en el Armador es "${rec.nombre}". Revisá que sea el mismo socio; si está bien, apretá Completar y Guardar a mano.`);
        return;
      }
      const q = rec.req || {};
      box.querySelector("#cr_fdiag").value = (q.fdiag || {}).v || "";
      box.querySelector("#cr_mat").value = (q.matricula || {}).v || "";
      box.querySelector("#cr_med").value = (q.medico || {}).v || "";
      box.querySelector("#cr_tmat").value = ((q.tipomat || {}).sel || [])[0] === "Provincial" ? "2" : "1";
      go();
      if (!(await cuenta(3, `✓ ${nomS || rec.cuil} coincide. Guardar`))) return;
      const g = boton("guardar"); if (!g) { say("No encuentro el botón Guardar."); return; }
      const c = cola(); c[rec.cuil].estado = "alta"; setCola(c);
      g.click();
      say("Guardando… Cuando abra el empadronamiento, tocá el favorito ⚡ y sigue solo con los requisitos.", true);
    };
    window.__cr.ver = otra => abrirPlanilla(box.querySelector("#cr_cuil").value || (document.querySelector('input[placeholder="Ingrese cuil beneficiario"]') || {}).value, otra);
    box.querySelector("#cr_ver").onclick = e => window.__cr.ver(e.shiftKey);
    box.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); go(); }
      else if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); const ins = [...box.querySelectorAll("input")].filter(i => i.offsetParent); const n = ins[ins.indexOf(e.target) + 1]; if (n) n.focus(); else go(); }
      else if (e.key === "Escape") minimizar();
    });
    box.querySelector("[data-close]").onclick = minimizar;
    if (!fp) { const l = LS("fp_last", ""); if (l) { box.querySelector("#cr_fp").value = l; upd(); } }
    focusFirst();
    return;
  }

  /* ================= EDITAR / REEMPADRONAR ================= */
  const v = vmEdit;
  const reqs = id => v.abm_requisitos.find(r => r.requisito && r.requisito.id === id);
  const editable = !!(v.can_edit ?? v.$props?.can_edit);
  const cuilPage = (() => { const i = [...document.querySelectorAll("input")].find(x => /cuil/i.test((x.closest("div") || {}).innerText || "") && /^\d{11}$/.test(x.value)); return i ? i.value : ""; })();
  let modelo = LS("modelo", 1);
  const state = LS("st_" + solicitud, {}); // valores tipeados (se borran al aplicar)
  let archivo = null;

  function fieldDefs() {
    // Mismo orden que SURGE: Datos básicos y después los requisitos tal como los muestra la página
    const RK = Object.fromEntries(Object.entries(R).map(([k, id]) => [id, k]));
    const orden = ["fdiag", "medico", "matricula", "tipomat", ...v.abm_requisitos.map(x => RK[x.requisito && x.requisito.id]).filter(Boolean)];
    return orden.map(k => {
      if (R[k]) {
        const r = reqs(R[k]); if (!r) return null;
        const t = r.requisito.type, x = r.extra || r.requisito.extra || {};
        return { k, label: r.requisito.nombre, type: t, r, ops: (x.itemsCombo || []).map(o => ({ txt: o.option, excl: isExcl(o) })), min: x.min_val, max: x.max_val, dec: !!x.decimales };
      }
      if (k === "fdiag") return { k, label: "Fecha diagnóstico", type: "fecha" };
      if (k === "medico") return { k, label: "Médico", type: "texto" };
      if (k === "matricula") return { k, label: "Matrícula", type: "matricula" };
      if (k === "tipomat") return { k, label: "Tipo de matrícula", type: "combo", ops: [{ txt: "Nacional" }, { txt: "Provincial" }] };
      return null;
    }).filter(Boolean);
  }
  // teclas: el excluyente ("No presenta", "Ninguna"…) va en 0
  const keyOf = (f, i) => { const ex = f.ops.findIndex(o => o.excl); if (i === ex) return "0"; const idx = ex >= 0 && i > ex ? i - 1 : i; return KEYS[idx]; };

  function render() {
    const defs = fieldDefs();
    box.innerHTML = `<h3>⚡ Carga rápida <small style="font-weight:400;color:#999">${VER}</small> <small style="font-weight:400;color:#888">solicitud ${esc(solicitud)}</small><button class="x" data-close>✕</button></h3>
      <div class="top">${fpInput}
      </div>
      ${editable ? "" : `<p class="msg">Este empadronamiento no se puede editar (aceptado o pendiente). Abrí uno en Borrador, Rechazado o Reempadronar.</p>`}
      <div id="cr_rows">${defs.map(rowHtml).join("")}</div>
      ${excelHtml()}
      <div class="msg"></div>
      ${colaHtml()}
      <div class="btns"><button class="b p" id="cr_go">Completar en SURGE <kbd>Ctrl+Enter</kbd></button><button class="b" id="cr_ver">📄 Ver planilla <kbd>Alt+P</kbd></button><button class="b" id="cr_log">📋 Copiar registro de hoy</button><button class="b" id="cr_clear">Limpiar</button></div>
      <p class="hint">Enter = siguiente · Tab = fecha del valor (vacía = la de planilla; <kbd>2023</kbd> = 01/01/2023) · opciones con las teclas · <kbd>0</kbd> = "no presenta/ninguna" · después <b>Guardar todo</b>.<br><kbd>Ctrl+S</kbd> Guardar todo (en Datos básicos: Guardar) · <kbd>Ctrl+Shift+S</kbd> dos veces = Enviar a revisión · <kbd>F2</kbd> / <kbd>Shift+F2</kbd> cambiar de pestaña · <kbd>Alt+P</kbd> ver la planilla firmada.</p>`;
    wire(defs);
  }
  function rowHtml(f, i) {
    const s = state[f.k] || {};
    const val = s.v ?? "";
    let input = "";
    if (f.type === "combo" || f.type === "multiple") {
      const sel = new Set(s.sel || []);
      input = `<input data-i="${i}" class="cr_v" ${i === 0 ? "" : ""} readonly placeholder="${f.type === "multiple" ? "teclas (varias)" : "tecla"}" value="${esc([...sel].map(j => keyOf(f, j)).join(" "))}">
        <div class="ops">${f.ops.map((o, j) => `<span class="op ${sel.has(j) ? "on" : ""}" data-r="${i}" data-o="${j}"><b>${keyOf(f, j)}</b>${esc(o.txt)}</span>`).join("")}</div>`;
    } else if (f.type === "archivo") {
      input = `<input data-i="${i}" class="cr_v" readonly value="${esc(archivo ? archivo.name : "")}" placeholder="Enter = buscar en Firmados">`;
    } else {
      input = `<input data-i="${i}" class="cr_v" value="${esc(val)}" placeholder="${f.type === "numero" ? (f.min != null ? `${f.min}–${f.max}` : "número") : f.type === "fecha" ? "año o ddmmaa" : ""}" ${f.type === "matricula" ? 'list="cr_meds"' : ""}>`;
    }
    const hasDate = !!f.r;
    const [inp, ops = ""] = input.split("<div class=\"ops\">");
    return `<div class="row" data-row="${i}"><div class="lbl">${esc(f.label)}<small>${f.type === "multiple" ? "varias" : f.type === "combo" ? "una" : ""}</small></div>${inp}${hasDate ? `<input class="cr_d" data-d="${i}" tabindex="0" placeholder="fecha planilla" value="${esc(s.d || "")}">` : "<span></span>"}${ops ? "<div class=\"ops\">" + ops : ""}</div>`;
  }
  const save = () => SS("st_" + solicitud, state);

  function wire(defs) {
    box.insertAdjacentHTML("beforeend", `<datalist id="cr_meds">${medicoList()}</datalist>`);
    box.querySelector("[data-close]").onclick = minimizar;
    const fpI = box.querySelector("#cr_fp");
    fpI.addEventListener("change", () => { const f = parseDate(fpI.value); if (f) { fpI.value = f; SS("fp_" + solicitud, f); SS("fp_last", f); } else if (fpI.value) say("Fecha de planilla inválida."); });
    fpI.addEventListener("keydown", e => { if (e.key === "Enter" && !e.ctrlKey) { e.preventDefault(); fpI.dispatchEvent(new Event("change")); focusRow(0); } });
    const rows = [...box.querySelectorAll(".row")];
    rows.forEach((row, i) => {
      const f = defs[i], vi = row.querySelector(".cr_v"), di = row.querySelector(".cr_d");
      vi.addEventListener("focus", () => { rows.forEach(r => r.classList.remove("cur")); row.classList.add("cur"); });
      if (di) {
        di.addEventListener("focus", () => { rows.forEach(r => r.classList.remove("cur")); row.classList.add("cur"); });
        di.addEventListener("change", () => { const d = parseDate(di.value); if (di.value && !d) { row.classList.add("bad"); say(`${f.label}: fecha inválida.`); return; } di.value = d || ""; (state[f.k] = state[f.k] || {}).d = di.value; save(); row.classList.remove("bad"); });
        di.addEventListener("keydown", e => { if (e.key === "Enter" && !e.ctrlKey) { e.preventDefault(); di.dispatchEvent(new Event("change")); focusRow(i + 1); } });
      }
      if (f.type === "combo" || f.type === "multiple") {
        const toggle = j => {
          const s = state[f.k] = state[f.k] || {}; const sel = new Set(s.sel || []);
          if (f.type === "combo") { sel.clear(); sel.add(j); }
          else if (sel.has(j)) sel.delete(j);
          else { if (f.ops[j].excl) sel.clear(); else f.ops.forEach((o, x) => { if (o.excl) sel.delete(x); }); sel.add(j); }
          s.sel = [...sel]; save();
          row.querySelectorAll(".op").forEach(op => op.classList.toggle("on", sel.has(+op.dataset.o)));
          vi.value = [...sel].map(x => keyOf(f, x)).join(" ");
          if (f.type === "combo") focusRow(i + 1);
        };
        row.querySelectorAll(".op").forEach(op => op.onclick = () => { toggle(+op.dataset.o); vi.focus(); });
        vi.addEventListener("keydown", e => {
          if (e.ctrlKey || e.altKey || e.metaKey) return;
          const j = f.ops.findIndex((o, x) => keyOf(f, x) === e.key.toLowerCase());
          if (j >= 0) { e.preventDefault(); toggle(j); }
          else if (e.key === "Backspace") { e.preventDefault(); (state[f.k] = state[f.k] || {}).sel = []; save(); render(); focusRow(i); }
          else if (e.key === "Enter") { e.preventDefault(); focusRow(i + 1); }
        });
      } else if (f.type === "archivo") {
        vi.addEventListener("keydown", e => { if (e.key === "Enter" && !e.ctrlKey) { e.preventDefault(); buscarFirmado(vi).then(() => focusRow(i + 1)); } });
        vi.addEventListener("dblclick", e => buscarFirmado(vi, e.shiftKey));
      } else {
        vi.addEventListener("input", () => {
          (state[f.k] = state[f.k] || {}).v = vi.value; save();
          if (f.type === "matricula") { const m = medicos[vi.value.trim()]; if (m) { (state.medico = state.medico || {}).v = m.nombre; (state.tipomat = state.tipomat || {}).sel = [m.tipo === "2" ? 1 : 0]; save(); const mi = rowInput("medico"); if (mi) mi.value = m.nombre; } }
        });
        vi.addEventListener("keydown", e => { if (e.key === "Enter" && !e.ctrlKey) { e.preventDefault(); if (check(f, vi.value, row)) focusRow(i + 1); } });
        vi.addEventListener("blur", () => check(f, vi.value, row));
      }
    });
    box.querySelector("#cr_go").onclick = aplicar;
    box.querySelector("#cr_log").onclick = copiarLog;
    wireCola(() => { const b = box.querySelector("#cr_pegarBox"); });
    wireExcel();
    box.querySelector("#cr_ver").onclick = e => window.__cr.ver(e.shiftKey);
    box.querySelector("#cr_clear").onclick = () => { for (const k of Object.keys(state)) delete state[k]; archivo = null; save(); render(); focusRow(0); };
  }
  const rowInput = k => { const defs = fieldDefs(); const i = defs.findIndex(f => f.k === k); return i >= 0 ? box.querySelector(`.row[data-row="${i}"] .cr_v`) : null; };
  function focusRow(i) {
    const row = box.querySelector(`.row[data-row="${i}"]`);
    if (!row) { box.querySelector("#cr_go").focus(); return; }
    const vi = row.querySelector(".cr_v"); vi.focus(); row.scrollIntoView({ block: "nearest" });
  }
  function check(f, raw, row) {
    let ok = true, why = "";
    const t = String(raw || "").trim();
    if (t && f.type === "numero") {
      const n = Number(t.replace(",", "."));
      if (isNaN(n)) { ok = false; why = "no es un número"; }
      else if (!f.dec && !Number.isInteger(n)) { ok = false; why = "va sin decimales"; }
      else if (f.min != null && (n < f.min || n > f.max)) { ok = false; why = `fuera de rango (${f.min}–${f.max})`; }
    }
    if (t && f.type === "fecha" && !parseDate(t)) { ok = false; why = "fecha inválida"; }
    row.classList.toggle("bad", !ok);
    if (!ok) say(`${f.label}: ${why}.`); else if (box.querySelector(".msg").textContent.startsWith(f.label)) say("");
    return ok;
  }

  async function buscarFirmado(vi, otra) {
    const f = await abrirPlanilla(cuilPage, otra);
    if (f) { archivo = f; vi.value = f.name; }
  }

  /* ---------- Pasar todo a SURGE ---------- */
  function aplicar() {
    const fpI = box.querySelector("#cr_fp"); const fpv = parseDate(fpI.value);
    if (!fpv) { say("Cargá la fecha de planilla (arriba)."); fpI.focus(); return false; }
    if (!editable) { say("Este empadronamiento no se puede editar."); return false; }
    const defs = fieldDefs(); let bad = 0, n = 0;
    const rows = [...box.querySelectorAll(".row")];
    defs.forEach((f, i) => { if (f.type === "numero" || f.type === "fecha") if (!check(f, (state[f.k] || {}).v, rows[i])) bad++; });
    if (bad) { say(`Hay ${bad} dato(s) para corregir (en rojo).`); return false; }
    for (const f of defs) {
      const s = state[f.k] || {};
      const fecha = s.d || fpv;
      if (f.r) {
        let val = null;
        if (f.type === "numero" && String(s.v || "").trim()) val = String(Number(String(s.v).replace(",", ".")));
        else if (f.type === "combo" && (s.sel || []).length) val = f.ops[s.sel[0]].txt;
        else if (f.type === "multiple" && (s.sel || []).length) val = JSON.stringify(s.sel.slice().sort((a, b) => a - b).map(j => f.ops[j].txt));
        else if (f.type === "archivo" && archivo) val = archivo;
        if (val === null) continue;
        v.$set(f.r, "valor", val); v.$set(f.r, "fecha", fecha); v.$set(f.r, "fecha_changed", true); v.$set(f.r, "key", (f.r.key || 0) + 1);
        n++;
      }
    }
    const db = v.abm_datos_basicos; let nb = 0;
    if (db) {
      const fd = parseDate((state.fdiag || {}).v); if (fd) { v.$set(db, "fecha_diagnostico", fd); nb++; }
      const med = ((state.medico || {}).v || "").trim(), mat = ((state.matricula || {}).v || "").trim(), tm = (state.tipomat || {}).sel;
      if (med) { v.$set(db, "nombre_matriculado", med); nb++; }
      if (mat) { v.$set(db, "matricula_prescriptor", mat); nb++; }
      if (tm && tm.length) { v.$set(db, "tipo_matricula_id", String(tm[0] + 1)); nb++; }
      if (mat && med) { medicos[mat] = { nombre: med, tipo: String(tm && tm.length ? tm[0] + 1 : 1) }; SS("medicos", medicos); }
      if (nb) { if ("keyFechaDiagnostico" in v.$data) v.keyFechaDiagnostico++; if ("key" in v.$data) v.key++; }
    }
    syncFechas();
    const log = LS("log", []); const hoy = fmt(new Date());
    const prev = log.findIndex(x => x.sol === solicitud && x.dia === hoy);
    const rec = { sol: solicitud, cuil: cuilPage, fp: fpv, dia: hoy, hora: new Date().toTimeString().slice(0, 5) };
    if (prev >= 0) log[prev] = rec; else log.push(rec);
    SS("log", log.slice(-500));
    say(`✓ Completé ${n} requisito(s)${nb ? " y los datos básicos" : ""}. Revisá y apretá Guardar${nb ? " (datos básicos) y" : ""} Guardar todo.`, true);
    return true;
  }
  // Los calendarios de SURGE no se redibujan solos: les paso la fecha nueva para que se vea
  function syncFechas() {
    v.$nextTick(() => setTimeout(() => {
      const all = []; const w = x => { all.push(x); x.$children.forEach(w); }; w(v);
      all.filter(c => c.$props && "fechas_desctivadas" in c.$props && /^\d{2}\/\d{2}\/\d{4}$/.test(c.value || "")).forEach(c => {
        const inp = c.$el.tagName === "INPUT" ? c.$el : c.$el.querySelector("input");
        if (!inp || inp.value === c.value) return;
        try { const dp = $ && $(inp).data("DateTimePicker"); if (dp && window.moment) dp.date(window.moment(c.value, "DD/MM/YYYY")); else inp.value = c.value; } catch (e) { inp.value = c.value; }
        if ("valor" in c.$data) c.valor = c.value;
      });
    }, 300));
  }
  /* ---------- Excel compartido: bloque Emp/Reemp + fecha de planilla ---------- */
  const usuario = LS("usuario", "Gino");
  const pend = LS("pend", null);
  let tipoX = LS("tipo_" + solicitud, pend && pend.cuil === cuilPage ? "emp" : "reemp");
  const vigDesde = () => { const d = v.abm_datos_basicos && v.abm_datos_basicos.fecha_inicio_tratamiento; return d ? (parseDate(isoToFmt(d)) || "") : ""; };
  const masUnAnio = s => { if (!s) return ""; const d = toDate(s); d.setFullYear(d.getFullYear() + 1); return fmt(d); };
  let hastaX = LS("hasta_" + solicitud, "");
  function excelHtml() {
    const q = LS("xq", []).filter(x => !x.ok);
    return `<div class="top" style="border-top:1px solid #eee;border-bottom:0;margin-top:8px;padding-top:8px">
      <label>📊 Excel</label><div><span class="op ${tipoX === "emp" ? "on" : ""}" data-tx="emp">Empadronamiento</span> <span class="op ${tipoX === "reemp" ? "on" : ""}" data-tx="reemp">Reempadronamiento</span> <small style="color:#999">Alt+R</small></div>
      <label>Vigencia desde</label><b>${esc(vigDesde() || "—")}</b>
      <label>Vigencia hasta</label><input id="cr_hasta" placeholder="${esc(masUnAnio(vigDesde()) || "ddmmaa")} (o fecha de baja OS)" value="${esc(hastaX)}">
    </div>
    <div class="btns" style="margin-top:0"><button class="b" id="cr_xq">📊 Excel pendientes (${q.length})</button></div>
    <div id="cr_xlist" hidden></div>`;
  }
  function wireExcel() {
    box.querySelectorAll("[data-tx]").forEach(el => el.onclick = () => { tipoX = el.dataset.tx; SS("tipo_" + solicitud, tipoX); box.querySelectorAll("[data-tx]").forEach(x => x.classList.toggle("on", x.dataset.tx === tipoX)); });
    const h = box.querySelector("#cr_hasta");
    h.addEventListener("change", () => { const d = parseDate(h.value); if (h.value && !d) { say("Vigencia hasta: fecha inválida."); return; } h.value = d || ""; hastaX = h.value; SS("hasta_" + solicitud, hastaX); });
    box.querySelector("#cr_xq").onclick = () => { const l = box.querySelector("#cr_xlist"); l.hidden = !l.hidden; if (!l.hidden) renderXList(); };
  }
  const bloque = x => [x.estado || "Pendiente", x.sol, x.desde, x.hasta, x.dia, x.usuario || usuario].join("\t");
  const copy = (txt, msg) => navigator.clipboard.writeText(txt).then(() => toast(msg), () => toast("No pude copiar al portapapeles."));
  function renderXList() {
    const l = box.querySelector("#cr_xlist"), q = LS("xq", []);
    const vis = q.filter(x => !x.ok);
    l.innerHTML = vis.length ? vis.map(x => `<div class="row" style="grid-template-columns:1fr auto auto auto"><span>${esc(x.sol)} · ${esc(x.cuil)} · <b>${x.tipo === "emp" ? "Emp" : "Reemp"}</b> <small style="color:#999">${esc(x.dia)}</small></span>
      <button class="b" data-xb="${esc(x.sol)}">Bloque</button><button class="b" data-xf="${esc(x.sol)}">Fecha planilla</button><button class="b" data-xok="${esc(x.sol)}" title="Ya lo pegué">✓</button></div>`).join("") : `<p class="hint">No hay nada pendiente de pasar.</p>`;
    const find = sol => LS("xq", []).find(x => x.sol === sol);
    l.querySelectorAll("[data-xb]").forEach(b => b.onclick = () => { const x = find(b.dataset.xb); copy(bloque(x), `📋 Bloque ${x.tipo === "emp" ? "Emp" : "Reemp"} de ${x.cuil}: pegalo en "Estado ${x.tipo === "emp" ? "empadronamiento" : "reempadronamiento"}"`); });
    l.querySelectorAll("[data-xf]").forEach(b => b.onclick = () => { const x = find(b.dataset.xf); copy(x.fp || "", `📋 Fecha planilla ${x.fp || "(vacía)"}: va en "fecha planilla" y en "Planilla Vigente" (análisis)`); });
    l.querySelectorAll("[data-xok]").forEach(b => b.onclick = () => { const q2 = LS("xq", []); const x = q2.find(y => y.sol === b.dataset.xok); if (x) x.ok = true; SS("xq", q2); renderXList(); box.querySelector("#cr_xq").textContent = `📊 Excel pendientes (${q2.filter(y => !y.ok).length})`; });
  }
  let ciclo = 0;
  window.__cr.onEnviar = () => {
    const fpv = parseDate((box.querySelector("#cr_fp") || {}).value) || LS("fp_" + solicitud, "");
    const desde = vigDesde(), hasta = hastaX || masUnAnio(desde);
    const x = { sol: solicitud, cuil: cuilPage, tipo: tipoX, estado: "Pendiente", desde, hasta, fp: fpv, dia: fmt(new Date()), usuario };
    const q = LS("xq", []).filter(y => y.sol !== solicitud); q.push(x); SS("xq", q.slice(-300));
    ciclo = 1;
    copy(bloque(x), `📋 Copiado para el Excel: bloque ${x.tipo === "emp" ? "Emp" : "Reemp"}${fpv ? "" : " (ojo: sin fecha de planilla)"} · Alt+C = fecha planilla`);
    const b = box.querySelector("#cr_xq"); if (b) b.textContent = `📊 Excel pendientes (${q.filter(y => !y.ok).length})`;
  };
  // Alt+C alterna: bloque → fecha de planilla → bloque…
  window.__cr.excel = () => {
    const q = LS("xq", []); const x = q.find(y => y.sol === solicitud) || q.filter(y => !y.ok).slice(-1)[0];
    if (!x) { toast("Todavía no enviaste ninguno a revisión."); return; }
    if (ciclo % 2 === 0) copy(bloque(x), `📋 Bloque ${x.tipo === "emp" ? "Emp" : "Reemp"} (${x.cuil}) · Alt+C = fecha planilla`);
    else copy(x.fp || "", `📋 Fecha planilla ${x.fp || "(vacía)"} · va en "fecha planilla" y en "Planilla Vigente"`);
    ciclo++;
  };
  function copiarLog() {
    const hoy = fmt(new Date());
    const rows = LS("log", []).filter(x => x.dia === hoy);
    if (!rows.length) { say("Hoy todavía no completaste ninguno."); return; }
    const txt = ["Solicitud\tCUIL\tFecha planilla\tHora", ...rows.map(r => `${r.sol}\t${r.cuil}\t${r.fp}\t${r.hora}`)].join("\n");
    navigator.clipboard.writeText(txt).then(() => say(`📋 Copiados ${rows.length} (Solicitud, CUIL, fecha planilla, hora). Pegalo en el Excel.`, true), () => say("No pude copiar."));
  }

  box.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); aplicar(); }
    else if (e.altKey && e.key.toLowerCase() === "r") { e.preventDefault(); const o = box.querySelector(`[data-tx="${tipoX === "emp" ? "reemp" : "emp"}"]`); if (o) o.click(); }
    else if (e.key === "Escape") minimizar();
    e.stopPropagation();
  });
  window.__cr.ver = async otra => { const f = await abrirPlanilla(cuilPage, otra); if (f) { archivo = f; const vi = rowInput("hc"); if (vi) vi.value = f.name; } };
  render();
  // Si vengo del Alta de este mismo CUIL, la fecha de planilla ya la sé
  if (!box.querySelector("#cr_fp").value && pend && pend.cuil === cuilPage && pend.fp) { box.querySelector("#cr_fp").value = pend.fp; SS("fp_" + solicitud, pend.fp); }
  // Si este CUIL viene en la cola del Armador: completa todo, adjunta la planilla y aprieta Guardar todo
  const recCola = cola()[cuilPage];
  async function autoEdit(rec) {
    const defs = fieldDefs(), q = rec.req || {};
    const norm = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
    for (const f of defs) {
      const x = q[f.k]; if (!x) continue;
      const st = state[f.k] = {};
      if (f.type === "combo" || f.type === "multiple") st.sel = (x.sel || []).map(t => f.ops.findIndex(o => norm(o.txt) === norm(t))).filter(j => j >= 0);
      else st.v = x.v || "";
      if (x.d) st.d = x.d;
    }
    save();
    render();
    box.querySelector("#cr_fp").value = rec.fp; SS("fp_" + solicitud, rec.fp);
    const f = await abrirPlanilla(cuilPage);
    if (f) { archivo = f; const vi = rowInput("hc"); if (vi) vi.value = f.name; }
    else { say("⚠ No encontré la planilla firmada de este CUIL en Firmados: adjuntala a mano (Enter en Resumen de Historia Clínica) y apretá Guardar todo."); aplicar(); return; }
    if (!aplicar()) return;
    if (!(await cuenta(3, "✓ Todo completo. Guardar todo"))) return;
    let g = boton("guardar todo");
    if (!g) { const t = pestanas().find(x => /requisitos/i.test(x.innerText)); if (t) { t.click(); await new Promise(r0 => setTimeout(r0, 800)); g = boton("guardar todo"); } }
    if (!g) { say("No encuentro el botón Guardar todo: andá a la pestaña Requisitos y apretá Ctrl+S."); return; }
    g.click();
    await new Promise(r0 => setTimeout(r0, 5000));
    const errores = v.abm_requisitos.filter(x => x.error && (typeof x.error === "string" ? x.error : Object.keys(x.error).length)).map(x => x.requisito.nombre);
    if (errores.length) { say("⚠ SURGE marcó error en: " + errores.join(", ") + ". Revisalos."); return; }
    const c = cola(); if (c[cuilPage]) { c[cuilPage].estado = "borrador"; c[cuilPage].sol = solicitud; setCola(c); }
    const quedan = pendientes().length;
    say(`✓ Guardado en Borrador. Revisá cada pestaña y mandalo con Ctrl+Shift+S (dos veces).` + (quedan ? ` Quedan ${quedan} en la cola.` : ""), true);
    if (quedan) { const b = document.createElement("button"); b.className = "b p"; b.textContent = "▶ Siguiente de la cola"; b.onclick = () => { location.href = "/admin/empadronamientos/create"; }; box.querySelector(".btns").prepend(b); }
  }
  if (editable && recCola && recCola.estado !== "borrador") autoEdit(recCola);
  else if (editable && cuilPage) window.__cr.ver(false);
  if (!box.querySelector("#cr_fp").value) box.querySelector("#cr_fp").focus(); else focusRow(0);
})();
