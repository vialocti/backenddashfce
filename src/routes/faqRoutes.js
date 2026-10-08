import { Router } from "express";
import { getPreguntaById, getPreguntas } from "../controllers/faqControllers";

const router = Router();
router.get('/preguntas', getPreguntas)
router.get('/preguntas/:id', getPreguntaById)

export default router;