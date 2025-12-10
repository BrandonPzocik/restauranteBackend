import { Router } from 'express';
import { getMesas, addMesa } from '../controllers/mesaController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// GET /api/mesas → listar todas las mesas (cualquier usuario autenticado)
router.get('/', authenticate, getMesas);

// POST /api/mesas → crear una nueva mesa (solo admin)
router.post('/', authenticate, authorizeRoles('admin'), addMesa);

export default router;