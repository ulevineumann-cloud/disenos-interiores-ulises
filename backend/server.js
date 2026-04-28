const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");
require("dotenv").config();
const OpenAI = require("openai");
const { toFile } = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

const publicPath = path.join(__dirname, "public");
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

const BASIC_USER = (process.env.BASIC_USER || "").trim();
const BASIC_PASS = (process.env.BASIC_PASS || "").trim();
const ENABLE_AI = (process.env.ENABLE_AI || "").trim() === "1";
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();

const BASE_URL = "https://disenos-interiores-ulises.onrender.com";

function isTruthyFlag(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function basicAuth(req, res, next) {
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

function buildEditPrompt({
  texto,
  width,
  height,
  hasMask,
  hasReference,
  keepGeometry,
  keepDimensions,
  strictEditScope,
}) {
  return `
Sos un sistema experto en edicion fotografica arquitectonica de alta precision.

OBJETIVO:
Editar la foto original sin redisenar la escena.

PEDIDO DEL USUARIO:
"${texto}"

TAMANO ORIGINAL:
- ancho: ${width || "desconocido"} px
- alto: ${height || "desconocido"} px

REGLAS OBLIGATORIAS:
- La foto original es la base absoluta y debe seguir siendo reconocible como la misma foto.
- No crear una escena nueva.
- No cambiar arquitectura, estructura, camara, lente, punto de vista, horizonte ni encuadre.
- No mover elementos que no fueron pedidos.
- No agregar objetos decorativos ni mejoras esteticas no solicitadas.
- No reinterpretar el pedido.
- Si el usuario pide cambiar un elemento por otro, reemplazar solo ese elemento manteniendo ubicacion, escala y proporcion.
- Mantener materiales, sombras, reflejos, profundidad y relaciones fisicas del resto de la imagen.
- Mantener intactas las zonas no afectadas.

${keepGeometry ? `
BLOQUEO DE GEOMETRIA:
- Conservar exactamente las dimensiones visibles de balcones, ventanas, losas, columnas, carpinterias y vacios.
- No alterar cantidad de modulos, tramos, paneles, apoyos ni separaciones si el usuario no lo pidio.
- No deformar lineas verticales ni horizontales.
` : ""}

${keepDimensions ? `
BLOQUEO DE CANVAS:
- La salida debe conservar exactamente el mismo tamano final de imagen y la misma proporcion que la original.
- No recortar.
- No expandir.
- No rotar.
` : ""}

${strictEditScope ? `
ALCANCE ESTRICTO:
- Aplicar un cambio quirurgico y minimo.
- Cambiar exactamente lo pedido y nada mas.
- Si la instruccion afecta solo un material o una tipologia, sustituir solo ese material o tipologia.
- Si hay conflicto entre embellecer y respetar la foto original, siempre respetar la foto original.
` : ""}

${hasMask ? `
USO DE MASCARA:
- Modificar solamente la zona marcada por la mascara.
- Todo lo que quede fuera de la mascara debe permanecer visualmente igual.
` : ""}

${hasReference ? `
USO DE REFERENCIA:
- La referencia sirve solo para materialidad o lenguaje visual.
- No copiar composicion ni geometria de la referencia.
` : ""}

RESULTADO ESPERADO:
- Debe parecer la misma fotografia original con el cambio exacto solicitado.
- El resultado debe ser fotografico, creible y preciso.
`.trim();
}

function buildCleanupPrompt(texto, width, height) {
  return `
Sos un sistema experto en limpieza visual fotografica de interiores.

PEDIDO DEL USUARIO:
"${texto}"

TAMANO ORIGINAL:
- ancho: ${width || "desconocido"} px
- alto: ${height || "desconocido"} px

OBJETIVO:
Eliminar unicamente desorden, basura u objetos sueltos sin redisenar el ambiente.

PROHIBIDO:
- No cambiar arquitectura.
- No cambiar encuadre, perspectiva ni lente.
- No cambiar piso, paredes, ventanas, cortinas, zocalos ni iluminacion.
- No reinterpretar la escena.
- No generar una habitacion nueva.
- No embellecer.

REGLA CENTRAL:
- Debe verse como la misma foto, solamente mas limpia.
- Conservar exactamente el mismo tamano y proporcion final de la imagen.
`.trim();
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Disallow: /app
Disallow: /generar

Sitemap: ${BASE_URL}/sitemap.xml
`);
});

app.use(express.static(publicPath));
app.use("/uploads", express.static(uploadsPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/app", basicAuth, (req, res) => {
  res.sendFile(path.join(publicPath, "app.html"));
});

const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `img_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 } });

