const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const OpenAI = require("openai");
const { toFile } = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

const publicPath = path.join(__dirname, "public");
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

const BASIC_USER = process.env.BASIC_USER;
const BASIC_PASS = process.env.BASIC_PASS;

const ENABLE_AI = process.env.ENABLE_AI === "1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const BASE_URL = "https://disenos-interiores-ulises.onrender.com";

function basicAuth(req, res, next) {
  // Si no están seteadas, NO pide auth (por eso puede “no pedir usuario/clave”)
  if (!BASIC_USER || !BASIC_PASS) return next();

  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Basic" || !token) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Ulises"');
    return res.status(401).send("Auth requerida");
  }

  const decoded = Buffer.from(token, "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  const user = idx >= 0 ? decoded.slice(0, idx) : "";
  const pass = idx >= 0 ? decoded.slice(idx + 1) : "";

  if (user === BASIC_USER && pass === BASIC_PASS) return next();

  res.setHeader("WWW-Authenticate", 'Basic realm="Ulises"');
  return res.status(401).send("Credenciales incorrectas");
}

// parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SEO
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Disallow: /app
Disallow: /generar

Sitemap: ${BASE_URL}/sitemap.xml
`);
});

// ✅ estáticos (IMPORTANTE: así /style.css y /script.js cargan bien)
app.use(express.static(publicPath));
app.use("/uploads", express.static(uploadsPath));

// ✅ landing pública
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// ✅ herramienta privada (pide usuario/clave)
app.get("/app", basicAuth, (req, res) => {
  res.sendFile(path.join(publicPath, "app.html"));
});

// ===== Multer =====
const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `img_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 } });

