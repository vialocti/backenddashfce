import coneccionDB from '../../database.js'
//const coneccionDB = require('../../database.js');


export const traerInscriptosSedeAnio = async (anio, sede) => {

    


    let sqlstr = `select sc.ubicacion,se.nombre, count(sic.comision) as tot from negocio.sga_insc_cursada sic 
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico =${anio} and sc.ubicacion=${sede} and not sc.nombre like'V%'
    
    group by sc.ubicacion, se.nombre
    order by se.nombre  

`

    try {


        const resu = await coneccionDB.query(sqlstr)
        // console.log(resu.rowCount)
        return resu.rows
    } catch (error) {
        console.log(error)
    }

}


// traer examenes rendidos con R viejo por alumno
export const cantidadExamenReprobado= async (alumno, actividad)=>{

   
   let sqlstr=`select count(*) as rendidas from negocio.vw_hist_academica vha 
            where alumno = ${alumno} and actividad_nombre = '${actividad}'
           and origen ='E' and resultado ='R'`

    try {
        const result = await coneccionDB.query(sqlstr)
        return result.rows[0].rendidas
    } catch (error) {
        console.log(error)
    }

}

// traer regularidad vigencia o no 
  export const regularidadVigente=async(alumno, actividad)=>{

    let sqlstr = `select count(*) as vigencia from negocio.vw_regularidades vr
        where alumno = ${alumno} and actividad_nombre = '${actividad}' 
        and origen = 'R' and es_vigente = 1 and resultado = 'A' `

    try {
        const result = await coneccionDB.query(sqlstr)
        if(result.rows[0].vigencia==='0'){
            return 'N'
        }else{
            return 'S'
        }
        
    } catch (error) {
        console.log(error)
    }

  }
//

///traer recursados por actividad individual

export const recursa = async(alumno,anio,sede,actividad) => {
    
    let sqlstr = `select count(alumno) as tot from negocio.sga_insc_cursada sic 
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico < ${anio} and sc.ubicacion=${sede} and se.nombre='${actividad}' and  not sc.nombre like'V%' and alumno=${alumno}
    `
    try {
        
        const resu = await coneccionDB.query(sqlstr)
        // console.log(resu.rowCount)
        return resu.rows[0].tot
    } catch (error) {
        console.log(error)
    }
}

///traer comisiones rechazos

const traerComisionesActividadRechazo = async (anioc, sede, actividad, pgenerico) => {
    
    let sinopg=''
    if(pgenerico===0){sinopg=''}else{sinopg=`and sp.periodo_generico=${pgenerico}`}
 
    let sqlstr = ` select distinct sic.comision  from negocio.sga_insc_cursada sic
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico =${anioc} and sc.ubicacion=${sede} and se.nombre='${actividad}'  
    and  not sc.nombre like'V%' ${sinopg} `

    try {
        const resultado = await coneccionDB.query(sqlstr)

        // Asegurarse que se obtuvo algo
    if (!resultado || !Array.isArray(resultado.rows)) {
        return '';
      }
  
      // Extraer los valores de comision y unirlos en un string con comillas
      const comisionesStr = resultado.rows
        .map(row => `'${row.comision}'`)
        .join(',');
  
      return comisionesStr;

    } catch (error) {
        console.log(error)
    }   
    }

//traer cantidad de alumnos por actividad aceptadas en pgenerico
export const traerCantidadporActividad = async (anioc,sede,actividad,pgenerico=0)  =>{

    let sinopg=''
    if(pgenerico===0){sinopg=''}else{sinopg=`and spgt.periodo_generico=${pgenerico}`}

    let sqlstr = `select count (distinct sic.alumno) as tot from negocio.sga_insc_cursada sic 
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico =${anioc} and sc.ubicacion=${sede} and se.nombre='${actividad}' 
    and  not sc.nombre like'V% ${sinopg}'   

`

    try {


        const resu = await coneccionDB.query(sqlstr)
        //console.log(resu.rows)
        return resu.rows
    } catch (error) {
        console.log(error)
    }

}

//traer cantidad de alumnos por actividad rechazados en pgenerico(comisiones)
export const traerRechazadosBajaActividad = async (anio,sede,actividad,pgenerico=0)=>{
    
   //console.log(anio,sede,actividad,pgenerico)

    let comisionesStr = await traerComisionesActividadRechazo(anio,sede,actividad,pgenerico)
    //console.log(comisionesStr)
    
    let sqlstr=`select distinct alumno from negocio.sga_insc_cursada_log sic 
    inner join negocio.sga_comisiones sc on sc.comision=sic.comision
    inner join negocio.sga_elementos se on se.elemento = sc.elemento 
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo =sc.periodo_lectivo
    inner join negocio.sga_periodos sp on sp.periodo =spl.periodo
    inner join negocio.sga_periodos_genericos spgt on spgt.periodo_generico  = sp.periodo_generico 
    where sp.anio_academico =${anio} and sc.ubicacion=${sede} and se.nombre='${actividad}' and sic.comision in (${comisionesStr}) 
    and  not sc.nombre like'V%' and sic.operacion in ('B','R')  group by alumno`


    try {
    //    console.log(sqlstr)
        if (comisionesStr.length === 0) { return 0; } // Si no hay comisiones, retornar 0      
        const resu = await coneccionDB.query(sqlstr)
        //console.log(resu.rowCount)
        return resu.rowCount
    } catch (error) {
        console.log(error)
    }


}   



