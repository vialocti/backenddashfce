/*
const { Router } = require('express');
const { getAnalizador_datos, consultasOpenaiNew } = require('../controllers/openAIControllers');

const router = Router();

router.post('/analizardatos', getAnalizador_datos);
// router.post('/assitanststadistics', analizarDatos);
// router.post('/consuopenai', consultasOpenai);
router.post('/cosusql', consultasOpenaiNew);

module.exports = router;
*/

import { askAssistant_R, consultasOpenaiNew, generateInformeIA_actividades_historicas, getAnalizador_datos, getAnalizador_datos_R, handlePromptResponse } from "../controllers/openAIControllers.js";

import { consultarIA, reejecutarConsultaIA } from "../controllers/consultasIAControllers.js";

import { Router } from "express";

const router = Router()

router.post('/analizardatos', getAnalizador_datos)
//router.post('/assitanststadistics', analizarDatos )
//router.post('/consuopenai',consultasOpenai)
router.post('/cosusql', consultasOpenaiNew)
router.post('/helpme', askAssistant_R)
router.post('/preguntasAI', getAnalizador_datos_R)
router.post('/consuagente', handlePromptResponse)
router.post('/generarInformeIA_actividades', generateInformeIA_actividades_historicas)
// Consultas en lenguaje natural: genera el SQL con IA, lo valida y lo ejecuta en solo lectura
router.post('/consultas-ia', consultarIA)
router.post('/consultas-ia/ejecutar', reejecutarConsultaIA)

export default router;