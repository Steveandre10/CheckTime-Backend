const {PrismaClient} = require('@prisma/client');

const prisma = new PrismaClient();

// Helper para parsear fechas YYYY-MM-DD como fechas locales (medianoche)
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const registrarEntrada = async (req, res) => {

    try {

        const { id_usuario } = req.body;

        const hoy = new Date();
        const inicioDia = new Date(hoy);
        inicioDia.setHours(0,0,0,0);

        const finDia = new Date(inicioDia);
        finDia.setDate(finDia.getDate() + 1);

        const finDiaExacto = new Date(hoy);
        finDiaExacto.setHours(23,59,59,999);

        const suspensionHoy = await prisma.suspension.findFirst({
            where: {
                fecha_inicio: {
                    lte: finDiaExacto
                },
                fecha_fin: {
                    gte: inicioDia
                }
            }
        });

        if (suspensionHoy) {
            return res.status(400).json({
                message: `El registro de asistencia está inhabilitado hoy por: ${suspensionHoy.motivo || suspensionHoy.tipo} (${suspensionHoy.tipo}).`
            });
        }


        const asistenciaExistente = await prisma.asistencia.findFirst({
            where: {
                id_usuario: parseInt(id_usuario),
                fecha: {
                    gte: inicioDia,
                    lt: finDia
                }
            }
        });

        if (asistenciaExistente) {

            return res.status(400).json({
                message: "Ya has registrado tu entrada hoy."
            });

        }

        // Calcular minutos de tardanza comparando con la hora_inicio de la primera clase
        const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
        const diaSemana = diasSemana[hoy.getDay()];

        const horariosHoy = await prisma.horario.findMany({
            where: {
                id_usuario: parseInt(id_usuario),
                dia_semana: diaSemana
            },
            orderBy: {
                hora_inicio: 'asc'
            }
        });

        let minutosTardanza = 0;
        let estado = "PRESENTE";

        if (horariosHoy.length > 0) {
            const primeraClase = horariosHoy[0];
            const [hora, min] = primeraClase.hora_inicio.split(":").map(Number);
            const horaInicioPlaneada = new Date(hoy);
            horaInicioPlaneada.setHours(hora, min, 0, 0);

            if (hoy > horaInicioPlaneada) {
                minutosTardanza = Math.floor((hoy.getTime() - horaInicioPlaneada.getTime()) / 60000);
                if (minutosTardanza > 0) {
                    estado = "TARDANZA";
                }
            }
        }

        const nuevaAsistencia = await prisma.asistencia.create({
            data: {
                id_usuario: parseInt(id_usuario),
                fecha: hoy,
                hora_entrada: hoy,
                estado,
                minutos_tardanza: minutosTardanza > 0 ? minutosTardanza : null
            }
        });

        res.status(201).json(nuevaAsistencia);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            error: error.message
        });

    }
};

