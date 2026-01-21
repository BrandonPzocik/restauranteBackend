import { Request, Response } from 'express';
import { Pedido } from '../models/Pedido';
import pool from '../config/db';

export const createPedido = async (req: Request, res: Response) => {
  const { mesaId, platos, observacionesGenerales } = req.body;
  const userId = (req as any).user.id;

  try {
    const pedidoId = await Pedido.create(mesaId, userId, platos, observacionesGenerales);
    res.status(201).json({ message: 'Pedido creado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getPedidos = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const pedidos = await Pedido.getAllForRole(user.rol, user.id); // ← ¡user.rol!
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
  
  try {
    await Pedido.updateStatus(Number(id), estado);
    res.json({ message: 'Estado actualizado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

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
    res.json(rows);
  } catch (err: any) {
    console.error('Error en getPedidosListos:', err);
    res.status(500).json({ error: 'Error al cargar pedidos listos' });
  }
};

export const getPlatosPorMesa = async (req: Request, res: Response) => {
  const { mesaId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT 
        me.id,
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

export const getHistorialMozo = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT 
        p.id,
        p.mesa_id,
        m.numero as mesa_numero,
        u.nombre as mozo_nombre,
        p.estado,
        p.creado_en,
        GROUP_CONCAT(
          CONCAT(pd.cantidad, 'x ', me.nombre) 
          SEPARATOR '; '
        ) AS platos,
        SUM(pd.cantidad * me.precio) as total
       FROM pedidos p
       JOIN mesas m ON p.mesa_id = m.id
       JOIN usuarios u ON p.usuario_id = u.id
       JOIN pedido_detalles pd ON p.id = pd.pedido_id
       JOIN menu me ON pd.plato_id = me.id
       WHERE p.usuario_id = ?
       GROUP BY p.id, p.mesa_id, m.numero, u.nombre, p.estado, p.creado_en
       ORDER BY p.creado_en DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error en getHistorialMozo:', err);
    res.status(500).json({ error: 'Error al cargar historial' });
  }
};

// NUEVAS FUNCIONES PARA EL PANEL DEL MOZO - ✅ CORREGIDAS
export const getPedidosEnCurso = async (req: Request, res: Response) => {
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
       WHERE p.usuario_id = ? AND p.estado != 'cobrado'
       GROUP BY p.id, p.mesa_id, m.numero, p.estado, p.creado_en
       ORDER BY p.creado_en DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error en getPedidosEnCurso:', err);
    res.status(500).json({ error: 'Error al cargar pedidos en curso' });
  }
};

export const getPedidosCobrados = async (req: Request, res: Response) => {
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
       WHERE p.usuario_id = ? AND p.estado = 'cobrado'
       GROUP BY p.id, p.mesa_id, m.numero, p.estado, p.creado_en
       ORDER BY p.creado_en DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error en getPedidosCobrados:', err);
    res.status(500).json({ error: 'Error al cargar pedidos cobrados' });
  }
};