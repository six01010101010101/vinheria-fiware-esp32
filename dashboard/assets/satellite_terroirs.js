/**
 * Módulo de Telemetria por Satélite & Estações Meteorológicas — Vinheria Agnello
 * Avalia cada Terroir em tempo real para o Estilo de Vinho selecionado (Tinto, Branco, Rosé, Brut).
 */
(function () {
  let lastClickedTerroir = null;

  function calcDewPoint(t, h) {
    const rh = Math.max(1, Math.min(100, h));
    const a = ((17.27 * t) / (237.7 + t)) + Math.log(rh / 100);
    return +((237.7 * a) / (17.27 - a)).toFixed(1);
  }

  function evalTerroirForWine(v, pr) {
    const p = pr || { name: "Vinho Tinto", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMax: 25 };
    let pen = 0;
    if (v.t < p.tMin) pen += (p.tMin - v.t) * 6.5;
    else if (v.t > p.tMax) pen += (v.t - p.tMax) * 6.5;
    if (v.h < p.hMin) pen += (p.hMin - v.h) * 1.4;
    else if (v.h > p.hMax) pen += (v.h - p.hMax) * 1.4;
    if (v.l > p.lMax) pen += (v.l - p.lMax) * 1.1;
    const score = Math.max(20, Math.min(100, Math.round(100 - pen)));
    const wShort = (p.name || "Tinto").replace("Champanhe / ", "");
    if (score >= 92 && pen === 0) {
      return { score, txt: `🟢 Equilíbrio Ideal (${wShort})`, cls: "text-success", bar: "bg-success" };
    }
    if (score >= 76) {
      return { score, txt: `🔵 Estado Padrão (${wShort})`, cls: "text-info", bar: "bg-info" };
    }
    return { score, txt: `🔴 Crítico p/ ${wShort}`, cls: "text-danger", bar: "bg-danger" };
  }

  async function fetchSatelliteData() {
    const terroirs = window.TERROIRS || {};
    let updated = false;
    const list = Object.values(terroirs).filter(x => x.id !== "wokwi_esp32");
    const lats = list.map(x => x.lat).join(","), lons = list.map(x => x.lon).join(",");
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,shortwave_radiation&timezone=auto`);
      if (res.ok) {
        const payload = await res.json();
        const items = Array.isArray(payload) ? payload : [payload];
        list.forEach((tItem, idx) => {
          const c = items[idx]?.current || {};
          if (c.temperature_2m !== undefined) {
            tItem.satT = +c.temperature_2m.toFixed(1);
            tItem.local_time = (c.time || "").split("T")[1] || "Ao Vivo";
            tItem.source = "Open-Meteo Satélite WMO";
            updated = true;
          }
        });
      }
    } catch (_) {}
    const badge = document.getElementById("satellite-live-badge");
    if (badge) {
      const pr = (window.PRESETS && window.PRESETS[window.curPr || "tinto"]) || { badge: "🍷 TINTO" };
      badge.className = "badge font-monospace bg-success bg-opacity-25 text-success border border-success border-opacity-50";
      badge.innerHTML = `<span class="status-dot"></span>TERROIRS SINCRONIZADOS · ${pr.badge || "🍷 VINHO"} (${new Date().toLocaleTimeString().slice(0, 8)})`;
    }
    return updated;
  }

  function renderRealVineyards(activeId, onSelectCallback) {
    const c = document.getElementById("real-vineyards-grid");
    if (!c) return;
    const act = activeId || window.curArea || "fr_margaux";
    const pr = (window.PRESETS && window.PRESETS[window.curPr || "tinto"]) || { name: "Vinho Tinto", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMax: 25 };
    const handler = onSelectCallback || window.onAreaTerroirChange;
    const list = Object.values(window.TERROIRS || {}).filter(x => x.id !== "wokwi_esp32");

    c.innerHTML = list.map(v => {
      const dew = v.dew !== undefined ? v.dew : calcDewPoint(v.t, v.h);
      const isAct = v.id === act;
      const ev = evalTerroirForWine(v, pr);
      const justClicked = lastClickedTerroir === v.id;
      const cls = [
        "vineyard-card h-100",
        isAct ? "active-vineyard border-gold" : "lot-dimmed",
        justClicked ? "lot-click-pop" : ""
      ].filter(Boolean).join(" ");

      return `
      <div class="col-lg-3 col-md-6 col-12">
        <div class="${cls}" data-vid="${v.id}" style="cursor:pointer;" title="Clique para selecionar o terroir ${v.name} (${v.country})">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <div class="d-flex align-items-center gap-2">
              <span class="flag-circle">${v.flag}</span>
              <div>
                <div class="lot-wine-title text-truncate" style="font-size:0.84rem;font-weight:700;">${v.name}</div>
                <span class="text-country" style="font-size:0.70rem;">${v.country} · ${v.reg}</span>
              </div>
            </div>
            <span class="sommelier-tag ${isAct ? "sommelier-tag-active" : ""}">${isAct ? "● SELECIONADO" : "🛰️ SAT"}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center p-1 px-2 rounded bg-black bg-opacity-25 border border-secondary border-opacity-25 my-2 font-monospace" style="font-size:0.68rem;">
            <span class="text-temp">🌡️ ${v.t.toFixed(1)}°C</span>
            <span class="text-hum">💧 ${v.h.toFixed(0)}%</span>
            <span class="text-lum">☀️ ${v.l.toFixed(0)}%</span>
            <span class="text-dew">💨 ${dew}°C</span>
          </div>
          <div class="d-flex justify-content-between align-items-center small mb-1" style="font-size:0.70rem;">
            <span class="fw-bold ${ev.cls}">${ev.txt}</span>
            <span class="font-monospace fw-bold ${ev.cls}">${ev.score}%</span>
          </div>
          <div class="progress rounded-pill" style="height:4px;">
            <div class="progress-bar ${ev.bar} ${isAct ? "progress-bar-striped progress-bar-animated" : ""}" style="width:${ev.score}%;"></div>
          </div>
        </div>
      </div>`;
    }).join("");
    lastClickedTerroir = null;

    if (handler) {
      c.querySelectorAll(".vineyard-card").forEach(card => card.addEventListener("click", () => {
        const vid = card.dataset.vid;
        lastClickedTerroir = vid;
        handler(vid);
      }));
    }
  }

  function startSatelliteLiveLoop(getActiveId, onSelectCallback) {
    fetchSatelliteData().then(() => renderRealVineyards(getActiveId?.(), onSelectCallback));
    setInterval(() => {
      const terroirs = window.TERROIRS || {};
      Object.values(terroirs).forEach(v => {
        if (v.id !== "wokwi_esp32") {
          v.t = +(v.t + (Math.random() - 0.5) * 0.06).toFixed(1);
        }
      });
      renderRealVineyards(getActiveId?.(), onSelectCallback);
    }, 2400);
  }

  window.renderRealVineyards = renderRealVineyards;
  window.fetchSatelliteData = fetchSatelliteData;
  window.startSatelliteLiveLoop = startSatelliteLiveLoop;
  window.calcDewPoint = calcDewPoint;
})();
