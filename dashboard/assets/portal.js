/**
 * Portal HTML5 Sommelier — Vinheria Agnello (Landing Page Minimalista)
 * Telemetria Contínua da Barrica, Display CRT Verde, Seleção de Vinho e Abertura do Dashboard.
 */
let backendApiActive = null;
let curPortalWine = "tinto";

window.AgnelloAPI = {
  getTelemetry: () => {
    const p = (window.PRESETS && window.PRESETS[curPortalWine]) || { defT: 15.2, defH: 71, defL: 9 };
    const w = Math.sin(Date.now() / 2400) * 0.15;
    return {
      temperature_c: +(p.defT + w).toFixed(1),
      humidity_pct: Math.min(100, Math.max(20, +(p.defH + Math.cos(Date.now() / 3100) * 0.4).toFixed(0))),
      luminosity_pct: +(p.defL + w * 0.5).toFixed(0),
      health_score: 100, timestamp: new Date().toLocaleTimeString()
    };
  }
};

function updateThemeMeta(t) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#09090b" : "#f8fafc");
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) btn.textContent = t === "dark" ? "☀️ Tema Claro" : "🌙 Tema Escuro";
}

function initTheme() {
  const saved = localStorage.getItem("portal_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeMeta(saved);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  const nxt = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", nxt);
  localStorage.setItem("portal_theme", nxt);
  localStorage.setItem("vinheria_theme", nxt);
  updateThemeMeta(nxt);
  window.arcadeAudio?.playThemeSwitch?.(nxt);
}

function toggleAudio() {
  const active = window.arcadeAudio ? window.arcadeAudio.toggle() : true;
  const btn = document.getElementById("audio-toggle-btn");
  if (btn) btn.textContent = active ? "🔊 Som: On" : "🔇 Som: Off";
}

function getDashboardUrl() {
  const host = window.location.hostname;
  const port = window.location.port;
  if ((host === "localhost" || host === "127.0.0.1") && port === "8050") return "/";
  return "dashboard.html";
}

function handleDashboardOpen(e) {
  if (e) e.preventDefault();
  window.arcadeAudio?.playCoin();
  window.location.href = getDashboardUrl();
}

function selectPortalWine(wineKey) {
  curPortalWine = (window.PRESETS && window.PRESETS[wineKey]) ? wineKey : "tinto";
  const p = (window.PRESETS && window.PRESETS[curPortalWine]) || { wine: "Château Margaux 2015", casta: "Cabernet Sauvignon" };
  const titleEl = document.getElementById("portal-active-wine-title");
  if (titleEl) titleEl.textContent = `${p.wine} · ${p.casta || p.name}`;
  document.querySelectorAll(".portal-wine-btn").forEach(b => {
    const isAct = b.dataset.wine === curPortalWine;
    b.style.background = isAct ? "linear-gradient(135deg, #be123c, #e11d48)" : "";
    b.style.color = isAct ? "#ffffff" : "";
    b.style.borderColor = isAct ? "#e11d48" : "";
  });
  window.arcadeAudio?.ensureContext?.();
  window.arcadeAudio?.playWineStyle?.(curPortalWine);
  fetchLiveStatus();
}

async function fetchLiveStatus() {
  const p = (window.PRESETS && window.PRESETS[curPortalWine]) || { key: "tinto", name: "Vinho Tinto", wine: "Château Margaux 2015", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
  const tel = window.AgnelloAPI.getTelemetry();
  const tNum = parseFloat(tel.temperature_c || p.defT || 15.2);
  const hNum = parseFloat(tel.humidity_pct || p.defH || 71);
  const lNum = parseFloat(tel.luminosity_pct || p.defL || 9);
  if (window.WokwiLCD) {
    const res = window.WokwiLCD.renderWokwiTwin({
      t: tNum, h: hNum, l: lNum,
      preset: p,
      terroir: { name: "Adega Central Agnello", flag: "🍷", country: "França / Brasil" },
      isWokwi: true, mode: "normal"
    });
    const stKey = res?.stateKey || "ideal";
    const cmd = stKey === "critico" ? "multi" : (stKey === "padrao" ? "padrao" : "normal");
    window.ScadaMQTT?.publishState?.({ t: tNum, h: hNum, l: lNum, cmd, stateKey: stKey, score: res?.score || 100, verdict: "OK", tag: res?.prTag || "TINTO" });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  document.getElementById("btn-dash-link")?.addEventListener("click", handleDashboardOpen);
  document.getElementById("btn-open-dashboard")?.addEventListener("click", handleDashboardOpen);
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.getElementById("audio-toggle-btn")?.addEventListener("click", toggleAudio);
  document.querySelectorAll(".portal-wine-btn").forEach(b => b.addEventListener("click", () => selectPortalWine(b.dataset.wine)));
  fetchLiveStatus();
  setInterval(fetchLiveStatus, 1800);
});
