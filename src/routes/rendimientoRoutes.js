import { actualizarAniosCursada, actualizarPerdidaRegularidad, exportComisionesCSV, getAlumnosInfoSedePropuestaplanversion, getAnalisisAlumnos, getAprobadasAnioCursadaRendimiento, getIndices, getIndicesAlumnos, getplanesVersion, procesarIndicesTot, traerCantidadInscriptosTotalfceper, traerComisionesIndicesAnioLectivo, traerComisionesIndicesAnioLectivoI0, traerDatosHistoricosIndicesTotalPeriodo, traerIndiceTotalAnios, traerReinscripciones } from '../controllers/rendimientoControllers.js';

import { Router } from 'express'

const router = Router()

router.get('/aluinfouno/:ubicacion/:propuesta/:plan/:planversion/:anioipro', getAlumnosInfoSedePropuestaplanversion)
router.get('/aluindices', getIndicesAlumnos)
router.get('/planversion', getplanesVersion)
router.get('/reinscripciones/:anios', traerReinscripciones)
router.get('/cantidadInscripaniosede/:sede/:anio', traerCantidadInscriptosTotalfceper)
router.get('/indicestotales/:anioI/:anioF/:sede', traerDatosHistoricosIndicesTotalPeriodo) //indices por sede
router.get('/indicestotalesFac/:anioI/:anioF', traerIndiceTotalAnios) //indices totalFac

router.get('/procesoindiceT/:anio/:sede', procesarIndicesTot)


//anuario
router.get('/anuario/:anio/', exportComisionesCSV)

router.get('/anuariocursada', actualizarAniosCursada)
router.get('/anuariopereg/:aniop', actualizarPerdidaRegularidad)
router.get('/anuaricohorte/:anioI/:anioF/:sede/:propuesta', getAnalisisAlumnos)

//aniolectivoindices
router.get('/indicescl/:anio', traerComisionesIndicesAnioLectivo)
router.get('/indicescl0/:anio', traerComisionesIndicesAnioLectivoI0)

//---------
router.get('/indices', getIndices);
router.get('/aprobadasanio-rendimiento/:alumno', getAprobadasAnioCursadaRendimiento)

export default router;