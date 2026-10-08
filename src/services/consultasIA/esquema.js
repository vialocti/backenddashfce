import coneccionDB from '../../database.js'
import { CACHE_ESQUEMA_MS, PATRON_COLUMNA_OCULTA, SCHEMA, TABLAS_PERMITIDAS } from './config.js'

let cache = null
let cacheHasta = 0

/**
 * Lee de la propia base la estructura de las tablas habilitadas y lo que necesita
 * el validador (nombres de schemas y columnas ocultas). Se cachea unos minutos.
 */
export async function cargarEsquema() {
  if (cache && Date.now() < cacheHasta) return cache

  const [cols, schemas, stats] = await Promise.all([
    coneccionDB.query(
      `select table_name, column_name, data_type
         from information_schema.columns
        where table_schema = $1 and table_name = any($2)
        order by table_name, ordinal_position`,
      [SCHEMA, TABLAS_PERMITIDAS]
    ),
    coneccionDB.query(`select nspname as schema from pg_catalog.pg_namespace`),
    // Valores posibles de las columnas con pocas variantes (periodo, calidad, ...): salen de
    // las estadisticas del planificador, sin recorrer las tablas.
    coneccionDB
      .query(
        `select tablename, attname, most_common_vals::text as valores
           from pg_catalog.pg_stats
          where schemaname = $1 and tablename = any($2)
            and n_distinct between 1 and 20 and most_common_vals is not null`,
        [SCHEMA, TABLAS_PERMITIDAS]
      )
      .catch(() => ({ rows: [] })),
  ])

  const valores = new Map(stats.rows.map((r) => [`${r.tablename}.${r.attname}`, r.valores]))
  const porTabla = new Map()
  const columnasOcultas = new Set()

  for (const { table_name, column_name, data_type } of cols.rows) {
    if (PATRON_COLUMNA_OCULTA.test(column_name)) {
      columnasOcultas.add(column_name.toLowerCase())
      continue
    }
    if (!porTabla.has(table_name)) porTabla.set(table_name, [])
    porTabla.get(table_name).push({ column_name, data_type })
  }

  const descripcion = [...porTabla.entries()]
    .map(([tabla, columnas]) => {
      const lineas = columnas.map(({ column_name, data_type }) => {
        // Las columnas con mayusculas necesitan comillas dobles en PostgreSQL
        const nombre = column_name === column_name.toLowerCase() ? column_name : `"${column_name}"`
        const v = valores.get(`${tabla}.${column_name}`)
        const ejemplo = v && v.length <= 200 ? `  valores: ${v}` : ''
        return `  ${nombre} ${data_type}${ejemplo}`
      })
      return `${SCHEMA}.${tabla}\n${lineas.join('\n')}`
    })
    .join('\n\n')

  cache = {
    schema: SCHEMA,
    descripcion,
    tablasPermitidas: new Set(porTabla.keys()),
    schemas: new Set(schemas.rows.map((r) => r.schema.toLowerCase())),
    columnasOcultas,
  }
  cacheHasta = Date.now() + CACHE_ESQUEMA_MS
  return cache
}
