// SCADA Engine & Telemetria em Tempo Real — Vinheria Agnello & Wokwi
const PRESETS = window.PRESETS || {}, TERROIRS = window.TERROIRS || {};
let curPr = "tinto", curArea = "wokwi_esp32", hTime = [], hT = [], hH = [], hL = [];
let sim = { t: 15.6, h: 68.0, l: 12.0, score: 100, mode: "normal" }, lastT = 15.6, lastH = 68, lastL = 12;
function getScenarioValues(sc, presetKey) {
  const p = PRESETS[presetKey] || PRESETS.tinto || { defT: 15.6, defH: 68, defL: 12, tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
  switch (sc) {
    case "temp": return [+(p.tMax + 5.5).toFixed(1), p.defH, p.defL];
    case "hum": return [p.defT, Math.max(20, +(p.hMin - 22).toFixed(0)), p.defL];
    case "lum": return [p.defT, p.defH, Math.min(100, Math.max(70, +(p.lMax + 50).toFixed(0)))];
    case "multi": return [+(p.tMax + 7.5).toFixed(1), Math.max(20, +(p.hMin - 24).toFixed(0)), Math.min(100, Math.max(75, +(p.lMax + 55).toFixed(0)))];
    case "normal": default: return [p.defT, p.defH, p.defL];
  }
}

function updateChartBadges(t, h, l, pr) {
  const p = pr || PRESETS[curPr] || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
  const vt = document.getElementById("chart-val-temp"), vh = document.getElementById("chart-val-hum"), vl = document.getElementById("chart-val-lum");
  const aT = t > lastT ? "▲ " : (t < lastT ? "▼ " : ""), aH = h > lastH ? "▲ " : (h < lastH ? "▼ " : ""), aL = l > lastL ? "▲ " : (l < lastL ? "▼ " : "");
  lastT = t; lastH = h; lastL = l;
  if (vt) { vt.textContent = `${aT}${t.toFixed(1)}°C`; vt.className = `badge font-monospace ${t >= p.tMin && t <= p.tMax ? "bg-success bg-opacity-25 text-success border border-success border-opacity-50" : "bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50"}`; }
  if (vh) { vh.textContent = `${aH}${h.toFixed(0)}%`; vh.className = `badge font-monospace ${h >= p.hMin && h <= p.hMax ? "bg-info bg-opacity-25 text-info border border-info border-opacity-50" : "bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50"}`; }
  if (vl) { vl.textContent = `${aL}${l.toFixed(0)}%`; vl.className = `badge font-monospace ${l <= p.lMax ? "bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50" : "bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50"}`; }
}

function initScadaPlotly() {
  const now = new Date();
  if (hTime.length === 0) {
    for (let i = 14; i >= 0; i--) {
      hTime.push(new Date(now - i * 1800).toLocaleTimeString());
      hT.push(+(sim.t + (Math.random() - 0.5) * 0.2).toFixed(1));
      hH.push(+(sim.h + (Math.random() - 0.5) * 0.6).toFixed(0));
      hL.push(+(sim.l + (Math.random() - 0.5) * 0.4).toFixed(0));
    }
  }
  const isDark = document.documentElement.getAttribute("data-bs-theme") !== "light";
  const pal = { bg: isDark ? "#121215" : "#ffffff", text: isDark ? "#f4f4f5" : "#111827", grid: isDark ? "#27272a" : "#e5e7eb" };
  const pr = PRESETS[curPr] || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
  const makeFig = (id, stroke, fill, unit, vals, low, high, yRng) => {
    const el = document.getElementById(id);
    if (!el || typeof Plotly === "undefined") return;
    const data = [{ x: hTime, y: vals, type: "scatter", mode: "lines", fill: "tozeroy", fillcolor: fill, line: { color: stroke, width: 2.8, shape: "spline", smoothing: 1.2 }, hovertemplate: `<b>%{y:.1f} ${unit}</b><br><span style="font-size:0.68rem;color:#a1a1aa">%{x}</span><extra></extra>` }];
    const layout = {
      paper_bgcolor: pal.bg, plot_bgcolor: pal.bg, font: { color: pal.text, family: "Plus Jakarta Sans", size: 10 },
      margin: { t: 15, r: 15, l: 36, b: 26 }, xaxis: { gridcolor: pal.grid, zeroline: false, nticks: 5, tickangle: 0, showline: false },
      yaxis: { gridcolor: pal.grid, range: yRng, zeroline: false, nticks: 5 },
      shapes: [
        { type: "rect", xref: "paper", x0: 0, x1: 1, y0: low, y1: high, fillcolor: "rgba(34,197,94,0.14)", line: { width: 0 } },
        { type: "line", xref: "paper", x0: 0, x1: 1, y0: high, line: { color: "rgba(34,197,94,0.55)", width: 1.2, dash: "dot" } },
        { type: "line", xref: "paper", x0: 0, x1: 1, y0: low, line: { color: "rgba(34,197,94,0.55)", width: 1.2, dash: "dot" } }
      ]
    };
    try { Plotly.react(id, data, layout, { responsive: true, displayModeBar: false }); } catch (_) {}
  };
  makeFig("graph-temperature", "#ef4444", "rgba(239,68,68,0.12)", "°C", hT, pr.tMin, pr.tMax, [Math.min(0, pr.tMin - 4), Math.max(30, pr.tMax + 6)]);
  makeFig("graph-humidity", "#0284c7", "rgba(2,132,199,0.12)", "%", hH, pr.hMin, pr.hMax, [Math.min(15, pr.hMin - 15), 100]);
  makeFig("graph-luminosity", "#d4af62", "rgba(212,175,98,0.12)", "%", hL, pr.lMin, pr.lMax, [0, Math.max(50, pr.lMax + 40)]);
  updateChartBadges(sim.t, sim.h, sim.l, pr);
}

function updateScadaPlotly(t, h, l) {
  hTime.push(new Date().toLocaleTimeString()); hT.push(t); hH.push(h); hL.push(l);
  if (hTime.length > 20) { hTime.shift(); hT.shift(); hH.shift(); hL.shift(); }
  initScadaPlotly();
}

function updateHardwarePlaque(t, h, l, userTriggered = false) {
  const pr = PRESETS[curPr] || { wine: "Vinho Tinto", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
  const tr = TERROIRS[curArea] || { name: "ESP32 Wokwi", flag: "📟", country: "Wokwi" };
  if (!window.WokwiLCD) return;
  const res = window.WokwiLCD.renderWokwiTwin({ t, h, l, preset: pr, terroir: tr, isWokwi: curArea === "wokwi_esp32", mode: sim.mode });
  if (res && res.score !== undefined) sim.score = res.score;
  const isOk = res?.st?.ok;
  let cmd = "normal";
  if (!isOk) {
    cmd = (res?.score < 70 || sim.mode === "multi" || res?.st?.lbl?.includes("CRÍTICO")) ? "multi" :
      res?.st?.lbl?.includes("TÉRMICO") ? "temp" : res?.st?.lbl?.includes("HIGRO") ? "hum" : "lum";
  }
  const bge = document.getElementById("mqtt-cmd-badge");
  if (bge) bge.innerHTML = `<span class="status-dot"></span>MQTT /cmd: ${cmd.toUpperCase()}`;
  document.querySelectorAll(".sc-btn").forEach(b => b.classList.toggle("active", b.dataset.sc === cmd));
  if (userTriggered) {
    window.arcadeAudio?.ensureContext?.();
    if (isOk) window.ArcadeAudio?.playPowerup?.();
    else if (cmd === "multi") window.ArcadeAudio?.playCritical?.();
    else window.ArcadeAudio?.playAlert?.();
    const tag = (pr.name||"").toUpperCase().includes("BRUT")?"BRUT":(pr.name||"").toUpperCase().includes("ROSE")?"ROSE":(pr.name||"").toUpperCase().includes("BRANCO")?"BRANCO":"TINTO";
    const sc = res?.score || 100, v = isOk ? "OK" : (cmd === "multi" ? "CRT" : "ALR");
    window.ScadaMQTT?.publishState?.({ t, h, l, cmd, score: sc, verdict: v, tag });
    fetch("/api/v1/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: cmd, preset: tag, health: sc, verdict: v, temperature: t, humidity: h, luminosity: l }) }).catch(() => {});
    fetch("/api/v1/telemetry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ temperature: t, humidity: h, luminosity: l, device_id: "vine001", alert_mode: cmd }) }).catch(() => {});
  }
}

function onWinePresetChange(presetKey) {
  curPr = presetKey; const p = PRESETS[curPr] || {};
  const sel = document.getElementById("dropdown-wine-preset"); if (sel && sel.value !== curPr) sel.value = curPr;
  document.querySelectorAll(".wine-pill-btn").forEach(b => b.classList.toggle("active", b.dataset.wine === curPr));
  ["temp-min","temp-max","hum-min","hum-max","lum-min","lum-max"].forEach((k, i) => {
    const el = document.getElementById(`trigger-${k}`); if (el) el.value = [p.tMin, p.tMax, p.hMin, p.hMax, p.lMin, p.lMax][i];
  });
  const descEl = document.getElementById("preset-description-text"); if (descEl) descEl.textContent = p.desc;
  const vals = curArea === "wokwi_esp32" ? getScenarioValues(sim.mode, curPr) : [TERROIRS[curArea]?.t, TERROIRS[curArea]?.h, TERROIRS[curArea]?.l];
  sim.t = vals[0]; sim.h = vals[1]; sim.l = vals[2];
  updateHardwarePlaque(sim.t, sim.h, sim.l, true); initScadaPlotly(); renderRealVineyards(); renderCellarLots(); syncCloudConfig();
}

function onThresholdInputChange() {
  const p = PRESETS[curPr] || {};
  const getVal = (id, def) => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? def : v; };
  p.tMin = getVal("trigger-temp-min", p.tMin); p.tMax = getVal("trigger-temp-max", p.tMax);
  p.hMin = getVal("trigger-hum-min", p.hMin); p.hMax = getVal("trigger-hum-max", p.hMax);
  p.lMin = getVal("trigger-lum-min", p.lMin); p.lMax = getVal("trigger-lum-max", p.lMax);
  updateHardwarePlaque(sim.t, sim.h, sim.l, true); initScadaPlotly(); renderCellarLots(); syncCloudConfig();
}

function onAreaTerroirChange(areaKey) {
  curArea = areaKey; const tr = TERROIRS[curArea] || {};
  const sel = document.getElementById("dropdown-area-terroir"); if (sel && sel.value !== curArea) sel.value = curArea;
  const desc = document.getElementById("terroir-description-text");
  if (desc) desc.textContent = curArea === "wokwi_esp32" ? "Telemetria climática autêntica por satélite e coordenadas GPS." : `Telemetria climática de ${tr.country} (${tr.name}) sincronizada via Open-Meteo GPS.`;
  if (curArea !== "wokwi_esp32") { sim.t = tr.t; sim.h = tr.h; sim.l = tr.l; sim.mode = "normal"; }
  else { const vals = getScenarioValues(sim.mode, curPr); sim.t = vals[0]; sim.h = vals[1]; sim.l = vals[2]; }
  updateHardwarePlaque(sim.t, sim.h, sim.l, true); initScadaPlotly(); renderRealVineyards(); renderCellarLots(); syncCloudConfig();
}

function onLotSelect(styleKey, terroirKey) {
  if (terroirKey && TERROIRS[terroirKey]) { curArea = terroirKey; const selT = document.getElementById("dropdown-area-terroir"); if (selT) selT.value = curArea; }
  onWinePresetChange(styleKey);
}
function renderRealVineyards() { if (typeof window.renderRealVineyards === "function") window.renderRealVineyards(curArea, onAreaTerroirChange); }
function renderCellarLots() { if (typeof window.renderCellarLots === "function") window.renderCellarLots(curPr, sim.t, sim.h, sim.l, onLotSelect); }
function syncCloudConfig() {
  const tr = TERROIRS[curArea] || {};
  fetch("/api/v1/cloud/firebase/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device_id: "vine001", preset_key: curPr, terroir: { id: curArea, name: tr.name, country: tr.country } }) }).catch(() => {});
}

function applyScenario(sc) {
  sim.mode = sc; const d = getScenarioValues(sc, curPr); sim.t = d[0]; sim.h = d[1]; sim.l = d[2];
  updateHardwarePlaque(sim.t, sim.h, sim.l, true); updateScadaPlotly(sim.t, sim.h, sim.l); renderCellarLots();
}
async function fetchLiveTicker() {
  if (curArea === "wokwi_esp32") {
    if (sim.mode === "normal") {
      try {
        const res = await fetch("/api/v1/status", { cache: "no-store" });
        if (res.ok) {
          const d = await res.json();
          if (d.meta?.live && d.telemetry) { sim.t = d.telemetry.temperature_c; sim.h = d.telemetry.humidity_pct; sim.l = d.telemetry.luminosity_pct; }
          else sim.t = +(sim.t + (Math.random() - 0.5) * 0.08).toFixed(1);
        }
      } catch (_) { sim.t = +(sim.t + (Math.random() - 0.5) * 0.08).toFixed(1); }
    } else {
      const b = getScenarioValues(sim.mode, curPr);
      sim.t = +(b[0] + (Math.random() - 0.5) * 0.08).toFixed(1); sim.h = +(b[1] + (Math.random() - 0.5) * 0.4).toFixed(0); sim.l = +(b[2] + (Math.random() - 0.5) * 0.3).toFixed(0);
    }
  } else {
    const tr = TERROIRS[curArea];
    if (tr && tr.t !== undefined) {
      if (sim.mode === "normal") { sim.t = tr.t; sim.h = tr.h; sim.l = tr.l; }
      else {
        const b = getScenarioValues(sim.mode, curPr);
        sim.t = +(b[0] + (Math.random() - 0.5) * 0.08).toFixed(1); sim.h = +(b[1] + (Math.random() - 0.5) * 0.4).toFixed(0); sim.l = +(b[2] + (Math.random() - 0.5) * 0.3).toFixed(0);
      }
    }
  }
  updateHardwarePlaque(sim.t, sim.h, sim.l, false); updateScadaPlotly(sim.t, sim.h, sim.l); renderCellarLots();
}

function bootScada() {
  renderCellarLots(); renderRealVineyards();
  window.ScadaMQTT?.init?.((d) => {
    if (d.t !== undefined) sim.t = d.t; if (d.h !== undefined) sim.h = d.h; if (d.l !== undefined) sim.l = d.l;
    updateHardwarePlaque(sim.t, sim.h, sim.l, false); updateScadaPlotly(sim.t, sim.h, sim.l);
  });
  window.startSatelliteLiveLoop?.(() => curArea, onAreaTerroirChange);
  window.addEventListener("satellitesUpdated", () => {
    const tr = TERROIRS[curArea];
    if (curArea !== "wokwi_esp32" && tr && sim.mode === "normal") {
      sim.t = tr.t; sim.h = tr.h; sim.l = tr.l;
      updateHardwarePlaque(sim.t, sim.h, sim.l, false); updateScadaPlotly(sim.t, sim.h, sim.l); renderCellarLots();
    }
  });
  const wineEl = document.getElementById("dropdown-wine-preset"), areaEl = document.getElementById("dropdown-area-terroir");
  if (wineEl) ["change", "input"].forEach(ev => wineEl.addEventListener(ev, e => onWinePresetChange(e.target.value)));
  if (areaEl) ["change", "input"].forEach(ev => areaEl.addEventListener(ev, e => onAreaTerroirChange(e.target.value)));
  ["temp-min","temp-max","hum-min","hum-max","lum-min","lum-max"].forEach(k => {
    const el = document.getElementById(`trigger-${k}`); if (el) ["input", "change"].forEach(ev => el.addEventListener(ev, onThresholdInputChange));
  });
  document.querySelectorAll(".wine-pill-btn").forEach(b => b.addEventListener("click", () => onWinePresetChange(b.dataset.wine)));
  document.querySelectorAll(".sc-btn").forEach(b => b.addEventListener("click", () => applyScenario(b.dataset.sc)));
  window.addEventListener("themeChanged", () => { if (typeof initScadaPlotly === "function") initScadaPlotly(); });
  window.addEventListener("resize", () => { ["graph-temperature", "graph-humidity", "graph-luminosity"].forEach(id => { try { Plotly.Plots.resize(document.getElementById(id)); } catch (_) {} }); });
  if (typeof Plotly !== "undefined") initScadaPlotly();
  else { const it = setInterval(() => { if (typeof Plotly !== "undefined") { clearInterval(it); initScadaPlotly(); } }, 150); }
  updateHardwarePlaque(15.6, 68, 12, false); setInterval(fetchLiveTicker, 1800);
}

window.onLotSelect = onLotSelect; window.onWinePresetChange = onWinePresetChange; window.onAreaTerroirChange = onAreaTerroirChange;
if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", bootScada); } else { bootScada(); }