// ===== OpenAI =====
let openai = null;
if (ENABLE_AI && OPENAI_API_KEY) openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ✅ /generar privado + funcional
app.post(
  "/generar",
  basicAuth,
  upload.fields([
  { name: "imagen", maxCount: 1 },
  { name: "mask", maxCount: 1 },
  { name: "imagenReferencia", maxCount: 1 } // 🔥 NUEVO
]),
  async (req, res) => {
    try {
      if (!ENABLE_AI) return res.status(500).json({ error: "IA desactivada (ENABLE_AI != 1)" });
      if (!openai) return res.status(500).json({ error: "Falta OPENAI_API_KEY" });

  
      const imagen = req.files?.imagen?.[0];
      const mask = req.files?.mask?.[0] || null;
      const referencia = req.files?.imagenReferencia?.[0] || null;

      if (!texto) return res.status(400).json({ error: "Falta descripción" });
      if (!imagen) return res.status(400).json({ error: "Falta imagen" });

      const ok = ["image/jpeg", "image/png", "image/webp"];
      if (!ok.includes(imagen.mimetype)) {
        return res.status(400).json({ error: "Formato no soportado. Usá JPG, PNG o WEBP" });
      }
      if (mask && mask.mimetype !== "image/png") {
        return res.status(400).json({ error: "Mask inválida (debe ser PNG)" });
      }

const texto = (req.body.texto || "").trim();
const modoEspecial = (req.body.modoEspecial || "").trim();

let prompt = `
Sos un sistema avanzado de edición fotográfica arquitectónica.

Tu objetivo NO es crear una imagen nueva.
Tu objetivo es EDITAR la imagen original con precisión extrema.

---

OBJETIVO DEL USUARIO:
"${texto}"

---

REGLAS CRÍTICAS (OBLIGATORIAS):

- La imagen original es SIEMPRE la base absoluta.
- No reinterpretar la escena.
- No rediseñar el ambiente.
- No cambiar arquitectura.
- No modificar dimensiones, proporciones ni perspectiva.
- No cambiar posición de cámara ni encuadre.
- No inventar elementos nuevos innecesarios.
- No mejorar estéticamente si no se pidió.
- No estilizar.
- No hacer versiones "inspiradas".

---

REALISMO:

- El resultado debe parecer una fotografía real tomada en el mismo momento.
- Debe ser indistinguible de una foto original.
- Mantener iluminación, sombras, reflejos y coherencia física.
- Mantener imperfecciones reales del ambiente.

---

MODIFICACIONES:

- SOLO aplicar exactamente lo que el usuario pidió.
- Si el cambio afecta elementos repetidos:
  aplicar en TODOS los elementos iguales.

- Si el usuario cambia materiales:
  reemplazar en todos los objetos donde exista.

---

REFERENCIA (si existe):

- Usarla solo como guía visual.
- NO copiar objetos.
- NO cambiar geometría.
- SOLO aplicar estilo/material.

---

PRIORIDAD:

1. Mantener identidad original
2. Precisión del cambio
3. Realismo absoluto
4. Coherencia visual

Si hay conflicto → elegir REALISMO.

---

RESULTADO:

La imagen final debe parecer exactamente la misma fotografía original,
pero con los cambios aplicados de forma perfecta y creíble.
`;

if (modoEspecial === "VACIAR") {
  prompt = `
Sos un sistema experto en limpieza visual fotográfica de interiores.

Tu tarea es ELIMINAR objetos, no rediseñar el ambiente.

---

TAREA:

Eliminar únicamente:
- basura
- bolsas
- papeles
- ropa
- objetos sueltos
- recipientes
- desorden general

---

PROHIBIDO:

- NO cambiar paredes
- NO cambiar piso
- NO cambiar cortinas
- NO cambiar ventanas
- NO cambiar enchufes
- NO cambiar zócalos
- NO cambiar iluminación
- NO cambiar perspectiva
- NO cambiar encuadre
- NO modificar arquitectura
- NO reinterpretar el espacio
- NO generar una nueva habitación
- NO “mejorar” el diseño

---

REGLA CLAVE:

NO reconstruir el ambiente.
NO rediseñar.
NO inventar.

SOLO borrar objetos.

---

REALISMO:

- Mantener sombras originales
- Mantener marcas reales del piso
- Mantener suciedad leve si existe
- Mantener desgaste real

---

RESULTADO:

Debe parecer la MISMA foto original,
como si alguien simplemente limpió el lugar en la vida real.

NO debe parecer render.
NO debe parecer generado por IA.

Debe ser fotográficamente creíble.
`;
}

const imagePath = path.join(uploadsPath, imagen.filename);
const imageFile = await toFile(
  fs.createReadStream(imagePath),
  null,
  { type: imagen.mimetype }
);

let maskFile = null;
if (mask) {
  const maskPath = path.join(uploadsPath, mask.filename);
  maskFile = await toFile(
    fs.createReadStream(maskPath),
    null,
    { type: mask.mimetype }
  );
}

let referenceFile = null;

if (referencia) {
  const refPath = path.join(uploadsPath, referencia.filename);
  referenceFile = await toFile(
    fs.createReadStream(refPath),
    null,
    { type: referencia.mimetype }
  );
}

const params = {
  model: "gpt-image-1",
  image: imageFile,
  prompt,
};

if (maskFile) params.mask = maskFile;
// if (referenceFile) params.reference_image = referenceFile;


const result = await openai.images.edit(params);

const materialesResponse = await openai.responses.create({
  model: "gpt-4.1-mini",
  input: `
Basado en esta descripción del proyecto:

"${texto}"

Generar lista profesional de materiales recomendados.
Formato claro y corto.
`,
});

const materialesTexto = materialesResponse.output_text;

const base64 = result.data?.[0]?.b64_json;
if (!base64) {
  return res.status(500).json({ error: "La IA no devolvió imagen" });
}

const outputName = `resultado_${Date.now()}.png`;
fs.writeFileSync(
  path.join(uploadsPath, outputName),
  Buffer.from(base64, "base64")
);

return res.json({
  recomendacion: materialesTexto || `Propuesta generada según:\n"${texto}"`,
  imagenUrl: `/uploads/${outputName}`,
  modo: maskFile
    ? "IA_CON_MASK"
    : referenceFile
    ? "IA_CON_REFERENCIA"
    : "IA_SIMPLE",
});
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err?.message || "Error interno" });
    }
  }
);

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));















