import coneccionDB from '../database.js'
import { schemaConfig } from '../configdb.js'

const ESQUEMA = schemaConfig.schemaOrigen;

/**
 * ============================================================================
 * ADAPTADOR DEL SISTEMA ACADÉMICO PREEXISTENTE
 * ============================================================================
 * Esta es la ÚNICA pieza del backend que le habla directamente al esquema del
 * sistema preexistente (PG_SCHEMA_ORIGEN, ej. "guarani"). El resto del código
 * (orquestador, controllers) solo conoce estas 4 funciones — nunca arma SQL
 * contra las tablas de origen por su cuenta.
 *
 * IMPORTANTE: los nombres de tabla y columna de abajo son un punto de partida
 * razonable basado en los CSV que ya analizamos (histacauno.csv, alumnos_
 * comision.csv), pero HAY QUE VERIFICARLOS contra el esquema real. Si algún
 * nombre no coincide, se ajusta acá — nada más en el proyecto depende de esto.
 * ============================================================================
 */

/**
 * Resuelve el universo de pares (legajo, propuestaId) que matchean el filtro.
 * Cualquier combinación de sedeId/anioIngreso/propuestaId es válida — los que
 * vienen en null no filtran.
 *
 * NO se filtra por tipo_ingreso: al principio solo se tomaba tipo_ingreso = 1
 * (ingreso por primera vez con título secundario), pero eso dejaba afuera a
 * quienes entraron por otras vías (mayor de 25, pase/equivalencia de otra
 * universidad o facultad, cambio de carrera dentro de la FCE, etc. — ver
 * negocio.sga_propuestas_aspira.tipo_ingreso). Solo se exige aspirante
 * aceptado (situacion_asp 1,2) con legajo asignado.
 *
 * sa.calidad = 'A' (activo) SÍ se filtra — el otro valor posible es 'P' (86%
 * de los legajos con aspiración aceptada), alumnos que ya no están activos.
 * Sin este filtro el ISA se calcularía y guardaría también para ellos.
 *
 * propuesta IN (2,3,7,8) = LA, LE, LLO, CP. A diferencia del resto del
 * backend (que usa 1,2,3,6,7,8, sumando CPN y LNRG), el ISA por ahora
 * solo cubre estas 4 — deja afuera además propuestas no estándar como la 4
 * ("VOC"), que ni siquiera tiene una duración de plan usable.
 */
async function buscarUniverso({ sedeId = null, anioIngreso = null, propuestaId = null }) {
  const { rows } = await coneccionDB.query(
    `SELECT DISTINCT sa.legajo, spa.propuesta AS "propuestaId"
     FROM ${ESQUEMA}.sga_propuestas_aspira spa
     INNER JOIN ${ESQUEMA}.sga_alumnos sa ON sa.persona = spa.persona AND sa.propuesta = spa.propuesta
     WHERE ($1::integer IS NULL OR sa.ubicacion = $1)
       AND ($2::integer IS NULL OR spa.anio_academico = $2)
       AND ($3::integer IS NULL OR spa.propuesta = $3)
       AND spa.propuesta IN (2, 3, 7, 8)
       AND spa.situacion_asp IN (1, 2)
       AND sa.calidad = 'A'
       AND sa.legajo IS NOT NULL`,
    [sedeId, anioIngreso, propuestaId]
  );
  return rows;
}

/**
 * Historia académica transaccional de un alumno EN UNA PROPUESTA puntual,
 * hasta la fecha de corte. Shape esperado por historiaAcademica.service.js:
 * { materia, resultado, nota }, más `origen` y `resultadoCodigo` como datos
 * extra (el motor de scoring actual los ignora, quedan para cuando se los
 * necesite).
 *
 * Fuente: vw_hist_academica (examen, promoción y equivalencia; incluye
 * ausentes):
 *   - origen: 'E' examen | 'P' promoción | 'B' equivalencia
 *   - resultado (código): 'A' aprobó | 'R' no aprobó | 'U' ausente
 *     (resultado_descripcion trae la palabra: 'Aprobado' | 'Promocionado' |
 *     'Reprobado' | 'Ausente' — 'U' solo aparece con origen 'E', una
 *     equivalencia o promoción nunca queda "ausente").
 * La nota es varchar y en algunas equivalencias no es numérica, así que se
 * castea solo cuando lo es.
 *
 * La vista referencia tablas sin calificar, por eso necesita search_path; y se
 * filtra por `alumno` (no por join con sga_alumnos) porque así Postgres empuja
 * el filtro dentro de la vista: ~0,2 s por alumno contra ~17 s con el join.
 */
