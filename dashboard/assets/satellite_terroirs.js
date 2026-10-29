/**
 * Módulo de Telemetria por Satélite & Estações Meteorológicas (12 Terroirs) — Vinheria Agnello
 * Avalia cada Terroir em 3 estados: 🟢 IDEAL (95–100%) | 🔵 PADRÃO (75–94%) | 🔴 CRÍTICO (<75% · Apito).
 */
(function () {
  let lastClickedTerroir = null;

  function calcDewPoint(t, h) {
    const rh = Math.max(1, Math.min(100, h));
    const a = ((17.27 * t) / (237.7 + t)) + Math.log(rh / 100);
    return +((237.7 * a) / (17.27 - a)).toFixed(1);
  }

  function evalTerroirForWine(t, h, l, pr, modeOverride) {
    const p = pr || { name: "Vinho Tinto", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMax: 25 };
    let pen = 0;
    if (t < p.tMin) pen += (p.tMin - t) * 7.5;
    else if (t > p.tMax) pen += (t - p.tMax) * 7.5;
    if (h < p.hMin) pen += (p.hMin - h) * 1.6;
    else if (h > p.hMax) pen += (h - p.hMax) * 1.6;
    if (l > p.lMax) pen += (l - p.lMax) * 1.3;
    const tMid = (p.tMin + p.tMax) / 2, hMid = (p.hMin + p.hMax) / 2;
    const edge = (Math.abs(t - tMid) / Math.max(1, (p.tMax - p.tMin) / 2)) * 2.5 +
                 (Math.abs(h - hMid) / Math.max(1, (p.hMax - p.hMin) / 2)) * 1.8;
    let score = pen === 0 ? Math.max(95, Math.min(100, Math.round(100 - edge))) : Math.max(15, Math.min(94, Math.round(100 - pen)));

    if (modeOverride === "multi" || modeOverride === "critico") {
      score = Math.min(score, 62);
    } else if (modeOverride === "padrao" && (score >= 95 || score < 75)) {
      score = 78;
    }

    const wShort = (p.name || "Tinto").replace("Espumante ", "");
    if (score >= 95) {
      return { score, stateKey: "ideal", txt: `🟢 IDEAL (${wShort})`, cls: "text-success", bar: "bg-success" };
    }
    if (score >= 75) {
      return { score, stateKey: "padrao", txt: `🟡 PADRÃO (${wShort})`, cls: "text-warning", bar: "bg-warning" };
    }
    return { score, stateKey: "critico", txt: `🔴 CRÍTICO p/ ${wShort}`, cls: "text-danger", bar: "bg-danger" };
  }

  async function fetchSatelliteData() {
    const terroirs = window.TERROIRS || {};
    let updated = false;
    const list = Object.values(terroirs).filter(x => x.id !== "wokwi_esp32");
    const lats = list.map(x => x.lat).join(","), lons = list.map(x => x.lon).join(",");
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
            tItem.t = tItem.satT;
            tItem.h = tItem.satH;
            tItem.l = tItem.satL;
            tItem.local_time = (c.time || "").split("T")[1] || new Date().toLocaleTimeString().slice(0, 5);
            tItem.source = "Open-Meteo Satélite WMO";
            updated = true;
          }
        });
      }
    } catch (_) {}

    // Sincroniza áreas atualizadas com o Supabase Cloud e re-renderiza lotes da cava
    window.SupabaseCloud?.syncLotsAndAreas?.(window.curPr || "tinto", true);
    window.renderCellarLots?.();
    return updated;
  }

  function renderRealVineyards(activeId, onSelectCallback, liveTemp, liveHum, liveLum) {
    const c = document.getElementById("real-vineyards-grid");
    if (!c) return;
    const act = activeId || window.curArea || "fr_margaux";
    const activePr = (window.PRESETS && window.PRESETS[window.curPr || "tinto"]) || { name: "Vinho Tinto", badge: "🍷 TINTO", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMax: 25 };
    const curMode = window.curScadaMode || "normal";
    const handler = onSelectCallback || window.onAreaTerroirChange;
    const list = Object.values(window.TERROIRS || {}).filter(x => x.id !== "wokwi_esp32");

    let idealCount = 0, padraoCount = 0, critCount = 0;

    c.innerHTML = list.map((v, idx) => {
      const isAct = v.id === act;
      // Utiliza a leitura real do satélite
      const t = (isAct && typeof liveTemp === "number" && window.manualOverride) ? liveTemp : (v.satT !== undefined ? v.satT : v.t);
      const h = (isAct && typeof liveHum === "number" && window.manualOverride) ? liveHum : (v.satH !== undefined ? v.satH : v.h);
      const l = (isAct && typeof liveLum === "number" && window.manualOverride) ? liveLum : (v.satL !== undefined ? v.satL : v.l);
      const dew = calcDewPoint(t, h);

      // Avalia a área selecionada contra o preset ativo, e as demais contra o estilo nativo da própria cave
      const targetPr = isAct ? activePr : ((window.PRESETS && window.PRESETS[v.style]) || activePr);
      const ev = evalTerroirForWine(t, h, l, targetPr, isAct ? curMode : null);
      if (ev.stateKey === "ideal") idealCount++;
      else if (ev.stateKey === "padrao") padraoCount++;
      else {
        critCount++;
        // Se a área ativa está em estado crítico, aciona o buzzer e o Telegram
        if (isAct) {
          if (typeof window.playAcousticChime === "function") window.playAcousticChime(1480, 0.45);
          window.TelegramNotifier?.sendTelegramAlert({
            terroir: v.name, country: v.country, temp: t, hum: h, lum: l,
            stateKey: "critico", score: ev.score, style: targetPr.key || "tinto"
          });
        }
      }

      const justClicked = lastClickedTerroir === v.id;
      const isStyleMatch = v.style === (window.curPr || "tinto");
      const cls = [
        "vineyard-card h-100",
        isAct ? "active-vineyard border-gold" : (isStyleMatch ? "lot-style-match" : "lot-dimmed"),
        justClicked ? "lot-click-pop" : ""
      ].filter(Boolean).join(" ");

      const timeBadge = v.local_time ? `🛰️ ${v.local_time}` : "🛰️ SAT WMO";

      return `
      <div class="col-lg-4 col-xl-3 col-md-6 col-12">
        <div class="${cls}" data-vid="${v.id}" style="cursor:pointer;" title="Clique para selecionar o terroir ${v.name} (${v.country})">
          <div class="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom border-secondary border-opacity-25">
            <div class="d-flex align-items-center gap-2">
              <span class="flag-circle">${v.flag}</span>
              <div>
                <div class="lot-wine-title text-truncate" style="font-size:0.84rem;font-weight:700;">${v.name}</div>
                <span class="text-country" style="font-size:0.70rem;">${v.country} · ${v.reg}</span>
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

    const badge = document.getElementById("satellite-live-badge");
    if (badge) {
      const bColor = critCount > 0 ? "border-danger text-danger bg-danger" : (padraoCount > 0 ? "border-warning text-warning bg-warning" : "border-success text-success bg-success");
      badge.className = `badge font-monospace ${bColor} bg-opacity-25 border border-opacity-50`;
      badge.innerHTML = `<span class="status-dot"></span>${list.length} ÁREAS WMO · ${activePr.badge || "🍷 VINHO"} (🟢 ${idealCount} · 🟡 ${padraoCount} · 🔴 ${critCount})`;
    }

    if (handler) {
      c.querySelectorAll(".vineyard-card").forEach(card => card.addEventListener("click", () => {
        const vid = card.dataset.vid;
        lastClickedTerroir = vid;
        handler(vid);
      }));
    }
  }

  function startSatelliteLiveLoop(getActiveId, onSelectCallback) {
    fetchSatelliteData().then(() => {
      renderRealVineyards(getActiveId?.(), onSelectCallback);
      window.renderCellarLots?.();
    });
    setInterval(() => {
      if (document.hidden) return;
      fetchSatelliteData().then(() => {
        renderRealVineyards(getActiveId?.(), onSelectCallback);
        window.renderCellarLots?.();
      });
    }, 30000);
  }

  window.renderRealVineyards = renderRealVineyards;
  window.fetchSatelliteData = fetchSatelliteData;
  window.startSatelliteLiveLoop = startSatelliteLiveLoop;
  window.calcDewPoint = calcDewPoint;
})();
