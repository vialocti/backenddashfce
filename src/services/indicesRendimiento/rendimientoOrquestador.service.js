import * as adaptador from '../../adapters/sistemaAcademico.adapter.js'
import { calcularMetricasHistoria } from './historiaAcademica.service.js'
import { calcularISA, scoreDesdeCoefCarrera, scoreDesdeRecursadas, scoreDesdeRegularidad, PESOS, VERSION_FORMULA } from './scoring.service.js'
import { derivarCoefCarrera } from './coefCarrera.util.js'
import { guardarRendimiento } from './rendimiento.repository.js'

function hoy() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Calcula y persiste el rendimiento de UN par (legajo, propuestaId).
 * 1) pide la historia académica al adaptador
 * 2) corre el motor ISA
 * 3) guarda el resultado en fce_per.rendimiento_academico
 */
async function calcularRendimientoParPropuesta({ legajo, propuestaId, fechaAnalisis }) {
  const registros = await adaptador.obtenerHistoriaAcademica(legajo, propuestaId, fechaAnalisis);
  const metricas = calcularMetricasHistoria(registros);

  const contexto = await adaptador.obtenerContextoInscripcion(legajo, propuestaId);
  const {
    sedeId, anioIngreso, tipoIngreso, cantRan, regVig, coefCarreraProvisto,
    promedioSinAplazos,
  } = contexto;

  // El plan se necesita siempre (completud y duración proyectada). Si el alumno no
  // tiene plan resoluble, esos datos quedan en null en vez de descartar al alumno.
  const { duracionIdealAnios, materiasTotalesPlan } = await adaptador
    .obtenerPropuesta(propuestaId, legajo)
    .catch(() => ({ duracionIdealAnios: null, materiasTotalesPlan: null }));

  let coefCarrera = coefCarreraProvisto;
  if (coefCarrera === null || coefCarrera === undefined) {
    coefCarrera = derivarCoefCarrera({
      fechaAnalisis, anioIngreso, duracionIdealAnios,
      materiasAprobadas: metricas.materiasAprobadas,
      materiasTotalesPlan,
    });
  }

  // completud: % de la carrera cumplido (aprobadas / materias del plan), con tope en 100
  // porque la historia puede traer aprobadas de más (cambios de plan o de carrera). Es
  // solo informativa: el mismo 15% es buen avance a los 2 años y malo a los 4, y eso ya
  // lo contextualiza el Coef.Carrera — ver scoring.service.js.
  const completud = materiasTotalesPlan
    ? Math.min(100, Math.round((metricas.materiasAprobadas / materiasTotalesPlan) * 1000) / 10)
    : null;

  // Coef.Carrera = 1 es ir al día; 1,2 en un plan de 4 años proyecta 4,8 años.
  const duracionProyectadaAnios = coefCarrera && duracionIdealAnios
    ? Math.round(coefCarrera * duracionIdealAnios * 10) / 10
    : null;

  // capacidad: preferimos el promedio sin aplazos de alumnos_info (más representativo
  // de la capacidad real) sobre el promedio de aprobadas de la historia académica.
  const promedioParaCapacidad = promedioSinAplazos ?? metricas.promedioNotasAprobadas;

  const subScores = {
    compromiso: metricas.compromiso,
    capacidad: promedioParaCapacidad !== null ? promedioParaCapacidad * 10 : null,
    ritmo: scoreDesdeCoefCarrera(coefCarrera),
    recursadas: scoreDesdeRecursadas(cantRan),
    continuidad: scoreDesdeRegularidad(regVig),
  };

  const resultado = calcularISA(subScores);

  const guardado = await guardarRendimiento({
    legajo, propuestaId, fechaAnalisis, sedeId, anioIngreso, tipoIngreso,
    materiasTotales: metricas.materiasTotales,
    materiasAprobadas: metricas.materiasAprobadas,
    materiasPendientes: metricas.materiasPendientes,
    materiasReprobadas: metricas.materiasReprobadas,
    materiasAusentes: metricas.materiasAusentes,
    materiasAprobadasExamen: metricas.materiasAprobadasExamen,
    materiasPromocionadas: metricas.materiasPromocionadas,
    materiasPorEquivalencia: metricas.materiasPorEquivalencia,
    cantidadExamenes: metricas.cantidadExamenes,
    examenesReprobados: metricas.examenesReprobados,
    materiasPlan: materiasTotalesPlan, completud,
    duracionPlanAnios: duracionIdealAnios, duracionProyectadaAnios,
    totalIntentos: metricas.totalIntentos,
    totalAusencias: metricas.totalAusencias,
    promedioNotas: promedioParaCapacidad,
    coefCarrera, cantRan, regVig,
    scoreCompromiso: resultado.desglose.compromiso?.valor ?? null,
    scoreCapacidad: resultado.desglose.capacidad?.valor ?? null,
    scoreRitmo: resultado.desglose.ritmo?.valor ?? null,
    scoreRecursadas: resultado.desglose.recursadas?.valor ?? null,
    scoreContinuidad: resultado.desglose.continuidad?.valor ?? null,
    isa: resultado.isa,
    clasificacion: resultado.clasificacion,
    alertaPorComponente: resultado.alertaPorComponente,
    pesosUsados: PESOS,
    versionFormula: VERSION_FORMULA,
    desglose: resultado.desglose,
    origenCalculo: 'batch',
  });

  return { ...guardado, desglose: resultado.desglose, nombresPendientes: metricas.nombresPendientes };
}

/**
 * Procesa un GRUPO completo: resuelve el universo de alumnos que matchean el
 * filtro (sede/año de ingreso/propuesta, en cualquier combinación) y calcula
 * el rendimiento de cada uno, uno por uno.
 *
 * `onProgreso`, si se pasa, se invoca después de cada alumno procesado — útil
 * para que el controller pueda ir informando avance (ver streaming en el
 * controller de abajo) sin acoplar el orquestador a Express.
 */
async function procesarGrupo({ sedeId = null, anioIngreso = null, propuestaId = null, fechaAnalisis = hoy() }, onProgreso) {
  const universo = await adaptador.buscarUniverso({ sedeId, anioIngreso, propuestaId });

  const resultados = [];
  const errores = [];

  for (const { legajo, propuestaId: pId } of universo) {
    try {
      const r = await calcularRendimientoParPropuesta({ legajo, propuestaId: pId, fechaAnalisis });
      resultados.push(r);
      if (onProgreso) onProgreso({ legajo, propuestaId: pId, ok: true, isa: r.isa, clasificacion: r.clasificacion });
    } catch (err) {
      errores.push({ legajo, propuestaId: pId, error: err.message });
      if (onProgreso) onProgreso({ legajo, propuestaId: pId, ok: false, error: err.message });
    }
  }

  return {
    fechaAnalisis,
    totalUniverso: universo.length,
    totalProcesados: resultados.length,
    totalErrores: errores.length,
    prioritarios: resultados.filter((r) => r.clasificacion === 'Prioritario').length,
    seguimientoRecomendado: resultados.filter((r) => r.clasificacion === 'Seguimiento recomendado').length,
    sinNecesidadSeguimiento: resultados.filter((r) => r.clasificacion === 'Sin necesidad de seguimiento').length,
    errores,
    resultados,
  };
}

export { calcularRendimientoParPropuesta, procesarGrupo };
