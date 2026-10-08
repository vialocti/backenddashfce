import { randomUUID } from 'crypto'

/**
 * Invoca un controller Express sin HTTP y convierte su respuesta en resultado o excepcion.
 * opciones.toleraSinDatos: un 404 se devuelve como { sinDatos: true } en vez de fallar.
 * opciones.validar(body): puede lanzar si el body indica error dentro de un 200.
 */
export async function invocar(controlador, params = {}, opciones = {}) {
  const captura = { status: 200, body: undefined, respondido: false }
  const res = {
    status(codigo) { captura.status = codigo; return res },
    json(body) { captura.body = body; captura.respondido = true; return res },
    send(body) { captura.body = body; captura.respondido = true; return res },
  }

  await controlador({ params, query: {}, body: {} }, res)

  if (!captura.respondido) {
    throw new Error('El proceso termino sin responder (fallo interno, ver log del servidor)')
  }
  const { status, body } = captura
  if (status === 404 && opciones.toleraSinDatos) return { sinDatos: true, detalle: body }

  const conError = body && typeof body === 'object' && (body.error || body.status === 'error')
  if (status >= 400 || conError) {
    throw new Error(typeof body === 'string' ? body : JSON.stringify(body))
  }
  if (body === undefined) {
    throw new Error('El proceso devolvio una respuesta vacia (fallo interno, ver log del servidor)')
  }
  if (opciones.validar) opciones.validar(body)
  return body
}

/**
 * Registro de jobs en memoria con un unico job activo a la vez.
 * Cada paso es { nombre, ejecutar: async () => resultado }.
 */
export function crearRunner({ maxJobs = 20, etiqueta = 'orquestador' } = {}) {
  const jobs = new Map()
  let activoId = null

  async function ejecutar(job, pasos) {
    for (const paso of job.pasos) {
      const definicion = pasos.find((p) => p.nombre === paso.nombre)
      paso.estado = 'en_curso'
      paso.inicio = new Date().toISOString()
      const t0 = Date.now()
      try {
        const resultado = await definicion.ejecutar()
        paso.estado = resultado && resultado.sinDatos ? 'sin_datos' : 'ok'
        paso.resultado = resultado
      } catch (error) {
        paso.estado = 'error'
        paso.error = error.message
        console.error(`[${etiqueta} ${job.id}] paso ${paso.nombre} fallo:`, error)
      }
      paso.ms = Date.now() - t0
      if (paso.estado === 'error') {
        job.estado = 'error'
        job.pasos.filter((p) => p.estado === 'pendiente').forEach((p) => { p.estado = 'omitido' })
        break
      }
    }
    if (job.estado === 'en_curso') job.estado = 'ok'
    job.fin = new Date().toISOString()
    activoId = null
  }

  function iniciar(meta, pasos) {
    if (activoId) {
      const error = new Error('Ya hay un proceso en curso')
      error.jobId = activoId
      error.codigo = 'EN_CURSO'
      throw error
    }
    const job = {
      id: randomUUID(),
      ...meta,
      estado: 'en_curso',
      inicio: new Date().toISOString(),
      fin: null,
      pasos: pasos.map((p) => ({ nombre: p.nombre, estado: 'pendiente' })),
    }
    jobs.set(job.id, job)
    activoId = job.id
    if (jobs.size > maxJobs) jobs.delete(jobs.keys().next().value)

    setImmediate(() => {
      ejecutar(job, pasos).catch((error) => {
        job.estado = 'error'
        job.error = error.message
        job.fin = new Date().toISOString()
        activoId = null
      })
    })
    return job
  }

  return {
    iniciar,
    obtener: (id) => jobs.get(id),
    listar: () => [...jobs.values()].reverse(),
  }
}
