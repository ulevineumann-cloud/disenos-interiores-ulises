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

function buildStylePresetInstruction() {
  const value = stylePresetEl?.value || "";
  const presets = {
    mediterraneo:
      "Aplicar estilo mediterráneo moderno: revoques claros cálidos, maderas naturales, fibras, textiles beige, plantas mediterráneas e iluminación cálida sobria.",
    japandi:
      "Aplicar estilo Japandi cálido: madera natural, tonos neutros, composición limpia, materiales nobles, pocos objetos y sensación serena.",
    minimalista:
      "Aplicar estilo minimalista premium: lineas limpias, paleta neutra sofisticada, materiales de alta calidad, orden visual y detalles sobrios.",
    industrial:
      "Aplicar estilo industrial elegante: metal oscuro, madera cálida, superficies minerales, iluminación puntual y terminaciones sobrias.",
    nordico:
      "Aplicar estilo nórdico soft: blancos cálidos, madera clara, textiles suaves, luz natural y decoración simple.",
  };

  if (!presets[value]) return "";

  return `
ESTILO AUTOMATICO SELECCIONADO:
${presets[value]}

REGLAS TECNICAS INTERNAS:
- Mantener exactamente el mismo encuadre, proporción y tamaño final de la imagen original.
- No acercar cámara, no recortar, no expandir y no cambiar perspectiva.
- Mantener arquitectura base, ubicacion de paredes, aberturas, estructura, techo, piso y escala.
- Adaptar el estilo al espacio existente sin generar una escena nueva.
`.trim();
}

const estado = document.getElementById("estado");
const loader = document.getElementById("loader");
const errorBox = document.getElementById("errorBox");
const resultLoading = document.getElementById("resultLoading");
const modoInfo = document.getElementById("modoInfo");
const fileMeta = document.getElementById("fileMeta");
const referenceMeta = document.getElementById("referenceMeta");
const keepGeometryEl = document.getElementById("keepGeometry");
const keepDimensionsEl = document.getElementById("keepDimensions");
const strictEditScopeEl = document.getElementById("strictEditScope");
const editScopeEl = document.getElementById("editScope");
const stylePresetEl = document.getElementById("stylePreset");

const recomendacionEl = document.getElementById("recomendacion");
const imagenResultadoEl = document.getElementById("imagenResultado");
const resultEmpty = document.getElementById("resultEmpty");
const sizeCheckEl = document.getElementById("sizeCheck");

const inputImagen = document.getElementById("imagen");
const preview = document.getElementById("preview");
const uploadDropzone = document.getElementById("uploadDropzone");

const inputReferencia = document.getElementById("imagenReferencia");
const previewReferencia = document.getElementById("previewReferencia");

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
const projectHistoryList = document.getElementById("projectHistoryList");
const historyCount = document.getElementById("historyCount");
const sidebarEditState = document.getElementById("sidebarEditState");
const requestChecklist = document.getElementById("requestChecklist");
const sidebarImageInfo = document.getElementById("sidebarImageInfo");
const sbUseResult = document.getElementById("sbUseResult");
const sbBackOriginal = document.getElementById("sbBackOriginal");
const sbVideo = document.getElementById("sbVideo");
const sbZip = document.getElementById("sbZip");

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
const downloadResult = document.getElementById("downloadResult");
const btnOpenResult = document.getElementById("btnOpenResult");
const btnCopyResult = document.getElementById("btnCopyResult");
const resultLightbox = document.getElementById("resultLightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxMeta = document.getElementById("lightboxMeta");
const btnCloseLightbox = document.getElementById("btnCloseLightbox");

// ZIP UI
const btnZip = document.getElementById("btnZip");
const styleDiscoverBtn = document.getElementById("calcularEstilo");
const styleResultEl = document.getElementById("resultadoEstilo");

// Estado actual
let originalObjectUrl = "";
let resultadoUrlFinal = "";
let videoBlobUrl = "";
let currentOriginalThumb = "";

function revokeIfBlobUrl(url) {
  if (url && String(url).startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function withCacheBust(url, stamp = Date.now()) {
  if (!url) return "";
  if (String(url).startsWith("data:") || String(url).startsWith("blob:")) return url;
  return url.includes("?") ? `${url}&v=${stamp}` : `${url}?v=${stamp}`;
}

function humanFileSize(size) {
  if (!size) return "0 KB";
  const kb = size / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function setMetaText(el, text) {
  if (!el) return;
  el.textContent = text;
}

function collapseWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function truncateText(text, max = 120) {
  const clean = collapseWhitespace(text);
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "⬦";
}

function describeImageFile(file, label) {
  if (!file) return label;
  return `${file.name} · ${humanFileSize(file.size)}`;
}

function updatePrecisionSummary(extraMode = "") {
  if (!modoInfo) return;

  const flags = [];
  if (editScopeEl?.value && editScopeEl.value !== "auto") flags.push(`alcance ${editScopeEl.value}`);
  if (keepGeometryEl?.checked) flags.push("misma geometría");
  if (keepDimensionsEl?.checked) flags.push("mismo tamaño final");
  if (strictEditScopeEl?.checked) flags.push("cambio puntual");
  if (stylePresetEl?.value) flags.push(`estilo ${stylePresetEl.value}`);
  if (usePaint?.checked) flags.push("zona pintada");

  let text = flags.length
    ? `Precision activa: ${flags.join(", ")}.`
    : "Precision manual.";

  if (extraMode) {
    text += ` Modo: ${extraMode}.`;
  }

  modoInfo.textContent = text;
}

function clearSizeCheck() {
  if (!sizeCheckEl) return;
  sizeCheckEl.style.display = "none";
  sizeCheckEl.className = "sizeCheck";
  sizeCheckEl.textContent = "";
}

function showSizeCheck(originalW, originalH, resultW, resultH) {
  if (!sizeCheckEl || !originalW || !originalH || !resultW || !resultH) return;
  const sameSize = Number(originalW) === Number(resultW) && Number(originalH) === Number(resultH);
  sizeCheckEl.className = `sizeCheck ${sameSize ? "ok" : "warn"}`;
  sizeCheckEl.innerHTML = sameSize
    ? `<strong>Tamaño conservado.</strong> Original: ${originalW} x ${originalH} px · Resultado: ${resultW} x ${resultH} px.`
    : `<strong>Tamaño corregido.</strong> Original: ${originalW} x ${originalH} px · Resultado: ${resultW} x ${resultH} px.`;
  sizeCheckEl.style.display = "flex";
}

/* =========================
   MOBILE DRAWER HELPERS + SCROLL LOCK
========================= */
function isMobile() {
  return document.body.classList.contains("appPage") || window.matchMedia("(max-width: 980px)").matches;
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
  if (e.key === "Escape") closeResultLightbox();
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
  if (document.body.classList.contains("appPage")) {
    closeSidebarDrawer();
    return;
  }
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
    updateSidebarWorkspaceControls();
  });
});

document.querySelectorAll("[data-sidebar-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const preset = btn.getAttribute("data-sidebar-preset") || "";
    const scope = btn.getAttribute("data-scope") || "auto";
    textoEl.value = preset;
    if (editScopeEl) {
      editScopeEl.value = scope;
      editScopeEl.dispatchEvent(new Event("change"));
    }
    textoEl.focus();
    textoEl.setSelectionRange(textoEl.value.length, textoEl.value.length);
    document.querySelector(".toolCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    updateSidebarWorkspaceControls();
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
const btnUndoPaint = document.getElementById("btnUndoPaint");
const btnBrushSmall = document.getElementById("btnBrushSmall");
const btnBrushLarge = document.getElementById("btnBrushLarge");
const paintToolButtons = Array.from(document.querySelectorAll(".paintToolBtn"));
const paintColorButtons = Array.from(document.querySelectorAll(".paintColorBtn"));

let imgNaturalW = 0;
let imgNaturalH = 0;

let drawing = false;
let eraseMode = false;
let lastStrokePoint = null;
let shapeStartPoint = null;
let shapePreviewPoint = null;
let currentPaintTool = "pencil";
let currentPaintColor = "red";
const maskHistory = [];
const MAX_MASK_HISTORY = 12;

const pctx = paintCanvas.getContext("2d", { willReadFrequently: true });

// máscara real
const maskCanvas = document.createElement("canvas");
const mctx = maskCanvas.getContext("2d", { willReadFrequently: true });
const annotationCanvas = document.createElement("canvas");
const actx = annotationCanvas.getContext("2d", { willReadFrequently: true });
const paintColorMeta = {
  red: { label: "rojo", rgba: "rgba(255, 74, 96, .54)", solid: "#ff4a60", meaning: "zona principal a modificar" },
  yellow: { label: "amarillo", rgba: "rgba(246, 199, 68, .50)", solid: "#f6c744", meaning: "detalle, material o terminación a ajustar" },
  blue: { label: "azul", rgba: "rgba(74, 168, 255, .48)", solid: "#4aa8ff", meaning: "estructura, texto, logo o referencia que debe conservarse" },
  green: { label: "verde", rgba: "rgba(86, 210, 123, .46)", solid: "#56d27b", meaning: "elemento nuevo o vegetación a agregar" },
};
const usedPaintColors = new Set();

function setBrushUI() {
  brushVal.textContent = String(brush.value);
}
setBrushUI();
brush.addEventListener("input", setBrushUI);

function setBrushSize(size) {
  brush.value = String(Math.max(Number(brush.min), Math.min(Number(brush.max), size)));
  setBrushUI();
}

btnBrushSmall?.addEventListener("click", () => setBrushSize(14));
btnBrushLarge?.addEventListener("click", () => setBrushSize(42));

function setPaintTool(tool) {
  currentPaintTool = tool || "pencil";
  eraseMode = false;
  btnErase.textContent = "Borrar";
  btnErase.classList.remove("active");
  paintToolButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.paintTool === currentPaintTool);
  });
}

