import { Router } from 'express';
import { getMenu, addPlato } from '../controllers/menuController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getMenu);
router.post('/', authenticate, authorizeRoles('admin'), addPlato);

export default router;