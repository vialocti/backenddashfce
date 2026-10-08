import { buscarMesasSinCerrar, calculoIndicesTotales, consultaIndices_actividad, consultaIndices_total_anio, deleteTablesIndices, generarReporteAprobadasAnioUno, grabarMateriasAprobadasCiclo, grabardatosCursadas, indicescomisionessede, obtenerDatosreporteAlumnosMat, reportAlumnosCoeficienteOptimo, reportAlumnosCoeficienteOptimoCoef, setearAniocursadaActividad, traerReporteActividades, truncateInfoAlumnos } from '../controllers/utilesControllers.js'

import { Router } from 'express'

const utilesRoutes = Router()
utilesRoutes.get('/cursadas/:anio/:sede/:recursado', grabardatosCursadas)
utilesRoutes.get('/examenes/:anio/:sede', grabarMateriasAprobadasCiclo)
utilesRoutes.get('/indices/:anio/:sede', calculoIndicesTotales)
utilesRoutes.get('/reporteAprobAnioUno/:anio/:sede/:fecha', generarReporteAprobadasAnioUno)
utilesRoutes.get('/reporteMateriasDatos/:anio/:fecha', traerReporteActividades)
utilesRoutes.get('/reportAlumnosMat/:anio/:matap', obtenerDatosreporteAlumnosMat)
utilesRoutes.get('/reportealuinfomatcompleto/:anio/:matap/:propuestas', reportAlumnosCoeficienteOptimo)
utilesRoutes.get('/reportealuinfomatcompletoCoeficiente/:desde/:hasta/:propuestas', reportAlumnosCoeficienteOptimoCoef)
utilesRoutes.get('/indicescomisionesanio/:anio/:sede', indicescomisionessede)

////cuidado peligroso
utilesRoutes.get('/eliminardatos', deleteTablesIndices)
utilesRoutes.get('/mesas_abiertas', buscarMesasSinCerrar)

//complementos
utilesRoutes.get('/complemento_anio_cur', setearAniocursadaActividad)
utilesRoutes.get('/truncate_datos_info', truncateInfoAlumnos)

utilesRoutes.get('/consultar_datos_indice_actividad/:anio/:sede/:propuesta', consultaIndices_actividad)
utilesRoutes.get('/consultar_datos_indice_total/:anio/:sede/:propuesta', consultaIndices_total_anio )
export default utilesRoutes