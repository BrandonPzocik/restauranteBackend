// backend/src/seed.ts
import pool from './config/db';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Creando usuarios iniciales...');

  const usuarios = [
    
    { nombre: 'Mozo Carlos', email: 'carlos@resto.com', password: 'carlos123', rol: 'mozo' },
    { nombre: 'Mozo Juan ', email: 'juan@resto.com', password: 'juan123', rol: 'mozo' },
   
  ];

  for (const u of usuarios) {
    const hashed = await bcrypt.hash(u.password, 10);
    try {
      await pool.execute(
        'INSERT IGNORE INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        [u.nombre, u.email, hashed, u.rol]
      );
      console.log(`✅ ${u.rol}: ${u.email}`);
    } catch (err) {
      console.log(`⚠️  ${u.email} ya existe`);
    }
  }

  console.log('\n🎉 ¡Usuarios creados exitosamente!');
  console.log('\nCredenciales de prueba:');
  console.log('  👔 Admin: admin@resto.com / admin123');
  console.log('  👨‍💼 Mozo 1: mozo1@resto.com / mozo123');
  console.log('  👨‍💼 Mozo Juan: juan@resto.com / juan123');
  console.log('  👨‍🍳 Cocina: cocina@resto.com / cocina123');
  console.log('  💰 Cajero: cajero@resto.com / cajero123');
}

seed().catch(console.error);