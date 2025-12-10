import type { Request, Response } from 'express';
import { Usuario } from '../models/Usuario';
import { generateToken } from '../utils/auth';
import * as bcrypt from 'bcryptjs';

export const register = async (req: Request, res: Response) => {
  const { nombre, email, password, rol } = req.body;
  if (!['mozo', 'admin'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  try {
    await Usuario.create(nombre, email, password, rol);
    res.status(201).json({ message: 'Usuario creado' });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email ya registrado' });
    }
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await Usuario.findByEmail(email);
  if (!user) return res.status(400).json({ error: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Credenciales inválidas' });

  const token = generateToken(user.id, user.rol);
  res.json({ token, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
};