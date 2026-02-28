const boton = document.getElementById("generar");
/* =========================
   ESTILO - AUTO PROMPT
========================= */

const estiloColor = document.getElementById("estiloColor");
const estiloMaterial = document.getElementById("estiloMaterial");
const estiloNivel = document.getElementById("estiloNivel");
const estiloLuz = document.getElementById("estiloLuz");
const resetEstilo = document.getElementById("resetEstilo");

function construirEstiloTexto() {
  const partes = [];

  if (estiloColor?.value) partes.push(`paleta ${estiloColor.value}`);
  if (estiloMaterial?.value) partes.push(`material ${estiloMaterial.value}`);
  if (estiloNivel?.value) partes.push(`estética ${estiloNivel.value}`);
  if (estiloLuz?.value) partes.push(`iluminación ${estiloLuz.value}`);

  if (!partes.length) return "";

  return "Aplicar estilo general con " + partes.join(", ") + ".";
}

resetEstilo?.addEventListener("click", () => {
  if (estiloColor) estiloColor.value = "";
  if (estiloMaterial) estiloMaterial.value = "";
  if (estiloNivel) estiloNivel.value = "";
  if (estiloLuz) estiloLuz.value = "";
});
const estado = document.getElementById("estado");
const loader = document.getElementById("loader");
const modoInfo = document.getElementById("modoInfo");

const recomendacionEl = document.getElementById("recomendacion");
const imagenResultadoEl = document.getElementById("imagenResultado");

const inputImagen = document.getElementById("imagen");
const preview = document.getElementById("preview");
const textoEl = document.getElementById("texto");
const proyectoEl = document.getElementById("proyecto");
const projHint = document.getElementById("projHint");

// Botones iteración
const btnUseResult = document.getElementById("btnUseResult");
const btnBackToOriginal = document.getElementById("btnBackToOriginal");
let originalBaseFile = null; // primera imagen subida (original real)

// Comparador Antes/Después
const compareBox = document.getElementById("compareBox");
const compareWrapper = document.getElementById("compareWrapper");
const compareOriginal = document.getElementById("compareOriginal");
const compareResult = document.getElementById("compareResult");
const compareSlider = document.getElementById("compareSlider");

// Sidebar UI
const btnNewProject = document.getElementById("btnNewProject");
const projectSearch = document.getElementById("projectSearch");
const projectList = document.getElementById("projectList");

// Sidebar toggle (desktop collapse)
const btnToggleSidebar = document.getElementById("btnToggleSidebar");
const sidebarEl = document.getElementById("sidebar");
const SIDEBAR_KEY = "ulises_sidebar_collapsed_v1";

// Mobile drawer
const btnOpenSidebar = document.getElementById("btnOpenSidebar");
const btnCloseSidebar = document.getElementById("btnCloseSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// Video UI
const btnVideo = document.getElementById("btnVideo");
const downloadVideo = document.getElementById("downloadVideo");
const videoPreview = document.getElementById("videoPreview");
const videoInfo = document.getElementById("videoInfo");

// ZIP UI
const btnZip = document.getElementById("btnZip");

// Estado actual
let originalObjectUrl = "";
let resultadoUrlFinal = "";
let videoBlobUrl = "";
let currentOriginalThumb = "";

/* =========================
   MOBILE DRAWER HELPERS + SCROLL LOCK
========================= */
function isMobile() {
  return window.matchMedia("(max-width: 980px)").matches;
}

let _prevBodyOverflow = "";

function lockBodyScroll() {
  _prevBodyOverflow = document.body.style.overflow || "";
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  document.body.style.overflow = _prevBodyOverflow;
}

function openSidebarDrawer() {
  if (!isMobile()) return;
  sidebarEl.classList.add("open");
  sidebarOverlay.classList.add("show");
  sidebarOverlay.setAttribute("aria-hidden", "false");
  lockBodyScroll();
}

function closeSidebarDrawer() {
  sidebarEl.classList.remove("open");
  sidebarOverlay.classList.remove("show");
  sidebarOverlay.setAttribute("aria-hidden", "true");
  unlockBodyScroll();
}

btnOpenSidebar?.addEventListener("click", openSidebarDrawer);
btnCloseSidebar?.addEventListener("click", closeSidebarDrawer);
sidebarOverlay?.addEventListener("click", closeSidebarDrawer);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSidebarDrawer();
});

