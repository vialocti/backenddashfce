import {
  processReinscriptos,
  processInfo_One,
  calcularAproAnio,
  aniocursada19,
  aniocursada98,
  calculoVelocidad,
  controlPorcentaje,
  controlMatricula,
  controlCalidadAluinfo,
} from '../../controllers/alumnosInfoControllers.js'
import { invocar, crearRunner } from '../orquestador/jobRunner.js'

// Mes en el que termina cada bimestre (inclusive). Ajustable por env: BIMESTRES_FIN_MES="4,6,9,11"
const BIMESTRES_FIN_MES = (process.env.BIMESTRES_FIN_MES || '4,6,9,11')
  .split(',')
  .map(Number)

const runner = crearRunner({ etiqueta: 'orquestador alumnos_info' })

/**
 * Ultimo bimestre completado. epoca = cantidad de bimestres ya cerrados en el año (0..4),
 * que es lo que espera calculoVelocidad: nrobimestres = (anio - ingreso) * 4 + epoca.
 */
export function bimestreCerrado(fecha = new Date()) {
  const mes = fecha.getMonth() + 1
  const epoca = BIMESTRES_FIN_MES.filter((fin) => fin < mes).length
  return { anio: fecha.getFullYear(), epoca }
}

export function planDePasos({ modo, anio, epoca }) {
  const reinscriptos = { nombre: 'reinscriptos', ejecutar: () => invocar(processReinscriptos, { anio: String(anio) }) }
  const infoNuevos = { nombre: 'info_nuevos', ejecutar: () => invocar(processInfo_One, { tipoO: 'P', modo: 'I' }) }
  const infoCompleto = { nombre: 'info_completo', ejecutar: () => invocar(processInfo_One, { tipoO: 'C', modo: 'I' }) }
  const infoActualizacion = { nombre: 'info_actualizacion', ejecutar: () => invocar(processInfo_One, { tipoO: 'C', modo: 'A' }) }

  // Matricula y calidad van antes de calcular: infoOne usa legajo (0 => anio de ingreso erroneo)
  // y calculoVelocidad solo procesa calidad = 'A'.
  const controlesPrevios = [
    { nombre: 'control_matricula', ejecutar: () => invocar(controlMatricula) },
    { nombre: 'control_calidad', ejecutar: () => invocar(controlCalidadAluinfo) },
  ]

  const comunes = [
    { nombre: 'aprobadas_por_anio', ejecutar: () => invocar(calcularAproAnio, { tipoO: 'C' }) },
    { nombre: 'anio_cursada_plan19', ejecutar: () => invocar(aniocursada19, { tipo: '1', tipoO: 'C' }) },
    { nombre: 'anio_cursada_plan98', ejecutar: () => invocar(aniocursada98, { tipo: '1', tipoO: 'C' }) },
    { nombre: 'coeficiente_tiempo_carrera', ejecutar: () => invocar(calculoVelocidad, { anio: String(anio), epoca: String(epoca), tipoO: 'C' }) },
    { nombre: 'porcentaje_avance', ejecutar: () => invocar(controlPorcentaje, { tipoO: 'C' }) },
  ]

  if (modo === 'INICIAL') return [reinscriptos, ...controlesPrevios, infoCompleto, ...comunes]
  return [reinscriptos, ...controlesPrevios, infoNuevos, infoActualizacion, ...comunes]
}

export function resolverParametros({ modo, anio, epoca }) {
  if (modo !== 'INICIAL' && modo !== 'ACTUALIZACION') {
    throw new Error("modo debe ser 'INICIAL' o 'ACTUALIZACION'")
  }
  const porDefecto = bimestreCerrado()
  const anioFinal = anio === undefined ? porDefecto.anio : Number(anio)
  const epocaFinal = epoca === undefined ? porDefecto.epoca : Number(epoca)
  if (!Number.isInteger(anioFinal) || anioFinal < 2000 || anioFinal > 2100) {
    throw new Error('anio invalido')
  }
  if (!Number.isInteger(epocaFinal) || epocaFinal < 0 || epocaFinal > 4) {
    throw new Error('epoca invalida (0 a 4)')
  }
  return { modo, anio: anioFinal, epoca: epocaFinal }
}

/**
 * Lanza el orquestador en segundo plano. Devuelve el job o lanza si ya hay uno en curso.
 */
export function iniciarJob(parametros) {
  const { modo, anio, epoca } = resolverParametros(parametros)
  return runner.iniciar({ modo, anio, epoca }, planDePasos({ modo, anio, epoca }))
}

export function planSinEjecutar(parametros) {
  const { modo, anio, epoca } = resolverParametros(parametros)
  return { modo, anio, epoca, pasos: planDePasos({ modo, anio, epoca }).map((p) => p.nombre) }
}

export const obtenerJob = runner.obtener
export const listarJobs = runner.listar
