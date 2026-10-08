CREATE OR REPLACE FUNCTION fce_per.verificar_desfasajes_alumnos_info(p_incluir_sin_legajo boolean DEFAULT false)
RETURNS TABLE (
  desfasaje      text,
  alumno         integer,
  legajo_sga     varchar,
  ubicacion_info integer,
  ubicacion_sga  integer,
  propuesta_info integer,
  propuesta_sga  integer,
  calidad_info   char,
  calidad_sga    char,
  ultima_reinscripcion integer
)
LANGUAGE sql STABLE AS $$
  SELECT x.desfasaje, x.alumno, x.legajo_sga,
         x.ubicacion_info, x.ubicacion_sga,
         x.propuesta_info, x.propuesta_sga,
         x.calidad_info, x.calidad_sga,
         -- sin reinscripcion del anio en curso: activo que SGA todavia no paso a pasivo, o ingreso nuevo
         (SELECT max(r.anio_academico) FROM negocio.sga_reinscripciones r WHERE r.alumno = x.alumno)::integer
  FROM (
    SELECT
      CASE
        WHEN ai.alumno IS NULL THEN 'FALTA_EN_ALUMNOS_INFO'
        WHEN sa.alumno IS NULL THEN 'NO_EXISTE_EN_SGA'
        WHEN ai.ubicacion <> sa.ubicacion AND ai.propuesta <> sa.propuesta THEN 'UBICACION_Y_PROPUESTA_DISTINTAS'
        WHEN ai.ubicacion <> sa.ubicacion THEN 'UBICACION_DISTINTA'
        WHEN ai.propuesta <> sa.propuesta THEN 'PROPUESTA_DISTINTA'
        WHEN ai.calidad IS DISTINCT FROM sa.calidad THEN 'CALIDAD_DISTINTA'
      END                              AS desfasaje,
      COALESCE(sa.alumno, ai.alumno)   AS alumno,
      sa.legajo                        AS legajo_sga,
      ai.ubicacion                     AS ubicacion_info,
      sa.ubicacion                     AS ubicacion_sga,
      ai.propuesta                     AS propuesta_info,
      sa.propuesta                     AS propuesta_sga,
      ai.calidad                       AS calidad_info,
      sa.calidad                       AS calidad_sga
    FROM negocio.sga_alumnos sa
    FULL JOIN fce_per.alumnos_info ai ON ai.alumno = sa.alumno
    WHERE (sa.calidad = 'A' OR ai.calidad = 'A')
      -- activos de SGA fuera de las carreras que maneja alumnos_info no cuentan como faltantes
      AND (ai.alumno IS NOT NULL OR sa.propuesta IN (1,2,3,6,7,8))
      -- aspirantes sin legajo: solo si se piden
      AND (ai.alumno IS NOT NULL OR p_incluir_sin_legajo OR NULLIF(sa.legajo, '') IS NOT NULL)
  ) x
  WHERE x.desfasaje IS NOT NULL
  ORDER BY x.desfasaje, x.ubicacion_sga, x.propuesta_sga, x.alumno
$$;
