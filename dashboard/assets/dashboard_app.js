// Dashboard Analítico IoT — Vinheria Agnello (SCADA Engine Client-Side)
const PRESETS = {
  tinto: { name: "Tintos de Guarda", tMin: 12, tMax: 16, hMin: 65, hMax: 75, lMin: 0, lMax: 15, desc: "Cabernet, Merlot, Nebbiolo e Brunello em barricas de carvalho." },
  branco: { name: "Brancos Nobres", tMin: 10, tMax: 14, hMin: 65, hMax: 80, lMin: 0, lMax: 10, desc: "Chardonnay, Sauvignon Blanc e Chablis Kimmeridgiano." },
  espumante: { name: "Espumantes Brut", tMin: 8, tMax: 12, hMin: 70, hMax: 85, lMin: 0, lMax: 10, desc: "Champagne e Espumantes pelo método tradicional com autólise." }
};
const VINES = [
  { id: 'miolo', name: '🇧🇷 Vinícola Miolo', reg: 'Vale dos Vinhedos (RS)', lat: -29.18, lon: -51.55 },
  { id: 'catena', name: '🇦🇷 Catena Zapata', reg: 'Mendoza', lat: -33.16, lon: -68.91 },
  { id: 'margaux', name: '🇫🇷 Château Margaux', reg: 'Bordeaux', lat: 45.04, lon: -0.66 },
  { id: 'antinori', name: '🇮🇹 Marchesi Antinori', reg: 'Toscana', lat: 43.61, lon: 11.21 },
  { id: 'crasto', name: '🇵🇹 Quinta do Crasto', reg: 'Douro', lat: 41.16, lon: -7.63 },
  { id: 'opus', name: '🇺🇸 Opus One', reg: 'Napa Valley', lat: 38.43, lon: -122.40 }
];

let curPreset = "tinto", audioOn = false, audioCtx = null;
let hTime = [], hT = [], hH = [], hL = [];
let simState = { t: 15.5, h: 68, l: 12, mode: 'normal' };