export const enviarDatos=(datosCompara) =>{
 
    //console.log(datosCompara)

}





//////tratamientos de examens comisiones de cursado


//paso one
const buscarIncriptos = async (comision)=>{


    let sqlstr =`select alumno from negocio.sga_insc_cursada sic where comision =${comision}`
    try {


        const resu = await coneccionDB.query(sqlstr)
        // console.log(resu.rowCount)
        return resu.rows
    } catch (error) {
        console.log(error)
    }


}
//paso one I


const traerDatosComision = async (comision)=>{


    let sqlstr =`select sc.comision, sc.nombre,sc.elemento, sc.periodo_lectivo, spl.fecha_inicio_dictado, spl.fecha_fin_dictado from negocio.sga_comisiones sc
    inner join negocio.sga_periodos_lectivos spl on spl.periodo_lectivo = sc.periodo_lectivo where comision =${comision}`
    try {


        const resu = await coneccionDB.query(sqlstr)
        //console.log(resu.rows)
        return resu.rows
    } catch (error) {
        console.log(error)
    }


}



//rutiina de inicio de proceso
export const tratarExamenes =(datos)=>{
    
    datos.forEach(async element => {
        let alumnosInc =[]
        let datoComision=null
    
        datoComision= await traerDatosComision(element.comision)
        //console.log(datoComision)    
        alumnosInc = await  buscarIncriptos(element.comision)        
       // console.log(alumnosInc)       
        setTimeout(()=>console.log('-------------------'),200)
    });
}


//consilta por lote

export const regularidadVigentes = async (alumnos, actividad) => {

 const resu = await coneccionDB.query('set search_path to negocio')
  const sqlstr = `
    SELECT 
      alumno, 
      COUNT(*) FILTER (
        WHERE 
          origen = 'R' AND 
          es_vigente = 1 AND 
          resultado = 'A'
      ) AS vigencia
    FROM negocio.vw_regularidades
    WHERE 
      alumno = ANY($1::int[]) AND 
      actividad_nombre = $2
    GROUP BY alumno
  `;

  try {
    const result = await coneccionDB.query(sqlstr, [alumnos, actividad]);
    // Retornamos un mapa: alumno -> 'S' o 'N'
    const map = Object.fromEntries(result.rows.map(r => [r.alumno, parseInt(r.vigencia) > 0 ? 'S' : 'N']));
    return map;
  } catch (error) {
    console.log(error);
    return {};
  }
};


export const cantidadExamenReprobados = async (alumnos, actividad) => {
  const sqlstr = `
    SELECT 
      alumno, 
      COUNT(*) AS rendidas
    FROM negocio.vw_hist_academica vha 
    WHERE 
      alumno = ANY($1::int[]) AND 
      actividad_nombre = $2 AND 
      origen = 'E' AND 
      resultado = 'R'
    GROUP BY alumno
  `;

  try {
    const result = await coneccionDB.query(sqlstr, [alumnos, actividad]);
    // Retornamos un mapa alumno -> cantidad
    return Object.fromEntries(result.rows.map(r => [r.alumno, parseInt(r.rendidas)]));
  } catch (error) {
    console.log(error);
    return {};
  }
};


export const recursada = async (alumnos, anio, sede, actividad) => {
  const sqlstr = `
    SELECT 
      sic.alumno,
      COUNT(*) FILTER (
        WHERE 
          sp.anio_academico < $2
          AND sc.ubicacion = $3
          AND se.nombre = $4
          AND sic.estado = 'A'
          AND NOT sc.nombre LIKE 'V%'
      ) AS tot
    FROM negocio.sga_insc_cursada sic
    INNER JOIN negocio.sga_comisiones sc ON sc.comision = sic.comision
    INNER JOIN negocio.sga_elementos se ON se.elemento = sc.elemento 
    INNER JOIN negocio.sga_periodos_lectivos spl ON spl.periodo_lectivo = sc.periodo_lectivo
    INNER JOIN negocio.sga_periodos sp ON sp.periodo = spl.periodo
    INNER JOIN negocio.sga_periodos_genericos spgt ON spgt.periodo_generico = sp.periodo_generico
    WHERE sic.alumno = ANY($1::int[])
    GROUP BY sic.alumno
  `;

  try {
    const resu = await coneccionDB.query(sqlstr, [alumnos, anio, sede, actividad]);
    return Object.fromEntries(resu.rows.map(r => [r.alumno, r.tot]));
  } catch (error) {
    console.log(error);
    return {};
  }
};
