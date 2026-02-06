const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const publicPath = path.join(__dirname, "public");

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Robots FORZADO (lo primero, así Google lo lee sí o sí)
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(
`User-agent: *
Allow: /

Sitemap: https://disenos-interiores-ulises.onrender.com/sitemap.xml`
  );
});

// ✅ Servir estáticos
app.use(express.static(publicPath));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Start
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});














