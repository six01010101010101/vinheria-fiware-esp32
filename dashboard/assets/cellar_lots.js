/**
 * Módulo de Cavas de Guarda & Lotes Catalogados — Vinheria Agnello
 * Avaliação em Tempo Real do Apogeu, Integridade de Cortiça e Envelhecimento Nobre.
 */

function evaluateLotPreservation(lot, t, h, l) {
  const [tMin, tMax] = lot.temp, [hMin, hMax] = lot.hum, lMax = lot.lum;
  let penalty = 0;
  if (t < tMin) penalty += (tMin - t) * 8.5;
  else if (t > tMax) penalty += (t - tMax) * 8.5;
  if (h < hMin) penalty += (hMin - h) * 1.6;
  else if (h > hMax) penalty += (h - hMax) * 1.6;
  if (l > lMax) penalty += (l - lMax) * 1.2;
  const score = Math.max(15, Math.min(100, Math.round(100 - penalty)));
  let verdict = "Equilíbrio Ideal", barColor = "bg-success", textClass = "text-success";
  if (score < 70) { verdict = "Alerta Enológico"; barColor = "bg-danger"; textClass = "text-danger"; }
  else if (score < 88) { verdict = "Atenção Térmica"; barColor = "bg-warning"; textClass = "text-warning"; }
  else if (score < 97) { verdict = "Afinamento Nobre"; barColor = "bg-info"; textClass = "text-info"; }
  return { score, verdict, barColor, textClass };
}

function renderCellarLots(activeStyle, currentTemp, currentHum, currentLum, onSelectCallback) {
  const c = document.getElementById("cellar-lots-grid");
  if (!c || !window.CANONICAL_LOTS) return;
  const t = typeof currentTemp === "number" ? currentTemp : 15.6;
  const h = typeof currentHum === "number" ? currentHum : 68;
  const l = typeof currentLum === "number" ? currentLum : 12;

  const lotsWithEval = window.CANONICAL_LOTS.map(lot => {
    const ev = evaluateLotPreservation(lot, t, h, l);
    return { ...lot, dynamicScore: ev.score, verdict: ev.verdict, barColor: ev.barColor, textClass: ev.textClass };
  });

  const sorted = lotsWithEval.sort((a, b) => (a.style === activeStyle ? -1 : (b.style === activeStyle ? 1 : 0)));
  let okCount = 0;

  c.innerHTML = sorted.slice(0, 8).map(lot => {
    const isAct = lot.style === activeStyle;
    if (lot.dynamicScore >= 88) okCount++;
    return `
    <div class="col-lg-6 col-xl-3 col-md-6 col-12">
      <div class="vineyard-card h-100 ${isAct ? "border-gold active-vineyard" : ""}" data-lstyle="${lot.style}" data-terroir="${lot.terroirId || ""}" style="cursor:pointer;" title="Clique para ativar este lote (${lot.country} · ${lot.style})">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="sommelier-tag">${lot.code}</span>
          <span class="badge bg-secondary" style="font-size:0.62rem;">${lot.flag || "🍷"} ${lot.country} · ${lot.vintage}</span>
        </div>
        <div class="lot-wine-title text-truncate mb-1" style="font-size:0.86rem;font-weight:700;">${lot.winery} — ${lot.wine}</div>
        <div class="d-flex justify-content-between align-items-center small mb-1" style="font-size:0.70rem;">
          <span class="fw-semibold ${lot.textClass}">● ${lot.verdict}</span>
          <span class="font-monospace fw-bold">${lot.dynamicScore}%</span>
        </div>
        <div class="progress mb-2 rounded-pill" style="height:5px;">
          <div class="progress-bar ${lot.barColor} progress-bar-striped progress-bar-animated" style="width:${lot.dynamicScore}%;"></div>
        </div>
        <div class="text-muted text-truncate mb-1" style="font-size:0.70rem;">Terroir: ${lot.soil}</div>
        <div class="d-flex justify-content-between small text-muted border-top border-secondary border-opacity-25 pt-1 mt-1" style="font-size:0.71rem;">
          <span class="text-truncate" style="max-width:55%;">Barrica: ${lot.barrel}</span>
          <span class="text-wine fw-bold">Guarda: ${lot.apogee}</span>
        </div>
      </div>
    </div>`;
  }).join("");

  const badge = document.getElementById("cellar-lots-live-badge");
  if (badge) {
    const isHealthy = okCount >= 6;
    badge.className = `badge font-monospace ${isHealthy ? "bg-success bg-opacity-25 text-success border border-success border-opacity-50" : "bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50"}`;
    badge.innerHTML = `<span class="status-dot"></span>CAVA DIGITALIZADA (${okCount}/8 PRESERVADOS)`;
  }

  const handler = onSelectCallback || window.onLotSelect || window.onWinePresetChange;
  if (handler) {
    c.querySelectorAll(".vineyard-card").forEach(card => {
      card.addEventListener("click", () => {
        window.arcadeAudio?.ensureContext?.();
        window.arcadeAudio?.playWarp?.();
        if (typeof window.onLotSelect === "function") {
          window.onLotSelect(card.dataset.lstyle, card.dataset.terroir);
        } else if (typeof handler === "function") {
          handler(card.dataset.lstyle, card.dataset.terroir);
        }
      });
    });
  }
}

function autoBootCellarLots() {
  if (typeof renderCellarLots === "function") {
    renderCellarLots(window.curPr || "tinto", 15.6, 68, 12, window.onLotSelect || window.onWinePresetChange);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoBootCellarLots);
} else {
  autoBootCellarLots();
}

window.renderCellarLots = renderCellarLots;
window.evaluateLotPreservation = evaluateLotPreservation;