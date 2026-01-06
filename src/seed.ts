// backend/src/seed.ts
import pool from './config/db';
import bcrypt from 'bcryptjs';

async function seed() {
   // 2. Crear mesas (1 a 10)
   console.log('✅ Creando mesas...');
   const mesas = [
     { numero: 1, capacidad: 2 },
     { numero: 2, capacidad: 2 },
     { numero: 3, capacidad: 4 },
     { numero: 4, capacidad: 4 },
     { numero: 5, capacidad: 4 },
     { numero: 6, capacidad: 6 },
     { numero: 7, capacidad: 6 },
     { numero: 8, capacidad: 8 },
     { numero: 9, capacidad: 2 },
     { numero: 10, capacidad: 4 }
   ];
 
   for (const m of mesas) {
     try {
       await pool.execute(
         'INSERT IGNORE INTO mesas (numero, capacidad) VALUES (?, ?)',
         [m.numero, m.capacidad]
       );
       console.log(`   🪑 Mesa ${m.numero} (${m.capacidad} pers)`);
     } catch (err) {
       console.log(`   ⚠️  Mesa ${m.numero} ya existe`);
     }
   }
 
   
   // 3. Crear menú
   console.log('✅ Cargando menú...');
   const platos = [
     { nombre: 'Milanesa Napolitana', descripcion: 'Milanesa de carne con salsa de tomate, jamón y queso derretido', precio: 2800 },
     { nombre: 'Fideos con Salsa', descripcion: 'Fideos caseros con salsa de tomate fresca y albahaca', precio: 1900 },
     { nombre: 'Hamburguesa Clásica', descripcion: 'Carne de vacuno, lechuga, tomate, queso cheddar y pan artesanal', precio: 2500 },
     { nombre: 'Ensalada César', descripcion: 'Lechuga romana, pollo a la parrilla, crutones, parmesano y salsa césar', precio: 2100 },
     { nombre: 'Pizza Margarita', descripcion: 'Masa fina, salsa de tomate, mozzarella y albahaca fresca', precio: 2700 },
     { nombre: 'Tarta de Verduras', descripcion: 'Tarta horneada con espinaca, cebolla, calabaza y queso cremoso', precio: 1800 },
     { nombre: 'Agua Mineral', descripcion: 'Agua sin gas 500ml', precio: 400 },
     { nombre: 'Gaseosa', descripcion: 'Coca-Cola, Sprite o Fanta 500ml', precio: 600 },
     { nombre: 'Café Expreso', descripcion: 'Café intenso y aromático', precio: 500 },
     { nombre: 'Brownie con Helado', descripcion: 'Brownie casero con helado de vainilla y salsa de chocolate', precio: 1500 }
   ];
 
   for (const p of platos) {
     try {
       await pool.execute(
         'INSERT IGNORE INTO menu (nombre, descripcion, precio) VALUES (?, ?, ?)',
         [p.nombre, p.descripcion, p.precio]
       );
       console.log(`   🍽️  ${p.nombre} - $${p.precio}`);
     } catch (err) {
       console.log(`   ⚠️  ${p.nombre} ya existe`);
     }
   }

  console.log('🎉 creando mesas y platos.');
  process.exit(0);
}

seed().catch(console.error);