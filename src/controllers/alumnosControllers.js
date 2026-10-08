import fs from 'fs';
import path from 'path';
import coneccionDB from '../database.js'
import { format } from '@fast-csv/format';
import PDFDocument from "pdfkit";


//ttraer datos de alumno para app
export const getDatosAlumnoApp = async (req, res) => {
  const { documento } = req.body;

  // 1. Validación básica de entrada
  const documentoLimpio = typeof documento === 'string' ? documento.trim() : documento;

  if (!documentoLimpio) {
    return res.status(400).send({ message: 'Debe informar un documento' });
  }

  const hoy = new Date();
  const anioActual = hoy.getFullYear();

  const fechaInicio = new Date(`${anioActual}-03-10`);
  const fechaFin = new Date(`${anioActual}-06-01`);

  const enRango = hoy >= fechaInicio && hoy <= fechaFin;

  // 2. Esta parte NO viene del usuario, así que concatenarla es seguro
  const condicionLegajo = enRango ? '' : 'not legajo isnull and';

  const whereClause = `
    ${condicionLegajo}
    mpc.contacto_tipo = 'MP'
    and sa.calidad in ('A', 'P')
    and mpd.nro_documento = $1
  `;

  const sqlQry = `
    select distinct left(usuario,3) as claustro, sa.ubicacion, sa.propuesta,
      spv.plan, sa.plan_version, sa.legajo, sa.calidad,
      mpd.nro_documento, apellido, nombres, mpc.email, sa.alumno, sa.calidad
    from negocio.mdp_personas mp
    inner join negocio.mdp_personas_documentos mpd on mpd.documento = mp.documento_principal
    inner join negocio.mdp_personas_contactos mpc on mpc.persona = mp.persona
    inner join negocio.sga_alumnos sa on sa.persona = mp.persona
    inner join negocio.sga_planes_versiones spv on spv.plan_version = sa.plan_version
    where ${whereClause}
  `;

  try {
    // 3. El valor del usuario va como parámetro, nunca concatenado
    const result = await coneccionDB.query(sqlQry, [documentoLimpio]);

    if (result.rows.length > 0) {
      return res.status(200).send(result.rows);
    }

    return res.status(200).send({ message: 'No existe Alumno' });

  } catch (error) {
    console.error('Error en getDatosAlumnoApp:', error);
    return res.status(500).send({ message: 'Se produjo un error' });
  }
};

//verificar alumno para simulador
export const getDatosAlumnoSimulador = async (req, res) => {
  const { documento } = req.body;

  // 1. Validación básica de entrada
  const documentoLimpio = typeof documento === 'string' ? documento.trim() : documento;

  if (!documentoLimpio) {
    return res.status(400).send({ message: 'Debe informar un documento' });
  }

  const sqlQry = `
    select distinct left(usuario,3) as claustro, sa.ubicacion, sa.propuesta,
      spv.plan, sa.plan_version, sa.legajo, sa.calidad,
      mpd.nro_documento, apellido, nombres, sa.alumno, sa.calidad
    from negocio.mdp_personas mp
    inner join negocio.mdp_personas_documentos mpd on mpd.documento = mp.documento_principal
    inner join negocio.sga_alumnos sa on sa.persona = mp.persona
    inner join negocio.sga_planes_versiones spv on spv.plan_version = sa.plan_version
    where not legajo isnull
      and sa.calidad in ('A', 'P')
      and mpd.nro_documento = $1
  `;

  try {
    // 2. El documento va parametrizado, nunca concatenado
    const result = await coneccionDB.query(sqlQry, [documentoLimpio]);

    if (result.rows.length > 0) {
      return res.status(200).send(result.rows);
    }

    return res.status(200).send({ message: 'No existe Alumno' });

  } catch (error) {
    console.error('Error en getDatosAlumnoSimulador:', error);
    return res.status(500).send({ message: 'Se produjo un error' });
  }
};



//planes activos con versiones 

export const getPlanesVersionActivos = async (req, res) => {
  const sqlstr = `
    select pv.plan_version, pv.plan, pv.version, pv.nombre, pl.codigo, pv.estado
    from negocio.sga_planes_versiones pv
    inner join negocio.sga_planes pl on pl.plan = pv.plan
    where pv.estado in ('A','V')
      and pl.propuesta in (1,2,3,6,7,8)
    order by pl.codigo
  `;

  try {
    const resu = await coneccionDB.query(sqlstr);
    return res.status(200).send(resu.rows);

  } catch (error) {
    console.error('Error en getPlanesVersionActivos:', error);
    return res.status(500).send({ message: 'Se produjo un error' });
  }
};

//cantidad de alumnos activos mas de una carrera por persona puede haber 
export const getAlumnosActivos = async (req, res) => {
  let sql = "select count(legajo) as canti from negocio.sga_alumnos where calidad = 'A' and not legajo isnull and  propuesta in (1,2,3,6,7,8)"

  try {
    const resu = await coneccionDB.query(sql)
    res.send(resu.rows)
  } catch (error) {
    res.status(500).send({ message: 'Error fatal' })
  }

}


//cantidad de alumnos activos mas de una carrera por persona puede haber 
export const getAlumnosActivos_Info = async (req, res) => {
  const sql = `
    SELECT persona, alumno, legajo, ubicacion, propuesta, plan_version
    FROM negocio.sga_alumnos
    WHERE calidad = 'A'
      AND legajo IS NOT NULL
      AND propuesta IN (1, 2, 3, 6, 7, 8)
  `;

  try {
    const result = await coneccionDB.query(sql);
    const rows = result.rows;

    if (rows.length === 0) {
      return res.status(404).send('No se encontraron datos.');
    }

    // Cabeceras de respuesta HTTP para archivo CSV
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="alumnos_activos.csv"');

    // Usamos fast-csv para escribir directamente en la respuesta
    const csvStream = format({ headers: true });
    csvStream.pipe(res);
    rows.forEach(row => csvStream.write(row));
    csvStream.end();

  } catch (error) {
    console.error('Error al generar CSV:', error);
    res.status(500).send({ message: 'Error fatal' });
  }
};

