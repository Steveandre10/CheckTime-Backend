const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
    register,
    login,
    getMe
} = require("../controllers/authController");

const checkRectorRole = (req, res, next) => {
    if (req.user && (req.user.rol === "RECTOR" || req.user.rol === "ADMIN")) {
        next();
    } else {
        return res.status(403).json({
            message: "Acceso denegado: solo el Rector puede registrar usuarios"
        });
    }
};

router.post("/register", authMiddleware, checkRectorRole, register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);

module.exports = router;