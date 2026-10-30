/**
 * Servidor Local HTTP Plug-and-Play (Node.js) - Vinheria Agnello CP5
 * Porta padrão: 8050 (http://localhost:8050 ou http://127.0.0.1:8050)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { dispatchLiveWineReport, startPeriodicTelegramReports } = require('./dashboard/src/services/telegram_live_service');
const { handleWebhookRequest } = require('./dashboard/src/services/webhook_service');
const { handleHardwareRequest } = require('./dashboard/src/services/hardware_bridge_service');

const PORT = 8050;
const ROOT_DIR = __dirname;

function loadEnvCredentials() {
  const env = { TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '', TELEGRAM_PHONE_ADMIN: '11981237033' };
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(l => {
      const match = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const k = match[1], v = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
        if (env[k] !== undefined) env[k] = v;
      }
    });
  }
  return env;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

let lastTelegramAlertTime = 0;

const server = http.createServer((req, res) => {
  let cleanUrl = decodeURI(req.url.split('?')[0]);
  if (handleHardwareRequest(req, res, cleanUrl)) return;

  // Endpoint API Telegram unificado: despacha exclusivamente o Boletim Detalhado da Rede
  if (cleanUrl === '/api/v1/telegram/alert' && req.method === 'POST') {
    dispatchLiveWineReport().then(ok => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok, message: ok ? 'Boletim detalhado transmitido ao Telegram!' : 'Falha ao despachar boletim' }));
    }).catch(err => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    });
    return;
  }

  // Endpoint de Webhook Otimizado (Idempotência Supabase + Alerta Telegram)
  if ((cleanUrl === '/api/v1/webhook' || cleanUrl === '/webhook') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { req.body = JSON.parse(body || '{}'); } catch (_) { req.body = {}; }
      handleWebhookRequest(req, res);
    });
    return;
  }

  // Disparo manual/automático do boletim completo de terroirs
  if (cleanUrl === '/api/v1/telegram/broadcast' && req.method === 'POST') {
    dispatchLiveWineReport({ isAlert: false }).then(ok => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok, message: ok ? 'Boletim em tempo real transmitido ao grupo Admin Vinheira!' : 'Falha ao despachar boletim' }));
    });
    return;
  }

  // Redirecionamento amigavel de rotas principais e sub-pastas de API
  if (cleanUrl === '/' || cleanUrl === '') cleanUrl = '/index.html';
  else if (cleanUrl === '/dashboard' || cleanUrl === '/dash') cleanUrl = '/dashboard.html';
  else if (cleanUrl === '/api/v1/status' || cleanUrl === '/api/v1/status/') cleanUrl = '/api/v1/status/index.html';
  else if (cleanUrl === '/api/v1/lots' || cleanUrl === '/api/v1/lots/') cleanUrl = '/api/v1/lots/index.html';
  else if (cleanUrl === '/api/v1/cloud/firebase' || cleanUrl === '/api/v1/cloud/firebase/') cleanUrl = '/api/v1/cloud/firebase/index.html';
  else if (cleanUrl === '/api/v1/cloud/supabase' || cleanUrl === '/api/v1/cloud/supabase/' || cleanUrl === '/api/v1/supabase' || cleanUrl === '/supabase') cleanUrl = '/api/v1/cloud/supabase/index.html';
  else if (cleanUrl === '/api/v1/cloud' || cleanUrl === '/api/v1/cloud/') cleanUrl = '/api/v1/cloud/firebase/index.html';
  else if (cleanUrl === '/api/v1/openapi' || cleanUrl === '/openapi.json') cleanUrl = '/api/v1/openapi.json';

  let filePath = path.normalize(path.join(ROOT_DIR, cleanUrl));
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Proibido');
    return;
  }

  // Resolve automaticamente index.html se for um diretorio
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const idx = path.join(filePath, 'index.html');
    if (fs.existsSync(idx)) filePath = idx;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Não Encontrado: ${cleanUrl}`);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Vinheria Agnello] Servidor ativo em http://localhost:${PORT}`);
  console.log(`[Vinheria Agnello] Dashboard SCADA em http://localhost:${PORT}/dashboard.html`);
  startPeriodicTelegramReports(300000);
});
