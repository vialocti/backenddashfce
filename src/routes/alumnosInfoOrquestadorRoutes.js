import { Router } from 'express'
import { verificarClaveOrquestador } from '../middlewares/orquestadorKey.js'
import {
  iniciarJob,
  planSinEjecutar,
  obtenerJob,
  listarJobs,
} from '../services/alumnosInfo/alumnosInfoOrquestador.service.js'

const router = Router()

router.use(verificarClaveOrquestador)

// Body: { modo: 'INICIAL' | 'ACTUALIZACION', anio?, epoca?, dryRun? }
router.post('/', (req, res) => {
  const { modo, anio, epoca, dryRun } = req.body || {}
  try {
    if (dryRun) return res.json(planSinEjecutar({ modo, anio, epoca }))
    const job = iniciarJob({ modo, anio, epoca })
    res.status(202).json({ jobId: job.id, estado: job.estado, modo: job.modo, anio: job.anio, epoca: job.epoca })
  } catch (error) {
    if (error.codigo === 'EN_CURSO') {
      return res.status(409).json({ error: error.message, jobId: error.jobId })
    }
    res.status(400).json({ error: error.message })
  }
})

router.get('/', (req, res) => res.json(listarJobs()))

router.get('/:jobId', (req, res) => {
  const job = obtenerJob(req.params.jobId)
  if (!job) return res.status(404).json({ error: 'jobId inexistente' })
  res.json(job)
})

export default router
