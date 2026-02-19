const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const OpenAI = require("openai");
const { toFile } = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIG =====
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ENABLE_AI = process.env.ENABLE_AI === "1";

const BASIC_USER = process.env.BASIC_USER;
const BASIC_PASS = process.env.BASIC_PASS;

const BASE_URL = "https://disenos-interiores-ulises.onrender.com"; // <- si cambias dominio, cambia esto

// ===== PATHS =====
const publicPath = path.join(__dirname, "public");
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

// ===== PARSERS =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== ROBOTS FORZADO (SEO) =====
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /

Sitemap: https://disenos-interiores-ulises.onrender.com/sitemap.xml`);

});

// ===== STATIC =====
app.use(express.static(publicPath));
app.use("/uploads", express.static(uploadsPath));

// ===== BASIC AUTH (OPCIONAL) =====
function basicAuth(req, res, next) {
  // Si no seteás BASIC_USER/BASIC_PASS, NO se aplica auth.
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

// ===== OPENAI =====
let openai = null;
if (ENABLE_AI && OPENAI_API_KEY) openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ===== MULTER =====
const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `img_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB
});

// ===== ROUTES =====
app.get("/ping", (req, res) => res.send("pong"));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/**
 * ✅ POST /generar (la usa tu script.js)
 * - Si querés proteger gasto: dejá BASIC_USER/BASIC_PASS en Render
 */
app.post(
  "/generar",
  basicAuth,
  upload.fields([{ name: "imagen", maxCount: 1 }, { name: "mask", maxCount: 1 }]),
  async (req, res) => {
    try {
      if (!ENABLE_AI) return res.status(500).json({ error: "IA desactivada (ENABLE_AI != 1)" });
      if (!openai) return res.status(500).json({ error: "Falta OPENAI_API_KEY" });

      const texto = (req.body.texto || "").trim();
      const imagen = req.files?.imagen?.[0];
      const mask = req.files?.mask?.[0] || null;

      if (!texto) return res.status(400).json({ error: "Falta descripción" });
      if (!imagen) return res.status(400).json({ error: "Falta imagen" });

      const ok = ["image/jpeg", "image/png", "image/webp"];
      if (!ok.includes(imagen.mimetype)) {
        return res.status(400).json({ error: "Formato no soportado. Usá JPG, PNG o WEBP" });
      }
      if (mask && mask.mimetype !== "image/png") {
        return res.status(400).json({ error: "Mask inválida (debe ser PNG)" });
      }

      const prompt = `
Sos un editor fotográfico de arquitectura EXTREMADAMENTE ESTRICTO.

OBJETIVO DEL USUARIO (única fuente de verdad):
"${texto}"

REGLA #1:
- SOLO podés modificar elementos mencionados explícitamente en el texto del usuario.
- Si un elemento NO está escrito, está PROHIBIDO modificarlo.

REGLA #2:
- Mantener la imagen lo más idéntica posible: mismo encuadre, perspectiva, cámara e iluminación.
- No “mejorar” la imagen. No embellecer. No cambiar colorimetría global.

REGLA #3:
- Hacer el cambio mínimo necesario para cumplir el pedido.
- No inventar cambios extra.

REGLA #4:
- Fotorealismo, coherencia constructiva y detalles creíbles.
- Sin texto, sin logos, sin marcas de agua.
`;

      const imagePath = path.join(uploadsPath, imagen.filename);
      const imageFile = await toFile(fs.createReadStream(imagePath), null, { type: imagen.mimetype });

      let maskFile = null;
      if (mask) {
        const maskPath = path.join(uploadsPath, mask.filename);
        maskFile = await toFile(fs.createReadStream(maskPath), null, { type: mask.mimetype });
      }

      const params = {
        model: "gpt-image-1",
        image: imageFile,
        prompt,
        input_fidelity: "high",
        size: "auto",
        quality: "high",
      };
      if (maskFile) params.mask = maskFile;

      const result = await openai.images.edit(params);

      const base64 = result.data?.[0]?.b64_json;
      if (!base64) return res.status(500).json({ error: "La IA no devolvió imagen" });

      const outputName = `resultado_${Date.now()}.png`;
      fs.writeFileSync(path.join(uploadsPath, outputName), Buffer.from(base64, "base64"));

      res.json({
        recomendacion: `Propuesta generada según:\n"${texto}"`,
        imagenUrl: `/uploads/${outputName}`,
        modo: maskFile ? "IA_CON_MASK_HIGH_FIDELITY" : "IA_SIN_MASK_HIGH_FIDELITY",
      });
    } catch (err) {
      console.error("ERROR IA:", err);
      const msg = err?.response?.data?.error?.message || err?.message || "Error interno";
      res.status(500).json({ error: msg });
    }
  }
);

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));















