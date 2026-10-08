import { MAX_PARAMETROS, MAX_SQL } from './config.js'

// Sentencias que no tienen lugar en una consulta de solo lectura
const PALABRAS_PROHIBIDAS = [
  'insert', 'update', 'delete', 'merge', 'drop', 'alter', 'truncate', 'create', 'grant', 'revoke',
  'copy', 'call', 'do', 'execute', 'prepare', 'deallocate', 'listen', 'notify', 'vacuum', 'analyze',
  'explain', 'set', 'reset', 'show', 'lock', 'into', 'begin', 'commit', 'rollback', 'savepoint',
  'declare', 'cluster', 'reindex', 'refresh', 'comment', 'load', 'discard', 'share',
]

// Catalogo del sistema y funciones que ejecutan SQL recibido como texto o salen de la base
const PATRONES_PROHIBIDOS = [
  [/\bpg_\w*/, 'catalogo o funciones del sistema (pg_*)'],
  [/\b(dblink\w*|lo_\w+|set_config|current_setting|ts_stat|crosstab\w*|xpath_table|connectby)\b/, 'funciones no permitidas'],
  [/\b\w+_to_xml\w*/, 'funciones no permitidas'],
  [/\b(version|current_database|current_user|session_user|current_schema|current_schemas|inet_\w+)\s*\(/, 'funciones no permitidas'],
  [/\b(current_user|session_user|current_role|current_catalog)\b/, 'funciones no permitidas'],
]

const palabra = (w) => new RegExp(`\\b${w}\\b`)

/**
 * Valida que el SQL generado sea una unica consulta de lectura sobre las tablas permitidas.
 * Es la primera barrera; la segunda es la transaccion de solo lectura con la que se ejecuta.
 *
 * ctx: { schema, tablasPermitidas:Set, schemas:Set, columnasOcultas:Set }
 * Devuelve { ok:true, sql } o { ok:false, error }.
 */
export function validarSQL(sqlOriginal, cantParametros, ctx) {
  const rechazo = (error) => ({ ok: false, error })

  if (typeof sqlOriginal !== 'string') return rechazo('No se genero ninguna consulta.')
  const sql = sqlOriginal.trim().replace(/;\s*$/, '').trim()
  if (!sql) return rechazo('No se genero ninguna consulta.')
  if (sql.length > MAX_SQL) return rechazo('La consulta es demasiado larga.')

  if (sql.includes(';')) return rechazo('Solo se permite una sentencia.')
  if (sql.includes('--') || sql.includes('/*')) return rechazo('No se permiten comentarios.')
  if (/\$[A-Za-z_]\w*\$|\$\$/.test(sql)) return rechazo('No se permiten cadenas con $$.')
  if (sql.includes('\\')) return rechazo('No se permiten barras invertidas.')

  // Para revisar el SQL se sacan los textos entre comillas y las comillas de identificadores
  // (de paso se detectan los prefijos E'..', U&'..', B'..', X'..', N'..')
  let conPrefijo = false
  const sinTextos = sql.replace(/(\b[A-Za-z]&?)?'(?:[^']|'')*'/g, (_, prefijo) => {
    if (prefijo) conPrefijo = true
    return "''"
  })
  if (conPrefijo) return rechazo('No se permiten cadenas con prefijo.')
  if (sinTextos.replace(/''/g, '').includes("'")) return rechazo('Comillas sin cerrar.')
  if ((sinTextos.match(/"/g) || []).length % 2) return rechazo('Comillas dobles sin cerrar.')
  const s = sinTextos.replace(/"/g, '').toLowerCase()

  if (!/^(select|with)\b/.test(s)) return rechazo('Solo se permiten consultas SELECT.')

  for (const w of PALABRAS_PROHIBIDAS) {
    if (palabra(w).test(s)) return rechazo(`No se permite "${w.toUpperCase()}" en la consulta.`)
  }
  for (const [patron, motivo] of PATRONES_PROHIBIDOS) {
    if (patron.test(s)) return rechazo(`La consulta usa ${motivo}.`)
  }

  // SELECT *, alias.* o ", *" traerian columnas ocultas sin nombrarlas
  if (/(\bselect\s+(all\s+|distinct\s+)?|,\s*|\.\s*)\*/.test(s)) {
    return rechazo('No se permite "*": hay que nombrar las columnas.')
  }

  // Referencias schema.tabla: solo el schema permitido y solo sus tablas habilitadas.
  // Las tablas sin calificar no resuelven porque la consulta corre con search_path = pg_catalog.
  // El segundo nombre va en lookahead para revisar tambien base.schema.tabla.
  for (const m of s.matchAll(/\b([a-z_]\w*)\s*\.\s*(?=([a-z_]\w*))/g)) {
    const [, izq, der] = m
    if (!ctx.schemas.has(izq)) continue // alias.columna
    if (izq !== ctx.schema) return rechazo(`No se puede consultar el schema "${izq}".`)
    if (!ctx.tablasPermitidas.has(der)) return rechazo(`No se puede consultar la tabla "${der}".`)
  }
  for (const c of ctx.columnasOcultas) {
    if (palabra(c).test(s)) return rechazo(`La columna "${c}" tiene datos personales y no se puede consultar.`)
  }

  // Parametros $1..$n: tienen que coincidir con los valores informados
  const usados = new Set([...s.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])))
  if (cantParametros > MAX_PARAMETROS) return rechazo('Demasiados parametros.')
  if (usados.size !== cantParametros) return rechazo('Los parametros no coinciden con la consulta.')
  for (let i = 1; i <= cantParametros; i++) {
    if (!usados.has(i)) return rechazo('Los parametros no coinciden con la consulta.')
  }

  return { ok: true, sql }
}
