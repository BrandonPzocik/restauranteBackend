import pool from '../config/db';

export class Mesa {
  static async getAll() {
    const [rows] = await pool.execute('SELECT * FROM mesas');
    return rows;
  }

  static async create(numero: number, capacidad: number) {
    const [result] = await pool.execute(
      'INSERT INTO mesas (numero, capacidad) VALUES (?, ?)',
      [numero, capacidad]
    );
    return result;
  }
}