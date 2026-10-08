import jwt from 'jsonwebtoken'
import openai from '../../configopenai.js'
import coneccionDB from '../../database.js'
import { GLOSARIO, MAX_FILAS, MODELO, ROL_DB, TIMEOUT_MS, VIGENCIA_FIRMA } from './config.js'
import { cargarEsquema } from './esquema.js'
import { validarSQL } from './validarSQL.js'

const INTENTOS = 2

// Respuesta que se le exige al modelo (salida estructurada)
const FORMATO_RESPUESTA = {
  type: 'json_schema',
  json_schema: {
    name: 'consulta_sql',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['tipo', 'titulo', 'explicacion', 'sql', 'parametros'],
      properties: {
        tipo: { type: 'string', enum: ['consulta', 'aclaracion', 'fuera_de_alcance'] },
        titulo: { type: 'string' },
        explicacion: { type: 'string' },
        sql: { type: 'string' },
        parametros: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['etiqueta', 'valor'],
            properties: { etiqueta: { type: 'string' }, valor: { type: 'string' } },
          },
        },
      },
    },
  },
}

const anioLectivo = () => {
  const hoy = new Date()
  return hoy.getMonth() + 1 >= 4 ? hoy.getFullYear() : hoy.getFullYear() - 1
}

const instrucciones = (esquema) => `
Sos el asistente de consultas del tablero academico de la Facultad de Ciencias Economicas.
Convertis el pedido del usuario en UNA consulta SQL de solo lectura para PostgreSQL.

Hoy es ${new Date().toISOString().slice(0, 10)}. El año lectivo en curso es ${anioLectivo()} (empieza en abril).

TABLAS DISPONIBLES (no existe ninguna otra tabla ni columna):

${esquema.descripcion}

VOCABULARIO:
${GLOSARIO}

REGLAS PARA EL SQL:
- Una sola sentencia SELECT (puede empezar con WITH). Sin punto y coma ni comentarios.
- Nombrar siempre las tablas con su schema (${esquema.schema}.tabla) y usar solo las tablas y columnas listadas.
- Nunca usar "*" para traer columnas: nombrarlas. count(*) si esta permitido.
- Poner alias claros en español a las columnas del resultado (snake_case, sin acentos).
- Mostrar sede y carrera con su sigla usando CASE, no con el codigo numerico.
- Preferir resultados resumidos (totales, promedios, agrupaciones) y ordenados. Redondear los promedios a 2 decimales.
- CONSULTAS PARAMETRIZADAS: cada valor de filtro que el usuario podria querer cambiar (año, sede, carrera,
  periodo, umbral, cantidad de filas) va como parametro $1, $2, ... en el SQL y se informa en "parametros",
  en el mismo orden, con una etiqueta corta y su valor como texto. Usar el codigo en el valor (ej. sede "1").
  Si un parametro se usa en una operacion o comparacion donde el tipo no es evidente, castearlo ($1::int, $1::numeric).
- No hay acceso a nombres, documentos ni datos de contacto de personas: si lo piden, responder "fuera_de_alcance".

RESPUESTA:
- tipo "consulta": completar titulo (corto), explicacion (una o dos frases sobre que muestra y con que criterio), sql y parametros.
- tipo "aclaracion": el pedido es ambiguo; hacer la pregunta en "explicacion" y dejar sql vacio y parametros [].
- tipo "fuera_de_alcance": no se puede responder con estas tablas; explicarlo en "explicacion", sql vacio y parametros [].
`

/**
 * Le pide al modelo la consulta. `historial` son los intercambios anteriores ({ pregunta, sql })
 * y `correccion` el motivo por el que se rechazo el intento previo, si lo hubo.
 */
async function pedirConsulta(esquema, pregunta, historial, correccion) {
  const messages = [{ role: 'system', content: instrucciones(esquema) }]
  for (const h of historial) {
    messages.push({ role: 'user', content: h.pregunta })
    messages.push({ role: 'assistant', content: `SQL generado: ${h.sql}` })
  }
  messages.push({ role: 'user', content: pregunta })
  if (correccion) {
    messages.push({ role: 'assistant', content: `SQL generado: ${correccion.sql}` })
    messages.push({
      role: 'user',
      content: `Esa consulta no se pudo usar: ${correccion.motivo}. Corregila respetando las reglas.`,
    })
  }

  const r = await openai.chat.completions.create({
    model: MODELO,
    temperature: 0,
    messages,
    response_format: FORMATO_RESPUESTA,
  })
  return JSON.parse(r.choices[0].message.content)
}

