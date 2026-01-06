import { Request, Response } from 'express';
import { Mesa } from '../models/Mesa';

export const getMesas = async (_: Request, res: Response) => {
  const mesas = await Mesa.getAll();
  res.json(mesas);
};

export const getEstadoMesas = async (_: Request, res: Response) => {
  const estado = await Mesa.getEstado();
  res.json(estado);
};