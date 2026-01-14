// src/routes/pedidoRoutes.ts
import { Router } from 'express';
import { 
  createPedido, 
  getPedidos, 
  getPedidoById,
  updatePedidoStatus,
  getPedidosListos,
  getPlatosPorMesa,
  getHistorialMozo
} from '../controllers/pedidoController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Rutas fijas PRIMERO
router.post('/', authenticate, createPedido);
router.get('/', authenticate, getPedidos);
router.get('/listos', authenticate, getPedidosListos); // ← ¡DEBE IR ANTES DE :id!
router.get('/historial', authenticate, getHistorialMozo); // Historial del mozo
router.get('/mesa/:mesaId', authenticate, getPlatosPorMesa); // Detalles de una mesa

// Rutas con parámetros al FINAL
router.get('/:id', authenticate, getPedidoById);
router.patch('/:id', authenticate, updatePedidoStatus);

export default router;