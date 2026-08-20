#!/usr/bin/env node
/**
 * Gridman Console 轻量 HTTP 服务器
 * 用法: node serve.js [root_directory]
 * 默认端口 3721，默认目录为当前目录
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3721;
const ROOT = path.resolve(process.argv[2] || '.').replace(/[\\/]+$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // CORS 允许（本地用）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 预检
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // POST /manifest.json — 写入
  if (req.method === 'POST' && req.url === '/manifest.json') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        JSON.parse(body); // 验证是合法 JSON
        fs.writeFileSync(path.join(ROOT, 'manifest.json'), body, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end('{"error":"' + e.message + '"}');
      }
    });
    return;
  }

  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/console.html';

  const filePath = path.join(ROOT, urlPath);

  // 安全检查：不允许跳出根目录
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // 目录列表（用于 mind/ evidence/ 等子目录）
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    try {
      const files = fs.readdirSync(filePath);
      const html = files.map(f => `<a href="${urlPath.replace(/\/$/, '')}/${f}">${f}</a>`).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<html><body><pre>${html}</pre></body></html>`);
    } catch (e) {
      res.writeHead(500);
      res.end('Error');
    }
    return;
  }

  // 文件
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch (e) {
    res.writeHead(500);
    res.end('Error: ' + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`  Gridman Console Server`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Root: ${ROOT}`);
  console.log(`  console.html exists: ${fs.existsSync(path.join(ROOT, 'console.html'))}`);
  console.log(`  Press Ctrl+C to stop.`);
});

// 无活动自动退出（60秒无请求）
let lastActivity = Date.now();
const IDLE_TIMEOUT = 3 * 60 * 1000;
server.on('request', () => { lastActivity = Date.now(); });
setInterval(() => {
  if (Date.now() - lastActivity > IDLE_TIMEOUT) { process.exit(0); }
}, 10000);
