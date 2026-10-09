-- Tabla donde el backend guarda el ISA calculado (una fila por legajo + propuesta + fecha de análisis).
-- Reconstruida a partir de src/services/indicesRendimiento/rendimiento.repository.js
-- (INSERT ... ON CONFLICT de guardarRendimiento y SELECT de buscarRendimiento).
-- El esquema es el de SCHEMA_RENDIMIENTO (por defecto fce_per).

CREATE SCHEMA IF NOT EXISTS fce_per;

CREATE TABLE IF NOT EXISTS fce_per.rendimiento_academico (
    legajo                    varchar(20)  NOT NULL,
    propuesta_id              integer      NOT NULL,
    fecha_analisis            date         NOT NULL,

    sede_id                   smallint,
    anio_ingreso              smallint,
    tipo_ingreso              smallint,

    materias_totales          integer,
    materias_aprobadas        integer,
    materias_pendientes       integer,
    materias_reprobadas       integer,
    materias_ausentes         integer,
    -- aprobadas discriminadas por origen: E examen, P promoción, B equivalencia
    materias_aprobadas_examen integer,
    materias_promocionadas    integer,
    materias_por_equivalencia integer,
    cantidad_examenes         integer,
    examenes_reprobados       integer,
    total_intentos            integer,
    total_ausencias           integer,      -- ausencias a examen (el ausente solo existe en exámenes)

    -- completud de la carrera: informativa, no entra al ISA
    materias_plan             integer,
    completud                 numeric(5,1),
    duracion_plan_anios       numeric(4,2),
    duracion_proyectada_anios numeric(6,1), -- coef_carrera × duracion_plan_anios

    promedio_notas            numeric(5,2),
    coef_carrera              numeric(8,2),
    cant_ran                  integer,
    reg_vig                   varchar(1),

    -- sub-índices 0-100; NULL cuando el componente no tuvo dato
    score_compromiso          numeric(5,1),
    score_capacidad           numeric(5,1),
    score_ritmo               numeric(5,1),
    score_recursadas          numeric(5,1),
    score_continuidad         numeric(5,1),

    isa                       numeric(5,1) NOT NULL,
    clasificacion             varchar(40)  NOT NULL,
    alerta_por_componente     boolean      NOT NULL DEFAULT false,

    version_formula           varchar(10)  NOT NULL DEFAULT 'v2',
    pesos_usados              jsonb        NOT NULL DEFAULT '{}'::jsonb,
    desglose                  jsonb        NOT NULL DEFAULT '{}'::jsonb,
    origen_calculo            varchar(20)  NOT NULL DEFAULT 'batch',
    creado_en                 timestamptz  NOT NULL DEFAULT now(),

    -- requerida por el ON CONFLICT (legajo, propuesta_id, fecha_analisis) del backend
    CONSTRAINT rendimiento_academico_pkey PRIMARY KEY (legajo, propuesta_id, fecha_analisis)
);

-- Filtros de GET /indices-rendimiento
CREATE INDEX IF NOT EXISTS rendimiento_academico_grupo_idx
    ON fce_per.rendimiento_academico (propuesta_id, sede_id, anio_ingreso);
CREATE INDEX IF NOT EXISTS rendimiento_academico_clasificacion_idx
    ON fce_per.rendimiento_academico (clasificacion);

-- Si la tabla ya existía con la fórmula v1 (la otra PC), el CREATE de arriba no la toca:
-- estas columnas son las que agrega la v2. score_progreso de la v1 queda sin usar.
ALTER TABLE fce_per.rendimiento_academico
    ADD COLUMN IF NOT EXISTS materias_aprobadas_examen integer,
    ADD COLUMN IF NOT EXISTS examenes_reprobados       integer,
    ADD COLUMN IF NOT EXISTS materias_plan             integer,
    ADD COLUMN IF NOT EXISTS completud                 numeric(5,1),
    ADD COLUMN IF NOT EXISTS duracion_plan_anios       numeric(4,2),
    ADD COLUMN IF NOT EXISTS duracion_proyectada_anios numeric(6,1);
