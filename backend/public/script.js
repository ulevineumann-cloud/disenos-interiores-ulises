const boton = document.getElementById("generar");
const estado = document.getElementById("estado");
const loader = document.getElementById("loader");
const modoInfo = document.getElementById("modoInfo");

const recomendacionEl = document.getElementById("recomendacion");
const imagenResultadoEl = document.getElementById("imagenResultado");

const inputImagen = document.getElementById("imagen");
const preview = document.getElementById("preview");
const textoEl = document.getElementById("texto");
const proyectoEl = document.getElementById("proyecto");

// Video UI
const btnVideo = document.getElementById("btnVideo");
const downloadVideo = document.getElementById("downloadVideo");
const videoPreview = document.getElementById("videoPreview");
const videoInfo = document.getElementById("videoInfo");

// ZIP UI
const btnZip = document.getElementById("btnZip");

// Historial UI
const historyList = document.getElementById("historyList");
const btnClearHistory = document.getElementById("btnClearHistory");

// Estado actual
let originalObjectUrl = "";
let resultadoUrlFinal = "";
let videoBlobUrl = "";
let currentOriginalThumb = "";

// Presets
document.querySelectorAll("[data-preset]").forEach(btn => {
  btn.addEventListener("click", () => {
    textoEl.value = btn.getAttribute("data-preset") || "";
    textoEl.focus();
    textoEl.setSelectionRange(textoEl.value.length, textoEl.value.length);
  });
});

// Selector modo
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

function setBrushUI() { brushVal.textContent = String(brush.value); }
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

/* Paint mask */
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
paintCanvas.addEventListener("pointerup", () => { drawing = false; });
paintCanvas.addEventListener("pointercancel", () => { drawing = false; });

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

/* Mode toggle */
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
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/* Input image */
inputImagen.addEventListener("change", async () => {
  const file = inputImagen.files?.[0];
  if (!file) return;

  resetVideoUI();
  resultadoUrlFinal = "";

  try { currentOriginalThumb = await fileToThumbDataUrl(file); }
  catch { currentOriginalThumb = ""; }

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
  if (!imgNaturalW) return;
  if (!usePaint.checked) return;
  resizeCanvasesToImage();
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
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

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

    await new Promise(r => setTimeout(r, 1000 / fps));
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

    const extOriginal = (originalBlob.type.includes("png")) ? "png"
      : (originalBlob.type.includes("webp")) ? "webp" : "jpg";

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

/* HISTORIAL (lista pro) */
const HISTORY_KEY = "ulises_history_v2";

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function formatDate(ts) {
  try { return new Date(ts).toLocaleString(); }
  catch { return String(ts); }
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function renderHistory() {
  const items = loadHistory();

  if (!items.length) {
    historyList.innerHTML = `<p class="muted">Todavía no hay proyectos guardados.</p>`;
    return;
  }

  historyList.innerHTML = items.map(it => {
    const p = (it.prompt || "").trim();
    const short = p.length > 140 ? p.slice(0, 140) + "…" : p;
    const title = (it.projectName || "").trim() || "Proyecto sin nombre";

    return `
      <div class="histRow" data-id="${it.id}">
        <div class="histThumbs">
          <img class="histImg" src="${it.originalThumb || ""}" alt="Original" />
          <img class="histImg" src="${it.resultUrl || ""}" alt="Resultado" />
        </div>

        <div class="histInfo">
          <div class="histTopLine">
            <p class="histTitle">${escapeHtml(title)}</p>
            <div class="histMeta">
              <span class="histDate">${escapeHtml(formatDate(it.ts))}</span>
              <span class="histMode">${escapeHtml(it.mode || "—")}</span>
            </div>
          </div>
          <p class="histPrompt">${escapeHtml(short)}</p>
        </div>

        <div class="histBtns">
          <button class="ghost btnMini histUse" type="button">↩️ Usar</button>
          <button class="ghost btnMini histOpen" type="button">🖼️ Abrir</button>
          <button class="ghost btnMini histDelete" type="button">🗑️</button>
        </div>
      </div>
    `;
  }).join("");

  historyList.querySelectorAll(".histUse").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest(".histRow");
      const id = row?.getAttribute("data-id");
      const it = loadHistory().find(x => x.id === id);
      if (!it) return;

      proyectoEl.value = it.projectName || "";
      textoEl.value = it.prompt || "";
      setMode(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  historyList.querySelectorAll(".histOpen").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest(".histRow");
      const id = row?.getAttribute("data-id");
      const it = loadHistory().find(x => x.id === id);
      if (!it?.resultUrl) return;
      window.open(it.resultUrl, "_blank");
    });
  });

  historyList.querySelectorAll(".histDelete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest(".histRow");
      const id = row?.getAttribute("data-id");
      if (!id) return;
      const items = loadHistory().filter(x => x.id !== id);
      saveHistory(items);
      renderHistory();
    });
  });
}

btnClearHistory.addEventListener("click", () => {
  if (!confirm("¿Borrar todo el historial?")) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

renderHistory();

/* GENERAR */
boton.addEventListener("click", async () => {
  const texto = (textoEl.value || "").trim();
  const imagen = inputImagen.files?.[0];
  const nombreProyecto = (proyectoEl.value || "").trim();

  estado.textContent = "";
  recomendacionEl.textContent = "—";
  modoInfo.textContent = "";
  imagenResultadoEl.style.display = "none";
  imagenResultadoEl.src = "";

  resetVideoUI();
  resultadoUrlFinal = "";

  if (!texto) return niceError("Escribí qué querés cambiar.");
  if (!imagen) return niceError("Seleccioná una imagen.");

  try {
    setLoading(true);
    estado.textContent = "Enviando…";

    const formData = new FormData();
    formData.append("texto", texto);
    formData.append("imagen", imagen);

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

      const entry = {
        id: String(Date.now()),
        ts: Date.now(),
        projectName: nombreProyecto,
        prompt: texto,
        mode: paintOn ? "PAINT" : "SIMPLE",
        originalThumb: currentOriginalThumb || "",
        resultUrl: data.imagenUrl,
      };

      const list = loadHistory();
      list.unshift(entry);
      saveHistory(list.slice(0, 30));
      renderHistory();
    }

    estado.textContent = "Listo ✅";
  } catch (err) {
    console.error(err);
    niceError("Error al generar: " + (err?.message || "desconocido"));
  } finally {
    setLoading(false);
  }
});



































