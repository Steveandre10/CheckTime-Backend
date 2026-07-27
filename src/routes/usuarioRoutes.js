const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { obtenerUsuarios, actualizarUsuario } = require('../controllers/usuarioController');

const checkRectorRole = (req, res, next) => {
    if (req.user && (req.user.rol === "RECTOR" || req.user.rol === "ADMIN")) {
        next();
    } else {
        return res.status(403).json({
            message: "Acceso denegado: solo el Rector puede realizar esta acción"
        });
    }
};

router.get('/', authMiddleware, obtenerUsuarios);
router.put('/:id', authMiddleware, checkRectorRole, actualizarUsuario);

module.exports = router;