const registrarSalida = async (req, res) => {
    try {

        const { id_usuario } = req.body;

        const hoy = new Date();
        const inicioDia = new Date(hoy);
        inicioDia.setHours(0,0,0,0);
        const finDiaExacto = new Date(hoy);
        finDiaExacto.setHours(23,59,59,999);

        const suspensionHoy = await prisma.suspension.findFirst({
            where: {
                fecha_inicio: {
                    lte: finDiaExacto
                },
                fecha_fin: {
                    gte: inicioDia
                }
            }
        });

        if (suspensionHoy) {
            return res.status(400).json({
                message: `El registro de asistencia está inhabilitado hoy por: ${suspensionHoy.motivo || suspensionHoy.tipo} (${suspensionHoy.tipo}).`
            });
        }

        const asistencia = await prisma.asistencia.findFirst({

            where: {
                id_usuario: parseInt(id_usuario)
            },
            orderBy: {
                id_asistencia: 'desc'
            }
        });
        if (!asistencia) {
            return res.status(404).json({
                message: "No existe asistencia registrada para este usuario."
            });
        }

        // Calcular minutos de salida anticipada comparando con la hora_fin de la última clase
        const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
        const diaSemana = diasSemana[hoy.getDay()];

        const horariosHoy = await prisma.horario.findMany({
            where: {
                id_usuario: parseInt(id_usuario),
                dia_semana: diaSemana
            },
            orderBy: {
                hora_fin: 'asc'
            }
        });

        let minutosSalidaAnticipada = 0;
        let estadoSalida = "FINALIZADO";

        if (horariosHoy.length > 0) {
            const ultimaClase = horariosHoy[horariosHoy.length - 1];
            const [hora, min] = ultimaClase.hora_fin.split(":").map(Number);
            const horaFinPlaneada = new Date(hoy);
            horaFinPlaneada.setHours(hora, min, 0, 0);

            if (hoy < horaFinPlaneada) {
                // Verificar si existe alguna novedad registrada y aprobada para el usuario el día de hoy
                const inicioDia = new Date(hoy);
                inicioDia.setHours(0, 0, 0, 0);
                const finDia = new Date(inicioDia);
                finDia.setDate(finDia.getDate() + 1);

                const novedadHoy = await prisma.novedad.findFirst({
                    where: {
                        id_usuario: parseInt(id_usuario),
                        estado: "APROBADO",
                        fecha: {
                            gte: inicioDia,
                            lt: finDia
                        }
                    }
                });

                // También buscamos si tiene un permiso aprobado para el día de hoy
                const permisoHoy = await prisma.permiso.findFirst({
                    where: {
                        id_usuario: parseInt(id_usuario),
                        estado: "APROBADO",
                        fecha_inicio: {
                            lte: finDia
                        },
                        fecha_fin: {
                            gte: inicioDia
                        }
                    }
                });

                if (!novedadHoy && !permisoHoy) {
                    return res.status(400).json({
                        message: `No puedes registrar la salida antes de tu hora de salida oficial (${ultimaClase.hora_fin}) a menos que tu solicitud de novedad o permiso por salida anticipada esté ACEPTADA por el rector.`
                    });
                }

                // Verificar si hay clases afectadas en el permiso o novedad y restringir la hora de salida
                let clasesNovedad = [];
                if (novedadHoy) {
                    try {
                        const desc = typeof novedadHoy.descripcion === 'string' ? JSON.parse(novedadHoy.descripcion) : novedadHoy.descripcion;
                        if (desc && Array.isArray(desc.clases_afectadas)) {
                            clasesNovedad = desc.clases_afectadas;
                        }
                    } catch (e) {}
                }

                let clasesPermiso = [];
                if (permisoHoy) {
                    try {
                        const desc = typeof permisoHoy.descripcion === 'string' ? JSON.parse(permisoHoy.descripcion) : permisoHoy.descripcion;
                        if (desc && Array.isArray(desc.clases_afectadas)) {
                            clasesPermiso = desc.clases_afectadas;
                        }
                    } catch (e) {}
                }

                const todasClasesAfectadas = [...clasesNovedad, ...clasesPermiso];

                if (todasClasesAfectadas.length > 0) {
                    let minHora = null;
                    for (const c of todasClasesAfectadas) {
                        if (c.hora_inicio) {
                            if (!minHora || c.hora_inicio < minHora) {
                                minHora = c.hora_inicio;
                            }
                        }
                    }

                    if (minHora) {
                        const [h, m] = minHora.split(":").map(Number);
                        const horaSalidaPedida = new Date(hoy);
                        horaSalidaPedida.setHours(h, m, 0, 0);

                        if (hoy < horaSalidaPedida) {
                            return res.status(400).json({
                                message: `Aún no es la hora de tu salida pedida (${minHora}).`
                            });
                        }
                    }
                }

                minutosSalidaAnticipada = Math.floor((horaFinPlaneada.getTime() - hoy.getTime()) / 60000);
                if (minutosSalidaAnticipada > 0) {
                    estadoSalida = "SALIDA_TEMPRANA";
                }
            }
        }

        const salida = await prisma.asistencia.update({
            where: {
                id_asistencia: asistencia.id_asistencia
            },
            data: {
                hora_salida: hoy,
                minutos_salida_anticipada: minutosSalidaAnticipada > 0 ? minutosSalidaAnticipada : null,
                estado: estadoSalida
            }
        });

        res.json(salida);

    } catch (error) {

        console.log(error);
        res.status(500).json({
            error: error.message
        });
    }
};

const obtenerEstado = async (req, res) => {
    try {
        const {id_usuario} = req.params;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);

        const asistencia = await prisma.asistencia.findFirst({
            where: {
                id_usuario: parseInt(id_usuario),
                fecha: {
                    gte: hoy,
                    lt: manana
                }
            },
            orderBy: {
                id_asistencia: 'desc'
            }

        });

        if (!asistencia){
            return res.json({
                estado: "NO_PRESENTE"
            });
        }
        
        res.json({
            estado: asistencia.estado
        })
        

    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: error.message
        });
    }
}