//cantidad de alumnos (personas fisicas)
export const getAlumnosPerActivos = async (req, res) => {


  let sql = "select count(distinct legajo) as canti from negocio.sga_alumnos where calidad = 'A' and not legajo isnull and  propuesta in (1,2,3,6,7,8)"

  try {
    const resu = await coneccionDB.query(sql)
    res.send(resu.rows)
  } catch (error) {

  }

}


//alumnos por propuestas, ubicacion y sexo
export const getAlumnosPorPropuesta = async (req, res) => {


  let sql = `select ubicacion,CASE propuesta WHEN 1 THEN 'CPN' WHEN 8 THEN 'CP' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' END as carrera,
    count(propuesta),sexo from negocio.sga_alumnos as alu 
    inner join negocio.mdp_personas as per on per.persona=alu.persona
    where not legajo isnull and calidad = 'A' and not legajo isnull and  propuesta in (1,2,3,6,7,8) 
    group by propuesta,sexo,ubicacion order by ubicacion,propuesta`


  try {
    const resu = await coneccionDB.query(sql)
    res.send(resu.rows)
  } catch (error) {

  }

}

//alumnos ubi propuesta y planes versiones por sexo
export const getAlumnosPorUbiPropuesta = async (req, res) => {

  let sqlqy = `select CASE ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede 
    , sa.propuesta,sa.plan_version,pv.plan,pv.nombre,pl.codigo, count(sa.plan_version),sexo from negocio.sga_alumnos sa 
    inner join negocio.mdp_personas as per on per.persona = sa.persona
    inner join negocio.sga_planes_versiones pv on pv.plan_version = sa.plan_version 
    inner join negocio.sga_planes pl on pl.plan=pv.plan
    where not sa.legajo is null and sa.calidad='A' and sa.propuesta in (1,2,3,6,7,8)
    group by ubicacion,sa.propuesta,sa.plan_version,pv.plan,pv.nombre,pl.codigo,sexo order by ubicacion, sa.propuesta`
  try {
    const resu = await coneccionDB.query(sqlqy)
    res.send(resu.rows)

  } catch (error) {
    console.log(error)
  }
}
//ver alumnos_info

export const getAlumnos_Info = async (req, res) => {
  let sqlstr = ` select * from fce_per.alumnos_info ai order by ubicacion, propuesta,plan,aniocursada `

  try {
    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }
}


//alumnos por ubicacion - propuesta
export const getAlumnosPorUbiPropuestaSVP = async (req, res) => {


  let sqlqy = ` select CASE ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede, 
    CASE propuesta WHEN 1 THEN 'CPN' WHEN 8 THEN 'CP' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' END as carrera,
     count(propuesta) from negocio.sga_alumnos where calidad = 'A' and not legajo isnull and  propuesta in (1,2,3,6,7,8) 
    group by ubicacion,propuesta order by ubicacion,propuesta`

  try {
    const resu = await coneccionDB.query(sqlqy)
    res.send(resu.rows)

  } catch (error) {
    console.log(error)
  }

}

//alumnos por ubicacion - propuesta provisorios
export const getAlumnosPorUbiPropuestaProvisorios = async (req, res) => {


  let sqlqy = ` select case ubicacion WHEN 1 THEN 185 WHEN 2 THEN 186 WHEN 3 THEN 2714 WHEN 4 THEN 2970 END as codinst,
    case propuesta WHEN 8 THEN 450 WHEN 2 THEN 386 WHEN 3 THEN 464 WHEN 6 THEN 8216 WHEN 7 THEN 3905 END as codtit, count(propuesta)  
    from negocio.sga_alumnos where legajo isnull and calidad='A' and propuesta in (2,3,6,7,8) 
    group by ubicacion, propuesta order by ubicacion,propuesta`
  try {
    const resu = await coneccionDB.query(sqlqy)
    res.send(resu.rows)

  } catch (error) {
    console.log(error)
  }

}

//alumnos por ubicacion - propuesta provisorios

export const getAlumnosPorUbiProvisorios = async (req, res) => {

  const { anioac } = req.params
  let sqlqy = ` select case alu.ubicacion WHEN 1 THEN 185 WHEN 2 THEN 186 WHEN 3 THEN 2714 WHEN 4 THEN 2970 END as codinst,count(alu.propuesta)  
    from negocio.sga_alumnos alu
    inner join negocio.sga_propuestas_aspira spa on spa.persona=alu.persona and spa.propuesta=alu.propuesta
    where legajo isnull and calidad='A' and alu.propuesta in (2,3,6,7,8) and anio_academico=${anioac} and spa.situacion_asp  in (1,2) group by alu.ubicacion order by alu.ubicacion`
  try {
    const resu = await coneccionDB.query(sqlqy)
    res.send(resu.rows)

  } catch (error) {
    console.log(error)
  }

}

//por ubicacion
//alumnos por ubicacion - propuesta
export const getAlumnosPorUbi = async (req, res) => {


  let sqlqy = `select CASE ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede, 
    count(ubicacion) from negocio.sga_alumnos where calidad = 'A' and not legajo isnull and  propuesta in (1,2,3,6,7,8) 
    group by ubicacion order by ubicacion`



  try {
    const resu = await coneccionDB.query(sqlqy)
    res.send(resu.rows)

  } catch (error) {
    console.log(error)
  }

}


//alumnos provisorios sin matricular 

