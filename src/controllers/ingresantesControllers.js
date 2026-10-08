import coneccionDB from "../database.js";

//total ingresantes por tipo ingreso
const countIngresantesTI = async (anio) => {

    let sqry = `select tipo_ingreso, count(tipo_ingreso) as canti  from negocio.sga_propuestas_aspira spa
inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
where anio_academico =${anio} and spa.propuesta in (1,2,3,6,7,8) and situacion_asp in (1,2) and not sa.legajo is null
and not tipo_ingreso is null group by tipo_ingreso`

    try {
        const resu = coneccionDB.query(sqry)
        return resu
    } catch (error) {
        console.log(error)
    }
}

//total ingreso por año

const countIngresantes = async (anio) => {

    try {

        let sqry = `select tipo_ingreso, count(tipo_ingreso) as canti  from negocio.sga_propuestas_aspira spa
        inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
        where anio_academico =${anio} and spa.propuesta in (1,2,3,6,7,8) and not tipo_ingreso is null and situacion_asp in (1,2) and not sa.legajo is null 
         group by tipo_ingreso`

        let resultado = await coneccionDB.query(sqry)
        return resultado.rows

    } catch (error) {
        console.log(error)
    }
}



//insgresos total anio
export const getIngresantesTotal = async (req, res) => {
    const { anio } = req.params
    try {

        const resu = await countIngresantesTI(anio)
        //console.log(resu)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }
}

//ingresos entra años
export const getIngresosTanios = async (req, res) => {
    const { anioi, aniof } = req.params
    let aniototal = []

    try {

        for (let i = Number(anioi); i < Number(aniof) + 1; i++) {

            let totalI = await countIngresantes(i)

            let objti = { anio: i, total: totalI }

            aniototal.push(objti)

        }
        res.send(aniototal)
    } catch (error) {
        console.log(error)
    }

}




//total por anio ubicacion
export const getIngresantesAnioUbi = async (req, res) => {

    const { anio } = req.params

    let sqlstr = `select CASE sa.ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede, tipo_ingreso, count(spa.tipo_ingreso) as canti  from negocio.sga_propuestas_aspira spa
    inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
    where anio_academico =${anio} and spa.propuesta in (1,2,3,6,7,8) and situacion_asp in (1,2) and not tipo_ingreso is null  and not sa.legajo is null 
    group by sa.ubicacion,tipo_ingreso`

    try {
        const resu = await coneccionDB.query(sqlstr)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }

}

//sede propuesta con tipo Ingreso y sexo
export const getIngresantesAnioSedePropuestaTIsexo = async (req, res) => {

    const { anio } = req.params
    let sqlstr = `select  CASE sa.propuesta WHEN 1 THEN 'CPN' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' WHEN 8 THEN 'CP' END as carrera
    ,CASE sa.ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede,spa.tipo_ingreso ,sexo ,count(sa.propuesta) as canti  from negocio.sga_propuestas_aspira spa 
   inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
   inner join negocio.mdp_personas mp on mp.persona=spa.persona
   where anio_academico =${anio} and spa.propuesta in (1,2,3,6,7,8) and situacion_asp in (1,2) and not sa.legajo is null 
   group by sede,carrera,sexo,tipo_ingreso`




    try {
        const resu = await coneccionDB.query(sqlstr)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }


}


//sede propuesta sin TI 
export const getIngresantesAnioSedePropuesta = async (req, res) => {

    const { anio } = req.params
    let sqlstr = `select CASE sa.propuesta WHEN 8 THEN 'CP' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' END as carrera,
     CASE sa.ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede, count(sa.propuesta) as canti  from negocio.sga_propuestas_aspira spa 
    inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
    where anio_academico =${anio} and spa.propuesta in (1,2,3,6,7,8) and situacion_asp in (1,2) and not sa.legajo is null 
    group by sa.ubicacion,sa.propuesta`




    try {
        const resu = await coneccionDB.query(sqlstr)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }


}


//ingresantes sede propuesta carrera anio tipoi=1 o 6
export const getIngresantesAnioSedePropTing = async (req, res) => {

    const { sede, carrera, anio, tipoI } = req.params
    let sqlstr = `select count(sa.alumno) as canti  from negocio.sga_propuestas_aspira spa 
    inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
    where  sa.ubicacion=${sede} and anio_academico =${anio} and spa.propuesta= ${carrera}
    and spa.tipo_ingreso=${tipoI} and situacion_asp in (1,2) and not sa.legajo is null `
    // console.warn(sqlstr)
    try {
        const resu = await coneccionDB.query(sqlstr)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }


}


export const getIngresantesAnioUtils =async (req,res)=>{
    
    const sqlstr=`select spa.propuesta, count(*) as total
            FROM negocio.sga_propuestas_aspira spa
            INNER JOIN negocio.sga_alumnos sa ON sa.persona = spa.persona AND sa.propuesta = spa.propuesta
            WHERE anio_academico = $1
              AND sa.ubicacion in (1,2,4)
              AND spa.tipo_ingreso in (1,3)
              AND situacion_asp IN (1, 2)
              AND sa.legajo IS NOT null
              and sa.propuesta in (2,3,7,8)
             group by spa.propuesta
`
}





//listado de ingresantes anio matriculados y provisarios

export const getListIngresantesAnio = async (req,res)=>{
    
    const {anio, estado}=req.params
    let sqlstr=''
    
    
    if (estado==='M'){

        sqlstr=`select legajo,mp.apellido , mp.nombres, alumno,spa.propuesta, spa.ubicacion,tipo_ingreso from negocio.sga_propuestas_aspira spa
            inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
            inner join negocio.mdp_personas mp on mp.persona=spa.persona
            where anio_academico =${anio} and spa.propuesta in (2,3,6,7,8) and situacion_asp in (1,2) 
            and not tipo_ingreso is null and not sa.legajo is null`
    }else{
        
        sqlstr=`select legajo,mp.apellido , mp.nombres, alumno,spa.propuesta, spa.ubicacion,tipo_ingreso from negocio.sga_propuestas_aspira spa
        inner join negocio.sga_alumnos sa on sa.persona=spa.persona and sa.propuesta=spa.propuesta 
        inner join negocio.mdp_personas mp on mp.persona=spa.persona
        where anio_academico =${anio} and spa.propuesta in (2,3,6,7,8) and situacion_asp in (1,2) 
        and not tipo_ingreso is null and sa.legajo is null`
    }


    try {
        const resu = await coneccionDB.query(sqlstr)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }




}