import { Router } from 'express'
import { procesarGrupoController, consultarRendimientoController, historiaAcademicaController, regularidadesController } from '../controllers/indicerendimientoControllers.js'

const router = Router()

// POST /indices-rendimiento/procesar  { sedeId?, anioIngreso?, propuestaId?, fechaAnalisis? }
router.post('/procesar', procesarGrupoController)

// GET /indices-rendimiento?sedeId=&anioIngreso=&propuestaId=&legajo=&clasificacion=&persona=&historico=&limit=&offset=
router.get('/', consultarRendimientoController)

// GET /indices-rendimiento/historia-academica?legajo=&propuestaId=&hasta=
router.get('/historia-academica', historiaAcademicaController)

// GET /indices-rendimiento/regularidades?legajo=&propuestaId=&hasta=
router.get('/regularidades', regularidadesController)

export default router