import { Request, Response } from 'express';
import pool from '../config/db';

// Obtener todas las mesas con pedidos activos (para cerrar cuentas)
export const getMesasActivas = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT DISTINCT
        m.id,
        m.numero,
        m.capacidad,
        COUNT(DISTINCT p.id) as pedidos_activos,
        SUM(pd.cantidad * me.precio) as total_estimado
      FROM mesas m
      JOIN pedidos p ON m.id = p.mesa_id
      JOIN pedido_detalles pd ON p.id = pd.pedido_id
      JOIN menu me ON pd.plato_id = me.id
      WHERE p.estado IN ('pendiente', 'preparando', 'listo', 'servido')
      GROUP BY m.id, m.numero, m.capacidad
      ORDER BY m.numero
    `);
    res.json(rows);
  } catch (err: any) {
    console.error('Error en getMesasActivas:', err);
    res.status(500).json({ error: 'Error al cargar mesas activas' });
  }
};

// Obtener detalles completos de una mesa para cerrar cuenta
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

