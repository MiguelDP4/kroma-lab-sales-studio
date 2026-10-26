import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');
const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(FRONTEND_DIR, urlPath === '/' ? 'index.html' : urlPath);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA Fallback: Servir index.html para cualquier ruta interna (/software, /pedidos, etc.)
    const indexPath = path.join(FRONTEND_DIR, 'index.html');
    fs.readFile(indexPath, (errIndex, content) => {
      if (errIndex) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error al cargar index.html');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`🌐 Servidor Frontend Kroma Lab ejecutándose en http://localhost:${PORT}`);
  console.log(`🚀 Landing Kroma Spot Studio disponible en http://localhost:${PORT}/software`);
});
