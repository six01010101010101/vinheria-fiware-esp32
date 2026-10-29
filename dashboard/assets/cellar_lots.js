/**
 * Módulo de Cavas de Guarda & Lotes Catalogados (12 Lotes) — Vinheria Agnello
 * 3 Estados Enológicos: 🟢 IDEAL (95–100%) | 🔵 PADRÃO (75–94%) | 🔴 CRÍTICO (<75% · Apito).
 */
(function () {
  window.curLotCode = window.curLotCode || "LOTE-FR-MARGAUX-01";
  let lastClickedLotCode = null;

  function evaluateLotPreservation(lot, t, h, l, customTriggers, modeOverride) {
    const tMin = customTriggers?.tMin ?? lot.temp[0];
    const tMax = customTriggers?.tMax ?? lot.temp[1];
    const hMin = customTriggers?.hMin ?? lot.hum[0];
    const hMax = customTriggers?.hMax ?? lot.hum[1];
    const lMax = customTriggers?.lMax ?? lot.lum;

    let penalty = 0;
    if (t < tMin) penalty += (tMin - t) * 7.5;
    else if (t > tMax) penalty += (t - tMax) * 7.5;
    if (h < hMin) penalty += (hMin - h) * 1.6;
    else if (h > hMax) penalty += (h - hMax) * 1.6;
    if (l > lMax) penalty += (l - lMax) * 1.3;

    const score = Math.max(15, Math.min(94, Math.round(100 - penalty)));
    const tMid = (tMin + tMax) / 2, hMid = (hMin + hMax) / 2;
    const edgeDist = (Math.abs(t - tMid) / Math.max(1, (tMax - tMin) / 2)) * 2.5 +
                     (Math.abs(h - hMid) / Math.max(1, (hMax - hMin) / 2)) * 1.8;
    let adjScore = penalty === 0 ? Math.max(95, Math.min(100, Math.round(100 - edgeDist))) : score;

    if (modeOverride === "multi" || modeOverride === "critico") {
      adjScore = Math.min(adjScore, 62);
    } else if (modeOverride === "padrao" && (adjScore >= 95 || adjScore < 75)) {
      adjScore = 78;
    }

    let verdict = "IDEAL (95–100%)", stateKey = "ideal", barColor = "bg-success", textClass = "text-success", dot = "🟢";
    if (adjScore < 75) {
      verdict = "CRÍTICO (Apito)"; stateKey = "critico"; barColor = "bg-danger"; textClass = "text-danger"; dot = "🔴";
    } else if (adjScore < 95) {
      verdict = "PADRÃO (75–94%)"; stateKey = "padrao"; barColor = "bg-warning"; textClass = "text-warning"; dot = "🟡";
    }
    return { score: adjScore, verdict, stateKey, barColor, textClass, dot };
  }

  function renderCellarLots(activeStyle, currentTemp, currentHum, currentLum, onSelectCallback, activeLotOverride) {
    const c = document.getElementById("cellar-lots-grid");
    if (!c || !window.CANONICAL_LOTS) return;
    if (activeLotOverride) window.curLotCode = activeLotOverride;
    const selCode = window.curLotCode || "LOTE-FR-MARGAUX-01";
    const tAct = typeof currentTemp === "number" ? currentTemp : 15.8;
    const hAct = typeof currentHum === "number" ? currentHum : 68;
    const lAct = typeof currentLum === "number" ? currentLum : 9;
    const activePreset = (window.PRESETS && window.PRESETS[activeStyle]) || null;
    const curMode = window.curScadaMode || "normal";

    const list = window.CANONICAL_LOTS;
    let idealCount = 0, padraoCount = 0, critCount = 0;

    c.innerHTML = list.map((lot, idx) => {
      const isSelected = lot.code === selCode;
      const isSameStyle = lot.style === activeStyle;
      const tr = (window.TERROIRS && lot.terroirId) ? window.TERROIRS[lot.terroirId] : null;

      // Telemetria climática real ancorada no Terroir/Satélite Open-Meteo
      const phase = (Date.now() / 2200) + idx * 0.9;
      const baseT = (tr && tr.satT !== undefined) ? tr.satT : (tr && tr.t !== undefined ? tr.t : lot.baseT);
      const baseH = (tr && tr.satH !== undefined) ? tr.satH : (tr && tr.h !== undefined ? tr.h : lot.baseH);
      const baseL = (tr && tr.satL !== undefined) ? tr.satL : (tr && tr.l !== undefined ? tr.l : lot.baseL);

      lot.liveT = +(baseT + Math.sin(phase) * 0.1).toFixed(1);
      lot.liveH = Math.max(10, Math.min(99, Math.round(baseH + Math.cos(phase * 0.8) * 0.3)));
      lot.liveL = Math.max(0, Math.min(100, Math.round(baseL)));

      const t = isSelected ? tAct : lot.liveT;
      const h = isSelected ? hAct : lot.liveH;
      const l = isSelected ? lAct : lot.liveL;
      const ev = evaluateLotPreservation(
        lot,
        t,
        h,
        l,
        isSelected && activePreset ? activePreset : null,
        isSelected ? curMode : null
      );

      if (ev.stateKey === "ideal") idealCount++;
      else if (ev.stateKey === "padrao") padraoCount++;
      else critCount++;

      const justClicked = lastClickedLotCode === lot.code;
      const cardClasses = [
        "vineyard-card h-100",
        isSelected ? "active-vineyard border-gold" : (isSameStyle ? "lot-style-match" : "lot-dimmed"),
        justClicked ? "lot-click-pop" : ""
      ].filter(Boolean).join(" ");

      const topTag = isSelected ? "● SELECIONADO" : (isSameStyle ? `★ ${lot.code}` : lot.code);

      return `
      <div class="col-lg-4 col-xl-3 col-md-6 col-12">
        <div class="${cardClasses}" data-lcode="${lot.code}" data-lstyle="${lot.style}" data-terroir="${lot.terroirId || ""}" style="cursor:pointer;" title="Clique para selecionar ${lot.winery} (${lot.wine})">
          <div class="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom border-secondary border-opacity-25">
            <span class="sommelier-tag ${isSelected ? "sommelier-tag-active" : ""}">${topTag}</span>
            <span class="badge ${isSelected || isSameStyle ? "bg-wine-pill" : "bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-25"}" style="font-size:0.62rem;">${lot.styleLabel || lot.style.toUpperCase()} · ${lot.flag} ${lot.vintage}</span>
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
      const selLot = list.find(x => x.code === selCode) || list[0];
      const badgeCls = critCount > 0 ? "border-danger text-danger bg-danger" : (padraoCount > 0 ? "border-warning text-warning bg-warning" : "border-success text-success bg-success");
      badge.className = `badge font-monospace ${badgeCls} bg-opacity-25 border border-opacity-50`;
      badge.innerHTML = `<span class="status-dot"></span>ATIVO: ${selLot.winery.toUpperCase()} · 🟢 ${idealCount} IDEAL · 🟡 ${padraoCount} PADRÃO · 🔴 ${critCount} CRÍTICO`;
    }

    const handler = onSelectCallback || window.onLotSelect;
    c.querySelectorAll(".vineyard-card").forEach(card => {
      card.addEventListener("click", () => {
        const code = card.dataset.lcode, st = card.dataset.lstyle, tr = card.dataset.terroir;
        window.curLotCode = code;
        lastClickedLotCode = code;
        if (typeof handler === "function") handler(st, tr, code);
      });
    });
  }

  window.renderCellarLots = renderCellarLots;
  window.evaluateLotPreservation = evaluateLotPreservation;
})();
