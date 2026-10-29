/**
 * Serviço de Integração de Hardware Físico & Ponte SCADA / Wokwi / Supabase
 * Vinheria Agnello — Suporte a Arduino Físico (USB Serial) e ESP32 (Wi-Fi/MQTT)
 */
const https = require('https');

const SUPABASE_URL = "slqozouuqzxwmfswyroo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscW96b3V1cXp4d21mc3d5cm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDkxOTMsImV4cCI6MjEwNzc4NTE5M30.spwyPsi31yzG6rvh2FsSHWM8Fkv2CPLHpUx9Us8aRo4";

let hardwareState = {
  temperature: 15.8,
  humidity: 68.0,
  luminosity: 9.0,
  stateKey: "ideal",
  score: 100,
  preset: "TINTO",
  presetKey: "tinto",
  terroir: "Château Margaux",
  country: "França",
  lotCode: "LOTE-FR-MARGAUX-01",
  leds: { green: 1, yellow: 0, red: 0 },
  buzzer: { active: false, melody: "Sonata ao Luar (Beethoven)", pin: 4 },
  lcd: { line1: "T:15.8C U:68%", line2: "TINTO 1UP:100%" },
  source: "Web SCADA / Wokwi Twin",
  updatedAt: new Date().toISOString()
};

function computeActuators(stateKey, score, preset = "TINTO", t = 15.8, h = 68, l = 9) {
  const isCrit = stateKey === "critico" || score < 75;
  const isPad = !isCrit && (stateKey === "padrao" || score < 95);
  const isIdeal = !isCrit && !isPad;

  const leds = {
    green: isIdeal ? 1 : 0,
    yellow: isPad ? 1 : 0,
    red: isCrit ? 1 : 0
  };

  const tag = (preset || "TINTO").slice(0, 5).toUpperCase();
  const statTag = isIdeal ? "1UP" : (isCrit ? "CRT" : "PAD");
  const lcd = {
    line1: `T:${Number(t).toFixed(1)}C U:${Math.round(h)}%`,
    line2: `${tag} ${statTag}:${Math.round(score)}%`
  };

  return { leds, buzzer: { active: isCrit, melody: "Sonata ao Luar (Beethoven)", pin: 4 }, lcd, isCrit, isPad, isIdeal };
}

function syncPhysicalToSupabase(st) {
  try {
    const payload = JSON.stringify({
      device_id: "vine001",
      temperature: +Number(st.temperature).toFixed(2),
      humidity: +Number(st.humidity).toFixed(2),
      luminosity: +Number(st.luminosity).toFixed(2),
      alert_mode: st.stateKey === "critico" ? "critico" : (st.stateKey === "padrao" ? "padrao" : "normal"),
      cellar_health_score: Math.round(st.score || 100),
      source: st.source || "Arduino USB Físico"
    });
    const req = https.request({
      hostname: SUPABASE_URL,
      path: '/rest/v1/vine_telemetry',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(payload)
      }
    });
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (_) {}
}

function updateState(partial) {
  const merged = { ...hardwareState, ...partial };
  const act = computeActuators(merged.stateKey, merged.score, merged.preset, merged.temperature, merged.humidity, merged.luminosity);
  hardwareState = {
    ...merged,
    leds: act.leds,
    buzzer: act.buzzer,
    lcd: act.lcd,
    updatedAt: new Date().toISOString()
  };
  return hardwareState;
}

function handleHardwareRequest(req, res, cleanUrl) {
  if (cleanUrl === '/api/v1/hardware/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(hardwareState, null, 2));
    return true;
  }

  if (cleanUrl === '/api/v1/hardware/serial' && req.method === 'GET') {
    const s = hardwareState;
    const line = `CMD:${s.stateKey.toUpperCase()};SCORE:${s.score};T:${s.temperature};H:${s.humidity};L:${s.luminosity};G:${s.leds.green};Y:${s.leds.yellow};R:${s.leds.red};BUZZ:${s.buzzer.active ? 1 : 0};LCD1:${s.lcd.line1};LCD2:${s.lcd.line2}\n`;
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(line);
    return true;
  }

  if ((cleanUrl === '/api/v1/command' || cleanUrl === '/api/v1/hardware/command') && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        const stKey = d.command === 'multi' || d.command === 'critico' ? 'critico' : (d.command === 'padrao' ? 'padrao' : 'ideal');
        const updated = updateState({
          stateKey: stKey,
          score: d.health !== undefined ? d.health : (stKey === 'critico' ? 20 : (stKey === 'padrao' ? 80 : 100)),
          temperature: d.temperature !== undefined ? d.temperature : hardwareState.temperature,
          humidity: d.humidity !== undefined ? d.humidity : hardwareState.humidity,
          luminosity: d.luminosity !== undefined ? d.luminosity : hardwareState.luminosity,
          preset: d.preset || hardwareState.preset,
          presetKey: d.preset_key || hardwareState.presetKey
        });
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, state: updated }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return true;
  }

  if (cleanUrl === '/api/v1/hardware/telemetry' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        const t = d.t !== undefined ? parseFloat(d.t) : (d.temperature !== undefined ? parseFloat(d.temperature) : hardwareState.temperature);
        const h = d.h !== undefined ? parseFloat(d.h) : (d.humidity !== undefined ? parseFloat(d.humidity) : hardwareState.humidity);
        const l = d.l !== undefined ? parseFloat(d.l) : (d.luminosity !== undefined ? parseFloat(d.luminosity) : hardwareState.luminosity);
        const updated = updateState({ temperature: t, humidity: h, luminosity: l, source: d.source || "Arduino USB Físico" });
        syncPhysicalToSupabase(updated);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, state: updated }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return true;
  }

  return false;
}

module.exports = {
  getHardwareState: () => hardwareState,
  updateState,
  computeActuators,
  syncPhysicalToSupabase,
  handleHardwareRequest
};
