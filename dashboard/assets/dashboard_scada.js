// Engine SCADA e Telemetria em Tempo Real — Vinheria Agnello & Wokwi
const PRESETS = {
  tinto: { name: "Vinho Tinto", wine: "Château Margaux 2015", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25, defT: 15.6, defH: 68, defL: 12, desc: "Maturação de tintos (14-18°C / 60-75%): taninos estáveis e oxidação lenta." },
  branco: { name: "Vinho Branco", wine: "Pavillon Blanc 2020", tMin: 8, tMax: 12, hMin: 60, hMax: 75, lMin: 0, lMax: 15, defT: 10.2, defH: 67, defL: 8, desc: "Preservação de brancos (8-12°C / 60-75%): frescor, acidez e penumbra." },
  rose: { name: "Vinho Rosé", wine: "Pavillon Rosé 2022", tMin: 10, tMax: 13, hMin: 60, hMax: 75, lMin: 0, lMax: 12, defT: 11.4, defH: 66, defL: 7, desc: "Conservação de rosés (10-13°C / 60-75%): frescor aromático e proteção lumínica." },
  espumante: { name: "Champanhe / Brut", wine: "Dom Pérignon Brut 2019", tMin: 6, tMax: 9, hMin: 65, hMax: 80, lMin: 0, lMax: 10, defT: 7.4, defH: 72, defL: 5, desc: "Guarda de espumantes (6-9°C / 65-80%): pressão de CO2 e perlage fino." }
};

const TERROIRS = {
  wokwi_esp32: { id: "wokwi_esp32", name: "ESP32 Wokwi", reg: "HiveMQ :1883", flag: "📟", country: "Wokwi", lat: 0, lon: 0, t: 15.5, h: 68, l: 12 },
  it_antinori: { id: "it_antinori", name: "Marchesi Antinori", reg: "Toscana", flag: "🇮🇹", country: "Itália", lat: 43.61, lon: 11.21, t: 16.5, h: 62, l: 14 },
  fr_margaux: { id: "fr_margaux", name: "Château Margaux", reg: "Bordeaux", flag: "🇫🇷", country: "França", lat: 45.04, lon: -0.66, t: 14.8, h: 72, l: 11 },
  br_miolo: { id: "br_miolo", name: "Vinícola Miolo", reg: "Serra Gaúcha", flag: "🇧🇷", country: "Brasil", lat: -29.18, lon: -51.55, t: 15.2, h: 76, l: 16 },
  us_opus: { id: "us_opus", name: "Opus One", reg: "Napa Valley", flag: "🇺🇸", country: "EUA", lat: 38.43, lon: -122.40, t: 17.5, h: 58, l: 20 },
  ru_abrau: { id: "ru_abrau", name: "Abrau-Durso", reg: "Mar Negro", flag: "🇷🇺", country: "Rússia", lat: 44.70, lon: 37.60, t: 11.4, h: 70, l: 9 },
  ar_catena: { id: "ar_catena", name: "Catena Zapata", reg: "Mendoza", flag: "🇦🇷", country: "Argentina", lat: -33.16, lon: -68.91, t: 16.2, h: 52, l: 22 },
  cl_concha: { id: "cl_concha", name: "Concha y Toro", reg: "Vale do Maipo", flag: "🇨🇱", country: "Chile", lat: -33.64, lon: -70.57, t: 15.8, h: 60, l: 18 },
  pt_crasto: { id: "pt_crasto", name: "Quinta do Crasto", reg: "Vale do Douro", flag: "🇵🇹", country: "Portugal", lat: 41.16, lon: -7.63, t: 17.0, h: 65, l: 13 }
};

let curPr = "tinto", curArea = "wokwi_esp32", hTime = [], hT = [], hH = [], hL = [];
let sim = { t: 15.6, h: 68.0, l: 12.0, score: 100, mode: "normal" };

function calcHealthScore(t, h, l, pr) {
  let sc = 100 - (t < pr.tMin || t > pr.tMax ? Math.min(45, Math.abs(t - (pr.tMin + pr.tMax) / 2) * 8) : 0);
  sc -= (h < pr.hMin || h > pr.hMax ? Math.min(35, Math.abs(h - (pr.hMin + pr.hMax) / 2) * 2) : 0);
  sc -= (l > pr.lMax ? Math.min(30, (l - pr.lMax) * 2) : 0);
  return Math.max(15, Math.min(100, Math.round(sc)));
}