window.addEventListener("resize", () => {
  if (!isMobile()) closeSidebarDrawer();
});

/* =========================
   DESKTOP COLLAPSE (save state)
========================= */
function setSidebarCollapsed(on) {
  if (isMobile()) return;
  sidebarEl.classList.toggle("collapsed", !!on);
  localStorage.setItem(SIDEBAR_KEY, on ? "1" : "0");
}

btnToggleSidebar?.addEventListener("click", () => {
  if (isMobile()) return;
  const isCollapsed = sidebarEl.classList.contains("collapsed");
  setSidebarCollapsed(!isCollapsed);
});

function applyCollapseFromStorage() {
  if (isMobile()) {
    sidebarEl.classList.remove("collapsed");
    return;
  }
  const on = localStorage.getItem(SIDEBAR_KEY) === "1";
  setSidebarCollapsed(on);
}
applyCollapseFromStorage();

/* =========================
   PRESETS
========================= */
document.querySelectorAll("[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    textoEl.value = btn.getAttribute("data-preset") || "";
    textoEl.focus();
    textoEl.setSelectionRange(textoEl.value.length, textoEl.value.length);
  });
});

/* =========================
   MODO SIMPLE / PAINT
========================= */
const btnModeSimple = document.getElementById("btnModeSimple");
const btnModePaint = document.getElementById("btnModePaint");
const usePaint = document.getElementById("usePaint");

const paintSection = document.getElementById("paintSection");
const paintTools = document.getElementById("paintTools");

const paintBase = document.getElementById("paintBase");
const paintCanvas = document.getElementById("paintCanvas");

const brush = document.getElementById("brush");
const brushVal = document.getElementById("brushVal");
const btnErase = document.getElementById("btnErase");
const btnClear = document.getElementById("btnClear");

let imgNaturalW = 0;
let imgNaturalH = 0;

let drawing = false;
let eraseMode = false;

const pctx = paintCanvas.getContext("2d", { willReadFrequently: true });

// máscara real
const maskCanvas = document.createElement("canvas");
const mctx = maskCanvas.getContext("2d", { willReadFrequently: true });

function setBrushUI() {
  brushVal.textContent = String(brush.value);
}
setBrushUI();
brush.addEventListener("input", setBrushUI);

btnErase.addEventListener("click", () => {
  eraseMode = !eraseMode;
  btnErase.textContent = eraseMode ? "Pintar" : "Borrar";
});

btnClear.addEventListener("click", () => {
  clearMask();
  renderOverlay();
});

function clearMask() {
  mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  mctx.fillStyle = "rgba(0,0,0,1)";
  mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
}

function resizeCanvasesToImage() {
  const rect = paintBase.getBoundingClientRect();
  paintCanvas.width = Math.max(1, Math.floor(rect.width));
  paintCanvas.height = Math.max(1, Math.floor(rect.height));

  maskCanvas.width = imgNaturalW;
  maskCanvas.height = imgNaturalH;
  clearMask();
  renderOverlay();
}

function renderOverlay() {
  pctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  if (!imgNaturalW || !imgNaturalH) return;

  const scaleX = paintCanvas.width / imgNaturalW;
  const scaleY = paintCanvas.height / imgNaturalH;

  const imgData = mctx.getImageData(0, 0, imgNaturalW, imgNaturalH);
  const data = imgData.data;

  const step = 4;
  pctx.fillStyle = "rgba(255, 60, 90, 0.40)";
  for (let y = 0; y < imgNaturalH; y += step) {
    for (let x = 0; x < imgNaturalW; x += step) {
      const i = (y * imgNaturalW + x) * 4;
      const a = data[i + 3];
      if (a === 0) pctx.fillRect(x * scaleX, y * scaleY, step * scaleX, step * scaleY);
    }
  }
}

