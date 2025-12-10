import pool from '../config/db';
import * as bcrypt from 'bcryptjs';

export class Usuario {
  static async create(nombre: string, email: string, password: string, rol: 'mozo' | 'admin') {
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
}