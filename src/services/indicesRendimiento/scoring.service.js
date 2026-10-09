/**
 * ISA — Índice de Seguimiento Académico (0 a 100).
 *
 * Se compone de hasta 5 sub-índices, cada uno normalizado a 0-100. No todos los
 * sub-índices están siempre disponibles (depende de qué datos se le pasen: solo
 * historia académica, o historia + RAN + inscripción + coef.carrera), así que el
 * motor RENORMALIZA los pesos entre los componentes que sí tienen valor, en vez
 * de asumir 0 para los que faltan (asumir 0 penalizaría injustamente).
 *
 * Componentes:
 *   - ritmo        derivado del Coef.Carrera (1.0→100, 2.0→60, 4.0→0, tope en 0).
 *                  Es el de más peso: mide qué tan al día va la carrera (1 = ideal,
 *                  1,2 en un plan de 4 años = a este ritmo tarda 4,8).
 *   - compromiso   100 × (1 − ausencias / intentos totales)
 *   - capacidad    promedio de notas obtenidas cuando efectivamente rindió × 10
 *   - recursadas   100 − min(100, Cant.RAN × 15) — RAN = Rendimiento Académico
 *                  Negativo (año lectivo sin rendir/aprobar el mínimo de 2
 *                  materias), NO cantidad de materias recursadas (son cosas
 *                  distintas; el nombre de la clave quedó de un diseño previo)
 *   - continuidad  100 si sigue inscripto a lo pendiente, 40 si no
 *
 * La completud de la carrera (aprobadas / materias del plan) NO es componente:
 * se guarda y se muestra, pero ya está contenida en el Coef.Carrera, y en crudo
 * penalizaría a las cohortes recientes. Hasta la v1 existía un componente
 * "progreso" (100 / coef) que duplicaba el peso del coef; la v2 lo saca y le
 * pasa su 25% a ritmo.
 */

const VERSION_FORMULA = 'v2';

const PESOS = {
  ritmo: 0.4,
  compromiso: 0.25,
  capacidad: 0.15,
  recursadas: 0.1,
  continuidad: 0.1,
};

const UMBRAL_ALERTA_COMPONENTE = 30; // si un componente cae debajo de esto, se fuerza "Prioritario"
const UMBRAL_PRIORITARIO = 50;
const UMBRAL_SEGUIMIENTO = 75;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

/** Coef.Carrera (1.0 ideal) → score 0-100. coef=1→100, coef=2→60, coef=4→0 */
function scoreDesdeCoefCarrera(coefCarrera) {
  if (coefCarrera === null || coefCarrera === undefined) return null;
  const score = 100 - (coefCarrera - 1) * 40;
  return clamp(score);
}

/** Cant.RAN → score 0-100. Cada año en RAN resta 15 puntos (no es cantidad de recursadas). */
function scoreDesdeRecursadas(cantRan) {
  if (cantRan === null || cantRan === undefined) return null;
  return clamp(100 - cantRan * 15);
}

/** Reg.Vig ("S"/"N") → score binario simple. */
function scoreDesdeRegularidad(regVig) {
  if (!regVig) return null;
  return regVig.toUpperCase() === 'S' ? 100 : 40;
}

/** Promedio de notas (escala 0-10) → score 0-100. */
function scoreDesdePromedio(promedio) {
  if (promedio === null || promedio === undefined) return null;
  return clamp(promedio * 10);
}

/**
 * Núcleo del motor: recibe un objeto parcial de sub-scores (algunos pueden ser
 * `null`/`undefined` si no hay dato) y devuelve el ISA final, la clasificación,
 * y el desglose completo para mostrarlo junto al número compuesto.
 */
function calcularISA(subScoresParciales) {
  const disponibles = Object.entries(subScoresParciales).filter(
    ([, valor]) => valor !== null && valor !== undefined && !Number.isNaN(valor)
  );

  if (disponibles.length === 0) {
    throw new Error('No hay suficientes datos para calcular el ISA (ningún sub-score disponible).');
  }

  const pesoTotalDisponible = disponibles.reduce((sum, [key]) => sum + (PESOS[key] || 0), 0);

  let isa = 0;
  const desglose = {};
  disponibles.forEach(([key, valor]) => {
    const pesoNormalizado = (PESOS[key] || 0) / pesoTotalDisponible;
    const valorClamped = clamp(valor);
    isa += valorClamped * pesoNormalizado;
    desglose[key] = {
      valor: Math.round(valorClamped * 10) / 10,
      peso: Math.round(pesoNormalizado * 1000) / 1000,
      alerta: valorClamped < UMBRAL_ALERTA_COMPONENTE,
    };
  });

  isa = Math.round(isa * 10) / 10;

  const alertaPorComponente = Object.values(desglose).some((c) => c.alerta);
  const clasificacion = clasificar(isa, alertaPorComponente);

  return {
    isa,
    clasificacion,
    componentesUsados: disponibles.map(([key]) => key),
    componentesFaltantes: Object.keys(PESOS).filter((key) => !(key in subScoresParciales) || subScoresParciales[key] == null),
    desglose,
    alertaPorComponente,
  };
}

function clasificar(isa, alertaPorComponente) {
  if (alertaPorComponente || isa < UMBRAL_PRIORITARIO) {
    return 'Prioritario';
  }
  if (isa < UMBRAL_SEGUIMIENTO) {
    return 'Seguimiento recomendado';
  }
  return 'Sin necesidad de seguimiento';
}

export {
  VERSION_FORMULA,
  PESOS,
  calcularISA,
  scoreDesdeCoefCarrera,
  scoreDesdeRecursadas,
  scoreDesdeRegularidad,
  scoreDesdePromedio,
  UMBRAL_ALERTA_COMPONENTE,
  UMBRAL_PRIORITARIO,
  UMBRAL_SEGUIMIENTO,
};
