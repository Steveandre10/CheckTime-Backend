const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Obtener el horario de un profesor en específico
const obtenerHorarioProfesor = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const horario = await prisma.horario.findMany({
            where: {
                id_usuario: parseInt(id_usuario)
            },
            orderBy: {
                hora_inicio: 'asc'
            }
        });

        res.json(horario);
    } catch (error) {
        console.error("Error al obtener horario de profesor:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

// Obtener todos los horarios registrados en el sistema
const obtenerTodosHorarios = async (req, res) => {
    try {
        const horarios = await prisma.horario.findMany({
            include: {
                usuario: {
                    select: {
                        nombre: true,
                        apellido: true,
                        correo: true,
                        documento: true
                    }
                }
            },
            orderBy: [
                { dia_semana: 'asc' },
                { hora_inicio: 'asc' }
            ]
        });
        res.json(horarios);
    } catch (error) {
        console.error("Error al obtener todos los horarios:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

// Crear un nuevo horario
const crearHorario = async (req, res) => {
    try {
        const { nombre, dia_semana, hora_inicio, hora_fin, bloque, id_usuario } = req.body;

        if (!nombre || !dia_semana || !hora_inicio || !hora_fin || !bloque || !id_usuario) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        const nuevoHorario = await prisma.horario.create({
            data: {
                nombre,
                dia_semana: dia_semana.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(),
                hora_inicio,
                hora_fin,
                bloque,
                id_usuario: parseInt(id_usuario)
            }
        });

        res.status(201).json(nuevoHorario);
    } catch (error) {
        console.error("Error al crear horario:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

// Actualizar un horario existente
const actualizarHorario = async (req, res) => {
    try {
        const { id_horario } = req.params;
        const { nombre, dia_semana, hora_inicio, hora_fin, bloque, id_usuario } = req.body;

        if (!nombre || !dia_semana || !hora_inicio || !hora_fin || !bloque || !id_usuario) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        const horarioActualizado = await prisma.horario.update({
            where: {
                id_horario: parseInt(id_horario)
            },
            data: {
                nombre,
                dia_semana: dia_semana.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(),
                hora_inicio,
                hora_fin,
                bloque,
                id_usuario: parseInt(id_usuario)
            }
        });

        res.json(horarioActualizado);
    } catch (error) {
        console.error("Error al actualizar horario:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

// Eliminar un horario
const eliminarHorario = async (req, res) => {
    try {
        const { id_horario } = req.params;

        await prisma.horario.delete({
            where: {
                id_horario: parseInt(id_horario)
            }
        });

        res.json({ message: "Horario eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar horario:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

// Guardar/Actualizar todo el horario de un docente de forma atómica en una transacción
const guardarHorarioDocente = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const { clases } = req.body; // Array de { nombre, dia_semana, hora_inicio, hora_fin, bloque }

        const result = await prisma.$transaction([
            // 1. Eliminar todos los horarios actuales de este docente
            prisma.horario.deleteMany({
                where: {
                    id_usuario: parseInt(id_usuario)
                }
            }),
            // 2. Crear los nuevos horarios si hay alguno seleccionado
            ...(clases && clases.length > 0 ? [
                prisma.horario.createMany({
                    data: clases.map(cl => ({
                        nombre: cl.nombre,
                        dia_semana: cl.dia_semana.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(),
                        hora_inicio: cl.hora_inicio,
                        hora_fin: cl.hora_fin,
                        bloque: cl.bloque,
                        id_usuario: parseInt(id_usuario)
                    }))
                })
            ] : [])
        ]);

        res.json({ message: "Horario de docente guardado correctamente", result });
    } catch (error) {
        console.error("Error al guardar horario de docente:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

// Obtener el horario global de docentes para el día de hoy
const obtenerHorarioGlobalHoy = async (req, res) => {
    try {
        const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
        
        // Determinar el día de hoy
        const hoy = new Date();
        const targetDay = req.query.dia || diasSemana[hoy.getDay()];

        // Obtener el inicio y fin del día actual para buscar la asistencia
        const inicioDia = new Date();
        inicioDia.setHours(0, 0, 0, 0);
        
        const finDia = new Date(inicioDia);
        finDia.setDate(finDia.getDate() + 1);

        // Buscar docentes, sus horarios de hoy y asistencia de hoy
        const docentes = await prisma.usuario.findMany({
            where: {
                role: {
                    nombre_rol: "DOCENTE"
                }
            },
            include: {
                horarios: {
                    where: {
                        dia_semana: targetDay.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
                    },
                    orderBy: {
                        hora_inicio: 'asc'
                    }
                },
                asistencias: {
                    where: {
                        fecha: {
                            gte: inicioDia,
                            lt: finDia
                        }
                    },
                    orderBy: {
                        id_asistencia: 'desc'
                    },
                    take: 1
                },
                novedades: {
                    where: {
                        fecha: {
                            gte: inicioDia,
                            lt: finDia
                        },
                        estado: "APROBADO"
                    },
                    include: {
                        tipo_novedad: true
                    }
                }
            }
        });

        const globalHoyData = docentes.map(docente => {
            const asistencia = docente.asistencias.length > 0 ? docente.asistencias[0] : null;
            const estadoAsistencia = asistencia ? asistencia.estado : "NO_PRESENTE";
            return {
                id_usuario: docente.id_usuario,
                nombre: docente.nombre,
                apellido: docente.apellido,
                documento: docente.documento,
                estado: estadoAsistencia,
                hora_entrada: asistencia ? asistencia.hora_entrada : null,
                hora_salida: asistencia ? asistencia.hora_salida : null,
                minutos_tardanza: asistencia ? asistencia.minutos_tardanza : null,
                minutos_salida_anticipada: asistencia ? asistencia.minutos_salida_anticipada : null,
                novedadesHoy: docente.novedades || [],
                clases: docente.horarios.map(h => ({
                    id_horario: h.id_horario,
                    nombre: h.nombre,
                    hora_inicio: h.hora_inicio,
                    hora_fin: h.hora_fin,
                    bloque: h.bloque
                }))
            };
        });

        res.json(globalHoyData);
    } catch (error) {
        console.error("Error al obtener horario global de hoy:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

module.exports = {
    obtenerHorarioProfesor,
    obtenerTodosHorarios,
    crearHorario,
    actualizarHorario,
    eliminarHorario,
    guardarHorarioDocente,
    obtenerHorarioGlobalHoy
};