import coneccionDB from "../database.js";

//promedio por carrera anio

export const getEgresadoSedeCarreraAnio = async (req, res) => {

    const { anio, lapso } = req.params
    let fecha_i = ''
    let fecha_f = ''
    let aniot = Number(anio) + 1

    if (lapso === 'C') {

        fecha_i = `${anio}-01-01`
        fecha_f = `${aniot}-01-01`

    } else if (lapso === 'L') {

        fecha_i = `${anio}-04-01`
        fecha_f = `${aniot}-04-01`

    }


    let sql_1 = `select CASE sa.ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede,
     CASE sa.propuesta WHEN 1 THEN 'CPN' WHEN 8 THEN 'CP' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' END as carrera,
    count(sa.propuesta) as canti,avg(promedio) as pro,avg(promedio_sin_aplazos) as prosa  from negocio.sga_certificados_otorg sco `
    let sql_I = " inner join negocio.sga_alumnos sa on sa.alumno=sco.alumno"
    let sql_w = ` where sco.anulado=0 and sco.fecha_egreso >='${fecha_i}' and sco.fecha_egreso <'${fecha_f}'  and sco.certificado  in (3,4,5,6,7,9,16,17,25,26) `
    let sql_g = " group by sa.ubicacion ,sa.propuesta order by sa.ubicacion,sa.propuesta"


    try {
        let sql = `${sql_1} ${sql_I} ${sql_w} ${sql_g}`
        //console.log(sql)
        const resu = await coneccionDB.query(sql)
        res.send(resu.rows)
    } catch (error) {

    }

}

//listado carrera sede anio
export const getListadoEgreSedeCarreraAnio = async (req, res) => {

    const { anio, lapso, sede, car } = req.params
    let fecha_i = ''
    let fecha_f = ''
    let aniot = Number(anio) + 1

    if (lapso === 'C') {

        fecha_i = `${anio}-01-01`
        fecha_f = `${aniot}-01-01`

    } else if (lapso === 'L') {

        fecha_i = `${anio}-04-01`
        fecha_f = `${aniot}-04-01`

    }


    let sql = `select ROUND(SQRT(CAST(alu.legajo AS numeric)), 4) as legajo,upper(substring(md5(mp.apellido),1,8)) AS apellido, upper(substring(md5(mp.nombres),1,16)) AS nombres, CASE sa.ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede,
    sco.fecha_egreso, CASE sa.propuesta WHEN 1 THEN 'CPN' WHEN 8 THEN 'CP' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' END as carrera,sco.promedio, sco.promedio_sin_aplazos 
    from negocio.sga_certificados_otorg sco
    inner join negocio.sga_alumnos sa on sa.alumno=sco.alumno
    inner join negocio.mdp_personas mp on mp.persona=sco.persona 
    where sa.ubicacion=${sede} and sco.certificado  in (3,4,5,6,7,9,16,17,25,26) and sa.propuesta=${car} and sco.anulado=0 and sco.fecha_egreso >='${fecha_i}' and sco.fecha_egreso <'${fecha_f}' `




    try {
        //  let sql = `${sql_1} ${sql_I} ${sql_w} ${sql_g}`
        // console.log(sql)
        const resu = await coneccionDB.query(sql)
        res.send(resu.rows)
    } catch (error) {

    }

}


