const prisma = require('../config/db');

// Crear una nueva cobertura
const crearCobertura = async (req, res) => {
    try {
        const { fecha, id_docente_ausente, id_docente_cobertura, id_horario, observacion } = req.body;

        if (!fecha || !id_docente_ausente || !id_docente_cobertura || !id_horario) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        const nuevaCobertura = await prisma.cobertura.create({
            data: {
                fecha: new Date(fecha),
                observacion,
                estado: "ASIGNADA",
                id_docente_ausente: parseInt(id_docente_ausente),
                id_docente_cobertura: parseInt(id_docente_cobertura),
                id_horario: parseInt(id_horario)
            },
            include: {
                docente_ausente: {
                    select: { id_usuario: true, nombre: true, apellido: true }
                },
                docente_cobertura: {
                    select: { id_usuario: true, nombre: true, apellido: true }
                },
                horario: true
            }
        });

        res.status(201).json(nuevaCobertura);
    } catch (error) {
        console.error("Error al crear cobertura:", error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener todas las coberturas registradas
const obtenerTodasCoberturas = async (req, res) => {
    try {
        const coberturas = await prisma.cobertura.findMany({
            include: {
                docente_ausente: {
                    select: { id_usuario: true, nombre: true, apellido: true, documento: true }
                },
                docente_cobertura: {
                    select: { id_usuario: true, nombre: true, apellido: true, documento: true }
                },
                horario: true
            },
            orderBy: {
                fecha: 'desc'
            }
        });

        // Calcular horas cubiertas por cada bloque
        const data = coberturas.map(cob => {
            // Contamos cada bloque como 1 hora académica cubierta
            return {
                ...cob,
                horas: 1
            };
        });

        res.json(data);
    } catch (error) {
        console.error("Error al obtener todas las coberturas:", error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener coberturas asignadas a un docente específico
const obtenerCoberturasUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const { fecha } = req.query; // opcional para filtrar por fecha

        let whereClause = {
            id_docente_cobertura: parseInt(id_usuario)
        };

        if (fecha) {
            const start = new Date(fecha);
            start.setHours(0, 0, 0, 0);
            const end = new Date(fecha);
            end.setHours(23, 59, 59, 999);
            whereClause.fecha = {
                gte: start,
                lte: end
            };
        }

        const coberturas = await prisma.cobertura.findMany({
            where: whereClause,
            include: {
                docente_ausente: {
                    select: { id_usuario: true, nombre: true, apellido: true }
                },
                horario: true
            },
            orderBy: {
                fecha: 'desc'
            }
        });

        const data = coberturas.map(cob => ({
            ...cob,
            horas: 1
        }));

        res.json(data);
    } catch (error) {
        console.error("Error al obtener coberturas de usuario:", error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener la lista de docentes disponibles para cobertura
const obtenerDocentesDisponibles = async (req, res) => {
    try {
        const { fecha, id_horario } = req.query;

        if (!fecha || !id_horario) {
            return res.status(400).json({ message: "Se requieren los parámetros fecha e id_horario" });
        }

        // 1. Obtener detalles del horario a cubrir
        const horarioACubrir = await prisma.horario.findUnique({
            where: { id_horario: parseInt(id_horario) }
        });

        if (!horarioACubrir) {
            return res.status(404).json({ message: "Horario no encontrado" });
        }

        const [year, month, dayVal] = fecha.split('-').map(Number);
        const targetDate = new Date(year, month - 1, dayVal);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Día de la semana correspondiente a la fecha
        const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
        const diaSemanaStr = diasSemana[targetDate.getDay()];

        // Rango de mes para conteo de coberturas
        const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

        // 2. Obtener todos los docentes
        const docentes = await prisma.usuario.findMany({
            where: {
                role: {
                    nombre_rol: "DOCENTE"
                },
                estado: true
            },
            include: {
                horarios: {
                    where: {
                        dia_semana: diaSemanaStr
                    }
                },
                asistencias: {
                    where: {
                        fecha: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    },
                    take: 1
                },
                novedades: {
                    where: {
                        fecha: {
                            gte: startOfDay,
                            lte: endOfDay
                        },
                        estado: "APROBADO"
                    }
                },
                permisos: {
                    where: {
                        estado: {
                            in: ["APROBADO", "PENDIENTE"]
                        },
                        fecha_inicio: { lte: endOfDay },
                        fecha_fin: { gte: startOfDay }
                    }
                }
            }
        });

        const disponibles = [];

        // Hora actual si la fecha es hoy
        const ahora = new Date();
        const esHoy = ahora.toDateString() === targetDate.toDateString();

        for (const docente of docentes) {
            // Regla 1: No tener clase programada ese día de la semana
            if (docente.horarios.length === 0) {
                continue; // no tiene clases hoy -> no sale
            }

            // Regla 2: Excluir si está ausente por Novedad o Permiso aprobado o pendiente
            const tieneNovedadAusencia = docente.novedades.some(n => n.id_tipo_novedad === 1 || n.id_tipo_novedad === 4 || n.id_tipo_novedad === 5); // Ausencia total, Permiso o Comisión
            const tienePermiso = docente.permisos.length > 0;
            if (tieneNovedadAusencia || tienePermiso) {
                continue; // ausente por permiso/novedad -> no sale
            }

            // Regla 3: Excluir si está marcado como inasistente (Asistencia: NO_PRESENTE)
            const asistenciaHoy = docente.asistencias.length > 0 ? docente.asistencias[0] : null;
            if (asistenciaHoy && asistenciaHoy.estado === "NO_PRESENTE") {
                continue; // inasistente confirmado -> no sale
            }

            // Regla 4: Si es hoy y el docente ya debió ingresar (pasó su primera clase) pero no tiene registro de asistencia, es ausente/falta
            if (esHoy && !asistenciaHoy && docente.horarios.length > 0) {
                // Ordenamos clases de hoy para buscar la primera
                const clasesOrdenadas = [...docente.horarios].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
                const primeraClase = clasesOrdenadas[0];
                const [h, m] = primeraClase.hora_inicio.split(":").map(Number);
                const primeraClaseTime = new Date(ahora);
                primeraClaseTime.setHours(h, m, 0, 0);

                if (ahora > primeraClaseTime) {
                    continue; // ya pasó su hora de entrada y no ha venido -> no sale
                }
            }

            // Regla 5: No debe estar dando clase en el bloque actual (excluyendo horas pedagógicas)
            const daClaseEnBloque = docente.horarios.some(h => 
                h.nombre !== "HORA PEDAGOGICA" && (
                    (h.hora_inicio === horarioACubrir.hora_inicio && h.hora_fin === horarioACubrir.hora_fin) ||
                    (h.bloque.toUpperCase() === horarioACubrir.bloque.toUpperCase())
                )
            );
            if (daClaseEnBloque) {
                continue; // está dando clase -> no sale
            }

            // Regla 6: No debe estar haciendo otra cobertura en el mismo bloque/fecha
            const tieneOtraCoberturaEnBloque = await prisma.cobertura.findFirst({
                where: {
                    id_docente_cobertura: docente.id_usuario,
                    fecha: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    horario: {
                        hora_inicio: horarioACubrir.hora_inicio,
                        hora_fin: horarioACubrir.hora_fin
                    }
                }
            });
            if (tieneOtraCoberturaEnBloque) {
                continue; // ya está cubriendo otra clase en este bloque -> no sale
            }

            // Obtener el conteo de coberturas del docente en el mes actual
            const conteoCoberturasMes = await prisma.cobertura.count({
                where: {
                    id_docente_cobertura: docente.id_usuario,
                    fecha: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            });

            disponibles.push({
                id_usuario: docente.id_usuario,
                nombre: docente.nombre,
                apellido: docente.apellido,
                documento: docente.documento,
                coberturasMes: conteoCoberturasMes
            });
        }

        // Ordenar: primero los que tienen menos coberturas en el mes
        disponibles.sort((a, b) => a.coberturasMes - b.coberturasMes);

        res.json(disponibles);
    } catch (error) {
        console.error("Error al obtener docentes disponibles:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    crearCobertura,
    obtenerTodasCoberturas,
    obtenerCoberturasUsuario,
    obtenerDocentesDisponibles
};
