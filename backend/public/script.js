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

// Canvas “mask real” (misma resolución que la imagen)
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
  // máscara: fondo negro opaco (NO editable)
  mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  mctx.fillStyle = "rgba(0,0,0,1)";
  mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
}

function resizeCanvasesToImage() {
  // canvas visible (tamaño mostrado)
  const rect = preview.getBoundingClientRect();
  paint.width = Math.max(1, Math.floor(rect.width));
  paint.height = Math.max(1, Math.floor(rect.height));

  // máscara real (tamaño natural de la imagen)
  maskCanvas.width = imgNaturalW;
  maskCanvas.height = imgNaturalH;
  clearMask();
  renderOverlay();
}

function renderOverlay() {
  // dibuja overlay rojo donde la máscara es "editable"
  // editable = transparencia en la máscara (alpha=0)
  pctx.clearRect(0, 0, paint.width, paint.height);

  if (!imgNaturalW || !imgNaturalH) return;

  // crear mini preview del maskCanvas a tamaño visible
  // pintamos rojo semitransparente donde alpha=0
  const scaleX = paint.width / imgNaturalW;
  const scaleY = paint.height / imgNaturalH;

  // leemos pixeles de maskCanvas (caro, pero ok para 1024)
  const imgData = mctx.getImageData(0, 0, imgNaturalW, imgNaturalH);
  const data = imgData.data;

  // dibujamos por bloques (más rápido): 4px
  const step = 4;
  pctx.fillStyle = "rgba(255, 60, 90, 0.35)";
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

  // coordenadas en imagen natural (maskCanvas)
  const mx = Math.max(0, Math.min(imgNaturalW, Math.round(x * imgNaturalW)));
  const my = Math.max(0, Math.min(imgNaturalH, Math.round(y * imgNaturalH)));
  return { mx, my };
}

function applyStroke(mx, my, radius) {
  // Regla de máscara (estilo “edits” clásico):
  // - Negro opaco = mantener
  // - Transparente = zona editable
  //
  // Si pintamos => hacemos transparente (editable)
  // Si borramos => volvemos a negro opaco (no editable)
  if (!imgNaturalW || !imgNaturalH) return;

  if (!eraseMode) {
    // pintar => borrar alpha (transparentar)
    mctx.save();
    mctx.globalCompositeOperation = "destination-out";
    mctx.beginPath();
    mctx.arc(mx, my, radius, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
  } else {
    // borrar => volver a negro
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

paint.addEventListener("pointerup", () => {
  drawing = false;
});
paint.addEventListener("pointercancel", () => {
  drawing = false;
});

inputImagen.addEventListener("change", () => {
  const file = inputImagen.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  preview.onload = () => {
    imgNaturalW = preview.naturalWidth;
    imgNaturalH = preview.naturalHeight;
    // Esperamos un tick para que el layout termine
    setTimeout(resizeCanvasesToImage, 0);
  };
  preview.src = url;
});

// si cambia tamaño ventana, recalcular canvas visible
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
  // si toda la máscara está opaca, no hay zona editable
  const imgData = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const data = imgData.data;
  // buscamos algún alpha=0
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

  const okTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!okTypes.includes(imagen.type)) {
    return niceError("Formato no soportado. Usá JPG, PNG o WEBP.");
  }

  try {
    setLoading(true);

    estado.textContent = "Preparando envío…";

    const formData = new FormData();
    formData.append("texto", texto);
    formData.append("imagen", imagen);

    // máscara opcional
    if (chkMask.checked) {
      if (!imgNaturalW) return niceError("Cargá una imagen primero (esperá que aparezca la vista previa).");
      if (!maskHasEdits()) return niceError("Pintá una zona para editar (si no, la IA no sabe dónde cambiar).");

      const mb = await maskBlobPNG();
      formData.append("mask", mb, "mask.png");
    }

    estado.textContent = "Generando…";

    const res = await fetch("/generar", { method: "POST", body: formData });

    let data = {};
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      throw new Error(data?.error || `Servidor respondió ${res.status}`);
    }

    recomendacionEl.textContent = data.recomendacion || "Listo ✅";
    modoInfo.textContent =
      data.modo === "IA_MASK"
        ? "🟢 Modo máscara (solo cambia lo pintado)"
        : "🟡 Sin máscara (menos control)";

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
























