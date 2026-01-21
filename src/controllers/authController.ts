import { Request, Response } from 'express';
import { Usuario } from '../models/Usuario';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

export const register = async (req: Request, res: Response) => {
  const { nombre, email, password, rol } = req.body;
  
  // Validar rol
  if (!['mozo', 'cocina', 'admin', 'cajero'].includes(rol)) {
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
  
  if (!user) {
    return res.status(400).json({ error: 'Credenciales inválidas' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Credenciales inválidas' });
  }

  // ✅ USAR "rol", NO "role" - ¡ESTO ES CLAVE!
  const token = jwt.sign(
    { id: user.id, rol: user.rol }, // ← ¡rol, no role!
    process.env.JWT_SECRET!, 
    { expiresIn: '1d' }
  );
  
  res.json({ 
    token, 
    user: { 
      id: user.id, 
      nombre: user.nombre, 
      rol: user.rol // ← ¡rol, no role!
    } 
  });
};

// Endpoint para verificar sesión
export const getUser = (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ 
    id: user.id, 
    nombre: user.nombre, 
    rol: user.rol // ← ¡rol, no role!
  });
};