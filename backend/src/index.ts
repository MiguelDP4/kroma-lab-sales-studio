import { createApp } from './app';

const PORT = process.env.PORT || 4000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor Kroma Lab API ejecutándose en http://localhost:${PORT}`);
  console.log(`📑 Health check disponible en http://localhost:${PORT}/api/health`);
});

process.on('SIGTERM', () => {
  console.log('Cerrando servidor HTTP...');
  server.close(() => {
    console.log('Servidor finalizado.');
  });
});