function getPosOnCanvas(evt) {
  const rect = paintCanvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left) / rect.width;
  const y = (evt.clientY - rect.top) / rect.height;
  const mx = Math.max(0, Math.min(imgNaturalW, Math.round(x * imgNaturalW)));
  const my = Math.max(0, Math.min(imgNaturalH, Math.round(y * imgNaturalH)));
  return { mx, my };
}

function applyStroke(mx, my, radius) {
  if (!imgNaturalW || !imgNaturalH) return;

  if (!eraseMode) {
    mctx.save();
    mctx.globalCompositeOperation = "destination-out";
    mctx.beginPath();
    mctx.arc(mx, my, radius, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
  } else {
    mctx.save();
    mctx.globalCompositeOperation = "source-over";
    mctx.fillStyle = "rgba(0,0,0,1)";
    mctx.beginPath();
    mctx.arc(mx, my, radius, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
  }
}

paintCanvas.addEventListener("pointerdown", (e) => {
  if (!imgNaturalW) return;
  if (!usePaint.checked) return;

  drawing = true;
  paintCanvas.setPointerCapture(e.pointerId);
  const { mx, my } = getPosOnCanvas(e);
  applyStroke(mx, my, Number(brush.value));
  renderOverlay();
});

paintCanvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const { mx, my } = getPosOnCanvas(e);
  applyStroke(mx, my, Number(brush.value));
  renderOverlay();
});

paintCanvas.addEventListener("pointerup", () => {
  drawing = false;
});
paintCanvas.addEventListener("pointercancel", () => {
  drawing = false;
});

function maskHasEdits() {
  if (!maskCanvas.width || !maskCanvas.height) return false;
  const imgData = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const data = imgData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) return true;
  }
  return false;
}

function maskBlobPNG() {
  return new Promise((resolve) => {
    maskCanvas.toBlob((b) => resolve(b), "image/png");
  });
}

function setMode(paintOn) {
  usePaint.checked = !!paintOn;

  btnModeSimple.classList.toggle("active", !paintOn);
  btnModePaint.classList.toggle("active", paintOn);

  btnModeSimple.setAttribute("aria-selected", String(!paintOn));
  btnModePaint.setAttribute("aria-selected", String(!!paintOn));

  paintSection.style.display = paintOn ? "block" : "none";
  paintTools.style.display = paintOn ? "flex" : "none";

  if (paintOn && imgNaturalW) setTimeout(resizeCanvasesToImage, 0);
}
btnModeSimple.addEventListener("click", () => setMode(false));
btnModePaint.addEventListener("click", () => setMode(true));
setMode(false);

/* =========================
   STORAGE - PROJECTS
========================= */
const PROJECTS_KEY = "ulises_projects_v1";
const CURRENT_PROJECT_KEY = "ulises_current_project_id_v1";

function uid() {
  return String(Date.now()) + "_" + Math.random().toString(16).slice(2);
}

function safeJsonParse(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

function loadProjects() {
  const raw = localStorage.getItem(PROJECTS_KEY);
  const arr = raw ? safeJsonParse(raw, []) : [];
  return Array.isArray(arr) ? arr : [];
}

function saveProjects(list) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}

function getCurrentProjectId() {
  return localStorage.getItem(CURRENT_PROJECT_KEY) || "";
}

function setCurrentProjectId(id) {
  localStorage.setItem(CURRENT_PROJECT_KEY, id);
}

function findProjectById(list, id) {
  return list.find((p) => p.id === id) || null;
}

function formatDate(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ""; }
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ===== Sidebar render ===== */
function projectThumb(p) {
  const last = p.versions?.[0] ? p.versions[0] : (p.versions?.[p.versions.length - 1] || null);
  return (last?.originalThumb || "") || "";
}

function lastMeta(p) {
  const up = p.updatedAt ? formatDate(p.updatedAt) : "";
  const count = p.versions?.length || 0;
  return { count, up };
}

