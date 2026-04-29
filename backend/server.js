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

function isCleanupRequest(text) {
  const normalized = String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return /\b(limpiar|limpia|limpieza|vaciar|vacia|despejar|despeja|ordenar|ordena|quitar basura|sacar basura|eliminar basura|sacar desorden|eliminar desorden)\b/.test(normalized);
}

function positiveInt(value) {
  const num = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function publicGenerationError(err) {
  const status = err?.status || err?.code || 500;
  const message = String(err?.message || "").toLowerCase();

  if (status === 401) {
    return "La clave de IA del servidor no esta funcionando. Revisá OPENAI_API_KEY en Render.";
  }

  if (status === 400) {
    if (message.includes("mask")) {
      return "La mascara de Paint no pudo procesarse. Volvé a pintar la zona y probá otra vez.";
    }
    if (message.includes("image") || message.includes("file")) {
      return "La imagen no pudo procesarse. Probá con JPG, PNG o WEBP y una imagen menos pesada.";
    }
    return "La IA no pudo interpretar este pedido. Probá con una instruccion mas concreta.";
  }

  if (status === 413 || message.includes("too large") || message.includes("maximum")) {
    return "La imagen es demasiado pesada. Probá con una imagen mas liviana o comprimida.";
  }

  if (status === 429 || message.includes("rate limit") || message.includes("quota")) {
    return "La IA esta con limite de uso en este momento. Esperá un poco y probá de nuevo.";
  }

  if (status === 500 || status === 503 || message.includes("timeout") || message.includes("temporarily")) {
    return "Hubo un problema temporal generando la imagen. Probá de nuevo en unos segundos.";
  }

  return "No se pudo generar la imagen. Probá con una imagen mas liviana o una instruccion mas concreta.";
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
  maskContext,
  editScope,
  keepGeometry,
  keepDimensions,
  strictEditScope,
}) {
  const scopeText = {
    auto: "Inferir el alcance desde el pedido del usuario.",
    puntual: "Modo cambio puntual: modificar solamente el elemento, material o zona concreta pedida.",
    completo: "Modo cambio completo: aplicar una transformacion integral a todas las areas visibles que correspondan al pedido, conservando la misma imagen base.",
    limpiar: "Modo limpiar ambiente: eliminar desorden, basura y objetos temporales sin redisenar el espacio.",
  }[editScope] || "Inferir el alcance desde el pedido del usuario.";

  return `
Sos un sistema experto en edicion fotografica arquitectonica de alta precision para interiores, exteriores, fachadas y renders realistas.

PRINCIPIO CENTRAL:
La imagen original es la base absoluta. El resultado debe ser la misma imagen, con el mismo encuadre, perspectiva, lente, escala, iluminacion general y dimensiones finales, modificada solamente segun el pedido del usuario.

PEDIDO DEL USUARIO:
"${texto}"

ALCANCE SELECCIONADO:
${scopeText}

TAMANO ORIGINAL:
- ancho: ${width || "desconocido"} px
- alto: ${height || "desconocido"} px

REGLAS BASE, SIEMPRE OBLIGATORIAS:
- Entregar una imagen final con exactamente el mismo ancho, alto y proporcion que la original.
- No recortar, no expandir, no rotar, no cambiar el punto de vista y no cambiar el encuadre.
- La foto resultante debe seguir pareciendo la misma foto original, no una escena nueva.
- No crear una escena nueva.
- No inventar arquitectura, distribucion, aberturas, estructura, camara, horizonte, profundidad ni proporciones.
- No mover, borrar, agregar ni transformar elementos fuera del alcance pedido.
- Mantener sombras, reflejos, textura, profundidad, escala y relaciones fisicas coherentes con la foto original.
- Evitar cambios globales de exposicion, contraste, nitidez, color grading o estilo fotografico salvo que el usuario lo pida explicitamente.

ALCANCE SEGUN EL PEDIDO:
- Si el usuario pide una cosa exacta o un elemento concreto, modificar solamente ese elemento o superficie concreta.
- Si el usuario pide reemplazar un material, color, terminacion o tipologia especifica, aplicar el cambio solo a esa materialidad/tipologia y conservar forma, ubicacion, cantidad, tamano y perspectiva.
- Si el usuario pide un cambio completo, general, integral o de toda la escena, aplicar el cambio a todas las areas visibles que correspondan al pedido, pero sin cambiar la camara, arquitectura base, dimensiones ni composicion.
- Si el usuario pide estilo general, rediseno visual o renovacion completa, transformar la apariencia de la escena de manera coherente, manteniendo la misma geometria, encuadre, escala y lectura espacial.
- Si el usuario pide limpiar, vaciar o despejar, eliminar solamente basura, objetos sueltos, desorden y elementos temporales; reconstruir naturalmente lo que queda detras sin redisenar el ambiente.
- Si el pedido es ambiguo, elegir la interpretacion mas conservadora que cumpla el texto.

${keepGeometry ? `
BLOQUEO DE GEOMETRIA:
- Conservar exactamente las dimensiones visibles de balcones, ventanas, losas, columnas, carpinterias y vacios.
- No alterar cantidad de modulos, tramos, paneles, apoyos ni separaciones si el usuario no lo pidio.
- No deformar lineas verticales ni horizontales.
- No inventar aberturas, barandas, muros, juntas, molduras, columnas o divisiones nuevas.
` : ""}

BLOQUEO DE CANVAS:
- La salida debe conservar exactamente el mismo tamano final de imagen y la misma proporcion que la original.
- No recortar.
- No expandir.
- No rotar.

${strictEditScope ? `
FIDELIDAD AL PEDIDO:
- Hacer exactamente lo que el usuario pidio: ni menos ni mas.
- No embellecer ni completar con ideas propias.
- No agregar muebles, plantas, personas, objetos decorativos, luminarias o materiales que el usuario no pidio.
- Si el usuario pide algo puntual, el cambio debe ser puntual.
- Si el usuario pide algo completo, el cambio debe ser completo dentro del alcance visible correspondiente.
- Si hay conflicto entre embellecer y respetar la foto original, siempre respetar la foto original.
` : ""}

${hasMask ? `
USO DE MASCARA:
- La mascara usa transparencia: los pixeles transparentes son la unica zona editable.
- Modificar solamente la zona transparente de la mascara.
- Todo lo que quede fuera de la mascara debe permanecer visualmente igual en composicion, color, luz, textura y geometria.
- La mascara tiene prioridad sobre cualquier interpretacion amplia del texto.
- Si el texto menciona un cambio amplio pero hay mascara, aplicar ese cambio solo dentro de la zona marcada.
- Respetar el borde de la seleccion: integrar sombras, reflejos y textura sin expandir el cambio fuera del area editable.
${maskContext ? `- Contexto de ubicacion de la mascara: ${maskContext}` : ""}
` : ""}

${hasReference ? `
USO DE REFERENCIA:
- La imagen de referencia sirve solo como guia de materialidad, color, textura, terminacion o lenguaje visual.
- No copiar composicion, camara, perspectiva, objetos, geometria, distribucion, mobiliario ni iluminacion de la referencia.
- Adaptar la referencia a la geometria real de la foto base.
- Si hay mascara, aplicar la referencia solo dentro de la zona editable.
- Si no hay mascara y el usuario pide un cambio completo con referencia, aplicar la referencia a las areas visibles que correspondan al pedido.
` : ""}

JERARQUIA DE DECISION:
1. Mantener misma imagen, mismas dimensiones, mismo encuadre y misma perspectiva.
2. Respetar la mascara si existe.
3. Ejecutar literalmente el alcance pedido por el usuario: puntual si es puntual, completo si es completo.
4. Usar la referencia solo como apoyo visual si existe.
5. Mantener realismo fotografico y coherencia fisica.

RESULTADO ESPERADO:
- Misma imagen base, modificada solo con lo que pidio el usuario.
- Mismas dimensiones finales que la original.
- Resultado fotografico, creible, limpio y preciso.
- La intervencion debe sentirse natural, no como collage ni render nuevo.
`.trim();
}

