import { Router } from 'express';
import { getTodasLasMesas, getDetalleMesa } from '../controllers/cajeroController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Solo cajeros y admins pueden acceder
router.get('/todas-mesas', authenticate, authorizeRoles('cajero', 'admin'), getTodasLasMesas);
router.get('/mesa/:mesaId', authenticate, authorizeRoles('cajero', 'admin'), getDetalleMesa);

export default router;