export const getAlumnosProvisoriosNoMatriculados=async (req,res)=>{

  const {anioac}=req.params;

  let sqlqy=`select case alu.ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede,
   case alu.propuesta  WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' when 8 then 'CP' END as propuesta ,count(alu.propuesta)  
    from negocio.sga_alumnos alu
    inner join negocio.sga_propuestas_aspira spa on spa.persona=alu.persona and spa.propuesta=alu.propuesta
    where legajo isnull and calidad='A' and alu.propuesta in (2,3,6,7,8) and anio_academico=${anioac}
    and spa.situacion_asp  in (1,2) group by alu.ubicacion, alu.propuesta  order by alu.ubicacion;`

    try {
      const resu = await coneccionDB.query(sqlqy)
      res.send(resu.rows)
  
    } catch (error) {
      console.log(error)
    }
}


export const getAlumnosAnioCursada = async (req, res) => {
  const sqlstr = `
    SELECT
      ubicacion,
      CASE propuesta
        WHEN 1 THEN 'CPN'
        WHEN 2 THEN 'LA'
        WHEN 3 THEN 'LE'
        WHEN 6 THEN 'LNRG'
        WHEN 7 THEN 'LLO'
        WHEN 8 THEN 'CP'
      END AS carrera,
      CASE
        WHEN plan IN (5, 6, 7)        THEN '98'
        WHEN plan IN (10, 11)         THEN '1'
        WHEN plan IN (12, 13, 14)     THEN '19'
        WHEN plan = 17                THEN '2'
        WHEN plan IN (18, 19, 20)     THEN '26'
        WHEN plan = 24                THEN '19D'
      END AS planl,
      aniocursada,
      COUNT(*) AS cantidad
    FROM fce_per.alumnos_info
    WHERE calidad = 'A'
    GROUP BY ubicacion, propuesta, plan, aniocursada
    ORDER BY ubicacion, propuesta, plan, aniocursada
  `;

  try {
    const resu = await coneccionDB.query(sqlstr);
    return res.status(200).json(resu.rows);
  } catch (error) {
    console.error('Error en getAlumnosAnioCursada:', error);
    return res.status(500).json({ 
      error: 'Error al obtener alumnos por año de cursada' 
    });
  }
};



//reinscripciones

//cantidad reinscripciones por anio, ubicacion,propuesta

export const getReinscriptosUbiProp = async (req, res) => {

  const { anio } = req.params

  let sql = `select CASE alu.ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede,
     CASE alu.propuesta WHEN 1 THEN 'CPN' WHEN 8 THEN 'CP' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' END as carrera,
    count(alu.propuesta) from negocio.sga_reinscripciones as rei
     inner join negocio.sga_alumnos as alu on alu.alumno=rei.alumno
     where rei.anio_academico=${anio} and  not alu.legajo isnull and  alu.propuesta in (1,2,3,6,7,8)
     group by alu.ubicacion,alu.propuesta order by alu.ubicacion,alu.propuesta `

  try {
    const resu = await coneccionDB.query(sql)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }
}


//desgranamiento cohorte reinscriptos por anio de una cohorte


const TreinscriptosPorAnioCohorte = async (anioI, sede, carrera, i, tipoI) => {


  try {
    let sqlstr = `select count(*) as reinsc from negocio.sga_reinscripciones where anio_academico=${i} and
        alumno in (select sa.alumno  from negocio.sga_propuestas_aspira spa 
        inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
        where anio_academico =${anioI} and spa.propuesta in (${carrera}) and sa.ubicacion=${sede} and spa.tipo_ingreso =${tipoI} 
        and situacion_asp in (1,2) and not sa.legajo is null 
        )`

    let resultado = await coneccionDB.query(sqlstr)
    return resultado


  } catch (error) {
    console.log(error)
  }
}


const traerEgresadosCohorte = async (anioI, sede, carrera, i, tipoI) => {
  let anioR = i + 1
  let fecha = anioR + '-04-01'
  /*
  let certificado=0
  if(carrera==='1')
      {certificado='3'}else if(carrera===2){
          certificado=4
      }else if(carrera==='3'){
          certificado=5
      }else if(carrera==='6'){
          certificado=6
      }else if(carrera==='7'){
          certificado=7
      }else if(carrera==='8'){
          certificado=9
      }
*/
  try {

    //let sqlstr =`select case certificado when 3 then 'CPN' when 4 then 'LA' when 5 then 'LE' when 6 then 'LNRG' when 7 then 'LLO' when 8 then 'CP' end as carrera, count(certificado) from negocio.sga_certificados_otorg sco  
    let sqlstr = `select count(*) from negocio.sga_certificados_otorg sco  
                where fecha_egreso<='${fecha}' and persona in (select sa.persona  from negocio.sga_propuestas_aspira spa 
                inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
                where anio_academico =${anioI} and spa.propuesta in (${carrera}) and sa.ubicacion=${sede} and spa.tipo_ingreso =${tipoI} 
                and situacion_asp in (1,2) and not sa.legajo is null) and certificado in (3,4,5,6,7,9)
                        
        `
    const resultado = await coneccionDB.query(sqlstr)

    return resultado.rows
  } catch (error) {

    console.log(error)

  }

}


export const getEvolucionCohorte = async (req, res) => {

  const { anioI, sede, carrera, anioFC, tipoI } = req.params


  let aniototal = []

  try {
    for (let i = Number(anioI) + 1; i < Number(anioFC) + 1; i++) {
      // console.log(anioI, sede, carrera, i, tipoI)
      let totalI = await TreinscriptosPorAnioCohorte(anioI, sede, carrera, i, tipoI)
      let egresados = await traerEgresadosCohorte(anioI, sede, carrera, i, tipoI)
      //console.log(egresados)
      let objti = { anio: i, total: totalI.rows[0], tote: egresados[0].count }

      aniototal.push(objti)

    }
    //console.log(aniototal)
    res.send(aniototal)
  } catch (error) {
    console.log(error)
  }
}

/*
export const consultaQuery = async (req, res) => {
  const { sqlstr } = req.params;
  //console.log(sqlstr)

  if (!sqlstr) {
    return res.status(400).json({ error: "Consulta no proporcionada" });
  }

  try {
    const result = await coneccionDB.query(sqlstr);
    res.json(result.rows);
  } catch (error) {
    console.error("Error ejecutando consulta:", error);
    res.status(500).send({ error: "Error en la consulta SQL" });
  }
};
*/

