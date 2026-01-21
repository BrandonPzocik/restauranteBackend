import { Router } from 'express';
import { 
  createPedido, 
  getPedidos, 
  getPedidoById,
  updatePedidoStatus,
  getPedidosListos,
  getPlatosPorMesa,
  getHistorialMozo,
  getPedidosEnCurso,
  getPedidosCobrados
} from '../controllers/pedidoController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticate, createPedido);
router.get('/', authenticate, getPedidos);
router.get('/listos', authenticate, getPedidosListos);
router.get('/historial', authenticate, getHistorialMozo);
router.get('/en-curso', authenticate, getPedidosEnCurso);
router.get('/cobrados', authenticate, getPedidosCobrados);
router.get('/mesa/:mesaId', authenticate, getPlatosPorMesa);

router.get('/:id', authenticate, getPedidoById);
router.patch('/:id', authenticate, updatePedidoStatus);

export default router;