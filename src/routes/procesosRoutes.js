import {Router} from 'express';
import { getEvolucionCohorteDetallada } from '../controllers/procesosControllers.js';

const router = Router();

router.get('/evolucion-cohorte-detallada/:anioI/:sede/:carrera/:anioFC/:tipoI',  getEvolucionCohorteDetallada );

export default router;