function sortProjects(list) {
  return [...list].sort((a, b) => {
    const fa = a.favorite ? 1 : 0;
    const fb = b.favorite ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

function renderSidebar() {
  const q = (projectSearch.value || "").trim().toLowerCase();
  const currentId = getCurrentProjectId();

  let projects = sortProjects(loadProjects());
  if (q) projects = projects.filter((p) => (p.name || "").toLowerCase().includes(q));

  if (!projects.length) {
    projectList.innerHTML = `<div class="muted small">Todavía no hay proyectos.</div>`;
    return;
  }

  projectList.innerHTML = projects
    .map((p) => {
      const active = p.id === currentId ? "active" : "";
      const { up } = lastMeta(p);
      const thumb = projectThumb(p);

      return `
      <div class="projRow ${active}" data-id="${p.id}">
        <img class="projThumb" src="${thumb}" alt="thumb" onerror="this.style.display='none'"/>
        <div class="projMain">
          <p class="projName">${escapeHtml(p.name || "Proyecto sin nombre")}</p>
          <div class="projMeta">
            ${up ? `<span class="projBadge">${escapeHtml(up)}</span>` : ``}
            ${p.favorite ? `<span class="projBadge">⭐</span>` : ``}
          </div>
        </div>
        <div class="projBtns">
          <button class="sbMiniBtn projFav" type="button" title="Favorito">${p.favorite ? "⭐" : "☆"}</button>
          <button class="sbMiniBtn projDel" type="button" title="Borrar">🗑️</button>
        </div>
      </div>
    `;
    })
    .join("");

  projectList.querySelectorAll(".projRow").forEach((row) => {
    row.addEventListener("click", (e) => {
      const id = row.getAttribute("data-id");
      if (!id) return;

      if (e.target?.classList?.contains("projFav") || e.target?.classList?.contains("projDel")) return;

      selectProject(id);
      if (isMobile()) closeSidebarDrawer();
    });
  });

  projectList.querySelectorAll(".projFav").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = btn.closest(".projRow");
      const id = row?.getAttribute("data-id");
      if (!id) return;

      const list = loadProjects();
      const p = findProjectById(list, id);
      if (!p) return;

      p.favorite = !p.favorite;
      saveProjects(list);
      renderSidebar();
    });
  });

  projectList.querySelectorAll(".projDel").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = btn.closest(".projRow");
      const id = row?.getAttribute("data-id");
      if (!id) return;

      if (!confirm("¿Borrar este proyecto y todas sus versiones?")) return;

      let list = loadProjects().filter((p) => p.id !== id);
      saveProjects(list);

      if (getCurrentProjectId() === id) setCurrentProjectId(list[0]?.id || "");
      syncCurrentProjectUI();
      renderSidebar();
    });
  });
}

