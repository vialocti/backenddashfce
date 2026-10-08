import { Router } from "express";
import { getAprobadasHistoricoPrimer, getIndicesTotales, getTurnosExamenesMain } from "../controllers/adminControllers";

const router = Router();
//consulta de aprobadas 1eraño
router.get('/aprobadas-primerH', getAprobadasHistoricoPrimer )
router.get('/indices-totales', getIndicesTotales )
router.get('/turnos-examenes-main', getTurnosExamenesMain )

export default router;