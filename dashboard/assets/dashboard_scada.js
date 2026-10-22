// Engine SCADA e Telemetria em Tempo Real — Padrão Oficial Vinheria Agnello
const PRESETS = {
  tinto: { name: "🍷 Tintos de Guarda (Cabernet / Merlot / Tannat)", tMin: 12.0, tMax: 16.0, hMin: 65.0, hMax: 75.0, lMin: 0.0, lMax: 15.0, desc: "Temperatura ideal de 12.0°C a 16.0°C. Higrometria de 65% a 75% para preservação das rolhas." },
  branco: { name: "🥂 Brancos Nobres & Chablis (Chardonnay)", tMin: 10.0, tMax: 14.0, hMin: 65.0, hMax: 80.0, lMin: 0.0, lMax: 10.0, desc: "Conservação límpida de 10.0°C a 14.0°C. Penumbra máxima de 10% para evitar fotoxidação." },
  espumante: { name: "🍾 Espumantes Brut & Champagne", tMin: 8.0, tMax: 12.0, hMin: 70.0, hMax: 85.0, lMin: 0.0, lMax: 10.0, desc: "Climatização fresca de 8.0°C a 12.0°C. Umidade de até 85% para selagem e autólise." }
};

const LOTS = [
  { code: "LOTE-FR-MARGAUX-01", winery: "Château Margaux", wine: "Premier Grand Cru Classé", country: "França", vintage: 2015, barrel: "Carvalho Francês 100% Novo", soil: "Argilo-calcário com cascalho", apogee: "2025-2045", health: 100 },
  { code: "LOTE-IT-BRUNELLO-02", winery: "Biondi-Santi", wine: "Brunello di Montalcino Riserva", country: "Itália", vintage: 2016, barrel: "Botti de Carvalho da Eslavônia", soil: "Galestro e Alberese", apogee: "2026-2050", health: 100 },
  { code: "LOTE-BR-MIOLO43-05", winery: "Vinícola Miolo", wine: "Lote 43 Merlot / Cabernet", country: "Brasil", vintage: 2020, barrel: "Carvalho Francês 12 meses", soil: "Argiloso basáltico", apogee: "2024-2032", health: 98 },
  { code: "LOTE-FR-CHABLIS-07", winery: "Domaine Laroche", wine: "Chablis Grand Cru Les Blanchots", country: "França", vintage: 2021, barrel: "Inox & Foudres Neutros", soil: "Kimmeridgiano Calcário", apogee: "2024-2034", health: 96 }
];

const VINES = [
  { id: "miolo", name: "Vinícola Miolo", reg: "Vale dos Vinhedos (RS)", flag: "🇧🇷", lat: -29.18, lon: -51.55 },
  { id: "francioni", name: "Villa Francioni", reg: "São Joaquim (SC)", flag: "🇧🇷", lat: -28.29, lon: -49.93 },
  { id: "guaspari", name: "Vinícola Guaspari", reg: "Pinhal (SP)", flag: "🇧🇷", lat: -22.18, lon: -46.74 },
  { id: "catena", name: "Catena Zapata", reg: "Mendoza", flag: "🇦🇷", lat: -33.16, lon: -68.91 },
  { id: "concha", name: "Concha y Toro", reg: "Vale do Maipo", flag: "🇨🇱", lat: -33.64, lon: -70.57 },
  { id: "margaux", name: "Château Margaux", reg: "Bordeaux", flag: "🇫🇷", lat: 45.04, lon: -0.66 },
  { id: "antinori", name: "Marchesi Antinori", reg: "Toscana", flag: "🇮🇹", lat: 43.61, lon: 11.21 },
  { id: "crasto", name: "Quinta do Crasto", reg: "Douro", flag: "🇵🇹", lat: 41.16, lon: -7.63 },
  { id: "opus", name: "Opus One", reg: "Napa Valley", flag: "🇺🇸", lat: 38.43, lon: -122.40 }
];

