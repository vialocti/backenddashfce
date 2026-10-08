import { getInscriptosPeriodos, getInscriptosPorPropuestaSede, getInscriptosSedeAnio, getInscriptosSedeCarreraTipoSexo, getInscriptosTanios, getInscriptosTotal, getInscriptosTotalSede, getIscriptosTipoIngresoSedeSexo, getIscriptosTipoIngresoSedeSexoCarrera } from '../controllers/inscriptosControllers.js'

import { Router } from 'express'

const router = Router()

router.get('/inscrTotalIngreso/:anio', getInscriptosTotal)
router.get('/inscriptosperiodo/:anio', getInscriptosPeriodos)
router.get('/inscriptTanios/:anioi/:aniof', getInscriptosTanios)
router.get('/inscriptosSedeanio/:anio', getInscriptosSedeAnio)
router.get('/inscrPorPropuesta/:anio/:sede/:propuesta', getInscriptosPorPropuestaSede)
router.get('/inscriptosSedeProTiSexoanio/:anio', getInscriptosSedeCarreraTipoSexo)
router.get('/totalsedepropuesta/:anio', getInscriptosTotalSede)
router.get('/totalsedetisexo/:anio/:sede/:tipoI/:sexo', getIscriptosTipoIngresoSedeSexo)
router.get('/totalsedetisexocarrera/:anio/:sede/:tipoI/:sexo/:carrera', getIscriptosTipoIngresoSedeSexoCarrera)

export default router