import pool from '../config/db';
import bcrypt from 'bcryptjs';

export class Usuario {
  static verifyPassword(password: any, password1: any) {
    throw new Error('Method not implemented.');
  }
  static async create(nombre: string, email: string, password: string, rol: string) {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hashed, rol]
    );
    return result;
  }

  static async findByEmail(email: string) {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    return (rows as any[])[0];
  }

  static async findById(id: number) {
    const [rows] = await pool.execute('SELECT id, nombre, email, rol FROM usuarios WHERE id = ?', [id]);
    return (rows as any[])[0];
  }
}