function buildCleanupPrompt(texto, width, height) {
  return `
Sos un sistema experto en limpieza visual fotografica de interiores, exteriores y espacios en obra.

PEDIDO DEL USUARIO:
"${texto}"

TAMANO ORIGINAL:
- ancho: ${width || "desconocido"} px
- alto: ${height || "desconocido"} px

OBJETIVO:
Limpiar o vaciar el ambiente segun el pedido, eliminando unicamente basura, objetos sueltos, desorden, elementos temporales y cosas que no forman parte permanente del espacio.
Reconstruir de forma natural solo las areas que quedan debajo o detras de los objetos eliminados.

PROHIBIDO:
- No cambiar arquitectura.
- No cambiar encuadre, perspectiva ni lente.
- No cambiar piso, paredes, ventanas, cortinas, zocalos, cielorraso, estructura ni iluminacion general.
- No reinterpretar la escena.
- No generar una habitacion nueva.
- No embellecer.
- No agregar muebles, decoracion, plantas, luminarias, alfombras ni cambios de estilo.
- No modificar elementos fijos salvo que esten cubiertos por basura u objetos retirados y sea necesario reconstruirlos.

REGLA CENTRAL:
- Debe verse como la misma foto, solamente mas limpia, despejada o vacia segun el pedido.
- Conservar exactamente el mismo tamano y proporcion final de la imagen.
- No recortar, no expandir, no rotar y no cambiar la perspectiva.
- Las zonas que no son basura, objetos sueltos o desorden deben quedar intactas.
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
      const maskContext = (req.body.maskContext || "").trim().slice(0, 1200);
      const editScopeRaw = (req.body.editScope || "auto").trim().toLowerCase();
      const editScope = ["auto", "puntual", "completo", "limpiar"].includes(editScopeRaw)
        ? editScopeRaw
        : "auto";
      const keepGeometry = isTruthyFlag(req.body.keepGeometry, true);
      const keepDimensions = true;
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
      if (referencia && !allowedTypes.includes(referencia.mimetype)) {
        return res.status(400).json({ error: "Formato de referencia no soportado. Usa JPG, PNG o WEBP" });
      }

      const imagePath = path.join(uploadsPath, imagen.filename);
      const originalMeta = await sharp(imagePath).metadata();
      const originalWidth = originalMeta.width || null;
      const originalHeight = originalMeta.height || null;
      const sourceWidth = positiveInt(req.body.sourceWidth) || originalWidth;
      const sourceHeight = positiveInt(req.body.sourceHeight) || originalHeight;

      let prompt = buildEditPrompt({
        texto,
        width: sourceWidth,
        height: sourceHeight,
        hasMask: Boolean(mask),
        hasReference: Boolean(referencia),
        maskContext,
        editScope,
        keepGeometry,
        keepDimensions,
        strictEditScope,
      });

      if (modoEspecial === "VACIAR" || editScope === "limpiar" || isCleanupRequest(texto)) {
        prompt = buildCleanupPrompt(texto, sourceWidth, sourceHeight);
      }

      const imageFile = await toFile(
        fs.createReadStream(imagePath),
        null,
        { type: imagen.mimetype }
      );

      let maskFile = null;
      if (mask) {
        const maskPath = path.join(uploadsPath, mask.filename);
        const maskMeta = await sharp(maskPath).metadata();
        if (
          originalWidth &&
          originalHeight &&
          (maskMeta.width !== originalWidth || maskMeta.height !== originalHeight)
        ) {
          return res.status(400).json({
            error: "La mascara no coincide con el tamano de la imagen base",
          });
        }
        maskFile = await toFile(
          fs.createReadStream(maskPath),
          null,
          { type: mask.mimetype }
        );
      }

      let referenceFile = null;
      if (referencia) {
        const referencePath = path.join(uploadsPath, referencia.filename);
        referenceFile = await toFile(
          fs.createReadStream(referencePath),
          null,
          { type: referencia.mimetype }
        );
      }

      const params = {
        model: "gpt-image-1",
        image: referenceFile ? [imageFile, referenceFile] : imageFile,
        prompt,
        input_fidelity: "high",
        output_format: "png",
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
      const outputWidth = sourceWidth || originalWidth;
      const outputHeight = sourceHeight || originalHeight;
      if (keepDimensions && outputWidth && outputHeight) {
        outputBuffer = await sharp(outputBuffer)
          .resize(outputWidth, outputHeight, { fit: "fill" })
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
      return res.status(500).json({ error: publicGenerationError(err) });
    }
  }
);

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
