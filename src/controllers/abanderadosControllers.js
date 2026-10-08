import coneccionDB from '../database.js'

const PROPUESTAS_VALIDAS = [1, 2, 3, 6, 7, 8];
const SEDES_VALIDAS = [1, 2, 3, 4];

const enteros = (arr) => (Array.isArray(arr) ? arr.map(Number).filter(Number.isInteger) : []);

/**
 * POST /abanderados/candidatos
 * body: {
 *   grupos: [{ propuestas: [8,3,2], anioIngreso: 2022, aniosCursada: [4,5] }, ...],
 *   promedioMin?: 7.49        (estrictamente mayor)
 *   tipoPromedio?: 'ca'|'sa'  (con / sin aplazos, default 'ca')
 *   ingreso?: 'pro'|'fac'     (año de ingreso a la carrera o a la facultad, default 'pro')
 *   sedes?: [1,2,...]
 * }
 *
 * Cada grupo es una combinación carrera(s) + año de ingreso + años de cursada;
 * un alumno entra si cumple cualquiera de los grupos. Fuente: fce_per.alumnos_info
 * (alumnos activos), así que los datos son los de la última corrida de ese proceso.
 */
export const buscarCandidatosAbanderados = async (req, res) => {
  const { grupos, promedioMin = 7.49, tipoPromedio = 'ca', ingreso = 'pro', sedes } = req.body || {};

  if (!Array.isArray(grupos) || grupos.length === 0) {
    return res.status(400).json({ error: 'Falta al menos un grupo de búsqueda.' });
  }

  const min = Number(promedioMin);
  if (Number.isNaN(min) || min < 0 || min > 10) {
    return res.status(400).json({ error: 'Promedio mínimo inválido.' });
  }

  const colPromedio = tipoPromedio === 'sa' ? 'promediosa' : 'promedioca';
  const colIngreso = ingreso === 'fac' ? 'anio_ingreso_fac' : 'anio_ingreso_pro';

  const params = [min];
  const condiciones = [];

  for (const [i, g] of grupos.entries()) {
    const propuestas = enteros(g.propuestas).filter((p) => PROPUESTAS_VALIDAS.includes(p));
    const anios = enteros(g.aniosCursada).filter((a) => a >= 1 && a <= 6);
    const anioIngreso = Number(g.anioIngreso);

    if (!propuestas.length || !anios.length || !Number.isInteger(anioIngreso)) {
      return res.status(400).json({ error: `Grupo ${i + 1} incompleto: requiere carreras, año de ingreso y años de cursada.` });
    }

    params.push(propuestas, anioIngreso, anios);
    const n = params.length;
    condiciones.push({
      sql: `(propuesta = ANY($${n - 2}::int[]) AND ${colIngreso} = $${n - 1} AND aniocursada = ANY($${n}::int[]))`,
      indice: i + 1,
    });
  }

  let filtroSede = '';
  const sedesOk = enteros(sedes).filter((s) => SEDES_VALIDAS.includes(s));
  if (sedesOk.length) {
    params.push(sedesOk);
    filtroSede = `AND ubicacion = ANY($${params.length}::int[])`;
  }

  const sql = `
    SELECT legajo, apellido, nombres, ubicacion, propuesta, plan,
           anio_ingreso_pro AS "anioIngresoPro", anio_ingreso_fac AS "anioIngresoFac",
           aniocursada AS "anioCursada",
           promedioca::float AS "promedioCa", promediosa::float AS "promedioSa",
           aprobadas, reprobadas, libres,
           CASE ${condiciones.map((c) => `WHEN ${c.sql} THEN ${c.indice}`).join(' ')} END AS grupo
    FROM fce_per.alumnos_info
    WHERE calidad = 'A'
      AND ${colPromedio} > $1
      AND (${condiciones.map((c) => c.sql).join(' OR ')})
      ${filtroSede}
    ORDER BY ${colPromedio} DESC, apellido, nombres`;

  try {
    const { rows } = await coneccionDB.query(sql, params);
    return res.json({ total: rows.length, alumnos: rows });
  } catch (error) {
    console.error('buscarCandidatosAbanderados:', error);
    return res.status(500).json({ error: 'Error al buscar candidatos a abanderados.' });
  }
};