// controllers/alumnosController.js

export const getResumenAlumnos = async (req, res) => {
  //const { pool } = require('../db'); // Asegúrate que tenés un archivo db.js que exporta el pool

  const query = ` 
      WITH alumnos_filtrados AS (
  SELECT *
  FROM fce_per.alumnos_info
  WHERE calidad = 'A'
    AND propuesta NOT IN (6)
    AND coef_tcarrera NOT IN (0, 100) -- Ahora filtramos 0 y 100
)
SELECT
   CASE ubicacion 
            WHEN 1 THEN 'MZA' 
            WHEN 2 THEN 'SRF' 
            WHEN 3 THEN 'GALV' 
            WHEN 4 THEN 'ESTE' 
          END AS ubicacion,

CASE
    WHEN propuesta = 1 THEN 'CPN'
    WHEN propuesta = 2 THEN 'LA'
    WHEN propuesta = 3 THEN 'LE'
    WHEN propuesta = 7 THEN 'LLO'
    WHEN propuesta = 8 THEN 'CP'
    ELSE 'Otra'
  END AS propuesta,
  
  aniocursada,
  COUNT(*) AS cantidad_alumnos,
  ROUND(AVG(coef_tcarrera), 2) AS promedio_coef_tcarrera,
  ROUND(AVG(completado), 2) AS promedio_completado,
  ROUND(AVG(perdidasreg), 2) AS promedio_perdidas_reg,
  ROUND(AVG(promedioca), 2) AS promedio_promedioca
FROM alumnos_filtrados
GROUP BY propuesta, ubicacion, aniocursada

UNION ALL

SELECT
  'TOTAL' AS propuesta,
  NULL AS ubicacion,
  NULL AS aniocursada,
  COUNT(*) AS cantidad_alumnos,
  ROUND(AVG(coef_tcarrera), 2) AS promedio_coef_tcarrera,
  ROUND(AVG(completado), 2) AS promedio_completado,
  ROUND(AVG(perdidasreg), 2) AS promedio_perdidas_reg,
  ROUND(AVG(promedioca), 2) AS promedio_promedioca
  
FROM alumnos_filtrados
ORDER BY 
  propuesta NULLS LAST,
  ubicacion NULLS LAST,
  aniocursada NULLS LAST;


    `;

  try {
    const { rows } = await coneccionDB.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error ejecutando la consulta:', error);
    res.status(500).json({ message: 'Error ejecutando la consulta', error: error.message });
  }
};
//////////
////////////

const obtenerReinscripcion = async (alumno, anio) => {
  try {
    const sql = `
        SELECT COUNT(*) AS reinscripcion
        FROM negocio.sga_reinscripciones
        WHERE alumno = $1 AND anio_academico = $2
      `;

    const result = await coneccionDB.query(sql, [alumno, anio]);
    return result.rows[0].reinscripcion;
  } catch (error) {
    console.error("Error en obtenerReinscripcion:", error);
    return 0;
  }
} //////

const actividadTroncal = async (anio, alumno) => {
  try {

    await coneccionDB.query('SET search_path TO negocio');
    let nro = 0

    let sqlstr = `SELECT COUNT(*) as nrotroncal FROM negocio.vw_hist_academica  WHERE resultado='A' AND alumno =${alumno}`
    if (anio === 3) {
      sqlstr += ` AND actividad_codigo in ('02370', '02375')`
      //  console.log(sqlstr)
      const resu = await coneccionDB.query(sqlstr)
      if (resu.rows[0].nrotroncal > 1) {
        return true
      } else { return false }

    } else if (anio === 2) {
      sqlstr += ` AND actividad_codigo in ('02270', '02275')`
      //  console.log(sqlstr)
      const resu = await coneccionDB.query(sqlstr)
      if (resu.rows[0].nrotroncal > 1) {
        return true
      } else { return false }

    } else if (anio === 1) {
      sqlstr += ` AND actividad_codigo in ('02170', '02175')`

      const resu = await coneccionDB.query(sqlstr)
      if (resu.rows[0].nrotroncal > 1) {
        return true
      } else { return false }
    }
  } catch (error) {
    console.log(error)
  }
}
//////////
//////////
async function calcularAnio19(car, uno, dos, tres, cuatro, alumno) {
  try {
    const carInt = parseInt(car, 10);

    // Caso para contador: car == 8 o car == 450
    if (carInt === 8 || carInt === 450) {
      if (uno > 8 && dos > 9 && tres > 8 && cuatro > 3) {
        return 5;
      }
      if (uno > 8 && dos > 9 && tres > 3) {
        return 4;
      }
      if (uno > 8 && dos > 3) {
        return 3;
      }
      if (uno > 3) {
        return 2;
      } else {
        return 1;
      }
    }

    // Caso para la: car == 2 o car == 386
    if (carInt === 2 || carInt === 386) {
      if (uno > 8 && dos > 8 && tres > 9 && cuatro > 3) {
        return 5;
      }
      if (uno > 8 && dos > 8 && tres > 3) {
        return 4;
      }
      if (uno > 8 && dos > 3) {
        return 3;
      }
      if (uno > 3) {
        return 2;
      } else {
        return 1;
      }
    }
    if (carInt === 3 || carInt === 464) {
      if (uno > 8 && dos > 8 && tres > 7 && cuatro > 3) {
        return 5;
      }
      if (uno > 8 && dos > 8 && tres > 3) {
        return 4;
      }
      if (uno > 8 && dos > 3) {
        return 3;
      }
      if (uno > 3) {
        return 2;
      } else {
        return 1;
      }
    }

    if (carInt === 7 || carInt === 3905) {

      if (uno > 9 && dos > 9 && tres > 5 && await actividadTroncal(3, alumno)) {

        return 4;
      }
      if (uno > 9 && dos > 5 && await actividadTroncal(2, alumno)) {
        return 3;
      }
      if (uno > 5 && await actividadTroncal(1, alumno)) {
        return 2;
      } else {
        return 1;
      }
    }
  } catch (error) {
    console.error(error);
    return 1
  }
}

