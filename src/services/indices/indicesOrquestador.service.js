import {
  grabardatosCursadas,
  grabarMateriasAprobadasCiclo,
  calculoIndicesTotales,
} from '../../controllers/utilesControllers.js'
import { procesarIndicesTot } from '../../controllers/rendimientoControllers.js'
import { traerAprobadasPorAlumnoSedePropuestaAnio } from '../../controllers/examenesControllers.js'
import { invocar, crearRunner } from '../orquestador/jobRunner.js'

// 1 Mendoza, 2 San Rafael, 4 Este (las sedes con actividad en los indices por ciclo)
const SEDES_INDICES = ['1', '2', '4']
// Aprobadas de primer año: todas las sedes; las combinaciones sin ingresantes devuelven 404 y se registran como sin_datos
const SEDES_PRIMER_ANIO = ['1', '2', '3', '4']
const PROPUESTAS_PRIMER_ANIO = ['2', '3', '7', '8']
// La sede Este (4) solo dicta Licenciatura en Logistica (7)
const PROPUESTAS_POR_SEDE = { 4: ['7'] }

const runner = crearRunner({ etiqueta: 'orquestador indices' })

// procesarIndicesTot responde 200 aunque falle la grabacion de una propuesta: el error viene en results
function validarIndiceTotal(body) {
  const fallos = (body.results || []).filter((r) => typeof r === 'string' && r.startsWith('Error'))
  if (fallos.length > 0) throw new Error(fallos.join(' | '))
}

/**
 * Anio en curso: cursadas -> aprobadas ciclo -> indices ciclo.
 * Anio anterior: aprobadas ciclo -> indices ciclo (los examenes rendidos despues del cierre lo modifican).
 * Luego indice historico por propuesta (anterior y en curso) y aprobadas de primer anio del ciclo lectivo.
 */
export function planDePasos({ anio }) {
  const anioAnterior = anio - 1
  const pasos = []

  for (const sede of SEDES_INDICES) {
    pasos.push({ nombre: `cursadas_${anio}_s${sede}`, ejecutar: () => invocar(grabardatosCursadas, { anio: String(anio), sede, recursado: 'N' }) })
    pasos.push({ nombre: `aprobadas_ciclo_${anio}_s${sede}`, ejecutar: () => invocar(grabarMateriasAprobadasCiclo, { anio: String(anio), sede }) })
    pasos.push({ nombre: `indices_ciclo_${anio}_s${sede}`, ejecutar: () => invocar(calculoIndicesTotales, { anio: String(anio), sede }) })
  }

  for (const sede of SEDES_INDICES) {
    pasos.push({ nombre: `aprobadas_ciclo_${anioAnterior}_s${sede}`, ejecutar: () => invocar(grabarMateriasAprobadasCiclo, { anio: String(anioAnterior), sede }) })
    pasos.push({ nombre: `indices_ciclo_${anioAnterior}_s${sede}`, ejecutar: () => invocar(calculoIndicesTotales, { anio: String(anioAnterior), sede }) })
  }

  for (const anioIndice of [anioAnterior, anio]) {
    for (const sede of SEDES_INDICES) {
      pasos.push({
        nombre: `indice_total_${anioIndice}_s${sede}`,
        ejecutar: () => invocar(procesarIndicesTot, { anio: String(anioIndice), sede }, { validar: validarIndiceTotal }),
      })
    }
  }

  for (const sede of SEDES_PRIMER_ANIO) {
    for (const propuesta of PROPUESTAS_POR_SEDE[sede] ?? PROPUESTAS_PRIMER_ANIO) {
      pasos.push({
        nombre: `aprobadas_primer_anio_${anio}_s${sede}_p${propuesta}`,
        ejecutar: () => invocar(traerAprobadasPorAlumnoSedePropuestaAnio, { anio: String(anio), sede, propuesta, tipoO: 'H' }, { toleraSinDatos: true }),
      })
    }
  }

  return pasos
}

export function resolverParametros({ anio }) {
  const anioFinal = anio === undefined ? new Date().getFullYear() : Number(anio)
  if (!Number.isInteger(anioFinal) || anioFinal < 2001 || anioFinal > 2100) {
    throw new Error('anio invalido')
  }
  return { anio: anioFinal }
}

export function iniciarJob(parametros) {
  const { anio } = resolverParametros(parametros)
  return runner.iniciar({ anio, anioAnterior: anio - 1 }, planDePasos({ anio }))
}

export function planSinEjecutar(parametros) {
  const { anio } = resolverParametros(parametros)
  return { anio, anioAnterior: anio - 1, pasos: planDePasos({ anio }).map((p) => p.nombre) }
}

export const obtenerJob = runner.obtener
export const listarJobs = runner.listar
