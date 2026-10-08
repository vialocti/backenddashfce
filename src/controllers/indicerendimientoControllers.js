import { procesarGrupo } from '../services/indicesRendimiento/rendimientoOrquestador.service.js'
import { buscarRendimiento } from '../services/indicesRendimiento/rendimiento.repository.js'

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
 *        historico? ("true" para traer todas las corridas, no solo la última),
 *        limit?, offset?
 *
 * Consulta lo que ya está calculado y guardado — no dispara ningún cálculo.
 */
async function consultarRendimientoController(req, res, next) {
  try {
    const { sedeId, anioIngreso, propuestaId, legajo, clasificacion, historico, limit, offset } = req.query || {};

    const filas = await buscarRendimiento({
      sedeId: parseIntOrNull(sedeId),
      anioIngreso: parseIntOrNull(anioIngreso),
      propuestaId: parseIntOrNull(propuestaId),
      legajo: legajo || null,
      clasificacion: clasificacion || null,
      historico: historico === 'true',
      limit: parseIntOrNull(limit) || 200,
      offset: parseIntOrNull(offset) || 0,
    });

    res.json({ total: filas.length, alumnos: filas });
  } catch (err) {
    next(err);
  }
}

export { procesarGrupoController, consultarRendimientoController };