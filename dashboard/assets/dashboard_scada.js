// SCADA Engine & Telemetria em Tempo Real — Vinheria Agnello & Wokwi
const PRESETS = window.PRESETS || {}, TERROIRS = window.TERROIRS || {};
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
    hT.push(+(sim.t + (Math.random() - 0.5) * 0.25).toFixed(1));
    hH.push(+(sim.h + (Math.random() - 0.5) * 0.8).toFixed(0));
    hL.push(+(sim.l + (Math.random() - 0.5) * 0.6).toFixed(0));
  }
  const isDark = document.documentElement.getAttribute("data-bs-theme") !== "light";
  const p = { bg: isDark ? "#121215" : "#ffffff", text: isDark ? "#f4f4f5" : "#0f172a", grid: isDark ? "#27272a" : "#e2e8f0" };
  const pr = PRESETS[curPr] || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
  const makeFig = (id, stroke, fill, unit, vals, low, high, yRng) => {
    Plotly.newPlot(id, [{
      x: hTime, y: vals, type: "scatter", mode: "lines", fill: "tozeroy", fillcolor: fill,
      line: { color: stroke, width: 2.5, shape: "spline", smoothing: 1.1 },
      hovertemplate: `<b>%{y:.1f} ${unit}</b><br><span style="font-size:0.68rem;color:#a1a1aa">%{x}</span><extra></extra>`
    }], {
      paper_bgcolor: p.bg, plot_bgcolor: p.bg, font: { color: p.text, family: "Plus Jakarta Sans", size: 10 },
      margin: { t: 15, r: 15, l: 36, b: 26 },
      xaxis: { gridcolor: p.grid, zeroline: false, nticks: 5, tickangle: 0, showline: false },
      yaxis: { gridcolor: p.grid, range: yRng, zeroline: false, nticks: 5 },
      shapes: [
        { type: "rect", xref: "paper", x0: 0, x1: 1, y0: low, y1: high, fillcolor: "rgba(34,197,94,0.12)", line: { width: 0 } },
        { type: "line", xref: "paper", x0: 0, x1: 1, y0: high, line: { color: "rgba(34,197,94,0.45)", width: 1, dash: "dot" } },
        { type: "line", xref: "paper", x0: 0, x1: 1, y0: low, line: { color: "rgba(34,197,94,0.45)", width: 1, dash: "dot" } }
      ]
    }, { responsive: true, displayModeBar: false });
  };
  makeFig("graph-temperature", "#ef4444", "rgba(239,68,68,0.10)", "°C", hT, pr.tMin, pr.tMax, [4, 30]);
  makeFig("graph-humidity", "#0284c7", "rgba(2,132,199,0.10)", "%", hH, pr.hMin, pr.hMax, [20, 100]);
  makeFig("graph-luminosity", "#d4af62", "rgba(212,175,98,0.10)", "%", hL, pr.lMin, pr.lMax, [0, 90]);
}

function updateScadaPlotly(t, h, l) {
  hTime.push(new Date().toLocaleTimeString()); hT.push(t); hH.push(h); hL.push(l);
  if (hTime.length > 20) { hTime.shift(); hT.shift(); hH.shift(); hL.shift(); }
  Plotly.update("graph-temperature", { x: [hTime], y: [hT] });
  Plotly.update("graph-humidity", { x: [hTime], y: [hH] });
  Plotly.update("graph-luminosity", { x: [hTime], y: [hL] });
  const vt = document.getElementById("chart-val-temp"), vh = document.getElementById("chart-val-hum"), vl = document.getElementById("chart-val-lum");
  if (vt) vt.textContent = `${t.toFixed(1)}°C`;
  if (vh) vh.textContent = `${h.toFixed(0)}%`;
  if (vl) vl.textContent = `${l.toFixed(0)}%`;
}

function updateHardwarePlaque(t, h, l) {
  const pr = PRESETS[curPr] || { wine: "Vinho Tinto", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
  const tr = TERROIRS[curArea] || { name: "ESP32 Wokwi", flag: "📟", country: "Wokwi" };
  const score = calcHealthScore(t, h, l, pr), st = evalStatus(t, h, l, pr, curArea);
  sim.score = score;
  const t1 = document.getElementById("barrel-mini-t1"), t2 = document.getElementById("barrel-mini-t2");
  if (t1) t1.textContent = `T:${t.toFixed(1)}°C U:${h.toFixed(0)}%`;
  const prTag = pr.name ? pr.name.substring(6, 11).toUpperCase().trim() : "TINTO";
  if (t2) t2.textContent = `${prTag} ${st.ok ? "1UP" : "ALR"}:${score}%`;
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
  curPr = presetKey; const p = PRESETS[curPr] || {};
  if (window.ArcadeAudio) window.ArcadeAudio.playClick();
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
  else { const tr = TERROIRS[curArea] || {}; sim.t = tr.t; sim.h = tr.h; sim.l = tr.l; }
  updateHardwarePlaque(sim.t, sim.h, sim.l); initScadaPlotly(); renderRealVineyards(); renderCellarLots(); syncCloudConfig();
}

function onThresholdInputChange() {
  const p = PRESETS[curPr] || {};
  const getVal = (id, def) => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? def : v; };
  p.tMin = getVal("trigger-temp-min", p.tMin); p.tMax = getVal("trigger-temp-max", p.tMax);
  p.hMin = getVal("trigger-hum-min", p.hMin); p.hMax = getVal("trigger-hum-max", p.hMax);
  p.lMin = getVal("trigger-lum-min", p.lMin); p.lMax = getVal("trigger-lum-max", p.lMax);
  updateHardwarePlaque(sim.t, sim.h, sim.l); initScadaPlotly(); renderCellarLots(); syncCloudConfig();
}

