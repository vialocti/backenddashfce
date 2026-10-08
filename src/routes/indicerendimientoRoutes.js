import { Router } from 'express'
import { procesarGrupoController, consultarRendimientoController } from '../controllers/indicerendimientoControllers.js'

const router = Router()

// POST /indices-rendimiento/procesar  { sedeId?, anioIngreso?, propuestaId?, fechaAnalisis? }
router.post('/procesar', procesarGrupoController)

// GET /indices-rendimiento?sedeId=&anioIngreso=&propuestaId=&legajo=&clasificacion=&historico=&limit=&offset=
router.get('/', consultarRendimientoController)

export default router