function evalStatus(t, h, l, pr, area) {
  const ok = (t >= pr.tMin && t <= pr.tMax && h >= pr.hMin && h <= pr.hMax && l <= pr.lMax);
  let lbl = area === "wokwi_esp32" ? "CAVA PRESERVADA" : "TERROIR ADEQUADO";
  if (!ok) lbl = (t < pr.tMin || t > pr.tMax) ? "ALERTA TÉRMICO" : (h < pr.hMin || h > pr.hMax ? "ALERTA HIGRO" : "ALERTA LUZ/LDR");
  return { ok, lbl };
}

function initScadaPlotly() {
  const now = new Date(); hTime = []; hT = []; hH = []; hL = [];
  for (let i = 12; i >= 0; i--) {
    hTime.push(new Date(now - i * 2000).toLocaleTimeString());
    hT.push(+(sim.t + (Math.random() - 0.5) * 0.3).toFixed(1));
    hH.push(+(sim.h + (Math.random() - 0.5) * 1.0).toFixed(0));
    hL.push(+(sim.l + (Math.random() - 0.5) * 0.8).toFixed(0));
  }
  const isDark = document.documentElement.getAttribute("data-bs-theme") !== "light";
  const p = { bg: isDark ? "#121215" : "#ffffff", text: isDark ? "#f4f4f5" : "#0f172a", grid: isDark ? "#27272a" : "#e2e8f0" };
  const pr = PRESETS[curPr] || PRESETS.tinto;
  const makeFig = (id, color, name, vals, low, high, yRng) => {
    Plotly.newPlot(id, [{ x: hTime, y: vals, name, type: "scatter", mode: "lines+markers", line: { color, width: 2 } }], {
      paper_bgcolor: p.bg, plot_bgcolor: p.bg, font: { color: p.text, family: "Plus Jakarta Sans" },
      margin: { t: 25, r: 20, l: 38, b: 25 }, xaxis: { gridcolor: p.grid, zeroline: false }, yaxis: { gridcolor: p.grid, range: yRng, zeroline: false },
      shapes: [{ type: "rect", xref: "paper", x0: 0, x1: 1, y0: low, y1: high, fillcolor: "rgba(34,197,94,0.12)", line: { width: 0 } }]
    }, { responsive: true, displayModeBar: false });
  };
  makeFig("graph-temperature", "#ef4444", "Temperatura", hT, pr.tMin, pr.tMax, [4, 32]);
  makeFig("graph-humidity", "#0284c7", "Higrometria", hH, pr.hMin, pr.hMax, [20, 100]);
  makeFig("graph-luminosity", "#d4af62", "Penumbra", hL, pr.lMin, pr.lMax, [0, 100]);
}

function updateScadaPlotly(t, h, l) {
  hTime.push(new Date().toLocaleTimeString()); hT.push(t); hH.push(h); hL.push(l);
  if (hTime.length > 20) { hTime.shift(); hT.shift(); hH.shift(); hL.shift(); }
  Plotly.update("graph-temperature", { x: [hTime], y: [hT] });
  Plotly.update("graph-humidity", { x: [hTime], y: [hH] });
  Plotly.update("graph-luminosity", { x: [hTime], y: [hL] });
}

function updateHardwarePlaque(t, h, l) {
  const pr = PRESETS[curPr] || PRESETS.tinto, tr = TERROIRS[curArea] || TERROIRS.wokwi_esp32;
  const score = calcHealthScore(t, h, l, pr), st = evalStatus(t, h, l, pr, curArea);
  sim.score = score;
  const t1 = document.getElementById("barrel-mini-t1"), t2 = document.getElementById("barrel-mini-t2");
  if (t1) t1.textContent = `T:${t.toFixed(1)}C U:${h.toFixed(0)}%`;
  if (t2) t2.textContent = `S:${score}% ${st.ok ? "OK" : "ALR"}`;
  const crt = document.getElementById("green-crt-text");
  const areaPad = `${tr.flag} ${tr.name}`.padEnd(20, " ").substring(0, 20), winePad = `${pr.wine}`.padEnd(23, " ").substring(0, 23);
  if (crt) crt.textContent = `+--------------------------------+\n| TERROIR: ${areaPad}|\n| VINHO: ${winePad}|\n| T: ${t.toFixed(1).padStart(4," ")}°C  U: ${h.toFixed(0).padStart(2," ")}%  L: ${l.toFixed(0).padStart(2," ")}%       |\n| STATUS: ${st.lbl.padEnd(23, " ")}|\n| APOGEU: ${score}% [${st.ok ? "PRESERVADO" : "ANOMALIA"}]       |\n+--------------------------------+`;
  const crtTag = document.getElementById("crt-status-tag");
  if (crtTag) { crtTag.textContent = st.ok ? "STATUS: PRESERVADO" : "STATUS: ALERTA"; crtTag.style.color = st.ok ? "#4ade80" : "#f87171"; }
  const ledG = document.getElementById("led-green"), ledR = document.getElementById("led-red"), ledB = document.getElementById("led-blue");
  if (ledG) ledG.className = st.ok ? "led-indicator led-green-on" : "led-indicator led-green-off";
  if (ledR) ledR.className = st.ok ? "led-indicator led-red-off" : "led-indicator led-red-on";
  if (ledB) ledB.className = (curArea !== "wokwi_esp32") ? "led-indicator led-blue-blinking" : "led-indicator led-blue-off";
}

