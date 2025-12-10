import type { Request, Response } from 'express';
import { Pedido } from '../models/Pedido';

export const createPedido = async (req: Request, res: Response) => {
  const { mesaId, platos } = req.body;
  const userId = (req as any).user.id;

  if (!platos || !Array.isArray(platos) || platos.length === 0) {
    return res.status(400).json({ error: 'Platos requeridos' });
  }

  try {
    await Pedido.create(mesaId, userId, platos);
    res.status(201).json({ message: 'Pedido creado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getPedidos = async (_: Request, res: Response) => {
  const pedidos = await Pedido.getAll();
  res.json(pedidos);
};

export const updatePedidoStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!['pendiente', 'preparando', 'listo', 'entregado', 'cancelado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  await Pedido.updateStatus(Number(id), estado);
  res.json({ message: 'Estado actualizado' });
};