function selectProject(id) {
  setCurrentProjectId(id);
  syncCurrentProjectUI();
  renderSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ensureSomeProject() {
  const list = loadProjects();
  if (list.length) {
    if (!getCurrentProjectId()) setCurrentProjectId(list[0].id);
    return;
  }
  const p = {
    id: uid(),
    name: "Proyecto sin nombre",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false,
    versions: [],
  };
  saveProjects([p]);
  setCurrentProjectId(p.id);
}

function syncCurrentProjectUI() {
  let list = loadProjects();
  let currentId = getCurrentProjectId();
  let p = findProjectById(list, currentId);

  // 🔥 Si no existe proyecto actual pero hay proyectos, usar el primero
  if (!p && list.length) {
    setCurrentProjectId(list[0].id);
    p = list[0];
  }

  // 🔥 Si NO hay proyectos, crear uno automáticamente
  if (!p) {
    const nuevo = {
      id: uid(),
      name: "Proyecto sin nombre",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      favorite: false,
      versions: [],
    };

    list = [nuevo];
    saveProjects(list);
    setCurrentProjectId(nuevo.id);
    p = nuevo;
  }

  if (!(proyectoEl.value || "").trim()) {
    proyectoEl.value = p.name || "";
  }

  const count = p.versions?.length || 0;

  projHint.textContent =
    `Proyecto activo: "${p.name || "Proyecto sin nombre"}" · ` +
    `${count} cambio${count === 1 ? "" : "s"} guardado${count === 1 ? "" : "s"}`;
}


/* ===== Crear nuevo proyecto ===== */
btnNewProject.addEventListener("click", () => {
  const name = prompt("Nombre del proyecto:", "Nuevo proyecto");
  if (name === null) return;

  const clean = (name || "").trim() || "Proyecto sin nombre";
  const list = loadProjects();

  const p = {
    id: uid(),
    name: clean,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false,
    versions: [],
  };

  list.unshift(p);
  saveProjects(list);
  setCurrentProjectId(p.id);

  textoEl.value = "";
  recomendacionEl.textContent = "—";
  imagenResultadoEl.style.display = "none";
  imagenResultadoEl.src = "";
  resultadoUrlFinal = "";
  resetVideoUI();

  if (btnUseResult) btnUseResult.disabled = true;
  if (btnBackToOriginal) btnBackToOriginal.disabled = true;
  originalBaseFile = null;

  hideCompare(); // comparador off

  proyectoEl.value = clean;
  syncCurrentProjectUI();
  renderSidebar();

  if (isMobile()) closeSidebarDrawer();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

projectSearch.addEventListener("input", renderSidebar);

/* =========================
   UI HELPERS
========================= */
function setLoading(on) {
  loader.style.display = on ? "block" : "none";
  boton.disabled = on;
  boton.textContent = on ? "Diseñando..." : "Diseñar";
}

function niceError(msg) {
  estado.textContent = "Error ❌";
  alert(msg);
}

function resetVideoUI() {
  btnVideo.disabled = true;
  btnZip.disabled = true;

  downloadVideo.style.display = "none";
  downloadVideo.removeAttribute("href");

  videoPreview.style.display = "none";
  videoPreview.removeAttribute("src");

  videoInfo.textContent = "";
  videoBlobUrl = "";
}

/* Thumbnail */
function fileToThumbDataUrl(file, maxW = 420) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const outW = Math.min(maxW, w);
      const outH = Math.round((outW / w) * h);

      const c = document.createElement("canvas");
      c.width = outW;
      c.height = outH;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, outW, outH);

      const dataUrl = c.toDataURL("image/jpeg", 0.82);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/* =========================
   COMPARADOR (Antes/Después)
========================= */
let compareReady = false;

function hideCompare() {
  if (!compareBox) return;
  compareBox.style.display = "none";
}

function showCompare(originalSrc, resultSrc) {
  if (!compareBox || !compareOriginal || !compareResult) return;

  compareOriginal.src = originalSrc || "";
  compareResult.src = resultSrc || "";

  compareBox.style.display = "block";

  // inicializa listeners 1 sola vez
  if (!compareReady) {
    initCompareSlider();
    compareReady = true;
  }

  // setea posición inicial al 50%
  setComparePercent(50);
}

function setComparePercent(percent) {
  if (!compareWrapper || !compareResult || !compareSlider) return;
  const p = Math.max(0, Math.min(100, percent));
  compareResult.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
  compareSlider.style.left = p + "%";
}

function initCompareSlider() {
  if (!compareWrapper) return;

  let dragging = false;

  const updateFromClientX = (clientX) => {
    const rect = compareWrapper.getBoundingClientRect();
    let offset = clientX - rect.left;
    offset = Math.max(0, Math.min(offset, rect.width));
    const percent = (offset / rect.width) * 100;
    setComparePercent(percent);
  };

  // Pointer events (sirve para mouse + touch)
  compareWrapper.addEventListener("pointerdown", (e) => {
    dragging = true;
    compareWrapper.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  });

  compareWrapper.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  });

  compareWrapper.addEventListener("pointerup", () => {
    dragging = false;
  });

  compareWrapper.addEventListener("pointercancel", () => {
    dragging = false;
  });
}

/* Input image */
inputImagen.addEventListener("change", async () => {
  const file = inputImagen.files?.[0];
  if (!file) return;

  originalBaseFile = file;
  if (btnBackToOriginal) btnBackToOriginal.disabled = false;

  resetVideoUI();
  resultadoUrlFinal = "";
  if (btnUseResult) btnUseResult.disabled = true;

  hideCompare();

  try {
    currentOriginalThumb = await fileToThumbDataUrl(file);
  } catch {
    currentOriginalThumb = "";
  }

  if (originalObjectUrl) URL.revokeObjectURL(originalObjectUrl);
  originalObjectUrl = URL.createObjectURL(file);

  preview.src = originalObjectUrl;
  preview.style.display = "block";

  paintBase.onload = () => {
    imgNaturalW = paintBase.naturalWidth;
    imgNaturalH = paintBase.naturalHeight;
    if (usePaint.checked) setTimeout(resizeCanvasesToImage, 0);
  };
  paintBase.src = originalObjectUrl;
});