function onWinePresetChange(presetKey) {
  curPr = presetKey; const p = PRESETS[curPr] || PRESETS.tinto;
  const sel = document.getElementById("dropdown-wine-preset");
  if (sel && sel.value !== curPr) sel.value = curPr;
  document.querySelectorAll(".wine-pill-btn").forEach(b => b.classList.toggle("active", b.dataset.wine === curPr));
  ["temp-min","temp-max","hum-min","hum-max","lum-min","lum-max"].forEach((k, i) => {
    const el = document.getElementById(`trigger-${k}`);
    if (el) el.value = [p.tMin, p.tMax, p.hMin, p.hMax, p.lMin, p.lMax][i];
  });
  const descEl = document.getElementById("preset-description-text");
  if (descEl) descEl.textContent = p.desc;
  if (curArea === "wokwi_esp32") { if (sim.mode === "normal") { sim.t = p.defT; sim.h = p.defH; sim.l = p.defL; } }
  else { const tr = TERROIRS[curArea] || TERROIRS.wokwi_esp32; sim.t = tr.t; sim.h = tr.h; sim.l = tr.l; }
  updateHardwarePlaque(sim.t, sim.h, sim.l);
  initScadaPlotly(); renderRealVineyards(); renderCellarLots(); syncCloudConfig();
}

