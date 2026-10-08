import { Router } from "express";
import { getPadronesAlumnos, getPadronesEgresados } from "../controllers/padronesControllers";

const router = Router();

router.get('/egresados/:fecha_i/:fecha_f', getPadronesEgresados);
router.get('/alumnos/:fecha_i/:fecha_f', getPadronesAlumnos);

export default router;