const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const {
    crearNovedad,
    obtenerNovedadesUsuario,
    obtenerNovedadHoy,
    obtenerTodasNovedades,
    actualizarEstadoNovedad
} = require('../controllers/novedadController');

// Ruta para crear una novedad con subida de archivo soporte (opcional)
router.post('/', upload.single('soporte'), crearNovedad);

// Ruta para obtener todas las novedades
router.get('/', obtenerTodasNovedades);

// Ruta para obtener todas las novedades de un usuario
router.get('/usuario/:id_usuario', obtenerNovedadesUsuario);

// Ruta para obtener la novedad de hoy de un usuario
router.get('/hoy/:id_usuario', obtenerNovedadHoy);

// Ruta para actualizar el estado de una novedad (Aprobar/Rechazar)
router.put('/:id_novedad/estado', actualizarEstadoNovedad);

module.exports = router;
