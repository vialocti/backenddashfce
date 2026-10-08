import coneccionDB from "../database.js";

//discriminado por tipo ingreso
const countInscriptosPorTI = async (anio) => {

    try {
        let sqlqy = `SELECT tipo_ingreso,count(tipo_ingreso)as toti  FROM negocio.sga_propuestas_aspira where anio_academico=${anio} and propuesta in (1,2,3,6,7,8)
        group by tipo_ingreso `
        let resultado = await coneccionDB.query(sqlqy)
        return resultado

    } catch (error) {
        console.log(error)
    }
}


const countInscriptos = async (anio) => {

    try {
        let sqlqy = ` SELECT tipo_ingreso, count(tipo_ingreso) as canti FROM negocio.sga_propuestas_aspira 
        where anio_academico=${anio} and propuesta in (1,2,3,6,7,8) and not tipo_ingreso is null group by tipo_ingreso 
      `
        let resultado = await coneccionDB.query(sqlqy)

        return resultado.rows

    } catch (error) {
        console.log(error)
    }
}



//inscriptos total anio
export const getInscriptosTotal = async (req, res) => {
    const { anio } = req.params
    try {
        const resu = await countInscriptos(anio)
        
        res.send(resu)
    } catch (error) {
        console.log(error)
    }
}



// total inscriptos entre años
export const getInscriptosTanios = async (req, res) => {
    const { anioi, aniof } = req.params
    let aniototal = []
    try {

        for (let i = Number(anioi); i < Number(aniof) + 1; i++) {

            let totalI = await countInscriptos(i)
            let objti = { anio: i, total: totalI }

            aniototal.push(objti)

        }
        res.send(aniototal)
    } catch (error) {
        console.log(error)
    }

}

//total inscriptos por sede anio

export const getInscriptosSedeAnio = async (req, res) => {
    const { anio } = req.params
    let anioE = anio
    //console.log(anio)
    if (parseInt(anio) === 1) {
        anioE = new Date().getFullYear()
        let fecha = new Date()
        if (fecha < new Date(`${anioE}-04-01`)) {
            anioE = anioE
        } else {
            anioE = anioE + 1
        }
    }

    const strq = `SELECT CASE ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede ,
        count(*)  FROM negocio.sga_propuestas_aspira where anio_academico=${anioE} and propuesta in (1,2,3,6,7,8) Group by ubicacion order by ubicacion`
    try {
        const resu = await coneccionDB.query(strq)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }
}
//total inscriptos por peridos de inscripcion

export const getInscriptosPeriodos = async (req, res) => {

    const { anio } = req.params
    let anioE = anio
    //console.log(anio)
    if (parseInt(anio) === 1) {
        anioE = new Date().getFullYear()
        let fecha = new Date()
        if (fecha < new Date(`${anioE}-04-01`)) {
            anioE = anioE
        } else {
            anioE = anioE + 1
        }
    }

    const strq = `select spa.periodo_insc, to_char(pif.fecha_inicio,'dd-mm-yyyy') as fechai, to_char(pif.fecha_fin,'dd-mm-yyyy')as fechaf , count(spa.periodo_insc)  as canti  from negocio.sga_propuestas_aspira spa  
    inner join negocio.sga_periodos_inscripcion_fechas pif on pif.periodo_insc=spa.periodo_insc
    where anio_academico =${anioE}
    group by spa.periodo_insc,pif.fecha_inicio,pif.fecha_fin order by pif.fecha_inicio`
    try {
        const resu = await coneccionDB.query(strq)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }
}


// total por año carrera sede
export const getInscriptosPorPropuestaSede = async (req, res) => {
    const { anio, sede, propuesta } = req.params

    const strq = `SELECT COUNT(*)as nro FROM negocio.sga_propuestas_aspira where anio_academico=${anio} AND ubicacion=${sede} AND propuesta=${propuesta}`
    try {
        const resu = await coneccionDB.query(strq)
        res.send(resu.rows[0])
    } catch (error) {
        console.log(error)
    }
}

//total propuesta por año sede y carrera agrupados discrimina tipo ingreso

export const getInscriptosTotalSedeTI = async (req, res) => {
    const { anio } = req.params
    try {
        const resu = await coneccionDB.query(`SELECT CASE ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede ,
    CASE propuesta WHEN 1 THEN 'CPN' WHEN 8 THEN 'CP' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' END as carrera
    ,tipo_ingreso ,COUNT(*) as nro FROM negocio.sga_propuestas_aspira where anio_academico=${anio} and propuesta in (1,2,3,6,7,8) Group by ubicacion,propuesta,tipo_ingreso order by ubicacion,propuesta`)
        res.send(resu.rows)

    } catch (error) {
        console.log(error)
    }
}

