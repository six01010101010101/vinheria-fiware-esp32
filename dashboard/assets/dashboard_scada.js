// SCADA Engine & Telemetria em Tempo Real — Vinheria Agnello & Wokwi
const PRESETS = window.PRESETS || {}, TERROIRS = window.TERROIRS || {};
let curPr = "tinto", curArea = "wokwi_esp32", hTime = [], hT = [], hH = [], hL = [];
let sim = { t: 15.6, h: 68.0, l: 12.0, score: 100, mode: "normal" };

function calcHealthScore(t, h, l, pr) {
  return window.WokwiLCD ? window.WokwiLCD.calcHealthScore(t, h, l, pr) : 100;
}

function evalStatus(t, h, l, pr, area) {
  return window.WokwiLCD ? window.WokwiLCD.evalStatus(t, h, l, pr, area === "wokwi_esp32") : { ok: true, lbl: "OK" };
}

function updateChartBadges(t, h, l, pr) {
  const p = pr || PRESETS[curPr] || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
  const vt = document.getElementById("chart-val-temp"), vh = document.getElementById("chart-val-hum"), vl = document.getElementById("chart-val-lum");
  if (vt) { vt.textContent = `${t.toFixed(1)}°C`; const ok = t >= p.tMin && t <= p.tMax; vt.className = `badge font-monospace ${ok ? "bg-success bg-opacity-25 text-success border border-success border-opacity-50" : "bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50"}`; }
  if (vh) { vh.textContent = `${h.toFixed(0)}%`; const ok = h >= p.hMin && h <= p.hMax; vh.className = `badge font-monospace ${ok ? "bg-info bg-opacity-25 text-info border border-info border-opacity-50" : "bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50"}`; }
  if (vl) { vl.textContent = `${l.toFixed(0)}%`; const ok = l <= p.lMax; vl.className = `badge font-monospace ${ok ? "bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50" : "bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50"}`; }
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
  const p = { bg: isDark ? "#121215" : "#ffffff", text: isDark ? "#f4f4f5" : "#111827", grid: isDark ? "#27272a" : "#e5e7eb" };
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
        { type: "rect", xref: "paper", x0: 0, x1: 1, y0: low, y1: high, fillcolor: "rgba(34,197,94,0.14)", line: { width: 0 } },
        { type: "line", xref: "paper", x0: 0, x1: 1, y0: high, line: { color: "rgba(34,197,94,0.55)", width: 1.2, dash: "dot" } },
        { type: "line", xref: "paper", x0: 0, x1: 1, y0: low, line: { color: "rgba(34,197,94,0.55)", width: 1.2, dash: "dot" } }
      ]
    }, { responsive: true, displayModeBar: false });
  };
  makeFig("graph-temperature", "#ef4444", "rgba(239,68,68,0.10)", "°C", hT, pr.tMin, pr.tMax, [Math.min(4, pr.tMin - 4), Math.max(28, pr.tMax + 4)]);
  makeFig("graph-humidity", "#0284c7", "rgba(2,132,199,0.10)", "%", hH, pr.hMin, pr.hMax, [Math.min(30, pr.hMin - 10), Math.max(95, pr.hMax + 10)]);
  makeFig("graph-luminosity", "#d4af62", "rgba(212,175,98,0.10)", "%", hL, pr.lMin, pr.lMax, [0, Math.max(50, pr.lMax + 25)]);
  updateChartBadges(sim.t, sim.h, sim.l, pr);
}

function updateScadaPlotly(t, h, l) {
  hTime.push(new Date().toLocaleTimeString()); hT.push(t); hH.push(h); hL.push(l);
  if (hTime.length > 20) { hTime.shift(); hT.shift(); hH.shift(); hL.shift(); }
  Plotly.update("graph-temperature", { x: [hTime], y: [hT] });
  Plotly.update("graph-humidity", { x: [hTime], y: [hH] });
  Plotly.update("graph-luminosity", { x: [hTime], y: [hL] });
  updateChartBadges(t, h, l);
}