function setPaintColor(color) {
  currentPaintColor = paintColorMeta[color] ? color : "red";
  paintColorButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.paintColor === currentPaintColor);
  });
}

paintToolButtons.forEach((btn) => {
  btn.addEventListener("click", () => setPaintTool(btn.dataset.paintTool));
});

paintColorButtons.forEach((btn) => {
  btn.addEventListener("click", () => setPaintColor(btn.dataset.paintColor));
});

btnErase.addEventListener("click", () => {
  eraseMode = !eraseMode;
  btnErase.textContent = eraseMode ? "Pintar" : "Borrar";
  btnErase.classList.toggle("active", eraseMode);
});

btnClear.addEventListener("click", () => {
  saveMaskHistory();
  clearMask();
  renderOverlay();
});

btnUndoPaint?.addEventListener("click", () => {
  restoreMaskHistory();
});

function saveMaskHistory() {
  if (!maskCanvas.width || !maskCanvas.height) return;
  maskHistory.push({
    mask: mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height),
    annotation: actx.getImageData(0, 0, annotationCanvas.width, annotationCanvas.height),
    colors: Array.from(usedPaintColors),
  });
  if (maskHistory.length > MAX_MASK_HISTORY) maskHistory.shift();
}

function restoreMaskHistory() {
  const previous = maskHistory.pop();
  if (!previous) return;
  mctx.putImageData(previous.mask, 0, 0);
  actx.putImageData(previous.annotation, 0, 0);
  usedPaintColors.clear();
  previous.colors.forEach((color) => usedPaintColors.add(color));
  renderOverlay();
}

function clearMask() {
  mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  mctx.fillStyle = "rgba(0,0,0,1)";
  mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  actx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
  usedPaintColors.clear();
}

function resizeCanvasesToImage() {
  const rect = paintBase.getBoundingClientRect();
  paintCanvas.width = Math.max(1, Math.floor(rect.width));
  paintCanvas.height = Math.max(1, Math.floor(rect.height));

  maskCanvas.width = imgNaturalW;
  maskCanvas.height = imgNaturalH;
  annotationCanvas.width = imgNaturalW;
  annotationCanvas.height = imgNaturalH;
  maskHistory.length = 0;
  clearMask();
  renderOverlay();
}

function renderOverlay() {
  pctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  if (!imgNaturalW || !imgNaturalH) return;

  const scaleX = paintCanvas.width / imgNaturalW;
  const scaleY = paintCanvas.height / imgNaturalH;
  pctx.drawImage(annotationCanvas, 0, 0, paintCanvas.width, paintCanvas.height);

  if (shapeStartPoint && shapePreviewPoint && (currentPaintTool === "line" || currentPaintTool === "circle")) {
    pctx.save();
    pctx.scale(scaleX, scaleY);
    drawVisualShape(pctx, shapeStartPoint, shapePreviewPoint, Number(brush.value), {
      preview: true,
      tool: currentPaintTool,
      color: currentPaintColor,
    });
    pctx.restore();
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

function drawMaskCircle(mx, my, radius) {
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

function drawMaskLine(from, to, radius) {
  if (!from) {
    drawMaskCircle(to.mx, to.my, radius);
    return;
  }

  const dx = to.mx - from.mx;
  const dy = to.my - from.my;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(distance / Math.max(2, radius * 0.45)));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    drawMaskCircle(from.mx + dx * t, from.my + dy * t, radius);
  }
}

function toolRadius() {
  const base = Number(brush.value) || 22;
  if (currentPaintTool === "pencil") return Math.max(3, base * 0.45);
  if (currentPaintTool === "marker") return base;
  if (currentPaintTool === "line") return Math.max(4, base * 0.55);
  return Math.max(3, base * 0.5);
}

function drawAnnotationCircle(mx, my, radius) {
  if (eraseMode) {
    actx.save();
    actx.globalCompositeOperation = "destination-out";
    actx.beginPath();
    actx.arc(mx, my, radius * 1.45, 0, Math.PI * 2);
    actx.fill();
    actx.restore();
    return;
  }

  const meta = paintColorMeta[currentPaintColor] || paintColorMeta.red;
  usedPaintColors.add(currentPaintColor);
  actx.save();
  actx.globalCompositeOperation = "source-over";
  actx.fillStyle = meta.rgba;
  actx.beginPath();
  actx.arc(mx, my, radius, 0, Math.PI * 2);
  actx.fill();
  actx.restore();
}

function drawAnnotationLine(from, to, radius) {
  if (!from) {
    drawAnnotationCircle(to.mx, to.my, radius);
    return;
  }

  const dx = to.mx - from.mx;
  const dy = to.my - from.my;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(distance / Math.max(2, radius * 0.45)));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    drawAnnotationCircle(from.mx + dx * t, from.my + dy * t, radius);
  }
}

