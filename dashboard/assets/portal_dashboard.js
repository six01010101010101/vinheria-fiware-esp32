// ==============================================================================
// Vinheria Agnello — Dashboard Analítico Client-Side em Tempo Real (Plotly IoT)
// ==============================================================================
const WORLD_VINES = [
  { id: 'miolo_br', name: 'Vinícola Miolo', region: 'Vale dos Vinhedos (RS)', flag: '🇧🇷', lat: -29.18, lon: -51.55 },
  { id: 'francioni_br', name: 'Villa Francioni', region: 'São Joaquim (SC)', flag: '🇧🇷', lat: -28.29, lon: -49.93 },
  { id: 'guaspari_br', name: 'Vinícola Guaspari', region: 'Pinhal (SP)', flag: '🇧🇷', lat: -22.18, lon: -46.74 },
  { id: 'catena_ar', name: 'Catena Zapata', region: 'Mendoza', flag: '🇦🇷', lat: -33.16, lon: -68.91 },
  { id: 'concha_cl', name: 'Concha y Toro', region: 'Vale do Maipo', flag: '🇨🇱', lat: -33.64, lon: -70.57 },
  { id: 'margaux_fr', name: 'Château Margaux', region: 'Bordeaux', flag: '🇫🇷', lat: 45.04, lon: -0.66 },
  { id: 'antinori_it', name: 'Marchesi Antinori', region: 'Toscana', flag: '🇮🇹', lat: 43.61, lon: 11.21 },
  { id: 'crasto_pt', name: 'Quinta do Crasto', region: 'Douro', flag: '🇵🇹', lat: 41.16, lon: -7.63 },
  { id: 'opus_us', name: 'Opus One', region: 'Napa Valley', flag: '🇺🇸', lat: 38.43, lon: -122.40 }
];

let histT = [], histH = [], histL = [], histTime = [], curSim = { t: 15.5, h: 68.0, l: 12.0, score: 100, mode: 'normal' };

function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return { paper: isDark ? '#121215' : '#ffffff', text: isDark ? '#f4f4f5' : '#0f172a', grid: isDark ? '#27272a' : '#e2e8f0' };
}

function initPlotly() {
  const now = new Date();
  histTime = []; histT = []; histH = []; histL = [];
  for (let i = 12; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3000);
    histTime.push(t.toLocaleTimeString());
    histT.push(+(15.3 + Math.random() * 0.4).toFixed(1));
    histH.push(+(67.5 + Math.random() * 1.0).toFixed(0));
    histL.push(+(11.5 + Math.random() * 1.0).toFixed(0));
  }
  const tc = getThemeColors();
  const traceT = { x: histTime, y: histT, name: 'Temp (°C)', type: 'scatter', mode: 'lines+markers', line: { color: '#ef4444', width: 2 } };
  const traceH = { x: histTime, y: histH, name: 'Umidade (%)', yaxis: 'y2', type: 'scatter', mode: 'lines+markers', line: { color: '#0284c7', width: 2 } };
  const layoutTH = {
    paper_bgcolor: tc.paper, plot_bgcolor: tc.paper, font: { color: tc.text, family: 'Plus Jakarta Sans, sans-serif' },
    margin: { t: 25, r: 40, l: 40, b: 35 },
    xaxis: { gridcolor: tc.grid, zeroline: false },
    yaxis: { title: 'Temp °C', gridcolor: tc.grid, range: [5, 35], zeroline: false },
    yaxis2: { title: 'Umid %', overlaying: 'y', side: 'right', gridcolor: 'transparent', range: [20, 100], zeroline: false },
    legend: { orientation: 'h', x: 0.05, y: 1.15 }
  };
  Plotly.newPlot('plotly-temp-hum', [traceT, traceH], layoutTH, { responsive: true, displayModeBar: false });

  const traceL = { x: histTime, y: histL, name: 'Luminosidade (%)', type: 'scatter', mode: 'lines', fill: 'tozeroy', line: { color: '#d4af62', width: 2 }, fillcolor: 'rgba(212,175,98,0.2)' };
  const layoutL = {
    paper_bgcolor: tc.paper, plot_bgcolor: tc.paper, font: { color: tc.text, family: 'Plus Jakarta Sans, sans-serif' },
    margin: { t: 25, r: 40, l: 40, b: 35 },
    xaxis: { gridcolor: tc.grid, zeroline: false },
    yaxis: { title: 'Luz %', gridcolor: tc.grid, range: [0, 100], zeroline: false },
    legend: { orientation: 'h', x: 0.05, y: 1.15 }
  };
  Plotly.newPlot('plotly-lum', [traceL], layoutL, { responsive: true, displayModeBar: false });
}

