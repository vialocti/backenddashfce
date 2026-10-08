import { cantidadExamenReprobados, recursa, recursada, regularidadVigente, regularidadVigentes, traerCantidadporActividad, traerInscriptosSedeAnio, traerRechazadosBajaActividad, tratarExamenes } from '../services/cursadas/cursadasServices.js'

//import { Connection } from 'pg'
//const coneccionDB = require('../../database.js');
import coneccionDB from "../database.js";
//inscripciones a cursasas por alumno
// controllers/inscripcionesController.js
import { traerFechaInicioIndices } from './utilesControllers.js'

//inscripciones
// controllers/inscripcionesController.js


/*
const {
    cantidadExamenReprobados,
    recursa,
    regularidadVigente,
    traerCantidadporActividad,
    traerInscriptosSedeAnio,
    traerRechazadosBajaActividad,
    tratarExamenes
  } = require('../services/cursadas/cursadasServices.js');
  
  const coneccionDB = require('../database.js');
  
  const { traerFechaInicioIndices } = require('./utilesControllers.js');
*/
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
///traelos periodos lectivos en un año academico
export const getPeriodosLectivosAnio = async (req, res) => {
  const { anio } = req.params

  let sqlstr = `select spl.periodo_lectivo,spl.periodo,spg.nombre, spg.periodo_generico  from negocio.sga_periodos_lectivos spl
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spg on spg.periodo_generico =sp.periodo_generico 
    where sp.anio_academico =${anio}`

  try {
    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)

  } catch (error) {
    console.log(error)
  }
}

//
//versiones propuestas

export const getPropuestaVersionactual = async (req, res) => {

  const { propuesta } = req.params
  let sqlstr = "select version_actual from negocio.sga_planes where estado='V' and propuesta = $1"
  try {
    // Ejecutar consulta usando parámetros para evitar inyección SQL
    const resu = await coneccionDB.query(sqlstr, [propuesta]);
    res.status(200).send(resu.rows);
  } catch (error) {
    console.error("Error al obtener los datos:", error);
    res.status(500).send({ error: "Error interno del servidor" });
  }

}



