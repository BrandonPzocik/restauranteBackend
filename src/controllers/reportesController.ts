// src/controllers/reportesController.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// Ganancias por período
// src/controllers/reportesController.ts
export const getGanancias = async (req: Request, res: Response) => {
  const { periodo = 'dia' } = req.query;
  let fechaCond = '';

  // Usamos "v.creado_en", no "p.creado_en"
  switch (periodo) {
    case 'semana':
      fechaCond = "DATE(v.creado_en) >= CURDATE() - INTERVAL 7 DAY";
      break;
    case 'mes':
      fechaCond = "DATE(v.creado_en) >= CURDATE() - INTERVAL 1 MONTH";
      break;
    default: // dia
      fechaCond = "DATE(v.creado_en) = CURDATE()";
  }

  const [rows] = await pool.execute(
    `SELECT 
      COALESCE(SUM(v.total), 0) as total,
      COUNT(v.id) as pedidos
     FROM ventas v
     WHERE ${fechaCond}`
  );
  
  res.json((rows as any)[0]);
};

// Rendimiento por mozo
export const getRendimientoMozos = async (req: Request, res: Response) => {
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

// Platos más vendidos
export const getPlatosVendidos = async (req: Request, res: Response) => {
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