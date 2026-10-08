/**
 * Deriva el Coef.Carrera a partir del avance real contra el avance ideal
 * esperado según la duración del plan. Se usa solo cuando el sistema origen
 * no provee un Coef.Carrera ya calculado (ver adaptador, obtenerContextoInscripcion).
 */
function derivarCoefCarrera({ fechaAnalisis, anioIngreso, duracionIdealAnios, materiasAprobadas, materiasTotalesPlan }) {
  if (!duracionIdealAnios || !materiasTotalesPlan || !anioIngreso) {
    return null; // no hay suficiente info del plan para derivarlo
  }

  const anioAnalisis = new Date(fechaAnalisis).getFullYear();
  const anosTranscurridos = Math.max(0, anioAnalisis - anioIngreso);
  const avanceIdealEsperado = Math.min(1, anosTranscurridos / duracionIdealAnios);
  const avanceReal = materiasAprobadas / materiasTotalesPlan;

  if (avanceReal > 0) {
    return Math.round((avanceIdealEsperado / avanceReal) * 100) / 100;
  }
  return avanceIdealEsperado > 0 ? 20 : 1; // tope si todavía no aprobó nada
}

export { derivarCoefCarrera };
