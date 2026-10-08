import { Router } from "express";
import { logProceso, updateLogProceso } from "../controllers/logControllers";

const router = Router();

router.post('/log-proceso', logProceso);
router.put('/log-proceso/:id', updateLogProceso);

export default router;
