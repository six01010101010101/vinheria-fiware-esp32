/**
 * Portal HTML5 Sommelier — Vinheria Agnello
 * Controle Reativo Client-Side, Polling REST API, Web Audio Synth e Modal
 */

const FALLBACK_LOTS = [
  { code: "LOTE-FR-MARGAUX-01", winery: "Château Margaux", wine: "Premier Grand Cru Classé", style: "tinto", country: "França", region: "Bordeaux (Margaux)", vintage: 2015, bottling: "2017-06", barrel: "Carvalho Francês 100% Novo (18 meses)", soil: "Argilo-calcário com cascalho fino", apogee: "2025-2045", health: 100, verdict: "Equilíbrio Enológico Perfeito", temp: [12.0, 16.0], hum: [65.0, 75.0], lum: 15.0 },
  { code: "LOTE-IT-BRUNELLO-02", winery: "Biondi-Santi", wine: "Brunello di Montalcino Riserva", style: "tinto", country: "Itália", region: "Toscana (Montalcino)", vintage: 2016, bottling: "2021-04", barrel: "Botti de Carvalho da Eslavônia (36 meses)", soil: "Galestro e Alberese", apogee: "2026-2050", health: 100, verdict: "Afinamento Ótimo em Botti", temp: [13.0, 17.0], hum: [65.0, 75.0], lum: 15.0 },
  { code: "LOTE-BR-MIOLO43-05", winery: "Vinícola Miolo", wine: "Lote 43 Merlot / Cabernet", style: "tinto", country: "Brasil", region: "Vale dos Vinhedos (RS)", vintage: 2020, bottling: "2022-03", barrel: "Carvalho Francês de primeiro uso (12 meses)", soil: "Argiloso basáltico com drenagem", apogee: "2024-2032", health: 98, verdict: "Taninos Macios em Barrica", temp: [14.0, 18.0], hum: [60.0, 75.0], lum: 20.0 },
  { code: "LOTE-FR-CHABLIS-07", winery: "Domaine Laroche", wine: "Chablis Grand Cru Les Blanchots", style: "branco", country: "França", region: "Borgonha (Chablis)", vintage: 2021, bottling: "2022-09", barrel: "Inox climatizado e foudres neutros", soil: "Kimmeridgiano com fósseis de ostras", apogee: "2024-2034", health: 96, verdict: "Mineralidade e Acidez Preservadas", temp: [10.0, 14.0], hum: [65.0, 80.0], lum: 10.0 },
  { code: "LOTE-BR-VALDUGA130-08", winery: "Casa Valduga", wine: "Espumante 130 Brut Tradicional", style: "espumante", country: "Brasil", region: "Vale dos Vinhedos (RS)", vintage: 2021, bottling: "2022-01", barrel: "Afinamento sobre lias / autólise (36 meses)", soil: "Basalto vulcânico com argila", apogee: "2023-2027", health: 100, verdict: "Perlage Fino e Cremoso", temp: [8.0, 12.0], hum: [70.0, 85.0], lum: 10.0 }
];

let activeFilter = "all", activeSearch = "", currentLots = FALLBACK_LOTS, audioEnabled = false, audioCtx = null;

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
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t === "dark" ? "#09090b" : "#f8fafc");
}

function initTheme() {
  const saved = localStorage.getItem("portal_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeMeta(saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("portal_theme", next);
  updateThemeMeta(next);
  updateThemeIcon(next);
  playAcousticChime(659.25, 0.12);
}

function updateThemeIcon(t) {
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) btn.textContent = t === "dark" ? "☀️ Tema Claro" : "🌙 Tema Escuro";
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  const btn = document.getElementById("audio-toggle-btn");
  if (btn) btn.textContent = audioEnabled ? "🔊 Som: On" : "🔇 Som: Off";
  if (audioEnabled) playAcousticChime(784.0, 0.2);
}

function updateCounts(lots) {
  const ok = lots.filter(l => (l.health || l.health_score || 100) >= 90).length;
  const alert = lots.length - ok;
  const tEl = document.getElementById("lots-total-count"), okEl = document.getElementById("lots-ok-count"), alEl = document.getElementById("lots-alert-count");
  if (tEl) tEl.textContent = lots.length;
  if (okEl) okEl.textContent = ok;
  if (alEl) alEl.textContent = alert;
}

