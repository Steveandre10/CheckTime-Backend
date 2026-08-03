const prisma = require('../config/db');

// Helper function para parsear fechas sin problemas de timezone
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const crearPermiso = async (req, res) => {
    try {
        const { id_usuario, id_tipo_permiso, fecha_inicio, fecha_fin, causa, descripcion_breve, clases_afectadas } = req.body;

        if (!id_usuario || !id_tipo_permiso || !fecha_inicio || !fecha_fin || !causa || !descripcion_breve) {
            return res.status(400).json({
                message: "Los campos id_usuario, id_tipo_permiso, fecha_inicio, fecha_fin, causa y descripcion_breve son obligatorios."
            });
        }

        // Automatically compute all affected classes for the date range
        let affectedClasses = [];
        try {
            const userSchedules = await prisma.horario.findMany({
                where: { id_usuario: parseInt(id_usuario) }
            });
            const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
            const fInicio = parseLocalDate(fecha_inicio);
            const fFin = parseLocalDate(fecha_fin);
            
            let currentDate = new Date(fInicio);
            const endDateTime = fFin.getTime();
            
            while (currentDate.getTime() <= endDateTime) {
                const weekdayStr = diasSemana[currentDate.getDay()];
                const matchingSchedules = userSchedules.filter(s => 
                    s.dia_semana.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === weekdayStr
                );
                
                for (const schedule of matchingSchedules) {
                    affectedClasses.push({
                        id_horario: schedule.id_horario,
                        nombre: schedule.nombre,
                        hora_inicio: schedule.hora_inicio,
                        hora_fin: schedule.hora_fin,
                        bloque: schedule.bloque,
                        fecha: currentDate.toISOString().split('T')[0]
                    });
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } catch (err) {
            console.error("Error al calcular clases afectadas para permiso:", err);
        }

        const descData = {
            causa,
            descripcion_breve,
            clases_afectadas: affectedClasses
        };

        const archivo = req.file ? req.file.filename : null;
        const fechaSolicitud = new Date();
        const fInicio = parseLocalDate(fecha_inicio);
        const fFin = parseLocalDate(fecha_fin);

        // Calcular la anticipación en horas
        const diffMs = fInicio.getTime() - fechaSolicitud.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const cumpleRegla = diffHours >= 48;

        const nuevoPermiso = await prisma.permiso.create({
            data: {
                id_usuario: parseInt(id_usuario),
                id_tipo_permiso: parseInt(id_tipo_permiso),
                fecha_inicio: fInicio,
                fecha_fin: fFin,
                descripcion: JSON.stringify(descData),
                archivo,
                estado: "PENDIENTE",
                fecha_solicitud: fechaSolicitud,
                horas_anticipacion: diffHours,
                cumple_regla: cumpleRegla
            },
            include: {
                tipo_permiso: true
            }
        });

        res.status(201).json(nuevoPermiso);
    } catch (error) {
        console.error("Error al crear permiso:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

const obtenerPermisosUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const permisos = await prisma.permiso.findMany({
            where: {
                id_usuario: parseInt(id_usuario)
            },
            include: {
                tipo_permiso: true
            },
            orderBy: {
                fecha_solicitud: 'desc'
            }
        });

        res.json(permisos);
    } catch (error) {
        console.error("Error al obtener permisos de usuario:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

const obtenerTodosPermisos = async (req, res) => {
    try {
        const permisos = await prisma.permiso.findMany({
            include: {
                usuario: {
                    select: {
                        nombre: true,
                        apellido: true,
                        correo: true,
                        documento: true
                    }
                },
                tipo_permiso: true
            },
            orderBy: {
                fecha_solicitud: 'desc'
            }
        });
        res.json(permisos);
    } catch (error) {
        console.error("Error al obtener todos los permisos:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

const obtenerTiposPermiso = async (req, res) => {
    try {
        const tipos = await prisma.tipoPermiso.findMany();
        res.json(tipos);
    } catch (error) {
        console.error("Error al obtener tipos de permiso:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

const actualizarEstadoPermiso = async (req, res) => {
    try {
        const { id_permiso } = req.params;
        const { estado } = req.body;

        if (!estado || !["APROBADO", "RECHAZADO", "PENDIENTE"].includes(estado)) {
            return res.status(400).json({
                message: "El estado proporcionado no es válido (debe ser APROBADO, RECHAZADO o PENDIENTE)."
            });
        }

        const permisoActualizado = await prisma.permiso.update({
            where: {
                id_permiso: parseInt(id_permiso)
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
                tipo_permiso: true
            }
        });

        res.json(permisoActualizado);
    } catch (error) {
        console.error("Error al actualizar estado de permiso:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

module.exports = {
    crearPermiso,
    obtenerPermisosUsuario,
    obtenerTodosPermisos,
    obtenerTiposPermiso,
    actualizarEstadoPermiso
};
