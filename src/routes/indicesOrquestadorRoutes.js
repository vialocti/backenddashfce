import { Router } from 'express'
import { verificarClaveOrquestador } from '../middlewares/orquestadorKey.js'
import {
  iniciarJob,
  planSinEjecutar,
  obtenerJob,
  listarJobs,
} from '../services/indices/indicesOrquestador.service.js'

const router = Router()

router.use(verificarClaveOrquestador)

// Body: { anio?, dryRun? }  (anio = ciclo lectivo en curso, por defecto el año actual)
router.post('/', (req, res) => {
  const { anio, dryRun } = req.body || {}
  try {
    if (dryRun) return res.json(planSinEjecutar({ anio }))
    const job = iniciarJob({ anio })
    res.status(202).json({ jobId: job.id, estado: job.estado, anio: job.anio, anioAnterior: job.anioAnterior })
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
