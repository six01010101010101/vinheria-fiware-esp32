/**
 * Ponte Serial PC <-> Arduino / ESP32 — Vinheria Agnello
 * Lê o status em tempo real da API e transmite via porta Serial (USB) para o hardware físico.
 * Uso: node hardware/serial_bridge_pc.js [PORTA_COM] (ex: node hardware/serial_bridge_pc.js COM3)
 */

const { spawn } = require('child_process');
const http = require('http');

const COM_PORT = process.argv[2] || 'COM3';
const API_URL = 'http://localhost:8050/api/v1/hardware/serial';

console.log(`[Ponte Serial] Iniciando sincronização na porta ${COM_PORT} via 115200 baud...`);
console.log(`[Ponte Serial] Conectado à API em ${API_URL}`);

let lastPacket = '';

function fetchAndSend() {
  http.get(API_URL, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const line = data.trim();
      if (line && line !== lastPacket) {
        lastPacket = line;
        console.log(`[PC -> ${COM_PORT}]: ${line}`);
        try {
          const ps = spawn('powershell', [
            '-Command',
            `$port = new-Object System.IO.Ports.SerialPort ${COM_PORT},115200,None,8,one; try { $port.Open(); $port.WriteLine('${line}'); $port.Close(); } catch { }`
          ]);
        } catch (_) {}
      }
    });
  }).on('error', () => {});
}

setInterval(fetchAndSend, 600);
fetchAndSend();
