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
const upload = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 } });

/* =====================
   HELPERS
===================== */
// Mask: negro opaco = NO editable; transparente (alpha 0) = editable
async function bboxFromMaskPng(maskPngPath) {
  const { data, info } = await sharp(maskPngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;

  let minX = W, minY = H, maxX = -1, maxY = -1;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const alpha = data[i + 3];
      if (alpha === 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) return null;

  const pad = 40;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(W - 1, maxX + pad);
  const bottom = Math.min(H - 1, maxY + pad);

  const width = Math.max(1, right - left + 1);
  const height = Math.max(1, bottom - top + 1);

  return { left, top, width, height, W, H };
}

/* =====================
   ROUTES
===================== */
app.get("/ping", (req, res) => res.send("pong"));

app.post(
  "/generar",
  upload.fields([
    { name: "imagen", maxCount: 1 },
    { name: "mask", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!ENABLE_AI) return res.status(500).json({ error: "IA desactivada (ENABLE_AI != 1)" });
      if (!openai) return res.status(500).json({ error: "Falta OPENAI_API_KEY" });

      const texto = (req.body.texto || "").trim();
      const imagen = req.files?.imagen?.[0];
      const maskFile = req.files?.mask?.[0];

      if (!texto) return res.status(400).json({ error: "Falta descripción" });
      if (!imagen) return res.status(400).json({ error: "Falta imagen" });
      if (!maskFile) return res.status(400).json({ error: "Falta máscara (pintá la zona a cambiar)" });

      // 1) base a PNG
      const srcPath = path.join(uploadsPath, imagen.filename);
      const basePngPath = path.join(uploadsPath, `base_${Date.now()}.png`);
      await sharp(srcPath).png().toFile(basePngPath);

      // 2) mask al mismo tamaño que base
      const meta = await sharp(basePngPath).metadata();
      const W = meta.width, H = meta.height;
      if (!W || !H) return res.status(500).json({ error: "No se pudo leer tamaño de imagen" });

      const maskPathIn = path.join(uploadsPath, maskFile.filename);
      const maskPngPath = path.join(uploadsPath, `mask_${Date.now()}.png`);
      await sharp(maskPathIn).resize(W, H, { fit: "fill" }).png().toFile(maskPngPath);

      // 3) bbox de lo pintado
      const box = await bboxFromMaskPng(maskPngPath);
      if (!box) {
        return res.status(400).json({ error: "Pintá una zona para editar (si no, la IA no sabe dónde cambiar)." });
      }

      // 4) recorte imagen y máscara
      const cropImgPath = path.join(uploadsPath, `crop_img_${Date.now()}.png`);
      const cropMaskPath = path.join(uploadsPath, `crop_mask_${Date.now()}.png`);

      await sharp(basePngPath)
        .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
        .png()
        .toFile(cropImgPath);

      await sharp(maskPngPath)
        .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
        .png()
        .toFile(cropMaskPath);

      // 5) prompt local
      const prompt = `
Sos un editor arquitectónico ultra preciso.
Objetivo del usuario: "${texto}"

REGLAS OBLIGATORIAS:
- Editar SOLO dentro de la máscara.
- Fuera de la máscara: NO tocar nada.
- Mantener perspectiva, encuadre y realismo fotográfico.
- Sin texto, sin logos, sin marcas de agua.
- Cambio mínimo y local: exactamente lo pedido (ej: baranda de vidrio -> hierro).
`;

      const imageFile = await toFile(fs.createReadStream(cropImgPath), null, { type: "image/png" });
      const maskToSend = await toFile(fs.createReadStream(cropMaskPath), null, { type: "image/png" });

      // 6) IA SOLO sobre el recorte
      const ai = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        mask: maskToSend,
        prompt,
        input_fidelity: "high",
        size: "auto",
        quality: "high",
      });

      const b64 = ai.data?.[0]?.b64_json;
      if (!b64) return res.status(500).json({ error: "La IA no devolvió imagen" });

      const editedCropBuf = Buffer.from(b64, "base64");

      // ✅ FIX CLAVE: asegurar que el recorte editado tenga EXACTAMENTE el tamaño del recorte original
      const editedCropFixed = await sharp(editedCropBuf)
        .png()
        .resize(box.width, box.height, { fit: "fill" })
        .toBuffer();

      // 7) pegar en la base
      const outName = `resultado_${Date.now()}.png`;
      const outPath = path.join(uploadsPath, outName);

      await sharp(basePngPath)
        .composite([{ input: editedCropFixed, left: box.left, top: box.top }])
        .png()
        .toFile(outPath);

      return res.json({
        recomendacion: `Propuesta generada según:\n"${texto}"`,
        imagenUrl: `/uploads/${outName}`,
        modo: "IA_MASK_CROP_COMPOSITE_FIX",
      });
    } catch (err) {
      console.error("ERROR IA:", err);
      const msg = err?.response?.data?.error?.message || err?.message || "Error interno";
      return res.status(500).json({ error: msg });
    }
  }
);

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));









