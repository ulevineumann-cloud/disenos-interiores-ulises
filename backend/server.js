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

function getEditCanvasSize(width, height) {
  if (!width || !height) return { width: 1024, height: 1024, size: "1024x1024" };
  const aspect = width / height;

  if (aspect > 1.18) return { width: 1536, height: 1024, size: "1536x1024" };
  if (aspect < 0.85) return { width: 1024, height: 1536, size: "1024x1536" };
  return { width: 1024, height: 1024, size: "1024x1024" };
}

function getContainRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  return {
    left: Math.round((targetWidth - width) / 2),
    top: Math.round((targetHeight - height) / 2),
    width,
    height,
  };
}

async function prepareImageForEdit(imagePath, sourceWidth, sourceHeight) {
  if (!sourceWidth || !sourceHeight) {
    const meta = await sharp(imagePath).metadata();
    sourceWidth = meta.width || 1024;
    sourceHeight = meta.height || 1024;
  }

  const canvas = getEditCanvasSize(sourceWidth, sourceHeight);
  const rect = getContainRect(sourceWidth, sourceHeight, canvas.width, canvas.height);
  const outputPath = path.join(uploadsPath, `edit_base_${Date.now()}.png`);

  const contained = await sharp(imagePath)
    .rotate()
    .resize(rect.width, rect.height, { fit: "fill" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: canvas.width,
      height: canvas.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: contained, left: rect.left, top: rect.top }])
    .png()
    .toFile(outputPath);

  return { path: outputPath, canvas, rect };
}

async function prepareMaskForEdit(maskPath, sourceWidth, sourceHeight, canvas, rect) {
  const outputPath = path.join(uploadsPath, `edit_mask_${Date.now()}.png`);
  const contained = await sharp(maskPath)
    .resize(rect.width, rect.height, { fit: "fill" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: canvas.width,
      height: canvas.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 255 },
    },
  })
    .composite([{ input: contained, left: rect.left, top: rect.top }])
    .png()
    .toFile(outputPath);

  return outputPath;
}

async function restoreOriginalFrame(buffer, editCanvas, rect, outputWidth, outputHeight) {
  const meta = await sharp(buffer).metadata();
  const resultWidth = meta.width || editCanvas.width;
  const resultHeight = meta.height || editCanvas.height;
  const scaleX = resultWidth / editCanvas.width;
  const scaleY = resultHeight / editCanvas.height;

  const extractRect = {
    left: Math.max(0, Math.round(rect.left * scaleX)),
    top: Math.max(0, Math.round(rect.top * scaleY)),
    width: Math.min(resultWidth, Math.max(1, Math.round(rect.width * scaleX))),
    height: Math.min(resultHeight, Math.max(1, Math.round(rect.height * scaleY))),
  };
  extractRect.width = Math.max(1, Math.min(extractRect.width, resultWidth - extractRect.left));
  extractRect.height = Math.max(1, Math.min(extractRect.height, resultHeight - extractRect.top));

  return sharp(buffer)
    .extract(extractRect)
    .resize(outputWidth, outputHeight, { fit: "fill" })
    .png()
    .toBuffer();
}

