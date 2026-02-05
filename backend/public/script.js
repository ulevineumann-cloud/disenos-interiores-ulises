const boton = document.getElementById("generar");
const estado = document.getElementById("estado");
const loader = document.getElementById("loader");
const modoInfo = document.getElementById("modoInfo");

const recomendacionEl = document.getElementById("recomendacion");
const imagenResultadoEl = document.getElementById("imagenResultado");

const inputImagen = document.getElementById("imagen");
const preview = document.getElementById("preview");
const textoEl = document.getElementById("texto");

// Video UI
const btnVideo = document.getElementById("btnVideo");
const downloadVideo = document.getElementById("downloadVideo");
const videoPreview = document.getElementById("videoPreview");
const videoInfo = document.getElementById("videoInfo");

// ZIP UI
const btnZip = document.getElementById("btnZip");

let originalObjectUrl = "";
let resultadoUrlFinal = "";
let videoBlobUrl = "";

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

// máscara real (misma resolución que la imagen)
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
  // negro opaco = NO editable
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

  // overlay rojo donde alpha==0 (editable)
  const step = 4;
  pctx.fillStyle = "rgba(255, 60, 90, 0.40)";
  for (let y = 0; y < imgNaturalH; y += step) {
    for (let x = 0; x < imgNaturalW; x += step) {
      const i = (y * imgNaturalW + x) * 4;
      const a = data[i + 3];
      if (a === 0) {
        pctx.fillRect(x * scaleX, y * scaleY, step * scaleX, step * scaleY);
      }
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
    // Pintar => transparente (editable)
    mctx.save();
    mctx.globalCompositeOperation = "destination-out";
    mctx.beginPath();
    mctx.arc(mx, my, radius, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
  } else {
    // Borrar => vuelve a negro (no editable)
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
    if (data[i] === 0) return true; // existe zona editable
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

inputImagen.addEventListener("change", () => {
  const file = inputImagen.files?.[0];
  if (!file) return;

  resetVideoUI();
  resultadoUrlFinal = "";

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

/* =========================
   🎬 VIDEO (crossfade)
========================= */
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

    const zoomA = 1.02 - 0.02 * k;
    const zoomB = 1.00 + 0.02 * k;

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

    drawCover(imgA, zoomA, 1);
    drawCover(imgB, zoomB, k);

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

/* =========================
   📦 ZIP (pack cliente)
========================= */
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
    zip.file("pedido.txt", pedido || "(sin texto)");

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
    a.download = "pack_cliente.zip";
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

boton.addEventListener("click", async () => {
  const texto = (textoEl.value || "").trim();
  const imagen = inputImagen.files?.[0];

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

    if (usePaint.checked) {
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
    }

    estado.textContent = "Listo ✅";
  } catch (err) {
    console.error(err);
    niceError("Error al generar: " + (err?.message || "desconocido"));
  } finally {
    setLoading(false);
  }
});
































