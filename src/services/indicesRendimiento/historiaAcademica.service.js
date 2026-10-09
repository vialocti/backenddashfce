import { parse } from 'csv-parse/sync'

const RESULTADOS_APROBADOS = ['Aprobado', 'Promocionado'];

// El CSV trae `tipo` en palabras ('Examen'/'Promoción'/'Equivalencia'); el adaptador
// de DB trae `origen` en código (E/P/B) directo de vw_hist_academica. Se normaliza
// acá para que calcularMetricasHistoria no dependa de cuál de las dos fuentes vino.
const ORIGEN_DESDE_TIPO = { Examen: 'E', Promoción: 'P', Equivalencia: 'B' };

function toNumberOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const num = Number(String(value).trim().replace(',', '.'));
  return Number.isNaN(num) ? null : num;
}

/**
 * Parsea el CSV de historia académica transaccional (un registro por cada
 * intento de promoción/examen, como exporta el sistema académico).
 */
function parseHistoriaAcademica(buffer) {
  const text = buffer.toString('utf8');
  const records = parse(text, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    quote: '"',
  });

  if (records.length === 0) {
    throw new Error('El CSV de historia académica no contiene registros.');
  }

  return records.map((row) => ({
    materia: row['actividad_nombre']?.trim() || '',
    anio: toNumberOrNull(row['anio_academico']),
    periodo: row['periodo_lectivo_nombre']?.trim() || '',
    tipo: row['tipo']?.trim() || '',
    origen: ORIGEN_DESDE_TIPO[row['tipo']?.trim()] || null,
    fecha: row['fecha']?.trim() || '',
    nota: toNumberOrNull(row['nota']),
    resultado: row['resultado_descripcion']?.trim() || '',
  }));
}

/**
 * A partir de los registros ya parseados, arma el resumen por materia
 * (intentos, ausencias, si está aprobada, nota final) y las métricas
 * agregadas que alimentan el ISA: compromiso y capacidad.
 *
 * Se agrupa por código de actividad; el CSV no lo trae, así que ahí cae al nombre.
 */
function calcularMetricasHistoria(registros) {
  const porMateria = new Map();

  for (const r of registros) {
    const clave = r.codigo ?? r.materia;
    if (!porMateria.has(clave)) {
      porMateria.set(clave, {
        materia: r.materia, intentos: 0, ausencias: 0, reprobados: 0,
        aprobada: false, origenAprobacion: null, notaFinal: null,
      });
    }
    const acumulado = porMateria.get(clave);
    acumulado.intentos += 1;
    if (r.resultado === 'Ausente') acumulado.ausencias += 1;
    if (r.resultado === 'Reprobado') acumulado.reprobados += 1;
    if (RESULTADOS_APROBADOS.includes(r.resultado)) {
      acumulado.aprobada = true;
      acumulado.origenAprobacion = r.origen;
      if (r.nota !== null) acumulado.notaFinal = r.nota;
    }
  }

  const resumenPorMateria = Array.from(porMateria.values()).sort((a, b) => {
    if (a.aprobada !== b.aprobada) return a.aprobada ? 1 : -1;
    return b.ausencias - a.ausencias;
  });

  const materiasTotales = resumenPorMateria.length;
  const materiasPendientes = resumenPorMateria.filter((m) => !m.aprobada).length;
  const materiasAprobadas = materiasTotales - materiasPendientes;
  const materiasReprobadas = resumenPorMateria.filter((m) => m.reprobados > 0).length;
  const materiasAusentes = resumenPorMateria.filter((m) => m.ausencias > 0).length;
  // Discrimina CÓMO se aprobó cada materia (última vía que la aprobó, si hubo más de un intento aprobatorio).
  const materiasAprobadasExamen = resumenPorMateria.filter((m) => m.aprobada && m.origenAprobacion === 'E').length;
  const materiasPromocionadas = resumenPorMateria.filter((m) => m.aprobada && m.origenAprobacion === 'P').length;
  const materiasPorEquivalencia = resumenPorMateria.filter((m) => m.aprobada && m.origenAprobacion === 'B').length;

  const totalIntentos = registros.length;
  const totalAusencias = registros.filter((r) => r.resultado === 'Ausente').length;
  // Cantidad de exámenes rendidos (origen 'E'): a diferencia de materiasAusentes/
  // materiasReprobadas (por materia), esto cuenta cada intento — no colapsa por materia.
  const cantidadExamenes = registros.filter((r) => r.origen === 'E').length;
  const examenesReprobados = registros.filter((r) => r.origen === 'E' && r.resultado === 'Reprobado').length;

  const notasAprobadas = resumenPorMateria
    .filter((m) => m.aprobada && m.notaFinal !== null)
    .map((m) => m.notaFinal);
  const promedioNotasAprobadas =
    notasAprobadas.length > 0 ? notasAprobadas.reduce((a, b) => a + b, 0) / notasAprobadas.length : null;

  return {
    resumenPorMateria,
    materiasTotales,
    materiasAprobadas,
    materiasPendientes,
    materiasReprobadas,
    materiasAusentes,
    materiasAprobadasExamen,
    materiasPromocionadas,
    materiasPorEquivalencia,
    nombresPendientes: resumenPorMateria.filter((m) => !m.aprobada).map((m) => m.materia),
    totalIntentos,
    totalAusencias,
    cantidadExamenes,
    examenesReprobados,
    porcentajeAusencias: Math.round((totalAusencias / totalIntentos) * 1000) / 10,
    compromiso: Math.round((1 - totalAusencias / totalIntentos) * 1000) / 10, // 0-100
    promedioNotasAprobadas: promedioNotasAprobadas !== null ? Math.round(promedioNotasAprobadas * 100) / 100 : null,
  };
}

export { parseHistoriaAcademica, calcularMetricasHistoria };