async function obtenerHistoriaAcademica(legajo, propuestaId, fechaCorte) {
  const client = await coneccionDB.connect();
  try {
    await client.query(`SET search_path = ${ESQUEMA}, public`);

    const { rows: alumnos } = await client.query(
      `SELECT alumno FROM sga_alumnos WHERE legajo = $1 AND propuesta = $2`,
      [legajo, propuestaId]
    );
    if (alumnos.length === 0) {
      throw new Error(`No se encontró alumno para legajo=${legajo}, propuestaId=${propuestaId}`);
    }

    const { rows } = await client.query(
      `SELECT actividad_nombre       AS materia,
              origen,
              resultado               AS "resultadoCodigo",
              resultado_descripcion  AS resultado,
              CASE WHEN nota ~ '^[0-9]+([.,][0-9]+)?$'
                   THEN replace(nota, ',', '.')::numeric END AS nota
       FROM vw_hist_academica
       WHERE alumno = ANY($1::int[])
         AND fecha <= $2
       ORDER BY fecha`,
      [alumnos.map((a) => a.alumno), fechaCorte]
    );
    // pg devuelve numeric como string; el motor promedia notas
    return rows.map((r) => ({ ...r, nota: r.nota === null ? null : Number(r.nota) }));
  } finally {
    await client.query('RESET search_path').catch(() => {});
    client.release();
  }
}

/**
 * Contexto de la inscripción de un alumno en una propuesta: sede, año de
 * ingreso, cantidad de años en RAN, regularidad vigente, y Coef.Carrera.
 *
 * - sede: sga_alumnos.ubicacion
 * - año de ingreso: min(sga_propuestas_aspira.anio_academico) para esa
 *   persona+propuesta, sin filtrar por tipo_ingreso (mismo criterio que
 *   buscarUniverso — ver ahí por qué no se filtra)
 * - regularidad: sga_alumnos.regular ('S'/'N')
 * - cantRan: fce_per.alumnos_info.perdidasreg — es el RAN (Rendimiento
 *   Académico Negativo: años lectivos donde no rindió/aprobó el mínimo de 2
 *   materias). NO es cantidad de materias recursadas (son cosas distintas;
 *   tampoco es cnt_readmisiones de sga_alumnos, que son readmisiones).
 * - Coef.Carrera: fce_per.alumnos_info.coef_tcarrera. Ya viene calculado por
 *   el sistema de origen mirando la trayectoria real (1 = va al día, más alto
 *   = más atrasado) — NO se deriva/estima acá (a diferencia de cuando no hay
 *   fila en alumnos_info, ver derivarCoefCarrera en el orquestador). Su
 *   inversa (1/coef_tcarrera) es la "velocidad de carrera": la columna
 *   coef_vcarrera existe en la tabla pero el sistema de origen no la puebla,
 *   así que la calculamos nosotros.
 * - También de alumnos_info: anioCursada (año de cursada en el que está),
 *   promedioConAplazos/promedioSinAplazos (promedioca/promediosa, escala
 *   0-10) y porcentajeCompletado (completado, 0-100 — % de la carrera ya
 *   cumplido). Ninguno de estos 4 se usa todavía en el motor de scoring
 *   (progreso/capacidad se siguen calculando desde vw_hist_academica) —
 *   quedan disponibles en el contexto para cuando se decida si conviene
 *   preferirlos o combinarlos.
 * - tipoIngreso: el tipo_ingreso de la misma fila de sga_propuestas_aspira que
 *   determina anioIngreso (la de menor anio_academico) — puramente
 *   informativo, ya no se usa como filtro (ver buscarUniverso).
 */
