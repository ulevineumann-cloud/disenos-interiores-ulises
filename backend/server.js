const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const publicPath = path.join(__dirname, "public");

const BASIC_USER = process.env.BASIC_USER;
const BASIC_PASS = process.env.BASIC_PASS;

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

// parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ static primero (para /style.css /script.js /preview.jpg)
app.use(express.static(publicPath));

// landing pública
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// app privada
app.get("/app", basicAuth, (req, res) => {
  res.sendFile(path.join(publicPath, "app.html"));
});

// robots (permitir indexación)
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /

Sitemap: https://disenos-interiores-ulises.onrender.com/sitemap.xml`);
});

// ✅ tu POST /generar protegido
// OJO: acá tenés que mantener TU handler real (OpenAI + multer etc.)
// Si ya lo tenés en tu server.js, NO lo borres: solo asegurate que tenga basicAuth.
app.post("/generar", basicAuth, (req, res) => {
  // Si llegás acá y te da 404, es porque falta tu handler real.
  // Este stub es para que NO rompa el server, pero vos ya lo tenías armado.
  res.status(501).json({ error: "Falta implementar /generar en server.js (tu handler real)" });
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));