function renderLots(lots) {
  currentLots = lots;
  updateCounts(lots);
  const container = document.getElementById("lots-container");
  if (!container) return;
  const q = activeSearch.toLowerCase().trim();
  const filtered = lots.filter(l => {
    const styleMatch = activeFilter === "all" || (l.style || l.wine_style) === activeFilter;
    if (!styleMatch) return false;
    if (!q) return true;
    const haystack = `${l.code || l.lot_code || ""} ${l.winery || l.winery_name || ""} ${l.wine || l.wine_name || ""} ${l.country || ""} ${l.vintage || ""}`.toLowerCase();
    return haystack.includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="portal-card" style="grid-column: 1/-1; text-align:center; padding: 24px; color: var(--portal-muted);">Nenhum lote corresponde ao filtro selecionado.</div>`;
    return;
  }

  container.innerHTML = filtered.map(l => {
    const score = l.health || l.health_score || 100;
    const scoreColor = score >= 90 ? "#16a34a" : (score >= 70 ? "#eab308" : "#dc2626");
    const code = l.code || l.lot_code;
    return `
      <article class="portal-card card-clickable" data-code="${code}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span class="sommelier-tag">${l.country || "Mundial"} · Safra ${l.vintage}</span>
          <span style="font-size:0.75rem;font-weight:700;color:${scoreColor};">Apogeu: ${score}%</span>
        </div>
        <h3 style="font-family:'Cinzel',serif;font-size:0.95rem;color:var(--portal-wine);margin-bottom:4px;">${l.winery || l.winery_name}</h3>
        <p style="font-weight:600;font-size:0.80rem;margin-bottom:6px;color:var(--portal-text);">${l.wine || l.wine_name}</p>
        <div style="font-size:0.72rem;color:var(--portal-muted);margin-bottom:8px;">
          <div>Terroir: ${l.soil || l.soil_type || "Argilo-calcário"}</div>
          <div>Barrica: ${l.barrel || l.barrel_type || "Carvalho"}</div>
          <div>Janela: ${l.apogee || l.expiration_date || "2030"}</div>
        </div>
        <div style="background:var(--portal-border);height:4px;border-radius:2px;overflow:hidden;">
          <div style="background:${scoreColor};width:${score}%;height:100%;"></div>
        </div>
      </article>`;
  }).join("");

  container.querySelectorAll(".card-clickable").forEach(card => {
    card.addEventListener("click", () => {
      const code = card.getAttribute("data-code");
      const found = currentLots.find(x => (x.code || x.lot_code) === code);
      if (found) showLotModal(found);
    });
  });
}

function showLotModal(l) {
  playAcousticChime(880.0, 0.15);
  const m = document.getElementById("lot-detail-modal"), title = document.getElementById("modal-title"), body = document.getElementById("modal-body");
  if (!m || !body) return;
  title.textContent = `${l.winery || l.winery_name} · ${l.wine || l.wine_name}`;
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <div><strong>Código:</strong> ${l.code || l.lot_code}</div>
      <div><strong>Safra:</strong> ${l.vintage} (${l.country})</div>
      <div><strong>Terroir:</strong> ${l.soil || l.soil_type || "N/D"}</div>
      <div><strong>Afinamento:</strong> ${l.barrel || l.barrel_type || "N/D"}</div>
      <div><strong>Engarrafamento:</strong> ${l.bottling || l.bottling_date || "N/D"}</div>
      <div><strong>Guarda Máxima:</strong> ${l.apogee || l.expiration_date || "N/D"}</div>
    </div>
    <div style="background:var(--portal-gold-glow);border-left:3px solid var(--portal-gold);padding:8px 12px;border-radius:6px;font-size:0.78rem;">
      <strong>Laudo do Sommelier:</strong> ${l.verdict || "Equilíbrio de guarda preservado nas cavas."}
    </div>`;
  m.showModal();
}

async function fetchLiveStatus() {
  try {
    const res = await fetch("/api/v1/status");
    if (!res.ok) throw new Error("Offline");
    const data = await res.json(), tel = data.telemetry || {};
    const t = tel.temperature_c?.toFixed(1) || "15.5", h = tel.humidity_pct?.toFixed(0) || "68", l = tel.luminosity_pct?.toFixed(0) || "12", s = data.health_score || 100;
    document.getElementById("kpi-temp-val").textContent = `${t}°C`; document.getElementById("kpi-hum-val").textContent = `${h}%`;
    document.getElementById("kpi-lum-val").textContent = `${l}%`; document.getElementById("cellar-score-val").textContent = `${s}%`;
    document.getElementById("lcd-line-0").textContent = `T:${t}C  U:${h}% *`; document.getElementById("lcd-line-1").textContent = `L:${l}%  APOGEU:${s}%`;
  } catch (_) {
    document.getElementById("kpi-temp-val").textContent = "15.5°C"; document.getElementById("kpi-hum-val").textContent = "68%";
    document.getElementById("kpi-lum-val").textContent = "12%"; document.getElementById("cellar-score-val").textContent = "100%";
  }
}

async function fetchLots() {
  try {
    const res = await fetch("/api/v1/lots");
    if (!res.ok) throw new Error("Offline");
    const data = await res.json();
    renderLots(data.lots && data.lots.length ? data.lots : FALLBACK_LOTS);
  } catch (_) {
    renderLots(FALLBACK_LOTS);
  }
}

function initDashboardLink() {
  const btn = document.getElementById("btn-dash-link");
  if (!btn) return;
  btn.setAttribute("href", "dashboard.html");
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initDashboardLink();
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.getElementById("audio-toggle-btn")?.addEventListener("click", toggleAudio);
  document.getElementById("modal-close-btn")?.addEventListener("click", () => document.getElementById("lot-detail-modal")?.close());
  document.getElementById("lot-detail-modal")?.addEventListener("click", (e) => { if (e.target.id === "lot-detail-modal") e.target.close(); });
  document.getElementById("wine-search-input")?.addEventListener("input", (e) => { activeSearch = e.target.value; renderLots(currentLots); });
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      activeFilter = e.target.getAttribute("data-filter") || "all";
      renderLots(currentLots);
    });
  });
  fetchLiveStatus(); fetchLots(); setInterval(fetchLiveStatus, 2000);
});
