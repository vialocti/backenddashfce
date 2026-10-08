import { MAX_PARAMETROS, MAX_PREGUNTA, MAX_SQL } from '../services/consultasIA/config.js'
import { reejecutar, responderPregunta } from '../services/consultasIA/consultasIA.service.js'

// POST /datosanalisis/consultas-ia  { pregunta, historial?: [{ pregunta, sql }] }
export const consultarIA = async (req, res) => {
  const { pregunta, historial } = req.body || {}

  if (typeof pregunta !== 'string' || !pregunta.trim()) {
    return res.status(400).json({ error: 'Falta la pregunta.' })
  }
  if (pregunta.length > MAX_PREGUNTA) {
    return res.status(400).json({ error: `La pregunta no puede superar los ${MAX_PREGUNTA} caracteres.` })
  }

  // Solo los ultimos intercambios, para poder repreguntar ("ahora por sede")
  const previos = (Array.isArray(historial) ? historial : [])
    .filter((h) => typeof h?.pregunta === 'string' && typeof h?.sql === 'string')
    .slice(-4)
    .map((h) => ({ pregunta: h.pregunta.slice(0, MAX_PREGUNTA), sql: h.sql.slice(0, MAX_SQL) }))

  try {
    res.json(await responderPregunta(pregunta.trim(), previos))
  } catch (error) {
    console.error('consultarIA:', error)
    res.status(500).json({ error: 'No se pudo procesar la consulta.' })
  }
}

// POST /datosanalisis/consultas-ia/ejecutar  { firma, parametros: [valor, ...] }
export const reejecutarConsultaIA = async (req, res) => {
  const { firma, parametros } = req.body || {}

  if (typeof firma !== 'string' || !Array.isArray(parametros) || parametros.length > MAX_PARAMETROS) {
    return res.status(400).json({ error: 'Pedido incompleto.' })
  }

  try {
    res.json(await reejecutar(firma, parametros))
  } catch (error) {
    console.error('reejecutarConsultaIA:', error)
    res.status(500).json({ error: 'No se pudo ejecutar la consulta.' })
  }
}
