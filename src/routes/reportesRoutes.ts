import { Router } from 'express';
import { 
  getGanancias, 
  getRendimientoMozos, 
  getPlatosVendidos,
  getCierreCajaDiario 
} from '../controllers/reportesController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/ganancias', authenticate, authorizeRoles('admin'), getGanancias);
router.get('/rendimiento-mozos', authenticate, authorizeRoles('admin'), getRendimientoMozos);
router.get('/platos-vendidos', authenticate, authorizeRoles('admin'), getPlatosVendidos);
router.get('/cierre-caja-diario', authenticate, authorizeRoles('cajero', 'admin'), getCierreCajaDiario);

export default router;