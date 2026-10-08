
import {
    getIngresantesAnioSedePropTing,
    getIngresantesAnioSedePropuesta,
    getIngresantesAnioSedePropuestaTIsexo,
    getIngresantesAnioUbi,
    getIngresantesTotal,
    getIngresosTanios,
    getListIngresantesAnio
} from '../controllers/ingresantesControllers.js'

import { Router } from 'express'

const router = Router()


router.get('/ingreTotalAnio/:anio', getIngresantesTotal)
router.get('/ingreTotalTanio/:anioi/:aniof', getIngresosTanios)

router.get('/ingresantesTotalIngresoAnioUbi/:anio', getIngresantesAnioUbi)
router.get('/ingresoPorPropuestaSede/:anio', getIngresantesAnioSedePropuesta)
router.get('/ingresoPorPropuestaSedeTIsexo/:anio', getIngresantesAnioSedePropuestaTIsexo)
router.get('/ingresantesaspi/:anio/:sede/:carrera/:tipoI', getIngresantesAnioSedePropTing)
router.get('/listadoingresantes/:anio/:estado', getListIngresantesAnio)

export default router 