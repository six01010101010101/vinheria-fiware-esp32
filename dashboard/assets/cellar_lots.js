/**
 * Módulo de Cavas de Guarda & Lotes Catalogados por Estilo e Área — Vinheria Agnello
 * Exibe dinamicamente os lotes autênticos com calibração proporcional de preservação (9% a 100%).
 */
(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  root.curLotCode = root.curLotCode || "LOTE-FR-MARGAUX-01";
  let lastClickedLotCode = null;

  function evaluateLotPreservation(lot, t, h, l, customTriggers) {
    const tMin = customTriggers?.tMin ?? (lot ? lot.temp[0] : 14.0);
    const tMax = customTriggers?.tMax ?? (lot ? lot.temp[1] : 18.0);
    const hMin = customTriggers?.hMin ?? (lot ? lot.hum[0] : 60.0);
    const hMax = customTriggers?.hMax ?? (lot ? lot.hum[1] : 75.0);
    const lMax = customTriggers?.lMax ?? (lot ? lot.lum : 25.0);

    const tMid = (tMin + tMax) / 2, tHalf = Math.max(1, (tMax - tMin) / 2);
    const hMid = (hMin + hMax) / 2, hHalf = Math.max(1, (hMax - hMin) / 2);

    let penalty = 0;
    if (t < tMin) penalty += (tMin - t) * 8.5;
    else if (t > tMax) penalty += (t - tMax) * 8.5;
    if (h < hMin) penalty += (hMin - h) * 1.5;
    else if (h > hMax) penalty += (h - hMax) * 1.5;
    if (l > lMax) penalty += (l - lMax) * 1.0;

    const tEdge = Math.abs(t - tMid) / tHalf;
    const hEdge = Math.abs(h - hMid) / hHalf;
    const edgePen = Math.max(0, (tEdge - 0.5) * 10.0) + Math.max(0, (hEdge - 0.6) * 5.0);

    let score = Math.max(9, Math.min(100, Math.round(100 - penalty - edgePen)));

    let verdict = "IDEAL (95–100%)", stateKey = "ideal", barColor = "bg-success", textClass = "text-success", dot = "🟢";
    if (score < 75) {
      verdict = "CRÍTICO (Apito)"; stateKey = "critico"; barColor = "bg-danger"; textClass = "text-danger"; dot = "🔴";
    } else if (score < 95) {
      verdict = "PADRÃO (75–94%)"; stateKey = "padrao"; barColor = "bg-warning"; textClass = "text-warning"; dot = "🟡";
    }
    return { score, verdict, stateKey, barColor, textClass, dot };
  }

  function renderCellarLots(activeStyle, currentTemp, currentHum, currentLum, onSelectCallback, activeLotOverride) {
    const c = document.getElementById("cellar-lots-grid");
    if (!c) return;
    const curStyle = activeStyle || window.curPr || "tinto";
    const list = window.getLotsForStyle ? window.getLotsForStyle(curStyle) : (window.CANONICAL_LOTS || []);
    if (activeLotOverride) window.curLotCode = activeLotOverride;
    else if (!window.curLotCode || !list.some(x => x.code === window.curLotCode)) {
      window.curLotCode = list[0]?.code || "LOTE-FR-MARGAUX-01";
    }
    const selCode = window.curLotCode;
    const activePreset = (window.PRESETS && window.PRESETS[curStyle]) || null;

    let idealCount = 0, padraoCount = 0, critCount = 0;
    const isSameList = c.children && c.children.length === list.length && c.children[0]?.firstElementChild?.dataset?.lcode === list[0]?.code;

    if (isSameList && !lastClickedLotCode) {
      list.forEach((lot, idx) => {
        const col = c.children[idx], card = col ? col.firstElementChild : null;
        if (!card) return;
        const isSelected = lot.code === selCode;
        const phase = (Date.now() / 2400) + idx * 0.85;
        lot.liveT = +(lot.baseT + Math.sin(phase) * 0.12).toFixed(1);
        lot.liveH = Math.max(10, Math.min(99, Math.round(lot.baseH + Math.cos(phase * 0.75) * 0.4)));
        lot.liveL = Math.max(0, Math.min(100, Math.round(lot.baseL)));

        const ev = evaluateLotPreservation(lot, lot.liveT, lot.liveH, lot.liveL, activePreset);
        if (ev.stateKey === "ideal") idealCount++; else if (ev.stateKey === "padrao") padraoCount++; else critCount++;

        card.className = ["vineyard-card h-100", isSelected ? "active-vineyard border-gold" : "lot-style-match"].join(" ");
        const tagEl = card.querySelector(".sommelier-tag");
        if (tagEl) {
          tagEl.className = `sommelier-tag ${isSelected ? "sommelier-tag-active" : ""}`;
          tagEl.textContent = isSelected ? "● SELECIONADO" : lot.code;
        }
        const tEl = card.querySelector(".text-temp"), hEl = card.querySelector(".text-hum"), lEl = card.querySelector(".text-lum");
        if (tEl) tEl.textContent = `🌡️ ${lot.liveT.toFixed(1)}°C`;
        if (hEl) hEl.textContent = `💧 ${lot.liveH.toFixed(0)}%`;
        if (lEl) lEl.textContent = `☀️ ${lot.liveL.toFixed(0)}%`;
        const vEl = card.querySelector(".lot-status-txt"), scEl = card.querySelector(".lot-score-val"), pb = card.querySelector(".progress-bar");
        if (vEl) { vEl.textContent = `${ev.dot} ${ev.verdict}`; vEl.className = `lot-status-txt fw-bold ${ev.textClass}`; }
        if (scEl) { scEl.textContent = `${ev.score}%`; scEl.className = `lot-score-val font-monospace fw-bold ${ev.textClass}`; }
        if (pb) { pb.style.width = `${ev.score}%`; pb.className = `progress-bar ${ev.barColor} ${isSelected ? "progress-bar-striped progress-bar-animated" : ""}`; }
      });
      updateBadge(list, selCode, idealCount, padraoCount, critCount, curStyle);
      return;
    }

    c.innerHTML = list.map((lot, idx) => {
      const isSelected = lot.code === selCode;
      const phase = (Date.now() / 2400) + idx * 0.85;
      lot.liveT = +(lot.baseT + Math.sin(phase) * 0.12).toFixed(1);
      lot.liveH = Math.max(10, Math.min(99, Math.round(lot.baseH + Math.cos(phase * 0.75) * 0.4)));
      lot.liveL = Math.max(0, Math.min(100, Math.round(lot.baseL)));

      const ev = evaluateLotPreservation(lot, lot.liveT, lot.liveH, lot.liveL, activePreset);
      if (ev.stateKey === "ideal") idealCount++; else if (ev.stateKey === "padrao") padraoCount++; else critCount++;

      const justClicked = lastClickedLotCode === lot.code;
      const cardClasses = ["vineyard-card h-100", isSelected ? "active-vineyard border-gold" : "lot-style-match", justClicked ? "lot-click-pop" : ""].filter(Boolean).join(" ");
      const topTag = isSelected ? "● SELECIONADO" : lot.code;

      return `
      <div class="col-lg-4 col-xl-3 col-md-6 col-12">
        <div class="${cardClasses}" data-lcode="${lot.code}" data-lstyle="${lot.style}" data-terroir="${lot.terroirId || ""}" style="cursor:pointer;" title="Clique para selecionar ${lot.winery} (${lot.wine})">
          <div class="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom border-secondary border-opacity-25">
            <span class="sommelier-tag ${isSelected ? "sommelier-tag-active" : ""}">${topTag}</span>
            <span class="badge bg-wine-pill" style="font-size:0.62rem;">${lot.styleLabel} · ${lot.flag} ${lot.vintage}</span>
          </div>
          <div class="lot-wine-title text-truncate" style="font-size:0.84rem;font-weight:700;">${lot.winery} — ${lot.wine}</div>
          <div class="small text-wine text-truncate mb-2" style="font-size:0.69rem;">🍇 ${lot.casta || lot.styleLabel}</div>
          <div class="d-flex justify-content-between align-items-center px-2 py-1 mb-2 rounded bg-black bg-opacity-25 border border-secondary border-opacity-25 font-monospace" style="font-size:0.68rem;">
            <span class="text-temp">🌡️ ${lot.liveT.toFixed(1)}°C</span>
            <span class="text-hum">💧 ${lot.liveH.toFixed(0)}%</span>
            <span class="text-lum">☀️ ${lot.liveL.toFixed(0)}%</span>
          </div>
          <div class="d-flex justify-content-between align-items-center small mb-1" style="font-size:0.71rem;">
            <span class="lot-status-txt fw-bold ${ev.textClass}">${ev.dot} ${ev.verdict}</span>
            <span class="lot-score-val font-monospace fw-bold ${ev.textClass}">${ev.score}%</span>
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

    updateBadge(list, selCode, idealCount, padraoCount, critCount, curStyle);
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

  function updateBadge(list, selCode, idealCount, padraoCount, critCount, curStyle) {
    const badge = document.getElementById("cellar-lots-live-badge");
    if (!badge) return;
    const pr = (window.PRESETS && window.PRESETS[curStyle]) || {};
    const badgeCls = critCount > 0 ? "border-danger text-danger bg-danger" : (padraoCount > 0 ? "border-warning text-warning bg-warning" : "border-success text-success bg-success");
    badge.className = `badge font-monospace ${badgeCls} bg-opacity-25 border border-opacity-50`;
    badge.innerHTML = `<span class="status-dot"></span>${list.length} LOTES · ${pr.badge || "🍷 CAVA"} (🟢 ${idealCount} · 🟡 ${padraoCount} · 🔴 ${critCount})`;
  }

  root.evaluateLotPreservation = evaluateLotPreservation;
  root.renderCellarLots = renderCellarLots;
})();
