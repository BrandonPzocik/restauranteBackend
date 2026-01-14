import { Router } from 'express';
import { getMesasActivas, getDetalleMesa } from '../controllers/cajeroController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/mesas-activas', authenticate, authorizeRoles('cajero', 'admin'), getMesasActivas);
router.get('/mesa/:mesaId', authenticate, authorizeRoles('cajero', 'admin'), getDetalleMesa);

export default router;

