// Engine SCADA e Telemetria em Tempo Real — Vinheria Agnello & Wokwi
const PRESETS = {
  tinto: { name: "🍷 Tintos de Guarda", tMin: 14.0, tMax: 18.0, hMin: 60.0, hMax: 75.0, lMin: 0.0, lMax: 25.0, defT: 15.5, defH: 68.0, defL: 12.0, desc: "Maturação de tintos (14-18°C / 60-75%): taninos estáveis e oxidação lenta." },
  branco: { name: "🥂 Brancos Nobres", tMin: 8.0, tMax: 12.0, hMin: 60.0, hMax: 75.0, lMin: 0.0, lMax: 15.0, defT: 10.0, defH: 67.0, defL: 8.0, desc: "Preservação de brancos (8-12°C / 60-75%): frescor, acidez e penumbra." },
  rose: { name: "🌸 Vinhos Rosé", tMin: 10.0, tMax: 13.0, hMin: 60.0, hMax: 75.0, lMin: 0.0, lMax: 12.0, defT: 11.5, defH: 66.0, defL: 7.0, desc: "Conservação de rosés (10-13°C / 60-75%): frescor aromático e proteção lumínica." },
  espumante: { name: "🍾 Champanhe & Espumante", tMin: 6.0, tMax: 9.0, hMin: 65.0, hMax: 80.0, lMin: 0.0, lMax: 10.0, defT: 7.5, defH: 72.0, defL: 5.0, desc: "Guarda de espumantes (6-9°C / 65-80%): pressão de CO2 e perlage fino." }
};

const TERROIRS = {
  wokwi_esp32: { id: "wokwi_esp32", name: "Simulador Wokwi", flag: "📟", country: "Wokwi", lat: 0, lon: 0, t: 15.5, h: 68.0, l: 12.0 },
  it_antinori: { id: "it_antinori", name: "Marchesi Antinori", flag: "🇮🇹", country: "Itália", lat: 43.61, lon: 11.21, t: 16.5, h: 62.0, l: 14.0 },
  fr_margaux: { id: "fr_margaux", name: "Château Margaux", flag: "🇫🇷", country: "França", lat: 45.04, lon: -0.66, t: 14.8, h: 72.0, l: 11.0 },
  br_miolo: { id: "br_miolo", name: "Vinícola Miolo", flag: "🇧🇷", country: "Brasil", lat: -29.18, lon: -51.55, t: 15.2, h: 76.0, l: 16.0 },
  us_opus: { id: "us_opus", name: "Opus One", flag: "🇺🇸", country: "EUA", lat: 38.43, lon: -122.40, t: 17.5, h: 58.0, l: 20.0 },
  ru_abrau: { id: "ru_abrau", name: "Abrau-Durso", flag: "🇷🇺", country: "Rússia", lat: 44.70, lon: 37.60, t: 11.4, h: 70.0, l: 9.0 },
  ar_catena: { id: "ar_catena", name: "Catena Zapata", flag: "🇦🇷", country: "Argentina", lat: -33.16, lon: -68.91, t: 16.2, h: 52.0, l: 22.0 },
  cl_concha: { id: "cl_concha", name: "Concha y Toro", flag: "🇨🇱", country: "Chile", lat: -33.64, lon: -70.57, t: 15.8, h: 60.0, l: 18.0 },
  pt_crasto: { id: "pt_crasto", name: "Quinta do Crasto", flag: "🇵🇹", country: "Portugal", lat: 41.16, lon: -7.63, t: 17.0, h: 65.0, l: 13.0 }
};

let curPr = "tinto", curArea = "wokwi_esp32", hTime = [], hT = [], hH = [], hL = [];
let sim = { t: 15.5, h: 68.0, l: 12.0, score: 100, mode: "normal" };

function calcHealthScore(t, h, l, pr) {
  let sc = 100;
  if (t < pr.tMin || t > pr.tMax) sc -= Math.min(45, Math.abs(t - (pr.tMin + pr.tMax) / 2) * 8);
  if (h < pr.hMin || h > pr.hMax) sc -= Math.min(35, Math.abs(h - (pr.hMin + pr.hMax) / 2) * 2);
  if (l > pr.lMax) sc -= Math.min(30, (l - pr.lMax) * 2);
  return Math.max(15, Math.min(100, Math.round(sc)));
}