let curPr = "tinto", hTime = [], hT = [], hH = [], hL = [];
let sim = { t: 15.5, h: 68.0, l: 12.0, score: 100, mode: "normal" };

function getThemePalette() {
  const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
  return { bg: isDark ? "#121215" : "#ffffff", text: isDark ? "#f4f4f5" : "#0f172a", grid: isDark ? "#27272a" : "#e2e8f0" };
}

function initScadaPlotly() {
  const now = new Date(); hTime = []; hT = []; hH = []; hL = [];
  for (let i = 12; i >= 0; i--) {
    hTime.push(new Date(now - i * 2500).toLocaleTimeString());
    hT.push(+(15.2 + Math.random() * 0.5).toFixed(1));
    hH.push(+(67.5 + Math.random() * 1.5).toFixed(0));
    hL.push(+(11.5 + Math.random() * 1.0).toFixed(0));
  }
  const p = getThemePalette(), pr = PRESETS[curPr];
  const makeFig = (elemId, color, traceName, vals, low, high, yRng) => {
    const trace = { x: hTime, y: vals, name: traceName, type: "scatter", mode: "lines+markers", line: { color, width: 2 } };
    const layout = {
      paper_bgcolor: p.bg, plot_bgcolor: p.bg, font: { color: p.text, family: "Plus Jakarta Sans" },
      margin: { t: 25, r: 20, l: 38, b: 25 }, xaxis: { gridcolor: p.grid, zeroline: false },
      yaxis: { gridcolor: p.grid, range: yRng, zeroline: false },
      shapes: [{ type: "rect", xref: "paper", x0: 0, x1: 1, y0: low, y1: high, fillcolor: "rgba(34,197,94,0.10)", line: { width: 0 } }]
    };
    Plotly.newPlot(elemId, [trace], layout, { responsive: true, displayModeBar: false });
  };
  makeFig("graph-temperature", "#ef4444", "Temperatura", hT, pr.tMin, pr.tMax, [5, 32]);
  makeFig("graph-humidity", "#0284c7", "Higrometria", hH, pr.hMin, pr.hMax, [20, 100]);
  makeFig("graph-luminosity", "#d4af62", "Penumbra", hL, pr.lMin, pr.lMax, [0, 100]);
}

function updateScadaPlotly(t, h, l) {
  const ts = new Date().toLocaleTimeString();
  hTime.push(ts); hT.push(t); hH.push(h); hL.push(l);
  if (hTime.length > 20) { hTime.shift(); hT.shift(); hH.shift(); hL.shift(); }
  Plotly.update("graph-temperature", { x: [hTime], y: [hT] });
  Plotly.update("graph-humidity", { x: [hTime], y: [hH] });
  Plotly.update("graph-luminosity", { x: [hTime], y: [hL] });
}

function updateHardwarePlaque(t, h, l, ok, lbl, score) {
  const t1 = document.getElementById("barrel-mini-t1"), t2 = document.getElementById("barrel-mini-t2");
  if (t1) t1.textContent = `T:${t.toFixed(1)}C U:${h.toFixed(0)}%`;
  if (t2) t2.textContent = `S:${score}% ${ok ? "OK" : "ALR"}`;
  const crt = document.getElementById("green-crt-text");
  if (crt) crt.textContent = `+--------------------------------+\n| VINHERIA AGNELLO - CAVA ATIVA   |\n| T:${t.toFixed(1)}C  U:${h.toFixed(0)}%  L:${l.toFixed(0)}%             |\n| STATUS: ${lbl.padEnd(23, " ")}|\n| APOGEU: ${score}% [${ok ? "PRESERVADO" : "ANOMALIA"}]       |\n+--------------------------------+`;
  const ledG = document.getElementById("led-green"), ledR = document.getElementById("led-red"), ledB = document.getElementById("led-blue");
  if (ledG) ledG.className = ok ? "led-indicator led-green-on" : "led-indicator led-green-off";
  if (ledR) ledR.className = ok ? "led-indicator led-red-off" : "led-indicator led-red-on";
  if (ledB) ledB.className = ok ? "led-indicator led-blue-off" : "led-indicator led-blue-blinking";
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
  if (!c) return;
  c.innerHTML = LOTS.map(l => `
    <div class="col-lg-6 col-xl-3 col-md-6 col-12">
      <div class="vineyard-card h-100">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="sommelier-tag">${l.code}</span>
          <span class="badge bg-secondary" style="font-size:0.62rem;">${l.country} · ${l.vintage}</span>
        </div>
        <div class="lot-wine-title text-truncate mb-1">${l.winery} — ${l.wine}</div>
        <div class="progress mb-2 rounded-pill" style="height:4px;"><div class="progress-bar bg-success" style="width:${l.health}%;"></div></div>
        <div class="text-muted text-truncate mb-1" style="font-size:0.70rem;">Terroir: ${l.soil}</div>
        <div class="d-flex justify-content-between small text-muted" style="font-size:0.72rem;">
          <span>Barrica: ${l.barrel}</span><span class="text-wine fw-bold">Guarda: ${l.apogee}</span>
        </div>
      </div>
    </div>`).join("");
}