function drawVisualShape(ctx, from, to, radius, options = {}) {
  const tool = options.tool || currentPaintTool;
  const color = paintColorMeta[options.color || currentPaintColor] || paintColorMeta.red;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(4, radius * 1.4);
  ctx.strokeStyle = color.solid;
  ctx.fillStyle = color.rgba;
  ctx.globalAlpha = options.preview ? 0.82 : 1;

  if (tool === "line") {
    ctx.beginPath();
    ctx.moveTo(from.mx, from.my);
    ctx.lineTo(to.mx, to.my);
    ctx.stroke();
  }

  if (tool === "circle") {
    const dx = to.mx - from.mx;
    const dy = to.my - from.my;
    const r = Math.max(radius, Math.sqrt(dx * dx + dy * dy));
    ctx.beginPath();
    ctx.arc(from.mx, from.my, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function commitShape(from, to) {
  const radius = toolRadius();
  if (currentPaintTool === "line") {
    drawMaskLine(from, to, radius);
    if (eraseMode) {
      drawAnnotationLine(from, to, radius * 1.45);
    } else {
      drawVisualShape(actx, from, to, radius, { tool: "line", color: currentPaintColor });
      usedPaintColors.add(currentPaintColor);
    }
    return;
  }

  if (currentPaintTool === "circle") {
    const dx = to.mx - from.mx;
    const dy = to.my - from.my;
    const circleRadius = Math.max(radius, Math.sqrt(dx * dx + dy * dy));

    if (!eraseMode) {
      mctx.save();
      mctx.globalCompositeOperation = "destination-out";
      mctx.beginPath();
      mctx.arc(from.mx, from.my, circleRadius, 0, Math.PI * 2);
      mctx.fill();
      mctx.restore();
      drawVisualShape(actx, from, to, radius, { tool: "circle", color: currentPaintColor });
      usedPaintColors.add(currentPaintColor);
    } else {
      mctx.save();
      mctx.globalCompositeOperation = "source-over";
      mctx.fillStyle = "rgba(0,0,0,1)";
      mctx.beginPath();
      mctx.arc(from.mx, from.my, circleRadius + radius, 0, Math.PI * 2);
      mctx.fill();
      mctx.restore();
      actx.save();
      actx.globalCompositeOperation = "destination-out";
      actx.beginPath();
      actx.arc(from.mx, from.my, circleRadius + radius * 1.4, 0, Math.PI * 2);
      actx.fill();
      actx.restore();
    }
  }
}

paintCanvas.addEventListener("pointerdown", (e) => {
  if (!imgNaturalW) return;
  if (!usePaint.checked) return;

  e.preventDefault();
  saveMaskHistory();
  drawing = true;
  paintCanvas.setPointerCapture(e.pointerId);
  lastStrokePoint = getPosOnCanvas(e);

  if (currentPaintTool === "line" || currentPaintTool === "circle") {
    shapeStartPoint = lastStrokePoint;
    shapePreviewPoint = lastStrokePoint;
  } else {
    const radius = toolRadius();
    drawMaskCircle(lastStrokePoint.mx, lastStrokePoint.my, radius);
    drawAnnotationCircle(lastStrokePoint.mx, lastStrokePoint.my, radius);
  }

  renderOverlay();
});

paintCanvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  e.preventDefault();
  const point = getPosOnCanvas(e);

  if (currentPaintTool === "line" || currentPaintTool === "circle") {
    shapePreviewPoint = point;
  } else {
    const radius = toolRadius();
    drawMaskLine(lastStrokePoint, point, radius);
    drawAnnotationLine(lastStrokePoint, point, radius);
    lastStrokePoint = point;
  }

  renderOverlay();
});

paintCanvas.addEventListener("pointerup", (e) => {
  if (drawing && shapeStartPoint && (currentPaintTool === "line" || currentPaintTool === "circle")) {
    commitShape(shapeStartPoint, getPosOnCanvas(e));
  }
  drawing = false;
  lastStrokePoint = null;
  shapeStartPoint = null;
  shapePreviewPoint = null;
  renderOverlay();
  updateSidebarWorkspaceControls();
});
paintCanvas.addEventListener("pointercancel", () => {
  drawing = false;
  lastStrokePoint = null;
  shapeStartPoint = null;
  shapePreviewPoint = null;
  renderOverlay();
  updateSidebarWorkspaceControls();
});

function getMaskStats() {
  if (!maskCanvas.width || !maskCanvas.height) return false;
  const imgData = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const data = imgData.data;
  let minX = maskCanvas.width;
  let minY = maskCanvas.height;
  let maxX = -1;
  let maxY = -1;
  let edited = 0;

  const sample = Math.max(1, Math.round(Math.max(maskCanvas.width, maskCanvas.height) / 1200));
  for (let y = 0; y < maskCanvas.height; y += sample) {
    for (let x = 0; x < maskCanvas.width; x += sample) {
      const i = (y * maskCanvas.width + x) * 4;
      if (data[i + 3] === 0) {
        edited += sample * sample;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < 0) return null;

  return {
    minX,
    minY,
    maxX: Math.min(maskCanvas.width, maxX + sample),
    maxY: Math.min(maskCanvas.height, maxY + sample),
    percent: Math.min(100, (edited / (maskCanvas.width * maskCanvas.height)) * 100),
    width: maskCanvas.width,
    height: maskCanvas.height,
  };
}

function maskHasEdits() {
  return Boolean(getMaskStats());
}

function describePaintColors() {
  if (!usedPaintColors.size) return "";
  const colorText = Array.from(usedPaintColors)
    .map((color) => paintColorMeta[color])
    .filter(Boolean)
    .map((meta) => `${meta.label}: ${meta.meaning}`)
    .join("; ");

  return colorText ? `Colores usados en Paint: ${colorText}.` : "";
}

function describeMaskZone() {
  const stats = getMaskStats();
  if (!stats) return "";

  const cx = ((stats.minX + stats.maxX) / 2) / stats.width;
  const cy = ((stats.minY + stats.maxY) / 2) / stats.height;
  const h = cx < 0.34 ? "izquierda" : cx > 0.66 ? "derecha" : "centro";
  const v = cy < 0.34 ? "superior" : cy > 0.66 ? "inferior" : "media";
  const boxW = Math.round(((stats.maxX - stats.minX) / stats.width) * 100);
  const boxH = Math.round(((stats.maxY - stats.minY) / stats.height) * 100);

  return [
    `Zona pintada: sector ${v} ${h} de la imagen.`,
    `Caja aproximada: x ${Math.round((stats.minX / stats.width) * 100)}% a ${Math.round((stats.maxX / stats.width) * 100)}%, y ${Math.round((stats.minY / stats.height) * 100)}% a ${Math.round((stats.maxY / stats.height) * 100)}%.`,
    `Tamaño de la zona: ${boxW}% del ancho por ${boxH}% del alto; área pintada aproximada ${stats.percent.toFixed(1)}%.`,
    describePaintColors(),
    "Solo el área transparente de la máscara debe editarse; el resto debe quedar igual.",
  ].filter(Boolean).join(" ");
}

function prepareMaskForUpload(targetWidth = maskCanvas.width, targetHeight = maskCanvas.height) {
  if (!maskCanvas.width || !maskCanvas.height) return null;
  // GPT Image edita los píxeles totalmente transparentes de la máscara.
  if (targetWidth === maskCanvas.width && targetHeight === maskCanvas.height) return maskCanvas;

  const uploadCanvas = document.createElement("canvas");
  uploadCanvas.width = targetWidth;
  uploadCanvas.height = targetHeight;
  const uctx = uploadCanvas.getContext("2d", { willReadFrequently: true });
  uctx.imageSmoothingEnabled = true;
  uctx.drawImage(maskCanvas, 0, 0, targetWidth, targetHeight);

  const imgData = uctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 220) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    } else {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }
  uctx.putImageData(imgData, 0, 0);
  return uploadCanvas;
}

function maskBlobPNG(targetWidth, targetHeight) {
  const uploadCanvas = prepareMaskForUpload(targetWidth, targetHeight);
  return new Promise((resolve) => {
    if (!uploadCanvas) return resolve(null);
    uploadCanvas.toBlob((b) => resolve(b), "image/png");
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
  updatePrecisionSummary();
  updateSidebarWorkspaceControls();

  if (paintOn && imgNaturalW) setTimeout(resizeCanvasesToImage, 0);
}
btnModeSimple.addEventListener("click", () => setMode(false));
btnModePaint.addEventListener("click", () => setMode(true));
setMode(false);

[keepGeometryEl, keepDimensionsEl, strictEditScopeEl, editScopeEl, stylePresetEl].forEach((el) => {
  el?.addEventListener("change", () => {
    updatePrecisionSummary();
    updateSidebarWorkspaceControls();
  });
});

const STYLE_LABELS = {
  color: {
    claro: "claros y neutros",
    oscuro: "oscuros profundos",
    tierra: "tonos tierra",
    vibrante: "colores vibrantes",
    pastel: "pasteles suaves",
  },
  material: {
    madera: "madera",
    metal: "metal",
    marmol: "marmol",
    hormigon: "hormigon",
    vidrio: "vidrio",
  },
  estetica: {
    minimalista: "minimalista",
    moderno: "moderna",
    cargado: "decorativa",
    clasico: "clasica",
  },
  espacio: {
    living: "living",
    cocina: "cocina",
    bano: "bano",
    dormitorio: "dormitorio",
    oficina: "oficina",
  },
};

const STYLE_LIBRARY = [
  {
    name: "Japandi cálido",
    matches: {
      color: ["claro", "tierra"],
      material: ["madera"],
      estetica: ["minimalista"],
      espacio: ["living", "dormitorio"],
    },
    summary: "Una mezcla serena entre calidez natural y limpieza visual, ideal para mostrar un espacio premium sin ruido.",
    points: [
      "Madera natural, textiles nobles y pocos acentos oscuros.",
      "Composicion despejada con atmosfera calma.",
      "Muy bueno para livings y dormitorios con tono premium.",
    ],
    prompt: "Aplicar un estilo Japandi cálido con madera natural, paleta neutra y tonos tierra suaves, composición limpia, textiles nobles y pocos acentos oscuros, manteniendo una lectura serena y elegante.",
  },
  {
    name: "Industrial elegante",
    matches: {
      color: ["oscuro"],
      material: ["metal", "hormigon"],
      estetica: ["moderno", "minimalista"],
      espacio: ["oficina", "cocina", "living"],
    },
    summary: "Una direccion mas urbana y sofisticada, con peso material y un aire de estudio contemporaneo.",
    points: [
      "Metal negro, hormigon limpio y madera oscura.",
      "Contraste alto sin perder orden visual.",
      "Ideal para oficinas y areas sociales con caracter.",
    ],
    prompt: "Aplicar un estilo industrial elegante con metal negro, hormigón refinado, madera oscura y una composición ordenada, sobria y contemporánea, sin sobrecargar el ambiente.",
  },
  {
    name: "Nórdico soft",
    matches: {
      color: ["pastel", "claro"],
      material: ["madera", "vidrio"],
      estetica: ["minimalista", "moderno"],
      espacio: ["dormitorio", "living", "bano"],
    },
    summary: "Una direccion luminosa y amable, pensada para dar claridad, frescura y una sensacion muy habitable.",
    points: [
      "Paleta suave, maderas claras y blancos rotos.",
      "Texturas livianas y atmosfera limpia.",
      "Perfecto para espacios donde la luz sea protagonista.",
    ],
    prompt: "Aplicar un estilo nordico soft con tonos claros, maderas suaves, blancos rotos y textiles livianos, priorizando luminosidad, calma y una sensacion fresca y habitable.",
  },
  {
    name: "Contemporaneo petreo",
    matches: {
      color: ["oscuro", "tierra"],
      material: ["marmol", "hormigon"],
      estetica: ["moderno"],
      espacio: ["cocina", "bano", "living"],
    },
    summary: "Se apoya en materiales nobles de presencia fuerte para lograr una imagen sobria, solida y muy arquitectonica.",
    points: [
      "Piedra, marmol o superficies minerales bien definidas.",
      "Menos decoración, más materialidad protagonista.",
      "Ideal para cocinas, banos y areas de recepcion.",
    ],
    prompt: "Aplicar un estilo contemporáneo pétreo con materiales minerales nobles, presencia de mármol u hormigón refinado, tonos profundos y una composición arquitectónica sobria y precisa.",
  },
  {
    name: "Clasico sereno",
    matches: {
      color: ["claro", "tierra"],
      material: ["marmol", "madera"],
      estetica: ["clasico"],
      espacio: ["living", "dormitorio"],
    },
    summary: "Toma referencias clasicas pero las mantiene medidas, elegantes y actuales, sin caer en exceso ornamental.",
    points: [
      "Detalles clasicos controlados y simetria suave.",
      "Materiales nobles con una paleta calma.",
      "Perfecto para una elegancia mas tradicional.",
    ],
    prompt: "Aplicar un estilo clásico sereno con materiales nobles, detalles sutiles, paleta cálida controlada y una composición elegante sin exceso ornamental.",
  },
  {
    name: "Minimalismo ejecutivo",
    matches: {
      color: ["oscuro", "claro"],
      material: ["metal", "vidrio", "madera"],
      estetica: ["minimalista"],
      espacio: ["oficina"],
    },
    summary: "Un lenguaje limpio, profesional y muy enfocado, pensado para que el espacio se vea premium y funcional.",
    points: [
      "Lineas limpias, pocos objetos y contraste controlado.",
      "Materiales sobrios con terminacion prolija.",
      "Ideal para oficinas y estudios privados.",
    ],
    prompt: "Aplicar un estilo de minimalismo ejecutivo con lineas limpias, pocos objetos, materiales sobrios y una imagen profesional, refinada y funcional.",
  },
];

function getStyleSelections() {
  return {
    color: document.getElementById("q-color")?.value || "",
    material: document.getElementById("q-material")?.value || "",
    estetica: document.getElementById("q-estetica")?.value || "",
    espacio: document.getElementById("q-espacio")?.value || "",
  };
}

function scoreStyleProfile(profile, selections) {
  let score = 0;
  for (const key of Object.keys(profile.matches)) {
    const wanted = profile.matches[key] || [];
    const actual = selections[key];
    if (wanted.includes(actual)) score += 3;
  }
  return score;
}

function buildFallbackStyle(selections) {
  const color = STYLE_LABELS.color[selections.color] || "tonos equilibrados";
  const material = STYLE_LABELS.material[selections.material] || "materiales nobles";
  const estetica = STYLE_LABELS.estetica[selections.estetica] || "contemporanea";
  const espacio = STYLE_LABELS.espacio[selections.espacio] || "espacio";

  return {
    name: "Estudio contemporaneo",
    summary: "No cae en una etiqueta cerrada; arma una direccion mas a medida a partir de tus elecciones actuales.",
    points: [
      `Paleta base sugerida: ${color}.`,
      `Material protagonista: ${material}.`,
      `Lectura general: ${estetica} para ${espacio}.`,
    ],
    prompt: `Aplicar un estilo contemporaneo a medida para ${espacio}, con paleta ${color}, materialidad protagonista en ${material} y una lectura ${estetica}, manteniendo un resultado sobrio, profesional y coherente.`,
  };
}

function discoverStyleProfile(selections) {
  let best = null;
  let bestScore = -1;

  for (const profile of STYLE_LIBRARY) {
    const score = scoreStyleProfile(profile, selections);
    if (score > bestScore) {
      best = profile;
      bestScore = score;
    }
  }

  return bestScore >= 6 && best ? best : buildFallbackStyle(selections);
}

function renderStyleResult(profile) {
  if (!styleResultEl) return;
  styleResultEl.dataset.prompt = profile.prompt;
  styleResultEl.innerHTML = `
    <div class="styleResultHead">
      <div class="styleResultTitle">Perfil sugerido</div>
      <span class="styleBadge">${profile.name}</span>
    </div>
    <p class="styleSummary">${profile.summary}</p>
    <ul class="stylePoints">
      ${profile.points.map((point) => `<li>${point}</li>`).join("")}
    </ul>
    <button type="button" class="sbMiniBtn styleApplyBtn" data-apply-style="1">Pasar al pedido</button>
  `;
}

function handleStyleDiscover() {
  const selections = getStyleSelections();
  if (!selections.color || !selections.material || !selections.estetica || !selections.espacio) {
    if (styleResultEl) {
      styleResultEl.removeAttribute("data-prompt");
      styleResultEl.textContent = "Completa las cuatro senales y te propongo una direccion mas precisa.";
    }
    return;
  }

  renderStyleResult(discoverStyleProfile(selections));
}

styleDiscoverBtn?.addEventListener("click", handleStyleDiscover);

styleResultEl?.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-apply-style]");
  if (!trigger) return;

  const stylePrompt = styleResultEl.dataset.prompt || "";
  if (!stylePrompt) return;

  const currentText = collapseWhitespace(textoEl.value);
  textoEl.value = currentText ? `${currentText}\n\n${stylePrompt}` : stylePrompt;
  textoEl.focus();
  textoEl.setSelectionRange(textoEl.value.length, textoEl.value.length);

  document.querySelector(".toolCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (estado) estado.textContent = "Sugerencia de estilo aplicada al pedido.";
});

["q-color", "q-material", "q-estetica", "q-espacio"].forEach((id) => {
  document.getElementById(id)?.addEventListener("change", () => {
    if (!styleResultEl) return;
    styleResultEl.removeAttribute("data-prompt");
    styleResultEl.textContent = "Actualiza la combinacion y volve a descubrir tu estilo.";
  });
});

queueMicrotask(() => {
  const currentBtn = document.getElementById("calcularEstilo");
  if (!currentBtn || !currentBtn.parentNode) return;

  const freshBtn = currentBtn.cloneNode(true);
  currentBtn.parentNode.replaceChild(freshBtn, currentBtn);
  freshBtn.addEventListener("click", handleStyleDiscover);
});

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

function projectLastVersion(project) {
  return Array.isArray(project?.versions) && project.versions.length ? project.versions[0] : null;
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
  const latest = projectLastVersion(p);
  return latest?.resultThumb || latest?.originalThumb || latest?.resultUrl || latest?.originalUrl || "";
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
          <button class="sbMiniBtn projFav" type="button" title="Favorito">${p.favorite ? "Favorito" : "Marcar"}</button>
          <button class="sbMiniBtn projDel" type="button" title="Borrar">Borrar</button>
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
      restoreCurrentProjectState().catch((err) => {
        console.error(err);
      });
    });
  });

  renderProjectHistory();
  updateSidebarWorkspaceControls();
}