////////

async function obtenerMateriasPorAnio(alumno, plan, fecha) {
  const condicionActividad = plan === 17
    ? `actividad_codigo LIKE '02%'`
    : `actividad_codigo LIKE '04%'`;

  try {
    await coneccionDB.query("SET search_path TO negocio");

    const sql = `
        SELECT ele.anio_de_cursada
        FROM vw_hist_academica AS ha
        INNER JOIN sga_elementos_plan AS ele 
          ON ele.elemento_revision = ha.elemento_revision AND ele.plan_version = ha.plan_version
        WHERE ${condicionActividad}
          AND CAST(fecha AS DATE) <= $1
          AND resultado = 'A'
          AND alumno = $2
      `;

    const result = await coneccionDB.query(sql, [fecha, alumno]);

    let uno = 0, dos = 0, tres = 0, cuatro = 0;
    for (const row of result.rows) {
      const anio = row.anio_de_cursada;
      if (anio === 1) uno++;
      else if (anio === 2) dos++;
      else if (anio === 3) tres++;
      else if (anio === 4) cuatro++;
    }

    return { uno, dos, tres, cuatro };
  } catch (error) {
    console.error("Error en obtenerMateriasPorAnio:", error);
    return { uno: 0, dos: 0, tres: 0, cuatro: 0 };
  }
}

//////////
/////////
async function obtenerMateriasPorAnioLLO(alumno, fecha) {

  try {

    await coneccionDB.query("SET search_path TO negocio");

    const sql = `
            SELECT count(*)as aprobadas
            FROM vw_hist_academica AS ha
            WHERE CAST(fecha AS DATE) <= $1
            AND resultado = 'A'
            AND alumno = $2
        `;

    const result = await coneccionDB.query(sql, [fecha, alumno]);
    let materiasAnio = result.rows[0].aprobadas;
    // console.log(materiasAnio)
    let aniocursada = 0;
    if (materiasAnio < 5) aniocursada = 1;
    else if (materiasAnio < 13) aniocursada = 2;
    else if (materiasAnio < 23) aniocursada = 3;
    else aniocursada = 4;


    return aniocursada;;

  } catch (error) {
    console.error("Error en obtenerMateriasPorAnio:", error);
    return 1;
  }
}
/////////
export const calcularAniosCursada = async (req, res) => {
  const { fecha, anio } = req.params; // Fecha por parámetro o default

  try {
    const sqlSelect = `
        SELECT alumno, propuesta, plan
        FROM fce_per.alumnos_ingresantes
        WHERE plan IN (17)
      `;
    const result = await coneccionDB.query(sqlSelect);
    const resultados = [];

    for (const row of result.rows) {
      const { alumno, propuesta, plan } = row;

      const { uno, dos, tres, cuatro } = await obtenerMateriasPorAnio(alumno, plan, fecha);
      // const aniocursada = await calcularAnio19(propuesta, uno, dos, tres, cuatro, alumno);
      //const aniocursada = await obtenerMateriasPorAnioLLO(alumno, fecha);
      //resultados.push({ alumno, aniocursada });
      const reinscripcion = await obtenerReinscripcion(alumno, anio)
      /*
      const sqlUpdate = `
        UPDATE fce_per.alumnos_ingresantes
        SET a_2025 = $1
        WHERE alumno = $2
      `;
      await coneccionDB.query(sqlUpdate, [aniocursada, alumno]);
      */
      /*reinscripcio*/
      // console.log(alumno, reinscripcion)
      const sqlUpdate = `
          UPDATE fce_per.alumnos_ingresantes
          SET r_2025 = $1
          WHERE alumno = $2
        `;
      await coneccionDB.query(sqlUpdate, [reinscripcion, alumno]);

    }

    res.json({
      total: resultados.length,
      registros: resultados
    });
  } catch (error) {
    console.error("Error al calcular años de cursada:", error);
    res.status(500).send("Error en el servidor");
  }
};


/////////

