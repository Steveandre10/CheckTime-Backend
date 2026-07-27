const express = require('express');

const router = express.Router();

const {
    obtenerHorarioProfesor,
    obtenerTodosHorarios,
    crearHorario,
    actualizarHorario,
    eliminarHorario,
    guardarHorarioDocente,
    obtenerHorarioGlobalHoy
} = require('../controllers/horarioController');

// Rutas generales
router.get("/", obtenerTodosHorarios);
router.get("/global/hoy", obtenerHorarioGlobalHoy);
router.post("/", crearHorario);
router.put("/docente/:id_usuario", guardarHorarioDocente);
router.put("/:id_horario", actualizarHorario);
router.delete("/:id_horario", eliminarHorario);

// Rutas específicas por id de usuario
router.get("/:id_usuario", obtenerHorarioProfesor);

module.exports = router;