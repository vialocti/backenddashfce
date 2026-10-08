import {
    UpdateInscripcionSubcomision,
    getActividadCantiInscriptos,
    getActividadCantiInscriptosC,
    getActividadCantiInscriptosPorSede,
    getActividadComisionCantiInscriptos,
    getComisionesAnio,
    getComisionesAnioMateria,
    getComisionesCantiInscriptos,
    getComisionesCantiInscriptosPlan,
    getComisionesSedePL,
    getComparativasInscripcion,
    getComparativasInscripcionActividad,
    getEvaluacionPorDocente,
    getEvaluacionesPorFiltro,
    getInscripcionesCursadasComisionByAlumno,
    getInscriptosAlumnos_unicos,
    getInscriptosPropuestaAñoSede,
    getInscriptosSedeAnio,
    getListComisionesAnio,
    getListMateriasComision,
    getListadoAlumnosSubcomisiones,
    getListadoSubcomisionesAlumno,
    getPeriodosLectivosAnio,
    getPropuestaVersionactual,
    getSubcomisionesByComision,
    insertInscripcionSubcomision,
    resultadoActaDetallesporComision,
    resultadoActaDetallesporComisiones,
    resultadoActaDetallesporPeriodo,
    traerActividadesHistoricas,
    traerComisionesporPeriodo,
    traerDatosHistoricosResultados,
    traerListadoCursadaComision,
    traerPeriodosgenCursadas
} from '../controllers/cursadasControllers.js'

import { Router } from 'express'

const router = Router()
router.get('/subcomisiones/:comision', getSubcomisionesByComision)
router.get('/inscripcionesalumno/:anioacademico/:alumno', getInscripcionesCursadasComisionByAlumno)
router.post('/inscripcionesalumno', insertInscripcionSubcomision)
router.put('/inscripcionesalumno', UpdateInscripcionSubcomision)
router.get('/listadosubcomision/:subcomision', getListadoAlumnosSubcomisiones)
router.get('/inscripcionesalumnosubcomisiones/:alumno', getListadoSubcomisionesAlumno)


router.get('/periodoslectivos/:anio', getPeriodosLectivosAnio)//periodos lectivos
router.get('/listcomisionesanio/:anio', getListComisionesAnio)//listado comisiones
router.get('/comisionesanio/:anio', getComisionesAnio)//cantidad de comisiones por sede
router.get('/comisionesperlect/:anio', getComisionesSedePL) //cantidad de comisiones por sede periodo
router.get('/comisionesnumero/:anio/:nmateria', getComisionesAnioMateria)
router.get('/materiascomision/:anio/:sede/:periodo', getListMateriasComision) //materias de un año y sede

router.get('/cantiInsccomisiones/:anio', getComisionesCantiInscriptos)
router.get('/cantiinscriptosComiplan/:anio', getComisionesCantiInscriptosPlan)
router.get('/cantiInscActividad/:anio/:sede', getActividadCantiInscriptos)
router.get('/cantiInscActividadComi/:anio', getActividadCantiInscriptosC)
router.get('/cantiInscActividadComi/:anio/:sede/:actividad', getActividadComisionCantiInscriptos)
router.get('/detalleactasCur/:anio/:origen/:periodo', resultadoActaDetallesporPeriodo)
router.get('/detalleporcomision/:anio/:ncomision', resultadoActaDetallesporComision)
router.get('/detalleporcomisiones/:anio/:ncomisiones/:codsede/:recursado/:propuesta', resultadoActaDetallesporComisiones)

router.get('/actividadeshistoricos/:sede/:propuesta/:periodo/:anioI', traerActividadesHistoricas)

router.get('/historicoIndice/:sede/:propuesta/:periodo/:actividad/:anioI/:anioF', traerDatosHistoricosResultados)


router.get('/comparativas/:anio/:sede', getComparativasInscripcion)
router.get('/comparativaActividad/:anio/:sede/:actividad/:pgenerico', getComparativasInscripcionActividad)

//

router.get('/propuestaversionact/:propuesta', getPropuestaVersionactual)
router.get('/inscriptospropuestasede/:anio/:sede/:versionact', getInscriptosPropuestaAñoSede)

router.get('/traerinscriptostotsede/:anio', getActividadCantiInscriptosPorSede)
router.get('/alumnosinscriptos/:anio', getInscriptosSedeAnio)
router.get('/alumnosinscriptos-unicos/:anio', getInscriptosAlumnos_unicos)

router.get('/periodosgenericos', traerPeriodosgenCursadas)
router.get('/comisionesperiodo/:periodo', traerComisionesporPeriodo)
router.get('/listadoalumnoscomision/:comision/:anio/:sede/:actividad', traerListadoCursadaComision)


router.get('/evaluacionAct/:sede/:anio/:materia', getEvaluacionesPorFiltro)
router.get('/evaluacionDoc/:iddocente', getEvaluacionPorDocente)
export default router

