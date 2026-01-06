// backend/src/routes/reportesRoutes.ts
import { Router } from 'express';
import { getGanancias, getRendimientoMozos, getPlatosVendidos } from '../controllers/reportesController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Solo los admins pueden acceder
router.get('/ganancias', authenticate, authorizeRoles('admin'), getGanancias);
router.get('/rendimiento-mozos', authenticate, authorizeRoles('admin'), getRendimientoMozos);
router.get('/platos-vendidos', authenticate, authorizeRoles('admin'), getPlatosVendidos);

export default router;