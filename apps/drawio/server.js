import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.drawio': 'application/xml'
};

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(data),
      'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL pathname
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  // Healthcheck endpoint (FynnCloud deploy readiness probe)
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Avoid serving index.html for missing source maps
  if (pathname.endsWith('.map')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  // Explicit route handling for the icon across subpaths or proxy depth.
  // (The App Bridge library is not served here: it is loaded from the @fynncloud/app-bridge npm package via CDN.)
  if (pathname.endsWith('/icon.svg')) {
    serveFile(res, path.join(PUBLIC_DIR, 'icon.svg'), MIME_TYPES['.svg']);
    return;
  }

  // Resolve file path within public/
  const requestedFile = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidatePath = path.resolve(PUBLIC_DIR, requestedFile);

  // Directory traversal defense
  if (!candidatePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(candidatePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(candidatePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      serveFile(res, candidatePath, mime);
    } else {
      // SPA Fallback: serve index.html for navigation subpaths (/new, /edit, etc.)
      serveFile(res, path.join(PUBLIC_DIR, 'index.html'), MIME_TYPES['.html']);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 FynnCloud Diagrams.net App running at http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && Number(PORT) === 8080) {
    console.warn('⚠️  Port 8080 occupied. Falling back to port 3060 for standalone preview...');
    server.listen(3060, '0.0.0.0', () => {
      console.log('🎨 FynnCloud Diagrams.net App running at http://localhost:3060');
    });
  } else {
    console.error('Server error:', err);
  }
});
