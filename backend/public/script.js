const boton = document.getElementById("generar");
const estado = document.getElementById("estado");
const loader = document.getElementById("loader");
const modoInfo = document.getElementById("modoInfo");

const recomendacionEl = document.getElementById("recomendacion");
const imagenResultadoEl = document.getElementById("imagenResultado");

const inputImagen = document.getElementById("imagen");
const preview = document.getElementById("preview");

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
  const file = inputImagen.files?.[0];
  if (!file) return;

  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

boton.addEventListener("click", async () => {
  const texto = document.getElementById("texto").value.trim();
  const imagen = inputImagen.files?.[0];

  estado.textContent = "";
  recomendacionEl.textContent = "—";
  modoInfo.textContent = "";

  imagenResultadoEl.style.display = "none";
  imagenResultadoEl.src = "";

  if (!texto) return niceError("Escribí qué querés cambiar.");
  if (!imagen) return niceError("Seleccioná una imagen.");

  const okTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!okTypes.includes(imagen.type)) {
    return niceError("Formato no soportado. Usá JPG, PNG o WEBP.");
  }
  const maxMB = 12;
  if (imagen.size > maxMB * 1024 * 1024) {
    return niceError(`La imagen es muy pesada. Máximo ${maxMB} MB.`);
  }

  try {
    setLoading(true);
    estado.textContent = "Enviando…";

    const formData = new FormData();
    formData.append("texto", texto);
    formData.append("imagen", imagen);

    const res = await fetch("/generar", { method: "POST", body: formData });

    let data = {};
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      throw new Error(data?.error || `Servidor respondió ${res.status}`);
    }

    recomendacionEl.textContent = data.recomendacion || "Listo ✅";
    modoInfo.textContent = data.modo ? `Modo: ${data.modo}` : "";

    if (data.imagenUrl) {
      imagenResultadoEl.src = `${data.imagenUrl}?v=${Date.now()}`;
      imagenResultadoEl.style.display = "block";
    }

    estado.textContent = "Listo ✅";
  } catch (err) {
    console.error(err);
    niceError("Error al generar: " + (err?.message || "desconocido"));
  } finally {
    setLoading(false);
  }
});



