/**
 * Ejecuta una consulta ya validada. Corre en una transaccion de solo lectura, con tiempo
 * maximo, sin search_path (obliga a calificar las tablas) y con tope de filas.
 */
export async function ejecutarConsulta(sql, valores) {
  const cliente = await coneccionDB.connect()
  try {
    await cliente.query('BEGIN TRANSACTION READ ONLY')
    await cliente.query(`SET LOCAL statement_timeout = ${TIMEOUT_MS}`)
    await cliente.query('SET LOCAL search_path TO pg_catalog')
    if (/^[a-z_][a-z0-9_]*$/.test(ROL_DB)) await cliente.query(`SET LOCAL ROLE ${ROL_DB}`)

    const r = await cliente.query(`select * from (${sql}) as consulta_ia limit ${MAX_FILAS + 1}`, valores)
    return {
      columnas: r.fields.map((f) => f.name),
      filas: r.rows.slice(0, MAX_FILAS),
      truncado: r.rows.length > MAX_FILAS,
    }
  } finally {
    await cliente.query('ROLLBACK').catch(() => {})
    cliente.release()
  }
}

// La firma permite volver a ejecutar la misma consulta con otros valores sin aceptar SQL del cliente
const firmar = (sql, cantParametros) =>
  jwt.sign({ sql, n: cantParametros, uso: 'consulta-ia' }, process.env.JWT_SECRET, { expiresIn: VIGENCIA_FIRMA })

const aValores = (parametros) => parametros.map((v) => (v === '' || v == null ? null : String(v)))

/**
 * Pregunta -> SQL -> resultado. Si el SQL no pasa la validacion o falla al ejecutarse,
 * se le devuelve el motivo al modelo una vez para que lo corrija.
 */
export async function responderPregunta(pregunta, historial = []) {
  const esquema = await cargarEsquema()
  if (!esquema.tablasPermitidas.size) throw new Error('No hay tablas habilitadas para consultar.')

  let correccion = null
  for (let intento = 1; intento <= INTENTOS; intento++) {
    const r = await pedirConsulta(esquema, pregunta, historial, correccion)
    if (r.tipo !== 'consulta') return { tipo: r.tipo, mensaje: r.explicacion }

    const valores = aValores(r.parametros.map((p) => p.valor))
    const v = validarSQL(r.sql, valores.length, esquema)
    if (!v.ok) {
      correccion = { sql: r.sql, motivo: v.error }
      continue
    }

    try {
      const resultado = await ejecutarConsulta(v.sql, valores)
      return {
        tipo: 'consulta',
        titulo: r.titulo,
        explicacion: r.explicacion,
        sql: v.sql,
        parametros: r.parametros,
        firma: firmar(v.sql, valores.length),
        ...resultado,
      }
    } catch (e) {
      console.error('consultasIA: fallo al ejecutar ->', e.message, '\n', v.sql)
      correccion = { sql: r.sql, motivo: `PostgreSQL devolvio el error "${e.message}"` }
    }
  }
  return {
    tipo: 'error',
    mensaje: 'No pude armar una consulta valida para ese pedido. Probá reformularlo con otras palabras.',
  }
}

/** Vuelve a ejecutar una consulta ya generada, con nuevos valores de parametros. */
export async function reejecutar(firma, parametros) {
  let datos
  try {
    datos = jwt.verify(firma, process.env.JWT_SECRET)
  } catch {
    return { tipo: 'error', mensaje: 'La consulta vencio. Volvé a pedirla.' }
  }
  if (datos.uso !== 'consulta-ia' || !Array.isArray(parametros) || parametros.length !== datos.n) {
    return { tipo: 'error', mensaje: 'Los parametros no coinciden con la consulta.' }
  }

  const esquema = await cargarEsquema()
  const v = validarSQL(datos.sql, datos.n, esquema)
  if (!v.ok) return { tipo: 'error', mensaje: v.error }

  try {
    return { tipo: 'consulta', ...(await ejecutarConsulta(v.sql, aValores(parametros))) }
  } catch (e) {
    console.error('consultasIA: fallo al reejecutar ->', e.message)
    return { tipo: 'error', mensaje: 'No se pudo ejecutar con esos valores. Revisá que tengan el formato esperado.' }
  }
}