const obtenerReporteAsistencias = async (req, res) => {
    try {
        const { id_usuario, fecha, mes, fecha_inicio, fecha_fin } = req.query;

        // 1. Obtener listado de docentes activos
        const whereDocente = {
            role: {
                nombre_rol: "DOCENTE"
            },
            estado: true
        };
        if (id_usuario) {
            whereDocente.id_usuario = parseInt(id_usuario);
        }
        const docentes = await prisma.usuario.findMany({
            where: whereDocente,
            select: {
                id_usuario: true,
                nombre: true,
                apellido: true,
                documento: true
            }
        });

        // 2. Determinar el listado de fechas del reporte
        let dates = [];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const isSameDay = (d1, d2) => {
            return d1.getFullYear() === d2.getFullYear() &&
                   d1.getMonth() === d2.getMonth() &&
                   d1.getDate() === d2.getDate();
        };

        if (fecha) {
            const d = parseLocalDate(fecha);
            if (d <= hoy) dates.push(d);
        } else if (mes) {
            const [year, month] = mes.split("-").map(Number);
            const start = new Date(year, month - 1, 1);
            // Obtener último día del mes
            const end = new Date(year, month, 0);
            const limit = end < hoy ? end : hoy;
            let current = new Date(start);
            while (current <= limit) {
                dates.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
        } else if (fecha_inicio && fecha_fin) {
            const start = parseLocalDate(fecha_inicio);
            const end = parseLocalDate(fecha_fin);
            const limit = end < hoy ? end : hoy;
            let current = new Date(start);
            while (current <= limit) {
                dates.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
        } else {
            dates.push(hoy);
        }

        if (dates.length === 0) {
            return res.json([]);
        }

        // Ordenar fechas de menor a mayor para buscar el rango
        dates.sort((a, b) => a - b);
        const startRange = new Date(dates[0]);
        startRange.setHours(0, 0, 0, 0);
        const endRange = new Date(dates[dates.length - 1]);
        endRange.setHours(23, 59, 59, 999);

        // 3. Consultas en lote en la base de datos
        const [asistenciasDB, novedadesDB, horariosDB, permisosDB, suspensionesDB] = await Promise.all([
            prisma.asistencia.findMany({
                where: {
                    ...(id_usuario ? { id_usuario: parseInt(id_usuario) } : {}),
                    fecha: {
                        gte: startRange,
                        lte: endRange
                    }
                },
                include: {
                    usuario: {
                        select: {
                            nombre: true,
                            apellido: true,
                            documento: true
                        }
                    }
                }
            }),
            prisma.novedad.findMany({
                where: {
                    ...(id_usuario ? { id_usuario: parseInt(id_usuario) } : {}),
                    fecha: {
                        gte: startRange,
                        lte: endRange
                    },
                    estado: "APROBADO"
                }
            }),
            prisma.horario.findMany({
                where: {
                    ...(id_usuario ? { id_usuario: parseInt(id_usuario) } : {})
                }
            }),
            prisma.permiso.findMany({
                where: {
                    ...(id_usuario ? { id_usuario: parseInt(id_usuario) } : {}),
                    estado: "APROBADO",
                    fecha_inicio: {
                        lte: endRange
                    },
                    fecha_fin: {
                        gte: startRange
                    }
                }
            }),
            prisma.suspension.findMany({
                where: {
                    fecha_inicio: {
                        lte: endRange
                    },
                    fecha_fin: {
                        gte: startRange
                    }
                }
            })
        ]);

        const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
        const reporteFinal = [];

        // 4. Combinar en memoria para generar los registros dinámicos
        for (const date of dates) {
            const weekdayIndex = date.getDay();
            const diaSemanaStr = diasSemana[weekdayIndex];

            // Rango de inicio y fin de hoy
            const startOfToday = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
            const endOfToday = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

            // Verificar si el día está suspendido por paro o vacaciones
            const suspensionHoy = suspensionesDB.find(s => {
                const sStart = new Date(s.fecha_inicio);
                sStart.setHours(0,0,0,0);
                const sEnd = new Date(s.fecha_fin);
                sEnd.setHours(23,59,59,999);
                return startOfToday.getTime() >= sStart.getTime() && startOfToday.getTime() <= sEnd.getTime();
            });

            if (suspensionHoy) {
                // Es un día de suspensión general. Agregamos un único registro representativo para el reporte.
                reporteFinal.push({
                    id_asistencia: `suspension-${suspensionHoy.id_suspension}-${startOfToday.toISOString().split("T")[0]}`,
                    fecha: startOfToday,
                    isSuspension: true,
                    tipo: suspensionHoy.tipo, // "PARO" o "VACACIONES"
                    observacion: `Día sin clases por: ${suspensionHoy.motivo || suspensionHoy.tipo}`,
                    estado: suspensionHoy.tipo, // Para que el UI sepa qué tipo es
                    horas_perdidas: 0,
                    minutos_tardanza: null,
                    minutos_salida_anticipada: null,
                    hora_entrada: null,
                    hora_salida: null,
                    usuario: {
                        nombre: `COLEGIO (${suspensionHoy.tipo})`,
                        apellido: "",
                        documento: "-"
                    }
                });
                continue; // Saltar generación de inasistencias individuales para este día
            }

            for (const docente of docentes) {
                // Buscar asistencia real
                const asistenciaReal = asistenciasDB.find(
                    a => a.id_usuario === docente.id_usuario && isSameDay(new Date(a.fecha), date)
                );

                // Calcular horas perdidas para este docente en este día
                const novedadAprobada = novedadesDB.find(
                    n => n.id_usuario === docente.id_usuario && isSameDay(new Date(n.fecha), date)
                );

                const permisoAprobado = permisosDB.find(
                    p => p.id_usuario === docente.id_usuario &&
                         new Date(p.fecha_inicio) <= endOfToday &&
                         new Date(p.fecha_fin) >= startOfToday
                );

                const clasesProgramadas = horariosDB.filter(
                    h => h.id_usuario === docente.id_usuario && h.dia_semana === diaSemanaStr
                );

                let horasPerdidas = 0;

                if (novedadAprobada) {
                    if (novedadAprobada.id_tipo_novedad === 1) { // Ausencia total
                        horasPerdidas = clasesProgramadas.length;
                    } else {
                        try {
                            const desc = JSON.parse(novedadAprobada.descripcion);
                            if (desc.clases_afectadas && desc.clases_afectadas.length > 0) {
                                horasPerdidas += desc.clases_afectadas.length;
                            } else {
                                horasPerdidas += novedadAprobada.horas_afectadas || 0;
                            }
                        } catch (e) {
                            horasPerdidas += novedadAprobada.horas_afectadas || 0;
                        }
                    }
                }

                if (permisoAprobado) {
                    const isSingleDay = isSameDay(new Date(permisoAprobado.fecha_inicio), new Date(permisoAprobado.fecha_fin));
                    if (isSingleDay) {
                        try {
                            const desc = JSON.parse(permisoAprobado.descripcion);
                            if (desc.clases_afectadas && desc.clases_afectadas.length > 0) {
                                horasPerdidas += desc.clases_afectadas.length;
                            } else {
                                horasPerdidas += clasesProgramadas.length;
                            }
                        } catch (e) {
                            horasPerdidas += clasesProgramadas.length;
                        }
                    } else {
                        horasPerdidas += clasesProgramadas.length;
                    }
                }

                // Limitar horas perdidas
                if (horasPerdidas > clasesProgramadas.length) {
                    horasPerdidas = clasesProgramadas.length;
                }

                if (asistenciaReal) {
                    reporteFinal.push({
                        ...asistenciaReal,
                        horas_perdidas: horasPerdidas
                    });
                } else {
                    // Si no tiene registro, evaluamos si le tocaba clase ese día
                    const tieneClase = clasesProgramadas.length > 0;

                    let estadoVirtual = "NO_TIENE_CLASES";
                    let observacionVirtual = "Sin clases programadas este día";

                    if (tieneClase) {
                        if (novedadAprobada || permisoAprobado) {
                            estadoVirtual = "CON_PERMISO";
                            observacionVirtual = novedadAprobada ? "Ausente con novedad aprobada" : "Ausente con permiso aprobado";
                        } else {
                            estadoVirtual = "NO_PRESENTE";
                            observacionVirtual = "Ausente - No registró entrada";
                        }
                    }

                    reporteFinal.push({
                        id_asistencia: `v-${docente.id_usuario}-${date.toISOString().split("T")[0]}`, // ID virtual único
                        fecha: date,
                        hora_entrada: null,
                        hora_salida: null,
                        estado: estadoVirtual,
                        minutos_tardanza: null,
                        minutos_salida_anticipada: null,
                        observacion: observacionVirtual,
                        id_usuario: docente.id_usuario,
                        usuario: {
                            nombre: docente.nombre,
                            apellido: docente.apellido,
                            documento: docente.documento
                        },
                        horas_perdidas: horasPerdidas
                    });
                }
            }
        }

        // Ordenar el reporte final por fecha descendente
        reporteFinal.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        res.json(reporteFinal);
    } catch (error) {
        console.error("Error al obtener reporte de asistencias:", error);
        res.status(500).json({
            error: error.message
        });
    }
};

module.exports = {
    registrarEntrada,
    registrarSalida,
    obtenerEstado,
    obtenerReporteAsistencias
};
