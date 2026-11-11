import { createApp } from './app';
import { ensureDefaultSystemSettings } from './db/seed';

const PORT = process.env.PORT || 4000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor Kroma Lab API ejecutándose en http://localhost:${PORT}`);
  console.log(`📑 Health check disponible en http://localhost:${PORT}/api/health`);

  ensureDefaultSystemSettings()
    .then(() => console.log('✅ Parámetros base del sistema (SystemSetting) verificados.'))
    .catch((err) => console.error('⚠️ Error al verificar SystemSetting al iniciar:', err));
});

process.on('SIGTERM', () => {
  console.log('Cerrando servidor HTTP...');
  server.close(() => {
    console.log('Servidor finalizado.');
  });
});
