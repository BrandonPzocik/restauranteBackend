import pool from '../config/db';

export class Menu {
  static async getAll() {
    const [rows] = await pool.execute('SELECT * FROM menu WHERE disponible = true');
    return rows;
  }

  static async create(nombre: string, descripcion: string, precio: number) {
    const [result] = await pool.execute(
      'INSERT INTO menu (nombre, descripcion, precio) VALUES (?, ?, ?)',
      [nombre, descripcion, precio]
    );
    return result;
  }
}