window.resizePlotlyCharts = function() {
  setTimeout(() => {
    try {
      if (typeof Plotly !== 'undefined') {
        Plotly.relayout('plotly-temp-hum', { autosize: true });
        Plotly.relayout('plotly-lum', { autosize: true });
      }
    } catch (_) {}
  }, 100);
};

function updateCharts(t, h, l) {
  const ts = new Date().toLocaleTimeString();
  histTime.push(ts); histT.push(t); histH.push(h); histL.push(l);
  if (histTime.length > 20) { histTime.shift(); histT.shift(); histH.shift(); histL.shift(); }
  Plotly.update('plotly-temp-hum', { x: [histTime, histTime], y: [histT, histH] });
  Plotly.update('plotly-lum', { x: [histTime], y: [histL] });
}

function updateBarrelMini(t, h, score, label) {
  const m1 = document.getElementById('barrel-mini-t1'), m2 = document.getElementById('barrel-mini-t2');
  if (m1) m1.textContent = `T:${t.toFixed(1)}C U:${h.toFixed(0)}%`;
  if (m2) m2.textContent = `S:${score}% ${label}`;
}

function triggerScenario(type) {
  const presets = {
    normal: { t: 15.5, h: 68.0, l: 12.0, score: 100, label: 'TINTO 100%', freq: 1046, ok: true },
    temp: { t: 24.5, h: 68.0, l: 12.0, score: 45, label: 'ALR:TEMP 45%', freq: 2400, ok: false },
    hum: { t: 15.5, h: 42.0, l: 12.0, score: 55, label: 'ALR:HUM 55%', freq: 620, ok: false },
    lum: { t: 15.5, h: 68.0, l: 78.0, score: 50, label: 'ALR:LUM 50%', freq: 1350, ok: false },
    multi: { t: 26.0, h: 38.0, l: 85.0, score: 15, label: 'ALR:CRIT 15%', freq: 1760, ok: false }
  };
  const p = presets[type] || presets.normal;
  curSim = { t: p.t, h: p.h, l: p.l, score: p.score, mode: type };
  document.getElementById('kpi-temp-val').textContent = `${p.t.toFixed(1)}°C`;
  document.getElementById('kpi-hum-val').textContent = `${p.h.toFixed(0)}%`;
  document.getElementById('kpi-lum-val').textContent = `${p.l.toFixed(0)}%`;
  const sEl = document.getElementById('cellar-score-val');
  if (sEl) { sEl.textContent = `${p.score}%`; sEl.style.color = p.ok ? '#22c55e' : '#ef4444'; }
  document.getElementById('lcd-line-0').textContent = `T:${p.t.toFixed(1)}C  U:${p.h.toFixed(0)}% *`;
  document.getElementById('lcd-line-1').textContent = `L:${p.l.toFixed(0)}%  ${p.label}`;
  updateBarrelMini(p.t, p.h, p.score, p.ok ? 'OK' : 'ALR');
  const ledG = document.getElementById('led-green-ui'), ledR = document.getElementById('led-red-ui'), ledB = document.getElementById('led-blue-ui');
  if (ledG) ledG.className = p.ok ? 'led-indicator led-green-on' : 'led-indicator led-green-off';
  if (ledR) ledR.className = p.ok ? 'led-indicator led-red-off' : 'led-indicator led-red-on';
  if (ledB) ledB.className = p.ok ? 'led-indicator led-blue-off' : 'led-indicator led-blue-blinking';
  document.querySelectorAll('.scenario-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-scenario') === type));
  if (typeof playAcousticChime === 'function') playAcousticChime(p.freq, 0.22);
  updateCharts(p.t, p.h, p.l);
}