function initScadaPlotly() {
  const now = new Date(); hTime = []; hT = []; hH = []; hL = [];
  for (let i = 12; i >= 0; i--) {
    hTime.push(new Date(now - i * 2500).toLocaleTimeString());
    hT.push(+(sim.t + (Math.random() - 0.5) * 0.4).toFixed(1));
    hH.push(+(sim.h + (Math.random() - 0.5) * 1.5).toFixed(0));
    hL.push(+(sim.l + (Math.random() - 0.5) * 1.0).toFixed(0));
  }
  const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
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

function updateHardwarePlaque(t, h, l, ok, lbl, score) {
  const pr = PRESETS[curPr] || PRESETS.tinto, tr = TERROIRS[curArea] || TERROIRS.wokwi_esp32;
  const t1 = document.getElementById("barrel-mini-t1"), t2 = document.getElementById("barrel-mini-t2");
  if (t1) t1.textContent = `T:${t.toFixed(1)}C U:${h.toFixed(0)}%`;
  if (t2) t2.textContent = `S:${score}% ${ok ? "OK" : "ALR"}`;

  const crt = document.getElementById("green-crt-text");
  const areaPad = `${tr.flag} ${tr.name}`.padEnd(21, " ").substring(0, 21);
  const stylePad = `${pr.name.substring(0, 10)}`.padEnd(10, " ");
  if (crt) crt.textContent = `+--------------------------------+\n| CAVA ATIVA: ${areaPad}|\n| [${stylePad}] T:${t.toFixed(1)}C U:${h.toFixed(0)}% L:${l.toFixed(0)}% |\n| STATUS: ${lbl.padEnd(23, " ")}|\n| APOGEU: ${score}% [${ok ? "PRESERVADO" : "ANOMALIA"}]       |\n+--------------------------------+`;

  const ledG = document.getElementById("led-green"), ledR = document.getElementById("led-red"), ledB = document.getElementById("led-blue");
  if (ledG) ledG.className = ok ? "led-indicator led-green-on" : "led-indicator led-green-off";
  if (ledR) ledR.className = ok ? "led-indicator led-red-off" : "led-indicator led-red-on";
  if (ledB) ledB.className = (curArea !== "wokwi_esp32") ? "led-indicator led-blue-blinking" : "led-indicator led-blue-off";
}

function onWinePresetChange(presetKey) {
  curPr = presetKey;
  const p = PRESETS[curPr] || PRESETS.tinto;
  document.getElementById("trigger-temp-min").value = p.tMin; document.getElementById("trigger-temp-max").value = p.tMax;
  document.getElementById("trigger-hum-min").value = p.hMin; document.getElementById("trigger-hum-max").value = p.hMax;
  document.getElementById("trigger-lum-min").value = p.lMin; document.getElementById("trigger-lum-max").value = p.lMax;
  document.getElementById("preset-description-text").textContent = p.desc;

  if (sim.mode === "normal") { sim.t = p.defT; sim.h = p.defH; sim.l = p.defL; }
  sim.score = calcHealthScore(sim.t, sim.h, sim.l, p);
  updateHardwarePlaque(sim.t, sim.h, sim.l, sim.score >= 85, "CAVA PRESERVADA", sim.score);
  initScadaPlotly();
  syncCloudConfig();
}

function onAreaTerroirChange(areaKey) {
  curArea = areaKey;
  const tr = TERROIRS[curArea] || TERROIRS.wokwi_esp32;
  const pr = PRESETS[curPr] || PRESETS.tinto;
  if (curArea !== "wokwi_esp32") {
    sim.t = tr.t; sim.h = tr.h; sim.l = tr.l;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${tr.lat}&longitude=${tr.lon}&current=temperature_2m,relative_humidity_2m,shortwave_radiation&timezone=auto`)
      .then(r => r.json()).then(d => {
        const c = d.current || {};
        if (c.temperature_2m !== undefined && curArea === areaKey) {
          tr.t = +c.temperature_2m.toFixed(1); tr.h = +c.relative_humidity_2m.toFixed(0);
          tr.l = Math.min(100, Math.round((c.shortwave_radiation || 0) / 10));
          sim.t = tr.t; sim.h = tr.h; sim.l = tr.l;
          sim.score = calcHealthScore(sim.t, sim.h, sim.l, pr);
          updateHardwarePlaque(sim.t, sim.h, sim.l, sim.score >= 85, "TERROIR ATIVO", sim.score);
          updateScadaPlotly(sim.t, sim.h, sim.l);
        }
      }).catch(() => {});
  } else { sim.t = pr.defT; sim.h = pr.defH; sim.l = pr.defL; }
  sim.score = calcHealthScore(sim.t, sim.h, sim.l, pr);
  updateHardwarePlaque(sim.t, sim.h, sim.l, sim.score >= 85, "TERROIR ATIVO", sim.score);
  initScadaPlotly();
  syncCloudConfig();
}

function syncCloudConfig() {
  const tr = TERROIRS[curArea] || TERROIRS.wokwi_esp32;
  fetch("/api/v1/cloud/firebase/sync", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: "vine001", preset_key: curPr, terroir: { id: curArea, name: tr.name, country: tr.country } })
  }).catch(() => {});
}

function applyScenario(sc) {
  const map = {
    normal: { t: 15.5, h: 68.0, l: 12.0, ok: true, lbl: "CAVA PRESERVADA", score: 100 },
    temp: { t: 24.5, h: 68.0, l: 12.0, ok: false, lbl: "ALERTA TERMICO", score: 50 },
    hum: { t: 15.5, h: 42.0, l: 12.0, ok: false, lbl: "ALERTA HIGRO", score: 55 },
    lum: { t: 15.5, h: 68.0, l: 78.0, ok: false, lbl: "ALERTA LUZ LDR", score: 60 },
    multi: { t: 26.0, h: 38.0, l: 85.0, ok: false, lbl: "CRITICO TOTAL", score: 20 }
  };
  const d = map[sc] || map.normal;
  sim = { t: d.t, h: d.h, l: d.l, score: d.score, mode: sc };
  updateHardwarePlaque(d.t, d.h, d.l, d.ok, d.lbl, d.score);
  updateScadaPlotly(d.t, d.h, d.l);
  document.querySelectorAll(".sc-btn").forEach(b => b.classList.toggle("active", b.dataset.sc === sc));
}

function renderCellarLots() {
  const c = document.getElementById("cellar-lots-grid");
  if (!c || typeof window.CANONICAL_LOTS === "undefined") return;
  c.innerHTML = window.CANONICAL_LOTS.slice(0, 8).map(l => `
    <div class="col-lg-6 col-xl-3 col-md-6 col-12"><div class="vineyard-card h-100">
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
  c.innerHTML = list.map(v => `
    <div class="col-lg-4 col-md-6 col-12"><div class="vineyard-card ${v.id === curArea ? "active-vineyard" : ""}" data-vid="${v.id}" style="cursor:pointer;" title="Clique para ativar este terroir">
      <div class="d-flex justify-content-between align-items-center mb-1"><strong style="font-size:0.84rem;">${v.flag} ${v.name}</strong><span class="sommelier-tag">GPS Ativo</span></div>
      <small class="text-muted d-block mb-1" style="font-size:0.74rem;">${v.country} · Lat ${v.lat.toFixed(1)}, Lon ${v.lon.toFixed(1)}</small>
      <div id="v-meteo-${v.id}" class="small fw-semibold text-secondary" style="font-size:0.74rem;">T: ${v.t}°C · U: ${v.h}% · L: ${v.l}%</div>
    </div></div>`).join("");
  c.querySelectorAll(".vineyard-card").forEach(card => card.addEventListener("click", () => {
    const vid = card.dataset.vid;
    const sel = document.getElementById("dropdown-area-terroir");
    if (sel) sel.value = vid;
    onAreaTerroirChange(vid);
  }));
}

async function fetchLiveScada() {
  if (sim.mode !== "normal" || curArea !== "wokwi_esp32") return;
  try {
    const res = await fetch("/api/v1/status", { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      if (d.telemetry) {
        sim.t = d.telemetry.temperature_c; sim.h = d.telemetry.humidity_pct; sim.l = d.telemetry.luminosity_pct;
        sim.score = d.health_score || calcHealthScore(sim.t, sim.h, sim.l, PRESETS[curPr]);
        updateHardwarePlaque(sim.t, sim.h, sim.l, sim.score >= 85, "WOKWI AO VIVO", sim.score);
        updateScadaPlotly(sim.t, sim.h, sim.l);
      }
    }
  } catch (_) {}
}

document.addEventListener("DOMContentLoaded", () => {
  renderCellarLots(); renderRealVineyards();
  document.getElementById("dropdown-wine-preset")?.addEventListener("change", (e) => onWinePresetChange(e.target.value));
  document.getElementById("dropdown-area-terroir")?.addEventListener("change", (e) => onAreaTerroirChange(e.target.value));
  document.querySelectorAll(".sc-btn").forEach(b => b.addEventListener("click", () => applyScenario(b.dataset.sc)));
  if (typeof Plotly !== "undefined") initScadaPlotly();
  else { const it = setInterval(() => { if (typeof Plotly !== "undefined") { clearInterval(it); initScadaPlotly(); } }, 150); }
  updateHardwarePlaque(15.5, 68, 12, true, "CAVA PRESERVADA", 100);
  setInterval(fetchLiveScada, 2500);
});
