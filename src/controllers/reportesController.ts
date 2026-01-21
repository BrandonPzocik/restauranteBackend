import { Request, Response } from 'express';
import pool from '../config/db';

export const getGanancias = async (req: Request, res: Response) => {
  const { periodo = 'dia' } = req.query;
  let fechaCond = '';

  switch (periodo) {
    case 'semana':
      fechaCond = "DATE(v.creado_en) >= CURDATE() - INTERVAL 7 DAY";
      break;
    case 'mes':
      fechaCond = "DATE(v.creado_en) >= CURDATE() - INTERVAL 1 MONTH";
      break;
    default:
      fechaCond = "DATE(v.creado_en) = CURDATE()";
  }

  const [rows] = await pool.execute(
    `SELECT 
      COALESCE(SUM(v.total), 0) as total,
      COUNT(v.id) as pedidos
     FROM ventas v
     WHERE ${fechaCond}`
  );
  
  res.json((rows as any[])[0]);
};

export const getRendimientoMozos = async (_req: Request, res: Response) => {
  const [rows] = await pool.execute(
    `SELECT 
      u.nombre,
      COUNT(v.id) as pedidos,
      COALESCE(SUM(v.total), 0) as ventas
     FROM usuarios u
     LEFT JOIN ventas v ON u.id = v.usuario_id
     WHERE u.rol = 'mozo'
     GROUP BY u.id, u.nombre`
  );
  res.json(rows);
};

export const getPlatosVendidos = async (_req: Request, res: Response) => {
  const [rows] = await pool.execute(
    `SELECT 
      m.nombre,
      SUM(vd.cantidad) as cantidad,
      COALESCE(SUM(vd.cantidad * vd.precio_unitario), 0) as ingresos
     FROM venta_detalles vd
     JOIN menu m ON vd.plato_id = m.id
     GROUP BY m.id, m.nombre
     ORDER BY cantidad DESC
     LIMIT 10`
  );
  res.json(rows);
};

export const getCierreCajaDiario = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        forma_pago,
        COUNT(*) as cantidad_ventas,
        COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE DATE(creado_en) = CURDATE()
      GROUP BY forma_pago
      ORDER BY FIELD(forma_pago, 'efectivo', 'tarjeta', 'transferencia')
    `);
    
    const [totalRow] = await pool.execute(`
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total), 0) as total_general
      FROM ventas
      WHERE DATE(creado_en) = CURDATE()
    `);
    
    // Ensure types are respected by explicitly asserting totalRow as any[] and accessing first row
    res.json({
      resumen: rows,
      total: (totalRow as any[])[0]
    });
  } catch (err: any) {
    console.error('Error en getCierreCajaDiario:', err);
    res.status(500).json({ error: 'Error al cargar cierre de caja' });
  }
};