function versionThumb(version) {
  return version?.resultThumb || version?.resultUrl || version?.originalThumb || version?.originalUrl || "";
}

function renderProjectHistory() {
  if (!projectHistoryList) return;

  const project = findProjectById(loadProjects(), getCurrentProjectId());
  const versions = Array.isArray(project?.versions) ? project.versions : [];
  if (historyCount) historyCount.textContent = String(versions.length);

  if (!project || !versions.length) {
    projectHistoryList.innerHTML = `<div class="muted small">Todavía no hay versiones guardadas.</div>`;
    return;
  }

  projectHistoryList.innerHTML = versions
    .map((version, index) => {
      const thumb = versionThumb(version);
      const title = truncateText(version.prompt || `Version ${versions.length - index}`, 48);
      const mode = version.mode ? ` · ${version.mode}` : "";
      return `
        <button class="historyRow" type="button" data-version-id="${version.id}">
          <img class="historyThumb" src="${withCacheBust(thumb, version.createdAt || Date.now())}" alt="Version ${index + 1}" onerror="this.style.display='none'">
          <span>
            <p class="historyTitle">${escapeHtml(title)}</p>
            <div class="historyMeta">${escapeHtml(formatDate(version.createdAt))}${escapeHtml(mode)}</div>
          </span>
        </button>
      `;
    })
    .join("");

  projectHistoryList.querySelectorAll(".historyRow").forEach((row) => {
    row.addEventListener("click", async () => {
      const versionId = row.getAttribute("data-version-id");
      if (!versionId) return;
      await restoreProjectVersion(versionId);
      if (isMobile()) closeSidebarDrawer();
    });
  });
}

function updateSidebarWorkspaceControls() {
  const hasResult = Boolean(resultadoUrlFinal || imagenResultadoEl?.src);
  const hasOriginal = Boolean(originalBaseFile || originalObjectUrl);
  if (sbUseResult) sbUseResult.disabled = !hasResult;
  if (sbVideo) sbVideo.disabled = !hasResult;
  if (sbZip) sbZip.disabled = !hasResult;
  if (sbBackOriginal) sbBackOriginal.disabled = !hasOriginal;

  document.querySelectorAll(".scopeQuick").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-scope") === (editScopeEl?.value || "auto"));
  });

  if (sidebarEditState) {
    const scope = editScopeEl?.value || "auto";
    const paint = usePaint?.checked ? "Paint activo" : "Paint apagado";
    const ref = inputReferencia?.files?.length ? "Referencia cargada" : "Sin referencia";
    sidebarEditState.textContent = `Alcance: ${scope}. ${paint}. ${ref}.`;
  }

  renderRequestChecklist();
  renderSidebarImageInfo();
}

function renderRequestChecklist() {
  if (!requestChecklist) return;
  const text = collapseWhitespace(textoEl?.value || "");
  const hasImage = Boolean(inputImagen?.files?.[0] || originalObjectUrl);
  const scope = editScopeEl?.value || "auto";
  const paintReady = !usePaint?.checked || maskHasEdits();
  const hasConcreteText = text.length >= 12;

  const items = [
    { label: "Imagen base cargada", done: hasImage },
    { label: "Pedido escrito con suficiente detalle", done: hasConcreteText },
    { label: `Alcance definido: ${scope}`, done: Boolean(scope) },
    { label: usePaint?.checked ? "Zona Paint marcada" : "Paint opcional", done: paintReady },
  ];

  requestChecklist.innerHTML = items
    .map((item) => `
      <div class="checkItem ${item.done ? "?" : ""}">
        <span class="checkDot">${item.done ? "?" : ""}</span>
        <span>${escapeHtml(item.label)}</span>
      </div>
    `)
    .join("");
}

