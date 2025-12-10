import type { Request, Response } from 'express';
import { Menu } from '../models/Menu';

export const getMenu = async (_: Request, res: Response) => {
  const platos = await Menu.getAll();
  res.json(platos);
};

export const addPlato = async (req: Request, res: Response) => {
  const { nombre, descripcion, precio } = req.body;
  await Menu.create(nombre, descripcion, precio);
  res.status(201).json({ message: 'Plato agregado' });
};