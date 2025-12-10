import { Router } from 'express';
import { createPedido, getPedidos, updatePedidoStatus } from '../controllers/pedidoController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticate, createPedido); // cualquier mozo o admin puede crear
router.get('/', authenticate, getPedidos);
router.patch('/:id', authenticate, updatePedidoStatus); // idealmente solo admin, pero ajusta si quieres

export default router;