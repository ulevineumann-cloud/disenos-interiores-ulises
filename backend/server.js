import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Fix __dirname con ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== MIDDLEWARES ======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== ARCHIVOS ESTÁTICOS (CLAVE) ======
app.use(express.static(path.join(__dirname, "public")));

// ====== ROBOTS.TXT FORZADO (CLAVE PARA GOOGLE) ======
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /

Sitemap: https://disenos-interiores-ulises.onrender.com/sitemap.xml`);
});

// ====== HOME ======
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});













