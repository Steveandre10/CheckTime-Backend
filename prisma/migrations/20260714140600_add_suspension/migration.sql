-- CreateTable
CREATE TABLE "Suspension" (
    "id_suspension" SERIAL NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suspension_pkey" PRIMARY KEY ("id_suspension")
);