export const getCantidadEgreSedeCarreraAnio = async (req, res) => {

    const { anio, lapso, sede } = req.params
    let fecha_i = ''
    let fecha_f = ''
    let aniot = Number(anio) + 1
    let ubicacion = '1'
    if (sede === '0') {
        ubicacion = '1,2,3,4'
    } else {
        ubicacion = sede
    }
    if (lapso === 'C') {

        fecha_i = `${anio}-01-01`
        fecha_f = `${aniot}-01-01`

    } else if (lapso === 'L') {

        fecha_i = `${anio}-04-01`
        fecha_f = `${aniot}-04-01`

    }


    let sql = `select CASE sa.propuesta WHEN 1 THEN 'CPN' WHEN 8 THEN 'CP' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' END as carrera, 
    count(sa.propuesta) from negocio.sga_certificados_otorg sco
    inner join negocio.sga_alumnos sa on sa.alumno=sco.alumno
    inner join negocio.mdp_personas mp on mp.persona=sco.persona 
    where sa.ubicacion in (${ubicacion}) and certificado  in (3,4,5,6,7,9, 16, 17, 25, 26) and sco.anulado=0 and sco.fecha_egreso >='${fecha_i}' and sco.fecha_egreso <'${fecha_f}' 
    group by sa.propuesta
    `
    //console.log(sql)




    try {
        //  let sql = `${sql_1} ${sql_I} ${sql_w} ${sql_g}`
        // console.log(sql)
        const resu = await coneccionDB.query(sql)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }

}

//cantidad por sedes
export const getCantidadEgreSedesAnio = async (req, res) => {
  const { anio, lapso } = req.params;

  // --- 1. Resolver año efectivo ---
  let anioE = Number(anio);
  if (!Number.isInteger(anioE)) {
    return res.status(400).json({ error: 'Año inválido' });
  }

  if (anioE === 0) {
    // Si no se especifica año, usar el año académico actual:
    // antes del 1 de abril seguimos en el período del año anterior
    const hoy = new Date();
    anioE = hoy.getFullYear();
    if (hoy < new Date(`${anioE}-04-01`)) {
      anioE = anioE - 1;
    }
  } else if (anioE < 1900 || anioE > 2999) {
    return res.status(400).json({ error: 'Año fuera de rango' });
  }

  // --- 2. Resolver rango de fechas ---
  const rangos = {
    C: [`${anioE}-01-01`, `${anioE + 1}-01-01`],
    L: [`${anioE}-04-01`, `${anioE + 1}-04-01`],
  };

  if (!rangos[lapso]) {
    return res.status(400).json({ error: 'Lapso inválido (usar C o L)' });
  }

  const [fecha_i, fecha_f] = rangos[lapso];

  // --- 3. Query parametrizada ---
  const CERTIFICADOS = [3, 4, 5, 6, 7, 9, 16, 17, 25, 26];

  const sql = `
    SELECT
      CASE sa.ubicacion
        WHEN 1 THEN 'MZA'  WHEN 2 THEN 'SRF'
        WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE'
      END AS sede,
      COUNT(sa.ubicacion) AS count
    FROM negocio.sga_certificados_otorg sco
    INNER JOIN negocio.sga_alumnos  sa ON sa.alumno  = sco.alumno
    INNER JOIN negocio.mdp_personas mp ON mp.persona = sco.persona
    WHERE sco.anulado = 0
      AND sco.fecha_egreso >= $1::date
      AND sco.fecha_egreso <  $2::date
      AND sco.certificado = ANY($3::int[])
    GROUP BY sa.ubicacion
    ORDER BY sa.ubicacion
  `;

  try {
    await coneccionDB.query('SET search_path = negocio');
    const resu = await coneccionDB.query(sql, [fecha_i, fecha_f, CERTIFICADOS]);
    
    return res.send(resu.rows);
  } catch (error) {
    console.error('getCantidadEgreSedesAnio:', error);
    return res.status(500).json({ error: 'Error al obtener conteo por sede' });
  }
};


