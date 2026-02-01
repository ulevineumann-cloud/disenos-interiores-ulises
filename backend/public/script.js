const boton = document.getElementById("generar");
const estado = document.getElementById("estado");
const loader = document.getElementById("loader");
const modoInfo = document.getElementById("modoInfo");

const recomendacionEl = document.getElementById("recomendacion");
const imagenResultadoEl = document.getElementById("imagenResultado");

const inputImagen = document.getElementById("imagen");
const textoEl = document.getElementById("texto");

const preview = document.getElementById("preview");
const paint = document.getElementById("paint");

const brush = document.getElementById("brush");
const brushVal = document.getElementById("brushVal");
const btnErase = document.getElementById("btnErase");
const btnClear = document.getElementById("btnClear");
const chkMask = document.getElementById("chkMask");

let imgNaturalW = 0;
let imgNaturalH = 0;

let drawing = false;
let eraseMode = false;

const pctx = paint.getContext("2d", { willReadFrequently: true });

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

function clearMask() {
  mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  mctx.fillStyle = "rgba(0,0,0,1)";
  mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
}

function resizeCanvasesToImage() {
  const rect = preview.getBoundingClientRect();
  paint.width = Math.max(1, Math.floor(rect.width));
  paint.height = Math.max(1, Math.floor(rect.height));

  maskCanvas.width = imgNaturalW;
  maskCanvas.height = imgNaturalH;
  clearMask();
  renderOverlay();
}

function renderOverlay() {
  pctx.clearRect(0, 0, paint.width, paint.height);
  if (!imgNaturalW || !imgNaturalH) return;

  const scaleX = paint.width / imgNaturalW;
  const scaleY = paint.height / imgNaturalH;

  const imgData = mctx.getImageData(0, 0, imgNaturalW, imgNaturalH);
  const data = imgData.data;

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
  const rect = paint.getBoundingClientRect();
  const x = (evt.clientX - rect.left) / rect.width;
  const y = (evt.clientY - rect.top) / rect.height;
  const mx = Math.max(0, Math.min(imgNaturalW, Math.round(x * imgNaturalW)));
  const my = Math.max(0, Math.min(imgNaturalH, Math.round(y * imgNaturalH)));
  return { mx, my };
}

function applyStroke(mx, my, radius) {
  if (!imgNaturalW || !imgNaturalH) return;

  if (!eraseMode) {
    // Pintar => zona editable (transparente)
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

paint.addEventListener("pointerdown", (e) => {
  if (!imgNaturalW) return;
  drawing = true;
  paint.setPointerCapture(e.pointerId);
  const { mx, my } = getPosOnCanvas(e);
  applyStroke(mx, my, Number(brush.value));
  renderOverlay();
});
paint.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const { mx, my } = getPosOnCanvas(e);
  applyStroke(mx, my, Number(brush.value));
  renderOverlay();
});
paint.addEventListener("pointerup", () => { drawing = false; });
paint.addEventListener("pointercancel", () => { drawing = false; });

inputImagen.addEventListener("change", () => {
  const file = inputImagen.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  // 🔥 fuerza visible SIEMPRE
  preview.style.display = "block";

  preview.onload = () => {
    imgNaturalW = preview.naturalWidth;
    imgNaturalH = preview.naturalHeight;
    setTimeout(resizeCanvasesToImage, 0);
  };

  preview.src = url;
});

window.addEventListener("resize", () => {
  if (!imgNaturalW) return;
  resizeCanvasesToImage();
});

async function maskBlobPNG() {
  return new Promise((resolve) => {
    maskCanvas.toBlob((b) => resolve(b), "image/png");
  });
}

function maskHasEdits() {
  const imgData = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const data = imgData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) return true;
  }
  return false;
}

boton.addEventListener("click", async () => {
  const texto = (textoEl.value || "").trim();
  const imagen = inputImagen.files?.[0];

  estado.textContent = "";
  recomendacionEl.textContent = "—";
  modoInfo.textContent = "";
  imagenResultadoEl.style.display = "none";
  imagenResultadoEl.src = "";

  if (!texto) return niceError("Escribí lo que querés cambiar.");
  if (!imagen) return niceError("Seleccioná una imagen.");

  try {
    setLoading(true);

    const formData = new FormData();
    formData.append("texto", texto);
    formData.append("imagen", imagen);

    if (chkMask.checked) {
      if (!imgNaturalW) return niceError("Esperá que cargue la vista previa.");
      if (!maskHasEdits()) return niceError("Pintá una zona para editar (si no, la IA no sabe dónde cambiar).");
      const mb = await maskBlobPNG();
      formData.append("mask", mb, "mask.png");
    }

    const res = await fetch("/generar", { method: "POST", body: formData });

    let data = {};
    try { data = await res.json(); } catch {}

    if (!res.ok) throw new Error(data?.error || `Servidor respondió ${res.status}`);

    recomendacionEl.textContent = data.recomendacion || "Listo ✅";
    modoInfo.textContent = data.modo === "IA_MASK"
      ? "🟢 Modo máscara (solo cambia lo pintado)"
      : "🟡 Sin máscara";

    if (data.imagenUrl) {
      imagenResultadoEl.src = `${data.imagenUrl}?v=${Date.now()}`;
      imagenResultadoEl.style.display = "block";
    }

    estado.textContent = "Listo ✅";
  } catch (err) {
    console.error(err);
    niceError("Error: " + (err?.message || "desconocido"));
  } finally {
    setLoading(false);
  }
});

























