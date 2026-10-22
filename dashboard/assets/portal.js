/**
 * Portal HTML5 Sommelier — Vinheria Agnello (Landing Page Minimalista)
 * Telemetria Contínua da Barrica, Chimes de Áudio e Redirecionamento Dinâmico para o Dashboard
 */
let audioEnabled = false, audioCtx = null, backendApiActive = null;

window.AgnelloAPI = {
  getTelemetry: () => ({
    temperature_c: +(15.2 + Math.random() * 0.5).toFixed(1),
    humidity_pct: +(67.5 + Math.random() * 1.5).toFixed(0),
    luminosity_pct: +(11.5 + Math.random() * 1.0).toFixed(0),
    health_score: 100, timestamp: new Date().toLocaleTimeString()
  })
};

function playAcousticChime(freq = 523.25, dur = 0.18) {
  if (!audioEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
  } catch (_) {}
}

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
  playAcousticChime(659.25, 0.12);
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  const btn = document.getElementById("audio-toggle-btn");
  if (btn) btn.textContent = audioEnabled ? "🔊 Som: On" : "🔇 Som: Off";
  if (audioEnabled) playAcousticChime(784.0, 0.2);
}

function getDashboardUrl() {
  const host = window.location.hostname;
  const proto = window.location.protocol;
  if (proto === "file:" || !host) {
    return "dashboard.html";
  }
  if (host === "localhost" || host === "127.0.0.1") {
    if (window.location.port === "8050") return "/dashboard";
    return "http://127.0.0.1:8050";
  }
  return "dashboard.html";
}

function navigateToDashboard(e) {
  if (e) e.preventDefault();
  playAcousticChime(659.25, 0.18);
  const target = getDashboardUrl();
  setTimeout(() => {
    window.location.href = target;
  }, 120);
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
  const l0 = document.getElementById("lcd-line-0"), l1 = document.getElementById("lcd-line-1");
  if (l0) l0.textContent = `T:${t}C  U:${h}% *`;
  if (l1) l1.textContent = `L:${l}%  APOGEU:${score}%`;
  const m1 = document.getElementById("barrel-mini-t1"), m2 = document.getElementById("barrel-mini-t2");
  if (m1) m1.textContent = `T:${t}C U:${h}%`;
  if (m2) m2.textContent = `S:${score}% OK`;
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  document.getElementById("btn-dash-link")?.addEventListener("click", navigateToDashboard);
  document.getElementById("btn-open-dashboard")?.addEventListener("click", navigateToDashboard);
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.getElementById("audio-toggle-btn")?.addEventListener("click", toggleAudio);
  fetchLiveStatus();
  setInterval(fetchLiveStatus, 2500);
});
