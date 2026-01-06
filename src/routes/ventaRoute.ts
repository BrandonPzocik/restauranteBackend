import { Router } from 'express';
import { cerrarCuenta } from '../controllers/ventaController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.post('/cerrar', authenticate, authorizeRoles('mozo', 'admin'), cerrarCuenta);

export default router;