let openai = null;
if (ENABLE_AI && OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

app.post(
  "/generar",
  basicAuth,
  upload.fields([
    { name: "imagen", maxCount: 1 },
    { name: "mask", maxCount: 1 },
    { name: "imagenReferencia", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!ENABLE_AI) return res.status(500).json({ error: "IA desactivada (ENABLE_AI != 1)" });
      if (!openai) return res.status(500).json({ error: "Falta OPENAI_API_KEY" });

      const texto = (req.body.texto || "").trim();
      const modoEspecial = (req.body.modoEspecial || "").trim();
      const keepGeometry = isTruthyFlag(req.body.keepGeometry, true);
      const keepDimensions = isTruthyFlag(req.body.keepDimensions, true);
      const strictEditScope = isTruthyFlag(req.body.strictEditScope, true);

      const imagen = req.files?.imagen?.[0];
      const mask = req.files?.mask?.[0] || null;
      const referencia = req.files?.imagenReferencia?.[0] || null;

      if (!texto) return res.status(400).json({ error: "Falta descripcion" });
      if (!imagen) return res.status(400).json({ error: "Falta imagen" });

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(imagen.mimetype)) {
        return res.status(400).json({ error: "Formato no soportado. Usa JPG, PNG o WEBP" });
      }
      if (mask && mask.mimetype !== "image/png") {
        return res.status(400).json({ error: "Mask invalida (debe ser PNG)" });
      }

      const imagePath = path.join(uploadsPath, imagen.filename);
      const originalMeta = await sharp(imagePath).metadata();
      const originalWidth = originalMeta.width || null;
      const originalHeight = originalMeta.height || null;

      let prompt = buildEditPrompt({
        texto,
        width: originalWidth,
        height: originalHeight,
        hasMask: Boolean(mask),
        hasReference: Boolean(referencia),
        keepGeometry,
        keepDimensions,
        strictEditScope,
      });

      if (modoEspecial === "VACIAR") {
        prompt = buildCleanupPrompt(texto, originalWidth, originalHeight);
      }

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

      const params = {
        model: "gpt-image-1",
        image: imageFile,
        prompt,
      };

      if (maskFile) params.mask = maskFile;

      const result = await openai.images.edit(params);

      const materialesResponse = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: `
Basado en esta descripcion del proyecto:

"${texto}"

Generar una lista profesional, corta y accionable de materiales recomendados.
`,
      });

      const materialesTexto = materialesResponse.output_text;
      const base64 = result.data?.[0]?.b64_json;
      if (!base64) {
        return res.status(500).json({ error: "La IA no devolvio imagen" });
      }

      let outputBuffer = Buffer.from(base64, "base64");
      if (keepDimensions && originalWidth && originalHeight) {
        outputBuffer = await sharp(outputBuffer)
          .resize(originalWidth, originalHeight, { fit: "fill" })
          .png()
          .toBuffer();
      }

      const outputName = `resultado_${Date.now()}.png`;
      fs.writeFileSync(path.join(uploadsPath, outputName), outputBuffer);

      return res.json({
        recomendacion: materialesTexto || `Propuesta generada segun:\n"${texto}"`,
        originalUrl: `/uploads/${imagen.filename}`,
        imagenUrl: `/uploads/${outputName}`,
        modo: maskFile
          ? "IA_CON_MASK"
          : referencia
          ? "IA_CON_REFERENCIA"
          : "IA_SIMPLE",
      });
    } catch (err) {
      console.error(err);
      const status = err?.status || err?.code || 500;
      if (status === 401) {
        return res.status(500).json({
          error: "OPENAI_API_KEY invalida o desactualizada en el servidor",
        });
      }
      return res.status(500).json({ error: err?.message || "Error interno" });
    }
  }
);

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
