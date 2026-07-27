const express = require("express");
const router = express.Router();
const coberturaController = require("../controllers/coberturaController");
const authMiddleware = require("../middlewares/authMiddleware");

// Todas las rutas de cobertura requieren autenticación
router.use(authMiddleware);

router.post("/", coberturaController.crearCobertura);
router.get("/", coberturaController.obtenerTodasCoberturas);
router.get("/usuario/:id_usuario", coberturaController.obtenerCoberturasUsuario);
router.get("/disponibles", coberturaController.obtenerDocentesDisponibles);

module.exports = router;
