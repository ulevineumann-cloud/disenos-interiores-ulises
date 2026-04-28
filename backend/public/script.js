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
const fileMeta = document.getElementById("fileMeta");
const referenceMeta = document.getElementById("referenceMeta");
const keepGeometryEl = document.getElementById("keepGeometry");
const keepDimensionsEl = document.getElementById("keepDimensions");
const strictEditScopeEl = document.getElementById("strictEditScope");

const recomendacionEl = document.getElementById("recomendacion");
const imagenResultadoEl = document.getElementById("imagenResultado");

const inputImagen = document.getElementById("imagen");
const preview = document.getElementById("preview");

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
  return clean.slice(0, max - 1).trimEnd() + "…";
}

function describeImageFile(file, label) {
  if (!file) return label;
  return `${file.name} · ${humanFileSize(file.size)}`;
}

function updatePrecisionSummary(extraMode = "") {
  if (!modoInfo) return;

  const flags = [];
  if (keepGeometryEl?.checked) flags.push("misma geometria");
  if (keepDimensionsEl?.checked) flags.push("mismo tamano final");
  if (strictEditScopeEl?.checked) flags.push("cambio puntual");
  if (usePaint?.checked) flags.push("zona pintada");

  let text = flags.length
    ? `Precision activa: ${flags.join(", ")}.`
    : "Precision manual.";

  if (extraMode) {
    text += ` Modo: ${extraMode}.`;
  }

  modoInfo.textContent = text;
}

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
  updatePrecisionSummary();

  if (paintOn && imgNaturalW) setTimeout(resizeCanvasesToImage, 0);
}
btnModeSimple.addEventListener("click", () => setMode(false));
btnModePaint.addEventListener("click", () => setMode(true));
setMode(false);

[keepGeometryEl, keepDimensionsEl, strictEditScopeEl].forEach((el) => {
  el?.addEventListener("change", () => {
    updatePrecisionSummary();
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
    name: "Japandi calido",
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
    prompt: "Aplicar un estilo Japandi calido con madera natural, paleta neutra y tonos tierra suaves, composicion limpia, textiles nobles y pocos acentos oscuros, manteniendo una lectura serena y elegante.",
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
    prompt: "Aplicar un estilo industrial elegante con metal negro, hormigon refinado, madera oscura y una composicion ordenada, sobria y contemporanea, sin sobrecargar el ambiente.",
  },
  {
    name: "Nordico soft",
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
      "Menos decoracion, mas materialidad protagonista.",
      "Ideal para cocinas, banos y areas de recepcion.",
    ],
    prompt: "Aplicar un estilo contemporaneo petreo con materiales minerales nobles, presencia de marmol u hormigon refinado, tonos profundos y una composicion arquitectonica sobria y precisa.",
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
    prompt: "Aplicar un estilo clasico sereno con materiales nobles, detalles sutiles, paleta calida controlada y una composicion elegante sin exceso ornamental.",
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
  return projectLastVersion(p)?.originalThumb || "";
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
      restoreCurrentProjectState().catch((err) => {
        console.error(err);
      });
    });
  });
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


function setImageVisibility(imgEl, src) {
  if (!imgEl) return;
  if (!src) {
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
    return;
  }

  imgEl.style.display = "none";
  imgEl.onload = () => {
    imgEl.style.display = "block";
  };
  imgEl.onerror = () => {
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
  };
  imgEl.src = src;
}

function clearCurrentWorkspace() {
  textoEl.value = "";
  if (estado) estado.textContent = "";
  if (recomendacionEl) recomendacionEl.textContent = "-";
  setMetaText(fileMeta, "Todavia no cargaste una imagen base.");
  setMetaText(referenceMeta, "Sin imagen de referencia adicional.");

  setImageVisibility(imagenResultadoEl, "");
  setImageVisibility(preview, "");
  setImageVisibility(previewReferencia, "");

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

  setImageVisibility(imagenResultadoEl, resultSrc);
  resultadoUrlFinal = resultSrc;
  resetVideoUI();

  if (btnUseResult) btnUseResult.disabled = !resultSrc;
  if (btnVideo) btnVideo.disabled = !resultSrc;
  if (btnZip) btnZip.disabled = !resultSrc;

  currentOriginalThumb = latest.originalThumb || "";
  setImageVisibility(preview, originalSrc || latest.originalThumb || "");

  if (originalSrc) {
    paintBase.onload = () => {
      imgNaturalW = paintBase.naturalWidth;
      imgNaturalH = paintBase.naturalHeight;
      if (usePaint.checked) setTimeout(resizeCanvasesToImage, 0);
    };
    paintBase.src = originalSrc;
  } else {
    paintBase.removeAttribute("src");
    imgNaturalW = 0;
    imgNaturalH = 0;
  }

  if (originalSrc && resultSrc) {
    showCompare(originalSrc, resultSrc);
  } else {
    hideCompare();
  }

  inputImagen.value = "";
  originalBaseFile = null;
  if (btnBackToOriginal) btnBackToOriginal.disabled = true;

  if (!latest.originalUrl) return;

  try {
    await hydrateInputFromStoredUrl(latest.originalUrl, latest.originalName || "proyecto-base.png");
    if (resultSrc) showCompare(originalObjectUrl || originalSrc, resultSrc);
  } catch (err) {
    console.error(err);
  }

  updatePrecisionSummary(latest.mode || "");
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
    mode: versionData.mode || "",
  });
  project.versions = project.versions.slice(0, 12);

  saveProjects(list);
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
});

