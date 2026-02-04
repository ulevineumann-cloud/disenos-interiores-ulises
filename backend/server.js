const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");
const OpenAI = require("openai");
const { toFile } = require("openai");

const app = express();

/* =====================
   CONFIG
===================== */
const PORT = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ENABLE_AI = process.env.ENABLE_AI === "1";

const BASIC_USER = process.env.BASIC_USER;
const BASIC_PASS = process.env.BASIC_PASS;

/* =====================
   BASIC AUTH
===================== */
function basicAuthAll(req, res, next) {
  if (!BASIC_USER || !BASIC_PASS) {
    return res.status(500).send("Faltan BASIC_USER / BASIC_PASS en Render");
  }

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

/* =====================
   PATHS + STATIC
===================== */
const publicPath = path.join(__dirname, "public");
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

app.use(basicAuthAll);
app.use(express.static(publicPath));
app.use("/uploads", express.static(uploadsPath));

/* =====================
   OPENAI CLIENT
===================== */
let openai = null;
if (ENABLE_AI && OPENAI_API_KEY) openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/* =====================
   MULTER
===================== */
const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `${file.fieldname}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB
});

/* =====================
   ROUTES
===================== */
app.get("/ping", (req, res) => res.send("pong"));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.post(
  "/generar",
  upload.fields([
    { name: "imagen", maxCount: 1 },
    { name: "mask", maxCount: 1 }, // opcional (solo si paint activado)
  ]),
  async (req, res) => {
    try {
      if (!ENABLE_AI) return res.status(500).json({ error: "IA desactivada (ENABLE_AI != 1)" });
      if (!openai) return res.status(500).json({ error: "Falta OPENAI_API_KEY" });

      const texto = (req.body.texto || "").trim();
      const imagen = req.files?.imagen?.[0];
      const maskFile = req.files?.mask?.[0]; // puede venir o no

      if (!texto) return res.status(400).json({ error: "Falta descripción" });
      if (!imagen) return res.status(400).json({ error: "Falta imagen" });

      const ok = ["image/jpeg", "image/png", "image/webp"];
      if (!ok.includes(imagen.mimetype)) {
        return res.status(400).json({ error: "Formato no soportado. Usá JPG, PNG o WEBP" });
      }

      // 1) Convertimos la imagen a PNG (más estable para edits)
      const imgInPath = path.join(uploadsPath, imagen.filename);
      const basePngPath = path.join(uploadsPath, `base_${Date.now()}.png`);
      await sharp(imgInPath).png().toFile(basePngPath);

      const meta = await sharp(basePngPath).metadata();
      const W = meta.width, H = meta.height;
      if (!W || !H) return res.status(500).json({ error: "No se pudo leer tamaño de imagen" });

      // 2) Si hay mask: la convertimos a PNG y la ajustamos al mismo tamaño
      let maskPngPath = null;
      if (maskFile) {
        const maskInPath = path.join(uploadsPath, maskFile.filename);
        maskPngPath = path.join(uploadsPath, `mask_${Date.now()}.png`);
        await sharp(maskInPath).resize(W, H, { fit: "fill" }).png().toFile(maskPngPath);
      }

      // 3) Prompt (dos variantes: con paint / sin paint)
      const promptSinPaint = `
Sos un editor fotográfico de arquitectura EXTREMADAMENTE ESTRICTO.

OBJETIVO DEL USUARIO (única fuente de verdad):
"${texto}"

REGLA #1 (la más importante):
- SOLO podés modificar elementos mencionados explícitamente en el texto del usuario.
- Si un elemento NO está escrito, está PROHIBIDO modificarlo.

REGLA #2 (conservación total):
- Mantener la imagen lo más idéntica posible: mismo encuadre, misma perspectiva, misma cámara, misma iluminación global, mismo cielo, misma vegetación, mismas sombras, misma textura general.
- No “mejorar” la imagen. No embellecer. No cambiar colorimetría global.

REGLA #3 (cambio mínimo y local):
- Hacer el cambio mínimo necesario para cumplir el pedido.
- No inventar cambios extra ni reinterpretar el edificio.

REGLA #4 (arquitectura realista):
- Fotorealismo, coherencia constructiva y detalles creíbles.
- Sin texto, sin logos, sin marcas de agua.
`;

      const promptConPaint = `
Sos un editor fotográfico de arquitectura ULTRA OBEDIENTE.

OBJETIVO DEL USUARIO:
"${texto}"

REGLA ABSOLUTA (paint):
- SOLO podés modificar lo que esté DENTRO de la máscara.
- Todo lo que NO esté en la máscara está PROHIBIDO tocarlo (ni color, ni luz, ni materiales, ni objetos, ni sombras).

REGLA DE MÍNIMO CAMBIO:
- Dentro de la máscara, hacé el cambio mínimo para cumplir el pedido del usuario.
- No agregues “mejoras” extra.

CALIDAD:
- Fotorealista, sin texto/logos/marcas de agua.
`;

      const prompt = maskPngPath ? promptConPaint : promptSinPaint;

      const imageFile = await toFile(fs.createReadStream(basePngPath), null, { type: "image/png" });

      let maskToSend = undefined;
      if (maskPngPath) {
        maskToSend = await toFile(fs.createReadStream(maskPngPath), null, { type: "image/png" });
      }

      // 4) Edit
      const result = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        mask: maskToSend,
        prompt,
        input_fidelity: "high",
        size: "auto",
        quality: "high",
      });

      const base64 = result.data?.[0]?.b64_json;
      if (!base64) return res.status(500).json({ error: "La IA no devolvió imagen" });

      const outputName = `resultado_${Date.now()}.png`;
      fs.writeFileSync(path.join(uploadsPath, outputName), Buffer.from(base64, "base64"));

      res.json({
        recomendacion: `Propuesta generada según:\n"${texto}"`,
        imagenUrl: `/uploads/${outputName}`,
        modo: maskPngPath ? "IA_CON_PAINT_MASK" : "IA_SIN_PAINT",
      });
    } catch (err) {
      console.error("ERROR IA:", err);
      const msg = err?.response?.data?.error?.message || err?.message || "Error interno";
      res.status(500).json({ error: msg });
    }
  }
);

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));










