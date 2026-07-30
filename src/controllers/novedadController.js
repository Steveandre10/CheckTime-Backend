const prisma = require('../config/db');

const crearNovedad = async (req, res) => {
    try {
        const { id_usuario, id_tipo_novedad, causa, descripcion_breve, clases_afectadas } = req.body;

        if (!id_usuario || !id_tipo_novedad || !causa || !descripcion_breve) {
            return res.status(400).json({
                message: "Los campos id_usuario, id_tipo_novedad, causa y descripcion_breve son obligatorios."
            });
        }

        // Serializar campos adicionales en la columna 'descripcion'
        let clasesAfectadasParsed = [];
        if (clases_afectadas) {
            try {
                clasesAfectadasParsed = typeof clases_afectadas === 'string' ? JSON.parse(clases_afectadas) : clases_afectadas;
            } catch (err) {
                console.error("Error al parsear clases_afectadas:", err);
            }
        }

        const descData = {
            causa,
            descripcion_breve,
            clases_afectadas: clasesAfectadasParsed
        };

        const archivo = req.file ? req.file.filename : null;
        const hoy = new Date();

        const nuevaNovedad = await prisma.novedad.create({
            data: {
                id_usuario: parseInt(id_usuario),
                id_tipo_novedad: parseInt(id_tipo_novedad),
                fecha: hoy,
                descripcion: JSON.stringify(descData),
                archivo,
                estado: "PENDIENTE",
                horas_afectadas: clasesAfectadasParsed.length || null
            },
            include: {
                tipo_novedad: true
            }
        });

        res.status(201).json(nuevaNovedad);
    } catch (error) {
        console.error("Error al crear novedad:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

const obtenerNovedadesUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const novedades = await prisma.novedad.findMany({
            where: {
                id_usuario: parseInt(id_usuario)
            },
            include: {
                tipo_novedad: true
            },
            orderBy: {
                fecha: 'desc'
            }
        });

        res.json(novedades);
    } catch (error) {
        console.error("Error al obtener novedades de usuario:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

const obtenerNovedadHoy = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const hoy = new Date();
        const inicioDia = new Date(hoy);
        inicioDia.setHours(0,0,0,0);
        const finDia = new Date(inicioDia);
        finDia.setDate(finDia.getDate() + 1);

        const novedad = await prisma.novedad.findFirst({
            where: {
                id_usuario: parseInt(id_usuario),
                fecha: {
                    gte: inicioDia,
                    lt: finDia
                }
            },
            include: {
                tipo_novedad: true
            }
        });

        res.json(novedad);
    } catch (error) {
        console.error("Error al obtener novedad de hoy:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

const obtenerTodasNovedades = async (req, res) => {
    try {
        const novedades = await prisma.novedad.findMany({
            include: {
                usuario: {
                    select: {
                        nombre: true,
                        apellido: true,
                        correo: true,
                        documento: true
                    }
                },
                tipo_novedad: true
            },
            orderBy: {
                fecha: 'desc'
            }
        });
        res.json(novedades);
    } catch (error) {
        console.error("Error al obtener todas las novedades:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

const actualizarEstadoNovedad = async (req, res) => {
    try {
        const { id_novedad } = req.params;
        const { estado } = req.body;

        if (!estado || !["APROBADO", "RECHAZADO", "PENDIENTE"].includes(estado)) {
            return res.status(400).json({
                message: "El estado proporcionado no es válido (debe ser APROBADO, RECHAZADO o PENDIENTE)."
            });
        }

        const novedadActualizada = await prisma.novedad.update({
            where: {
                id_novedad: parseInt(id_novedad)
            },
            data: {
                estado
            },
            include: {
                usuario: {
                    select: {
                        nombre: true,
                        apellido: true
                    }
                },
                tipo_novedad: true
            }
        });

        res.json(novedadActualizada);
    } catch (error) {
        console.error("Error al actualizar estado de novedad:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

module.exports = {
    crearNovedad,
    obtenerNovedadesUsuario,
    obtenerNovedadHoy,
    obtenerTodasNovedades,
    actualizarEstadoNovedad
};
