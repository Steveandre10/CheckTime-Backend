const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Token no proporcionado"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "secreto_por_defecto_seguro"
        );

        req.user = decoded;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(401).json({
            message: "Token inválido o expirado"
        });
    }
};

module.exports = authMiddleware;