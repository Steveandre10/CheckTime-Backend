process.env.TZ = process.env.TZ || "America/Bogota";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const path = require("path");

const app = express();

// Trust proxy for express-rate-limit (e.g. on Render)
app.set("trust proxy", 1);

require("dotenv").config();

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false
}));

app.use(cors());

app.use(express.json());

// rutas
const authRoutes = require("./routes/authRoutes");
const asistenciaRoutes = require("./routes/asistenciaRoutes");
const horarioRoutes = require("./routes/horarioRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const novedadRoutes = require("./routes/novedadRoutes");
const permisoRoutes = require("./routes/permisoRoutes");
const suspensionRoutes = require("./routes/suspensionRoutes");
const coberturaRoutes = require("./routes/coberturaRoutes");

// Limitador
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        message: "Demasiadas peticiones desde esta dirección IP. Intente de nuevo en 15 minutos."
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/asistencia", asistenciaRoutes);

app.use("/api/horario", horarioRoutes);

app.use("/api/usuarios", usuarioRoutes);

app.use("/api/novedades", novedadRoutes);

app.use("/api/permisos", permisoRoutes);

app.use("/api/suspension", suspensionRoutes);

app.use("/api/coberturas", coberturaRoutes);


// Servir archivos cargados de soporte
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
    res.json({
        message: "API funcionando"
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});