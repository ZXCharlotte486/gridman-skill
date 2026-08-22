#!/usr/bin/env node
/**
 * Gridman Console 轻量 HTTP 服务器
 * 用法: node serve.js [user_data_directory]
 * 默认端口 3721，默认目录为当前目录
 *
 * 路由逻辑：
 *   console.html → 从 gridman-skill/ 读（git 管 UI）
 *   manifest.json / mind/ / evidence/ → 从 user-data/ 读写（用户数据）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3721;
const USER_DATA = path.resolve(process.argv[2] || '.').replace(/[\\/]+$/, '');
const SKILL_DIR = path.resolve(__dirname, '..');

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

// 判断请求应该从哪个目录读
function resolveFilePath(urlPath) {
  // console.html 始终从 skill 仓库读
  if (urlPath === '/console.html' || urlPath === '/') {
    return path.join(SKILL_DIR, 'console.html');
  }
  // 其余文件从 user-data 读（manifest.json, mind/, evidence/ 等）
  return path.join(USER_DATA, urlPath);
}

const server = http.createServer((req, res) => {
  // CORS 允许（本地用）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 预检
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // POST /manifest.json — 写入 user-data
  if (req.method === 'POST' && req.url === '/manifest.json') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        JSON.parse(body); // 验证是合法 JSON
        fs.writeFileSync(path.join(USER_DATA, 'manifest.json'), body, 'utf-8');
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

  const filePath = resolveFilePath(urlPath);

  // 安全检查：不允许跳出合法目录
  if (!filePath.startsWith(USER_DATA) && !filePath.startsWith(SKILL_DIR)) {
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
  console.log(`  UI:   ${SKILL_DIR}/console.html`);
  console.log(`  Data: ${USER_DATA}`);
  console.log(`  Press Ctrl+C to stop.`);
});

// 无活动自动退出（3分钟无请求）
let lastActivity = Date.now();
const IDLE_TIMEOUT = 3 * 60 * 1000;
server.on('request', () => { lastActivity = Date.now(); });
setInterval(() => {
  if (Date.now() - lastActivity > IDLE_TIMEOUT) { process.exit(0); }
}, 10000);