async function renderRealVineyards() {
  const c = document.getElementById("real-vineyards-grid");
  if (!c) return;
  c.innerHTML = VINES.map(v => `
    <div class="col-lg-4 col-md-6 col-12">
      <div class="vineyard-card">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <strong style="font-size:0.84rem;">${v.flag} ${v.name}</strong>
          <span class="sommelier-tag">Terroir</span>
        </div>
        <small class="text-muted d-block mb-1" style="font-size:0.74rem;">${v.reg}</small>
        <div id="v-meteo-${v.id}" class="small fw-semibold text-secondary" style="font-size:0.74rem;">Consultando satélite...</div>
      </div>
    </div>`).join("");
  for (const v of VINES.slice(0, 6)) {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&current=temperature_2m,relative_humidity_2m&timezone=auto`);
      if (res.ok) {
        const d = await res.json(), cur = d.current || {};
        const el = document.getElementById(`v-meteo-${v.id}`);
        if (el) el.innerHTML = `<span class="text-danger">${cur.temperature_2m || 18}°C</span> · <span class="text-info">${cur.relative_humidity_2m || 65}%</span> · <span class="text-success">Clima Estável</span>`;
      }
    } catch (_) {}
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderCellarLots(); renderRealVineyards();
  document.getElementById("dropdown-wine-preset")?.addEventListener("change", (e) => {
    curPr = e.target.value; const p = PRESETS[curPr];
    document.getElementById("trigger-temp-min").value = p.tMin; document.getElementById("trigger-temp-max").value = p.tMax;
    document.getElementById("trigger-hum-min").value = p.hMin; document.getElementById("trigger-hum-max").value = p.hMax;
    document.getElementById("trigger-lum-min").value = p.lMin; document.getElementById("trigger-lum-max").value = p.lMax;
    document.getElementById("preset-description-text").textContent = p.desc;
    initScadaPlotly();
  });
  document.querySelectorAll(".sc-btn").forEach(b => b.addEventListener("click", () => applyScenario(b.dataset.sc)));
  if (typeof Plotly !== "undefined") initScadaPlotly();
  else { const it = setInterval(() => { if (typeof Plotly !== "undefined") { clearInterval(it); initScadaPlotly(); } }, 150); }
  updateHardwarePlaque(15.5, 68, 12, true, "CAVA PRESERVADA", 100);
  setInterval(() => {
    if (sim.mode === "normal") {
      const t = +(15.3 + Math.random() * 0.4).toFixed(1), h = +(67.5 + Math.random() * 1.5).toFixed(0), l = +(11.5 + Math.random() * 1.0).toFixed(0);
      updateHardwarePlaque(t, h, l, true, "CAVA PRESERVADA", 100);
      updateScadaPlotly(t, h, l);
    }
  }, 2500);
});
