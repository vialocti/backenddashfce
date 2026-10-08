import { timingSafeEqual } from 'crypto'

export function verificarClaveOrquestador(req, res, next) {
  const esperada = process.env.ORQUESTADOR_KEY
  if (!esperada) {
    return res.status(503).json({ error: 'ORQUESTADOR_KEY no configurada en el servidor' })
  }
  const recibida = String(req.get('x-orquestador-key') || '')
  const a = Buffer.from(recibida)
  const b = Buffer.from(esperada)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  next()
}