async function compositeMaskedEditOnOriginal(originalPath, editedBuffer, maskPath, outputWidth, outputHeight) {
  if (!maskPath || !outputWidth || !outputHeight) return editedBuffer;

  const editAlpha = await sharp(maskPath)
    .resize(outputWidth, outputHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .extractChannel("alpha")
    .negate()
    .toBuffer();

  const editedLayer = await sharp(editedBuffer)
    .resize(outputWidth, outputHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .removeAlpha()
    .joinChannel(editAlpha)
    .png()
    .toBuffer();

  const originalLayer = await sharp(originalPath)
    .rotate()
    .resize(outputWidth, outputHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  return sharp(originalLayer)
    .composite([{ input: editedLayer, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function finalizeOutputBuffer(buffer, outputWidth, outputHeight) {
  let pipeline = sharp(buffer).rotate();
  if (outputWidth && outputHeight) {
    pipeline = pipeline.resize(outputWidth, outputHeight, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });
  }
  return pipeline
    .sharpen({ sigma: 0.35, m1: 0.45, m2: 0.9 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
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
    completo: "Modo cambio completo controlado: aplicar el cambio a las superficies o elementos pedidos, pero usando la imagen original como plantilla fisica exacta. Completo no significa redisenar, reencuadrar, simplificar ni inventar una escena nueva.",
    limpiar: "Modo limpiar ambiente: eliminar desorden, basura y objetos temporales sin redisenar el espacio.",
  }[editScope] || "Inferir el alcance desde el pedido del usuario.";

  return `
Sos un sistema experto en edicion fotografica arquitectonica de alta precision para interiores, exteriores, fachadas y renders realistas.

MODO PRESERVACION DE REALIDAD - PRIORIDAD MAXIMA:
PRESERVAR > MODIFICAR.
La imagen original NO es inspiracion visual: es una referencia fisica, fotografica y geometrica obligatoria.
Tratar la foto como un relevamiento real de obra existente. Todo lo que el usuario no pidio cambiar explicitamente debe permanecer igual.
Si una modificacion entra en conflicto con preservar la realidad existente, gana preservar la realidad existente.

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
- No reinterpretar la escena.
- No convertir la foto en render limpio, maqueta, ilustracion, elevacion, diagrama, 3D simplificado ni visualizacion generica.
- No inventar arquitectura, distribucion, aberturas, estructura, camara, horizonte, profundidad ni proporciones.
- No mover, borrar, agregar ni transformar elementos fuera del alcance pedido.
- No cambiar la cantidad, posicion, escala ni proporcion de objetos, ventanas, puertas, balcones, barandas, camas, mesas, sillas, equipamiento, columnas, muros, planos, modulos ni paños existentes salvo pedido literal.
- Proteger todo texto legible, numeros, logos, isotipos, marcas de agua, carteles, pantallas, placas, senaletica y tipografias existentes salvo que el usuario pida explicitamente modificarlos.
- Si hay texto o logos en la imagen, deben conservarse en la misma posicion, escala, forma, nitidez y contenido; no traducirlos, no corregirlos, no inventarlos y no reemplazarlos.
- Mantener sombras, reflejos, textura, profundidad, escala y relaciones fisicas coherentes con la foto original.
- Evitar cambios globales de exposicion, contraste, nitidez, color grading o estilo fotografico salvo que el usuario lo pida explicitamente.
- Mantener horario aparente, temperatura de color, direccion de luz, sombras existentes e intensidad luminica general.
- No convertir una escena diurna en nocturna ni nocturna en diurna.
- Mantener la nitidez original. No suavizar, no desenfocar, no generar zonas borrosas, no aplicar efecto acuarela, no lavar texturas y no perder definicion en bordes, lineas, juntas, marcos, logos ni texto.
- Si una zona no forma parte del cambio pedido, debe quedar con la misma definicion y microdetalle de la imagen base.

PRESERVACION GEOMETRICA:
- Mantener tamaño de habitaciones, altura de techos, ancho de espacios, proporciones generales, distancias entre objetos y escala de todos los elementos.
- En fachadas, mantener volumetria, silueta, inclinacion de camara, fuga/perspectiva, cantidad de pisos, cantidad de aberturas, posicion de balcones, barandas, ventanas, puertas, columnas, muros, paños, juntas, modulos y remates.
- En interiores, mantener ubicacion y tamaño de camas, mesas, sillas, muebles, luminarias, cortinas, puertas, ventanas, pisos, paredes, cielorrasos y equipamiento.
- Cambiar un material/color/revestimiento no autoriza a cambiar forma, cantidad, tamaño, modulo, estructura ni posicion.

ALCANCE SEGUN EL PEDIDO:
- Si el usuario pide una cosa exacta o un elemento concreto, modificar solamente ese elemento o superficie concreta.
- Si el usuario pide reemplazar un material, color, terminacion o tipologia especifica, aplicar el cambio solo a esa materialidad/tipologia y conservar forma, ubicacion, cantidad, tamano y perspectiva.
- Si el usuario pide un cambio completo, general, integral o de toda la escena, aplicar el cambio solo como actualizacion de materiales, colores, terminaciones o lenguaje visual sobre la geometria existente. No cambiar camara, arquitectura base, dimensiones, composicion, cantidad de elementos ni distribucion.
- Si el usuario pide estilo general, modernizar, renovar o hacerlo mas elegante, transformar solamente acabados/materialidad/color/terminacion. No redistribuir, no simplificar, no redisenar volumenes ni crear una nueva foto.
- Si el usuario pide limpiar, vaciar o despejar, eliminar solamente basura, objetos sueltos, desorden y elementos temporales; reconstruir naturalmente lo que queda detras sin redisenar el ambiente.
- Si el pedido es ambiguo, elegir la interpretacion mas conservadora que cumpla el texto.
- Si no hay mascara pero el pedido menciona un objeto puntual como mueble, puerta, ventana, carpinteria, balcon, revestimiento, pared, piso, techo, mesada, baranda o luminaria, tratarlo como cambio puntual: modificar solo ese objeto o superficie y dejar el resto de la foto igual.
- Nunca convertir un cambio puntual con referencia en una renovacion completa de la escena.
- La palabra "completamente" significa aplicar el material/color pedido a todos los elementos correspondientes existentes, no reemplazar el edificio/ambiente por otro.

${keepGeometry ? `
BLOQUEO DE GEOMETRIA:
- Conservar exactamente las dimensiones visibles de balcones, ventanas, losas, columnas, carpinterias y vacios.
- No alterar cantidad de modulos, tramos, paneles, apoyos ni separaciones si el usuario no lo pidio.
- No deformar lineas verticales ni horizontales.
- No inventar aberturas, barandas, muros, juntas, molduras, columnas o divisiones nuevas.
- Antes de modificar, identificar mentalmente la geometria existente y usarla como plantilla rigida.
` : ""}

BLOQUEO DE CANVAS:
- La salida debe conservar exactamente el mismo tamano final de imagen y la misma proporcion que la original.
- No recortar.
- No expandir.
- No rotar.
- No reencuadrar ni ampliar como zoom digital.
- No degradar nitidez ni resolucion perceptual.

BLOQUEO DE TEXTO Y MARCA:
- Cualquier texto visible, numeracion, logo, marca, sello, watermark, grafica comercial, cartel o interfaz dentro de la imagen es un elemento protegido.
- No modificar letras, palabras, numeros, signos, logotipos ni marcas si el usuario no lo pidio literalmente.
- Si el cambio pedido afecta una superficie cercana a texto o logos, integrar el material alrededor sin deformar ni reescribir esos elementos.

${strictEditScope ? `
FIDELIDAD AL PEDIDO:
- Hacer exactamente lo que el usuario pidio: ni menos ni mas.
- No embellecer ni completar con ideas propias.
- No agregar muebles, plantas, personas, objetos decorativos, luminarias o materiales que el usuario no pidio.
- No eliminar muebles, objetos, ventanas, puertas, balcones, barandas, carpinterias, columnas, muros, equipos ni vegetacion salvo pedido literal.
- No mover ni redimensionar ningun elemento existente.
- Si el usuario pide algo puntual, el cambio debe ser puntual.
- Si el usuario pide algo completo, el cambio debe ser completo dentro del alcance visible correspondiente.
- Si hay conflicto entre embellecer y respetar la foto original, siempre respetar la foto original.
` : ""}

CASOS OBLIGATORIOS:
- Si el usuario pide "cambiar la cama": cambiar unicamente estilo/material/color de la cama; mantener tamaño, ubicacion, iluminacion y todo el ambiente intacto.
- Si el usuario pide "cambiar revestimiento de fachada": cambiar unicamente el revestimiento de las superficies indicadas; mantener balcones, ventanas, estructura, proporciones y cantidad de modulos.
- Si el usuario pide "cambiar piso": cambiar unicamente el piso; mantener mobiliario, iluminacion, escala, camara y composicion.
- Si el usuario pide "cambiar carpinterias": cambiar terminacion/material/color de las carpinterias existentes; mantener ubicacion, tamaño, cantidad y division de hojas.
- Si el usuario pide "modernizar edificio": modernizar materiales y colores sobre el edificio existente; conservar fachada, pisos, balcones, ventanas, remates, camara y perspectiva.

CONTROL DE CALIDAD ARQUITECTONICA:
- El resultado debe verse profesional, sobrio y elegante porque respeta la obra real, no porque inventa otra.
- Preferir intervenciones sutiles, creibles y constructivamente posibles.
- Mantener detalles imperfectos/fotograficos reales cuando no formen parte del cambio.
- No limpiar ni ordenar visualmente elementos existentes salvo pedido explicito.

${hasMask ? `
USO DE MASCARA:
- La mascara usa transparencia: los pixeles transparentes son la unica zona editable.
- Modificar solamente la zona transparente de la mascara.
- Todo lo que quede fuera de la mascara debe permanecer visualmente igual en composicion, color, luz, textura y geometria.
- Todo lo que quede fuera de la mascara debe permanecer igual de nitido que la imagen original.
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
- Si no hay mascara, usar la referencia solamente sobre el objeto o superficie nombrada por el usuario.
- Si no hay mascara y el usuario pide un cambio completo con referencia, aplicar la referencia a las areas visibles que correspondan al pedido, sin cambiar camara, arquitectura ni nitidez general.
` : ""}

${!hasMask ? `
CONTROL SIN MASCARA:
- Al no existir mascara, actuar con extrema prudencia.
- No modificar zonas que el texto no nombre directamente.
- Si el cambio pedido puede resolverse sobre una superficie u objeto puntual, no tocar el resto.
- Si la imagen de referencia se parece a otra escena, ignorar su composicion y conservar la foto base.
- Si el pedido es amplio pero la imagen contiene geometria fuerte, conservar esa geometria como plantilla rigida y cambiar solo acabados/materiales/colores.
- Si no puedes preservar la geometria exacta, reducir la ambicion del cambio antes que inventar una escena nueva.
` : ""}

JERARQUIA DE DECISION:
1. Preservar realidad fisica, geometria, objetos, arquitectura, fotografia e iluminacion de la imagen base.
2. Mantener misma imagen, mismas dimensiones, mismo encuadre y misma perspectiva.
3. Respetar la mascara si existe.
4. Ejecutar literalmente solo el cambio solicitado.
5. Usar la referencia solo como apoyo visual si existe.
6. Mantener realismo fotografico y coherencia fisica.

RESULTADO ESPERADO:
- Misma imagen base, modificada solo con lo que pidio el usuario.
- Mismas dimensiones finales que la original.
- Resultado fotografico, creible, limpio y preciso.
- La intervencion debe sentirse natural, no como collage ni render nuevo.
- El resultado debe poder compararse encima de la foto original sin que se muevan bordes, ventanas, puertas, balcones, muros, objetos ni lineas principales.
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
- No modificar texto legible, numeros, logos, marcas de agua, carteles, senaletica, pantallas ni graficas existentes salvo que el usuario lo pida explicitamente.
- No reinterpretar la escena.
- No generar una habitacion nueva.
- No embellecer.
- No agregar muebles, decoracion, plantas, luminarias, alfombras ni cambios de estilo.
- No modificar elementos fijos salvo que esten cubiertos por basura u objetos retirados y sea necesario reconstruirlos.
- No desenfocar, no suavizar texturas, no lavar la imagen y no perder nitidez en bordes, lineas, textos, logos ni detalles arquitectonicos.

REGLA CENTRAL:
- Debe verse como la misma foto, solamente mas limpia, despejada o vacia segun el pedido.
- Conservar exactamente el mismo tamano y proporcion final de la imagen.
- No recortar, no expandir, no rotar y no cambiar la perspectiva.
- Las zonas que no son basura, objetos sueltos o desorden deben quedar intactas.
- Las zonas intactas deben conservar la misma nitidez y definicion que la foto original.
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

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

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
      const editBaseWidth = originalWidth || sourceWidth;
      const editBaseHeight = originalHeight || sourceHeight;
      const editInput = await prepareImageForEdit(imagePath, editBaseWidth, editBaseHeight);

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
        fs.createReadStream(editInput.path),
        null,
        { type: "image/png" }
      );

      let maskFile = null;
      let originalMaskPath = null;
      if (mask) {
        const maskPath = path.join(uploadsPath, mask.filename);
        originalMaskPath = maskPath;
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
        const editMaskPath = await prepareMaskForEdit(
          maskPath,
          editBaseWidth,
          editBaseHeight,
          editInput.canvas,
          editInput.rect
        );
        maskFile = await toFile(
          fs.createReadStream(editMaskPath),
          null,
          { type: "image/png" }
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
        size: editInput.canvas.size,
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
        outputBuffer = await restoreOriginalFrame(
          outputBuffer,
          editInput.canvas,
          editInput.rect,
          outputWidth,
          outputHeight
        );
      }
      if (maskFile && originalMaskPath && outputWidth && outputHeight) {
        outputBuffer = await compositeMaskedEditOnOriginal(
          imagePath,
          outputBuffer,
          originalMaskPath,
          outputWidth,
          outputHeight
        );
      }
      outputBuffer = await finalizeOutputBuffer(outputBuffer, outputWidth, outputHeight);

      const outputName = `resultado_${Date.now()}.png`;
      fs.writeFileSync(path.join(uploadsPath, outputName), outputBuffer);
      const finalMeta = await sharp(outputBuffer).metadata();

      return res.json({
        recomendacion: materialesTexto || `Propuesta generada segun:\n"${texto}"`,
        originalUrl: `/uploads/${imagen.filename}`,
        imagenUrl: `/uploads/${outputName}`,
        width: finalMeta.width || outputWidth,
        height: finalMeta.height || outputHeight,
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
