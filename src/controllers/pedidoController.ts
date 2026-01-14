import { Request, Response } from 'express';
import { Pedido } from '../models/Pedido';
import pool from '../config/db';
import { RowDataPacket } from 'mysql2';

export const createPedido = async (req: Request, res: Response) => {
  const { mesaId, platos, observacionesGenerales } = req.body;
  const userId = (req as any).user.id;
  const io = (req as any).io; // ✅ Obtener instancia de Socket.IO

  try {
    const pedidoId = await Pedido.create(mesaId, userId, platos, observacionesGenerales);
    
    // ✅ Emitir evento de websocket desde el servidor
    if (io) {
      const data = { 
        pedidoId, 
        mesaId,
        message: 'Nuevo pedido recibido',
        timestamp: new Date().toISOString()
      };
      
      // Verificar cuántos sockets hay en la sala de cocina
      const cocinaRoom = io.sockets.adapter.rooms.get('cocina');
      const cocinaCount = cocinaRoom ? cocinaRoom.size : 0;
      console.log(`📊 Sockets en sala "cocina": ${cocinaCount}`);
      
      if (cocinaCount > 0) {
        io.to('cocina').emit('nuevo-pedido', data);
        console.log('🔔 Evento nuevo-pedido emitido a sala "cocina":', data);
      } else {
        console.warn('⚠️ No hay sockets en la sala "cocina" para recibir el evento');
        console.log('📋 Salas activas:', Array.from(io.sockets.adapter.rooms.keys()));
      }
    } else {
      console.warn('⚠️ Socket.IO no disponible en createPedido');
    }
    
    res.status(201).json({ message: 'Pedido creado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getPedidos = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const pedidos = await Pedido.getAllForRole(user.role, user.id);
  res.json(pedidos);
};

export const getPedidoById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const pedido = await Pedido.getById(Number(id));
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(pedido);
};

export const updatePedidoStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { estado } = req.body;
  const io = (req as any).io; // ✅ Obtener instancia de Socket.IO
  
  try {
    // ✅ Obtener información del pedido ANTES de actualizar para tener el número de mesa
    const pedido = await Pedido.getById(Number(id));
    
    await Pedido.updateStatus(Number(id), estado);
    
    // ✅ Si el pedido se marca como listo, emitir evento a todos los mozos
    if (estado === 'listo' && io && pedido) {
      io.emit('pedido-listo', { 
        pedidoId: Number(id),
        mesa: pedido.mesa_numero,
        message: `Pedido de la mesa ${pedido.mesa_numero} está listo`
      });
      console.log('✅ Evento pedido-listo emitido desde servidor para mesa', pedido.mesa_numero);
    }
    
    res.json({ message: 'Estado actualizado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// src/controllers/pedidoController.ts
export const getPedidosListos = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT 
        p.id,
        p.mesa_id,
        m.numero AS mesa_numero,
        p.creado_en,
        GROUP_CONCAT(
          CONCAT(pd.cantidad, 'x ', me.nombre)
          SEPARATOR '; '
        ) AS platos
       FROM pedidos p
       JOIN mesas m ON p.mesa_id = m.id
       JOIN pedido_detalles pd ON p.id = pd.pedido_id
       JOIN menu me ON pd.plato_id = me.id
       WHERE p.usuario_id = ? AND p.estado = 'listo'
       GROUP BY p.id, p.mesa_id, m.numero, p.creado_en`,
      [userId]
    );
    res.json(rows); // Siempre devuelve un array (aunque esté vacío)
  } catch (err: any) {
    console.error('Error en getPedidosListos:', err);
    res.status(500).json({ error: 'Error al cargar pedidos listos' });
  }
};

// src/controllers/pedidoController.ts
// src/controllers/pedidoController.ts
export const getPlatosPorMesa = async (req: Request, res: Response) => {
  const { mesaId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT 
        me.id,          -- ← ¡Este es el plato_id!
        me.nombre,
        me.precio,
        pd.cantidad,
        pd.observaciones
       FROM pedidos p
       JOIN pedido_detalles pd ON p.id = pd.pedido_id
       JOIN menu me ON pd.plato_id = me.id
       WHERE p.mesa_id = ? AND p.estado IN ('pendiente', 'preparando', 'listo', 'servido')`,
      [mesaId]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error al cargar platos por mesa:', err);
    res.status(500).json({ error: 'Error al cargar platos' });
  }
};

// Obtener historial de pedidos del mozo (todos los estados incluyendo cobrados)
export const getHistorialMozo = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT 
        p.id,
        p.mesa_id,
        m.numero as mesa_numero,
        p.estado,
        p.creado_en,
        GROUP_CONCAT(
          CONCAT(pd.cantidad, 'x ', me.nombre) 
          SEPARATOR '; '
        ) AS platos,
        SUM(pd.cantidad * me.precio) as total
       FROM pedidos p
       JOIN mesas m ON p.mesa_id = m.id
       JOIN pedido_detalles pd ON p.id = pd.pedido_id
       JOIN menu me ON pd.plato_id = me.id
       WHERE p.usuario_id = ?
       GROUP BY p.id, p.mesa_id, m.numero, p.estado, p.creado_en
       ORDER BY p.creado_en DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error en getHistorialMozo:', err);
    res.status(500).json({ error: 'Error al cargar historial' });
  }
};