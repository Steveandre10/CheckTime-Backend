const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const {
    crearPermiso,
    obtenerPermisosUsuario,
    obtenerTodosPermisos,
    obtenerTiposPermiso,
    actualizarEstadoPermiso
} = require('../controllers/permisoController');

// Ruta para crear un permiso con soporte (opcional)
router.post('/', upload.single('soporte'), crearPermiso);

// Ruta para obtener todos los permisos
router.get('/', obtenerTodosPermisos);

// Ruta para obtener los tipos de permisos
router.get('/tipos', obtenerTiposPermiso);

// Ruta para obtener todos los permisos de un usuario
router.get('/usuario/:id_usuario', obtenerPermisosUsuario);

// Ruta para actualizar el estado de un permiso (Aprobar/Rechazar)
router.put('/:id_permiso/estado', actualizarEstadoPermiso);

module.exports = router;
