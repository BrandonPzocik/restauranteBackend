// src/routes/pedidoRoutes.ts
import { Router } from 'express';
import { 
  createPedido, 
  getPedidos, 
  getPedidoById,
  updatePedidoStatus,
  getPedidosListos 
} from '../controllers/pedidoController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Rutas fijas PRIMERO
router.post('/', authenticate, createPedido);
router.get('/', authenticate, getPedidos);
router.get('/listos', authenticate, getPedidosListos); // ← ¡DEBE IR ANTES DE :id!

// Rutas con parámetros al FINAL
router.get('/:id', authenticate, getPedidoById);
router.patch('/:id', authenticate, updatePedidoStatus);
// src/routes/pedidoRoutes.ts
import { getPlatosPorMesa } from '../controllers/pedidoController';

// ... otras rutas
router.get('/mesa/:mesaId', authenticate, getPlatosPorMesa);

export default router;