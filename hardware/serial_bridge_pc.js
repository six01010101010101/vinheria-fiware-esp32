/**
 * Ponte Serial PC <-> Arduino / ESP32 — Vinheria Agnello
 * Lê o status em tempo real da API (Local ou Nuvem Render) e transmite via porta Serial (USB) para o hardware físico.
 * Uso: node hardware/serial_bridge_pc.js [PORTA_COM] (ex: node hardware/serial_bridge_pc.js COM3)
 */

const { spawn } = require('child_process');
const http = require('http');
const https = require('https');

const COM_PORT = process.argv[2] || 'COM3';
const LOCAL_URL = 'http://localhost:8050/api/v1/hardware/serial';
const CLOUD_URL = 'https://checkpoint5-vinheria-fiware-esp32-1.onrender.com/api/v1/hardware/serial';
let targetUrl = process.argv[3] || process.env.HARDWARE_API_URL || LOCAL_URL;

console.log(`[Ponte Serial] Sincronização na porta ${COM_PORT} (115200 baud)...`);
console.log(`[Ponte Serial] Consultando telemetria em: ${targetUrl}`);

let lastPacket = '';
let consecutiveLocalErrors = 0;

function fetchAndSend() {
  const isHttps = targetUrl.startsWith('https:');
  const client = isHttps ? https : http;

  client.get(targetUrl, (res) => {
    consecutiveLocalErrors = 0;
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const line = data.trim();
      if (line && line !== lastPacket) {
        lastPacket = line;
        console.log(`[PC -> ${COM_PORT}]: ${line}`);
        try {
          spawn('powershell', [
            '-Command',
            `$port = new-Object System.IO.Ports.SerialPort ${COM_PORT},115200,None,8,one; try { $port.Open(); $port.WriteLine('${line}'); $port.Close(); } catch { }`
          ]);
        } catch (_) {}
      }
    });
  }).on('error', () => {
    consecutiveLocalErrors++;
    if (consecutiveLocalErrors === 3 && targetUrl === LOCAL_URL) {
      targetUrl = CLOUD_URL;
      console.log(`[Ponte Serial] Servidor local offline. Alternando automaticamente para a Nuvem Render: ${CLOUD_URL}`);
    }
  });
}

setInterval(fetchAndSend, 700);
fetchAndSend();
