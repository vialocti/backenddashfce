//import { Connection } from 'pg'
//const coneccionDB = require('../database.js');
//const { format } = require('@fast-csv/format');

import puppeteer from 'puppeteer';
import coneccionDB from '../database.js'
import { format } from '@fast-csv/format';
import openai from '../configopenai.js';

/*
export const nameFuncion = async (req, res) => {

    const {par, par} = req.params
    

    let sqlstr = `
`

    try {
        
        
        const resu = await coneccionDB.query(sqlstr)
        res.send(resu.rows)
    } catch (error) {

    }

}
*/

//import coneccionDB from '../database'

//alumos info por sede carrera plan version anio
export const getAlumnosInfoSedePropuestaplanversion = async (req, res) => {

  const { ubicacion, propuesta, plan, planversion, anioipro } = req.params


  let sqlstr = `select alumno,legajo,ubicacion,propuesta,plan,plan_version ,concat(apellido,', ',nombres) as estudiante ,anio_ingreso_pro ,anio_ingreso_fac ,aprobadas,reprobadas,regularesap ,promedioca, promediosa ,completado,coef_tcarrera,por_relativo  from fce_per.alumnos_info ai 
    where ubicacion=${ubicacion} and propuesta=${propuesta} and plan=${plan} and plan_version =${planversion} and anio_ingreso_pro =${anioipro} order by anio_ingreso_fac 
    `
  console.warn(sqlstr)
  try {

    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}

//planes activos en la tabla info
export const getplanesVersion = async (req, res) => {



  let sqlstr = `select distinct ai.propuesta,ai.plan, ai.plan_version, spv.nombre from fce_per.alumnos_info ai
            inner join negocio.sga_planes_versiones spv on spv.plan_version =ai.plan_version 
            order by propuesta`

  try {

    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {

  }

}


export const traerReinscripciones = async (req, res) => {

  const { anios } = req.params
  try {

    let strqy = `select ubicacion,anio_academico, propuesta, count(anio_academico) from negocio.sga_reinscripciones sr
        inner join negocio.sga_alumnos alu on alu.alumno=sr.alumno
        where anio_academico  in (${anios}) and propuesta in (1,2,3,6,7,8)  group by ubicacion,propuesta,anio_academico order by ubicacion, propuesta,anio_academico 
        `
    const resu = await coneccionDB.query(strqy)
    res.send(resu.rows)

  } catch (error) {
    console.log(error)
  }
}



export const traerCantidadInscriptosTotalfceper = async (req, res) => {

  const { anio, sede } = req.params;
  let sqlstr = `select sum(total_inscriptos), sum(regulares)  from fce_per.dash_actividad_resultados dar  where anio_academico =$1 and sede=$2`
  try {

    const resu = await coneccionDB.query(sqlstr, [anio, sede])
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }
}



//////PROCESAR INDICES ACTIVIDADES -> A INDICES TOAL SEDES
/////2da parte procesar datos

// Este es el nuevo procedimiento grabarIndiceTotal que ahora incluye 'propuesta'
/*
const grabarIndiceTotal = async (registro) => {
  const {
    anio,
    sede,
    propuesta, // <-- Nuevo: Agregamos propuesta
    periodo,
    totai,
    totalr,
    totallb,
    totallibas,
    tpromo,
    taprob1,
    taprob2,
    indicecur,
    indiceccorto,
    indiceclargo
  } = registro;

  try {
    let sqlI = 'INSERT INTO fce_per.dash_indices_total (anio_academico, sede, propuesta, periodo, "totalInscriptos", "totalRegulares", "totalDesaprobados", "totalAusentes", "totalPromocionados", totalaprobadascc, totalaprobadascl, promedioindicecursada, promedioindicecorto, promedioindicelargo) VALUES(';
    sqlI = sqlI + anio + "," + sede + "," + propuesta + ",'" + periodo + "'," + totai + "," + totalr + "," + totallb + "," + totallibas + "," + tpromo + "," + taprob1 + ", " + taprob2 + "," + indicecur + "," + indiceccorto + "," + indiceclargo + ")";
    //console.log(sqlI);
    const result = await coneccionDB.query(sqlI);
    if (result.rowCount === 1) {
      return `Registro para la propuesta ${propuesta} guardado`;
    }
  } catch (error) {
    console.log(error);
    return `Error servicio para la propuesta ${propuesta}: posible clave duplicada`;
  }
};
*/
const grabarIndiceTotal = async (registro) => {
  const {
    anio,
    sede,
    propuesta,
    periodo,
    totai,
    totalr,
    totallb,
    totallibas,
    tpromo,
    taprob1,
    taprob2,
    indicecur,
    indiceccorto,
    indiceclargo
  } = registro;

  try {
    const sqlUpsert = `
      INSERT INTO fce_per.dash_indices_total (
        anio_academico,
        sede,
        propuesta,
        periodo,
        "totalInscriptos",
        "totalRegulares",
        "totalDesaprobados",
        "totalAusentes",
        "totalPromocionados",
        totalaprobadascc,
        totalaprobadascl,
        promedioindicecursada,
        promedioindicecorto,
        promedioindicelargo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (anio_academico, sede, propuesta, periodo)
      DO UPDATE SET
        "totalInscriptos"    = EXCLUDED."totalInscriptos",
        "totalRegulares"     = EXCLUDED."totalRegulares",
        "totalDesaprobados"  = EXCLUDED."totalDesaprobados",
        "totalAusentes"      = EXCLUDED."totalAusentes",
        "totalPromocionados" = EXCLUDED."totalPromocionados",
        totalaprobadascc     = EXCLUDED.totalaprobadascc,
        totalaprobadascl     = EXCLUDED.totalaprobadascl,
        promedioindicecursada = EXCLUDED.promedioindicecursada,
        promedioindicecorto  = EXCLUDED.promedioindicecorto,
        promedioindicelargo  = EXCLUDED.promedioindicelargo
    `;

    const values = [
      anio, sede, propuesta, periodo,
      totai, totalr, totallb, totallibas, tpromo,
      taprob1, taprob2,
      indicecur, indiceccorto, indiceclargo
    ];

    const result = await coneccionDB.query(sqlUpsert, values);

    if (result.rowCount === 1) {
      // rowCount = 1 tanto en INSERT como en UPDATE exitoso
      return `Propuesta ${propuesta}: registro guardado/actualizado correctamente`;
    }

  } catch (error) {
    console.log(error);
    return `Error en propuesta ${propuesta}: ${error.message}`;
  }
};

// Este es el nuevo procedimiento procesarDatosIndices
const procesarDatosIndices = async (datosI) => {
  // Los nombres de las columnas en la consulta son distintos
  // a los nombres que se usan en la funcion procesarDatosIndices
  // (Ej: 'total_inscriptos' vs 'toti')
  // por eso se renombran los campos para hacer el codigo mas claro
  const toti = datosI.total_inscriptos;
  const tregu = datosI.totales_regulares;
  const tlibre = datosI.totales_reprobados;
  const tlibreast = datosI.totales_ausentes;
  const tpromocionados = datosI.totales_promocionados;
  const tapro1 = datosI.totales_aprobados_e1;
  const tapro2 = datosI.totales_aprobados_e2;

  // Se agrega el campo 'propuesta'
  const anio = datosI.anio_academico;
  const sede = datosI.sede;
  const propuesta = datosI.propuesta;

  // Las relaciones se calculan solo si hay inscriptos para evitar division por cero
  let relapromo = toti > 0 ? tpromocionados / toti : 0;
  let relaregu = toti > 0 ? (parseInt(tpromocionados) + parseInt(tregu)) / toti : 0;
  let relaccorto = toti > 0 ? tapro1 / toti : 0;
  let relaclargo = toti > 0 ? tapro2 / toti : 0;

  //console.log(relapromo, relaccorto, relaclargo, relaregu);

  let proindicecursada = relaregu * 0.7 + relapromo * 0.3;
  let proindiceccorto = relaregu * 0.7 + relaccorto * 0.3;
  let proindiceclargo = relaregu * 0.7 + relaclargo * 0.3;

  try {
    const datosp = {
      anio: anio,
      sede: sede,
      propuesta: propuesta, // <-- Nuevo: Agregamos propuesta
      periodo: 'A',
      totai: toti,
      totalr: tregu - tpromocionados,
      totallb: tlibre,
      totallibas: tlibreast,
      tpromo: tpromocionados,
      taprob1: tapro1,
      taprob2: tapro2,
      indicecur: proindicecursada.toFixed(3),
      indiceccorto: proindiceccorto.toFixed(3),
      indiceclargo: proindiceclargo.toFixed(3)
    };
    return datosp;
  } catch (error) {
    console.log(error);
  }
};

// El procedimiento procesarIndicesTot, modificado para manejar multiples registros
export const procesarIndicesTot = async (req, res) => {
  const {
    anio,
    sede
  } = req.params;
  let sqlstr = `SELECT
        sede,
        anio_academico,
        propuesta,
        SUM(total_inscriptos) AS total_inscriptos,
        SUM(regulares) AS totales_regulares,
        SUM(reprobados) AS totales_reprobados,
        SUM(ausentes) AS totales_ausentes,
        SUM(promocionados) AS totales_promocionados,
        SUM(aprobadase1) AS totales_aprobados_e1,
        SUM(aprobadase2) AS totales_aprobados_e2
        FROM
        fce_per.dash_actividad_resultados
        WHERE
        anio_academico = $1
        and sede = $2
        GROUP BY
        sede,
        anio_academico,
        propuesta
        ORDER BY
        anio_academico,
        sede,
        propuesta;`;
  try {
    const resu = await coneccionDB.query(sqlstr, [anio, sede]);
    // Arreglo para guardar los resultados de las inserciones
    const resultadosInsercion = [];

    // Itera sobre cada fila (registro) obtenida de la base de datos
    for (const registro of resu.rows) {
      // Procesa los datos de cada registro de forma individual
      const resultado = await procesarDatosIndices(registro);
      // Graba cada registro procesado
      const resuinsert = await grabarIndiceTotal(resultado);
      resultadosInsercion.push(resuinsert);
    }

    // Envía el array de resultados de la insercion
    res.send({
      message: "Proceso completado",
      results: resultadosInsercion
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error en el servidor al procesar los datos."
    });
  }
};


/*
const grabarIndiceTotal= async(registro)=>{
    const {anio, sede,periodo ,totai,totalr,totallb,totallibas,tpromo,taprob1, taprob2,indicecur,indiceccorto, indiceclargo} = registro

    
    try{
    
        let sqlI = 'INSERT INTO fce_per.dash_indices_total (anio_academico,sede,periodo,"totalInscriptos","totalRegulares","totalDesaprobados","totalAusentes","totalPromocionados",totalaprobadascc,totalaprobadascl,promedioindicecursada,promedioindicecorto,promedioindicelargo) values('
    sqlI=sqlI + anio + "," + sede +",'" + periodo + "'," + totai + "," + totalr + "," +  totallb + "," +  totallibas + "," + tpromo + "," + taprob1 + ", " + taprob2 + "," + indicecur +   "," + indiceccorto + ","  + indiceclargo + ")"
    console.log(sqlI)
     const result = await coneccionDB.query(sqlI)
     if(result.rowCount===1){
        return "Registro guardado"
     }
     
    //console.log(result.rowCount)
    }catch(error){
      
      //console.log(error)
      return "Error servicio, posible clave duplicada"
    }
  
  
  }


const procesarDatosIndices=async (datosI)=>{
    
    
    let relapromo=datosI.tpromocionados / datosI.toti
    let relaregu=(parseInt(datosI.tpromocionados) + parseInt(datosI.tregu)) / datosI.toti
    let relaccorto=datosI.tapro1 / datosI.toti
    let relaclargo=datosI.tapro2 / datosI.toti
    console.log(relapromo, relaccorto, relaclargo,relaregu)
    let proindicecursada=relaregu * 0.7 + relapromo * 0.3
    let proindiceccorto=relaregu * 0.7 + relaccorto * 0.3
    let proindiceclargo=relaregu * 0.7 + relaclargo * 0.3

    try {
        const datosp={
        anio:anio,
        sede:sede,
        propuesta:propuesta,
        periodo:'A',
        totai:datosI.toti,
        totalr:datosI.tregu,
        totallb:datosI.tlibre,
        totallibas:datosI.tlibreast,
        tpromo:datosI.tpromocionados,
        taprob1:datosI.tapro1,
        taprob2:datosI.tapro2,
        indicecur:proindicecursada.toFixed(3),
        indiceccorto:proindiceccorto.toFixed(3),
        indiceclargo:proindiceclargo.toFixed(3) 
    }
    return datosp
    } catch (error) {
        console.log(error)
    }

}


/////inicio
export const procesarIndicesTot = async (req, res) =>{

    const {anio,sede} = req.params;
      let sqlstr=`SELECT
    sede,
    anio_academico,
    propuesta,
    SUM(total_inscriptos) AS total_inscriptos,
    SUM(regulares) AS totales_regulares,
    SUM(reprobados) AS totales_reprobados,
    SUM(ausentes) AS totales_ausentes,
    SUM(promocionados) AS totales_promocionados,
    SUM(aprobadase1) AS totales_aprobados_e1,
    SUM(aprobadase2) AS totales_aprobados_e2,
    AVG(relacion_regular) AS promedio_relacion_regular
FROM
    fce_per.dash_actividad_resultados
WHERE
    anio_academico = $1
    and sede = $2
GROUP BY
    sede,
    anio_academico,
    propuesta
ORDER BY
    anio_academico,
    sede,
    propuesta;`
    try {
       
        const resu = await coneccionDB.query(sqlstr,[anio,sede])
        const resultado = await procesarDatosIndices(resu.rows)
        const resuinsert = await grabarIndiceTotal(resultado)
        //console.log(resuinsert)

        res.send({message:resuinsert})
    } catch (error) {
        console.log(error)   
    }
}
*/

//////


export const traerDatosHistoricosIndicesTotalPeriodo = async (req, res) => {
  const { anioI, anioF, sede } = req.params;

  let sqlstr = `select * from fce_per.dash_indices_total idt  where anio_academico>=$1 and anio_academico<=$2 and sede=$3`
  try {

    const resu = await coneccionDB.query(sqlstr, [anioI, anioF, sede])
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }
}


///--------------------------------
const buscarDatosIndiceT = async (anio) => {


  let sqlstr = `select cast(sum("totalInscriptos") as numeric) as "totalInscriptos", sum("totalRegulares") as "totalRegulares", sum("totalDesaprobados") as "totalDesaprobados", sum("totalAusentes") as "totalAusentes"
    , sum("totalPromocionados") as "totalPromocionados",  sum(totalaprobadascc)as totalaprobadascc, sum(totalaprobadascl) as totalaprobadascl from fce_per.dash_indices_total where anio_academico =$1 and sede in ('1','2','4')`
  try {

    const resu = await coneccionDB.query(sqlstr, [anio])

    return resu.rows
  } catch (error) {
    console.log(error)
  }

}

//////----------------------------------------------/////

// controllers/indicesController.js
//import { pool } from '../db.js';

export const getIndices = async (req, res) => {
  const { anios, tipo } = req.query;
  // anios puede ser un array o string "2023,2024"

  let groupBy = '';
  let selectCols = '';

  switch (tipo) {
    case 'propuesta':
      groupBy = 'propuesta';
      selectCols = 'propuesta';
      break;
    case 'sede':
      groupBy = 'sede';
      selectCols = 'sede';
      break;
    case 'anio_propuesta':
      groupBy = 'anio_academico, propuesta';
      selectCols = 'anio_academico, propuesta';
      break;
    case 'anio_sede':
      groupBy = 'anio_academico, sede';
      selectCols = 'anio_academico, sede';
      break;
    default:
      return res.status(400).json({ error: 'Tipo de agrupación inválido' });
  }

  const sql = `
    SELECT ${selectCols},
      CAST(SUM("totalInscriptos") AS numeric) AS "totalInscriptos",
      SUM("totalRegulares") AS "totalRegulares",
      SUM("totalDesaprobados") AS "totalDesaprobados",
      SUM("totalAusentes") AS "totalAusentes",
      SUM("totalPromocionados") AS "totalPromocionados",
      SUM(totalaprobadascc) AS totalaprobadascc,
      SUM(totalaprobadascl) AS totalaprobadascl
    FROM fce_per.dash_indices_total
    WHERE anio_academico = ANY($1)
    GROUP BY ${groupBy}
    ORDER BY ${groupBy};
  `;

  try {
    const { rows } = await coneccionDB.query(sql, [anios.split(',')]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error ejecutando la query' });
  }
};




//////-----------------------------------------------////

////-------------------------------///

export const traerIndiceTotalAnios = async (req, res) => {

  const { anioI, anioF } = req.params;
  let listaInd = []

  try {

    for (let i = parseInt(anioI); i < parseInt(anioF) + 1; i++) {
      let datosAnio = await buscarDatosIndiceT(i)
      let regularesT = parseInt(datosAnio[0].totalRegulares) + parseInt(datosAnio[0].totalPromocionados)
      let totalcc = parseInt(datosAnio[0].totalaprobadascc) + parseInt(datosAnio[0].totalPromocionados)
      let totalcl = parseInt(datosAnio[0].totalaprobadascl) + parseInt(datosAnio[0].totalPromocionados)
      datosAnio[0].anio_academico = i
      datosAnio[0].promedioindicecursada = ((regularesT / datosAnio[0].totalInscriptos) * 0.7 + (datosAnio[0].totalPromocionados / datosAnio[0].totalInscriptos) * 0.3).toFixed(3)
      datosAnio[0].promedioindicecorto = ((regularesT / datosAnio[0].totalInscriptos) * 0.7 + (totalcc / datosAnio[0].totalInscriptos) * 0.3).toFixed(3)
      datosAnio[0].promedioindicelargo = ((regularesT / datosAnio[0].totalInscriptos) * 0.7 + (totalcl / datosAnio[0].totalInscriptos) * 0.3).toFixed(3)

      listaInd.push(datosAnio[0])
    }

    res.send(listaInd)
  } catch (error) {
    console.log(error)
  }

}



export const getIndicesAlumnos = async (req, res) => {
  try {
    const query = `
      SELECT
        CASE 
          WHEN ubicacion = 1 THEN 'MZA'
          WHEN ubicacion = 2 THEN 'SRF'
          WHEN ubicacion = 4 THEN 'EST'
        END AS sede,   
        CASE
          WHEN propuesta = 1 THEN 'CPN' 
          WHEN propuesta = 2 THEN 'LA' 
          WHEN propuesta = 3 THEN 'LE'
          WHEN propuesta = 7 THEN 'LLO'
          WHEN propuesta = 8 THEN 'CP'
          ELSE 'Otra'
        END AS carrera,
        plan,
        aniocursada,
        CASE 
          WHEN coef_tcarrera IN (0, 100) THEN 'No calculado'
          WHEN coef_tcarrera <= 1.3 THEN '<= a 1,3'
          WHEN coef_tcarrera > 1.3 THEN '> a 1,3'
        END AS rango_coef,
        COUNT(*) AS cantidad_alumnos,
        ROUND(AVG(completado), 2) AS promedio_completado,
        ROUND(AVG(coef_tcarrera), 2) AS promedio_coeficiente,
        ROUND(MIN(coef_tcarrera), 2) AS min_coeficiente,
        ROUND(MAX(coef_tcarrera), 2) AS max_coeficiente,
        ROUND(STDDEV_POP(coef_tcarrera), 4) AS desvio_tipo
      FROM fce_per.alumnos_info
      WHERE propuesta IN (1, 2, 3, 7, 8)
      GROUP BY ubicacion, propuesta, plan, aniocursada, rango_coef
      ORDER BY ubicacion, propuesta, plan, aniocursada, rango_coef;
    `;

    const result = await coneccionDB.query(query);
    res.json(result.rows);

  } catch (error) {
    console.error('Error ejecutando getIndicesAlumnos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};






////tema alumnos info comisiones propuestas
// controllers/comisionesController.js

async function obtenerAnioDeCursada(plan_version, elemento) {
  const result = await coneccionDB.query(`
    SELECT sep.anio_de_cursada
    FROM negocio.sga_elementos_plan sep
    INNER JOIN negocio.sga_elementos_revision ser ON ser.elemento_revision = sep.elemento_revision
    WHERE sep.plan_version = $1 AND ser.elemento = $2
    LIMIT 1
  `, [plan_version, elemento]);

  return result.rows.length ? result.rows[0].anio_de_cursada : null;
}


// Función: Obtener alumnos por comisión y plan_version
async function getAlumnosPorComisionYPlanVersion(comision, plan_version) {
  const result = await coneccionDB.query(`
    SELECT alumno 
    FROM negocio.sga_insc_cursada 
    WHERE comision = $1 AND plan_version = $2
  `, [comision, plan_version]);
  return result.rows.map(r => r.alumno);
}

// Función: Contar alumnos aprobados por instancia
async function contarPorActa(comision, alumnosIds, instancia) {
  if (alumnosIds.length === 0) return 0;

  const result = await coneccionDB.query(`
    SELECT COUNT(*) 
    FROM negocio.sga_actas_detalle sad
    INNER JOIN negocio.sga_actas sa ON sa.id_acta = sad.id_acta 
    WHERE sa.comision = $1 
      AND sad.rectificado = 'N' 
      AND sad.instancia = $2 
      AND sad.resultado = 'A'
      AND sad.alumno = ANY($3::int[])
  `, [comision, instancia, alumnosIds]);

  return parseInt(result.rows[0].count, 10);
}

// Función principal



// Reutilizamos las funciones anteriores
// ...

export const exportComisionesCSV = async (req, res) => {
  const { anio } = req.params;
  const mapaPropuestas = {
    57: 'LA',
    56: 'CPN',
    65: 'CPN',
    67: 'LE',
    68: 'LE',
    46: 'LE',
    73: 'LE',
    82: 'CP',
    77: 'CP',
    69: 'CP',
    45: 'LLO',
    49: 'LE',
    50: 'CP',
    51: 'LA',
    59: 'LLO',
    79: 'LLO',
    75: 'LLO',
    80: 'LLO',
    81: 'CP',
    70: 'LA',
    66: 'LA',
    72: 'LA',
    74: 'LE',
    76: 'LE',
    83: 'LA',
    84: 'LE',
    85: 'CP'
  };


  try {
    const resumen = await coneccionDB.query(`
      SELECT DISTINCT 
        case sc.ubicacion
          when 1 then 'MZA'
          when 2 then 'SRF'
          when 4 then 'EST'
        end as ubicacion,
        sic.plan_version, 
        sic.comision,
        se.elemento,
        COUNT(sic.alumno) AS cantidad
      FROM negocio.sga_insc_cursada sic 
      INNER JOIN negocio.sga_comisiones sc ON sc.comision = sic.comision
      INNER JOIN negocio.sga_elementos se ON se.elemento = sc.elemento 
      INNER JOIN negocio.sga_periodos_lectivos spl ON spl.periodo_lectivo = sc.periodo_lectivo
      INNER JOIN negocio.sga_periodos sp ON sp.periodo = spl.periodo
      INNER JOIN negocio.sga_periodos_genericos spgt ON spgt.periodo_generico = sp.periodo_generico 
      WHERE sp.anio_academico = $1
        AND NOT sc.nombre LIKE 'V%'
        AND NOT sc.nombre LIKE '%Recur%'
        AND NOT sc.nombre LIKE '%VIRT%'
        AND NOT sic.plan_version IN (10, 47)
      GROUP BY sc.ubicacion,sic.plan_version, sic.comision, se.elemento
    `, [anio]);

    const detalle = await Promise.all(resumen.rows.map(async ({ ubicacion, plan_version, comision, elemento, cantidad }) => {
      const alumnos = await getAlumnosPorComisionYPlanVersion(comision, plan_version);
      const regulares = await contarPorActa(comision, alumnos, 1);
      const promocionados = await contarPorActa(comision, alumnos, 2);
      const anio_cursada = await obtenerAnioDeCursada(plan_version, elemento);
      const propuesta = mapaPropuestas[plan_version] || 'Desconocida';



      return {
        ubicacion,
        plan_version,
        propuesta,
        comision,
        elemento,
        cantidad: parseInt(cantidad, 10),
        regulares,
        promocionados,
        anio_cursada
      };
    }));

    res.setHeader('Content-Disposition', `attachment; filename="detalle_comisiones_${anio}.csv"`);
    res.setHeader('Content-Type', 'text/csv');

    const csvStream = format({ headers: true });
    csvStream.pipe(res);
    detalle.forEach(row => csvStream.write(row));
    csvStream.end();

  } catch (error) {
    console.error("Error al exportar CSV:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};




//funcion para obtener anio de cursada
function calcularAnio(car, cantimat) {
  const carrera = parseInt(car, 10);
  const cantidad = parseInt(cantimat, 10);
  let anioc = '';

  try {
    if ([1, 451].includes(carrera)) { // Contador
      if (cantidad < 4) anioc = '1';
      else if (cantidad < 12) anioc = '2';
      else if (cantidad < 19) anioc = '3';
      else if (cantidad < 26) anioc = '4';
      else anioc = '5';
    }

    else if ([3, 464].includes(carrera)) { // Economía
      if (cantidad < 4) anioc = '1';
      else if (cantidad < 10) anioc = '2';
      else if (cantidad < 18) anioc = '3';
      else if (cantidad < 26) anioc = '4';
      else anioc = '5';
    }

    else if ([2, 386].includes(carrera)) { // Administración
      if (cantidad < 4) anioc = '1';
      else if (cantidad < 13) anioc = '2';
      else if (cantidad < 22) anioc = '3';
      else anioc = '4';
    }

    else if ([7, 3905].includes(carrera)) { // Logística
      if (cantidad < 5) anioc = '1';
      else if (cantidad < 13) anioc = '2';
      else if (cantidad < 23) anioc = '3';
      else anioc = '4';
    }

    else if ([6, 8216].includes(carrera)) { // LNRG
      if (cantidad < 8) anioc = '1';
      else if (cantidad < 15) anioc = '2';
      else anioc = '3';
    }

    return anioc;

  } catch (error) {
    console.error('Error en calcularAnio:', error);
    return '';
  }
}


export async function actualizarAniosCursada() {
  try {
    const { rows } = await coneccionDB.query(`
      SELECT alumno, propuesta, aprobadas
      FROM fce_per.alumnos_info 
      WHERE propuesta IN (1, 2, 3, 7, 8)
      AND plan IN ( 5, 6, 7, 11) 
      
      `);
    console.log('Cantidad de registros a actualizar:', rows.length);

    for (const { alumno, propuesta, aprobadas } of rows) {
      const anio = calcularAnio(propuesta, aprobadas);
      console.log(anio, propuesta, aprobadas);
      if (anio) {
        await coneccionDB.query(`
          UPDATE fce_per.alumnos_info
          SET aniocursada = $1
          WHERE alumno = $2
        `, [anio, alumno]);
      }
    }

    res.send({ message: 'Actualización completa de aniocursada.' });

  } catch (error) {
    console.error('Error al actualizar aniocursada:', error);
  }
}

//perdidda de regularidad



//perdidda de regularidad

async function tuvoPerdidaRegularidad(alumnoId, anio) {
  const result = await coneccionDB.query(`
    SELECT COUNT(*) AS perdidareg
    FROM negocio.sga_perdida_regularidad
    WHERE alumno = $1 AND anio_academico = $2
  `, [alumnoId, anio]);

  return parseInt(result.rows[0].perdidareg, 10);
}


export async function actualizarPerdidaRegularidad(req, res) {

  const { aniop } = req.params
  try {
    const { rows } = await coneccionDB.query(`
      SELECT alumno
      FROM fce_per.alumnos_info 
      WHERE propuesta IN (1, 2, 3, 7, 8)
         
      `);
    //console.log('Cantidad de registros a actualizar:', rows.length);

    for (const { alumno } of rows) {
      const perdioRegularidad = await tuvoPerdidaRegularidad(alumno, aniop);
      //console.log(aniop,perdioRegularidad, alumno);
      await coneccionDB.query(`
        UPDATE fce_per.alumnos_info
        SET perdidasreg = $1
        WHERE alumno = $2
      `, [perdioRegularidad, alumno]);

    }

    res.send({ message: 'Actualización completa de perdida regularidad.' });

  } catch (error) {
    console.error('Error al actualizar perdida:', error);
  }
}
///analiss

//funcion para obtener ingresantes por sede propuesta y anio  
async function getIngresantes(sede, propuesta, anioI) {

  let sqlstr = `select alumno from negocio.sga_propuestas_aspira spa 
  inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
  where  sa.ubicacion=${sede} and anio_academico =${anioI} and spa.propuesta= ${propuesta}
  and spa.tipo_ingreso in (1,3) and situacion_asp in (1,2) and not sa.legajo is null`
  //console.log(sqlstr)
  const result = await coneccionDB.query(sqlstr);


  // console.log('Alumnos ingresantes:', result.rows);
  return result.rows.map(r => r.alumno);

}
//funcion para obtener reinscripciones por alumno y anio

async function getReinscripciones(alumno, anio) {
  const result = await coneccionDB.query(`
    SELECT COUNT(*) AS reinscripto
    FROM negocio.sga_reinscripciones
    WHERE alumno = $1 AND anio_academico = $2
  `, [alumno, anio]);

  return parseInt(result.rows[0].reinscripto, 10);
}


//materias aprobadas por alumno y anio  
async function getMateriasAprobadas(alumno, anio) {

  const resu = await coneccionDB.query(`set search_path=negocio`)
  let sqlstr = `select count(*) as materias_aprobadas from negocio.vw_hist_academica vha where resultado = 'A' and alumno=$1 and anio_academico < $2`
  const result = await coneccionDB.query(sqlstr, [alumno, anio]);


  return parseInt(result.rows[0].materias_aprobadas, 10);
}
/////// analisis de reinscripciones /////////
function contarReinscripcionesAcumuladas(analisisAlumnos) {
  const anios = Object.keys(
    analisisAlumnos[0]?.reinscripciones
      .split(', ')
      .reduce((acc, entry) => {
        const [anio] = entry.split(':');
        acc[anio] = true;
        return acc;
      }, {})
  );

  const resultado = {};
  let alumnosActivos = [...analisisAlumnos]; // Comenzamos con todos

  for (const anio of anios) {
    let reinscriptos = 0;

    const nuevosActivos = [];

    for (const alumno of alumnosActivos) {
      const dato = alumno.reinscripciones
        .split(', ')
        .find(r => r.startsWith(anio + ':'));

      if (!dato) continue;

      const valor = dato.split(':')[1];

      if (valor === '1') {
        reinscriptos += 1;
        nuevosActivos.push(alumno); // Solo estos continúan al próximo año
      }
    }

    resultado[anio] = {
      total: alumnosActivos.length,
      reinscriptos,
      porcentaje: ((reinscriptos / alumnosActivos.length) * 100).toFixed(2) + '%'
    };

    alumnosActivos = nuevosActivos; // Solo siguen los que se reinscribieron
  }

  return resultado;
}

//funcion para calcular anio de cursada     


//calcular anio de cursada
async function calcularAnioCursada(propuesta, materiasAnio) {
  console.log('materiasAnio:', propuesta, 'typeof:', typeof propuesta);

  let aniocursada = 1;
  if (parseInt(propuesta) === 2) { // Administración  
    if (materiasAnio < 4) aniocursada = 1;
    else if (materiasAnio < 13) aniocursada = 2;
    else if (materiasAnio < 22) aniocursada = 3;
    else if (materiasAnio < 26) aniocursada = 4;
    else aniocursada = 5;

  } else if (parseInt(propuesta) === 3) { // Economía
    if (materiasAnio < 4) aniocursada = 1;
    else if (materiasAnio < 10) aniocursada = 2;
    else if (materiasAnio < 18) aniocursada = 3;
    else if (materiasAnio < 26) aniocursada = 4;
    else aniocursada = 5;

  } else if (parseInt(propuesta) === 7) { // Logística

    if (materiasAnio < 5) aniocursada = 1;
    else if (materiasAnio < 13) aniocursada = 2;
    else if (materiasAnio < 23) aniocursada = 3;
    else aniocursada = 4;

  } else if (parseInt(propuesta) === 8) { // Contador Publico
    if (materiasAnio < 4) aniocursada = 1;
    else if (materiasAnio < 12) aniocursada = 2;
    else if (materiasAnio < 19) aniocursada = 3;
    else if (materiasAnio < 26) aniocursada = 4;
    else aniocursada = 5;
  }
  return aniocursada;
}




//funcion principal controllador
export async function getAnalisisAlumnos(req, res) {

  const { anioI, anioF, sede, propuesta, } = req.params;

  try {
    const alumnos = await getIngresantes(sede, propuesta, anioI);
    const resultados = [];
    //console.log('Alumnos:', alumnos);
    for (const alumno of alumnos) {
      const reinscripciones = [];
      const materiasPorAnio = [];
      const anioCursadaPorAnio = [];

      for (let anio = parseInt(anioI) + 1; anio <= parseInt(anioF); anio++) {
        const reinscripto = await getReinscripciones(alumno, anio);
        reinscripciones.push({ anio, reinscripto });
        const materiasAnio = await getMateriasAprobadas(alumno, anio); // supondremos que filtra por año
        materiasPorAnio.push({ anio, materiasAnio });
        const anioCursada = await calcularAnioCursada(propuesta, materiasAnio); // calcula en base a materias acumuladas
        anioCursadaPorAnio.push({ anio, anioCursada })

      }

      //console.log(materiasPorAnio);
      //const anioCursada = calcularAnioCursada(propuesta, materiasAprobadas);

      resultados.push({
        alumno,
        sede,
        propuesta,
        reinscripciones: reinscripciones.map(r => `${r.anio}:${r.reinscripto}`).join(', '),
        materiasPorAnio: materiasPorAnio.map(m => `${m.anio}:${m.materiasAnio}`).join(', '),
        anioCursadaPorAnio: anioCursadaPorAnio.map(a => `${a.anio}:${a.anioCursada}`).join(', ')

      });
    }
    const analisisreinscriptos = contarReinscripcionesAcumuladas(resultados);
    //exportarCSV(resultados, 'analisis_alumnos.csv');
    //res.json(analisisreinscriptos) 
    res.json(resultados);
  } catch (error) {
    console.error('Error en getAnalisisAlumnos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}




//nuevo analisis de indice de cursadas


export const traerComisionesIndicesAnioLectivo = async (req, res) => {

  const { anio } = req.params

  const sqlstr = `select  dar.anio_academico , CASE 
          WHEN sede = 1 THEN 'MZA'
          WHEN sede = 2 THEN 'SRF'
          WHEN sede = 4 THEN 'ESTE'
        END AS sede,
        periodo,
        CASE
          WHEN propuesta = 1 THEN 'CPN' 
          WHEN propuesta = 2 THEN 'LA' 
          WHEN propuesta = 3 THEN 'LE'
          WHEN propuesta = 7 THEN 'LLO'
          WHEN propuesta = 8 THEN 'CP'
          ELSE 'Otra'
        END AS carrera,
        actividad_nombre,
        nombre, dar.total_inscriptos, (dar.regulares - dar.promocionados) as regular  ,dar.reprobados  ,dar.ausentes, dar.promocionados ,dar.relacion_regular, 
        dar.relacion_promocion, dar.indice_cursada, dar.indice_e1 , dar.indice_e2    		     
        from fce_per.dash_actividad_resultados dar 
        where propuesta in (1,2,3,8,7) and dar.indice_cursada > 0 and anio_academico=$1;`

  try {
    const resu = await coneccionDB.query(sqlstr, [anio])
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }


}



export const traerComisionesIndicesAnioLectivoI0 = async (req, res) => {

  const { anio } = req.params

  const sqlstr = `select  dar.anio_academico , CASE 
          WHEN sede = 1 THEN 'MZA'
          WHEN sede = 2 THEN 'SRF'
          WHEN sede = 4 THEN 'ESTE'
        END AS sede,
        periodo,
        CASE
          WHEN propuesta = 1 THEN 'CPN' 
          WHEN propuesta = 2 THEN 'LA' 
          WHEN propuesta = 3 THEN 'LE'
          WHEN propuesta = 7 THEN 'LLO'
          WHEN propuesta = 8 THEN 'CP'
          ELSE 'Otra'
        END AS carrera,
        actividad_nombre,
        nombre, dar.total_inscriptos, (dar.regulares - dar.promocionados) as regular  ,dar.reprobados  ,dar.ausentes, dar.promocionados ,dar.relacion_regular, 
        dar.relacion_promocion, dar.indice_cursada, dar.indice_e1 , dar.indice_e2    		     
        from fce_per.dash_actividad_resultados dar 
        where propuesta in (1,2,3,8,7) and dar.indice_cursada = 0 and anio_academico=$1;`

  try {
    const resu = await coneccionDB.query(sqlstr, [anio])
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}






// Asumimos que plantillaBase está importada o definida arriba
export const generateInformeIA_actividades_historicas = async (req, res) => {
  const { datos, promedios, filtros } = req.body;

  try {
    // 1. Configuración de OpenAI (Verifica que tu instancia esté bien configurada)
    const client = openai

    const prompt = `Genera un análisis académico profesional para la Sede con ID o nombre: ${filtros.sede}. 
                        Contexto: Propuesta ${filtros.propuesta}, Periodo ${filtros.periodo}.
                        Métricas Globales: Promoción ${promedios.relacion_promocion}%, Regularidad ${promedios.relacion_regular}%, Índice E2: ${promedios.indice_e2}.
                        Datos históricos detallados: ${JSON.stringify(datos)}`;

    const response = await client.responses.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Eres un analista académico experto. Genera un informe detallado. Responde ÚNICAMENTE en formato HTML usando etiquetas <h2>, <p>, <ul>, <li>. No incluyas etiquetas <html> ni <body>."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    // Corregido: La respuesta en OpenAI v4 se accede mediante choices[0].message.content
    const textoAI = response.output_text || "No se pudo generar el análisis.";

    // 2. Generar PDF con Puppeteer
    const browser = await puppeteer.launch({
      headless: "new", // Recomendado para versiones modernas
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Importante para entornos Linux/Docker
    });

    const page = await browser.newPage();

    // Reemplazamos los datos en la plantilla
    // Asegúrate de que plantillaBase use estos mismos placeholders
    let htmlFinal = plantillaBase
      .replace('{{CONTENIDO_AI}}', textoAI)
      .replace('{{FILTRO_SEDE}}', filtros.sede)
      .replace('{{AVG_PROMOCION}}', promedios.relacion_promocion)
      .replace('{{AVG_REGULAR}}', promedios.relacion_regular)
      .replace('{{AVG_E2}}', promedios.indice_e2);

    await page.setContent(htmlFinal, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true
    });

    await browser.close();

    // 3. Enviar el PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=informe_academico.pdf');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error detallado:', error);
    res.status(500).json({
      error: 'Error al generar el PDF.',
      details: error.message
    });
  }
}; // Se eliminó la llave extra que causaba error de sintaxis  


//verificar aprobadas con fecha y anio de cursada

export const getAprobadasAnioCursadaRendimiento = async (req, res) => {
  const { alumno } = req.params
  const resu = await coneccionDB.query(`set search_path=negocio`)
  const sqlstr = `SELECT   distinct  
  			vha.anio_academico,
  			vha.fecha,  
            vha.elemento,
            sep.anio_de_cursada,
            vha.actividad_codigo, 
            vha.actividad_nombre,
            vha.nota,
            vha.tipo
        FROM negocio.vw_hist_academica vha 
        inner join negocio.sga_elementos_plan sep on sep.elemento_revision =vha.elemento_revision and sep.plan_version = vha.plan_version 
        WHERE vha.alumno = $1 
          AND vha.resultado = 'A'
          AND not sep.anio_de_cursada isnull
       order by fecha `

  try {
    const resu = await coneccionDB.query(sqlstr, [alumno])
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }
} 
