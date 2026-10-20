/**
 * Portal HTML5 Sommelier — Vinheria Agnello
 * Controle Reativo Client-Side, Polling REST API e Filtros de Lote
 */

const FALLBACK_LOTS = [
  { code: "LOTE-FR-MARGAUX-01", winery: "Château Margaux", wine: "Premier Grand Cru Classé", style: "tinto", country: "França", vintage: 2015, barrel: "Carvalho Francês 100% Novo", soil: "Argilo-calcário", apogee: "2025-2045", health: 100 },
  { code: "LOTE-IT-BRUNELLO-02", winery: "Biondi-Santi", wine: "Brunello di Montalcino Riserva", style: "tinto", country: "Itália", vintage: 2016, barrel: "Botti de Carvalho da Eslavônia", soil: "Galestro e Alberese", apogee: "2026-2050", health: 100 },
  { code: "LOTE-BR-MIOLO43-05", winery: "Vinícola Miolo", wine: "Lote 43 Merlot / Cabernet", style: "tinto", country: "Brasil", vintage: 2020, barrel: "Carvalho Francês 12 meses", soil: "Argiloso basáltico", apogee: "2024-2032", health: 98 },
  { code: "LOTE-FR-CHABLIS-07", winery: "Domaine Laroche", wine: "Chablis Grand Cru Les Blanchots", style: "branco", country: "França", vintage: 2021, barrel: "Inox & Foudres Neutros", soil: "Kimmeridgiano Calcário", apogee: "2024-2034", health: 96 },
  { code: "LOTE-BR-VALDUGA130-08", winery: "Casa Valduga", wine: "Espumante 130 Brut Tradicional", style: "espumante", country: "Brasil", vintage: 2021, barrel: "Afinamento Autólise 36 meses", soil: "Basalto Vulcânico", apogee: "2023-2027", health: 100 }
];

let activeFilter = "all";

function initTheme() {
  const saved = localStorage.getItem("portal_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("portal_theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) btn.textContent = theme === "dark" ? "☀️ Tema Claro" : "🌙 Tema Escuro";
}

function renderLots(lots) {
  const container = document.getElementById("lots-container");
  if (!container) return;
  const filtered = activeFilter === "all" ? lots : lots.filter(l => (l.style || l.wine_style) === activeFilter);
  container.innerHTML = filtered.map(l => `
    <article class="portal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span class="sommelier-tag">${l.country || "Mundial"} · Safra ${l.vintage}</span>
        <span style="font-size:0.75rem;font-weight:700;color:#16a34a;">Apogeu: ${l.health || l.health_score || 100}%</span>
      </div>
      <h3 style="font-family:'Cinzel',serif;font-size:0.95rem;color:var(--portal-wine);margin-bottom:4px;">${l.winery || l.winery_name}</h3>
      <p style="font-weight:600;font-size:0.8rem;margin-bottom:8px;">${l.wine || l.wine_name}</p>
      <div style="font-size:0.72rem;color:var(--portal-muted);margin-bottom:8px;">
        <div>Terroir: ${l.soil || l.soil_type || "Argilo-calcário"}</div>
        <div>Afinamento: ${l.barrel || l.barrel_type || "Barrica Francesa"}</div>
        <div>Guarda: ${l.apogee || l.expiration_date || "2030"}</div>
      </div>
      <div style="background:var(--portal-border);height:5px;border-radius:3px;overflow:hidden;">
        <div style="background:var(--portal-wine);width:${l.health || l.health_score || 100}%;height:100%;"></div>
      </div>
    </article>
  `).join("");
}

async function fetchLiveStatus() {
  try {
    const res = await fetch("/api/v1/status");
    if (!res.ok) throw new Error("Offline");
    const data = await res.json();
    const tel = data.telemetry || {};
    document.getElementById("kpi-temp-val").textContent = `${tel.temperature_c?.toFixed(1) || "15.5"}°C`;
    document.getElementById("kpi-hum-val").textContent = `${tel.humidity_pct?.toFixed(0) || "68"}%`;
    document.getElementById("kpi-lum-val").textContent = `${tel.luminosity_pct?.toFixed(0) || "12"}%`;
    document.getElementById("cellar-score-val").textContent = `${data.health_score || 100}%`;
    document.getElementById("lcd-line-0").textContent = `T:${tel.temperature_c?.toFixed(1) || "15.5"}C  U:${tel.humidity_pct?.toFixed(0) || "68"}% *`;
    document.getElementById("lcd-line-1").textContent = `L:${tel.luminosity_pct?.toFixed(0) || "12"}%  APOGEU:${data.health_score || 100}%`;
  } catch (e) {
    document.getElementById("kpi-temp-val").textContent = "15.5°C";
    document.getElementById("kpi-hum-val").textContent = "68%";
    document.getElementById("kpi-lum-val").textContent = "12%";
    document.getElementById("cellar-score-val").textContent = "100%";
    document.getElementById("lcd-line-0").textContent = "VINHERIA AGNELLO · CAVA";
    document.getElementById("lcd-line-1").textContent = "APOGEU ENOLÓGICO: 100%";
  }
}

async function fetchLots() {
  try {
    const res = await fetch("/api/v1/lots");
    if (!res.ok) throw new Error("Offline");
    const data = await res.json();
    renderLots(data.lots && data.lots.length ? data.lots : FALLBACK_LOTS);
  } catch (e) {
    renderLots(FALLBACK_LOTS);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      activeFilter = e.target.getAttribute("data-filter") || "all";
      fetchLots();
    });
  });
  fetchLiveStatus();
  fetchLots();
  setInterval(fetchLiveStatus, 2000);
});