function updateHardwarePlaque(t, h, l) {
  const pr = PRESETS[curPr] || { wine: "Vinho Tinto", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
  const tr = TERROIRS[curArea] || { name: "ESP32 Wokwi", flag: "📟", country: "Wokwi" };
  if (window.WokwiLCD) {
    const res = window.WokwiLCD.renderWokwiTwin({
      t, h, l, preset: pr, terroir: tr, isWokwi: curArea === "wokwi_esp32", mode: sim.mode
    });
    if (res && res.score !== undefined) sim.score = res.score;
  }
}

function onWinePresetChange(presetKey) {
  curPr = presetKey; const p = PRESETS[curPr] || {};
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
  const ok = (sim.t >= p.tMin && sim.t <= p.tMax && sim.h >= p.hMin && sim.h <= p.hMax && sim.l <= p.lMax);
  if (window.ArcadeAudio) { if (ok) window.ArcadeAudio.playClick(); else window.ArcadeAudio.playAlert(); }
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
  curArea = areaKey; const tr = TERROIRS[curArea] || {}, p = PRESETS[curPr] || {};
  const sel = document.getElementById("dropdown-area-terroir");
  if (sel && sel.value !== curArea) sel.value = curArea;
  const desc = document.getElementById("terroir-description-text");
  if (desc) desc.textContent = curArea === "wokwi_esp32" ? "Telemetria climática autêntica por satélite e coordenadas GPS." : `Telemetria climática de ${tr.country} sincronizada via Open-Meteo GPS.`;
  if (curArea !== "wokwi_esp32") { sim.t = tr.t; sim.h = tr.h; sim.l = tr.l; }
  else { sim.t = p.defT; sim.h = p.defH; sim.l = p.defL; }
  const ok = (sim.t >= p.tMin && sim.t <= p.tMax && sim.h >= p.hMin && sim.h <= p.hMax && sim.l <= p.lMax);
  if (window.ArcadeAudio) { if (ok) window.ArcadeAudio.playClick(); else window.ArcadeAudio.playAlert(); }
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
  if (sc === "normal") window.ArcadeAudio?.playPowerup?.();
  else window.ArcadeAudio?.playAlert?.();
  updateHardwarePlaque(sim.t, sim.h, sim.l); updateScadaPlotly(sim.t, sim.h, sim.l); renderCellarLots();
  document.querySelectorAll(".sc-btn").forEach(b => b.classList.toggle("active", b.dataset.sc === sc));
  const bzIcon = document.getElementById("buzzer-status-icon"), bzTxt = document.getElementById("buzzer-status-text");
  const bzMap = { normal:["🔇","D4 Mudo"], temp:["🔊","D4 Bip Temp"], hum:["🔊","D4 Pulso Higro"], lum:["🔊","D4 Alerta LDR"], multi:["🚨","D4 Sirene"] };
  const bz = bzMap[sc] || bzMap.normal;
  if (bzIcon) bzIcon.textContent = bz[0]; if (bzTxt) bzTxt.textContent = bz[1];
  const bge = document.getElementById("mqtt-cmd-badge");
  fetch("/api/v1/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: sc }) })
    .then(r => r.json()).then(res => { if (bge) bge.innerHTML = `<span class="status-dot"></span>MQTT: ${sc.toUpperCase()} (${res.ok ? "200" : "SYNC"})`; }).catch(() => {});
  fetch("/api/v1/telemetry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ temperature: sim.t, humidity: sim.h, luminosity: sim.l }) }).catch(() => {});
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

function bootScada() {
  renderCellarLots(); renderRealVineyards();
  window.startSatelliteLiveLoop?.(() => curArea, onAreaTerroirChange);
  window.addEventListener("satellitesUpdated", () => {
    const tr = TERROIRS[curArea];
    if (curArea !== "wokwi_esp32" && tr && sim.mode === "normal") { sim.t = tr.t; sim.h = tr.h; sim.l = tr.l; updateHardwarePlaque(sim.t, sim.h, sim.l); updateScadaPlotly(sim.t, sim.h, sim.l); renderCellarLots(); }
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
  window.addEventListener("themeChanged", () => { if (typeof initScadaPlotly === "function") initScadaPlotly(); });
  if (typeof Plotly !== "undefined") initScadaPlotly();
  else { const it = setInterval(() => { if (typeof Plotly !== "undefined") { clearInterval(it); initScadaPlotly(); } }, 150); }
  updateHardwarePlaque(15.6, 68, 12); setInterval(fetchLiveTicker, 1800);
}

if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", bootScada); } else { bootScada(); }