function onAreaTerroirChange(areaKey) {
  curArea = areaKey; const tr = TERROIRS[curArea] || TERROIRS.wokwi_esp32, pr = PRESETS[curPr] || PRESETS.tinto;
  const sel = document.getElementById("dropdown-area-terroir");
  if (sel && sel.value !== curArea) sel.value = curArea;
  if (curArea !== "wokwi_esp32") {
    sim.t = tr.t; sim.h = tr.h; sim.l = tr.l;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${tr.lat}&longitude=${tr.lon}&current=temperature_2m,relative_humidity_2m,shortwave_radiation&timezone=auto`)
      .then(r => r.json()).then(d => {
        const c = d.current || {};
        if (c.temperature_2m !== undefined && curArea === areaKey) {
          tr.t = +c.temperature_2m.toFixed(1); tr.h = +c.relative_humidity_2m.toFixed(0);
          tr.l = Math.min(100, Math.round((c.shortwave_radiation || 0) / 10));
          sim.t = tr.t; sim.h = tr.h; sim.l = tr.l;
          updateHardwarePlaque(sim.t, sim.h, sim.l); updateScadaPlotly(sim.t, sim.h, sim.l); renderRealVineyards();
        }
      }).catch(() => {});
  } else { sim.t = pr.defT; sim.h = pr.defH; sim.l = pr.defL; }
  updateHardwarePlaque(sim.t, sim.h, sim.l);
  initScadaPlotly(); renderRealVineyards(); renderCellarLots(); syncCloudConfig();
}

function syncCloudConfig() {
  const tr = TERROIRS[curArea] || TERROIRS.wokwi_esp32;
  fetch("/api/v1/cloud/firebase/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device_id: "vine001", preset_key: curPr, terroir: { id: curArea, name: tr.name, country: tr.country } }) }).catch(() => {});
}

function applyScenario(sc) {
  const map = { normal:[15.6,68,12], temp:[24.5,68,12], hum:[15.6,42,12], lum:[15.6,68,78], multi:[26,38,85] };
  const d = map[sc] || map.normal;
  sim.t = d[0]; sim.h = d[1]; sim.l = d[2]; sim.mode = sc;
  updateHardwarePlaque(sim.t, sim.h, sim.l); updateScadaPlotly(sim.t, sim.h, sim.l);
  document.querySelectorAll(".sc-btn").forEach(b => b.classList.toggle("active", b.dataset.sc === sc));
}

function renderCellarLots() {
  const c = document.getElementById("cellar-lots-grid");
  if (!c || typeof window.CANONICAL_LOTS === "undefined") return;
  const sorted = [...window.CANONICAL_LOTS].sort((a, b) => (a.style === curPr ? -1 : (b.style === curPr ? 1 : 0)));
  c.innerHTML = sorted.slice(0, 8).map(l => `
    <div class="col-lg-6 col-xl-3 col-md-6 col-12"><div class="vineyard-card h-100 ${l.style === curPr ? "border-gold" : ""}">
      <div class="d-flex justify-content-between align-items-center mb-1"><span class="sommelier-tag">${l.code}</span><span class="badge bg-secondary" style="font-size:0.62rem;">${l.country} · ${l.vintage}</span></div>
      <div class="lot-wine-title text-truncate mb-1">${l.winery} — ${l.wine}</div>
      <div class="progress mb-2 rounded-pill" style="height:4px;"><div class="progress-bar bg-success" style="width:${l.health}%;"></div></div>
      <div class="text-muted text-truncate mb-1" style="font-size:0.70rem;">Terroir: ${l.soil}</div>
      <div class="d-flex justify-content-between small text-muted" style="font-size:0.72rem;"><span>Barrica: ${l.barrel.substring(0, 18)}</span><span class="text-wine fw-bold">Guarda: ${l.apogee}</span></div>
    </div></div>`).join("");
}

function renderRealVineyards() {
  const c = document.getElementById("real-vineyards-grid");
  if (!c) return;
  const list = Object.values(TERROIRS).filter(x => x.id !== "wokwi_esp32");
  c.innerHTML = list.map(v => {
    const dew = ((v.t + v.h * 0.1) * 0.5).toFixed(1);
    return `
    <div class="col-lg-4 col-md-6 col-12"><div class="vineyard-card ${v.id === curArea ? "active-vineyard" : ""}" data-vid="${v.id}" style="cursor:pointer;" title="Clique para ativar este terroir">
      <div class="d-flex justify-content-between align-items-center mb-1"><div class="d-flex align-items-center gap-2"><span class="flag-circle">${v.flag}</span><div><div class="lot-wine-title text-truncate" style="font-size:0.86rem;">${v.name}</div><span class="text-country" style="font-size:0.72rem;">${v.country} · ${v.reg}</span></div></div><span class="sommelier-tag">${v.id === curArea ? "● ATIVO" : "GPS"}</span></div>
      <div class="d-flex justify-content-between align-items-center p-2 rounded bg-black bg-opacity-25 border border-secondary border-opacity-25 mt-2"><span class="text-temp small">🌡️ ${v.t.toFixed(1)}°C</span><span class="text-hum small">💧 ${v.h.toFixed(0)}%</span><span class="text-lum small">☀️ ${v.l.toFixed(0)}%</span><span class="text-dew small">💨 ${dew}°C</span></div>
    </div></div>`;
  }).join("");
  c.querySelectorAll(".vineyard-card").forEach(card => card.addEventListener("click", () => onAreaTerroirChange(card.dataset.vid)));
}

async function fetchLiveTicker() {
  if (sim.mode !== "normal") return;
  if (curArea === "wokwi_esp32") {
    try {
      const res = await fetch("/api/v1/status", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        if (d.telemetry) {
          sim.t = d.telemetry.temperature_c; sim.h = d.telemetry.humidity_pct; sim.l = d.telemetry.luminosity_pct;
        }
      }
    } catch (_) {}
  } else {
    const wave = Math.sin(Date.now() / 2500) * 0.12;
    sim.t = +(sim.t + wave).toFixed(1);
    sim.h = Math.min(100, Math.max(20, +(sim.h + Math.cos(Date.now() / 3200) * 0.3).toFixed(0)));
  }
  updateHardwarePlaque(sim.t, sim.h, sim.l); updateScadaPlotly(sim.t, sim.h, sim.l);
}

document.addEventListener("DOMContentLoaded", () => {
  renderCellarLots(); renderRealVineyards();
  document.getElementById("dropdown-wine-preset")?.addEventListener("change", (e) => onWinePresetChange(e.target.value));
  document.getElementById("dropdown-wine-preset")?.addEventListener("input", (e) => onWinePresetChange(e.target.value));
  document.getElementById("dropdown-area-terroir")?.addEventListener("change", (e) => onAreaTerroirChange(e.target.value));
  document.getElementById("dropdown-area-terroir")?.addEventListener("input", (e) => onAreaTerroirChange(e.target.value));
  document.querySelectorAll(".wine-pill-btn").forEach(b => b.addEventListener("click", () => onWinePresetChange(b.dataset.wine)));
  document.querySelectorAll(".sc-btn").forEach(b => b.addEventListener("click", () => applyScenario(b.dataset.sc)));
  if (typeof Plotly !== "undefined") initScadaPlotly();
  else { const it = setInterval(() => { if (typeof Plotly !== "undefined") { clearInterval(it); initScadaPlotly(); } }, 150); }
  updateHardwarePlaque(15.6, 68, 12); setInterval(fetchLiveTicker, 1800);
});
