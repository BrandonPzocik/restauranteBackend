import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import authRoutes from './routes/authRoutes';
import menuRoutes from './routes/menuRoutes';
import mesaRoutes from './routes/mesaRoutes';
import pedidoRoutes from './routes/pedidoRoutes';
import ventaRoutes from './routes/ventaRoute'; // ← Corregido: "ventaRoutes", no "ventaRoute"
import reportesRoutes from './routes/reportesRoutes';
import cajeroRoutes from './routes/cajeroRoutes';

// Cargar variables de entorno
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: '*' }
});

// Middleware para inyectar io en req (¡clave para usar en controladores!)
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/cajero', cajeroRoutes);

// Socket.IO
io.on('connection', (socket: any) => {
  console.log('✅ Usuario conectado:', socket.id);

  socket.on('join-cocina', () => {
    socket.join('cocina');
    console.log(`🍽️ Usuario ${socket.id} se unió a la sala de cocina`);
    // Verificar que se unió correctamente
    const rooms = Array.from(io.sockets.adapter.socketRooms(socket.id) || []);
    console.log(`📋 Socket ${socket.id} está en las salas:`, rooms);
    
    // Verificar cuántos sockets hay en la sala de cocina
    const cocinaRoom = io.sockets.adapter.rooms.get('cocina');
    if (cocinaRoom) {
      console.log(`👥 Total de sockets en sala "cocina": ${cocinaRoom.size}`);
    }
  });

  socket.on('nuevo-pedido', (data: any) => {
    console.log('🔔 Nuevo pedido emitido a cocina:', data);
    io.to('cocina').emit('nuevo-pedido', data);
  });

  socket.on('pedido-listo', (data: any) => {
    console.log('✅ Pedido listo emitido a todos:', data);
    io.emit('pedido-listo', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ Usuario desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});