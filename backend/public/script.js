// Helper: obliga a que exista el elemento (si no existe, muestra error claro)
function must(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`Falta en index.html: id="${id}"`);
    alert(`Error: falta en index.html el elemento con id="${id}".`);
    throw new Error(`Missing element: ${id}`);
  }
  return el;
}

const boton = must("generar");
const estado = must("estado");
const loader = must("loader");
const modoInfo = must("modoInfo");

const recomendacionEl = must("recomendacion");
const imagenResultadoEl = must("imagenResultado");
const imagenOriginalEl = must("imagenOriginal");

const inputImagen = must("imagen");
const preview = must("preview");
const textoEl = must("texto");

function setLoading(on) {
  loader.style.display = on ? "block" : "none";
  boton.disabled = on;
  boton.textContent = on ? "Diseñando..." : "Diseñar";
}

function niceError(msg) {
  estado.textContent = "Error ❌";
  alert(msg);
}

inputImagen.addEventListener("change", () => {
  const file = inputImagen.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  preview.src = url;
  preview.style.display = "block";
});

boton.addEventListener("click", async () => {
  const texto = (textoEl.value || "").trim();
  const imagen = inputImagen.files[0];

  // Reset UI
  estado.textContent = "";
  recomendacionEl.textContent = "—";
  modoInfo.textContent = "";

  imagenResultadoEl.style.display = "none";
  imagenResultadoEl.src = "";
  imagenResultadoEl.classList.remove("demo-transform");

  imagenOriginalEl.style.display = "none";
  imagenOriginalEl.src = "";

  if (!texto) return niceError("Escribí lo que querés lograr en el diseño.");
  if (!imagen) return niceError("Seleccioná una imagen del ambiente.");

  // Validaciones
  const okTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!okTypes.includes(imagen.type)) {
    return niceError("Formato no soportado. Usá JPG, PNG o WEBP (no AVIF).");
  }
  const maxMB = 8;
  if (imagen.size > maxMB * 1024 * 1024) {
    return niceError(`La imagen es muy pesada. Máximo ${maxMB} MB.`);
  }

  try {
    setLoading(true);

    estado.textContent = "Recibiendo imagen…";
    await new Promise((r) => setTimeout(r, 250));
    estado.textContent = "Analizando el pedido…";
    await new Promise((r) => setTimeout(r, 350));
    estado.textContent = "Generando resultado…";

    // Mostrar original
    imagenOriginalEl.src = URL.createObjectURL(imagen);
    imagenOriginalEl.style.display = "block";

    // Enviar al backend (IMPORTANTE: nombres deben coincidir)
    const formData = new FormData();
    formData.append("texto", texto);
    formData.append("imagen", imagen);

    const res = await fetch("/generar", { method: "POST", body: formData });

    let data = {};
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      const msg = data?.error || `El servidor respondió ${res.status}.`;
      throw new Error(msg);
    }

    recomendacionEl.textContent = data.recomendacion || "Sin recomendación.";

    if (data.modo) {
      modoInfo.textContent =
        data.modo === "IA_REAL"
          ? "🟢 Modo IA REAL"
          : "🔵 Modo DEMO (sin consumo de IA)";
    }

    if (data.imagenUrl) {
      const url = data.imagenUrl.includes("?")
        ? data.imagenUrl
        : `${data.imagenUrl}?v=${Date.now()}`;

      imagenResultadoEl.src = url;
      imagenResultadoEl.style.display = "block";
      imagenResultadoEl.classList.add("demo-transform");
    }

    estado.textContent = "Listo ✅";
  } catch (err) {
    console.error(err);
    niceError("Error al generar el diseño: " + (err?.message || "desconocido"));
  } finally {
    setLoading(false);
  }
});






















