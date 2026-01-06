import pool from '../config/db';

export class Pedido {
  static async create(mesaId: number, userId: number, platos: any[], observacionesGenerales?: string) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const [result] = await conn.execute(
        'INSERT INTO pedidos (mesa_id, usuario_id, observaciones_generales) VALUES (?, ?, ?)',
        [mesaId, userId, observacionesGenerales || null]
      );
      const pedidoId = (result as any).insertId;

      for (const item of platos) {
        await conn.execute(
          'INSERT INTO pedido_detalles (pedido_id, plato_id, cantidad, observaciones) VALUES (?, ?, ?, ?)',
          [pedidoId, item.platoId, item.cantidad, item.observaciones || null]
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

  static async getAllForRole(role: string, userId?: number) {
    let query = `
      SELECT p.id, p.estado, p.creado_en, m.numero as mesa_numero, u.nombre as mozo
      FROM pedidos p
      JOIN mesas m ON p.mesa_id = m.id
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.estado IN ('pendiente', 'preparando', 'listo', 'servido')
    `;

    if (role === 'mozo') {
      query += ' AND p.usuario_id = ?';
      const [rows] = await pool.execute(query, [userId]);
      return rows;
    } else if (role === 'cocina') {
      query += " AND p.estado IN ('pendiente', 'preparando')";
      const [rows] = await pool.execute(query);
      return rows;
    } else {
      const [rows] = await pool.execute(query);
      return rows;
    }
  }

  static async getById(id: number) {
    const [pedidoRows] = await pool.execute(
      `SELECT p.id, p.estado, p.creado_en, m.numero as mesa_numero, u.nombre as mozo
       FROM pedidos p
       JOIN mesas m ON p.mesa_id = m.id
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if ((pedidoRows as any[]).length === 0) return null;

    const pedido = (pedidoRows as any[])[0];

    const [detalleRows] = await pool.execute(
      `SELECT pd.cantidad, me.nombre, me.descripcion, me.precio, pd.observaciones
       FROM pedido_detalles pd
       JOIN menu me ON pd.plato_id = me.id
       WHERE pd.pedido_id = ?`,
      [id]
    );

    return { ...pedido, platos: detalleRows };
  }

  static async updateStatus(id: number, estado: string) {
    await pool.execute('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, id]);
  }

  static async getPedidosListosParaMozo(userId: number) {
    const [rows] = await pool.execute(
      `SELECT p.id, p.mesa_id, m.numero as mesa_numero, p.creado_en
       FROM pedidos p
       JOIN mesas m ON p.mesa_id = m.id
       WHERE p.usuario_id = ? AND p.estado = 'listo'`,
      [userId]
    );
    return rows;
  }
}