import { Request, Response } from 'express';
import { Venta } from '../models/Venta';

export const cerrarCuenta = async (req: Request, res: Response) => {
  try {
    const { mesaId, platos, total, impuestos, formaPago } = req.body;
    const userId = (req as any).user.id;

    if (!mesaId || !platos || !Array.isArray(platos) || platos.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const ventaId = await Venta.cerrarCuenta(
      mesaId, 
      userId, 
      total, 
      impuestos || 0, 
      formaPago || 'efectivo', 
      platos
    );

    res.status(201).json({ message: 'Cuenta cerrada', ventaId });
  } catch (err: any) {
    console.error('Error en cerrarCuenta controller:', err);
    res.status(500).json({ error: err.message || 'Error interno' });
  }
};