export const getEgresadosPromedios = async (req, res) => {
  const { anio, car, lapso, ficola, ffcola } = req.params;

  // --- 1. Resolver rango de fechas ---
  let fecha_i, fecha_f;

  if (ficola !== '0' && ffcola !== '0') {
    // Validar formato YYYY-MM-DD antes de confiar en el input
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(ficola) || !dateRegex.test(ffcola)) {
      return res.status(400).json({ error: 'Formato de fecha inválido (YYYY-MM-DD)' });
    }
    fecha_i = ficola;
    fecha_f = ffcola;
  } else {
    const anioNum = Number(anio);
    if (!Number.isInteger(anioNum) || anioNum < 1900 || anioNum > 2999) {
      return res.status(400).json({ error: 'Año inválido' });
    }

    const rangos = {
      C: [`${anioNum}-01-01`,     `${anioNum + 1}-01-01`],
      L: [`${anioNum}-04-01`,     `${anioNum + 1}-04-01`],
      E: [`${anioNum - 1}-09-30`, `${anioNum}-10-01`],
    };

    if (!rangos[lapso]) {
      return res.status(400).json({ error: 'Lapso inválido (usar C, L o E)' });
    }
    [fecha_i, fecha_f] = rangos[lapso];
  }

  // --- 2. Resolver certificados (whitelist) ---
  const VALID_CERTS = [3, 4, 5, 6, 7, 9, 16, 17, 25, 26];

  let certIds;
  if (car === 'T') {
    certIds = VALID_CERTS;
  } else {
    certIds = String(car)
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => VALID_CERTS.includes(n));

    if (certIds.length === 0) {
      return res.status(400).json({ error: 'Certificado(s) inválido(s)' });
    }
  }

  // --- 3. Query parametrizada ---
  const sql = `
    SELECT
      alu.legajo,
      CONCAT(per.apellido, ', ', per.nombres) AS "nameC",
      cer.persona,
      alu.alumno,
      CASE alu.ubicacion
        WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF'
        WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE'
      END AS sede,
      CASE certificado
        WHEN 3 THEN 'CPN' WHEN 4 THEN 'LA'
        WHEN 5 THEN 'LE'  WHEN 6 THEN 'LNRG'
        WHEN 7 THEN 'LLO' WHEN 9 THEN 'CP'
      END AS propuesta,
      ROUND(promedio, 2) AS promedio,
      ROUND(promedio_sin_aplazos, 2) AS promesa,
      TO_CHAR(fecha_egreso, 'dd-mm-yyyy') AS fecha_egreso,
      negocio.get_anio_academico_ingreso_alumno(cer.alumno, 1) AS anio,
      negocio.get_anio_academico_ingreso_alumno(cer.alumno, 2) AS aniop,
      ROUND(
        (fecha_egreso - make_date(
          negocio.get_anio_academico_ingreso_alumno(cer.alumno, 1)::int, 4, 1
        ))::numeric / 365.0, 2
      ) AS tiempo,
      ROUND(
        (fecha_egreso - make_date(
          negocio.get_anio_academico_ingreso_alumno(cer.alumno, 2)::int, 4, 1
        ))::numeric / 365.0, 2
      ) AS tiempop
    FROM negocio.sga_certificados_otorg cer
    INNER JOIN negocio.mdp_personas per ON per.persona = cer.persona
    INNER JOIN negocio.sga_alumnos   alu ON alu.alumno  = cer.alumno
    WHERE cer.anulado = 0
      AND fecha_egreso >= $1::date
      AND fecha_egreso < $2::date
      AND certificado = ANY($3::int[])
    ORDER BY certificado, "nameC", fecha_egreso
  `;

  try {
    await coneccionDB.query('SET search_path = negocio');
    const resp = await coneccionDB.query(sql, [fecha_i, fecha_f, certIds]);
    return res.send(resp.rows);
  } catch (error) {
    console.error('getEgresadosPromedios:', error);
    return res.status(500).json({ error: 'Error al obtener egresados' });
  }
};



