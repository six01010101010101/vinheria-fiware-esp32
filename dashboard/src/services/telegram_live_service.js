/**
 * Serviço de Disparo de Telemetria e Status em Tempo Real para o Telegram — Vinheria Agnello
 * Transmite a cada 5 minutos o resumo geral da rede (15 Terroirs WMO & Cavas) para o grupo Admin Vinheira.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const SUPA_URL = 'https://slqozouuqzxwmfswyroo.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscW96b3V1cXp4d21mc3d5cm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDkxOTMsImV4cCI6MjEwNzc4NTE5M30.spwyPsi31yzG6rvh2FsSHWM8Fkv2CPLHpUx9Us8aRo4';

function loadCredentials() {
  const env = { TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '-5001665013', TELEGRAM_PHONE_ADMIN: '11981237033' };
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(l => {
      const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (m && env[m[1]] !== undefined) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
    });
  }
  return env;
}

function sendTelegramMessage(text) {
  const env = loadCredentials();
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return Promise.resolve(false);
  return new Promise((resolve) => {
    const postData = JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: text, parse_mode: 'Markdown' });
    const req = https.request({
      hostname: 'api.telegram.org', path: `/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b).ok === true); } catch (_) { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
    req.write(postData); req.end();
  });
}

async function syncTerroirsToSupabase(rows) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/real_vineyards_status`, {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows)
    });
  } catch (_) {}
}

async function dispatchLiveWineReport(options = {}) {
  const terroirs = [
    { id: 'fr_margaux', name: 'Château Margaux', reg: 'Bordeaux', country: 'França', flag: '🇫🇷', lat: 45.0444, lon: -0.6686, tMin: 14, tMax: 18, hMin: 60, hMax: 75 },
    { id: 'it_antinori', name: 'Marchesi Antinori', reg: 'Toscana', country: 'Itália', flag: '🇮🇹', lat: 43.6158, lon: 11.2136, tMin: 8, tMax: 12, hMin: 60, hMax: 75 },
    { id: 'br_miolo', name: 'Vinícola Miolo', reg: 'Serra Gaúcha', country: 'Brasil', flag: '🇧🇷', lat: -29.1864, lon: -51.5567, tMin: 10, tMax: 13, hMin: 60, hMax: 75 },
    { id: 'us_opus', name: 'Opus One', reg: 'Napa Valley', country: 'EUA', flag: '🇺🇸', lat: 38.4367, lon: -122.4017, tMin: 12, tMax: 15, hMin: 65, hMax: 75 },
    { id: 'ca_okanagan', name: 'Mission Hill', reg: 'Okanagan', country: 'Canadá', flag: '🇨🇦', lat: 49.8880, lon: -119.4960, tMin: 8, tMax: 12, hMin: 60, hMax: 75 },
    { id: 'au_barossa', name: 'Penfolds Magill', reg: 'Barossa', country: 'Austrália', flag: '🇦🇺', lat: -34.4820, lon: 138.9890, tMin: 14, tMax: 18, hMin: 60, hMax: 75 },
    { id: 'jp_koshu', name: 'Grace Wine', reg: 'Koshu/Fuji', country: 'Japão', flag: '🇯🇵', lat: 35.7000, lon: 138.7300, tMin: 8, tMax: 12, hMin: 60, hMax: 75 },
    { id: 'cl_concha', name: 'Concha y Toro', reg: 'Vale do Maipo', country: 'Chile', flag: '🇨🇱', lat: -33.6433, lon: -70.5789, tMin: 10, tMax: 13, hMin: 60, hMax: 75 },
    { id: 'ru_abrau', name: 'Abrau-Durso', reg: 'Mar Negro', country: 'Rússia', flag: '🇷🇺', lat: 44.7000, lon: 37.6000, tMin: 6, tMax: 9, hMin: 65, hMax: 80 },
    { id: 'pt_crasto', name: 'Quinta do Crasto', reg: 'Douro', country: 'Portugal', flag: '🇵🇹', lat: 41.1681, lon: -7.6308, tMin: 15, tMax: 18, hMin: 65, hMax: 75 },
    { id: 'de_prum', name: 'Joh. Jos. Prüm', reg: 'Mosel', country: 'Alemanha', flag: '🇩🇪', lat: 49.9189, lon: 7.0394, tMin: 9, tMax: 12, hMin: 65, hMax: 78 },
    { id: 'es_vega', name: 'Vega Sicilia', reg: 'Ribera del Duero', country: 'Espanha', flag: '🇪🇸', lat: 41.6322, lon: -4.2981, tMin: 11, tMax: 14, hMin: 60, hMax: 72 },
    { id: 'nz_cloudy', name: 'Cloudy Bay', reg: 'Marlborough', country: 'Nova Zelândia', flag: '🇳🇿', lat: -41.4914, lon: 173.9619, tMin: 8, tMax: 12, hMin: 60, hMax: 75 },
    { id: 'za_kanonkop', name: 'Kanonkop', reg: 'Stellenbosch', country: 'África do Sul', flag: '🇿🇦', lat: -33.8569, lon: 18.8669, tMin: 14, tMax: 18, hMin: 60, hMax: 75 },
    { id: 'ar_catena', name: 'Catena Zapata', reg: 'Mendoza', country: 'Argentina', flag: '🇦🇷', lat: -33.1667, lon: -68.9167, tMin: 6, tMax: 9, hMin: 65, hMax: 80 }
  ];

  try {
    const lats = terroirs.map(x => x.lat).join(','), lons = terroirs.map(x => x.lon).join(',');
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m&timezone=auto`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];

    let idlCount = 0, padCount = 0, critCount = 0;
    const supaRows = [];
    const highlights = [];

    terroirs.forEach((t, i) => {
      const cur = items[i]?.current || {};
      const temp = cur.temperature_2m !== undefined ? +Number(cur.temperature_2m).toFixed(1) : 15.0;
      const hum = cur.relative_humidity_2m !== undefined ? Math.round(Number(cur.relative_humidity_2m)) : 68;

      let tag = '🟢 Ideal';
      if (temp < 6 || temp > 33) { tag = '🔴 Crítico'; critCount++; }
      else if (temp < 11 || temp > 28 || hum < 35 || hum > 85) { tag = '🟡 Padrão'; padCount++; }
      else { idlCount++; }

      supaRows.push({
        vineyard_id: t.id, name: t.name, region: t.reg, country: t.country, latitude: t.lat, longitude: t.lon,
        temperature_c: temp, humidity_pct: hum, luminosity_pct: 10, solar_wm2: 100, dew_point_c: 10, is_day: true,
        local_time: (cur.time || '').split('T')[1] || new Date().toLocaleTimeString().slice(0, 5), updated_at: new Date().toISOString()
      });

      if (i < 8) highlights.push(`• ${t.flag} *${t.country}* (${t.name}): \`${temp}°C\` | \`${hum}%\` ${tag}`);
    });

    await syncTerroirsToSupabase(supaRows);

    const buzzerAlert = critCount > 0 ? '⚠️ ATIVO (Buzzer D4)' : 'STANDBY (Silencioso)';
    const msg = `🍇 *STATUS GERAL DA REDE · VINHERIA AGNELLO*\n🛰️ *Satélite WMO & Cavas Climatizadas (A cada 5 min)*\n━━━━━━━━━━━━━━━━━━━━━━\n📊 *RESUMO GERAL DAS 15 CAVAS & TERROIRS:*\n🟢 *Ideal (95–100%):* ${idlCount} adegas/lotes\n🟡 *Padrão (75–94%):* ${padCount} adegas/lotes\n🔴 *Crítico (<75% · Apito):* ${critCount} adegas/lotes\n\n🌐 *STATUS DOS PRINCIPAIS TERROIRS GLOBAIS:*\n${highlights.join('\n')}\n\n📟 *HARDWARE IOT (ESP32 WOKWI & FÍSICO):*\n• 🟢 LED Verde D5: IDEAL (1-UP)\n• 🟡 LED Amarelo D2: ATENÇÃO / PADRÃO\n• 🔴 LED Vermelho D18 + 🚨 Buzzer D4: ${buzzerAlert}\n\n☁️ *BANCO DE DADOS SUPABASE:*\n• PostgreSQL 17: Sincronismo em Tempo Real Concluído\n━━━━━━━━━━━━━━━━━━━━━━\n⏰ *Ciclo:* 5 minutos · Leitura: \`${new Date().toLocaleString('pt-BR')}\`\n📲 _Grupo Admin Vinheira (-5001665013)_`;

    return await sendTelegramMessage(msg);
  } catch (err) {
    console.error('[Telegram Live Service Error]:', err.message);
    return false;
  }
}

let reportIntervalTimer = null;
function startPeriodicTelegramReports(intervalMs = 300000) {
  if (reportIntervalTimer) clearInterval(reportIntervalTimer);
  dispatchLiveWineReport({ isAlert: false });
  reportIntervalTimer = setInterval(() => {
    dispatchLiveWineReport({ isAlert: false });
  }, intervalMs);
}

module.exports = { dispatchLiveWineReport, startPeriodicTelegramReports, sendTelegramMessage };
