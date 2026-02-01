const boton = document.getElementById("generar");
const estado = document.getElementById("estado");
const loader = document.getElementById("loader");
const modoInfo = document.getElementById("modoInfo");

const recomendacionEl = document.getElementById("recomendacion");
const imagenResultadoEl = document.getElementById("imagenResultado");
const imagenOriginalEl = document.getElementById("imagenOriginal");

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
  const file = inputImagen.files[0];
  if (!file) return;

  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

boton.addEventListener("click", async () => {
  const texto = document.getElementById("texto").value.trim();
  const imagen = inputImagen.files[0];

  estado.textContent = "";
  recomendacionEl.textContent = "—";
  if (modoInfo) modoInfo.textContent = "";

  imagenResultadoEl.style.display = "none";
  imagenResultadoEl.src = "";

  imagenOriginalEl.style.display = "none";
  imagenOriginalEl.src = "";

  if (!texto) return niceError("Escribí lo que querés lograr en el diseño.");
  if (!imagen) return niceError("Seleccioná una imagen del ambiente.");

  try {
    setLoading(true);

    estado.textContent = "Generando resultado…";

    imagenOriginalEl.src = URL.createObjectURL(imagen);
    imagenOriginalEl.style.display = "block";

    const formData = new FormData();
    formData.append("texto", texto);
    formData.append("imagen", imagen);

    const res = await fetch("/generar", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error del servidor");
    }

    recomendacionEl.textContent = data.recomendacion || "Sin recomendación.";

    if (modoInfo && data.modo) {
      modoInfo.textContent =
        data.modo === "IA_REAL"
          ? "🟢 Modo IA REAL"
          : "🔵 Modo DEMO";
    }

    if (data.imagenUrl) {
      imagenResultadoEl.src = data.imagenUrl + "?v=" + Date.now();
      imagenResultadoEl.style.display = "block";
    }

    estado.textContent = "Listo ✅";
  } catch (err) {
    console.error(err);
    niceError(err.message);
  } finally {
    setLoading(false);
  }
});