/* Input image */
inputImagen?.addEventListener("change", async () => {
  const file = inputImagen.files?.[0];
  if (!file) {
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
    setMetaText(fileMeta, "Todavia no cargaste una imagen base.");
    return;
  }

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
    subtitle: prompt || "Edicion arquitectonica precisa, lista para presentar al cliente.",
  };
}

async function generarVideoTransicion(originalSrc, resultadoSrc) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const imgA = await loadImg(originalSrc);
  const imgB = await loadImg(resultadoSrc);

  const baseW = imgA.naturalWidth || imgA.width;
  const baseH = imgA.naturalHeight || imgA.height;
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(baseW, baseH));
  const w = Math.max(1, Math.round(baseW * scale));
  const h = Math.max(1, Math.round(baseH * scale));

  canvas.width = w;
  canvas.height = h;

  const fps = 30;
  const seconds = 3.4;
  const frames = Math.floor(fps * seconds);
  const labels = buildShowcaseLabel();

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
    const t = frames <= 1 ? 1 : i / (frames - 1);
    const intro = clamp(t / 0.18, 0, 1);
    const reveal = clamp((t - 0.16) / 0.56, 0, 1);
    const revealEase = easeInOut(reveal);
    const finalHold = clamp((t - 0.76) / 0.24, 0, 1);

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#1b1511");
    bg.addColorStop(1, "#0f0d0b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#8d6d4a";
    ctx.beginPath();
    ctx.arc(w * 0.18, h * 0.12, Math.max(w, h) * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#75875d";
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.18, Math.max(w, h) * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const pad = Math.round(Math.min(w, h) * 0.055);
    const infoH = Math.max(68, Math.round(h * 0.15));
    const frameX = pad;
    const frameY = pad + infoH;
    const frameW = w - pad * 2;
    const frameH = h - frameY - pad;
    const radius = Math.max(18, Math.round(Math.min(frameW, frameH) * 0.03));

    ctx.save();
    ctx.globalAlpha = 0.95;
    roundedRectPath(ctx, frameX, frameY, frameW, frameH, radius);
    const stage = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
    stage.addColorStop(0, "rgba(42,33,25,.96)");
    stage.addColorStop(1, "rgba(20,16,13,.98)");
    ctx.fillStyle = stage;
    ctx.fill();
    ctx.strokeStyle = "rgba(244, 224, 196, .18)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();

    drawContainedImage(ctx, imgA, frameX, frameY, frameW, frameH, {
      zoom: 1.018 - revealEase * 0.018,
      alpha: 1,
    });

    if (reveal > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(frameX, frameY, frameW * revealEase, frameH);
      ctx.clip();
      drawContainedImage(ctx, imgB, frameX, frameY, frameW, frameH, {
        zoom: 1.006 + revealEase * 0.006,
        alpha: 0.9 + revealEase * 0.1,
      });
      ctx.restore();
    }

    const shade = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
    shade.addColorStop(0, "rgba(0,0,0,.02)");
    shade.addColorStop(1, "rgba(0,0,0,.20)");
    ctx.fillStyle = shade;
    ctx.fillRect(frameX, frameY, frameW, frameH);
    ctx.restore();

    const sliderX = frameX + frameW * revealEase;
    if (reveal > 0.02 && reveal < 0.985) {
      ctx.fillStyle = "rgba(248, 240, 230, .92)";
      ctx.fillRect(sliderX - 1.5, frameY, 3, frameH);
      ctx.beginPath();
      ctx.fillStyle = "rgba(28, 22, 17, .90)";
      ctx.arc(sliderX, frameY + frameH / 2, Math.max(14, Math.min(w, h) * 0.022), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(244, 224, 196, .22)";
      ctx.stroke();
      ctx.fillStyle = "rgba(248, 240, 230, .92)";
      ctx.font = `700 ${Math.max(12, Math.round(Math.min(w, h) * 0.024))}px Manrope, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("↔", sliderX, frameY + frameH / 2 + 1);
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = `rgba(246, 239, 229, ${0.58 + intro * 0.42})`;
    ctx.font = `700 ${Math.max(11, Math.round(w * 0.013))}px Manrope, sans-serif`;
    ctx.fillText("ULISES · PRESENTACION", frameX, pad);

    ctx.fillStyle = `rgba(246, 239, 229, ${0.82 + intro * 0.18})`;
    ctx.font = `600 ${Math.max(26, Math.round(w * 0.04))}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillText(labels.title, frameX, pad + Math.max(18, h * 0.035));

    ctx.fillStyle = `rgba(246, 239, 229, ${0.58 + intro * 0.24})`;
    ctx.font = `500 ${Math.max(13, Math.round(w * 0.0155))}px Manrope, sans-serif`;
    drawWrappedText(
      ctx,
      labels.subtitle,
      frameX,
      pad + Math.max(52, h * 0.08),
      frameW * 0.76,
      Math.max(16, Math.round(h * 0.03)),
      2
    );

    const pillY = frameY + 14;
    const leftPillW = Math.max(92, Math.round(frameW * 0.14));
    const rightPillW = Math.max(102, Math.round(frameW * 0.16));

    ctx.save();
    ctx.globalAlpha = 0.92;
    roundedRectPath(ctx, frameX + 14, pillY, leftPillW, 34, 17);
    ctx.fillStyle = "rgba(18,15,12,.64)";
    ctx.fill();
    ctx.strokeStyle = "rgba(244, 224, 196, .12)";
    ctx.stroke();

    roundedRectPath(ctx, frameX + frameW - rightPillW - 14, pillY, rightPillW, 34, 17);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "rgba(246, 239, 229, .88)";
    ctx.font = `700 ${Math.max(11, Math.round(w * 0.012))}px Manrope, sans-serif`;
    ctx.fillText("ORIGINAL", frameX + 28, pillY + 11);
    ctx.fillText("RESULTADO", frameX + frameW - rightPillW, pillY + 11);

    const footerAlpha = 0.35 + 0.65 * Math.max(intro, finalHold);
    ctx.fillStyle = `rgba(246, 221, 191, ${footerAlpha})`;
    ctx.font = `600 ${Math.max(12, Math.round(w * 0.0135))}px Manrope, sans-serif`;
    ctx.fillText("Cambio puntual. Misma lectura espacial. Misma foto.", frameX, h - pad + 4);

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

const btnVaciar = document.getElementById("btnVaciar");

btnVaciar?.addEventListener("click", () => {
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
    
    // 🔥 MOVER AQUI - Declarar texto PRIMERO
    const textoBase = (textoEl.value || "").trim();
    const estiloExtra = construirEstiloTexto();
    const texto = estiloExtra
      ? textoBase + " " + estiloExtra
      : textoBase;

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
- La imagen de referencia solo sirve como inspiración visual.
- No copiar ni pegar partes de la referencia.
- Aplicar únicamente los materiales, formas o estilo de la referencia.
- Mantener perspectiva, iluminación y geometría de la imagen original.
- Aplicar el cambio en toda la escena si corresponde.

Descripción del usuario:
${texto}
`;
    }
    

    const imagen = inputImagen.files?.[0];

    if (estado) estado.textContent = "";
    if (recomendacionEl) recomendacionEl.textContent = "—";
    updatePrecisionSummary();
    if (imagenResultadoEl) {
      imagenResultadoEl.style.display = "none";
      imagenResultadoEl.src = "";
    }

    resetVideoUI();
    resultadoUrlFinal = "";
    if (btnUseResult) btnUseResult.disabled = true;

    hideCompare();

    if (!texto) return niceError("Escribí qué querés cambiar.");
    if (!imagen) return niceError("Seleccioná una imagen.");

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("texto", promptFinal);
      formData.append("imagen", imagen);
      formData.append("keepGeometry", keepGeometryEl?.checked ? "1" : "0");
      formData.append("keepDimensions", keepDimensionsEl?.checked ? "1" : "0");
      formData.append("strictEditScope", strictEditScopeEl?.checked ? "1" : "0");

      if (hayReferencia) {
        formData.append("imagenReferencia", refInput.files[0]);
      }

      if (hayMascara) {
        if (!imgNaturalW) return niceError("Esperá que cargue la imagen.");
        if (!maskHasEdits()) return niceError("Pintá una zona.");
        const mb = await maskBlobPNG();
        formData.append("mask", mb, "mask.png");
      }

      const res = await fetch("/generar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error);

      if (recomendacionEl) {
        recomendacionEl.textContent = data.recomendacion || "Listo ✅";
      }

      if (data.imagenUrl && imagenResultadoEl) {

        const savedResultUrl = data.imagenUrl;
        const url = withCacheBust(savedResultUrl);

        imagenResultadoEl.src = url;
        imagenResultadoEl.style.display = "block";

        resultadoUrlFinal = url;

        // 🔥 REACTIVAR BOTONES
        if (btnUseResult) btnUseResult.disabled = false;
        if (btnVideo) btnVideo.disabled = false;
        if (btnZip) btnZip.disabled = false;

        // 🔥 MOSTRAR COMPARADOR
        if (originalObjectUrl) {
          showCompare(originalObjectUrl, url);
        }

        // 🔥 Mostrar modo
        if (modoInfo && data.modo) {
          updatePrecisionSummary(data.modo || "");
        }

        saveCurrentVersion({
          prompt: textoBase,
          recommendation: data.recomendacion || "",
          originalUrl: data.originalUrl || "",
          originalThumb: currentOriginalThumb,
          originalName: imagen.name || "original.png",
          resultUrl: savedResultUrl,
          mode: data.modo || "",
        });
        syncCurrentProjectUI();
        renderSidebar();
      }

    } catch (err) {
      console.error(err);
      niceError("Error al generar");
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







































