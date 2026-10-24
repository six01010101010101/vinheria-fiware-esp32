/**
 * Portal HTML5 Sommelier — Vinheria Agnello (Landing Page Minimalista)
 * Telemetria Contínua da Barrica, Display CRT Verde e Abertura do Dashboard em Nova Aba
 */
let backendApiActive = null;

window.AgnelloAPI = {
  getTelemetry: () => {
    const w = Math.sin(Date.now() / 2400) * 0.15;
    return {
      temperature_c: +(15.5 + w).toFixed(1),
      humidity_pct: Math.min(100, Math.max(20, +(68.0 + Math.cos(Date.now() / 3100) * 0.4).toFixed(0))),
      luminosity_pct: +(12.0 + w * 0.5).toFixed(0),
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
  updateThemeMeta(nxt);
  window.arcadeAudio?.playWarp();
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
  const target = getDashboardUrl();
  window.open(target, "_blank", "noopener,noreferrer");
}

async function fetchLiveStatus() {
  let tel = null, score = 100;
  if (backendApiActive === null || backendApiActive) {
    try {
      const res = await fetch("/api/v1/status", { cache: "no-store" });
      backendApiActive = res.ok;
      if (backendApiActive) { const d = await res.json(); tel = d.telemetry; score = d.health_score || 100; }
    } catch (_) { backendApiActive = false; }
  }
  if (!tel) { tel = window.AgnelloAPI.getTelemetry(); score = tel.health_score; }
  const t = (tel.temperature_c || 15.5).toFixed(1), h = (tel.humidity_pct || 68).toFixed(0), l = (tel.luminosity_pct || 12).toFixed(0);

  const m1 = document.getElementById("barrel-mini-t1"), m2 = document.getElementById("barrel-mini-t2");
  if (m1) m1.textContent = `T:${t}°C U:${h}%`;
  if (m2) m2.textContent = `TINTO ${score >= 85 ? "1UP" : "ALR"}:${score}%`;

  const crt = document.getElementById("green-crt-text");
  if (crt) {
    const ok = score >= 85;
    crt.textContent = `+--------------------------------+\n| VINHERIA AGNELLO - CAVA ATIVA  |\n| T: ${t}°C  U: ${h}%  L: ${l}%        |\n| STATUS: CAVA PRESERVADA        |\n| APOGEU: ${score}% [${ok ? "PRESERVADO" : "ANOMALIA"}]       |\n+--------------------------------+`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  document.getElementById("btn-dash-link")?.addEventListener("click", handleDashboardOpen);
  document.getElementById("btn-open-dashboard")?.addEventListener("click", handleDashboardOpen);
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.getElementById("audio-toggle-btn")?.addEventListener("click", toggleAudio);
  fetchLiveStatus();
  setInterval(fetchLiveStatus, 1800);
});
