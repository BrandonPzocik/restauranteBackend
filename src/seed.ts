// backend/src/seed.ts
import pool from './config/db';
import bcrypt from 'bcryptjs';

async function seed() {
  const usuarios = [

    { nombre: 'Mozo Juan', email: 'juan@resto.com', password: 'juan123', rol: 'mozo' },
    { nombre: 'Cajero', email: 'cajero@resto.com', password: 'cajero123', rol: 'cajero' }

  ];

  for (const u of usuarios) {
    try {
      const hashed = await bcrypt.hash(u.password, 10);
      await pool.execute(
        'INSERT IGNORE INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        [u.nombre, u.email, hashed, u.rol]
      );
      console.log(`   👤 ${u.nombre} (${u.email}) - Rol: ${u.rol}`);
    } catch (err) {
      console.log(`   ⚠️  Usuario ${u.email} ya existe`);
    }
  }
}

seed().catch(console.error);