window.addEventListener("resize", () => {
  applyCollapseFromStorage();
  if (!imgNaturalW) return;
  if (!usePaint.checked) return;
  resizeCanvasesToImage();
});

/* =========================
   VOLVER AL ORIGINAL
========================= */
function volverAlOriginal() {
  if (!originalBaseFile) return;

  const dt = new DataTransfer();
  dt.items.add(originalBaseFile);
  inputImagen.files = dt.files;

  if (originalObjectUrl) URL.revokeObjectURL(originalObjectUrl);
  originalObjectUrl = URL.createObjectURL(originalBaseFile);

  preview.src = originalObjectUrl;
  preview.style.display = "block";

  paintBase.onload = () => {
    imgNaturalW = paintBase.naturalWidth;
    imgNaturalH = paintBase.naturalHeight;
    if (usePaint.checked) setTimeout(resizeCanvasesToImage, 0);
  };
  paintBase.src = originalObjectUrl;

  // limpiar resultado
  imagenResultadoEl.style.display = "none";
  imagenResultadoEl.src = "";
  resultadoUrlFinal = "";

  resetVideoUI();
  if (btnUseResult) btnUseResult.disabled = true;

  hideCompare();

  window.scrollTo({ top: 0, behavior: "smooth" });
}
btnBackToOriginal?.addEventListener("click", volverAlOriginal);

/* =========================
   USAR RESULTADO COMO NUEVA BASE
========================= */
async function usarResultadoComoBase() {
  const src = imagenResultadoEl?.src;
  if (!src) return;

  const resp = await fetch(src, { cache: "no-store" });
  if (!resp.ok) throw new Error("No se pudo descargar el resultado");

  const blob = await resp.blob();
  const file = new File([blob], `base_${Date.now()}.png`, { type: blob.type || "image/png" });

  const dt = new DataTransfer();
  dt.items.add(file);
  inputImagen.files = dt.files;

  resetVideoUI();
  resultadoUrlFinal = "";
  if (btnUseResult) btnUseResult.disabled = true;

  if (originalObjectUrl) URL.revokeObjectURL(originalObjectUrl);
  originalObjectUrl = URL.createObjectURL(file);

  preview.src = originalObjectUrl;
  preview.style.display = "block";

  paintBase.onload = () => {
    imgNaturalW = paintBase.naturalWidth;
    imgNaturalH = paintBase.naturalHeight;
    if (usePaint.checked) setTimeout(resizeCanvasesToImage, 0);
  };
  paintBase.src = originalObjectUrl;

  // estás “arrancando de nuevo”, ocultamos comparador hasta que haya resultado nuevo
  hideCompare();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

btnUseResult?.addEventListener("click", () => {
  usarResultadoComoBase().catch((err) => {
    console.error(err);
    alert("No se pudo usar el resultado como base. Probá recargar y de nuevo.");
  });
});

/* VIDEO */
function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

async function generarVideoTransicion(originalSrc, resultadoSrc) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const imgA = await loadImg(originalSrc);
  const imgB = await loadImg(resultadoSrc);

  const maxW = 1080;
  const w = Math.min(maxW, imgA.naturalWidth || imgA.width);
  const h = Math.round((w / (imgA.naturalWidth || imgA.width)) * (imgA.naturalHeight || imgA.height));

  canvas.width = w;
  canvas.height = h;

  const fps = 30;
  const seconds = 2.2;
  const frames = Math.floor(fps * seconds);

  const stream = canvas.captureStream(fps);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";

  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  const done = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });

  recorder.start();

  for (let i = 0; i < frames; i++) {
    const t = i / (frames - 1);
    const k = easeInOut(t);

    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, w, h);

    function drawCover(img, zoom, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;

      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;

      const scale = Math.max(w / iw, h / ih) * zoom;
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;

      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }

    drawCover(imgA, 1.02 - 0.02 * k, 1);
    drawCover(imgB, 1.00 + 0.02 * k, k);

    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  recorder.stop();
  return await done;
}

