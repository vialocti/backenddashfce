import { getActasExamenTotalResu, getMesasExamen, getMesasExamenTUTI, getResultadoMesaExamen, getResultadoTurnoExamen, getResultadosPorActa, getTurnosMesaAni, traerAprobadasAnioPropuesta, traerAprobadasPorAlumnoSedePropuestaAnio, traerPeriodosTurnos, traerdatosHistoricoAprobadasporAlumno } from '../controllers/examenesControllers.js'

import {Router} from 'express'

const router = Router()
router.get('/turnosAnio/:anio/',getTurnosMesaAni)//turnos de examen
router.get('/mesasAnio/:anio/:periodo/:ubicacion',getMesasExamen) //mesas por periodo
router.get('/resultadosmesa/:llamado_mesa',getResultadoMesaExamen)//una mesa en particular
router.get('/resultadoturno/:llamados',getResultadoTurnoExamen) // total de un turno de examen

router.get('/mesasAnioARU/:anio',getActasExamenTotalResu)
router.get('/datosActa/:idacta',getResultadosPorActa)
router.get('/mataprobaluanio/:anio/:sede/:propuesta/:tipoO', traerAprobadasPorAlumnoSedePropuestaAnio)
router.get('/aproactividadPsede/:anio/:sede/:propuesta/', traerAprobadasAnioPropuesta)
router.get('/histaprobadaluanio/:sede/:propuesta/:anioi/:aniof', traerdatosHistoricoAprobadasporAlumno)

router.get('/examentuti/:anio/:periodo/:ubicacion', getMesasExamenTUTI) //trae todas las mesas con datos y que tengan inscriptos

router.get('/examenesepocas/:anio', traerPeriodosTurnos)

export default router;