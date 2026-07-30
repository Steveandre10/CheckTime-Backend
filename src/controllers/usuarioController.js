const prisma = require('../config/db');

const obtenerUsuarios = async (req, res) => {
    try {
        const { role } = req.query;
        let where = {};
        if (role) {
            where.role = {
                nombre_rol: role
            };
        }
        const usuarios = await prisma.usuario.findMany({
            where,
            select: {
                id_usuario: true,
                nombre: true,
                apellido: true,
                correo: true,
                documento: true,
                telefono: true,
                estado: true,
                id_role: true,
                role: {
                    select: {
                        nombre_rol: true
                    }
                }
            }
        });
        res.json(usuarios);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ error: error.message });
    }
};

const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const id_usuario = parseInt(id, 10);
        if (isNaN(id_usuario)) {
            return res.status(400).json({ message: "ID de usuario inválido" });
        }

        let { nombre, apellido, correo, documento, telefono, id_role, estado, password } = req.body;

        // Validaciones
        if (!nombre || !apellido || !correo || !documento || !id_role) {
            return res.status(400).json({ message: "Campos obligatorios incompletos" });
        }

        // Check if correo already exists for another user
        correo = correo.trim().toLowerCase();
        const existingEmail = await prisma.usuario.findFirst({
            where: {
                correo,
                NOT: { id_usuario }
            }
        });
        if (existingEmail) {
            return res.status(400).json({ message: "El correo ya está en uso por otro usuario" });
        }

        // Check if documento already exists for another user
        documento = documento.trim();
        const existingDoc = await prisma.usuario.findFirst({
            where: {
                documento,
                NOT: { id_usuario }
            }
        });
        if (existingDoc) {
            return res.status(400).json({ message: "El documento ya está en uso por otro usuario" });
        }

        const dataToUpdate = {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            correo,
            documento,
            telefono: telefono ? telefono.trim() : null,
            id_role: parseInt(id_role, 10),
            estado: estado !== undefined ? Boolean(estado) : true
        };

        if (password && password.trim().length >= 6) {
            const bcrypt = require("bcrypt");
            dataToUpdate.password_hash = await bcrypt.hash(password, 10);
        }

        const usuarioActualizado = await prisma.usuario.update({
            where: { id_usuario },
            data: dataToUpdate,
            select: {
                id_usuario: true,
                nombre: true,
                apellido: true,
                correo: true,
                documento: true,
                telefono: true,
                estado: true,
                id_role: true,
                role: {
                    select: {
                        nombre_rol: true
                    }
                }
            }
        });

        res.json({ message: "Usuario actualizado correctamente", usuario: usuarioActualizado });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ message: "Error al actualizar usuario", error: error.message });
    }
};

module.exports = {
    obtenerUsuarios,
    actualizarUsuario
};
