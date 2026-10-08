// Configuracion de las consultas por IA (pregunta en lenguaje natural -> SQL -> tabla).
// Todo lo que el bot puede ver o tocar se define aca.

// Unico schema consultable
export const SCHEMA = process.env.SCHEMA_RENDIMIENTO || 'fce_per'

// Tablas que el bot puede consultar. Las que no existan en la base se ignoran.
// Cualquier otra tabla (del schema o de otro) queda bloqueada.
export const TABLAS_PERMITIDAS = [
  'alumnos_info',
  'dash_actividad_resultados',
  'dash_aprobadas_anio',
  'dash_indices_total',
  'rendimiento_academico',
]

// Columnas con datos personales: no se le muestran al modelo y el validador
// rechaza cualquier consulta que las nombre.
export const PATRON_COLUMNA_OCULTA =
  /(documento|dni|cuil|cuit|apellido|nombres|apynom|nacim|mail|correo|telef|celular|domicil|direcc)/i

export const MODELO = process.env.IA_SQL_MODEL || 'gpt-4.1-mini'

// Rol de solo lectura opcional. Si esta definido, cada consulta corre con
// SET LOCAL ROLE <rol>, asi los permisos los limita la propia base.
export const ROL_DB = process.env.IA_DB_ROLE || ''

export const MAX_FILAS = 500
export const TIMEOUT_MS = 15000
export const MAX_PREGUNTA = 500
export const MAX_SQL = 4000
export const MAX_PARAMETROS = 8
export const CACHE_ESQUEMA_MS = 10 * 60 * 1000
export const VIGENCIA_FIRMA = '12h'

// Vocabulario de la facultad: como se traducen los terminos del usuario a columnas y codigos
export const GLOSARIO = `
- "carrera" es la columna propuesta. Codigos: 1 = CPN (Contador Publico Nacional, plan 98),
  2 = LA (Lic. en Administracion), 3 = LE (Lic. en Economia), 6 = LNRG (Lic. en Negocios Regionales),
  7 = LLO (Lic. en Logistica), 8 = CP (Contador Publico), 9 = LGTO.
- "sede" es la columna sede o ubicacion segun la tabla. Codigos: 1 = Mendoza (MZA), 2 = San Rafael (SRF),
  3 = General Alvear (GALV), 4 = Este (ESTE). En algunas tablas esta guardada como texto.
- "año lectivo", "año academico" o "ciclo" es anio_academico (o anio).
- "coeficiente" es coef_tcarrera; "porcentaje de la carrera" es completado.
- "año de cursada" (1ro a 5to) es aniocursada o anio_cursada, con valores 1 a 5.
- "ingresantes" de un año son los que tienen ese año en anio_ingreso_pro.
- dash_actividad_resultados tiene una fila por actividad (materia), sede, carrera, periodo y año,
  con inscriptos, regulares (incluye promocionados), reprobados (libres), ausentes, promocionados
  y los indices de cursada (indice_cursada, indice_e1 ciclo corto, indice_e2 ciclo largo).
- dash_indices_total tiene los totales por año, sede, carrera y periodo.
`
