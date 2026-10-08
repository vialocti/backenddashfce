import coneccionDB from '../../database.js'
import { schemaConfig } from '../../configdb.js'

const ESQUEMA = schemaConfig.schemaRendimiento;

/**
 * Inserta (o reemplaza, si ya existe la misma clave legajo+propuesta+fecha)
 * un registro de rendimiento. Es la ÚNICA escritura del sistema contra su
 * propia base.
 */
async function guardarRendimiento(registro) {
  const {
    legajo, propuestaId, fechaAnalisis, sedeId, anioIngreso, tipoIngreso,
    materiasTotales, materiasAprobadas, materiasPendientes, materiasReprobadas, materiasAusentes,
    materiasPromocionadas, materiasPorEquivalencia, cantidadExamenes,
    totalIntentos, totalAusencias, promedioNotas, coefCarrera, cantRan, regVig,
    scoreProgreso, scoreCompromiso, scoreCapacidad, scoreRitmo, scoreRecursadas, scoreContinuidad,
    isa, clasificacion, alertaPorComponente, pesosUsados, desglose, origenCalculo = 'batch',
  } = registro;

  const { rows } = await coneccionDB.query(
    `INSERT INTO ${ESQUEMA}.rendimiento_academico
       (legajo, propuesta_id, fecha_analisis, sede_id, anio_ingreso,
        materias_totales, materias_aprobadas, materias_pendientes,
        total_intentos, total_ausencias, promedio_notas, coef_carrera, cant_ran, reg_vig,
        score_progreso, score_compromiso, score_capacidad, score_ritmo, score_recursadas, score_continuidad,
        isa, clasificacion, alerta_por_componente, version_formula, pesos_usados, desglose, origen_calculo,
        materias_reprobadas, materias_ausentes, materias_promocionadas, materias_por_equivalencia, cantidad_examenes,
        tipo_ingreso)
     VALUES
       ($1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,$20,
        $21,$22,$23,'v1',$24::jsonb,$25::jsonb,$26,
        $27,$28,$29,$30,$31,
        $32)
     ON CONFLICT (legajo, propuesta_id, fecha_analisis) DO UPDATE SET
        sede_id = EXCLUDED.sede_id,
        anio_ingreso = EXCLUDED.anio_ingreso,
        tipo_ingreso = EXCLUDED.tipo_ingreso,
        materias_totales = EXCLUDED.materias_totales,
        materias_aprobadas = EXCLUDED.materias_aprobadas,
        materias_pendientes = EXCLUDED.materias_pendientes,
        materias_reprobadas = EXCLUDED.materias_reprobadas,
        materias_ausentes = EXCLUDED.materias_ausentes,
        materias_promocionadas = EXCLUDED.materias_promocionadas,
        materias_por_equivalencia = EXCLUDED.materias_por_equivalencia,
        cantidad_examenes = EXCLUDED.cantidad_examenes,
        total_intentos = EXCLUDED.total_intentos,
        total_ausencias = EXCLUDED.total_ausencias,
        promedio_notas = EXCLUDED.promedio_notas,
        coef_carrera = EXCLUDED.coef_carrera,
        cant_ran = EXCLUDED.cant_ran,
        reg_vig = EXCLUDED.reg_vig,
        score_progreso = EXCLUDED.score_progreso,
        score_compromiso = EXCLUDED.score_compromiso,
        score_capacidad = EXCLUDED.score_capacidad,
        score_ritmo = EXCLUDED.score_ritmo,
        score_recursadas = EXCLUDED.score_recursadas,
        score_continuidad = EXCLUDED.score_continuidad,
        isa = EXCLUDED.isa,
        clasificacion = EXCLUDED.clasificacion,
        alerta_por_componente = EXCLUDED.alerta_por_componente,
        pesos_usados = EXCLUDED.pesos_usados,
        desglose = EXCLUDED.desglose,
        origen_calculo = EXCLUDED.origen_calculo,
        creado_en = now()
     RETURNING legajo, propuesta_id AS "propuestaId", fecha_analisis AS "fechaAnalisis", isa, clasificacion`,
    [
      legajo, propuestaId, fechaAnalisis, sedeId, anioIngreso,
      materiasTotales, materiasAprobadas, materiasPendientes,
      totalIntentos, totalAusencias, promedioNotas, coefCarrera, cantRan, regVig,
      scoreProgreso, scoreCompromiso, scoreCapacidad, scoreRitmo, scoreRecursadas, scoreContinuidad,
      isa, clasificacion, alertaPorComponente,
      JSON.stringify(pesosUsados || {}), JSON.stringify(desglose || {}), origenCalculo,
      materiasReprobadas ?? null, materiasAusentes ?? null,
      materiasPromocionadas ?? null, materiasPorEquivalencia ?? null, cantidadExamenes ?? null,
      tipoIngreso ?? null,
    ]
  );

  return rows[0];
}

/**
 * Consulta paramétrica sobre lo ya calculado y guardado. Por defecto trae
 * solo la última corrida por par legajo-propuesta; con `historico: true` trae
 * todas las corridas (para graficar evolución).
 *
 * La última corrida se resuelve acá con DISTINCT ON en vez de usar la vista
 * rendimiento_ultimo, porque la vista fija sus columnas al crearse y no expone
 * las agregadas después (materias_reprobadas, materias_ausentes).
 */
async function buscarRendimiento({
  sedeId = null, anioIngreso = null, propuestaId = null, legajo = null,
  clasificacion = null, historico = false, limit = 200, offset = 0,
}) {
  const origen = historico
    ? `${ESQUEMA}.rendimiento_academico`
    : `(SELECT DISTINCT ON (legajo, propuesta_id) *
          FROM ${ESQUEMA}.rendimiento_academico
         ORDER BY legajo, propuesta_id, fecha_analisis DESC) AS ultimo`;

  const { rows } = await coneccionDB.query(
    `SELECT legajo, propuesta_id AS "propuestaId", fecha_analisis AS "fechaAnalisis",
            sede_id AS "sedeId", anio_ingreso AS "anioIngreso", tipo_ingreso AS "tipoIngreso",
            materias_totales AS "materiasTotales", materias_aprobadas AS "materiasAprobadas",
            materias_pendientes AS "materiasPendientes", materias_reprobadas AS "materiasReprobadas",
            materias_ausentes AS "materiasAusentes", materias_promocionadas AS "materiasPromocionadas",
            materias_por_equivalencia AS "materiasPorEquivalencia", cantidad_examenes AS "cantidadExamenes",
            total_intentos AS "totalIntentos", total_ausencias AS "totalAusencias",
            promedio_notas AS "promedioNotas", coef_carrera AS "coefCarrera", cant_ran AS "cantRan", reg_vig AS "regVig",
            isa, clasificacion, alerta_por_componente AS "alertaPorComponente", desglose
     FROM ${origen}
     WHERE ($1::smallint IS NULL OR sede_id = $1)
       AND ($2::smallint IS NULL OR anio_ingreso = $2)
       AND ($3::integer  IS NULL OR propuesta_id = $3)
       AND ($4::varchar  IS NULL OR legajo = $4)
       AND ($5::varchar  IS NULL OR clasificacion = $5)
     ORDER BY isa ASC, fecha_analisis DESC
     LIMIT $6 OFFSET $7`,
    [sedeId, anioIngreso, propuestaId, legajo, clasificacion, limit, offset]
  );

  return rows;
}

export { guardarRendimiento, buscarRendimiento };
