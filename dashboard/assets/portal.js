/**
 * Portal HTML5 Sommelier — Vinheria Agnello
 * Controle Reativo Client-Side, Polling REST API / AgnelloAPI, Web Audio Synth, Modal & Toggle
 */
let activeFilter = "all", activeSearch = "", currentLots = [], audioEnabled = false, audioCtx = null, backendApiActive = null;

window.AgnelloAPI = {
  getTelemetry: () => ({
    temperature_c: +(15.2 + Math.random() * 0.5).toFixed(1),
    humidity_pct: +(67.5 + Math.random() * 1.5).toFixed(0),
    luminosity_pct: +(11.5 + Math.random() * 1.0).toFixed(0),
    health_score: 100, timestamp: new Date().toLocaleTimeString()
  }),
  getLots: (f = "all") => {
    const list = window.CANONICAL_LOTS || [];
    return f === "all" ? list : list.filter(l => (l.style || l.wine_style) === f);
  }
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

function updateCounts(lots) {
  const ok = lots.filter(l => (l.health || l.health_score || 100) >= 90).length;
  document.getElementById("lots-total-count").textContent = lots.length;
  document.getElementById("lots-ok-count").textContent = ok;
  document.getElementById("lots-alert-count").textContent = lots.length - ok;
}

function renderLots(lots) {
  currentLots = lots;
  updateCounts(lots);
  const container = document.getElementById("lots-container");
  if (!container) return;
  const q = activeSearch.toLowerCase().trim();
  const filtered = lots.filter(l => {
    if (activeFilter !== "all" && (l.style || l.wine_style) !== activeFilter) return false;
    if (!q) return true;
    return `${l.code || l.lot_code} ${l.winery || l.winery_name} ${l.wine || l.wine_name} ${l.country} ${l.vintage}`.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="portal-card" style="grid-column: 1/-1; text-align:center; padding: 24px; color: var(--portal-muted);">Nenhum lote corresponde ao filtro selecionado.</div>`;
    return;
  }

  container.innerHTML = filtered.map(l => {
    const score = l.health || l.health_score || 100, sc = score >= 90 ? "#16a34a" : (score >= 70 ? "#eab308" : "#dc2626"), code = l.code || l.lot_code;
    return `<article class="portal-card card-clickable" data-code="${code}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span class="sommelier-tag">${l.country || "Mundial"} · Safra ${l.vintage}</span>
        <span style="font-size:0.75rem;font-weight:700;color:${sc};">Apogeu: ${score}%</span>
      </div>
      <h3 style="font-family:'Cinzel',serif;font-size:0.95rem;color:var(--portal-wine);margin-bottom:4px;">${l.winery || l.winery_name}</h3>
      <p style="font-weight:600;font-size:0.80rem;margin-bottom:6px;color:var(--portal-text);">${l.wine || l.wine_name}</p>
      <div style="font-size:0.72rem;color:var(--portal-muted);margin-bottom:8px;">
        <div>Terroir: ${l.soil || l.soil_type || "Argilo-calcário"}</div>
        <div>Barrica: ${l.barrel || l.barrel_type || "Carvalho"}</div>
        <div>Janela: ${l.apogee || l.expiration_date || "2030"}</div>
      </div>
      <div style="background:var(--portal-border);height:4px;border-radius:2px;overflow:hidden;"><div style="background:${sc};width:${score}%;height:100%;"></div></div>
    </article>`;
  }).join("");

  container.querySelectorAll(".card-clickable").forEach(card => {
    card.addEventListener("click", () => {
      const found = currentLots.find(x => (x.code || x.lot_code) === card.getAttribute("data-code"));
      if (found) showLotModal(found);
    });
  });
}

function showLotModal(l) {
  playAcousticChime(880.0, 0.15);
  const m = document.getElementById("lot-detail-modal"), title = document.getElementById("modal-title"), body = document.getElementById("modal-body");
  if (!m || !body) return;
  title.textContent = `${l.winery || l.winery_name} · ${l.wine || l.wine_name}`;
  body.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
    <div><strong>Código:</strong> ${l.code || l.lot_code}</div><div><strong>Safra:</strong> ${l.vintage} (${l.country})</div>
    <div><strong>Terroir:</strong> ${l.soil || l.soil_type || "N/D"}</div><div><strong>Afinamento:</strong> ${l.barrel || l.barrel_type || "N/D"}</div>
    <div><strong>Engarrafamento:</strong> ${l.bottling || l.bottling_date || "N/D"}</div><div><strong>Guarda:</strong> ${l.apogee || l.expiration_date || "N/D"}</div>
  </div><div style="background:var(--portal-gold-glow);border-left:3px solid var(--portal-gold);padding:8px 12px;border-radius:6px;font-size:0.78rem;">
    <strong>Laudo Sommelier:</strong> ${l.verdict || "Equilíbrio de guarda preservado nas cavas."}</div>`;
  m.showModal();
}

function toggleDashboard(forceOpen = null) {
  const dash = document.getElementById("full-dashboard-view");
  if (!dash) return;
  const isHidden = dash.style.display === "none", shouldOpen = forceOpen !== null ? forceOpen : isHidden;
  dash.style.display = shouldOpen ? "block" : "none";
  const btnDash = document.getElementById("btn-dash-link"), btnHero = document.getElementById("btn-open-dashboard");
  if (btnDash) btnDash.textContent = shouldOpen ? "🔼 Ocultar Dashboard" : "📊 Abrir Dashboard";
  if (btnHero) btnHero.textContent = shouldOpen ? "🔼 Recolher Dashboard" : "📊 Acessar Dashboard Completo da Adega";
  if (shouldOpen) {
    if (typeof window.resizePlotlyCharts === "function") window.resizePlotlyCharts();
    dash.scrollIntoView({ behavior: "smooth", block: "start" });
    playAcousticChime(659.25, 0.15);
  } else {
    document.getElementById("hero-simple-view")?.scrollIntoView({ behavior: "smooth", block: "start" });
    playAcousticChime(440.0, 0.12);
  }
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
  document.getElementById("kpi-temp-val").textContent = `${t}°C`;
  document.getElementById("kpi-hum-val").textContent = `${h}%`;
  document.getElementById("kpi-lum-val").textContent = `${l}%`;
  document.getElementById("cellar-score-val").textContent = `${score}%`;
  document.getElementById("lcd-line-0").textContent = `T:${t}C  U:${h}% *`;
  document.getElementById("lcd-line-1").textContent = `L:${l}%  APOGEU:${score}%`;
  const m1 = document.getElementById("barrel-mini-t1"), m2 = document.getElementById("barrel-mini-t2");
  if (m1) m1.textContent = `T:${t}C U:${h}%`;
  if (m2) m2.textContent = `S:${score}% OK`;
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  currentLots = window.CANONICAL_LOTS || [];
  renderLots(currentLots);
  document.getElementById("btn-dash-link")?.addEventListener("click", () => toggleDashboard());
  document.getElementById("btn-open-dashboard")?.addEventListener("click", () => toggleDashboard(true));
  document.getElementById("btn-close-dashboard")?.addEventListener("click", () => toggleDashboard(false));
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.getElementById("audio-toggle-btn")?.addEventListener("click", toggleAudio);
  document.getElementById("modal-close-btn")?.addEventListener("click", () => document.getElementById("lot-detail-modal")?.close());
  document.getElementById("lot-detail-modal")?.addEventListener("click", e => { if (e.target.id === "lot-detail-modal") e.target.close(); });
  document.getElementById("wine-search-input")?.addEventListener("input", e => { activeSearch = e.target.value; renderLots(currentLots); });
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      activeFilter = e.target.getAttribute("data-filter") || "all";
      renderLots(currentLots);
    });
  });
  fetchLiveStatus();
  setInterval(fetchLiveStatus, 2500);
});
