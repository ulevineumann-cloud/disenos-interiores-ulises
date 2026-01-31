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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ENABLE_AI = process.env.ENABLE_AI === "1";

const BASIC_USER = process.env.BASIC_USER;
const BASIC_PASS = process.env.BASIC_PASS;

/* =====================
   BASIC AUTH (PROTEGE TODO)
===================== */

function basicAuthAll(req, res, next) {
  if (!BASIC_USER || !BASIC_PASS) {
    return res.status(500).send("Faltan BASIC_USER / BASIC_PASS");
  }

  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Basic" || !token) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Ulises"');
    return res.status(401).send("Auth requerida");
  }

  const decoded = Buffer.from(token, "base64").toString("utf8");
  const [user, pass] = decoded.split(":");

  if (user === BASIC_USER && pass === BASIC_PASS) {
    return next();
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Ulises"');
  return res.status(401).send("Credenciales incorrectas");
}

// 🔐 TODO el sitio protegido
app.use(basicAuthAll);

/* =====================
   PATHS
===================== */

const publicPath = path.join(__dirname, "..", "public");
const uploadsPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use(express.static(publicPath));
app.use("/uploads", express.static(uploadsPath));

/* =====================
   OPENAI
===================== */

let openai = null;
if (ENABLE_AI && OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

/* =====================
   MULTER (IMÁGENES)
===================== */

const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `img_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

/* =====================
   RUTAS
===================== */

// 👉 TEST RÁPIDO (para Render)
app.get("/ping", (req, res) => {
  res.send("pong");
});
const publicPath = path.join(__dirname, "..", "public");

app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// 👉 HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// 👉 GENERAR CON IA
app.post("/generar", upload.single("imagen"), async (req, res) => {
  try {
    if (!ENABLE_AI || !openai) {
      return res.status(500).json({ error: "IA desactivada" });
    }

    const texto = (req.body.texto || "").trim();
    const imagen = req.file;

    if (!texto) return res.status(400).json({ error: "Falta descripción" });
    if (!imagen) return res.status(400).json({ error: "Falta imagen" });

    const ok = ["image/jpeg", "image/png", "image/webp"];
    if (!ok.includes(imagen.mimetype)) {
      return res.status(400).json({
        error: "Formato no soportado. Usá JPG, PNG o WEBP",
      });
    }

    const prompt = `
Transformá este ambiente según el pedido del usuario:
"${texto}"

Reglas:
- Mantener el mismo ambiente
- Estilo realista
- Mejor iluminación
- No agregar textos ni marcas de agua
`;

    const imagePath = path.join(uploadsPath, imagen.filename);
    const imageFile = await toFile(
      fs.createReadStream(imagePath),
      null,
      { type: imagen.mimetype }
    );

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
    res.status(500).json({ error: err.message || "Error interno" });
  }
});

/* =====================
   START
===================== */

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
