//listado de comisiones
export const getListComisionesAnio = async (req, res) => {

  const { anio } = req.params


  let sqlstr = `select sc.ubicacion, se.nombre as mater,sc.comision, sc.nombre,sc.periodo_lectivo,sc.elemento,sc.nombre as nmat,se.codigo,se.nombre, spl.periodo,sp.anio_academico, sp.periodo_generico, sp.nombre , spgt.periodo_generico_tipo,sc.estado  from negocio.sga_comisiones sc 
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico =${anio} and not sc.nombre like'V%' and sc.estado='A' order by sc.ubicacion, sc.periodo_lectivo, sc.nombre `

  try {
    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}

//listado de comisiones por materia solo numero de comision
export const getComisionesAnioMateria = async (req, res) => {

  const { anio, nmateria } = req.params
  // console.log(anio,nmateria)

  let sqlstr = `select sc.comision  from negocio.sga_comisiones sc 
        inner join negocio.sga_elementos se on se.elemento = sc.elemento 
        inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
        inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
        inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
        where sp.anio_academico =${anio} and se.nombre = '${nmateria}' and not sc.nombre like'V%' order by comision `
  //console.log(sqlstr)
  try {
    const resu = await coneccionDB.query(sqlstr)
    //console.log(resu.rows)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}


//comisiones por anio sede cantidad
export const getComisionesAnio = async (req, res) => {

  const { anio } = req.params


  let sqlstr = `select case sc.ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede,count(sc.ubicacion) from negocio.sga_comisiones sc
inner join negocio.sga_elementos se on se.elemento = sc.elemento 
inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo = sc.periodo_lectivo
inner join negocio.sga_periodos sp on sp.periodo=spl.periodo 
 
where sp.anio_academico =${anio} and not sc.nombre like'V%' and sc.estado='A' 
group by sc.ubicacion
order by sc.ubicacion
`

  try {


    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}


//comisiones sede plan
export const getComisionesSedePL = async (req, res) => {

  const { anio } = req.params


  let sqlstr = `select case sc.ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede,sp.nombre ,count(sp.nombre) from negocio.sga_comisiones sc
inner join negocio.sga_elementos se on se.elemento = sc.elemento 
inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo = sc.periodo_lectivo
inner join negocio.sga_periodos sp on sp.periodo=spl.periodo 
 
where sp.anio_academico =${anio} and not sc.nombre like'V%' 
group by sc.ubicacion,sp.nombre
order by sc.ubicacion,sp.nombre  
`

  try {


    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}

//--------//cantidad de inscriptos comision
export const getComisionesCantiInscriptos = async (req, res) => {

  const { anio } = req.params


  let sqlstr = `select sc.ubicacion,sc.nombre as ncomi,se.nombre,sic.comision, count(sic.comision) as tot from negocio.sga_insc_cursada sic 
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico =${anio} and not sc.nombre like'V%'
    
    group by sc.ubicacion, sc.nombre,se.nombre,sic.comision
    order by sc.ubicacion, sc.nombre  
`

  try {


    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}

//
////
//cantidad de inscriptos por espacio curricular para comparativas
export const getActividadCantiInscriptos = async (req, res) => {

  const { anio, sede } = req.params


  let sqlstr = `select sc.ubicacion,se.nombre, count(sic.comision) as tot from negocio.sga_insc_cursada sic 
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico =${anio} and sc.ubicacion=${sede} and not sc.nombre like'V%'
    
    group by sc.ubicacion, se.nombre
    order by sc.ubicacion, se.nombre  

`

  try {


    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}
////
//cantidad de inscriptos por espacio curricular todas las del año
export const getActividadCantiInscriptosC = async (req, res) => {

  const { anio} = req.params


  let sqlstr = `select distinct  sc.ubicacion, spgt.nombre as periodo, se.nombre as actividad, sc.nombre as ncomision, sic.comision as comi, count(sic.comision) as tot from negocio.sga_insc_cursada sic 
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico =$1 and not sc.nombre like'V%' and sc.estado='A'
    group by sc.ubicacion,spgt.nombre , se.nombre,sc.nombre, sic.comision
    order by sc.ubicacion, se.nombre ;

`
  try {

    const resu = await coneccionDB.query(sqlstr,[anio])
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}


/////inscripciones a cursadas

export const getActividadCantiInscriptosPorSede = async (req, res) => {

  const { anio } = req.params
  let anioE = anio
  //console.log(anio)
  if (parseInt(anio) === 0) {
    anioE = new Date().getFullYear()
    let fecha = new Date()
    if (fecha < new Date(`${anioE}-04-01`)) {
      anioE = anioE - 1
    }

  }
  let sqlstr = `select sc.ubicacion,sa.propuesta,sa.plan_version , sic.estado, count(sic.alumno)  from negocio.sga_insc_cursada sic
	inner join negocio.sga_alumnos sa on sa.alumno = sic.alumno 
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico =${anioE} and not sc.nombre like'V%' and sa.propuesta in (2,3,6,7,8)
    group by sc.ubicacion, sa.propuesta,sa.plan_version, sic.estado
    order by sc.ubicacion, sa.propuesta,sa.plan_version, sic.estado 
`
  try {


    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}


///alumnos inscriptos a cursadas por propuesta sede y año

export const getInscriptosSedeAnio = async (req, res) => {


  const { anio } = req.params
  // Nota: no agrupar por sic.estado (ni por otra columna propia de la inscripción a
  // cursada, en vez de propia del alumno): un mismo alumno puede tener cursadas con
  // distinto estado en el mismo año, y al sumar count(distinct alumno) de cada grupo
  // por separado en el frontend, quedaba contado más de una vez, inflando el total
  // de "Alumnos Insc." por encima del total real de alumnos distintos.
  let sqlstr = ` select  sc.ubicacion,sa.propuesta,sa.plan_version, count(distinct sic.alumno)  from negocio.sga_insc_cursada sic
	inner join negocio.sga_alumnos sa on sa.alumno = sic.alumno
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico
    where sp.anio_academico =$1 and not sc.nombre like'V%' and sa.propuesta in (2,3,6,7,8)

    group by sc.ubicacion, sa.propuesta,sa.plan_version
    order by sc.ubicacion, sa.propuesta,sa.plan_version`

  try {
    const resu = await coneccionDB.query(sqlstr, [anio])
    console.log(resu.rows)
    res.send(resu.rows)
  }
  catch (error) {
    console.log(error)
  }
}
/////
export const getInscriptosAlumnos_unicos = async (req, res) => { 
  const { anio } = req.params
let sqlstr = ` select  count(distinct sic.alumno)  from negocio.sga_insc_cursada sic
	inner join negocio.sga_alumnos sa on sa.alumno = sic.alumno
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico
    where sp.anio_academico =$1 and not sc.nombre like'V%' `  
    
    try {
    const resu = await coneccionDB.query(sqlstr, [anio])
    console.log(resu.rows)
    res.send(resu.rows)
  }
  catch (error) {
    console.log(error)
  }   
}
////

//cantidad de inscriptos por actividad sede carrera

export const getInscriptosPropuestaAñoSede = async (req, res) => {
  const { anio, sede, versionact } = req.params;

  // Consulta SQL usando parámetros
  const strqry = `
        SELECT 
            sc.ubicacion, 
            se.nombre , 
            sc.nombre AS comi, 
            COUNT(sic.comision) AS tot 
        FROM negocio.sga_insc_cursada sic
        INNER JOIN negocio.sga_comisiones sc ON sc.comision = sic.comision
        INNER JOIN negocio.sga_elementos se ON se.elemento = sc.elemento
        INNER JOIN negocio.sga_elementos_revision ser ON ser.elemento = se.elemento
        INNER JOIN negocio.sga_elementos_plan sep 
            ON sep.elemento_revision = ser.elemento_revision AND sep.plan_version = $3
        INNER JOIN negocio.sga_periodos_lectivos spl ON spl.periodo_lectivo = sc.periodo_lectivo
        INNER JOIN negocio.sga_periodos sp ON sp.periodo = spl.periodo
        INNER JOIN negocio.sga_periodos_genericos spgt ON spgt.periodo_generico = sp.periodo_generico
        WHERE sp.anio_academico = $1 
          AND sc.ubicacion = $2 
          AND NOT sc.nombre LIKE 'V%'
        GROUP BY sc.ubicacion, se.nombre, sc.nombre
        ORDER BY sc.ubicacion, se.nombre;
    `;

  try {
    // Ejecutar consulta usando parámetros para evitar inyección SQL
    const resu = await coneccionDB.query(strqry, [anio, sede, versionact]);
    res.status(200).send(resu.rows);
  } catch (error) {
    console.error("Error al obtener los datos:", error);
    res.status(500).send({ error: "Error interno del servidor" });
  }
};


//cantidad de inscriptos por actividad discriminando comisiones
//

export const getActividadComisionCantiInscriptos = async (req, res) => {

  const { anio, sede, actividad } = req.params


  let sqlstr = `select sc.ubicacion,sc.nombre as ncomi,sic.comision, count(sic.comision) as tot from negocio.sga_insc_cursada sic 
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico =${anio} and sc.ubicacion=${sede} and se.nombre='${actividad}' and  not sc.nombre like'V%'
    
    group by sc.ubicacion, sc.nombre,sic.comision
    order by sc.ubicacion, sc.nombre 

`

  try {


    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}



//cantidad de inscriptos por plan - comision
//--------
export const getComisionesCantiInscriptosPlan = async (req, res) => {

  const { anio } = req.params


  let sqlstr = `select distinct sc.ubicacion,spv.nombre as names ,sc.nombre as namec, se.nombre,sic.comision, count(sic.comision) as tot from negocio.sga_insc_cursada sic 
        inner join negocio.sga_comisiones sc on sc.comision=sic.comision
        inner join negocio.sga_elementos se on se.elemento = sc.elemento 
        inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
        inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
        inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
        inner join negocio.sga_planes_versiones spv on spv.plan_version =sic.plan_version 
        where sp.anio_academico =${anio} and not sc.nombre like'V%'
        
        group by sic.comision,spv.nombre,sc.ubicacion, sc.nombre,se.nombre
        order by sc.ubicacion, sc.nombre
    `

  try {


    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }


}
//detalle de actas por periodo
export const resultadoActaDetallesporPeriodo = async (req, res) => {

  const { anio, periodo, origen } = req.params


  let sqlstr = ` select sc.comision, sc.nombre  as namec,sp.nombre  ,sa.origen ,resultado,count(resultado)  from negocio.sga_actas_detalle sad 
    inner join negocio.sga_actas sa on sa.id_acta =sad.id_acta
    inner join negocio.sga_comisiones sc on sc.comision=sa.comision 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo 
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo 
    where sa.estado='C' and rectificado='N' and sp.anio_academico =${anio} and sa.origen='${origen}' and sp.periodo_generico =${periodo}
    group by sc.comision,sc.nombre,sp.nombre,sa.origen,sad.resultado order by sc.comision
`
  //console.log(sqlstr)
  try {


    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {

  }

}


//detalle de actas regular, promocion por comision(nombre de la comision)

export const resultadoActaDetallesporComision = async (req, res) => {

  const { anio, ncomision } = req.params


  let sqlstr = `select sc.comision,sc.nombre,sp.nombre  ,sa.origen,sa.tipo_acta ,resultado,count(resultado)  from negocio.sga_actas_detalle sad 
    inner join negocio.sga_actas sa on sa.id_acta =sad.id_acta
    inner join negocio.sga_comisiones sc on sc.comision=sa.comision 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo 
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo 
    where sa.estado='C' and sp.anio_academico =${anio} and sa.origen in('P','R') and sa.tipo_acta='N'
     and sc.comision='${ncomision}' 
    group by  sc.comision,sc.nombre,sp.nombre,sa.origen,sa.tipo_acta,sad.resultado
`

  try {


    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {

  }

}


//materias con comisiones anio sede
export const getListMateriasComision = async (req, res) => {

  const { anio, sede, periodo } = req.params
  let sedem = ""
  if (parseInt(sede) === 1) {
    sedem = "and (sc.nombre like 'M0%' or sc.nombre like 'M5%')"
  } else if (parseInt(sede) === 2) {
    sedem = "and (sc.nombre like 'S0%' or sc.nombre like 'S5%')"
  } else if (parseInt(sede) === 3) {
    sedem = "and sc.nombre like 'GA%'"
  } else if (parseInt(sede) === 4) {
    sedem = "and sc.nombre like 'SM%'"
  }


  let sqlstr = `select distinct se.codigo ,se.nombre    from negocio.sga_comisiones sc 
        inner join negocio.sga_elementos se on se.elemento = sc.elemento 
        inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
        inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
        inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
        where sp.anio_academico =${anio} and not sc.nombre like'V%' ${sedem} and sp.periodo_generico =${periodo} order by se.nombre;
 `

  try {
    const resu = await coneccionDB.query(sqlstr)
    res.send(resu.rows)
  } catch (error) {
    console.log(error)
  }

}

//detalle cursadasy rendimiento
//cuantas rectificadas son de ausentes cuantas de aptobados y cauantas de reprobadaos


const traerNrorectificadasPorResultado = async (nrocomision) => {



  try {

    const sqlstr = ` select resultado,count(resultado) as count from negocio.sga_actas_detalle sad
        inner join negocio.sga_actas sa on sa.id_acta=sad.id_acta
        where rectificado ='S'and sa.comision =${nrocomision} and tipo_acta ='N' group by resultado`

    const result = await coneccionDB.query(sqlstr)
    return result.rows

  } catch (error) {
    console.log(error)
  }
}




//traercodigo y nombre de cada comision
const traerDato = (comision, datoscrudos, dis) => {
  //console.log(comision)
  //console.log(datoscrudos)

  const result = datoscrudos.find(e => +e.comision === +comision)
  if (result) {
    if (dis === 0) {
      return result.nombre
    } else if (dis === 1) {
      return result.periodo
    }
  } else { return false }
}

/*
//rectificadas buscar actas rectificadas
const traerDatosRectificadas=(comision, datoscrudos,dis)=>{
    
    
    if(dis ===0){
        const result = datoscrudos.find(e => +e.comision===+comision && e.origen==='R' && e.tipo_acta==='R' && e.resultado==='A')
        if(result){
        return result.count
        }else{
            return 0
        }
    }else if(dis===1){
        const result = datoscrudos.find(e => +e.comision===+comision && e.origen==='R' && e.tipo_acta==='R' && e.resultado==='R')
        if(result){
        return result.count
        }else{
            return 0
        }
    }else if(dis===2){
        const result = datoscrudos.find(e => +e.comision===+comision && e.origen==='R' && e.tipo_acta==='R' && e.resultado==='U')
        if(result){
        return result.count
        }else{
            return 0
        }
    }
}
*/
//traerdatos

const traerDatoPerfomance = (comision, datoscrudos, dis) => {
  //console.log(comision)
  //console.log(datoscrudos)

  //console.log(result)
  if (dis === 0) {
    //const result = datoscrudos.find(e => +e.comision===+comision && e.origen==='R' && e.tipo_acta==='N' && e.resultado==='A')
    //const result = datoscrudos.find(e => +e.comision===+comision && e.origen==='R' && e.resultado==='A')
    let datofilter = []
    datofilter = datoscrudos.filter(e => e.comision === +comision && e.origen === 'R' && e.tipo_acta === 'N' && e.resultado === "A") // Filtrar filas con "A"
    //console.log(datofilter)
    if (datofilter.length > 0) {
      let result = datofilter.reduce((sum, e) => sum + parseInt(e.count), 0); // Sumar los valores
      return result
    } else { return 0 }

  } else if (dis === 1) {
    //const result = datoscrudos.find(e => +e.comision===+comision && e.origen==='R' && e.tipo_acta==='N' && e.resultado==='R')
    let datofilter = []
    datofilter = datoscrudos.filter(e => +e.comision === +comision && e.origen === 'R' && e.tipo_acta === 'N' && e.resultado === 'R')
    //console.log(datofilter)
    if (datofilter.length > 0) {
      let result = datofilter.reduce((sum, e) => sum + parseInt(e.count), 0); // Sumar los valores
      return result
    } else { return 0 }

  } else if (dis === 2) {
    //const result = datoscrudos.find(e => +e.comision===+comision && e.origen==='R' && e.tipo_acta==='N' && e.resultado==='U')
    let datofilter = []
    datofilter = datoscrudos.filter(e => +e.comision === +comision && e.origen === 'R' && e.tipo_acta === 'N' && e.resultado === 'U')
    //console.log(datofilter)
    if (datofilter.length > 0) {
      let result = datofilter.reduce((sum, e) => sum + parseInt(e.count), 0); // Sumar los valores
      return result
    } else {
      return 0
    }
  } else if (dis === 3) {
    //const result = datoscrudos.find(e => +e.comision===+comision && e.origen==='P' && e.tipo_acta==='N' && e.resultado==='A')
    let datofilter = []
    datofilter = datoscrudos.filter(e => +e.comision === +comision && e.origen === 'P' && e.tipo_acta === 'N' && e.resultado === 'A')
    //console.log(datofilter)
    if (datofilter.length > 0) {
      let result = datofilter.reduce((sum, e) => sum + parseInt(e.count), 0); // Sumar los valores
      return result
    } else {
      return 0
    }
  }

}
//traer codigo materia de la comision
const traerCodMat = async (comision) => {
  //console.log(comision)
  try {
    let sqlqry = `select se.codigo from negocio.sga_comisiones sc
        inner join negocio.sga_elementos se on se.elemento =sc.elemento 
        where sc.comision=${comision}
        `
    const resu = await coneccionDB.query(sqlqry)
    return resu.rows[0].codigo
  } catch (error) {
    console.log(error)
  }

}

//traer numero rectificadas por comision




//convertir datos crudos en por comisiones

export const convertirDatosNew = async (ncomisiones, datoscrudos, anio) => {
  const agrupado = {};

  for (const item of datoscrudos) {
    const key = `${item.comision}_${item.nombre}_${item.periodo}_${item.propuesta}`;

    if (!agrupado[key]) {
      agrupado[key] = {
        comision: item.comision,
        nombre: item.nombre,
        codmat: '',
        periodo: item.periodo,
        propuesta: item.propuesta,
        promocionado: 0,
        regular: 0,
        reprobado: 0,
        ausente: 0,
        total: 0,
        porccentajeR: 0.0,
        porccentajeP: 0.0,
        examenuno: 0,
        porcentaje1E: 0.0,
        examendos: 0,
        porcentaje2E: 0.0
      };
    }

    const count = parseInt(item.count, 10);
    const { origen, resultado } = item;

    if (origen === 'P' && resultado === 'A') agrupado[key].promocionado += count;
    else if (origen === 'R' && resultado === 'A') agrupado[key].regular += count;
    else if (origen === 'R' && resultado === 'R') agrupado[key].reprobado += count;
    else if (origen === 'R' && resultado === 'U') agrupado[key].ausente += count;
  }

  const resultadoFinal = Object.values(agrupado).map((item) => {
    const base = item.regular + item.reprobado + item.ausente;
    return {
      ...item,
      total: base,
      porccentajeR: base > 0 ? parseFloat((item.regular / base).toFixed(2)) : 0.0,
      porccentajeP: base > 0 ? parseFloat((item.promocionado / base).toFixed(2)) : 0.0,
    };
  });

  // Traer codmat en paralelo
  await Promise.all(
    resultadoFinal.map(async (item) => {
      item.codmat = await traerCodMat(item.comision);
    })
  );

  return resultadoFinal;
};


//examenes comisiones
export const traerExamenAprobadosComision = async (anio, propuesta, comision, codmat, ciclo) => {
  try {
    const fechas = await traerFechaInicioIndices(comision);
    //console.log(fechas);
    if (!fechas) return 0;
    let baseSql = '';
    if (ciclo === 2) {
      baseSql = `
        SELECT COUNT(*) AS count
        FROM negocio.vw_hist_academica vwh
        WHERE vwh.alumno IN (
          SELECT DISTINCT sic.alumno
          FROM negocio.sga_insc_cursada sic
          INNER JOIN negocio.sga_alumnos sa ON sa.alumno = sic.alumno
          INNER JOIN negocio.sga_comisiones sc ON sc.comision = sic.comision
          INNER JOIN negocio.sga_periodos_lectivos spl ON spl.periodo_lectivo = sc.periodo_lectivo
          INNER JOIN negocio.sga_periodos sp ON sp.periodo = spl.periodo
          WHERE sp.anio_academico = $1 AND sc.comision = $2 AND propuesta = $3
        )
        AND fecha > $4 AND fecha <= $5
        AND actividad_codigo = $6 AND origen = 'E' AND resultado = 'A'
      `;
    } else {
      baseSql = `
        SELECT fecha, turno_examen_nombre, COUNT(turno_examen_nombre) AS count
        FROM negocio.vw_hist_academica vwh
        WHERE vwh.alumno IN (
          SELECT DISTINCT sic.alumno
          FROM negocio.sga_insc_cursada sic
          INNER JOIN negocio.sga_alumnos sa ON sa.alumno = sic.alumno
          INNER JOIN negocio.sga_comisiones sc ON sc.comision = sic.comision
          INNER JOIN negocio.sga_periodos_lectivos spl ON spl.periodo_lectivo = sc.periodo_lectivo
          INNER JOIN negocio.sga_periodos sp ON sp.periodo = spl.periodo
          WHERE sp.anio_academico = $1 AND sc.comision = $2 AND propuesta = $3
        )
        AND fecha > $4 AND fecha <= $5
        AND actividad_codigo = $6 AND origen = 'E' AND resultado = 'A'
        group by fecha, turno_examen_nombre order by fecha
      `;
    }

    const resu = await coneccionDB.query(baseSql, [
      anio,
      comision,
      propuesta,
      fechas.fechaI,
      fechas.fechaF,
      codmat,
    ]);

    return resu.rows[0]?.count || 0;
  } catch (error) {
    console.error(error);
    return 0;
  }
};






//detalle de actas regular, promocion por comision(nombre de la comision)
//la madre de las funciones de resultados de actividad
export const resultadoActaDetallesporComisiones = async (req, res) => {
  const { anio, ncomisiones, codsede, recursado, propuesta = '0' } = req.params;
  let codigosede = 'TRUE';

  const conrecu = recursado === 'N'
    ? `AND NOT UPPER(sc.nombre) LIKE('%RECUR%')`
    : recursado === 'R'
      ? `AND UPPER(sc.nombre) LIKE('%RECUR%')`
      : '';
  if(codsede == 'M0'){
    codigosede = " (sc.nombre like 'M0%' or sc.nombre like 'M5%')"
  }else if(codsede == 'S0'){
    codigosede = " (sc.nombre like 'S0%' or sc.nombre like 'S5%')"
  }else if(codsede == 'GA'){
    codigosede = " sc.nombre like 'GA%'"
  }else if(codsede == 'SM'){
    codigosede = " sc.nombre like 'SM%'"
  }
//${conrecu}
  const sqlstr = `
      SELECT sc.comision, sc.nombre, sp.nombre AS periodo, sa.origen, sa.tipo_acta,
             sa2.propuesta, resultado, COUNT(resultado)
      FROM negocio.sga_actas_detalle sad
      INNER JOIN negocio.sga_alumnos sa2 ON sa2.alumno = sad.alumno
      INNER JOIN negocio.sga_actas sa ON sa.id_acta = sad.id_acta
      INNER JOIN negocio.sga_comisiones sc ON sc.comision = sa.comision
      INNER JOIN negocio.sga_periodos_lectivos spl ON spl.periodo_lectivo = sc.periodo_lectivo
      INNER JOIN negocio.sga_periodos sp ON sp.periodo = spl.periodo
      WHERE sa.tipo_acta = 'N' AND sa.estado = 'C'
        AND sp.anio_academico = $1
        AND sa.origen IN ('P', 'R')
        AND sc.comision IN (${ncomisiones})
        AND ${codigosede}
        
      GROUP BY sc.comision, sc.nombre, sp.nombre, sa.origen, sa.tipo_acta, sa2.propuesta, sad.resultado
    `;
  try {
    const result = await coneccionDB.query(sqlstr, [anio]);
    let datos = await convertirDatosNew(ncomisiones, result.rows, anio);


    // Enriquecer con datos de examen (optimizado)
    await Promise.all(
      datos.map(async (element) => {
        const { comision, propuesta, codmat, total } = element;

        const [e1, e2] = await Promise.all([
          traerExamenAprobadosComision(anio, propuesta, comision, codmat, 1),
          traerExamenAprobadosComision(anio, propuesta, comision, codmat, 2),
        ]);

        element.examenuno = e1 || 0;
        element.examendos = e2 || 0;
        element.porcentaje1E = total ? e1 / total : 0;
        element.porcentaje2E = total ? e2 / total : 0;
      })
    );

    const filtrado = propuesta !== '0'
      ? datos.filter((d) => d.propuesta === parseInt(propuesta))
      : datos;

    res.send(filtrado);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error al procesar la solicitud' });
  }
};




//traer propuesta
export const traerPropuesta = async (codmat) => {

  const sqlstr = `select distinct propuesta from negocio.sga_planes pln
    inner join negocio.sga_planes_versiones pvs on pvs.plan = pln.plan
    inner join negocio.sga_elementos_plan sep on sep.plan_version = pvs.plan_version
    inner join negocio.sga_elementos_revision erv on erv.elemento_revision = sep.elemento_revision 
    inner join negocio.sga_elementos ele on ele.elemento = erv.elemento
    where ele.codigo = $1 and pln.propuesta <> 4 and pvs.estado ='V'`

  try {
    const resu = await coneccionDB.query(sqlstr, [codmat])
    // console.log(resu.rows)
    return resu.rows[0].propuesta
  } catch (error) {
    return 0
  }


}





////////




//comparativa de inscripciones
//

export const getComparativasInscripcion = async (req, res) => {

  const { anio, sede } = req.params

  //console.log(anio,sede)
  try {
    let datosCompara = []



    const traerdato = async (anioc, actividad) => {

      return await traerCantidadporActividad(anioc, sede, actividad)
    }

    const traerdatoR = async (anioc, sede, actividad) => {

      return await traerRechazadosBajaActividad(anioc, sede, actividad)
    }

    const result = await traerInscriptosSedeAnio(anio, sede)
    //console.log(result)

    result.forEach(async dato => {

      let datofila = { ubi: 1, materia: '', total: 0, total1: 0, total2: 0, total3: 0, total4: 0, totaR: 0, totaR1: 0, totaR2: 0, totaR3: 0, totaR4: 0 }


      //inscriptos anios anteriores
      let dresu1 = await traerdato(anio - 1, dato.nombre)
      let dresu2 = await traerdato(anio - 2, dato.nombre)
      let dresu3 = await traerdato(anio - 3, dato.nombre)
      let dresu4 = await traerdato(anio - 4, dato.nombre)


      //rechazados
      let dresur1 = await traerdatoR(anio - 1, sede, dato.nombre)
      let dresur2 = await traerdatoR(anio - 2, sede, dato.nombre)
      let dresur3 = await traerdatoR(anio - 3, sede, dato.nombre)
      let dresur4 = await traerdatoR(anio - 4, sede, dato.nombre)


      if (dresu1.length === 1) {
        datofila.total1 = dresu1[0].tot
      }
      if (dresu2.length === 1) {
        datofila.total2 = dresu2[0].tot
      }
      if (dresu3.length === 1) {
        datofila.total3 = dresu3[0].tot
      }
      if (dresu4.length === 1) {
        datofila.total4 = dresu4[0].tot
      }



      if (dresur1) {
        datofila.totaR1 = dresur1
      }
      if (dresur2) {
        datofila.totaR2 = dresur2
      }
      if (dresur3) {
        datofila.totaR3 = dresur3
      }
      if (dresur4) {
        datofila.totaR4 = dresur4
      }


      datofila.ubi = dato.ubicacion
      datofila.materia = dato.nombre
      datofila.total = dato.tot
      datofila.totaR = await traerRechazadosBajaActividad(anio, sede, dato.nombre)
      //console.log(datofila)
      //enviarDatos(datofila) 


      datosCompara.push(datofila)
    }

    )


    setTimeout(() => res.send(datosCompara), 1000)



  } catch (error) {
    console.log(error)
  }



}
//consulta de datos historicos
/*
export const traerDatosHistoricosResultados = async (req, res) => {

  const { sede, propuesta, periodo, actividad, anioI, anioF } = req.params
  //console.log(actividad,sede,anioI,anioF)

  let sql = ''
  if (actividad === 'Todas') {

    sql = `select * from fce_per.dash_actividad_resultados where anio_academico>=${anioI} and anio_academico<=${anioF} and sede='${sede}' order by actividad_nombre`
  } else {


    sql = `select * from fce_per.dash_actividad_resultados where anio_academico>=${anioI} and anio_academico<=${anioF} and sede='${sede}' 
        and actividad_nombre='${actividad}' order by anio_academico`
  }
  //console.log(sql)
  try {

    const resu = await coneccionDB.query(sql)
    //console.log(resu.rows)
    res.send(resu.rows)

  } catch (error) {
    console.log(error)
  }
}
*/
export const traerDatosHistoricosResultados = async (req, res) => {
  const { sede, propuesta, periodo, actividad, anioI, anioF } = req.params;

  try {
    // 1. Base de la consulta con los campos obligatorios (Rango de años)
    let sql = `SELECT * FROM fce_per.dash_actividad_resultados WHERE anio_academico >= $1 AND anio_academico <= $2`;

    // El array de valores comienza con los años
    const values = [anioI, anioF];
    let paramCount = 3;

    // 2. Filtro dinámico: Sede
    if (sede !== 'Todas' && sede !== '0') {
      sql += ` AND sede = $${paramCount}`;
      values.push(sede);
      paramCount++;
    }

    // 3. Filtro dinámico: Propuesta
    if (propuesta !== 'Todas' && propuesta !== '0') {
      sql += ` AND propuesta = $${paramCount}`;
      values.push(propuesta);
      paramCount++;
    }

    // 4. Filtro dinámico: Periodo
    if (periodo !== 'Todos' && periodo !== 'Todas') {
      sql += ` AND periodo = $${paramCount}`;
      values.push(periodo);
      paramCount++;
    }

    // 5. Filtro dinámico: Actividad
    if (actividad !== 'Todas') {
      sql += ` AND actividad_nombre = $${paramCount}`;
      values.push(actividad);
      paramCount++;
    }

    // 6. Orden dinámico
    // Si busca una actividad específica, ordenamos por año; si son todas, por nombre.
    if (actividad !== 'Todas') {
      sql += ` ORDER BY anio_academico ASC`;
    } else {
      sql += ` ORDER BY actividad_nombre ASC`;
    }

    const resu = await coneccionDB.query(sql, values);
    res.json(resu.rows);

  } catch (error) {
    console.error("Error en traerDatosHistoricosResultados:", error);
    res.status(500).send("Error en el servidor");
  }
};


//actividades historicas

// controller/actividadesController.js

export const traerActividadesHistoricas = async (req, res) => {
  const { sede, propuesta, periodo, anioI } = req.params;

  try {
    // 1. La base de la consulta (anioI siempre obligatorio)
    let query = `SELECT * FROM fce_per.dash_actividad_resultados WHERE anio_academico = $1`;
    const values = [anioI];
    let paramCount = 2;

    // 2. Condicional para Sede (si es 0 o "Todas", se ignora)
    if (sede !== '0' && sede !== 'Todas') {
      query += ` AND sede = $${paramCount}`;
      values.push(sede);
      paramCount++;
    }

    // 3. Condicional para Propuesta (si es 0 o "Todas", se ignora)
    if (propuesta !== '0' && propuesta !== 'Todas') {
      query += ` AND propuesta = $${paramCount}`;
      values.push(propuesta);
      paramCount++;
    }

    // 4. Condicional para Periodo (si es "Todos" o "Todas", se ignora)
    if (periodo !== 'Todos' && periodo !== 'Todas') {
      query += ` AND periodo = $${paramCount}`;
      values.push(periodo);
      paramCount++;
    }

    // Ejecutar la consulta (ejemplo con pool de pg)
    const result = await coneccionDB.query(query, values);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error en getActividadesHistoricas:", error);
    res.status(500).json({ error: "Error al obtener datos históricos" });
  }
};

/*
export const traerActividadesHistoricas=async (req,res)=>{
    const {sede, anioI}= req.params
    
    try {
        let sqlStr = `SELECT distinct actividad_nombre FROM fce_per.dash_actividad_resultados WHERE sede='${sede}' AND anio_academico=${anioI} order by actividad_nombre`    
        
        
        const resu = await coneccionDB.query(sqlStr)
        res.send(resu.rows)

    } catch (error) {
        
        console.log(error)
    }
}
*/

//periodos genericos de cursada

export const traerPeriodosgenCursadas = async (req, res) => {

  try {
    let sqlstr = "SELECT periodo_generico, nombre FROM  negocio.sga_periodos_genericos WHERE periodo_generico_tipo=1 and activo='S'"
    const result = await coneccionDB.query(sqlstr)
    res.send(result.rows)

  } catch (error) {
    console.log(error)
  }
}

//traer comisiones por periodo generico y año


export const traerComisionesporPeriodo = async (req, res) => {
  const { periodo } = req.params;

  try {
    // 1. Determinar el año automáticamente
    const hoy = new Date();
    const mes = hoy.getMonth() + 1; // getMonth() devuelve 0-11
    const anioActual = hoy.getFullYear();
    let anio;

    if (mes >= 4 && mes <= 12) {
      anio = anioActual;
    } else if (mes >= 1 && mes <= 3) {
      anio = anioActual - 1;
    }

    // 2. Construir la cláusula WHERE dinámicamente
    let sqlstr = `
        SELECT DISTINCT 
          sp.nombre as periodo, 
          sc.comision,
          se.codigo as codmat,
          sc.nombre as cominame,
          sel.nombre as matname 
        FROM negocio.sga_comisiones sc
        INNER JOIN negocio.sga_elementos se ON se.elemento = sc.elemento
        INNER JOIN negocio.sga_periodos_lectivos spl ON spl.periodo_lectivo = sc.periodo_lectivo 
        INNER JOIN negocio.sga_periodos sp ON sp.periodo = spl.periodo
        INNER JOIN negocio.sga_periodos_genericos spgt ON spgt.periodo_generico = sp.periodo_generico
        INNER JOIN negocio.sga_elementos sel ON sel.codigo=se.codigo
        WHERE sp.anio_academico = $1 AND NOT sc.nombre like 'V%'
      `;

    const params = [anio];
    if (parseInt(periodo, 10) !== 0) {
      sqlstr += ` AND spgt.periodo_generico = $2`;
      params.push(periodo);
    }

    sqlstr += ` ORDER BY sel.nombre`;

    // 3. Ejecutar la consulta
    const result = await coneccionDB.query(sqlstr, params);
    res.send(result.rows);
  } catch (error) {
    console.error('Error en traerComisionesporPeriodo:', error);
    res.status(500).send('Error interno del servidor');
  }
};


// listado de cursada por comision
//viejo script
/*
export const traerListadoCursadaComision_old = async (req, res) => {
  const { comision, anio, sede, actividad } = req.params;
  console.log(comision)
  let sedeN = 0
  if (sede === 'MZA') {
    sedeN = 1
  }
  else if (sede === 'SRF') {
    sedeN = 2
  }
  else if (sede === 'ESTE') {
    sedeN = 4
  }
  //console.log(comision,anio,sede,actividad)
  if (!comision) {
    return res.status(400).send({ error: "El parámetro 'comision' es obligatorio." });
  }

  try {
    const sqlstr = `
        SELECT 
          ROW_NUMBER() OVER (ORDER BY apellido, nombres) AS nro_orden,
          sic.alumno as alumno,
          legajo,
          ai.nro_documento,
          apellido, 
          nombres, 
          propuesta, 
          plan, 
          anio_ingreso_pro, 
          aniocursada, 
          aprobadas, 
          promedioca, 
          completado, 
          coef_tcarrera,
          perdidasreg,
          ultimaperdireg
        FROM negocio.sga_insc_cursada sic
        INNER JOIN fce_per.alumnos_info ai ON ai.alumno = sic.alumno
        WHERE comision = $1
        ORDER BY apellido, nombres
      `;
    //
    const result = await coneccionDB.query(sqlstr, [comision]);

    if (result.rows.length === 0) {
      return res.status(204).send({ message: "No se encontraron inscriptos para la comisión especificada." });
    }
    
    //console.log(result.rows)

    const alumnos = result.rows.map(f => f.alumno);
    const [recursaMap, examenesMap, regularidadMap] = await Promise.all([
      recursada(alumnos, anio, sedeN, actividad),
      cantidadExamenReprobados(alumnos, actividad),
      regularidadVigentes(alumnos, actividad)
    ]);

    const datosCompletos = result.rows.map(fila => ({
      ...fila,
      recursa: recursaMap[fila.alumno] || 0,
      cantidadexamen: examenesMap[fila.alumno] || 0,
      regvigente: regularidadMap[fila.alumno] || 'N'
    }));
    

    res.send(datosCompletos);

  } catch (error) {
    console.error("Error al obtener el listado de cursada:", error);
    res.status(500).send({ error: "Error interno del servidor." });
  }
};
*/
//
export const traerListadoCursadaComision = async (req, res) => {
  const { comision, anio, sede, actividad } = req.params;
  
  let sedeN = 0;
  if (sede === 'MZA') sedeN = 1;
  else if (sede === 'SRF') sedeN = 2;
  else if (sede === 'ESTE') sedeN = 4;

  if (!comision) {
      return res.status(400).send({ error: "El parámetro 'comision' es obligatorio." });
  }

  try {
      const sqlstr = `
          SELECT 
              ROW_NUMBER() OVER (ORDER BY per.apellido, per.nombres) AS nro_orden,
              sic.alumno AS alumno,
              alu.legajo,
              mpd.nro_documento,
              per.apellido, 
              per.nombres, 
              alu.propuesta, 
              pver.plan, 
              -- Campos de alumnos_info (pueden venir nulos)
              ai.anio_ingreso_pro, 
              ai.aniocursada, 
              COALESCE(ai.aprobadas, 0) as aprobadas, 
              COALESCE(ai.promedioca, 0) as promedioca, 
              ai.completado, 
              ai.coef_tcarrera,
              ai.perdidasreg,
              ai.ultimaperdireg
          FROM negocio.sga_insc_cursada sic
          INNER JOIN negocio.sga_alumnos alu ON alu.alumno = sic.alumno
          INNER JOIN negocio.mdp_personas per ON per.persona = alu.persona
          INNER JOIN negocio.mdp_personas_documentos mpd ON mpd.documento = per.documento_principal
          INNER JOIN negocio.sga_planes_versiones pver ON pver.plan_version = alu.plan_version
          LEFT JOIN fce_per.alumnos_info ai ON ai.alumno = sic.alumno
          WHERE sic.comision = $1
          ORDER BY per.apellido, per.nombres
      `;

      const result = await coneccionDB.query(sqlstr, [comision]);

      if (result.rows.length === 0) {
          return res.status(204).send({ message: "No se encontraron inscriptos." });
      }

      const alumnos = result.rows.map(f => f.alumno);
      
      // Ejecutamos las promesas secundarias
      const [recursaMap, examenesMap, regularidadMap] = await Promise.all([
          recursada(alumnos, anio, sedeN, actividad),
          cantidadExamenReprobados(alumnos, actividad),
          regularidadVigentes(alumnos, actividad)
      ]);

      const datosCompletos = result.rows.map(fila => ({
          ...fila,
          // Si el alumno no está en alumnos_info, estos campos ya vienen como null o 0 desde SQL
          recursa: recursaMap[fila.alumno] || 0,
          cantidadexamen: examenesMap[fila.alumno] || 0,
          regvigente: regularidadMap[fila.alumno] || 'N'
      }));

      res.send(datosCompletos);

  } catch (error) {
      console.error("Error al obtener el listado de cursada:", error);
      res.status(500).send({ error: "Error interno del servidor." });
  }
};
//
///traer datos comparativo inscripcion sede, anio, actividad
export const getComparativasInscripcionActividad = async (req, res) => {
  const { anio, sede, actividad, pgenerico } = req.params;

  //console.log(anio, sede, actividad, pgenerico)

  // Convertimos sede a número si es necesario
  let seden = '';
  if (sede === 'MZA') seden = '1';
  else if (sede === 'SRF') seden = '2';
  else if (sede === 'ESTE') seden = '4';

  try {
    const anioBase = parseInt(anio);
    // Incluye el año actual y 7 anteriores => total 8 años
    const anios = Array.from({ length: 7 }, (_, i) => anioBase - i);

    // Consultas en paralelo Ella vamos a hacer
    const inscripcionesPromises = anios.map(a =>
      traerCantidadporActividad(a, seden, actividad, pgenerico)
    );

    const rechazosPromises = anios.map(a =>
      traerRechazadosBajaActividad(a, seden, actividad, pgenerico)
    );

    const inscripciones = await Promise.all(inscripcionesPromises);
    const rechazos = await Promise.all(rechazosPromises);

    // Armado de arrays con datos ordenados por año descendente
    const aceptados = anios.map((a, i) => parseInt(inscripciones[i][0]?.tot || 0));
    const rechazados = anios.map((a, i) => rechazos[i] || 0);
    const totales = aceptados.map((val, i) => val + rechazados[i]);



    res.send({
      anios,
      totales,
      aceptados,
      rechazados
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};



// evaluaciones docentes 

// controllers/docentesController.js



export const getEvaluacionesPorFiltro = async (req, res) => {
  const { sede, anio, materia } = req.params;

  if (!sede || !anio || !materia) {
    return res.status(400).json({ error: 'Faltan parámetros: sede, año o materia' });
  }

  const comisionLike = `${sede}%`;           // Ej: 'M%'
  const actividadLike = `${materia} (%`;     // Ej: 'ESTADISTICA I (%'

  const query = `
    SELECT d.id, d.legajo, d.nombre, d.comision, d.cursaste_no,
           d.cursaste_si, d.calificacion, d.anio, d.periodo, d.actividad
    FROM fce_per.docentes_eval d
    WHERE d.comision LIKE $1
      AND d.anio = $2
      AND d.actividad LIKE $3
      AND d.calificacion > 0.0
  `;

  try {
    const result = await coneccionDB.query(query, [comisionLike, anio, actividadLike]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// evalucion por id docente
// controllers/evaluacionesController.js



export const getEvaluacionPorDocente = async (req, res) => {
  const { iddocente } = req.params;

  if (!iddocente || isNaN(iddocente)) {
    return res.status(400).json({ error: 'ID de docente inválido o no proporcionado' });
  }

  const query = `
    SELECT e.docente_id, e.pregunta, e.bueno, e.malo, e.regular,
           e.muybueno, e.excelente, e.ns, e.calif, e.calif_gral, e.total
    FROM fce_per.evaluaciones e
    WHERE e.docente_id = $1
  `;

  try {
    const result = await coneccionDB.query(query, [iddocente]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener evaluaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};



// Obtener inscripciones de un alumno
export const getInscripcionesCursadasComisionByAlumno = async (req, res) => {
  const { anioacademico, alumno } = req.params;

  const sql = `
    SELECT 
      sic.inscripcion,
      sic.alumno,
      sic.comision,
      sc.elemento,
      se.codigo,
      se.nombre,
      sc.periodo_lectivo,
      sc.turno,
      spl.periodo,
      sp.periodo_generico,
      sp.nombre AS nombre_periodo,
      sp.anio_academico,
      sic.estado
    FROM negocio.sga_insc_cursada sic
    INNER JOIN negocio.sga_comisiones sc 
      ON sc.comision = sic.comision
    INNER JOIN negocio.sga_periodos_lectivos spl 
      ON spl.periodo_lectivo = sc.periodo_lectivo
    INNER JOIN negocio.sga_periodos sp 
      ON sp.periodo = spl.periodo
    INNER JOIN negocio.sga_elementos se 
      ON se.elemento = sc.elemento
    WHERE sp.anio_academico=$1 AND sic.alumno = $2 and sic.estado in ('P', 'A') AND periodo_generico=13
  `;

  try {
    const { rows } = await coneccionDB.query(sql, [anioacademico, alumno]);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener inscripciones:', error);
    res.status(500).json({ error: 'Error al obtener las inscripciones' });
  }
};


///subcomisiones

export const getSubcomisionesByComision = async (req, res) => {
  const { comision } = req.params;

  const sql = `
      SELECT 
        subcomision, 
        nombre,
        cupo
      FROM negocio.sga_subcomisiones
      WHERE comision = $1
    `;

  try {
    const { rows } = await coneccionDB.query(sql, [comision]);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener subcomisiones:', error);
    res.status(500).json({ error: 'Error al obtener subcomisiones' });
  }
};

export const insertInscripcionSubcomision = async (req, res) => {

  const { inscripcion, subcomision } = req.body;
  if (!inscripcion || !subcomision) {
    return res.status(400).json({ error: 'Faltan datos: inscripcion o subcomision' });
  }
  const sql = `
      INSERT INTO fce_per.sga_insc_subcomision (inscripcion, subcomision)
      VALUES ($1, $2)
      RETURNING *
    `;
  try {
    const { rows } = await coneccionDB.query(sql, [inscripcion, subcomision]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al insertar inscripción en subcomisión:', error);
    res.status(500).json({ error: 'Error al insertar inscripción en subcomisión' });
  }

}


//
export const UpdateInscripcionSubcomision = async (req, res) => {

  const { inscripcion, subcomision } = req.body;
  if (!inscripcion || !subcomision) {
    return res.status(400).json({ error: 'Faltan datos: inscripcion o subcomision' });
  }
  const sql = `
      UPDATE fce_per.sga_insc_subcomision  SET subcomision= $2, inscripcion_fecha = NOW()  WHERE inscripcion = $1
      RETURNING *
    `;
  try {
    const { rows } = await coneccionDB.query(sql, [inscripcion, subcomision]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al Modificar inscripción en subcomisión:', error);
    res.status(500).json({ error: 'Error al Modificar inscripción en subcomisión' });
  }

}

//listado alumnos subcomisiones
export const getListadoAlumnosSubcomisiones = async (req, res) => {
  const { subcomision } = req.params;

  const sql = `
    select isc.inscripcion,ss.comision,sc.nombre as ncomi , isc.subcomision, ss.nombre as nsubcomi ,isc.inscripcion_fecha, sic.alumno, mp.apellido,mp.nombres   from fce_per.sga_insc_subcomision isc
inner join negocio.sga_subcomisiones ss on ss.subcomision = isc.subcomision 
inner join negocio.sga_comisiones sc on sc.comision=ss.comision 
inner join negocio.sga_insc_cursada sic on sic.inscripcion =isc.inscripcion 
inner join negocio.sga_alumnos sa on sa.alumno = sic.alumno 
inner join negocio.mdp_personas mp on mp.persona=sa.persona
    where isc.subcomision =$1
    `;

  try {
    const result = await coneccionDB.query(sql, [subcomision]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener el listado de subcomisiones:', error);
    res.status(500).json({ error: 'Error al obtener el listado de subcomisiones' });
  }
};


//listado de subcomisiones alumnos
export const getListadoSubcomisionesAlumno = async (req, res) => {
  const { alumno } = req.params;

  const sql = `
       select isc.inscripcion,ss.comision,sc.nombre,ss.nombre , isc.subcomision, isc.inscripcion_fecha, ss.nombre, sic.alumno  from fce_per.sga_insc_subcomision isc
      inner join negocio.sga_subcomisiones ss on ss.subcomision = isc.subcomision 
      inner join negocio.sga_comisiones sc on sc.comision=ss.comision 
      inner join negocio.sga_insc_cursada sic on sic.inscripcion =isc.inscripcion 
      inner join negocio.sga_alumnos sa on sa.alumno = sic.alumno 
     
      where sic.alumno =$1
      `;

  try {
    const result = await coneccionDB.query(sql, [alumno]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener el listado de subcomisiones:', error);
    res.status(500).json({ error: 'Error al obtener el listado de subcomisiones' });
  }
};