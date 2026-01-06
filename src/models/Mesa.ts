import pool from '../config/db';

export class Mesa {
  static async getAll() {
    const [rows] = await pool.execute('SELECT * FROM mesas');
    return rows;
  }

  // En src/models/Mesa.ts
static async getEstado() {
  const [rows] = await pool.execute(`
    SELECT 
      m.id, 
      m.numero, 
      m.capacidad,
      CASE 
        WHEN p.id IS NOT NULL THEN 'ocupada'
        ELSE 'libre'
      END as estado
    FROM mesas m
    LEFT JOIN pedidos p ON m.id = p.mesa_id 
      AND p.estado IN ('pendiente', 'preparando', 'listo', 'servido')
    ORDER BY m.numero
  `);
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