//devuelve cantidad de egresados discriminados por certificado
const cantidadEgrAnioPropuestas = async (anio, lapso) => {

    let fecha_i = ''
    let fecha_f = ''
    let aniot = Number(anio) + 1

    if (lapso === 'C') {

        fecha_i = `${anio}-01-01`
        fecha_f = `${aniot}-01-01`

    } else if (lapso === 'L') {

        fecha_i = `${anio}-04-01`
        fecha_f = `${aniot}-04-01`

    }
    /*
     let sqlstr = `select case certificado when 3 then 'CPN' when 4 then 'LA' when 5 then 'LE' when 6 then 'LNRG' when 7 then 'LLO' when 9 then 'CP' end as propuesta, count(certificado)
     from negocio.sga_certificados_otorg where fecha_egreso >='${fecha_i}' and fecha_egreso<='${fecha_f}' group by certificado
     `
 */
    let sqlstr = `select case certificado when 3 then 'CPN' when 4 then 'LA' when 5 then 'LE' when 6 then 'LNRG' when 7 then 'LLO' when 9 then 'CP' end as propuesta, count(certificado)
    , sexo from negocio.sga_certificados_otorg cert
    inner join negocio.mdp_personas mp on mp.persona=cert.persona
    where cert.anulado=0 and fecha_egreso >='${fecha_i}' and fecha_egreso<'${fecha_f}' and cert.certificado in (3,4,5,6,7,9,16,17,25,26)
    group by certificado,sexo
    `

    try {
        const resp = await coneccionDB.query(sqlstr)
        return (resp.rows)
    } catch (error) {
        console.log(error)
    }

}


//lectura de egresados entre años por carrera
export const cantidadEresadosaniosPropuesta = async (req, res) => {

    const { anioI, anioF, lapso } = req.params


    const resu = []

    for (let i = Number(anioI); i < Number(anioF) + 1; i++) {

        let datos = {
            anio: 0,
            cpnm: 0,
            lam: 0,
            lem: 0,
            llom: 0,
            lnrgm: 0,
            cpm: 0,
            cpnf: 0,
            laf: 0,
            lef: 0,
            llof: 0,
            lnrgf: 0,
            cpf: 0,
        }

        let resuanio = await cantidadEgrAnioPropuestas(i, lapso)
        //console.log(resuanio)
        //console.log(resuanio.filter(anior => anior.propuesta === 'LLO'))
        //console.log(resuanio.filter(anior => anior.propuesta === 'CPN').length, Number(resuanio.filter(anior => anior.propuesta === 'CPN')[0].count))
        datos.anio = i
        datos.cpnm = resuanio.filter(anior => anior.propuesta === 'CPN' && anior.sexo === 'M').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'CPN' && anior.sexo === 'M')[0].count) : 0
        datos.lam = resuanio.filter(anior => anior.propuesta === 'LA' && anior.sexo === 'M').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'LA' && anior.sexo === 'M')[0].count) : 0
        datos.lem = resuanio.filter(anior => anior.propuesta === 'LE' && anior.sexo === 'M').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'LE' && anior.sexo === 'M')[0].count) : 0
        datos.lnrgm = resuanio.filter(anior => anior.propuesta === 'LNRG' && anior.sexo === 'M').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'LNRG' && anior.sexo === 'M')[0].count) : 0
        datos.llom = resuanio.filter(anior => anior.propuesta === 'LLO' && anior.sexo === 'M').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'LLO' && anior.sexo === 'M')[0].count) : 0
        datos.cpm = resuanio.filter(anior => anior.propuesta === 'CP' && anior.sexo === 'M').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'CP' && anior.sexo === 'M')[0].count) : 0

        datos.cpnf = resuanio.filter(anior => anior.propuesta === 'CPN' && anior.sexo === 'F').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'CPN' && anior.sexo === 'F')[0].count) : 0
        datos.laf = resuanio.filter(anior => anior.propuesta === 'LA' && anior.sexo === 'F').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'LA' && anior.sexo === 'F')[0].count) : 0
        datos.lef = resuanio.filter(anior => anior.propuesta === 'LE' && anior.sexo === 'F').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'LE' && anior.sexo === 'F')[0].count) : 0
        datos.lnrgf = resuanio.filter(anior => anior.propuesta === 'LNRG' && anior.sexo === 'F').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'LNRG' && anior.sexo === 'F')[0].count) : 0
        datos.llof = resuanio.filter(anior => anior.propuesta === 'LLO' && anior.sexo === 'F').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'LLO' && anior.sexo === 'F')[0].count) : 0
        datos.cpf = resuanio.filter(anior => anior.propuesta === 'CP' && anior.sexo === 'F').length > 0 ? Number(resuanio.filter(anior => anior.propuesta === 'CP' && anior.sexo === 'F')[0].count) : 0

        resu.push(datos)

    }
    res.send(resu)


}