//solo sede carrera
export const getInscriptosTotalSede = async (req, res) => {
    const { anio } = req.params

    const resu = await coneccionDB.query(`SELECT CASE ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede ,
    CASE propuesta WHEN 1 THEN 'CPN' WHEN 8 THEN 'CP' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' END as carrera
     ,COUNT(*) as nro FROM negocio.sga_propuestas_aspira where anio_academico=${anio} and propuesta in (1,2,3,6,7,8) Group by ubicacion,propuesta order by ubicacion,propuesta`)
    res.send(resu.rows)
}

//sede,carrera,sexo,tipoi

export const getInscriptosSedeCarreraTipoSexo = async (req, res) => {
    const { anio } = req.params

    const strqry = `SELECT CASE ubicacion WHEN 1 THEN 'MZA' WHEN 2 THEN 'SRF' WHEN 3 THEN 'GALV' WHEN 4 THEN 'ESTE' END as sede ,
     CASE propuesta WHEN 1 THEN 'CPN' WHEN 8 THEN 'CP' WHEN 2 THEN 'LA' WHEN 3 THEN 'LE' WHEN 6 THEN 'LNRG' WHEN 7 THEN 'LLO' END as carrera
     ,mp.sexo,tipo_ingreso ,COUNT(*) as canti FROM negocio.sga_propuestas_aspira spa
     inner join negocio.mdp_personas mp on mp.persona=spa.persona
     where anio_academico=${anio} and propuesta in (1,2,3,6,7,8)
     Group by ubicacion,propuesta,sexo,tipo_ingreso order by ubicacion,propuesta`

    try {
        const resu = await coneccionDB.query(strqry)
        //console.warn(resu)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }

}


// total por sede, sexo, tipo inscripcion
export const getIscriptosTipoIngresoSedeSexo = async (req, res) => {
    const { anio, sede, tipoI, sexo } = req.params

    let tipoIngreso = ''
    if (tipoI === '1') {
        tipoIngreso = 'tipo_ingreso in (1,3)'
    } else {
        tipoIngreso = 'tipo_ingreso in (4,6)'
    }

    let cabeza = 'SELECT COUNT(*) as tot FROM negocio.sga_propuestas_aspira as pas '
    let injoin = 'INNER JOIN negocio.mdp_personas as per on per.persona=pas.persona '
    let condi = `WHERE anio_academico=${anio} AND ubicacion=${sede} AND ${tipoIngreso} AND per.sexo='${sexo}'`
    let strquery = `${cabeza}${injoin}${condi}`
    //console.log(strquery)
    try {

        const resu = await coneccionDB.query(strquery)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }

}

// total por sede, sexo, tipo inscripcion
export const getIscriptosTipoIngresoSedeSexoCarrera = async (req, res) => {
    const { anio, sede, tipoI, sexo, carrera } = req.params

    let tipoIngreso = ''
    if (tipoI === '1') {
        tipoIngreso = 'tipo_ingreso in (1,3)'
    } else {
        tipoIngreso = 'tipo_ingreso in (4,6)'
    }

    let cabeza = 'SELECT COUNT(*) as tot FROM negocio.sga_propuestas_aspira as pas '
    let injoin = 'INNER JOIN negocio.mdp_personas as per on per.persona=pas.persona '
    let condi = `WHERE anio_academico=${anio} AND ubicacion=${sede} AND ${tipoIngreso} AND per.sexo='${sexo}' and propuesta=${carrera}`
    let strquery = `${cabeza}${injoin}${condi}`
    //console.log(strquery)
    try {

        const resu = await coneccionDB.query(strquery)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }

}


const traerMinFechaI = async (anio_a) => {

    let sqlstr = `SELECT MIN(fecha_inscripcion) FROM negocio.sga_propuestas_aspira spa 
    WHERE anio_academico=${anio_a}`
    try {
        const resu = await coneccionDB.query(sqlstr)
        return resu
    } catch (error) {
        console.log(error)
    }

}

export const traerInscriptosPorPeriodos = async (req, res) => {


    const { anioI, anioF, dias } = req.params



    let f_Inicio = traerMinFechaI(anioI)

    let f_Fin = ''
    let sqlstr = ''

    try {
        const resu = await coneccionDB.query(sqlstr)
    } catch (error) {
        console.log(error)
    }
} 