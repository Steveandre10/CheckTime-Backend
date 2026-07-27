const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();

// ==========================================
// EXPLICACIÓN DE FORTIFICACIÓN DE SEGURIDAD:
// ==========================================
// 1. INYECCIÓN SQL: Prisma utiliza consultas parametrizadas (parameterized queries) por defecto.
//    Cuando se escribe: `prisma.usuario.findUnique({ where: { correo } })`, Prisma separa el comando SQL
//    del valor del parámetro. Si el parámetro es "correo' OR '1'='1", el motor SQL lo busca literalmente
//    como el correo de un usuario, en lugar de interpretarlo como parte del comando SQL. Por lo tanto,
//    las inyecciones SQL son rechazadas automáticamente.
// 2. EXPOSICIÓN DE CREDENCIALES: Al responder con los datos del usuario creado o logueado,
//    debemos eliminar el campo "password_hash" del objeto que se envía al cliente.
// 3. VALIDACIÓN DE ENTRADAS (Input Validation): Comprobamos que el correo sea válido,
//    las contraseñas cumplan un mínimo de seguridad, y las variables obligatorias estén presentes.
// 4. PREVENCIÓN DE ENUMERACIÓN DE USUARIOS: En el Login, responder con un mensaje genérico de error
//    como "Credenciales incorrectas" en lugar de "Usuario no encontrado" o "Contraseña incorrecta"
//    previene que un atacante deduzca qué correos están registrados en el sistema.

// REGISTRO
const register = async (req, res) => {
    try {
        let { nombre, apellido, correo, password, documento, telefono, id_role } = req.body;

        // --- VALIDACIONES DE SEGURIDAD ---
        if (!nombre || !apellido || !correo || !password || !documento || !id_role) {
            return res.status(400).json({
                message: "Todos los campos obligatorios deben ser completados"
            });
        }

        // Sanitización y normalización básica
        correo = correo.trim().toLowerCase();
        nombre = nombre.trim();
        apellido = apellido.trim();
        documento = documento.trim();
        if (telefono) telefono = telefono.trim();

        // Validar formato de correo (Evita inyección de cabeceras o datos corruptos)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            return res.status(400).json({
                message: "El formato de correo institucional no es válido"
            });
        }

        // Validar fuerza de la contraseña básica (Mínimo 6 caracteres para evitar contraseñas triviales)
        if (password.length < 6) {
            return res.status(400).json({
                message: "La contraseña debe tener al menos 6 caracteres"
            });
        }

        // Convertir id_role a entero de forma segura
        const parsedRoleId = parseInt(id_role, 10);
        if (isNaN(parsedRoleId)) {
            return res.status(400).json({
                message: "El rol especificado no es válido"
            });
        }

        // --- CONSULTA SEGURA (Evita Inyecciones SQL) ---
        // Prisma.findUnique parametriza la variable 'correo' de forma nativa.
        const usuarioExistente = await prisma.usuario.findUnique({
            where: { correo }
        });

        if (usuarioExistente) {
            return res.status(400).json({
                message: "El correo ya está registrado"
            });
        }

        // En caso de que el documento también deba ser único
        const documentoExistente = await prisma.usuario.findUnique({
            where: { documento }
        });

        if (documentoExistente) {
            return res.status(400).json({
                message: "El documento ya está registrado"
            });
        }

        // Hashing seguro de contraseña con Bcrypt (Salt rounds = 10)
        const hashedPassword = await bcrypt.hash(password, 10);

        // --- CREACIÓN SEGURA ---
        const nuevoUsuario = await prisma.usuario.create({
            data: {
                nombre,
                apellido,
                correo,
                password_hash: hashedPassword,
                documento,
                telefono,
                id_role: parsedRoleId
            }
        });

        // Fortificación de respuesta: Ocultar el hash de la contraseña al cliente
        const usuarioRespuesta = { ...nuevoUsuario };
        delete usuarioRespuesta.password_hash;

        res.status(201).json({
            message: "Usuario registrado correctamente",
            usuario: usuarioRespuesta
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({
            message: "Ocurrió un error interno en el servidor",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};


// LOGIN
const login = async (req, res) => {
    try {
        let { correo, password } = req.body;

        // --- VALIDACIONES DE SEGURIDAD ---
        if (!correo || !password) {
            return res.status(400).json({
                message: "El correo y la contraseña son requeridos"
            });
        }

        correo = correo.trim().toLowerCase();

        // --- CONSULTA SEGURA ---
        const usuario = await prisma.usuario.findUnique({
            where: { correo },
            include: {
                role: true
            }
        });

        // TIP DE SEGURIDAD: Usar un error genérico unificado "Credenciales incorrectas" evita
        // la enumeración de usuarios (saber si un correo existe o no en el sistema)
        if (!usuario) {
            return res.status(401).json({
                message: "Credenciales incorrectas"
            });
        }

        // Comparación segura y constante contra ataques de temporización (timing attacks) con Bcrypt
        const passwordValida = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordValida) {
            return res.status(401).json({
                message: "Credenciales incorrectas"
            });
        }

        if (usuario.estado === false) {
            return res.status(403).json({
                message: "Su cuenta está inactiva. Contacte al Rector."
            });
        }

        // Creación del Token JWT seguro
        const token = jwt.sign(
            {
                id: usuario.id_usuario,
                rol: usuario.role.nombre_rol
            },
            process.env.JWT_SECRET || "secreto_por_defecto_seguro",
            { expiresIn: "8h" }
        );

        // Fortificación de respuesta: Ocultar contraseña
        const usuarioRespuesta = { ...usuario };
        delete usuarioRespuesta.password_hash;

        res.json({
            message: "Login exitoso",
            token,
            usuario: usuarioRespuesta
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            message: "Ocurrió un error interno en el servidor",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

// OBTENER USUARIO ACTUAL
const getMe = async (req, res) => {
    try {
        const usuarioId = req.user.id;

        const usuario = await prisma.usuario.findUnique({
            where: { id_usuario: usuarioId },
            include: {
                role: true
            }
        });

        if (!usuario) {
            return res.status(404).json({
                message: "Usuario no encontrado"
            });
        }

        if (usuario.estado === false) {
            return res.status(403).json({
                message: "Su cuenta está inactiva"
            });
        }

        // Fortificación de respuesta: Ocultar contraseña
        const usuarioRespuesta = { ...usuario };
        delete usuarioRespuesta.password_hash;

        res.json(usuarioRespuesta);

    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(500).json({
            message: "Ocurrió un error interno en el servidor",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

module.exports = {
    register,
    login,
    getMe
};