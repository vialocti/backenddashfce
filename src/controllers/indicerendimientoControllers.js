import { procesarGrupo } from '../services/indicesRendimiento/rendimientoOrquestador.service.js'
import { buscarRendimiento } from '../services/indicesRendimiento/rendimiento.repository.js'
import { obtenerHistoriaAcademica, obtenerRegularidades } from '../adapters/sistemaAcademico.adapter.js'

function parseIntOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * POST /indices-rendimiento/procesar
 * body: { sedeId?, anioIngreso?, propuestaId?, fechaAnalisis? }
 *
 * Resuelve el grupo de alumnos que matchea el filtro (cualquier combinación
 * de sedeId/anioIngreso/propuestaId), y para cada uno: pide su historia
 * académica, calcula el ISA, y lo guarda en fce_per.rendimiento_academico.
 *
 * Devuelve un resumen del lote. Si se pide `?detalle=true`, además devuelve
 * el resultado individual de cada alumno procesado.
 */
async function procesarGrupoController(req, res, next) {
  try {
    const { sedeId, anioIngreso, propuestaId, fechaAnalisis } = req.body || {};

    if (sedeId == null && anioIngreso == null && propuestaId == null) {
      return res.status(400).json({
        error: 'Falta al menos un criterio de agrupamiento (sedeId, anioIngreso o propuestaId).',
      });
    }

    const filtro = {
      sedeId: parseIntOrNull(sedeId),
      anioIngreso: parseIntOrNull(anioIngreso),
      propuestaId: parseIntOrNull(propuestaId),
      ...(fechaAnalisis ? { fechaAnalisis } : {}),
    };

    const resultado = await procesarGrupo(filtro);

    const incluirDetalle = req.query?.detalle === 'true';
    const { resultados, ...resumen } = resultado;

    res.json(incluirDetalle ? resultado : resumen);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /indices-rendimiento
 * query: sedeId?, anioIngreso?, propuestaId?, legajo?, clasificacion?,
 *        persona? (legajo o documento exactos, o parte del apellido),
 *        historico? ("true" para traer todas las corridas, no solo la última),
 *        limit?, offset?
 *
 * Consulta lo que ya está calculado y guardado — no dispara ningún cálculo.
 */
async function consultarRendimientoController(req, res, next) {
  try {
    const { sedeId, anioIngreso, propuestaId, legajo, clasificacion, persona, historico, limit, offset } = req.query || {};

    const filas = await buscarRendimiento({
      sedeId: parseIntOrNull(sedeId),
      anioIngreso: parseIntOrNull(anioIngreso),
      propuestaId: parseIntOrNull(propuestaId),
      legajo: legajo || null,
      clasificacion: clasificacion || null,
      persona: persona ? String(persona).trim() || null : null,
      historico: historico === 'true',
      limit: parseIntOrNull(limit) || 200,
      offset: parseIntOrNull(offset) || 0,
    });

    res.json({ total: filas.length, alumnos: filas });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /indices-rendimiento/historia-academica
 * query: legajo, propuestaId, hasta? (YYYY-MM-DD; por defecto hoy)
 *
 * Historia académica de un alumno en una propuesta (exámenes, promociones y
 * equivalencias), en orden cronológico. Es la misma fuente que usa el cálculo
 * del ISA; acá no se calcula nada.
 */
async function historiaAcademicaController(req, res, next) {
  try {
    const { legajo, propuestaId, hasta } = req.query || {};
    const propuesta = parseIntOrNull(propuestaId);
    if (!legajo || propuesta === null) {
      return res.status(400).json({ error: 'Faltan legajo y propuestaId.' });
    }

    const fechaCorte = hasta || new Date().toISOString().slice(0, 10);
    const registros = await obtenerHistoriaAcademica(String(legajo), propuesta, fechaCorte);

    res.json({ total: registros.length, hasta: fechaCorte, registros });
  } catch (err) {
    if (/^No se encontró alumno/.test(err.message)) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * GET /indices-rendimiento/regularidades
 * query: legajo, propuestaId, hasta? (YYYY-MM-DD; por defecto hoy)
 *
 * Regularidades (cursadas) de un alumno en una propuesta, en orden
 * cronológico, para el informe de rendimiento por persona.
 */
async function regularidadesController(req, res, next) {
  try {
    const { legajo, propuestaId, hasta } = req.query || {};
    const propuesta = parseIntOrNull(propuestaId);
    if (!legajo || propuesta === null) {
      return res.status(400).json({ error: 'Faltan legajo y propuestaId.' });
    }

    const fechaCorte = hasta || new Date().toISOString().slice(0, 10);
    const registros = await obtenerRegularidades(String(legajo), propuesta, fechaCorte);

    res.json({ total: registros.length, hasta: fechaCorte, registros });
  } catch (err) {
    if (/^No se encontró alumno/.test(err.message)) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}

export { procesarGrupoController, consultarRendimientoController, historiaAcademicaController, regularidadesController };