async function obtenerContextoInscripcion(legajo, propuestaId) {
  const { rows } = await coneccionDB.query(
    `SELECT sa.ubicacion            AS "sedeId",
            (SELECT min(spa.anio_academico)::int
               FROM ${ESQUEMA}.sga_propuestas_aspira spa
              WHERE spa.persona = sa.persona
                AND spa.propuesta = sa.propuesta
                AND spa.situacion_asp IN (1, 2)) AS "anioIngreso",
            (SELECT spa.tipo_ingreso
               FROM ${ESQUEMA}.sga_propuestas_aspira spa
              WHERE spa.persona = sa.persona
                AND spa.propuesta = sa.propuesta
                AND spa.situacion_asp IN (1, 2)
              ORDER BY spa.anio_academico ASC
              LIMIT 1) AS "tipoIngreso",
            ai.perdidasreg          AS "cantRan",
            sa.regular              AS "regVig",
            ai.coef_tcarrera        AS "coefCarreraProvisto",
            ai.aniocursada          AS "anioCursada",
            ai.promedioca           AS "promedioConAplazos",
            ai.promediosa           AS "promedioSinAplazos",
            ai.completado           AS "porcentajeCompletado"
     FROM ${ESQUEMA}.sga_alumnos sa
     LEFT JOIN ${schemaConfig.schemaRendimiento}.alumnos_info ai
       ON ai.legajo::varchar = sa.legajo AND ai.propuesta = sa.propuesta
     WHERE sa.legajo = $1 AND sa.propuesta = $2
     LIMIT 1`,
    [legajo, propuestaId]
  );

  if (rows.length === 0) {
    throw new Error(`No se encontró inscripción para legajo=${legajo}, propuestaId=${propuestaId}`);
  }
  const ctx = rows[0];
  const aNumeroONulo = (v) => (v === null ? null : Number(v));
  const coefCarreraProvisto = aNumeroONulo(ctx.coefCarreraProvisto);
  const velocidadCarrera = coefCarreraProvisto ? Math.round((1 / coefCarreraProvisto) * 100) / 100 : null;
  return {
    ...ctx,
    coefCarreraProvisto,
    velocidadCarrera,
    promedioConAplazos: aNumeroONulo(ctx.promedioConAplazos),
    promedioSinAplazos: aNumeroONulo(ctx.promedioSinAplazos),
    porcentajeCompletado: aNumeroONulo(ctx.porcentajeCompletado),
  };
}

// duracion_en_anios viene null en algunos planes (ej. LGNR12), pero
// duracion_teorica trae texto como '4' o '30 MESES'.
function duracionEnAnios(duracionEnAnios, duracionTeorica) {
  if (duracionEnAnios) return Number(duracionEnAnios);
  const m = String(duracionTeorica || '').match(/(\d+(?:[.,]\d+)?)\s*(MES)?/i);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return m[2] ? Math.round((n / 12) * 100) / 100 : n;
}

/**
 * Metadatos del plan, usados para derivar Coef.Carrera cuando el sistema
 * origen no lo provee ya calculado. Con `legajo` se usa el plan_version del
 * alumno (puede estar en un plan distinto al vigente); sin él, la versión
 * actual del plan vigente de la propuesta.
 */
async function obtenerPropuesta(propuestaId, legajo = null) {
  const { rows } = await coneccionDB.query(
    legajo
      ? `SELECT pl.duracion_en_anios, pl.duracion_teorica, pv.cnt_materias
         FROM ${ESQUEMA}.sga_alumnos sa
         JOIN ${ESQUEMA}.sga_planes_versiones pv ON pv.plan_version = sa.plan_version
         JOIN ${ESQUEMA}.sga_planes pl ON pl.plan = pv.plan
         WHERE sa.legajo = $2 AND sa.propuesta = $1
         LIMIT 1`
      : `SELECT pl.duracion_en_anios, pl.duracion_teorica, pv.cnt_materias
         FROM ${ESQUEMA}.sga_planes pl
         JOIN ${ESQUEMA}.sga_planes_versiones pv ON pv.plan_version = pl.version_actual
         WHERE pl.propuesta = $1 AND pl.estado = 'V'
         ORDER BY pl.fecha_entrada_vigencia DESC
         LIMIT 1`,
    legajo ? [propuestaId, legajo] : [propuestaId]
  );

  if (rows.length === 0) {
    throw new Error(`No se encontró el plan de la propuesta ${propuestaId}`);
  }
  const { duracion_en_anios, duracion_teorica, cnt_materias } = rows[0];
  return {
    duracionIdealAnios: duracionEnAnios(duracion_en_anios, duracion_teorica),
    materiasTotalesPlan: cnt_materias === null ? null : Number(cnt_materias),
  };
}

export {
  buscarUniverso,
  obtenerHistoriaAcademica,
  obtenerContextoInscripcion,
  obtenerPropuesta,
};