export const getAprobadasPorAlumno = async (req, res) => {

  // 1. Obtener el ID del alumno desde los parámetros de la URL.

  const { alumno } = req.params;

  //console.log(alumno)
  const queryText = `
        SELECT 
            vha.elemento,
            vha.actividad_codigo, 
            vha.actividad_nombre,
            vha.fecha,  
            vha.nota
        FROM negocio.vw_hist_academica vha 
        WHERE vha.alumno = $1 
          AND vha.resultado = 'A';
    `;

  // 3. Definir los valores para los parámetros
  const values = [alumno];

  // 4. Ejecutar la consulta dentro de un bloque try...catch
  try {
    const resufirst = await coneccionDB.query("set search_path=negocio");
    //  console.log(resufirst)
    const result = await coneccionDB.query(queryText, values);

    // 5. Enviar los resultados (result.rows es específico de 'pg')
    res.status(200).json(result.rows);

  } catch (error) {
    // 6. Manejar errores
    console.error('Error al consultar materias aprobadas:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
//////////

export const getRegularesPorAlumno = async (req, res) => {

  // 1. Obtener el ID del alumno desde los parámetros de la URL.

  const { alumno } = req.params;

  //console.log(alumno)
  const queryText = `
    SELECT 
            vha.elemento,
            vha.actividad_codigo, 
            vha.actividad_nombre,
            vha.fecha_vigencia 
        FROM negocio.vw_regularidades vha 
        WHERE vha.alumno = $1 
          AND vha.resultado = 'A' and estado='A' and es_vigente=1;
    `;

  // 3. Definir los valores para los parámetros
  const values = [alumno];

  // 4. Ejecutar la consulta dentro de un bloque try...catch
  try {
    const resufirst = await coneccionDB.query("set search_path=negocio");
    //  console.log(resufirst)
    const result = await coneccionDB.query(queryText, values);

    // 5. Enviar los resultados (result.rows es específico de 'pg')
    res.status(200).json(result.rows);

  } catch (error) {
    // 6. Manejar errores
    console.error('Error al consultar materias aprobadas:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
//////////
////----
function procesarEquivalencias_dos(rows) {
  const grupos = new Map();

  for (const row of rows) {
    const key = row.codigo_destino;

    if (!grupos.has(key)) {
      grupos.set(key, {
        codigo_destino: row.codigo_destino,
        materia_equivalente: row.materia_equivalente,
        requisito: Number(row.requisito),
        origenes: new Map(),
        esGrupoExcepcionR3: false
      });
    }

    const grupo = grupos.get(key);
    const nombreMateriaOrigen =
      row.actividad_origen || row.codigo_origen;

    // 🔥 Excepciones SOLO para requisito = 3
    if (
      grupo.requisito === 3 &&
      (row.grupo === 237 || row.grupo === 425)
    ) {
      grupo.esGrupoExcepcionR3 = true;
    }

    if (!grupo.origenes.has(nombreMateriaOrigen)) {
      grupo.origenes.set(nombreMateriaOrigen, []);
    }

    if (row.observaciones && row.observaciones !== '-') {
      grupo.origenes
        .get(nombreMateriaOrigen)
        .push(row.observaciones);
    }
  }

  const resultado = [];

  for (const grupo of grupos.values()) {
    const nombresOrigenes = Array.from(
      grupo.origenes.keys()
    );

    const cantidadAprobadas = nombresOrigenes.length;

    const esTotal =
      cantidadAprobadas >= grupo.requisito;

    const esParcialGeneral =
      cantidadAprobadas > 0 &&
      cantidadAprobadas < grupo.requisito;

    const esParcialExcepcionR3 =
      grupo.requisito === 3 &&
      grupo.esGrupoExcepcionR3 &&
      cantidadAprobadas >= 1;

    const mostrar =
      esTotal ||
      esParcialGeneral ||
      esParcialExcepcionR3;

    if (!mostrar) continue;

    const observaciones = new Set();

    for (const obsList of grupo.origenes.values()) {
      obsList.forEach(o => observaciones.add(o));
    }

    resultado.push({
      codigo_destino: grupo.codigo_destino,
      materia_equivalente:
        grupo.materia_equivalente,
      tipo: esTotal ? 'TOTAL' : 'PARCIAL',
      materias_origen_aprobadas:
        nombresOrigenes,
      ...(esTotal
        ? {}
        : {
            faltan:
              grupo.requisito -
              cantidadAprobadas
          }),
      observaciones: observaciones.size
        ? Array.from(observaciones).join(' | ')
        : grupo.requisito > 1 && !esTotal
        ? 'Debe completar contenidos'
        : '-'
    });
  }

  return resultado;
}

// --- 2. GENERACIÓN DE MAPA FINAL PARA EL PDF ---
const generarMapaFinal = (planEstudios, equivalenciasAprobadas, equivalenciasRegulares) => {
  const mapAprobadas = new Map(
    equivalenciasAprobadas.map(eq => [
      eq.codigo_destino,
      {
        tipo: eq.tipo,
        observacion: eq.tipo === 'TOTAL' ? '' : eq.observaciones,
        origenes: eq.materias_origen_aprobadas
      }
    ])
  );

  const mapRegulares = new Map(
    equivalenciasRegulares.map(eq => [
      eq.codigo_destino,
      {
        tipo: eq.tipo,
        observacion: eq.tipo === 'PARCIAL'
          ? (eq.observaciones !== '-' ? 'REG. PARCIAL: ' + eq.observaciones : 'Regularidad parcial')
          : 'Materia regular con equivalencia (controlar vigencia)',
        origenes: eq.materias_origen_aprobadas
      }
    ])
  );

  return planEstudios.map(m => {
    let tipoequivalencia = 'N';
    let observacion = '';
    let materiasOrigen = [];

    if (mapAprobadas.has(m.codigo)) {
      const eq = mapAprobadas.get(m.codigo);
      tipoequivalencia = eq.tipo === 'TOTAL' ? 'T' : 'P';
      observacion = eq.observacion;
      materiasOrigen = eq.origenes;
    } else if (mapRegulares.has(m.codigo)) {
      const eq = mapRegulares.get(m.codigo);
      tipoequivalencia = 'R';
      observacion = eq.observacion;
      materiasOrigen = eq.origenes;
    }

    return {
      carrera: m.carrera,
      codigo: m.codigo,
      actividad: m.actividad,
      anio: m.anio,
      periodo: m.periodo,
      tipo: m.tipo === 'N' ? 'Obligatoria' : m.tipo === 'O' ? 'Optativa' : 'Certificable',
      tipoequivalencia,
      observacion,
      materiasOrigen
    };
  });
};

// --- 3. CONTROLADOR DE CONSULTA ---
export const consultarEquivalencias = async (req, res) => {
  const { planOrigen, planDestino, materiasAprobadas, materiasRegulares } = req.body;
  let codigoCarrera = ''
  
  if(planDestino==='LE26'||planDestino==='LA26'||planDestino==='CP26') {
    codigoCarrera = planDestino.substring(0, 2);
  } else if(planDestino==='LLO25') {
    codigoCarrera = 'LLO';
  }
  
  // console.log("Parametros recibidos:", { planOrigen, planDestino, materiasAprobadas, materiasRegulares });
  if (!planOrigen || !planDestino || !materiasAprobadas) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
  }

  const listaMaterias = materiasAprobadas.split(',').map(m => m.trim());
  const listadoRegulares = materiasRegulares.split(',').map(m => m.trim());
 // console.log("Materias Aprobadas:", listaMaterias);
  try {
    // Nota: Agregamos 'asignatura_origen' a la query para tener el nombre
    const queryEquiBase = `
      SELECT codigo_origen,
             asignatura_origen AS actividad_origen,
             codigo_destino,
             asignatura_destino AS materia_equivalente,
             observaciones,
             requisito, 
             grupo
      FROM fce_per.equivalencias
      WHERE carrera_plan_origen = $1
        AND carrera_plan_destino = $2
      AND LTRIM(codigo_origen, '0') = ANY(
      SELECT LTRIM(m, '0') FROM unnest($3::text[]) AS m)
    `

    const resEqui = await coneccionDB.query(queryEquiBase, [planOrigen, planDestino, listaMaterias]);
    //console.log("Equivalencias Aprobadas Encontradas:", resEqui.rows);
    const equiAprobadas = procesarEquivalencias_dos(resEqui.rows);

    const resEquiReg = await coneccionDB.query(queryEquiBase, [planOrigen, planDestino, listadoRegulares]);
    const equiRegulares = procesarEquivalencias_dos(resEquiReg.rows);

    const resPlan = await coneccionDB.query(
      `SELECT carrera, codigo, actividad, anio, periodo, tipo FROM fce_per.equi_planes26new WHERE carrera = $1 ORDER BY anio, periodo`,
      [codigoCarrera]
    );
    //console.log("Plan de Estudios Destino:", resPlan.rows);
    const mapaCompleto = generarMapaFinal(resPlan.rows, equiAprobadas, equiRegulares);
    return res.json(mapaCompleto);

  } catch (err) {
    console.error(err);
    return res.status(500).send("Error procesando el mapa de carrera");
  }
};




export const generarInformeEquivalenciasPDF = (req, res) => {
  try {
    const { 
      alumno, 
      carreraOrigen, // Ej: "LE19" o "LA98"
      carreraDestino, 
      materiasAprobadas, 
      materiasRegulares, 
      equivalencias 
    } = req.body;

    const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });

    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // --- CONFIGURACIÓN DINÁMICA SEGÚN ORIGEN ---
    // Aquí definimos qué archivo de texto corresponde a cada plan de origen
    const configOrigen = {
        'LE98': {
        archivoReglas: 'equivalencias_LE98aLE26.txt', // O un txt resumen
        tituloAnexo: 'REGLAS DE TRANSICIÓN: LIC. EN ECONOMÍA (PLAN 1998)',
        colorTema: '#1e3a8a' // Azul oscuro
      },
        'LE19': {
        archivoReglas: 'equivalencias_LE19aLE26.txt', // O un txt resumen
        tituloAnexo: 'REGLAS DE TRANSICIÓN: LIC. EN ECONOMÍA (PLAN 2019)',
        colorTema: '#1e3a8a' // Azul oscuro
      },
      'LA19': {
        archivoReglas: 'equivalencias_LA19aLA26.txt', // O un txt resumen
        tituloAnexo: 'REGLAS DE TRANSICIÓN: LIC. EN ADMINISTRACIÓN (PLAN 2019)',
        colorTema: '#1e3a8a' // Azul oscuro
      },
      'LA98': {
        archivoReglas: 'equivalencias_LA98aLA26.txt',
        tituloAnexo: 'REGLAS DE TRANSICIÓN: LIC. EN ADMINISTRACIÓN (PLAN 1998)',
        colorTema: '#065f46' // Verde bosque para diferenciar
      },  'CPN98': {
        archivoReglas: 'equivalencias_CPN98aCP26.txt', // O un txt resumen
        tituloAnexo: 'REGLAS DE TRANSICIÓN: CONTADOR PUBLICO (PLAN 1998)',
        colorTema: '#1e3a8a' // Azul oscuro
      },
        'CP19': {
        archivoReglas: 'equivalencias_CP19aCP26.txt', // O un txt resumen
        tituloAnexo: 'REGLAS DE TRANSICIÓN: CONTADOR PUBLICO (PLAN 2019)',
        colorTema: '#1e3a8a' // Azul oscuro
      },
     'LLO16': {
        archivoReglas: 'equivalencias_LLO16aLLO25.txt', // O un txt resumen
        tituloAnexo: 'REGLAS DE TRANSICIÓN: LIC. EN LOGÍSTICA (PLAN 2016)',
        colorTema: '#1e3a8a' // Azul oscuro
      }
    };

    // Obtenemos la configuración actual o una por defecto
    const configActual = configOrigen[carreraOrigen] || {
      archivoReglas: 'reglas_generales.txt',
      tituloAnexo: 'REGLAS DE TRANSICIÓN GENERALES',
      colorTema: '#1e3a8a'
    };

    const limpiarTexto = (d) => {
      if (typeof d !== 'string') return d;
      let texto = d.replace(/["']/g, '').trim();
      return texto.split(':')[0].trim(); 
    };

    // --- 1. ENCABEZADO DINÁMICO ---
    doc.rect(0, 0, doc.page.width, 50).fill(configActual.colorTema);
    doc.fillColor('white').fontSize(12).font('Helvetica-Bold')
       .text(`INFORME DE TRANSICIÓN ACADÉMICA - ${carreraDestino}`, 40, 20);
    
    doc.moveDown(2.5);
    // --- NUEVO: AVISO DE IA ---
    doc.fillColor('#7f1d1d').fontSize(8).font('Helvetica-Bold') // Rojo oscuro para captar atención
       .text("Aviso Importante:", 40, doc.y, { continued: true })
       .font('Helvetica')
       .text(" Este análisis es generado por un Agente de IA con fines informativos. Los resultados deben ser validados por la Secretaría Académica de la Facultad de Ciencias Económicas.");
    
    doc.moveDown(1);
    doc.fillColor('#1f2937').fontSize(9).font('Helvetica-Bold')
       .text(`ESTUDIANTE: ${limpiarTexto(alumno.name)} -- LEGAJO: ${alumno.legajo}`, 40);
    doc.fontSize(8).font('Helvetica')
       .text(`PLAN DE ORIGEN: ${carreraOrigen} --> PLAN DE DESTINO: ${carreraDestino}`, 40);
    
    doc.moveTo(40, doc.y + 2).lineTo(550, doc.y + 2).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.moveDown(1);

    // --- 2. FUNCIÓN DE FILA ---
    const dibujarFila = (col1, col2, col3, color3 = '#374151', infoExtra = "") => {
      if (doc.y > 700) doc.addPage();
      const yActual = doc.y;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1f2937').text(col1, 40, yActual, { width: 55 });
      doc.font('Helvetica').fontSize(7.5).fillColor('#374151')
         .text(limpiarTexto(col2), 100, yActual, { width: 290, continued: !!infoExtra });
      if (infoExtra) {
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#0a3604').text(`  (${infoExtra})`);
      }
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(color3).text(col3, 400, yActual, { width: 150, align: 'right' });
      doc.moveDown(0.3);
    };

    // --- 3. SECCIONES DE ANTECEDENTES (Aprobadas y Regulares) ---
    // [Se mantiene igual que el código anterior...]
    if (materiasAprobadas?.length > 0) {
        doc.fillColor(configActual.colorTema).font('Helvetica-Bold').fontSize(9).text("ANTECEDENTES: MATERIAS APROBADAS", 40);
        doc.moveDown(0.3);
        materiasAprobadas.forEach(m => {
            dibujarFila(m.actividad_codigo || '---', m.actividad_nombre, `Calif.: ${m.nota}`);
            doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#f3f4f6').lineWidth(0.2).stroke();
            doc.moveDown(0.3);
        });
        doc.moveDown(0.5);
    }
     if (materiasRegulares?.length > 0) {
      doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(9).text("ANTECEDENTES: REGULARIDADES VIGENTES", 40);
      doc.moveDown(0.3);
      materiasRegulares.forEach(m => {
        const f = m.fecha_vigencia ? new Date(m.fecha_vigencia).toLocaleDateString() : '---';
        dibujarFila(m.actividad_codigo || '---', m.actividad_nombre, `VENCE: ${f}`, '#1e40af');
      });
      doc.moveDown(0.8);
    }

    // --- 4. BLOQUES DEL PLAN 2026 ---
    const imprimirBloque = (titulo, lista) => {
      if (!lista || lista.length === 0) return;
      doc.moveDown(0.5);
      doc.fillColor(configActual.colorTema).font('Helvetica-Bold').fontSize(10).text(titulo, 40);
      doc.moveDown(0.4);

      doc.fillColor('#f3f4f6').rect(40, doc.y, 510, 14).fill();
      doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(7);
      doc.text("CÓDIGO", 45, doc.y + 4);
      doc.text(`ASIGNATURA ${carreraDestino}`, 100, doc.y - 7);
      doc.text("ESTADO", 400, doc.y - 7, { width: 150, align: 'right' });
      doc.moveDown(1);

      lista.forEach(eq => {
        const mapping = { 'T': { t: 'TOTAL', c: '#166534' }, 'P': { t: 'PARCIAL', c: '#b45309' }, 'N': { t: 'PENDIENTE', c: '#991b1b' }, 'R': { t: 'REGULAR', c: '#1e40af' } };
        const res = mapping[eq.tipoequivalencia] || { t: 'PENDIENTE', c: '#991b1b' };
        dibujarFila(limpiarTexto(eq.codigo), eq.actividad, res.t, res.c, `${eq.anio}º -${eq.periodo}`);

        if (eq.materiasOrigen?.length > 0) {
          doc.font('Helvetica-Oblique').fontSize(7).fillColor('#0d0222')
            .text(`Origen (${carreraOrigen}): ${eq.materiasOrigen.map(limpiarTexto).join(' + ')}`, 105, doc.y, { width: 440 });
          doc.moveDown(0.3);
        }
        if (eq.observacion) {
          doc.font('Helvetica').fontSize(7).fillColor('#09b50c')
            .text(`Obs: ,${limpiarTexto(eq.observacion)}`, 105, doc.y, { width: 440, align: 'justify' });
          doc.moveDown(0.4);
        }
        doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        doc.moveDown(0.5);
      });
    };

    imprimirBloque("ANÁLISIS: ACTIVIDADES OBLIGATORIAS", equivalencias.filter(e => e.tipo === 'Obligatoria'));
    imprimirBloque("ANÁLISIS: ACTIVIDADES OPTATIVAS", equivalencias.filter(e => e.tipo === 'Optativa'));
    imprimirBloque("ANÁLISIS: ACTIVIDADESCERTIFICABLES", equivalencias.filter(e => e.tipo === 'Certificable'));

    // --- 5. ANEXO DINÁMICO (Carga el archivo según carreraOrigen) ---
    try {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 30).fill('#4b5563');
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text(configActual.tituloAnexo, 40, 10);
      
      doc.moveDown(3);
      
      const rutaReglas = path.join(process.cwd(), 'data', configActual.archivoReglas);
      console.log(`Cargando reglas desde: ${rutaReglas}`);
      if (fs.existsSync(rutaReglas)) {
        const contenido = fs.readFileSync(rutaReglas, 'utf8');
        doc.font('Courier').fontSize(7).fillColor('#4b5563')
           .text(contenido, { align: 'left', columns: 1, paragraphGap: 2 });
      } else {
        doc.fillColor('red').text(`Aviso: No se encontró el archivo de reglas [${configActual.archivoReglas}] para la carrera ${carreraOrigen}.`);
      }
    } catch (anexoError) {
      console.error("Error en anexo:", anexoError);
    }

    // --- 6. PIE DE PÁGINA ---
   /*
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor('#9ca3af')
         .text(`FCE UNCUYO - Informe Generado para ${carreraOrigen} - Página ${i + 1} de ${range.count}`, 40, 810, { align: 'center' });
    }
*/
    doc.end();

  } catch (error) {
    console.error("Error PDF:", error);
    if (!res.headersSent) res.status(500).send("Error al generar PDF");
  }
};