export const obtenerCertificadosPorAnio = async (req, res) => {

    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaFinal = `${anioActual}-${mes}-${dia}`;

    const resultados = [];

    try {


        for (let i = 0; i < 6; i++) { // 0 = año actual, hasta 5 años atrás
            const anio = anioActual - i;
            const fechaInicio = `${anio}-01-01`;
            const fechaFin = `${anio}-${mes}-${dia}`;

            const query = `
          SELECT COUNT(*) AS cantidad
          FROM negocio.sga_certificados_otorg sco
          WHERE certificado IN (3,4,5,6,7,9,16,17,25,26)
            AND sco.anulado = 0
            AND fecha_egreso >= $1
            AND fecha_egreso <= $2
        `;

            const res = await coneccionDB.query(query, [fechaInicio, fechaFin]);
            resultados.push({
                anio,
                cantidad: parseInt(res.rows[0].cantidad, 10)
            });
        }

        // console.log(resultados);

        res.send(resultados);

    } catch (err) {
        console.error('Error al consultar:', err);
        res.status(500).send('Error al consultar la base de datos');
    }
}


// controllers/egresadoPadron


export const buscarPersonaEgresadoDL = async (req, res) => {
  const { documento, legajo } = req.query;

  if (!documento && !legajo) {
    return res.status(400).json({
      status: 'error',
      message: 'Debés proporcionar documento o legajo.',
    });
  }

  try {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (documento) {
      conditions.push(`documento = $${idx++}`);
      values.push(documento);
    }

    if (legajo) {
      conditions.push(`legajo = $${idx++}`);
      values.push(legajo);
    }

    const query = `
      SELECT
        nroorden,
        nombre,
        documento,
        legajo,
        unidad_academica,
        claustro,
        sede
      FROM fce_per.egresados_padron
      WHERE ${conditions.join(' OR ')}
      ORDER BY nombre ASC
    `;

    const { rows } = await coneccionDB.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'not_found',
        message: 'No se encontró ninguna persona con los datos ingresados.',
      });
    }

    return res.status(200).json({
      status: 'success',
      total: rows.length,
      data: rows,
    });

  } catch (error) {
    console.error('Error en buscarPersona:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno al buscar persona.',
      detail: error.message,
    });
  }
};


// controllers/personaController.js



export const buscarPersonaEgresado = async (req, res) => {
  const { documento, legajo, nombre } = req.query;

  if (!documento && !legajo && !nombre) {
    return res.status(400).json({
      status: 'error',
      message: 'Debés proporcionar documento, legajo o nombre.',
    });
  }

  try {
    let query, values;

    if (documento) {
      query = `
        SELECT nroorden, nombre, documento, legajo, unidad_academica, claustro, sede
        FROM fce_per.egresados_padron
        WHERE documento = $1
        LIMIT 1
      `;
      values = [documento];

    } else if (legajo) {
      query = `
        SELECT nroorden, nombre, documento, legajo, unidad_academica, claustro, sede
        FROM fce_per.egresados_padron
        WHERE legajo = $1
        LIMIT 1
      `;
      values = [legajo];

    } else {
      query = `
        SELECT nroorden, nombre, documento, legajo, unidad_academica, claustro, sede
        FROM fce_per.egresados_padron
        WHERE nombre ILIKE $1
        ORDER BY nombre ASC
        LIMIT 50
      `;
      values = [`%${nombre}%`];
    }

    const { rows } = await coneccionDB.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'not_found',
        message: 'No se encontraron resultados.',
      });
    }

    return res.status(200).json({
      status: 'success',
      total: rows.length,
      data: rows,
    });

  } catch (error) {
    console.error('Error en buscarPersona:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno al buscar persona.',
      detail: error.message,
    });
  }
};