function playTone(freq, dur = 0.15) {
  if (!audioOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; g.gain.setValueAtTime(0.05, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (_) {}
}

function getColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return { bg: isDark ? '#121215' : '#ffffff', txt: isDark ? '#f4f4f5' : '#0f172a', grid: isDark ? '#27272a' : '#e2e8f0' };
}

function initScadaCharts() {
  const now = new Date();
  hTime = []; hT = []; hH = []; hL = [];
  for (let i = 10; i >= 0; i--) {
    hTime.push(new Date(now - i * 3000).toLocaleTimeString());
    hT.push(+(15.2 + Math.random() * 0.5).toFixed(1));
    hH.push(+(67 + Math.random() * 2).toFixed(0));
    hL.push(+(11 + Math.random() * 2).toFixed(0));
  }
  const c = getColors(), pr = PRESETS[curPreset];
  const lay = (title, yRange, yMin, yMax) => ({
    paper_bgcolor: c.bg, plot_bgcolor: c.bg, font: { color: c.txt, family: 'Plus Jakarta Sans' },
    margin: { t: 25, r: 25, l: 35, b: 25 }, xaxis: { gridcolor: c.grid, zeroline: false },
    yaxis: { gridcolor: c.grid, range: yRange, zeroline: false },
    shapes: [{ type: 'rect', xref: 'paper', x0: 0, x1: 1, y0: yMin, y1: yMax, fillcolor: 'rgba(34,197,94,0.12)', line: { width: 0 } }]
  });
  Plotly.newPlot('dash-temp-chart', [{ x: hTime, y: hT, mode: 'lines+markers', line: { color: '#ef4444', width: 2 } }], lay('Temp', [5, 30], pr.tMin, pr.tMax), { responsive: true, displayModeBar: false });
  Plotly.newPlot('dash-hum-chart', [{ x: hTime, y: hH, mode: 'lines+markers', line: { color: '#0284c7', width: 2 } }], lay('Umid', [20, 100], pr.hMin, pr.hMax), { responsive: true, displayModeBar: false });
  Plotly.newPlot('dash-lum-chart', [{ x: hTime, y: hL, mode: 'lines', fill: 'tozeroy', line: { color: '#d4af62', width: 2 }, fillcolor: 'rgba(212,175,98,0.2)' }], lay('Luz', [0, 100], pr.lMin, pr.lMax), { responsive: true, displayModeBar: false });
}

function updateScadaCharts(t, h, l) {
  const ts = new Date().toLocaleTimeString();
  hTime.push(ts); hT.push(t); hH.push(h); hL.push(l);
  if (hTime.length > 15) { hTime.shift(); hT.shift(); hH.shift(); hL.shift(); }
  Plotly.update('dash-temp-chart', { x: [hTime], y: [hT] });
  Plotly.update('dash-hum-chart', { x: [hTime], y: [hH] });
  Plotly.update('dash-lum-chart', { x: [hTime], y: [hL] });
}

function applyPreset(key) {
  curPreset = key;
  const p = PRESETS[key] || PRESETS.tinto;
  document.getElementById('input-t-min').value = p.tMin;
  document.getElementById('input-t-max').value = p.tMax;
  document.getElementById('input-h-min').value = p.hMin;
  document.getElementById('input-h-max').value = p.hMax;
  document.getElementById('input-l-min').value = p.lMin;
  document.getElementById('input-l-max').value = p.lMax;
  document.getElementById('preset-desc').textContent = p.desc;
  initScadaCharts();
}

function setScenario(sc) {
  simState.mode = sc;
  const map = {
    normal: { t: 15.5, h: 68, l: 12, ok: true, lcd: 'Cava Preservada' },
    temp: { t: 24.8, h: 68, l: 12, ok: false, lcd: 'ALERTA TEMP ALTA' },
    hum: { t: 15.5, h: 41, l: 12, ok: false, lcd: 'ALERTA UMID BAIXA' },
    lum: { t: 15.5, h: 68, l: 79, ok: false, lcd: 'ALERTA LUZ EXCESS' },
    multi: { t: 26.2, h: 37, l: 86, ok: false, lcd: 'ALERTA CRITICO!' }
  };
  const d = map[sc] || map.normal;
  simState.t = d.t; simState.h = d.h; simState.l = d.l;
  document.getElementById('val-cur-t').textContent = `${d.t.toFixed(1)}°C`;
  document.getElementById('val-cur-h').textContent = `${d.h.toFixed(0)}%`;
  document.getElementById('val-cur-l').textContent = `${d.l.toFixed(0)}%`;
  document.getElementById('lcd-line-1').textContent = `T:${d.t}C U:${d.h}% L:${d.l}%`;
  document.getElementById('lcd-line-2').textContent = `STATUS: ${d.lcd}`;
  document.getElementById('led-green').className = `led-circle ${d.ok ? 'led-green' : 'led-red-off'}`;
  document.getElementById('led-red').className = `led-circle ${d.ok ? 'led-red-off' : 'led-red-on'}`;
  document.getElementById('led-blue').className = `led-circle ${d.ok ? 'led-blue-off' : 'led-blue-on'}`;
  document.querySelectorAll('.sc-btn').forEach(b => b.classList.toggle('btn-dash-wine', b.dataset.sc === sc));
  playTone(d.ok ? 880 : 440, 0.2);
  updateScadaCharts(d.t, d.h, d.l);
}

async function loadVineyards() {
  const c = document.getElementById('vine-cards');
  if (!c) return;
  c.innerHTML = VINES.map(v => `<div class="dash-card" style="padding:10px;"><strong style="font-size:0.8rem;">${v.name}</strong><br><small class="text-muted" style="font-size:0.72rem;">${v.reg}</small><div id="v-meteo-${v.id}" style="font-size:0.75rem;margin-top:4px;">Carregando...</div></div>`).join('');
  for (const v of VINES.slice(0, 4)) {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&current=temperature_2m,relative_humidity_2m`);
      if (res.ok) {
        const d = await res.json(), cur = d.current || {};
        document.getElementById(`v-meteo-${v.id}`).innerHTML = `🌡️ ${cur.temperature_2m || 18}°C | 💧 ${cur.relative_humidity_2m || 60}%`;
      }
    } catch (_) {}
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const th = localStorage.getItem('dash_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', th);
  document.getElementById('btn-theme')?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const nxt = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nxt);
    localStorage.setItem('dash_theme', nxt);
    initScadaCharts();
  });
  document.getElementById('btn-audio')?.addEventListener('click', (e) => {
    audioOn = !audioOn;
    e.target.textContent = audioOn ? '🔊 Som: On' : '🔇 Som: Off';
    if (audioOn) playTone(784, 0.15);
  });
  document.getElementById('preset-select')?.addEventListener('change', (e) => applyPreset(e.target.value));
  document.querySelectorAll('.sc-btn').forEach(b => b.addEventListener('click', () => setScenario(b.dataset.sc)));
  if (typeof Plotly !== 'undefined') initScadaCharts();
  else { const it = setInterval(() => { if (typeof Plotly !== 'undefined') { clearInterval(it); initScadaCharts(); } }, 150); }
  loadVineyards();
  setInterval(() => {
    if (simState.mode === 'normal') {
      const t = +(15.2 + Math.random() * 0.4).toFixed(1);
      const h = +(67 + Math.random() * 2).toFixed(0);
      const l = +(11 + Math.random() * 2).toFixed(0);
      document.getElementById('val-cur-t').textContent = `${t}°C`;
      document.getElementById('val-cur-h').textContent = `${h}%`;
      document.getElementById('val-cur-l').textContent = `${l}%`;
      document.getElementById('lcd-line-1').textContent = `T:${t}C U:${h}% L:${l}%`;
      updateScadaCharts(t, h, l);
    }
  }, 2500);
});
