/**
 * Módulo de Cavas de Guarda & Lotes Catalogados — Vinheria Agnello
 * Seleção Individual SaaS com Animação, Telemetria Individual por Cava e Diagnóstico LED.
 */
(function () {
  window.curLotCode = window.curLotCode || "LOTE-FR-MARGAUX-01";
  let lastClickedLotCode = null;

  function evaluateLotPreservation(lot, t, h, l) {
    const [tMin, tMax] = lot.temp, [hMin, hMax] = lot.hum, lMax = lot.lum;
    let penalty = 0;
    if (t < tMin) penalty += (tMin - t) * 8.5;
    else if (t > tMax) penalty += (t - tMax) * 8.5;
    if (h < hMin) penalty += (hMin - h) * 1.8;
    else if (h > hMax) penalty += (h - hMax) * 1.8;
    if (l > lMax) penalty += (l - lMax) * 1.4;
    const score = Math.max(15, Math.min(100, Math.round(100 - penalty)));
    const tMid = (tMin + tMax) / 2, hMid = (hMin + hMax) / 2;
    const edgeDist = (Math.abs(t - tMid) / Math.max(1, (tMax - tMin) / 2)) * 4 + (Math.abs(h - hMid) / Math.max(1, (hMax - hMin) / 2)) * 3;
    const adjScore = penalty === 0 ? Math.max(91, Math.round(100 - edgeDist)) : score;

    let verdict = "Equilíbrio Ideal", stateKey = "ideal", barColor = "bg-success", textClass = "text-success", dot = "🟢";
    if (adjScore < 75 || penalty >= 25) {
      verdict = "Estado Crítico"; stateKey = "critico"; barColor = "bg-danger"; textClass = "text-danger"; dot = "🔴";
    } else if (adjScore < 90 || penalty > 0) {
      verdict = "Atenção Setorial"; stateKey = "padrao"; barColor = "bg-warning"; textClass = "text-warning"; dot = "🟡";
    } else if (adjScore < 96) {
      verdict = "Estado Padrão"; stateKey = "padrao"; barColor = "bg-info"; textClass = "text-info"; dot = "🔵";
    }
    return { score: adjScore, verdict, stateKey, barColor, textClass, dot };
  }

  function renderCellarLots(activeStyle, currentTemp, currentHum, currentLum, onSelectCallback, activeLotOverride) {
    const c = document.getElementById("cellar-lots-grid");
    if (!c || !window.CANONICAL_LOTS) return;
    if (activeLotOverride) window.curLotCode = activeLotOverride;
    const selCode = window.curLotCode || "LOTE-FR-MARGAUX-01";
    const tAct = typeof currentTemp === "number" ? currentTemp : 15.2;
    const hAct = typeof currentHum === "number" ? currentHum : 71;
    const lAct = typeof currentLum === "number" ? currentLum : 9;

    let okCount = 0;
    c.innerHTML = window.CANONICAL_LOTS.slice(0, 8).map(lot => {
      const isSelected = lot.code === selCode;
      const isSameStyle = lot.style === activeStyle;
      const t = isSelected ? tAct : (lot.liveT ?? 15.2);
      const h = isSelected ? hAct : (lot.liveH ?? 70.0);
      const l = isSelected ? lAct : (lot.liveL ?? 10.0);
      const ev = evaluateLotPreservation(lot, t, h, l);
      if (ev.score >= 88) okCount++;
      const justClicked = lastClickedLotCode === lot.code;
      const cardClasses = [
        "vineyard-card h-100",
        isSelected ? "active-vineyard border-gold" : (isSameStyle ? "lot-style-match" : "lot-dimmed"),
        justClicked ? "lot-click-pop" : ""
      ].filter(Boolean).join(" ");

      const topTag = isSelected ? "● SELECIONADO" : (isSameStyle ? `★ ${lot.code}` : lot.code);

      return `
      <div class="col-lg-6 col-xl-3 col-md-6 col-12">
        <div class="${cardClasses}" data-lcode="${lot.code}" data-lstyle="${lot.style}" data-terroir="${lot.terroirId || ""}" style="cursor:pointer;" title="Clique para selecionar ${lot.winery} (${lot.wine})">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="sommelier-tag ${isSelected ? "sommelier-tag-active" : ""}">${topTag}</span>
            <span class="badge ${isSelected ? "bg-warning text-dark fw-bold" : (isSameStyle ? "bg-wine-pill" : "bg-secondary bg-opacity-50")}" style="font-size:0.62rem;">${lot.styleLabel || lot.style.toUpperCase()} · ${lot.flag} ${lot.vintage}</span>
          </div>
          <div class="lot-wine-title text-truncate mb-1" style="font-size:0.84rem;font-weight:700;">${lot.winery} — ${lot.wine}</div>
          <div class="d-flex justify-content-between align-items-center px-2 py-1 mb-2 rounded bg-black bg-opacity-25 border border-secondary border-opacity-25 font-monospace" style="font-size:0.68rem;">
            <span class="text-temp">🌡️ ${t.toFixed(1)}°C</span>
            <span class="text-hum">💧 ${h.toFixed(0)}%</span>
            <span class="text-lum">☀️ ${l.toFixed(0)}%</span>
          </div>
          <div class="d-flex justify-content-between align-items-center small mb-1" style="font-size:0.71rem;">
            <span class="fw-bold ${ev.textClass}">${ev.dot} ${ev.verdict}</span>
            <span class="font-monospace fw-bold ${ev.textClass}">${ev.score}%</span>
          </div>
          <div class="progress mb-2 rounded-pill" style="height:5px;">
            <div class="progress-bar ${ev.barColor} ${isSelected ? "progress-bar-striped progress-bar-animated" : ""}" style="width:${ev.score}%;"></div>
          </div>
          <div class="d-flex justify-content-between small text-muted border-top border-secondary border-opacity-25 pt-1 mt-1" style="font-size:0.69rem;">
            <span class="text-truncate" style="max-width:56%;">${lot.country} · ${lot.region}</span>
            <span class="text-wine fw-bold">Guarda: ${lot.apogee}</span>
          </div>
        </div>
      </div>`;
    }).join("");
    lastClickedLotCode = null;

    const badge = document.getElementById("cellar-lots-live-badge");
    if (badge) {
      const selLot = window.CANONICAL_LOTS.find(x => x.code === selCode) || window.CANONICAL_LOTS[0];
      badge.className = "badge font-monospace bg-success bg-opacity-25 text-success border border-success border-opacity-50";
      badge.innerHTML = `<span class="status-dot"></span>ATIVO: ${selLot.winery.toUpperCase()} (${okCount}/8 PRESERVADOS)`;
    }

    const handler = onSelectCallback || window.onLotSelect;
    c.querySelectorAll(".vineyard-card").forEach(card => {
      card.addEventListener("click", () => {
        const code = card.dataset.lcode, st = card.dataset.lstyle, tr = card.dataset.terroir;
        window.curLotCode = code;
        lastClickedLotCode = code;
        window.arcadeAudio?.ensureContext?.();
        window.arcadeAudio?.playWarp?.();
        if (typeof handler === "function") handler(st, tr, code);
      });
    });
  }

  window.renderCellarLots = renderCellarLots;
  window.evaluateLotPreservation = evaluateLotPreservation;
})();
