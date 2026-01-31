const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const OpenAI = require("openai");
const { toFile } = require("openai");

const app = express();

/* =====================
   CONFIG
===================== */
const PORT = process.env.PORT || 3000;

// OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ENABLE_AI = process.env.ENABLE_AI === "1";

// Candado (solo tu papá)
const BASIC_USER = process.env.BASIC_USER;
const BASIC_PASS = process.env.BASIC_PASS;

/* =====================
   BASIC AUTH (PROTEGE TODO)
===================== */
function basicAuthAll(req, res, next) {
  // Si faltan variables, cortamos (mejor que quede abierto sin querer)
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
   PATHS
===================== */
// OJO: public está adentro de backend
const publicPath = path.join(__dirname, "public");
const uploadsPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

/* =====================
   🔐 APLICAR CANDADO ANTES DE TODO
===================== */
app.use(basicAuthAll);

/* =====================
   STATIC (después del candado)
===================== */
app.use(express.static(publicPath));
app.use("/uploads", express.static(uploadsPath));

/* =====================
   OPENAI CLIENT
===================== */
let openai = null;
if (ENABLE_AI && OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

/* =====================
   MULTER (SUBIR IMÁGENES)
===================== */
const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `img_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

/* =====================
   ROUTES
===================== */
app.get("/ping", (req, res) => res.send("pong"));

app.get("/debug-paths", (req, res) => {
  res.json({
    publicPath,
    index: path.join(publicPath, "index.html"),
    indexExists: fs.existsSync(path.join(publicPath, "index.html")),
    cwd: process.cwd(),
    dirname: __dirname,
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.post("/generar", upload.single("imagen"), async (req, res) => {
  try {
    if (!ENABLE_AI) {
      return res.status(500).json({ error: "IA desactivada (ENABLE_AI != 1)" });
    }
    if (!openai) {
      return res.status(500).json({ error: "OpenAI no configurado (falta OPENAI_API_KEY)" });
    }

    const texto = (req.body.texto || "").trim();
    const imagen = req.file;

    if (!texto) return res.status(400).json({ error: "Falta descripción" });
    if (!imagen) return res.status(400).json({ error: "Falta imagen" });

    const ok = ["image/jpeg", "image/png", "image/webp"];
    if (!ok.includes(imagen.mimetype)) {
      return res.status(400).json({ error: "Formato no soportado. Usá JPG, PNG o WEBP" });
    }

    const prompt = [
      `Transformá este ambiente según el pedido del usuario: "${texto}"`,
      "Reglas:",
      "- Mantener el mismo ambiente",
      "- Estilo realista",
      "- Mejor iluminación",
      "- No agregar textos ni marcas de agua",
    ].join("\n");

    const imagePath = path.join(uploadsPath, imagen.filename);
    const imageFile = await toFile(fs.createReadStream(imagePath), null, { type: imagen.mimetype });

    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt,
      size: "1024x1024",
    });

    const base64 = result.data[0].b64_json;
    const buffer = Buffer.from(base64, "base64");

    const outputName = `resultado_${Date.now()}.png`;
    fs.writeFileSync(path.join(uploadsPath, outputName), buffer);

    res.json({
      recomendacion: `Propuesta generada según:\n"${texto}"`,
      imagenUrl: `/uploads/${outputName}`,
      modo: "IA_REAL",
    });
  } catch (err) {
    console.error("ERROR IA:", err);
    const msg = err?.response?.data?.error?.message || err?.message || "Error interno";
    res.status(500).json({ error: msg });
  }
});

/* =====================
   START
===================== */
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});


