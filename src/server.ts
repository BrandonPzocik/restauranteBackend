// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import authRoutes from './routes/authRoutes';
import menuRoutes from './routes/menuRoutes';
import mesaRoutes from './routes/mesaRoutes';
import pedidoRoutes from './routes/pedidoRoutes';
import ventaRoutes from './routes/ventaRoute';
import reportesRoutes from './routes/reportesRoutes';
import cajeroRoutes from './routes/cajeroRoutes'; // ← ¡Importante!

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Rutas - ¡El orden importa!
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/cajero', cajeroRoutes); // ← ¡Debe estar aquí!

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});