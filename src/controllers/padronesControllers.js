import coneccionDB from "../database";

// Evita "números mágicos" repetidos y hace explícito el significado de cada código
const isValidDate = (value) => typeof value === "string" && !isNaN(Date.parse(value));

export const getPadronesEgresados = async (req, res) => {
  const { fecha_i, fecha_f } = req.params;

  if (!isValidDate(fecha_i) || !isValidDate(fecha_f)) {
    return res.status(400).json({ error: "fecha_i y fecha_f deben ser fechas válidas" });
  }

  const sql = `
    SELECT
      CONCAT(pe.apellido, ', ', pe.nombres) AS nombre_completo,
      pe.nro_documento,
      alu.legajo,
      CASE alu.ubicacion
        WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE'
      END AS sede,
      eg.fecha_egreso,
      CASE eg.certificado
        WHEN 3 THEN 'CPN' WHEN 4 THEN 'LA' WHEN 5 THEN 'LE'
        WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' WHEN 9 THEN 'CP'
      END AS propuesta
    FROM negocio.sga_certificados_otorg eg
    INNER JOIN negocio.mdp_personas pe ON pe.persona = eg.persona
    INNER JOIN negocio.mdp_personas_documentos ped ON ped.documento = pe.documento_principal
    INNER JOIN negocio.sga_alumnos alu ON alu.alumno = eg.alumno
    WHERE eg.certificado IN (3, 4, 5, 6, 7, 9)
      AND eg.fecha_egreso > $1
      AND eg.fecha_egreso < $2
    ORDER BY eg.fecha_egreso;
  `;

  try {
    const result = await coneccionDB.query(sql, [fecha_i, fecha_f]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en getPadronesEgresados:", err);
    res.status(500).json({ error: "Error al obtener el padrón de egresados" });
  }
};

export const getPadronesAlumnos = async (req, res) => {
  const { fecha_i, fecha_f } = req.params;

  if (!isValidDate(fecha_i) || !isValidDate(fecha_f)) {
    return res.status(400).json({ error: "fecha_i y fecha_f deben ser fechas válidas" });
  }

  const sql = `
    WITH ResumenMaterias AS (
      SELECT
        sa.alumno,
        sa.legajo,
        CONCAT(mp.apellido, ', ', mp.nombres) AS nombre_completo,
        mpd.nro_documento,
        CASE sa.ubicacion
          WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE'
        END AS sede,
        CASE sa.propuesta
          WHEN 1 THEN 'CPN' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE'
          WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' WHEN 8 THEN 'CP'
        END AS propuesta,
        (
          SELECT COUNT(*)
          FROM negocio.vw_hist_academica vh
          WHERE vh.alumno = sa.alumno
            AND vh.resultado = 'A'
            AND vh.fecha > $1
            AND vh.fecha < $2
        ) AS materias_aprobadas
      FROM negocio.sga_alumnos sa
      INNER JOIN negocio.mdp_personas mp ON mp.persona = sa.persona
      INNER JOIN negocio.mdp_personas_documentos mpd ON mpd.documento = mp.documento_principal
      WHERE sa.calidad = 'A'
        AND sa.propuesta IN (2, 3, 6, 7, 8)
        AND sa.legajo IS NOT NULL
    )
    SELECT *,
      CASE WHEN materias_aprobadas >= 2 THEN 'S' ELSE 'N' END AS elector
    FROM ResumenMaterias;
  `;

  try {
    await coneccionDB.query("SET search_path TO negocio");
    const result = await coneccionDB.query(sql, [fecha_i, fecha_f]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en getPadronesAlumnos:", err);
    res.status(500).json({ error: "Error al obtener el padrón de alumnos" });
  }
};