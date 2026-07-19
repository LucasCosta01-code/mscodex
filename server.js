/** Servidor estático opcional (sem dependências). A loja/admin rodam só com HTML/CSS/JS. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

function mapPath(urlPath) {
  const clean = decodeURIComponent((urlPath || '/').split('?')[0]);
  if (clean === '/' || clean === '') return path.join(ROOT, 'index.html');
  if (clean === '/loja' || clean === '/loja/') return path.join(ROOT, 'loja.html');
  if (clean === '/admin' || clean === '/admin/') return path.join(ROOT, 'admin.html');
  const full = path.normalize(path.join(ROOT, clean));
  if (!full.startsWith(ROOT)) return null;
  return full;
}

http
  .createServer((req, res) => {
    const filePath = mapPath(req.url);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
    console.log(`Loja:  http://localhost:${PORT}/loja.html`);
    console.log(`Admin: http://localhost:${PORT}/admin.html`);
  });
