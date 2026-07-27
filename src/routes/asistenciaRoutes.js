const express = require ('express');
const router = express.Router();
const {
    registrarEntrada,
    registrarSalida,
    obtenerEstado,
    obtenerReporteAsistencias
} = require('../controllers/asistenciaController');

// Ruta para registrar la entrada
router.post('/entrada', registrarEntrada);

// Ruta para registrar la salida
router.post('/salida', registrarSalida);

// Ruta para obtener el estado actual de asistencia
router.get('/estado/:id_usuario', obtenerEstado);

// Ruta para obtener el reporte general de asistencia
router.get('/reporte', obtenerReporteAsistencias);

module.exports = router;