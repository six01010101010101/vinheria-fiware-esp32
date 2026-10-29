/**
 * Módulo de Telemetria por Satélite & Estações Meteorológicas Globais — Vinheria Agnello
 * Avalia o microclima WMO de cada terroir com diferenciação climática proporcional (9% a 100%).
 */
(function () {
  let lastClickedTerroir = null;

  function calcDewPoint(t, h) {
    const rh = Math.max(1, Math.min(100, h));
    const a = ((17.27 * t) / (237.7 + t)) + Math.log(rh / 100);
    return +((237.7 * a) / (17.27 - a)).toFixed(1);
  }

  function getViticultureLimits(styleKey) {
    const k = (styleKey || "").toLowerCase();
    if (k.includes("branco") || k.includes("espumante") || k.includes("sobremesa")) return { tMin: 8, tMax: 23, tOptMin: 11, tOptMax: 20 };
    if (k.includes("rose") || k.includes("pinot") || k.includes("laranja")) return { tMin: 10, tMax: 25, tOptMin: 13, tOptMax: 22 };
    return { tMin: 12, tMax: 27, tOptMin: 15, tOptMax: 24 };
  }

  function evalTerroirForWine(t, h, l, pr) {
    const styleKey = pr?.key || pr?.style || (typeof pr === "string" ? pr : "tinto");
    const lim = getViticultureLimits(styleKey);
    let pen = 0;
    if (t < lim.tOptMin) {
      if (t >= lim.tMin) pen += (lim.tOptMin - t) * 3.5;
      else pen += (lim.tOptMin - lim.tMin) * 3.5 + (lim.tMin - t) * 10.0;
    } else if (t > lim.tOptMax) {
      if (t <= lim.tMax) pen += (t - lim.tOptMax) * 3.5;
      else pen += (lim.tMax - lim.tOptMax) * 3.5 + (t - lim.tMax) * 10.0;
    }
    if (h < 40) pen += (40 - h) * 1.5; else if (h > 80) pen += (h - 80) * 1.5;
    if (t > 28 && l > 70) pen += (t - 28) * 4.0 + (l - 70) * 0.8;
    const score = Math.max(9, Math.min(100, Math.round(100 - pen)));

    const wShort = (pr?.name || "Tinto").replace("Espumante ", "");
    if (score >= 95) return { score, stateKey: "ideal", txt: `🟢 IDEAL (${wShort})`, cls: "text-success", bar: "bg-success" };
    if (score >= 75) return { score, stateKey: "padrao", txt: `🟡 PADRÃO (${wShort})`, cls: "text-warning", bar: "bg-warning" };
    return { score, stateKey: "critico", txt: `🔴 CRÍTICO p/ ${wShort}`, cls: "text-danger", bar: "bg-danger" };
  }

  async function fetchSatelliteData() {
    const list = Object.values(window.TERROIRS || {}).filter(x => x.id !== "wokwi_esp32");
    const lats = list.map(x => x.lat).join(","), lons = list.map(x => x.lon).join(",");
    let updated = false;
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,shortwave_radiation,is_day&timezone=auto`);
      if (res.ok) {
        const payload = await res.json();
        const items = Array.isArray(payload) ? payload : [payload];
        list.forEach((tItem, idx) => {
          const c = items[idx]?.current || {};
          if (c.temperature_2m !== undefined) {
            tItem.satT = +Number(c.temperature_2m).toFixed(1);
            tItem.satH = c.relative_humidity_2m !== undefined ? Math.round(Number(c.relative_humidity_2m)) : tItem.h;
            tItem.satL = c.shortwave_radiation !== undefined ? Math.min(100, Math.max(0, Math.round(c.shortwave_radiation / 10))) : (c.is_day ? 25 : 0);
            tItem.t = tItem.satT; tItem.h = tItem.satH; tItem.l = tItem.satL;
            tItem.local_time = (c.time || "").split("T")[1] || new Date().toLocaleTimeString().slice(0, 5);
            tItem.source = "Open-Meteo Satélite WMO";
            updated = true;
          }
        });
      }
    } catch (_) {}
    window.SupabaseCloud?.syncLotsAndAreas?.(window.curPr || "tinto", true);
    window.renderCellarLots?.();
    return updated;
  }

  function renderRealVineyards(activeId, onSelectCallback) {
    const c = document.getElementById("real-vineyards-grid");
    if (!c) return;
    const act = activeId || window.curArea || "fr_margaux";
    const curStyle = window.curPr || "tinto";
    const activePr = (window.PRESETS && window.PRESETS[curStyle]) || { name: "Vinho Tinto", badge: "🍷 TINTO", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMax: 25 };
    const handler = onSelectCallback || window.onAreaTerroirChange;
    const list = Object.values(window.TERROIRS || {}).filter(x => x.id !== "wokwi_esp32");

    let idealCount = 0, padraoCount = 0, critCount = 0;

    if (c.children && c.children.length === list.length && !lastClickedTerroir) {
      list.forEach((v, idx) => {
        const col = c.children[idx], card = col ? col.firstElementChild : null;
        if (!card) return;
        const isAct = v.id === act;
        const producesStyle = (window.CANONICAL_LOTS || []).some(l => l.terroirId === v.id && l.style === curStyle);
        const t = v.satT !== undefined ? v.satT : v.t;
        const h = v.satH !== undefined ? v.satH : v.h;
        const l = v.satL !== undefined ? v.satL : v.l;
        const dew = calcDewPoint(t, h);
        const ev = evalTerroirForWine(t, h, l, activePr);
        if (ev.stateKey === "ideal") idealCount++; else if (ev.stateKey === "padrao") padraoCount++; else critCount++;

        card.className = ["vineyard-card h-100", isAct ? "active-vineyard border-gold" : (producesStyle ? "lot-style-match" : "lot-dimmed")].filter(Boolean).join(" ");
        const tagEl = card.querySelector(".sommelier-tag");
        if (tagEl) {
          tagEl.className = `sommelier-tag ${isAct ? "sommelier-tag-active" : ""}`;
          tagEl.textContent = isAct ? "● SELECIONADO" : (v.local_time ? `🛰️ ${v.local_time}` : "🛰️ SAT WMO");
        }

        const tEl = card.querySelector(".text-temp"), hEl = card.querySelector(".text-hum"), lEl = card.querySelector(".text-lum"), dEl = card.querySelector(".text-dew");
        if (tEl) tEl.textContent = `🌡️ ${t.toFixed(1)}°C`; if (hEl) hEl.textContent = `💧 ${h.toFixed(0)}%`;
        if (lEl) lEl.textContent = `☀️ ${l.toFixed(0)}%`; if (dEl) dEl.textContent = `💨 ${dew}°C`;
        const vEl = card.querySelector(".terroir-status-txt"), scEl = card.querySelector(".terroir-score-val"), pb = card.querySelector(".progress-bar");
        if (vEl) { vEl.textContent = ev.txt; vEl.className = `terroir-status-txt fw-bold ${ev.cls}`; }
        if (scEl) { scEl.textContent = `${ev.score}%`; scEl.className = `terroir-score-val font-monospace fw-bold ${ev.cls}`; }
        if (pb) { pb.style.width = `${ev.score}%`; pb.className = `progress-bar ${ev.bar} ${isAct ? "progress-bar-striped progress-bar-animated" : ""}`; }
      });
      updateBadge(list, activePr, idealCount, padraoCount, critCount);
      return;
    }

    c.innerHTML = list.map((v) => {
      const isAct = v.id === act;
      const producesStyle = (window.CANONICAL_LOTS || []).some(l => l.terroirId === v.id && l.style === curStyle);
      const matchingLot = (window.CANONICAL_LOTS || []).find(l => l.terroirId === v.id && l.style === curStyle);
      const t = v.satT !== undefined ? v.satT : v.t;
      const h = v.satH !== undefined ? v.satH : v.h;
      const l = v.satL !== undefined ? v.satL : v.l;
      const dew = calcDewPoint(t, h);
      const ev = evalTerroirForWine(t, h, l, activePr);
      if (ev.stateKey === "ideal") idealCount++; else if (ev.stateKey === "padrao") padraoCount++; else critCount++;

      const justClicked = lastClickedTerroir === v.id;
      const cls = ["vineyard-card h-100", isAct ? "active-vineyard border-gold" : (producesStyle ? "lot-style-match" : "lot-dimmed"), justClicked ? "lot-click-pop" : ""].filter(Boolean).join(" ");
      const timeBadge = v.local_time ? `🛰️ ${v.local_time}` : "🛰️ SAT WMO";
      const wineSub = matchingLot ? matchingLot.wine : v.reg;

      return `
      <div class="col-lg-4 col-xl-3 col-md-6 col-12">
        <div class="${cls}" data-vid="${v.id}" style="cursor:pointer;" title="Clique para selecionar o terroir ${v.name} (${v.country})">
          <div class="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom border-secondary border-opacity-25">
            <div class="d-flex align-items-center gap-2">
              <span class="flag-circle">${v.flag}</span>
              <div>
                <div class="lot-wine-title text-truncate" style="font-size:0.84rem;font-weight:700;">${v.name}</div>
                <span class="text-country text-truncate d-block" style="font-size:0.70rem;max-width:130px;">${v.country} · ${wineSub}</span>
              </div>
            </div>
            <span class="sommelier-tag ${isAct ? "sommelier-tag-active" : ""}">${isAct ? "● SELECIONADO" : timeBadge}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center p-1 px-2 rounded bg-black bg-opacity-25 border border-secondary border-opacity-25 my-2 font-monospace" style="font-size:0.68rem;">
            <span class="text-temp">🌡️ ${t.toFixed(1)}°C</span>
            <span class="text-hum">💧 ${h.toFixed(0)}%</span>
            <span class="text-lum">☀️ ${l.toFixed(0)}%</span>
            <span class="text-dew" title="Ponto de Orvalho (Magnus-Tetens)">💨 ${dew}°C</span>
          </div>
          <div class="d-flex justify-content-between align-items-center small mb-1" style="font-size:0.70rem;">
            <span class="terroir-status-txt fw-bold ${ev.cls}">${ev.txt}</span>
            <span class="terroir-score-val font-monospace fw-bold ${ev.cls}">${ev.score}%</span>
          </div>
          <div class="progress rounded-pill" style="height:4px;">
            <div class="progress-bar ${ev.bar} ${isAct ? "progress-bar-striped progress-bar-animated" : ""}" style="width:${ev.score}%;"></div>
          </div>
        </div>
      </div>`;
    }).join("");
    lastClickedTerroir = null;

    updateBadge(list, activePr, idealCount, padraoCount, critCount);
    if (handler) {
      c.querySelectorAll(".vineyard-card").forEach(card => card.addEventListener("click", () => {
        lastClickedTerroir = card.dataset.vid;
        handler(lastClickedTerroir);
      }));
    }
  }

  function updateBadge(list, activePr, idealCount, padraoCount, critCount) {
    const badge = document.getElementById("satellite-live-badge");
    if (!badge) return;
    const bColor = critCount > 0 ? "border-danger text-danger bg-danger" : (padraoCount > 0 ? "border-warning text-warning bg-warning" : "border-success text-success bg-success");
    badge.className = `badge font-monospace ${bColor} bg-opacity-25 border border-opacity-50`;
    badge.innerHTML = `<span class="status-dot"></span>${list.length} ÁREAS WMO · ${activePr.badge || "🍷 VINHO"} (🟢 ${idealCount} · 🟡 ${padraoCount} · 🔴 ${critCount})`;
  }

  function startSatelliteLiveLoop(getActiveId, onSelectCallback) {
    const sync = () => fetchSatelliteData().then(() => {
      renderRealVineyards(getActiveId?.(), onSelectCallback);
      window.renderCellarLots?.();
    });
    sync();
    setInterval(() => { if (!document.hidden) sync(); }, 30000);
  }

  const root = typeof window !== "undefined" ? window : globalThis;
  root.renderRealVineyards = renderRealVineyards;
  root.fetchSatelliteData = fetchSatelliteData;
  root.startSatelliteLiveLoop = startSatelliteLiveLoop;
  root.calcDewPoint = calcDewPoint;
  root.evalTerroirForWine = evalTerroirForWine;
})();
