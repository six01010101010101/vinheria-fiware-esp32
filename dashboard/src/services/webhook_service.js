/**
 * Handler Otimizado de Webhooks - Vinheria Agnello CP5
 * Resposta Imediata HTTP 200, Idempotência no Supabase e Notificações Telegram.
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

const processedMemoryCache = new Set();
const SUPABASE_URL = 'https://slqozouuqzxwmfswyroo.supabase.co';

function getCredentials() {
  const env = {
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_CHAT_ID: '-5001665013',
    SUPABASE_SERVICE_KEY: ''
  };
  const envPath = path.join(__dirname, '../../../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(l => {
      const match = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const k = match[1], v = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
        if (k === 'TELEGRAM_BOT_TOKEN') env.TELEGRAM_BOT_TOKEN = v;
        if (k === 'TELEGRAM_CHAT_ID') env.TELEGRAM_CHAT_ID = v;
        if (k === 'SUPABASE_ANON_KEY' || k === 'SUPABASE_KEY' || k === 'SUPABASE_SERVICE_ROLE_KEY') env.SUPABASE_SERVICE_KEY = v;
      }
    });
  }
  return env;
}

function sendTelegram(token, chatId, text) {
  if (!token || !chatId) return Promise.resolve(false);
  return new Promise(resolve => {
    const payload = JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

async function checkSupabaseEvent(url, key, eventId) {
  if (!key) return false;
  return new Promise(resolve => {
    const endpoint = `${url}/rest/v1/vine_webhook_events?event_id=eq.${encodeURIComponent(eventId)}&select=id`;
    const req = https.get(endpoint, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          resolve(Array.isArray(list) && list.length > 0);
        } catch (_) { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
  });
}

async function insertSupabaseEvent(url, key, eventId, payload) {
  if (!key) return false;
  return new Promise(resolve => {
    const postData = JSON.stringify({
      event_id: eventId,
      event_type: payload.type || payload.event || 'webhook',
      payload: payload,
      processed: true
    });
    const req = https.request(`${url}/rest/v1/vine_webhook_events`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    }, res => {
      res.resume();
      resolve(res.statusCode === 201 || res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.write(postData);
    req.end();
  });
}

async function handleWebhookRequest(req, res) {
  try {
    const payload = req.body || {};
    const eventId = String(payload.id || payload.transaction_id || payload.event_id || ('evt_' + Date.now()));

    // 1. RESPOSTA IMEDIATA (Evita Timeout do serviço de origem)
    if (typeof res.status === 'function') {
      res.status(200).send({ received: true, event_id: eventId });
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true, event_id: eventId }));
    }

    // 2. IDEMPOTÊNCIA (Evita duplicação e spam no Telegram)
    if (processedMemoryCache.has(eventId)) {
      console.log(`[Webhook] Evento ${eventId} já processado em memória. Ignorando.`);
      return;
    }
    processedMemoryCache.add(eventId);
    if (processedMemoryCache.size > 2000) {
      const oldest = processedMemoryCache.values().next().value;
      processedMemoryCache.delete(oldest);
    }

    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_SERVICE_KEY } = getCredentials();
    const alreadyProcessed = await checkSupabaseEvent(SUPABASE_URL, SUPABASE_SERVICE_KEY, eventId);
    if (alreadyProcessed) {
      console.log(`[Webhook] Evento ${eventId} já registrado no Supabase. Ignorando.`);
      return;
    }

    // 3. PERSISTÊNCIA NO SUPABASE & NOTIFICAÇÃO NO TELEGRAM
    await insertSupabaseEvent(SUPABASE_URL, SUPABASE_SERVICE_KEY, eventId, payload);

    const title = payload.title || payload.event || 'Notificação Externa de Webhook';
    const terroir = payload.terroir || payload.lot_code || 'Geral';
    const status = payload.status || 'INFO';
    const msg = `🔔 *WEBHOOK RECEBIDO · VINHERIA AGNELLO*\n━━━━━━━━━━━━━━━━━━━━━━\n📌 *Evento:* \`${title}\`\n🆔 *ID:* \`${eventId}\`\n📍 *Origem/Terroir:* ${terroir}\n⚡ *Status:* \`${status}\`\n⏰ *Data:* \`${new Date().toLocaleString('pt-BR')}\`\n━━━━━━━━━━━━━━━━━━━━━━\n📲 _Grupo Admin Vinheira (${TELEGRAM_CHAT_ID})_`;

    await sendTelegram(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, msg);
    console.log(`[Webhook] Evento ${eventId} processado com sucesso.`);

  } catch (error) {
    // 4. TRATAMENTO DE FALHAS SILENCIOSO
    console.error('[Erro no Hook]:', error.message);
  }
}

module.exports = { handleWebhookRequest };