function onAreaTerroirChange(areaKey) {
  curArea = areaKey; const tr = TERROIRS[curArea] || {}, pr = PRESETS[curPr] || {};
  if (window.ArcadeAudio) window.ArcadeAudio.playClick();
  const sel = document.getElementById("dropdown-area-terroir");
  if (sel && sel.value !== curArea) sel.value = curArea;
  const desc = document.getElementById("terroir-description-text");
  if (desc) desc.textContent = curArea === "wokwi_esp32" ? "Telemetria climática autêntica por satélite e coordenadas GPS." : `Telemetria climática de ${tr.country} sincronizada via Open-Meteo GPS.`;
  if (curArea !== "wokwi_esp32") { sim.t = tr.t; sim.h = tr.h; sim.l = tr.l; }
  else { sim.t = pr.defT; sim.h = pr.defH; sim.l = pr.defL; }
  updateHardwarePlaque(sim.t, sim.h, sim.l); initScadaPlotly(); renderRealVineyards(); renderCellarLots(); syncCloudConfig();
}

function renderRealVineyards() {
  if (typeof window.renderRealVineyards === "function") {
    window.renderRealVineyards(curArea, onAreaTerroirChange);
  }
}

function renderCellarLots() {
  if (typeof window.renderCellarLots === "function") {
    window.renderCellarLots(curPr, sim.t, sim.h, sim.l, onWinePresetChange);
  }
}

function syncCloudConfig() {
  const tr = TERROIRS[curArea] || {};
  fetch("/api/v1/cloud/firebase/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device_id: "vine001", preset_key: curPr, terroir: { id: curArea, name: tr.name, country: tr.country } }) }).catch(() => {});
}

function applyScenario(sc) {
  const map = { normal:[15.6,68,12], temp:[24.5,68,12], hum:[15.6,42,12], lum:[15.6,68,78], multi:[26,38,85] };
  const d = map[sc] || map.normal;
  sim.t = d[0]; sim.h = d[1]; sim.l = d[2]; sim.mode = sc;
  if (window.ArcadeAudio) window.ArcadeAudio.playClick();
  updateHardwarePlaque(sim.t, sim.h, sim.l); updateScadaPlotly(sim.t, sim.h, sim.l); renderCellarLots();
  document.querySelectorAll(".sc-btn").forEach(b => b.classList.toggle("active", b.dataset.sc === sc));
}

async function fetchLiveTicker() {
  if (sim.mode !== "normal") return;
  if (curArea === "wokwi_esp32") {
    try {
      const res = await fetch("/api/v1/status", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        if (d.telemetry) { sim.t = d.telemetry.temperature_c; sim.h = d.telemetry.humidity_pct; sim.l = d.telemetry.luminosity_pct; }
      }
    } catch (_) {}
  } else {
    const tr = TERROIRS[curArea];
    if (tr && tr.t !== undefined) { sim.t = tr.t; sim.h = tr.h; sim.l = tr.l; }
  }
  updateHardwarePlaque(sim.t, sim.h, sim.l); updateScadaPlotly(sim.t, sim.h, sim.l); renderCellarLots();
}

document.addEventListener("DOMContentLoaded", () => {
  renderCellarLots(); renderRealVineyards();
  if (typeof window.startSatelliteLiveLoop === "function") {
    window.startSatelliteLiveLoop(() => curArea, onAreaTerroirChange);
  }
  window.addEventListener("satellitesUpdated", () => {
    if (curArea !== "wokwi_esp32") {
      const tr = TERROIRS[curArea];
      if (tr && sim.mode === "normal") { sim.t = tr.t; sim.h = tr.h; sim.l = tr.l; updateHardwarePlaque(sim.t, sim.h, sim.l); updateScadaPlotly(sim.t, sim.h, sim.l); renderCellarLots(); }
    }
  });
  const wineEl = document.getElementById("dropdown-wine-preset"), areaEl = document.getElementById("dropdown-area-terroir");
  if (wineEl) ["change", "input"].forEach(ev => wineEl.addEventListener(ev, e => onWinePresetChange(e.target.value)));
  if (areaEl) ["change", "input"].forEach(ev => areaEl.addEventListener(ev, e => onAreaTerroirChange(e.target.value)));
  ["temp-min","temp-max","hum-min","hum-max","lum-min","lum-max"].forEach(k => {
    const el = document.getElementById(`trigger-${k}`);
    if (el) ["input", "change"].forEach(ev => el.addEventListener(ev, onThresholdInputChange));
  });
  document.querySelectorAll(".wine-pill-btn").forEach(b => b.addEventListener("click", () => onWinePresetChange(b.dataset.wine)));
  document.querySelectorAll(".sc-btn").forEach(b => b.addEventListener("click", () => applyScenario(b.dataset.sc)));
  if (typeof Plotly !== "undefined") initScadaPlotly();
  else { const it = setInterval(() => { if (typeof Plotly !== "undefined") { clearInterval(it); initScadaPlotly(); } }, 150); }
  updateHardwarePlaque(15.6, 68, 12); setInterval(fetchLiveTicker, 1800);
});
