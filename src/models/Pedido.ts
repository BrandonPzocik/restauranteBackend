import pool from '../config/db';

export class Pedido {
  static async create(mesaId: number, userId: number, platos: { platoId: number; cantidad: number }[]) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const [result] = await conn.execute(
        'INSERT INTO pedidos (mesa_id, usuario_id) VALUES (?, ?)',
        [mesaId, userId]
      );
      const pedidoId = (result as any).insertId;

      for (const item of platos) {
        await conn.execute(
          'INSERT INTO pedido_detalles (pedido_id, plato_id, cantidad) VALUES (?, ?, ?)',
          [pedidoId, item.platoId, item.cantidad]
        );
      }

      await conn.commit();
      return pedidoId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async getAll() {
    const [rows] = await pool.execute(`
      SELECT p.id, p.estado, p.creado_en, m.numero as mesa_numero, u.nombre as mozo
      FROM pedidos p
      JOIN mesas m ON p.mesa_id = m.id
      JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.creado_en DESC
    `);
    return rows;
  }

  static async updateStatus(id: number, estado: string) {
    await pool.execute('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, id]);
  }
}