function renderSidebarImageInfo() {
  if (!sidebarImageInfo) return;
  const file = inputImagen?.files?.[0] || originalBaseFile;
  if (!file && !originalObjectUrl) {
    sidebarImageInfo.textContent = "Sin imagen cargada.";
    return;
  }

  const dims = imgNaturalW && imgNaturalH ? `${imgNaturalW} x ${imgNaturalH}px` : "Dimensiones cargando";
  const size = file?.size ? humanFileSize(file.size) : "peso no disponible";
  const name = file?.name || "imagen recuperada";
  const paint = usePaint?.checked ? "Paint activo" : "Paint apagado";
  sidebarImageInfo.textContent = `${name}\n${dims} · ${size}\n${paint}`;
}

async function selectProject(id) {
  setCurrentProjectId(id);
  syncCurrentProjectUI();
  renderSidebar();
  await restoreCurrentProjectState();
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

  // Si no existe proyecto actual pero hay proyectos, usar el primero.
  if (!p && list.length) {
    setCurrentProjectId(list[0].id);
    p = list[0];
  }

  // Si no hay proyectos, crear uno automaticamente.
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


function setImageVisibility(imgEl, src, fallbackSrc = "") {
  if (!imgEl) return;
  if (!src) {
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
    if (imgEl === imagenResultadoEl) updateResultEmpty();
    return;
  }

  imgEl.style.display = "none";
  imgEl.onload = () => {
    imgEl.style.display = "block";
    if (imgEl === imagenResultadoEl) updateResultEmpty();
  };
  imgEl.onerror = () => {
    if (fallbackSrc && fallbackSrc !== src) {
      imgEl.onerror = () => {
        imgEl.removeAttribute("src");
        imgEl.style.display = "none";
        if (imgEl === imagenResultadoEl) updateResultEmpty();
      };
      if (imgEl === imagenResultadoEl && resultadoUrlFinal === src) {
        resultadoUrlFinal = fallbackSrc;
        setDownloadResult(fallbackSrc);
      }
      imgEl.src = fallbackSrc;
      return;
    }
    if (imgEl === imagenResultadoEl) {
      resultadoUrlFinal = "";
      setDownloadResult("");
      if (btnUseResult) btnUseResult.disabled = true;
      if (btnVideo) btnVideo.disabled = true;
      if (btnZip) btnZip.disabled = true;
    }
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
    if (imgEl === imagenResultadoEl) updateResultEmpty();
  };
  imgEl.src = src;
}

function setPaintBaseSource(src, fallbackSrc = "") {
  const finalSrc = src || fallbackSrc;
  if (!finalSrc) {
    paintBase.removeAttribute("src");
    imgNaturalW = 0;
    imgNaturalH = 0;
    return;
  }

  paintBase.onload = () => {
    imgNaturalW = paintBase.naturalWidth;
    imgNaturalH = paintBase.naturalHeight;
    if (usePaint.checked) setTimeout(resizeCanvasesToImage, 0);
    updateSidebarWorkspaceControls();
  };
  paintBase.onerror = () => {
    if (fallbackSrc && paintBase.src !== fallbackSrc) {
      paintBase.src = fallbackSrc;
      return;
    }
    paintBase.removeAttribute("src");
    imgNaturalW = 0;
    imgNaturalH = 0;
    updateSidebarWorkspaceControls();
  };
  paintBase.src = finalSrc;
}

function clearCurrentWorkspace() {
  textoEl.value = "";
  if (estado) estado.textContent = "";
  if (recomendacionEl) recomendacionEl.textContent = "-";
  setMetaText(fileMeta, "Todavía no cargaste una imagen base.");
  setMetaText(referenceMeta, "Sin imagen de referencia adicional.");

  setImageVisibility(imagenResultadoEl, "");
  setImageVisibility(preview, "");
  setImageVisibility(previewReferencia, "");
  setDownloadResult("");
  clearError();
  clearSizeCheck();

  resultadoUrlFinal = "";
  resetVideoUI();
  hideCompare();

  if (btnUseResult) btnUseResult.disabled = true;
  if (btnBackToOriginal) btnBackToOriginal.disabled = true;
  if (btnVideo) btnVideo.disabled = true;
  if (btnZip) btnZip.disabled = true;

  revokeIfBlobUrl(originalObjectUrl);
  originalObjectUrl = "";
  originalBaseFile = null;
  currentOriginalThumb = "";

  inputImagen.value = "";
  if (inputReferencia) inputReferencia.value = "";
  updateUploadDropzone(null);

  paintBase.removeAttribute("src");
  imgNaturalW = 0;
  imgNaturalH = 0;
  updatePrecisionSummary();
}

async function hydrateInputFromStoredUrl(url, filename = "proyecto-base.png") {
  const res = await fetch(withCacheBust(url), { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo recuperar la imagen original");

  const blob = await res.blob();
  const file = new File([blob], filename, { type: blob.type || "image/png" });

  const dt = new DataTransfer();
  dt.items.add(file);
  inputImagen.files = dt.files;
  originalBaseFile = file;
  updateUploadDropzone(file);
  setMetaText(fileMeta, describeImageFile(file, "Imagen base recuperada."));

  try {
    currentOriginalThumb = await fileToThumbDataUrl(file);
  } catch {
    currentOriginalThumb = "";
  }

  setMetaText(fileMeta, describeImageFile(file, "Imagen base cargada."));

  revokeIfBlobUrl(originalObjectUrl);
  originalObjectUrl = URL.createObjectURL(file);
  setImageVisibility(preview, originalObjectUrl);

  paintBase.onload = () => {
    imgNaturalW = paintBase.naturalWidth;
    imgNaturalH = paintBase.naturalHeight;
    if (usePaint.checked) setTimeout(resizeCanvasesToImage, 0);
    updateSidebarWorkspaceControls();
  };
  paintBase.src = originalObjectUrl;

  if (btnBackToOriginal) btnBackToOriginal.disabled = false;
}

async function restoreCurrentProjectState() {
  const list = loadProjects();
  const currentId = getCurrentProjectId();
  const project = findProjectById(list, currentId);
  const latest = projectLastVersion(project);

  if (!project) {
    clearCurrentWorkspace();
    return;
  }

  proyectoEl.value = project.name || "Proyecto sin nombre";

  if (!latest) {
    clearCurrentWorkspace();
    proyectoEl.value = project.name || "Proyecto sin nombre";
    return;
  }

  textoEl.value = latest.prompt || "";
  if (estado) estado.textContent = "";
  if (recomendacionEl) recomendacionEl.textContent = latest.recommendation || "-";
  setMetaText(fileMeta, latest.originalName ? `Proyecto recuperado: ${latest.originalName}` : "Imagen base recuperada.");
  setMetaText(referenceMeta, "Sin imagen de referencia guardada.");

  const originalSrc = latest.originalUrl ? withCacheBust(latest.originalUrl, latest.createdAt || Date.now()) : "";
  const resultSrc = latest.resultUrl ? withCacheBust(latest.resultUrl, latest.createdAt || Date.now()) : "";
  const resultFallback = latest.resultThumb || "";
  const visibleResultSrc = resultSrc || resultFallback;

  setImageVisibility(imagenResultadoEl, visibleResultSrc, resultFallback);
  resultadoUrlFinal = visibleResultSrc;
  setDownloadResult(visibleResultSrc);
  if (resultSrc && !resultFallback) {
    ensureStoredResultThumb(latest.id, resultSrc);
  }
  resetVideoUI();

  if (btnUseResult) btnUseResult.disabled = !visibleResultSrc;
  if (btnVideo) btnVideo.disabled = !visibleResultSrc;
  if (btnZip) btnZip.disabled = !visibleResultSrc;

  currentOriginalThumb = latest.originalThumb || "";
  setImageVisibility(preview, originalSrc || currentOriginalThumb || "", currentOriginalThumb);

  setPaintBaseSource(originalSrc, currentOriginalThumb);

  if ((originalSrc || currentOriginalThumb) && visibleResultSrc) {
    showCompare(originalSrc || currentOriginalThumb, visibleResultSrc);
  } else {
    hideCompare();
  }

  inputImagen.value = "";
  originalBaseFile = null;
  if (btnBackToOriginal) btnBackToOriginal.disabled = true;

  if (latest.originalUrl) {
    try {
      await hydrateInputFromStoredUrl(latest.originalUrl, latest.originalName || "proyecto-base.png");
      if (visibleResultSrc) showCompare(originalObjectUrl || originalSrc || currentOriginalThumb, visibleResultSrc);
    } catch (err) {
      console.error(err);
    }
  }

  updatePrecisionSummary(latest.mode || "");
}

async function restoreProjectVersion(versionId) {
  const list = loadProjects();
  const project = findProjectById(list, getCurrentProjectId());
  const version = project?.versions?.find((item) => item.id === versionId);
  if (!project || !version) return;

  proyectoEl.value = project.name || "Proyecto sin nombre";
  textoEl.value = version.prompt || "";
  if (estado) estado.textContent = `Version recuperada: ${formatDate(version.createdAt)}`;
  if (recomendacionEl) recomendacionEl.textContent = version.recommendation || "-";

  const originalSrc = version.originalUrl ? withCacheBust(version.originalUrl, version.createdAt || Date.now()) : "";
  const resultSrc = version.resultUrl ? withCacheBust(version.resultUrl, version.createdAt || Date.now()) : "";
  const resultFallback = version.resultThumb || "";
  const visibleResultSrc = resultSrc || resultFallback;

  resultadoUrlFinal = visibleResultSrc;
  setImageVisibility(imagenResultadoEl, visibleResultSrc, resultFallback);
  setDownloadResult(visibleResultSrc);
  if (resultSrc && !resultFallback) {
    ensureStoredResultThumb(version.id, resultSrc);
  }
  currentOriginalThumb = version.originalThumb || "";
  setImageVisibility(preview, originalSrc || currentOriginalThumb || "", currentOriginalThumb);

  resetVideoUI();
  if (btnUseResult) btnUseResult.disabled = !visibleResultSrc;
  if (btnVideo) btnVideo.disabled = !visibleResultSrc;
  if (btnZip) btnZip.disabled = !visibleResultSrc;

  setPaintBaseSource(originalSrc, currentOriginalThumb);

  if ((originalSrc || currentOriginalThumb) && visibleResultSrc) {
    showCompare(originalSrc || currentOriginalThumb, visibleResultSrc);
  } else {
    hideCompare();
    clearSizeCheck();
  }

  if (version.originalUrl) {
    try {
      await hydrateInputFromStoredUrl(version.originalUrl, version.originalName || "proyecto-base.png");
      if (visibleResultSrc) showCompare(originalObjectUrl || originalSrc || currentOriginalThumb, visibleResultSrc);
    } catch (err) {
      console.error(err);
    }
  }

  updatePrecisionSummary(version.mode || "");
  updateSidebarWorkspaceControls();
}

function persistCurrentProjectName() {
  const clean = (proyectoEl.value || "").trim() || "Proyecto sin nombre";
  const list = loadProjects();
  const project = findProjectById(list, getCurrentProjectId());
  if (!project) return;

  project.name = clean;
  project.updatedAt = Date.now();
  saveProjects(list);
  syncCurrentProjectUI();
  renderSidebar();
}

function saveCurrentVersion(versionData) {
  const cleanName = (proyectoEl.value || "").trim() || "Proyecto sin nombre";
  const list = loadProjects();
  let project = findProjectById(list, getCurrentProjectId());

  if (!project) {
    project = {
      id: uid(),
      name: cleanName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      favorite: false,
      versions: [],
    };
    list.unshift(project);
    setCurrentProjectId(project.id);
  }

  project.name = cleanName;
  project.updatedAt = Date.now();
  project.versions = Array.isArray(project.versions) ? project.versions : [];
  project.versions.unshift({
    id: uid(),
    createdAt: Date.now(),
    prompt: versionData.prompt || "",
    recommendation: versionData.recommendation || "",
    originalUrl: versionData.originalUrl || "",
    originalThumb: versionData.originalThumb || "",
    originalName: versionData.originalName || "",
    resultUrl: versionData.resultUrl || "",
    resultThumb: versionData.resultThumb || "",
    mode: versionData.mode || "",
  });
  project.versions = project.versions.slice(0, 12);

  saveProjects(list);
}

async function ensureStoredResultThumb(versionId, src) {
  if (!versionId || !src || String(src).startsWith("data:")) return;
  const list = loadProjects();
  let changed = false;

  for (const project of list) {
    const version = project.versions?.find((item) => item.id === versionId);
    if (!version || version.resultThumb) continue;

    try {
      const thumb = await imageUrlToThumbDataUrl(src);
      if (!thumb) return;
      version.resultThumb = thumb;
      changed = true;
      break;
    } catch {
      return;
    }
  }

  if (changed) {
    saveProjects(list);
    renderSidebar();
    renderProjectHistory();
  }
}

let renameTimer = 0;
proyectoEl?.addEventListener("input", () => {
  clearTimeout(renameTimer);
  renameTimer = setTimeout(() => {
    persistCurrentProjectName();
  }, 250);
});
proyectoEl?.addEventListener("blur", persistCurrentProjectName);


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
  clearCurrentWorkspace();

  textoEl.value = "";
  recomendacionEl.textContent = "-";
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
textoEl?.addEventListener("input", updateSidebarWorkspaceControls);

sbUseResult?.addEventListener("click", () => btnUseResult?.click());
sbBackOriginal?.addEventListener("click", () => btnBackToOriginal?.click());
sbVideo?.addEventListener("click", () => btnVideo?.click());
sbZip?.addEventListener("click", () => btnZip?.click());
btnOpenResult?.addEventListener("click", openResultLightbox);
btnCopyResult?.addEventListener("click", copyResultLink);
btnCloseLightbox?.addEventListener("click", closeResultLightbox);
resultLightbox?.addEventListener("click", (event) => {
  if (event.target === resultLightbox) closeResultLightbox();
});

document.querySelectorAll(".scopeQuick").forEach((btn) => {
  btn.addEventListener("click", () => {
    const scope = btn.getAttribute("data-scope") || "auto";
    if (editScopeEl) {
      editScopeEl.value = scope;
      editScopeEl.dispatchEvent(new Event("change"));
    }
    updateSidebarWorkspaceControls();
  });
});

/* =========================
   UI HELPERS
========================= */
function setLoading(on) {
  if (on) clearError();
  loader.style.display = on ? "block" : "none";
  if (resultLoading) resultLoading.style.display = on ? "flex" : "none";
  updateResultEmpty();
  boton.disabled = on;
  if (estado) estado.textContent = on ? "Generando imagen..." : "";
  boton.textContent = on ? "Diseñando..." : "Diseñar";
}

function niceError(msg) {
  if (estado) estado.textContent = "";
  if (errorBox) {
    errorBox.textContent = msg || "No se pudo generar la imagen.";
    errorBox.style.display = "block";
  }
}

function clearError() {
  if (!errorBox) return;
  errorBox.textContent = "";
  errorBox.style.display = "none";
}

function generationErrorMessage(err) {
  const raw = String(err?.message || "").trim();
  const msg = raw.toLowerCase();

  if (!raw) {
    return "No se pudo generar la imagen. Probá con una instrucción más concreta.";
  }

  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed")) {
    return "No se pudo conectar con el servidor. Revisá tu conexión y probá de nuevo.";
  }

  if (msg.includes("falta imagen") || msg.includes("seleccion")) {
    return "Seleccioná una imagen base antes de generar.";
  }

  if (msg.includes("descripcion") || msg.includes("instruccion") || msg.includes("interpretar")) {
    return "La IA no pudo interpretar el pedido. Probá escribirlo más concreto, por ejemplo: cambiar solo la pared del fondo a microcemento claro.";
  }

  if (msg.includes("mascara") || msg.includes("mask") || msg.includes("paint")) {
    return "La zona pintada no se pudo procesar. Volvé a pintar el área y probá otra vez.";
  }

  if (msg.includes("pesada") || msg.includes("large") || msg.includes("maximum") || msg.includes("12mb")) {
    return "La imagen es demasiado pesada. Probá con una versión más liviana.";
  }

  if (msg.includes("limite") || msg.includes("quota") || msg.includes("rate limit")) {
    return "La IA está con límite de uso en este momento. Esperá un poco y probá de nuevo.";
  }

  if (msg.includes("openai_api_key") || msg.includes("clave")) {
    return "La clave de IA del servidor no está funcionando. Revisá la variable OPENAI_API_KEY en Render.";
  }

  return raw;
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

function setDownloadResult(url) {
  if (!downloadResult) return;
  if (!url) {
    downloadResult.style.display = "none";
    downloadResult.removeAttribute("href");
    if (btnOpenResult) btnOpenResult.disabled = true;
    if (btnCopyResult) btnCopyResult.disabled = true;
    return;
  }
  downloadResult.href = url;
  downloadResult.download = resultFileName();
  downloadResult.style.display = "inline-flex";
  if (btnOpenResult) btnOpenResult.disabled = false;
  if (btnCopyResult) btnCopyResult.disabled = false;
}

function updateResultEmpty() {
  if (!resultEmpty) return;
  const hasResult = Boolean(resultadoUrlFinal || imagenResultadoEl?.src);
  const isLoading = resultLoading?.style.display === "flex";
  resultEmpty.style.display = hasResult || isLoading ? "none" : "grid";
}

function resultFileName() {
  const raw = (proyectoEl?.value || "resultado-ulises").trim().toLowerCase();
  const slug = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54) || "resultado-ulises";
  return `${slug}-resultado.png`;
}

function openResultLightbox() {
  if (!resultadoUrlFinal || !resultLightbox || !lightboxImage) return;
  lightboxImage.src = resultadoUrlFinal;
  if (lightboxMeta) lightboxMeta.textContent = proyectoEl?.value || "Vista ampliada";
  resultLightbox.classList.add("open");
  resultLightbox.setAttribute("aria-hidden", "false");
  lockBodyScroll();
}

function closeResultLightbox() {
  if (!resultLightbox) return;
  resultLightbox.classList.remove("open");
  resultLightbox.setAttribute("aria-hidden", "true");
  if (lightboxImage) lightboxImage.removeAttribute("src");
  unlockBodyScroll();
}

async function copyResultLink() {
  if (!resultadoUrlFinal) return;
  const absoluteUrl = new URL(resultadoUrlFinal, window.location.origin).href;
  try {
    await navigator.clipboard.writeText(absoluteUrl);
    if (estado) estado.textContent = "Link del resultado copiado.";
  } catch {
    niceError("No se pudo copiar el link. Abrilo en grande y copialo desde el navegador.");
  }
}

function updateUploadDropzone(file) {
  if (!uploadDropzone) return;
  uploadDropzone.classList.toggle("hasImage", Boolean(file || originalObjectUrl));
  const title = uploadDropzone.querySelector("strong");
  const detail = uploadDropzone.querySelector("small");
  if (!title || !detail) return;

  if (file) {
    title.textContent = "Imagen base cargada";
    detail.textContent = `${file.name} · ${humanFileSize(file.size)}`;
  } else {
    title.textContent = "Cargar imagen base";
    detail.textContent = "JPG, PNG o WEBP. La IA conserva encuadre y dimensiones.";
  }
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

function imageUrlToThumbDataUrl(src, maxW = 520) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) return resolve("");

      const outW = Math.min(maxW, w);
      const outH = Math.round((outW / w) * h);
      const c = document.createElement("canvas");
      c.width = outW;
      c.height = outH;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, outW, outH);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = src;
  });
}

