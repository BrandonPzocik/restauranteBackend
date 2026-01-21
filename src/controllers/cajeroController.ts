import { Request, Response } from 'express';
import pool from '../config/db';

export const getTodasLasMesas = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        m.id,
        m.numero,
        m.capacidad,
        u.nombre as mozo_nombre,
        p.estado,
        p.creado_en,
        COUNT(pd.id) as platos_count,
        COALESCE(SUM(pd.cantidad * me.precio), 0) as total
      FROM mesas m
      LEFT JOIN pedidos p ON m.id = p.mesa_id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN pedido_detalles pd ON p.id = pd.pedido_id
      LEFT JOIN menu me ON pd.plato_id = me.id
      WHERE p.id IS NOT NULL
      GROUP BY m.id, m.numero, m.capacidad, u.nombre, p.estado, p.creado_en
      ORDER BY p.creado_en DESC
    `);
    res.json(rows);
  } catch (err: any) {
    console.error('Error en getTodasLasMesas:', err);
    res.status(500).json({ error: 'Error al cargar mesas' });
  }
};

export const getDetalleMesa = async (req: Request, res: Response) => {
  const { mesaId } = req.params;
  try {
    const [rows] = await pool.execute(`
      SELECT 
        me.id as plato_id,
        me.nombre,
        me.precio,
        pd.cantidad,
        pd.observaciones,
        p.id as pedido_id,
        p.estado as pedido_estado,
        p.creado_en
      FROM pedidos p
      JOIN pedido_detalles pd ON p.id = pd.pedido_id
      JOIN menu me ON pd.plato_id = me.id
      WHERE p.mesa_id = ? AND p.estado IN ('pendiente', 'preparando', 'listo', 'servido')
      ORDER BY p.creado_en ASC
    `, [mesaId]);
    res.json(rows);
  } catch (err: any) {
    console.error('Error en getDetalleMesa:', err);
    res.status(500).json({ error: 'Error al cargar detalles de la mesa' });
  }
};