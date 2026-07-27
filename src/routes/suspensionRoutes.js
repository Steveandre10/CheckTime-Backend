const express = require('express');
const router = express.Router();
const suspensionController = require('../controllers/suspensionController');

router.post('/', suspensionController.crearSuspension);
router.get('/', suspensionController.obtenerSuspensiones);
router.delete('/:id', suspensionController.eliminarSuspension);

module.exports = router;