async function loadWorldVineyards() {
  const c = document.getElementById('world-vineyards-container');
  if (!c) return;
  c.innerHTML = WORLD_VINES.map(v => `
    <div class="portal-card" style="padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>${v.flag} ${v.name}</strong><span class="sommelier-tag">Terroir</span>
      </div>
      <small style="color:var(--portal-muted);display:block;margin-bottom:6px;">${v.region}</small>
      <div id="vine-meteo-${v.id}" style="font-size:0.8rem;font-weight:600;">Carregando clima...</div>
    </div>
  `).join('');
  for (const v of WORLD_VINES.slice(0, 5)) {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&current=temperature_2m,relative_humidity_2m&timezone=auto`);
      if (res.ok) {
        const d = await res.json(), cur = d.current || {};
        const el = document.getElementById(`vine-meteo-${v.id}`);
        if (el) el.innerHTML = `<span style="color:#ef4444;">${cur.temperature_2m || 18}°C</span> · <span style="color:#0284c7;">${cur.relative_humidity_2m || 65}%</span> · <span style="color:#22c55e;">Clima Ideal</span>`;
      }
    } catch (_) {}
  }
}

function ensurePlotlyReady() {
  if (typeof Plotly !== 'undefined') { initPlotly(); return; }
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (typeof Plotly !== 'undefined') { clearInterval(interval); initPlotly(); }
    else if (attempts > 30) clearInterval(interval);
  }, 150);
}

function handlePresetChange(val) {
  const meta = {
    tinto: { tM: '12', tX: '16', hM: '65', hX: '75', lM: '0', lX: '15', d: 'Temperatura ideal de 12.0°C a 16.0°C para Tintos de Guarda em barricas.' },
    branco: { tM: '10', tX: '14', hM: '65', hX: '80', lM: '0', lX: '10', d: 'Conservação de 10.0°C a 14.0°C para Brancos Nobres & Chablis.' },
    espumante: { tM: '8', tX: '12', hM: '70', hX: '85', lM: '0', lX: '10', d: 'Climatização fresca de 8.0°C a 12.0°C para Espumantes Brut & Champagne.' }
  }[val] || { tM: '12', tX: '16', hM: '65', hX: '75', lM: '0', lX: '15', d: 'Preset enológico ativo.' };
  const get = id => document.getElementById(id);
  ['in-temp-min', 'in-temp-max', 'in-hum-min', 'in-hum-max', 'in-lum-min', 'in-lum-max'].forEach((id, i) => {
    const el = get(id);
    if (el) el.value = [meta.tM, meta.tX, meta.hM, meta.hX, meta.lM, meta.lX][i];
  });
  if (get('target-temp-badge')) get('target-temp-badge').textContent = `Alvo: ${meta.tM}.0°C a ${meta.tX}.0°C`;
  if (get('target-hum-badge')) get('target-hum-badge').textContent = `Alvo: ${meta.hM}% a ${meta.hX}%`;
  if (get('target-lum-badge')) get('target-lum-badge').textContent = `Alvo: ${meta.lM}% a ${meta.lX}%`;
  if (get('preset-desc-label')) get('preset-desc-label').textContent = meta.d;
}

document.addEventListener('DOMContentLoaded', () => {
  ensurePlotlyReady();
  loadWorldVineyards();
  document.getElementById('preset-wine-select')?.addEventListener('change', e => handlePresetChange(e.target.value));
  document.querySelectorAll('.scenario-btn').forEach(b => {
    b.addEventListener('click', () => triggerScenario(b.getAttribute('data-scenario')));
  });
  setInterval(() => {
    if (curSim.mode === 'normal') {
      const nt = +(15.3 + Math.random() * 0.4).toFixed(1), nh = +(67.5 + Math.random() * 1.0).toFixed(0), nl = +(11.5 + Math.random() * 1.0).toFixed(0);
      document.getElementById('kpi-temp-val').textContent = `${nt}°C`;
      document.getElementById('kpi-hum-val').textContent = `${nh}%`;
      document.getElementById('kpi-lum-val').textContent = `${nl}%`;
      document.getElementById('lcd-line-0').textContent = `T:${nt}C  U:${nh}% *`;
      document.getElementById('lcd-line-1').textContent = `L:${nl}%  TINTO 100%`;
      updateBarrelMini(nt, nh, 100, 'OK');
      updateCharts(nt, nh, nl);
    }
  }, 3000);
});
