import { Router } from 'express';
import { getMesas, getEstadoMesas } from '../controllers/mesaController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getMesas);
router.get('/estado', authenticate, getEstadoMesas);

export default router;