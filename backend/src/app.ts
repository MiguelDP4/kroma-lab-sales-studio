import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import ordersRoutes from './routes/orders.routes';
import customersRoutes from './routes/customers.routes';
import dispatchRoutes from './routes/dispatch.routes';
import inventoryRoutes from './routes/inventory.routes';
import receivablesRoutes from './routes/receivables.routes';
import workshopRoutes from './routes/workshop.routes';
import quotesRoutes from './routes/quotes.routes';
import storageRoutes from './routes/storage.routes';
import cartRoutes from './routes/cart.routes';
import { errorHandler } from './middlewares/errorHandler';
import { prisma } from './db/prisma';

dotenv.config();

export function createApp(): Express {
  const app = express();

  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permisivo en desarrollo local
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Endpoint de Salud y Estado
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      // Verificación rápida de conexión a BD
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        service: 'Kroma Lab Sales Studio API',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (e: any) {
      res.status(500).json({
        status: 'error',
        service: 'Kroma Lab Sales Studio API',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: e.message,
      });
    }
  });

  // Rutas de API
  app.use('/api/auth', authRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/dispatch', dispatchRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/receivables', receivablesRoutes);
  app.use('/api/workshop', workshopRoutes);
  app.use('/api/quotes', quotesRoutes);
  app.use('/api/storage', storageRoutes);
  app.use('/api/cart', cartRoutes);

  // Manejador centralizado de errores
  app.use(errorHandler);

  return app;
}

export default createApp;
