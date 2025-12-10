import type { Request, Response } from 'express';
import { Mesa } from '../models/Mesa';

export const getMesas = async (_: Request, res: Response) => {
  try {
    const mesas = await Mesa.getAll();
    res.json(mesas);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const addMesa = async (req: Request, res: Response) => {
  const { numero, capacidad } = req.body;

  if (!numero || !capacidad) {
    return res.status(400).json({ error: 'Número y capacidad son requeridos' });
  }

  try {
    await Mesa.create(numero, capacidad);
    res.status(201).json({ message: 'Mesa agregada exitosamente' });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya existe una mesa con ese número' });
    }
    res.status(500).json({ error: 'Error al crear la mesa' });
  }
};