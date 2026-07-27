-- CreateTable
CREATE TABLE "Role" (
    "id_role" SERIAL NOT NULL,
    "nombre_rol" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id_role")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "telefono" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_role" INTEGER NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Horario" (
    "id_horario" SERIAL NOT NULL,
    "dia_semana" TEXT NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fin" TEXT NOT NULL,
    "bloque" TEXT NOT NULL,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Horario_pkey" PRIMARY KEY ("id_horario")
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id_asistencia" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora_entrada" TIMESTAMP(3),
    "hora_salida" TIMESTAMP(3),
    "estado" TEXT NOT NULL,
    "minutos_tardanza" INTEGER,
    "minutos_salida_anticipada" INTEGER,
    "observacion" TEXT,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id_asistencia")
);

-- CreateTable
CREATE TABLE "TipoPermiso" (
    "id_tipo_permiso" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "TipoPermiso_pkey" PRIMARY KEY ("id_tipo_permiso")
);

-- CreateTable
CREATE TABLE "Permiso" (
    "id_permiso" SERIAL NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "archivo" TEXT,
    "estado" TEXT NOT NULL,
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horas_anticipacion" INTEGER,
    "cumple_regla" BOOLEAN,
    "id_usuario" INTEGER NOT NULL,
    "id_tipo_permiso" INTEGER NOT NULL,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id_permiso")
);

-- CreateTable
CREATE TABLE "TipoNovedad" (
    "id_tipo_novedad" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "TipoNovedad_pkey" PRIMARY KEY ("id_tipo_novedad")
);

-- CreateTable
CREATE TABLE "Novedad" (
    "id_novedad" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "archivo" TEXT,
    "estado" TEXT NOT NULL,
    "horas_afectadas" INTEGER,
    "id_usuario" INTEGER NOT NULL,
    "id_tipo_novedad" INTEGER NOT NULL,

    CONSTRAINT "Novedad_pkey" PRIMARY KEY ("id_novedad")
);

-- CreateTable
CREATE TABLE "Cobertura" (
    "id_cobertura" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "observacion" TEXT,
    "estado" TEXT NOT NULL,
    "id_docente_ausente" INTEGER NOT NULL,
    "id_docente_cobertura" INTEGER NOT NULL,
    "id_horario" INTEGER NOT NULL,

    CONSTRAINT "Cobertura_pkey" PRIMARY KEY ("id_cobertura")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_documento_key" ON "Usuario"("documento");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_role_fkey" FOREIGN KEY ("id_role") REFERENCES "Role"("id_role") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Horario" ADD CONSTRAINT "Horario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permiso" ADD CONSTRAINT "Permiso_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permiso" ADD CONSTRAINT "Permiso_id_tipo_permiso_fkey" FOREIGN KEY ("id_tipo_permiso") REFERENCES "TipoPermiso"("id_tipo_permiso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Novedad" ADD CONSTRAINT "Novedad_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Novedad" ADD CONSTRAINT "Novedad_id_tipo_novedad_fkey" FOREIGN KEY ("id_tipo_novedad") REFERENCES "TipoNovedad"("id_tipo_novedad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobertura" ADD CONSTRAINT "Cobertura_id_docente_ausente_fkey" FOREIGN KEY ("id_docente_ausente") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobertura" ADD CONSTRAINT "Cobertura_id_docente_cobertura_fkey" FOREIGN KEY ("id_docente_cobertura") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobertura" ADD CONSTRAINT "Cobertura_id_horario_fkey" FOREIGN KEY ("id_horario") REFERENCES "Horario"("id_horario") ON DELETE RESTRICT ON UPDATE CASCADE;