/* =========================
   COMPARADOR (Antes/Después)
========================= */
let compareReady = false;

function syncCompareAspect() {
  if (!compareWrapper) return;
  const w = compareOriginal?.naturalWidth || compareResult?.naturalWidth || imgNaturalW;
  const h = compareOriginal?.naturalHeight || compareResult?.naturalHeight || imgNaturalH;
  if (w && h) {
    compareWrapper.style.aspectRatio = `${w} / ${h}`;
  }
}

function hideCompare() {
  if (!compareBox) return;
  compareBox.style.display = "none";
}

function showCompare(originalSrc, resultSrc) {
  if (!compareBox || !compareOriginal || !compareResult) return;

  compareOriginal.onerror = hideCompare;
  compareResult.onerror = hideCompare;
  compareOriginal.src = originalSrc || "";
  compareResult.src = resultSrc || "";
  compareOriginal.onload = syncCompareAspect;
  compareResult.onload = syncCompareAspect;

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

/* =========================
   REFERENCIA (CLICK + PREVIEW)
========================= */

const boxReferencia = document.getElementById("boxReferencia");


boxReferencia?.addEventListener("click", () => {
  inputReferencia?.click();
});

inputReferencia?.addEventListener("change", () => {
  const file = inputReferencia.files?.[0];

  if (!file) {
    if (previewReferencia) {
      previewReferencia.style.display = "none";
      previewReferencia.src = "";
    }
    setMetaText(referenceMeta, "Sin imagen de referencia adicional.");
    return;
  }

  const url = URL.createObjectURL(file);
  setMetaText(referenceMeta, describeImageFile(file, "Referencia cargada."));

  if (previewReferencia) {
    previewReferencia.src = url;
    previewReferencia.style.display = "block";
  }
  updateSidebarWorkspaceControls();
});

/* Input image */
inputImagen?.addEventListener("change", async () => {
  const file = inputImagen.files?.[0];
  if (!file) {
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
    setMetaText(fileMeta, "Todavía no cargaste una imagen base.");
    updateUploadDropzone(null);
    return;
  }

  originalBaseFile = file;
  updateUploadDropzone(file);
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

  revokeIfBlobUrl(originalObjectUrl);
  originalObjectUrl = URL.createObjectURL(file);

  if (preview) {
    preview.src = originalObjectUrl;
    preview.onload = () => {
      preview.style.display = "block";
    };
  }

  paintBase.onload = () => {
    imgNaturalW = paintBase.naturalWidth;
    imgNaturalH = paintBase.naturalHeight;
    if (usePaint.checked) setTimeout(resizeCanvasesToImage, 0);
    updateSidebarWorkspaceControls();
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

  revokeIfBlobUrl(originalObjectUrl);
  originalObjectUrl = URL.createObjectURL(originalBaseFile);
  setMetaText(fileMeta, describeImageFile(originalBaseFile, "Imagen base restaurada."));

  preview.src = originalObjectUrl;
  preview.style.display = "block";

  paintBase.onload = () => {
    imgNaturalW = paintBase.naturalWidth;
    imgNaturalH = paintBase.naturalHeight;
    if (usePaint.checked) setTimeout(resizeCanvasesToImage, 0);
    updateSidebarWorkspaceControls();
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
  originalBaseFile = file;
  updateUploadDropzone(file);
  setMetaText(fileMeta, `Nueva base desde resultado · ${humanFileSize(file.size)}`);

  resetVideoUI();
  resultadoUrlFinal = "";
  if (btnUseResult) btnUseResult.disabled = true;

  revokeIfBlobUrl(originalObjectUrl);
  originalObjectUrl = URL.createObjectURL(file);

  preview.src = originalObjectUrl;
  preview.style.display = "block";

  paintBase.onload = () => {
    imgNaturalW = paintBase.naturalWidth;
    imgNaturalH = paintBase.naturalHeight;
    if (usePaint.checked) setTimeout(resizeCanvasesToImage, 0);
    updateSidebarWorkspaceControls();
  };
  paintBase.src = originalObjectUrl;

  // Al usar el resultado como nueva base, ocultamos el comparador hasta generar otra versión.
  hideCompare();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

btnUseResult?.addEventListener("click", () => {
  usarResultadoComoBase().catch((err) => {
    console.error(err);
    niceError("No se pudo usar el resultado como base. Probá recargar y volver a intentar.");
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

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

async function optimizeImageFile(file, options = {}) {
  const maxSide = options.maxSide || 3200;
  const quality = options.quality || 0.96;
  const prefix = options.prefix || "optimized";
  const maxUploadBytes = options.maxUploadBytes || 18 * 1024 * 1024;
  const img = await loadImageFromFile(file);
  const sourceW = img.naturalWidth || img.width;
  const sourceH = img.naturalHeight || img.height;
  const shouldKeepOriginal =
    file.size <= maxUploadBytes &&
    Math.max(sourceW, sourceH) <= (options.keepOriginalMaxSide || 6500) &&
    !options.forceOptimize;

  if (shouldKeepOriginal) {
    return { file, sourceW, sourceH, uploadW: sourceW, uploadH: sourceH };
  }

  const scale = Math.min(1, maxSide / Math.max(sourceW, sourceH));
  const outW = Math.max(1, Math.round(sourceW * scale));
  const outH = Math.max(1, Math.round(sourceH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(img, 0, 0, outW, outH);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return { file, sourceW, sourceH, uploadW: sourceW, uploadH: sourceH };

  const baseName = String(file.name || prefix).replace(/\.[^.]+$/, "");
  const optimizedFile = new File([blob], `${baseName}_${prefix}.jpg`, { type: "image/jpeg" });

  if (optimizedFile.size >= file.size && scale === 1) {
    return { file, sourceW, sourceH, uploadW: sourceW, uploadH: sourceH };
  }

  return { file: optimizedFile, sourceW, sourceH, uploadW: outW, uploadH: outH };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function roundedRectPath(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawContainedImage(ctx, img, x, y, w, h, options = {}) {
  const zoom = options.zoom || 1;
  const alpha = options.alpha ?? 1;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const scale = Math.min(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = collapseWhitespace(text).split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !current) {
      current = test;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (!lines.length) return y;

  if (words.length && lines.length === maxLines) {
    const usedWordCount = lines.join(" ").split(" ").length;
    if (usedWordCount < words.length) {
      lines[lines.length - 1] = truncateText(lines[lines.length - 1], Math.max(24, Math.floor(maxWidth / 8)));
    }
  }

  lines.forEach((line, idx) => {
    ctx.fillText(line, x, y + idx * lineHeight);
  });

  return y + (lines.length - 1) * lineHeight;
}

function buildShowcaseLabel() {
  const title = collapseWhitespace(proyectoEl?.value) || "Proyecto Ulises";
  const prompt = truncateText(textoEl?.value || "", 120);
  return {
    title,
    subtitle: prompt || "Edición arquitectónica precisa, lista para presentar al cliente.",
  };
}

async function generarVideoTransicion(originalSrc, resultadoSrc) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const imgA = await loadImg(originalSrc);
  const imgB = await loadImg(resultadoSrc);

  const baseW = imgA.naturalWidth || imgA.width;
  const baseH = imgA.naturalHeight || imgA.height;
  const maxSide = 1920;
  const scale = Math.min(1, maxSide / Math.max(baseW, baseH));
  const w = Math.max(1, Math.round(baseW * scale));
  const h = Math.max(1, Math.round(baseH * scale));

  canvas.width = w;
  canvas.height = h;

  const fps = 60;
  const seconds = 4.2;
  const frames = Math.floor(fps * seconds);

  const stream = canvas.captureStream(fps);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size) chunks.push(event.data);
  };

  const done = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });

  recorder.start();

  for (let i = 0; i < frames; i++) {
    const t = frames <= 1 ? 1 : i / (frames - 1);
    const reveal = clamp((t - 0.12) / 0.76, 0, 1);
    const revealEase = easeInOut(reveal);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#120c08";
    ctx.fillRect(0, 0, w, h);
    drawContainedImage(ctx, imgA, 0, 0, w, h, { alpha: 1 });

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w * revealEase, h);
    ctx.clip();
    drawContainedImage(ctx, imgB, 0, 0, w, h, { alpha: 1 });
    ctx.restore();

    const sliderX = Math.round(w * revealEase);
    if (reveal > 0.01 && reveal < 0.99) {
      ctx.fillStyle = "rgba(246, 239, 229, .96)";
      ctx.fillRect(sliderX - 1, 0, 2, h);
      ctx.beginPath();
      ctx.fillStyle = "rgba(23, 16, 11, .88)";
      ctx.arc(sliderX, h / 2, Math.max(16, Math.min(w, h) * 0.024), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(246, 239, 229, .42)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const labelPad = Math.max(14, Math.round(Math.min(w, h) * 0.025));
    ctx.textBaseline = "top";
    ctx.font = `700 ${Math.max(12, Math.round(Math.min(w, h) * 0.022))}px Manrope, sans-serif`;
    ctx.fillStyle = "rgba(246, 239, 229, .88)";
    ctx.fillText("ORIGINAL", labelPad, labelPad);
    const resultText = "RESULTADO";
    const resultW = ctx.measureText(resultText).width;
    ctx.fillText(resultText, w - resultW - labelPad, labelPad);

    await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
  }

  recorder.stop();
  return await done;
}
btnVideo.addEventListener("click", async () => {
  if (!originalObjectUrl || !resultadoUrlFinal) return;

  try {
    btnVideo.disabled = true;
    videoInfo.textContent = "Generando video⬦";

    const blob = await generarVideoTransicion(originalObjectUrl, resultadoUrlFinal);
    const url = URL.createObjectURL(blob);
    videoBlobUrl = url;

    downloadVideo.href = url;
    downloadVideo.style.display = "inline-flex";

    videoPreview.src = url;
    videoPreview.style.display = "block";

    videoInfo.textContent = "Listo (formato .webm)";
  } catch (e) {
    console.error(e);
    videoInfo.textContent = "Error generando el video";
    niceError("No se pudo generar el video. Probá con Chrome.");
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
      niceError("No se pudo preparar el ZIP porque falta JSZip.");
      return;
    }
    if (!originalObjectUrl || !resultadoUrlFinal) {
      niceError("Necesitas una imagen original y un resultado primero.");
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
    niceError("No se pudo generar el ZIP. Probá de nuevo.");
  } finally {
    btnZip.disabled = false;
  }
});

/* =========================
   GENERAR -> guarda versión
========================= */

const btnVaciar = document.getElementById("btnVaciar");

btnVaciar?.addEventListener("click", () => {
  if (editScopeEl) editScopeEl.value = "limpiar";
  updatePrecisionSummary();
  textoEl.value = `
Vaciar el ambiente eliminando únicamente basura, objetos sueltos, bolsas, papeles, ropa, recipientes, muebles pequeños y desorden.

IMPORTANTE:
- Mantener exactamente la misma habitación.
- No cambiar la arquitectura.
- No mover ni rediseñar paredes, ventana, cortinas, piso, zócalos, enchufes ni ángulos.
- No cambiar proporciones ni perspectiva.
- No generar una habitación nueva.
- No reinterpretar la escena.
- Solo limpiar y despejar el ambiente original.
- El resultado debe verse como la MISMA foto, pero totalmente limpia y vacía.
`;
});

if (boton) {
  boton.addEventListener("click", async () => {
    
    // Declarar el texto antes de preparar el pedido.
    const textoBase = (textoEl.value || "").trim();
    const estiloExtra = construirEstiloTexto();
    const estiloPreset = buildStylePresetInstruction();
    const texto = [textoBase, estiloExtra, estiloPreset].filter(Boolean).join("\n\n");

    const refInput = document.getElementById("imagenReferencia");
    const hayReferencia = refInput && refInput.files.length > 0;
    const hayMascara = usePaint.checked;

    let promptFinal = texto;

    if (hayReferencia && hayMascara) {
      promptFinal = `
El usuario quiere modificar la imagen original utilizando
la imagen de referencia como guía visual.

REGLAS:

- La imagen original es la base principal.
- La máscara pintada define la única zona editable.
- La imagen de referencia solo sirve como inspiración visual.
- No copiar ni pegar partes de la referencia.
- Aplicar únicamente los materiales, formas o estilo de la referencia.
- Mantener perspectiva, iluminación y geometría de la imagen original.
- No extender el cambio fuera de la zona pintada.
- Usar la referencia solo como materialidad, color, textura o terminacion dentro de esa zona.
- Si hay conflicto entre la referencia y la imagen original, gana la imagen original.

Descripción del usuario:
${texto}
`;
    }
    

    const imagen = inputImagen.files?.[0];

    if (estado) estado.textContent = "";
    clearError();
    if (recomendacionEl) recomendacionEl.textContent = "-";
    updatePrecisionSummary();
    if (imagenResultadoEl) {
      imagenResultadoEl.style.display = "none";
      imagenResultadoEl.src = "";
    }
    setDownloadResult("");

    resetVideoUI();
    resultadoUrlFinal = "";
    if (btnUseResult) btnUseResult.disabled = true;

    hideCompare();
    clearSizeCheck();

    if (!texto) return niceError("Escribí qué querés cambiar.");
    if (!imagen) return niceError("Seleccioná una imagen.");

    try {
      setLoading(true);
      const optimizedBase = await optimizeImageFile(imagen, { prefix: "base" });

      const formData = new FormData();
      formData.append("texto", texto);
      formData.append("imagen", optimizedBase.file);
      formData.append("sourceWidth", String(optimizedBase.sourceW || ""));
      formData.append("sourceHeight", String(optimizedBase.sourceH || ""));
      formData.append("editScope", editScopeEl?.value || "auto");
      formData.append("keepGeometry", keepGeometryEl?.checked ? "1" : "0");
      formData.append("keepDimensions", keepDimensionsEl?.checked ? "1" : "0");
      formData.append("strictEditScope", strictEditScopeEl?.checked ? "1" : "0");

      if (hayReferencia) {
        const optimizedReference = await optimizeImageFile(refInput.files[0], {
          prefix: "referencia",
          maxSide: 1600,
          quality: 0.86,
        });
        formData.append("imagenReferencia", optimizedReference.file);
      }

      if (hayMascara) {
        if (!imgNaturalW) return niceError("Esperá que cargue la imagen.");
        if (!maskHasEdits()) return niceError("Pintá una zona.");
        formData.append("maskContext", describeMaskZone());
        const mb = await maskBlobPNG(optimizedBase.uploadW, optimizedBase.uploadH);
        if (!mb) return niceError("No se pudo preparar la máscara.");
        formData.append("mask", mb, "mask.png");
      }

      const res = await fetch("/generar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error);

      if (recomendacionEl) {
        recomendacionEl.textContent = data.recomendacion || "Listo";
      }

      if (data.imagenUrl && imagenResultadoEl) {

        const savedResultUrl = data.imagenUrl;
        const url = withCacheBust(savedResultUrl);

        imagenResultadoEl.src = url;
        imagenResultadoEl.style.display = "block";

        resultadoUrlFinal = url;
        setDownloadResult(url);
        updateResultEmpty();
        showSizeCheck(
          optimizedBase.sourceW,
          optimizedBase.sourceH,
          data.width,
          data.height
        );

        // Reactivar botones
        if (btnUseResult) btnUseResult.disabled = false;
        if (btnVideo) btnVideo.disabled = false;
        if (btnZip) btnZip.disabled = false;

        // Mostrar comparador
        if (originalObjectUrl) {
          showCompare(originalObjectUrl, url);
        }

        // Mostrar modo
        if (modoInfo && data.modo) {
          updatePrecisionSummary(data.modo || "");
        }

        let resultThumb = "";
        try {
          resultThumb = await imageUrlToThumbDataUrl(url);
        } catch {
          resultThumb = "";
        }

        saveCurrentVersion({
          prompt: textoBase,
          recommendation: data.recomendacion || "",
          originalUrl: data.originalUrl || "",
          originalThumb: currentOriginalThumb,
          originalName: imagen.name || "original.png",
          resultUrl: savedResultUrl,
          resultThumb,
          mode: data.modo || "",
        });
        syncCurrentProjectUI();
        renderSidebar();
      }

    } catch (err) {
      console.error(err);
      niceError(generationErrorMessage(err));
    } finally {
      setLoading(false);
    }

  });
}

/* ===== INIT ===== */
ensureSomeProject();
syncCurrentProjectUI();
renderSidebar();
restoreCurrentProjectState().catch((err) => {
  console.error(err);
});

const btnMiniTest = document.getElementById("calcularEstilo");

btnMiniTest?.addEventListener("click", function () {
  const color = document.getElementById("q-color")?.value;
  const material = document.getElementById("q-material")?.value;
  const estetica = document.getElementById("q-estetica")?.value;
  const espacio = document.getElementById("q-espacio")?.value;

  const resultado = document.getElementById("resultadoEstilo");

  if (!color || !material || !estetica || !espacio) {
    resultado.innerHTML = "Responde todas las preguntas.";
    return;
  }

  let estilo = "Estilo personalizado";

  if (color === "claro" && material === "madera" && estetica === "minimalista") {
    estilo = "Japandi";
  }
  else if (color === "oscuro" && material === "metal") {
    estilo = "Industrial moderno";
  }
  else if (color === "pastel") {
    estilo = "Nórdico soft";
  }
  else if (color === "tierra" && espacio === "living") {
    estilo = "Boho natural";
  }
  else if (espacio === "oficina" && estetica === "minimalista") {
    estilo = "Minimalismo ejecutivo";
  }

  resultado.innerHTML = `Estilo sugerido: <span>${estilo}</span>`;
});








































