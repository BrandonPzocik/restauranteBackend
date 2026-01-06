// backend/src/models/Venta.ts
import pool from '../config/db';

export class Venta {
  static async cerrarCuenta(mesaId: number, userId: number, total: number, impuestos: number, formaPago: string, platos: any[]) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // 1. Crear la venta
      const [ventaResult] = await conn.execute(
        'INSERT INTO ventas (mesa_id, usuario_id, total, impuestos, forma_pago) VALUES (?, ?, ?, ?, ?)',
        [mesaId, userId, total, impuestos, formaPago]
      );
      const ventaId = (ventaResult as any).insertId;

      // 2. Insertar detalles de la venta
      for (const item of platos) {
        // Asegurar que ningún valor sea undefined
        const platoId = item.platoId ?? item.id ?? null;
        const precio = item.precio ?? 0;
        const cantidad = item.cantidad ?? 1;
        const observaciones = item.observaciones ?? null;

        // Validar que platoId no sea null
        if (platoId === null) {
          throw new Error('platoId es requerido');
        }

        await conn.execute(
          'INSERT INTO venta_detalles (venta_id, plato_id, cantidad, precio_unitario, observaciones) VALUES (?, ?, ?, ?, ?)',
          [ventaId, platoId, cantidad, precio, observaciones]
        );
      }

      // 3. Marcar pedidos como "cobrado"
      await conn.execute(
        'UPDATE pedidos SET estado = ? WHERE mesa_id = ? AND estado != ?',
        ['cobrado', mesaId, 'cancelado']
      );

      await conn.commit();
      return ventaId;
    } catch (err) {
      await conn.rollback();
      console.error('Error en cerrarCuenta:', err);
      throw new Error('Error al procesar el cierre de cuenta');
    } finally {
      conn.release();
    }
  }
}