btnVideo.addEventListener("click", async () => {
  if (!originalObjectUrl || !resultadoUrlFinal) return;

  try {
    btnVideo.disabled = true;
    videoInfo.textContent = "Generando video…";

    const blob = await generarVideoTransicion(originalObjectUrl, resultadoUrlFinal);
    const url = URL.createObjectURL(blob);
    videoBlobUrl = url;

    downloadVideo.href = url;
    downloadVideo.style.display = "inline-flex";

    videoPreview.src = url;
    videoPreview.style.display = "block";

    videoInfo.textContent = "Listo ✅ (formato .webm)";
  } catch (e) {
    console.error(e);
    videoInfo.textContent = "Error generando el video ❌";
    alert("No se pudo generar el video. Probá con Chrome.");
  } finally {
    btnVideo.disabled = false;
  }
});

/* ZIP */
async function fetchAsBlob(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("No se pudo descargar: " + url);
  return await r.blob();
}

btnZip.addEventListener("click", async () => {
  try {
    btnZip.disabled = true;

    if (!window.JSZip) {
      alert("Falta JSZip (revisá que agregaste el script del CDN).");
      return;
    }
    if (!originalObjectUrl || !resultadoUrlFinal) {
      alert("Necesitás una imagen original y un resultado primero.");
      return;
    }

    const zip = new JSZip();

    const pedido = (textoEl.value || "").trim();
    const nombre = (proyectoEl.value || "").trim();

    zip.file("pedido.txt", pedido || "(sin texto)");
    zip.file("proyecto.txt", nombre || "(sin nombre)");

    const originalBlob = await fetchAsBlob(originalObjectUrl);
    const resultadoBlob = await fetchAsBlob(resultadoUrlFinal);

    const extOriginal = originalBlob.type.includes("png") ? "png" : originalBlob.type.includes("webp") ? "webp" : "jpg";

    zip.file(`original.${extOriginal}`, originalBlob);
    zip.file("resultado.png", resultadoBlob);

    if (videoBlobUrl) {
      const videoBlob = await fetchAsBlob(videoBlobUrl);
      zip.file("transicion.webm", videoBlob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipUrl = URL.createObjectURL(zipBlob);

    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = (nombre ? `${nombre}` : "pack_cliente") + ".zip";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);
  } catch (e) {
    console.error(e);
    alert("No se pudo generar el ZIP. Probá de nuevo.");
  } finally {
    btnZip.disabled = false;
  }
});

/* =========================
   GENERAR -> guarda versión
========================= */
boton.addEventListener("click", async () => {
  const textoBase = (textoEl.value || "").trim();
const estiloExtra = construirEstiloTexto();
const texto = estiloExtra
  ? textoBase + " " + estiloExtra
  : textoBase;
  // 🔥 NUEVA LÓGICA REFERENCIA
const refInput = document.getElementById("imagenReferencia"); // input nuevo
const hayReferencia = refInput && refInput.files.length > 0;
const hayMascara = usePaint.checked;

let promptFinal = texto;

// CASO 1: referencia + máscara
if (hayReferencia && hayMascara) {

  promptFinal = `
Modificar únicamente la zona pintada utilizando como referencia visual la imagen adjunta.
Mantener perspectiva, proporciones y realismo.
No modificar ninguna otra parte de la imagen.
`;

}

// CASO 2: referencia sin máscara
else if (hayReferencia && !hayMascara) {

  promptFinal = `
Aplicar los atributos visuales de la imagen de referencia
según lo indicado en la descripción del usuario.
Mantener el resto de la imagen igual.
`;

}

  const imagen = inputImagen.files?.[0];

  estado.textContent = "";
  recomendacionEl.textContent = "—";
  modoInfo.textContent = "";
  imagenResultadoEl.style.display = "none";
  imagenResultadoEl.src = "";

  resetVideoUI();
  resultadoUrlFinal = "";
  if (btnUseResult) btnUseResult.disabled = true;

  hideCompare();

  if (!texto) return niceError("Escribí qué querés cambiar.");
  if (!imagen) return niceError("Seleccioná una imagen.");

  const projects = loadProjects();
  const pid = getCurrentProjectId();
  const proj = findProjectById(projects, pid);
  if (!proj) return niceError("No hay proyecto activo. Creá uno con “Nuevo proyecto”.");

  const nameInput = (proyectoEl.value || "").trim();
  if (nameInput && nameInput !== proj.name) proj.name = nameInput;

  try {
    setLoading(true);
    estado.textContent = "Enviando…";

    const formData = new FormData();
    
formData.append("texto", promptFinal);
formData.append("imagen", imagen);

if (hayReferencia) {
  formData.append("imagenReferencia", refInput.files[0]);
}

    const paintOn = usePaint.checked;

    if (paintOn) {
      if (!imgNaturalW) return niceError("Esperá que cargue la imagen.");
      if (!maskHasEdits()) return niceError("Pintá una zona: la IA solo va a modificar lo pintado.");
      const mb = await maskBlobPNG();
      formData.append("mask", mb, "mask.png");
    }
    
    const res = await fetch("/generar", { method: "POST", body: formData });

    let data = {};
    try { data = await res.json(); } catch {}

    if (!res.ok) throw new Error(data?.error || `Servidor respondió ${res.status}`);

    recomendacionEl.textContent = data.recomendacion || "Listo ✅";
    modoInfo.textContent = data.modo ? `Modo: ${data.modo}` : "";

    if (data.imagenUrl) {
      const url = `${data.imagenUrl}?v=${Date.now()}`;
      imagenResultadoEl.src = url;
      imagenResultadoEl.style.display = "block";

      resultadoUrlFinal = url;
      btnVideo.disabled = false;
      btnZip.disabled = false;
      videoInfo.textContent = "Podés generar el video o descargar el pack ZIP.";

      if (btnUseResult) btnUseResult.disabled = false;

      // 🔥 activar comparador usando original actual vs resultado
      // (si querés que compare SIEMPRE contra la primer original, avisame y lo cambiamos)
      showCompare(originalObjectUrl, url);

      const version = {
        id: uid(),
        ts: Date.now(),
        prompt: texto,
        mode: paintOn ? "PAINT" : "SIMPLE",
        originalThumb: currentOriginalThumb || "",
        resultUrl: data.imagenUrl,
      };

      proj.versions = Array.isArray(proj.versions) ? proj.versions : [];
      proj.versions.unshift(version);
      proj.updatedAt = Date.now();

      saveProjects(projects);
      syncCurrentProjectUI();
      renderSidebar();
    }

    estado.textContent = "Listo ✅";
  } catch (err) {
    console.error(err);
    niceError("Error al generar: " + (err?.message || "desconocido"));
  } finally {
    setLoading(false);
  }
});

/* ===== INIT ===== */
ensureSomeProject();
syncCurrentProjectUI();
renderSidebar();

const btnMiniTest = document.getElementById("calcularEstilo");

btnMiniTest?.addEventListener("click", function () {
  const color = document.getElementById("q-color")?.value;
  const material = document.getElementById("q-material")?.value;
  const estetica = document.getElementById("q-estetica")?.value;
  const espacio = document.getElementById("q-espacio")?.value;

  const resultado = document.getElementById("resultadoEstilo");

  if (!color || !material || !estetica || !espacio) {
    resultado.innerHTML = "⚠️ Respondé todas las preguntas.";
    return;
  }

  let estilo = "Estilo Personalizado ✨";

  if (color === "claro" && material === "madera" && estetica === "minimalista") {
    estilo = "Japandi 🌿";
  }
  else if (color === "oscuro" && material === "metal") {
    estilo = "Industrial Moderno 🏭";
  }
  else if (color === "pastel") {
    estilo = "Nórdico Soft 🤍";
  }
  else if (color === "tierra" && espacio === "living") {
    estilo = "Boho Natural 🌾";
  }
  else if (espacio === "oficina" && estetica === "minimalista") {
    estilo = "Minimalismo Ejecutivo 🖤";
  }

  resultado.innerHTML = `👉 Tu estilo ideal es: <span>${estilo}</span>`;
});







































