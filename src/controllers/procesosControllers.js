import coneccionDB from "../database";

// Mapeo carrera (propuesta) → certificado
const CERTIFICADO_POR_CARRERA = {
  1: 3,   // CPN
  2: 4,   // LA
  3: 5,   // LE
  6: 6,   // LNRG
  7: 7,   // LLO
  8: 9,   // CP
};

// ─────────────────────────────────────────────────────────────
// Controlador principal: evolución detallada de cohorte
// ─────────────────────────────────────────────────────────────
export const getEvolucionCohorteDetallada = async (req, res) => {
  const { anioI, sede, carrera, anioFC, tipoI } = req.params;

  const anioInicio = Number(anioI);
  const anioFin = Number(anioFC);
  if (!anioInicio || !anioFin || anioFin < anioInicio) {
    return res.status(400).json({ error: 'Rango de años inválido' });
  }

  const carrerasArr = carrera.split(',').map(Number);

  // Certificados válidos para esta consulta (según las carreras solicitadas)
  const certificadosValidos = carrerasArr
    .map(c => CERTIFICADO_POR_CARRERA[c])
    .filter(Boolean);

  if (certificadosValidos.length === 0) {
    return res.status(400).json({ error: 'No hay certificados mapeados para estas carreras' });
  }

  const client = await coneccionDB.connect();

  try {
    await client.query("SET search_path TO negocio, public");

    // ─────────────────────────────────────────────────────────
    // 1) Cohorte original
    // ─────────────────────────────────────────────────────────
    const { rows: cohorte } = await client.query(`
      SELECT sa.alumno, sa.persona, sa.propuesta, ai.plan
      FROM negocio.sga_propuestas_aspira spa
      INNER JOIN negocio.sga_alumnos sa
        ON sa.persona = spa.persona AND sa.propuesta = spa.propuesta
      LEFT JOIN fce_per.alumnos_info ai ON ai.alumno = sa.alumno
      WHERE spa.anio_academico = $1
        AND spa.propuesta = ANY($2::int[])
        AND sa.ubicacion = $3
        AND spa.tipo_ingreso = $4
        AND spa.situacion_asp IN (1, 2)
        AND sa.legajo IS NOT NULL
    `, [anioInicio, carrerasArr, sede, tipoI]);

    if (cohorte.length === 0) {
      return res.json({ cohorte_inicial: 0, evolucion: [] });
    }

    const cohorteIds = cohorte.map(a => a.alumno);
    const personasIds = cohorte.map(a => a.persona);
    const cohorteMap = new Map(cohorte.map(a => [a.alumno, a]));

    // ─────────────────────────────────────────────────────────
    // 2) Reinscripciones por año
    // ─────────────────────────────────────────────────────────
    const { rows: reinsc } = await client.query(`
      SELECT alumno, anio_academico
      FROM negocio.sga_reinscripciones
      WHERE alumno = ANY($1::int[])
        AND anio_academico BETWEEN $2 AND $3
    `, [cohorteIds, anioInicio + 1, anioFin]);

    const reinscPorAnio = new Map();
    const ultimaReinsc = new Map();
    for (const r of reinsc) {
      const anio = Number(r.anio_academico);
      if (!reinscPorAnio.has(anio)) reinscPorAnio.set(anio, new Set());
      reinscPorAnio.get(anio).add(r.alumno);
      const actual = ultimaReinsc.get(r.alumno) || 0;
      if (anio > actual) ultimaReinsc.set(r.alumno, anio);
    }

    // ─────────────────────────────────────────────────────────
    // 3) Egresados de la(s) carrera(s) de la cohorte
    //    (filtramos por el certificado correspondiente para
    //     evitar contar egresos de otras carreras de la misma persona)
    // ─────────────────────────────────────────────────────────
    const { rows: egresRows } = await client.query(`
      SELECT persona, MIN(fecha_egreso) AS fecha_egreso
      FROM negocio.sga_certificados_otorg
      WHERE persona = ANY($1::int[])
        AND certificado = ANY($2::int[])
      GROUP BY persona
    `, [personasIds, certificadosValidos]);

    const egresadosMap = new Map(egresRows.map(e => [e.persona, new Date(e.fecha_egreso)]));

    // ─────────────────────────────────────────────────────────
    // 4) Evolución año a año (fecha corte 31-03-anio)
    // ─────────────────────────────────────────────────────────
    const evolucion = [];
    let pasivosAcumuladosRunning = 0;

    for (let anio = anioInicio + 1; anio <= anioFin; anio++) {
      const fechaCorte = `${anio}-03-31`;
      const fechaCorteDate = new Date(fechaCorte);

      // ACTIVOS del año
      const activosSet = reinscPorAnio.get(anio) || new Set();
      const activosAlumnos = [...activosSet]
        .map(id => cohorteMap.get(id))
        .filter(Boolean);

      // PASIVOS del año: última reinsc en anio-1 (o ingreso si nunca se reinscribió)
      const pasivosAlumnos = [];
      for (const a of cohorte) {
        const ultimo = ultimaReinsc.get(a.alumno) ?? anioInicio;
        if (ultimo !== anio - 1) continue;
        const fechaEgreso = egresadosMap.get(a.persona);
        if (fechaEgreso && fechaEgreso <= fechaCorteDate) continue;
        pasivosAlumnos.push(a);
      }

      pasivosAcumuladosRunning += pasivosAlumnos.length;

      // EGRESADOS (acumulados y del año)
      let egresadosAcum = 0;
      let egresadosDelAnio = 0;
      const fechaInicioAnio = new Date(`${anio - 1}-04-01`);
      for (const [, fe] of egresadosMap) {
        if (fe <= fechaCorteDate) {
          egresadosAcum++;
          if (fe > fechaInicioAnio) egresadosDelAnio++;
        }
      }

      // Año de cursada para activos y pasivos
      const alumnosParaCalcular = [...activosAlumnos, ...pasivosAlumnos];
      let activosPorCursada = {};
      let pasivosPorCursada = {};

      if (alumnosParaCalcular.length > 0) {
        const aprobadas = await calcularAprobadasBatch(client, alumnosParaCalcular, fechaCorte);
        const troncales = await calcularTroncalesBatch(
          client,
          alumnosParaCalcular.map(a => a.alumno),
          fechaCorte
        );

        const clasificar = (lista) => {
          const dist = {};
          for (const a of lista) {
            const regla = getReglaPorCarrera(a.propuesta);
            if (!regla) { dist[1] = (dist[1] || 0) + 1; continue; }
            const apr = aprobadas.get(a.alumno) || {};
            const tron = troncales.get(a.alumno) || {};
            const anioCurs = regla({
              uno: apr[1] || 0, dos: apr[2] || 0, tres: apr[3] || 0,
              cuatro: apr[4] || 0, cinco: apr[5] || 0,
              troncal1: (tron[1] || 0) > 1,
              troncal2: (tron[2] || 0) > 1,
              troncal3: (tron[3] || 0) > 1,
            });
            dist[anioCurs] = (dist[anioCurs] || 0) + 1;
          }
          return dist;
        };

        activosPorCursada = clasificar(activosAlumnos);
        pasivosPorCursada = clasificar(pasivosAlumnos);
      }

      evolucion.push({
        anio,
        fecha_corte: fechaCorte,
        activos_total: activosAlumnos.length,
        activos_por_cursada: activosPorCursada,
        pasivos_del_anio: pasivosAlumnos.length,
        pasivos_por_cursada: pasivosPorCursada,
        egresados_anio: egresadosDelAnio,
        egresados_acumulados: egresadosAcum,
        pasivos_acumulados: pasivosAcumuladosRunning,
      });
    }

    return res.json({
      cohorte_inicial: cohorte.length,
      anio_ingreso: anioInicio,
      evolucion,
    });
  } catch (error) {
    console.error('Error en getEvolucionCohorteDetallada:', error);
    return res.status(500).json({ error: 'Error al obtener evolución detallada' });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// Reglas de año de cursada por carrera
// ─────────────────────────────────────────────────────────────
const REGLAS_ANIO_CURSADA = {
  contador: ({ uno, dos, tres, cuatro }) => {
    if (uno > 8 && dos > 9 && tres > 8 && cuatro > 3) return 5;
    if (uno > 8 && dos > 9 && tres > 3) return 4;
    if (uno > 8 && dos > 3) return 3;
    if (uno > 3) return 2;
    return 1;
  },
  la: ({ uno, dos, tres, cuatro }) => {
    if (uno > 8 && dos > 8 && tres > 9 && cuatro > 3) return 5;
    if (uno > 8 && dos > 8 && tres > 3) return 4;
    if (uno > 8 && dos > 3) return 3;
    if (uno > 3) return 2;
    return 1;
  },
  le: ({ uno, dos, tres, cuatro }) => {
    if (uno > 8 && dos > 8 && tres > 7 && cuatro > 3) return 5;
    if (uno > 8 && dos > 8 && tres > 3) return 4;
    if (uno > 8 && dos > 3) return 3;
    if (uno > 3) return 2;
    return 1;
  },
  troncal: ({ uno, dos, tres, troncal1, troncal2, troncal3 }) => {
    if (uno > 9 && dos > 9 && tres > 5 && troncal3) return 4;
    if (uno > 9 && dos > 5 && troncal2) return 3;
    if (uno > 5 && troncal1) return 2;
    return 1;
  },
};

const getReglaPorCarrera = (car) => {
  const c = parseInt(car, 10);
  if (c === 8 || c === 450) return REGLAS_ANIO_CURSADA.contador;
  if (c === 2 || c === 386) return REGLAS_ANIO_CURSADA.la;
  if (c === 3 || c === 464) return REGLAS_ANIO_CURSADA.le;
  if (c === 7 || c === 3905) return REGLAS_ANIO_CURSADA.troncal;
  return null;
};

// ─────────────────────────────────────────────────────────────
// Aprobadas por año (batch)
// ─────────────────────────────────────────────────────────────
async function calcularAprobadasBatch(client, alumnos, fechaCorte) {
  if (alumnos.length === 0) return new Map();

  const alumnoIds = alumnos.map(a => a.alumno);

  const { rows } = await client.query(`
    SELECT ha.alumno, ele.anio_de_cursada, COUNT(*)::int AS cant
    FROM negocio.vw_hist_academica ha
    INNER JOIN negocio.sga_elementos_plan ele
      ON ele.elemento_revision = ha.elemento_revision
     AND ele.plan_version = ha.plan_version
    WHERE CAST(ha.fecha AS DATE) <= $1
      AND ha.resultado = 'A'
      AND ha.alumno = ANY($2::int[])
    GROUP BY ha.alumno, ele.anio_de_cursada
  `, [fechaCorte, alumnoIds]);

  const resultado = new Map();
  for (const r of rows) {
    if (!resultado.has(r.alumno)) resultado.set(r.alumno, {});
    resultado.get(r.alumno)[r.anio_de_cursada] = r.cant;
  }
  return resultado;
}

// ─────────────────────────────────────────────────────────────
// Troncales aprobadas (solo para carreras con plan troncal)
// ─────────────────────────────────────────────────────────────
async function calcularTroncalesBatch(client, alumnoIds, fechaCorte) {
  if (alumnoIds.length === 0) return new Map();

  const { rows } = await client.query(`
    SELECT alumno,
           CASE
             WHEN actividad_codigo IN ('02170','02175') THEN 1
             WHEN actividad_codigo IN ('02270','02275') THEN 2
             WHEN actividad_codigo IN ('02370','02375') THEN 3
           END AS anio_troncal,
           COUNT(*)::int AS cant
    FROM negocio.vw_hist_academica
    WHERE resultado = 'A'
      AND CAST(fecha AS DATE) <= $1
      AND alumno = ANY($2::int[])
      AND actividad_codigo IN ('02170','02175','02270','02275','02370','02375')
    GROUP BY alumno, anio_troncal
  `, [fechaCorte, alumnoIds]);

  const resultado = new Map();
  for (const r of rows) {
    if (!resultado.has(r.alumno)) resultado.set(r.alumno, {});
    resultado.get(r.alumno)[r.anio_troncal] = r.cant;
  }
  return resultado;
}