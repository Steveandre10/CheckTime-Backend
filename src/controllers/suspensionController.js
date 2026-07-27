const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const parseLocalDateStart = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const parseLocalDateEnd = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
};

const crearSuspension = async (req, res) => {
    try {
        const { tipo, fecha_inicio, fecha_fin, motivo } = req.body;

        if (!tipo || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                message: "Tipo, fecha de inicio y fecha de fin son obligatorios."
            });
        }

        const start = parseLocalDateStart(fecha_inicio);
        const end = parseLocalDateEnd(fecha_fin);

        if (end < start) {
            return res.status(400).json({
                message: "La fecha de fin no puede ser anterior a la fecha de inicio."
            });
        }

        const nuevaSuspension = await prisma.suspension.create({
            data: {
                tipo,
                fecha_inicio: start,
                fecha_fin: end,
                motivo: motivo || null
            }
        });

        res.status(201).json(nuevaSuspension);
    } catch (error) {
        console.error("Error al crear suspensión:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

const obtenerSuspensiones = async (req, res) => {
    try {
        const suspensiones = await prisma.suspension.findMany({
            orderBy: {
                fecha_inicio: 'desc'
            }
        });
        res.json(suspensiones);
    } catch (error) {
        console.error("Error al obtener suspensiones:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

const eliminarSuspension = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.suspension.delete({
            where: {
                id_suspension: parseInt(id)
            }
        });

        res.json({
            message: "Suspensión eliminada correctamente."
        });
    } catch (error) {
        console.error("Error al eliminar suspensión:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

module.exports = {
    crearSuspension,
    obtenerSuspensiones,
    eliminarSuspension
};
