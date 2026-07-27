const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Seed Roles
  await prisma.role.createMany({
    data: [
      { nombre_rol: "ADMIN" },
      { nombre_rol: "RECTOR" },
      { nombre_rol: "COORDINADOR" },
      { nombre_rol: "DOCENTE" }
    ],
    skipDuplicates: true
  });

  // Seed TipoNovedad if empty
  const countNovedades = await prisma.tipoNovedad.count();
  if (countNovedades === 0) {
    await prisma.tipoNovedad.createMany({
      data: [
        { id_tipo_novedad: 1, nombre: "Ausencia total" },
        { id_tipo_novedad: 2, nombre: "Tardanza" },
        { id_tipo_novedad: 3, nombre: "Salida anticipada" },
        { id_tipo_novedad: 4, nombre: "Permiso" },
        { id_tipo_novedad: 5, nombre: "Comisión institucional" }
      ]
    });
    console.log("TipoNovedad seeded successfully.");
  }

  // Seed TipoPermiso: Delete old ones and insert the 9 exact types
  console.log("Re-seeding TipoPermiso...");
  await prisma.permiso.deleteMany({});
  await prisma.tipoPermiso.deleteMany({});
  await prisma.tipoPermiso.createMany({
    data: [
      { id_tipo_permiso: 1, nombre: "Baja por enfermedad (o lesión)" },
      { id_tipo_permiso: 2, nombre: "Permiso por defunción (familiar directo)" },
      { id_tipo_permiso: 3, nombre: "Permiso por defunción (otro)" },
      { id_tipo_permiso: 4, nombre: "Asuntos propios" },
      { id_tipo_permiso: 5, nombre: "Servicio de jurado o licencia por asuntos jurídicos" },
      { id_tipo_permiso: 6, nombre: "Licencia por urgencia" },
      { id_tipo_permiso: 7, nombre: "Excedencia" },
      { id_tipo_permiso: 8, nombre: "Licencia sin sueldo" },
      { id_tipo_permiso: 9, nombre: "Otro" }
    ]
  });
  console.log("TipoPermiso seeded successfully.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });