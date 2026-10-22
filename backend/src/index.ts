import { createApp } from './app';
import { seedDatabase } from './db/seed';

const PORT = process.env.PORT || 4000;
const app = createApp();

const server = app.listen(PORT, async () => {
  console.log(`🚀 Servidor Kroma Lab API ejecutándose en http://localhost:${PORT}`);
  console.log(`📑 Health check disponible en http://localhost:${PORT}/api/health`);
  try {
    await seedDatabase();
  } catch (err) {
    console.error('Error al inicializar datos semilla en arranque:', err);
  }
});

process.on('SIGTERM', () => {
  console.log('Cerrando servidor HTTP...');
  server.close(() => {
    console.log('Servidor finalizado.');
  });
});
