const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    console.log("Seeding roles...");
    const roles = [
        { id_role: 1, nombre_rol: "Rector", descripcion: "Rector de la institución" },
        { id_role: 2, nombre_rol: "Coordinador", descripcion: "Coordinador" },
        { id_role: 3, nombre_rol: "Profesor", descripcion: "Profesor" },
        { id_role: 4, nombre_rol: "Docente", descripcion: "Docente" }
    ];

    for (const r of roles) {
        await prisma.role.upsert({
            where: { id_role: r.id_role },
            update: {},
            create: r
        });
    }
    console.log("Roles seeded successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
