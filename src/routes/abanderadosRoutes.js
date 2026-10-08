import { Router } from 'express'
import { buscarCandidatosAbanderados } from '../controllers/abanderadosControllers.js'

const router = Router()

// POST /abanderados/candidatos  { grupos: [{ propuestas, anioIngreso, aniosCursada }], promedioMin?, tipoPromedio?, ingreso?, sedes? }
router.post('/candidatos', buscarCandidatosAbanderados)

export default router
