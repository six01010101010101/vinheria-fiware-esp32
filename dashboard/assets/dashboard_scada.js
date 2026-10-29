// SCADA Engine & Orquestrador Reativo em Tempo Real — Vinheria Agnello, Supabase Cloud & Wokwi
(function () {
  const PRESETS = window.PRESETS || {}, TERROIRS = window.TERROIRS || {};
  let curPr = "tinto", curArea = "fr_margaux";
  try {
    const urlP = new URLSearchParams(window.location.search), qP = urlP.get("preset"), qA = urlP.get("terroir");
    curPr = (qP && PRESETS[qP]) ? qP : (localStorage.getItem("vinheria_preset") || "tinto");
    if (qA && TERROIRS[qA]) curArea = qA;
  } catch (_) {}

  const initPr = PRESETS[curPr] || PRESETS.tinto || { defT: 15.8, defH: 68.0, defL: 9.0, defaultLot: "LOTE-FR-MARGAUX-01", defaultTerroir: "fr_margaux" };
  if (initPr.defaultLot) window.curLotCode = initPr.defaultLot;
  if (initPr.defaultTerroir) curArea = initPr.defaultTerroir;
  let sim = { baseT: initPr.defT || 15.8, baseH: initPr.defH || 68.0, baseL: initPr.defL || 9.0, t: 15.8, h: 68.0, l: 9.0, score: 99, mode: "normal" };
  sim.t = sim.baseT; sim.h = sim.baseH; sim.l = sim.baseL;
  window.curPr = curPr; window.curArea = curArea; window.curScadaMode = sim.mode;

  const getActiveLot = () => {
    const lots = window.CANONICAL_LOTS || [];
    return (window.curLotCode ? lots.find(x => x.code === window.curLotCode) : null) ||
           (window.findLotByTerroir ? window.findLotByTerroir(curArea, curPr) : null) || lots.find(x => x.style === curPr) || lots[0] || null;
  };
  const setSimBase = (t, h, l, mode = "normal") => {
    sim.baseT = sim.t = +Number(t).toFixed(1); sim.baseH = sim.h = +Number(h).toFixed(0); sim.baseL = sim.l = +Number(l).toFixed(0);
    sim.mode = mode; window.curScadaMode = mode;
  };

  let lastTelegramMode = null;
  function updateHardwarePlaque(t, h, l, userTriggered = false, soundType = "auto", explicitScore, explicitStateKey) {
    const lot = getActiveLot();
    const res = window.ScadaDispatcher?.dispatchHardwarePlaque({
      t, h, l, curPr, curArea, simMode: sim.mode, userTriggered, soundType, PRESETS, TERROIRS, lot,
      score: explicitScore, stateKey: explicitStateKey
    });
    if (res && res.score !== undefined) sim.score = res.score;
    window.simT = sim.t; window.simH = sim.h; window.simL = sim.l; window.curHealthScore = sim.score;

    const stKey = res?.stateKey || explicitStateKey || "ideal";
    const isCrit = (stKey === "critico" && lastTelegramMode !== "critico"), modeChanged = (lastTelegramMode !== null && lastTelegramMode !== stKey);
    if (userTriggered || isCrit || modeChanged) {
      lastTelegramMode = stKey;
      const tr = TERROIRS[curArea] || {};
      window.TelegramNotifier?.sendTelegramAlert({
        terroir: `${lot?.winery || tr.name} (${lot?.wine || ""})`, country: lot?.country || tr.country,
        wine_style: curPr, temp: sim.t, hum: sim.h, lum: sim.l,
        stateKey: stKey, score: sim.score, style: curPr, force: userTriggered || isCrit
      });
    }
  }

  function onWinePresetChange(presetKey, keepLot = false, userTriggered = true) {
    const normKey = presetKey === "brut" ? "espumante" : presetKey;
    curPr = PRESETS[normKey] ? normKey : "tinto"; window.curPr = curPr;
    const p = PRESETS[curPr] || {};
    if (!keepLot) {
      const matchInCurArea = window.findLotByTerroir ? window.findLotByTerroir(curArea, curPr) : null;
      if (matchInCurArea && matchInCurArea.style === curPr) window.curLotCode = matchInCurArea.code;
      else if (p.defaultLot) {
        window.curLotCode = p.defaultLot;
        const defLot = getActiveLot();
        if (defLot?.terroirId && TERROIRS[defLot.terroirId]) {
          curArea = defLot.terroirId; window.curArea = curArea;
          const selT = document.getElementById("dropdown-area-terroir");
          if (selT) selT.value = curArea;
        }
      }
      const actLot = getActiveLot();
      const ev = actLot ? window.evaluateLotPreservation?.(actLot, actLot.baseT, actLot.baseH, actLot.baseL, p) : null;
      const stKey = ev?.stateKey || "ideal";
      setSimBase(actLot ? actLot.baseT : p.defT, actLot ? actLot.baseH : p.defH, actLot ? actLot.baseL : p.defL, stKey);
      window.ScadaUIController?.syncPresetControls(p, curPr);
      updateHardwarePlaque(sim.t, sim.h, sim.l, userTriggered, "wine", ev?.score, stKey);
    } else {
      window.ScadaUIController?.syncPresetControls(p, curPr);
      updateHardwarePlaque(sim.t, sim.h, sim.l, userTriggered, "wine");
    }
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, p, getActiveLot(), true);
    renderCellarLots(); renderRealVineyards();
    window.ScadaDispatcher?.syncCloudConfig(curPr, curArea, window.curLotCode, TERROIRS);
  }

  function onLotSelect(styleKey, terroirKey, lotCode) {
    if (lotCode) window.curLotCode = lotCode;
    const lot = getActiveLot();
    const normStyle = (lot?.style || styleKey) === "brut" ? "espumante" : (lot?.style || styleKey || "tinto");
    curPr = PRESETS[normStyle] ? normStyle : "tinto"; window.curPr = curPr;
    const p = PRESETS[curPr] || {};
    const trKey = terroirKey || lot?.terroirId;
    if (trKey && TERROIRS[trKey]) {
      curArea = trKey; window.curArea = curArea;
      const selT = document.getElementById("dropdown-area-terroir");
      if (selT) selT.value = curArea;
    }
    const realT = lot?.liveT ?? lot?.baseT ?? p.defT, realH = lot?.liveH ?? lot?.baseH ?? p.defH, realL = lot?.liveL ?? lot?.baseL ?? p.defL;

    const ev = window.evaluateLotPreservation ? window.evaluateLotPreservation(lot, realT, realH, realL, p) : { score: 99, stateKey: "ideal" };
    setSimBase(realT, realH, realL, ev.stateKey);
    window.ScadaUIController?.syncPresetControls(p, curPr);
    updateHardwarePlaque(sim.t, sim.h, sim.l, true, ev.stateKey === "critico" ? "critico" : "wine", ev.score, ev.stateKey);
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, p, lot, true);
    renderCellarLots(); renderRealVineyards();
    window.ScadaDispatcher?.syncCloudConfig(curPr, curArea, window.curLotCode, TERROIRS);
  }

  function onAreaTerroirChange(areaKey) {
    curArea = areaKey; window.curArea = curArea;
    const tr = TERROIRS[curArea] || {};
    const sel = document.getElementById("dropdown-area-terroir");
    if (sel && sel.value !== curArea) sel.value = curArea;
    const desc = document.getElementById("terroir-description-text");
    if (desc) desc.textContent = curArea === "wokwi_esp32" ? "Telemetria direta do hardware físico/simulado ESP32 Wokwi." : `Clima real de ${tr.country} (${tr.name} · ${tr.reg}) via satélite Open-Meteo e Supabase.`;

    const matchLot = window.findLotByTerroir ? window.findLotByTerroir(curArea, curPr) :
      (window.CANONICAL_LOTS || []).find(l => (l.terroirId === curArea && l.style === curPr) || l.code === tr.lotCode || l.terroirId === curArea);
    if (matchLot) { window.curLotCode = matchLot.code; }

    const p = PRESETS[curPr] || {};
    window.ScadaUIController?.syncPresetControls(p, curPr);

    const realT = tr.satT ?? tr.t ?? tr.baseT ?? p.defT, realH = tr.satH ?? tr.h ?? tr.baseH ?? p.defH, realL = tr.satL ?? tr.l ?? tr.baseL ?? p.defL;

    const ev = window.evalTerroirForWine ? window.evalTerroirForWine(realT, realH, realL, p) : { score: 99, stateKey: "ideal" };
    setSimBase(realT, realH, realL, ev.stateKey);
    updateHardwarePlaque(sim.t, sim.h, sim.l, true, ev.stateKey === "critico" ? "critico" : "terroir", ev.score, ev.stateKey);
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, p, getActiveLot(), true);
    renderCellarLots(); renderRealVineyards();
    window.ScadaDispatcher?.syncCloudConfig(curPr, curArea, window.curLotCode, TERROIRS);
  }

  function onThresholdInputChange() {
    const p = window.ScadaUIController?.readThresholdInputs?.(PRESETS[curPr] || {}) || PRESETS[curPr];
    updateHardwarePlaque(sim.t, sim.h, sim.l, true, "auto");
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, p, getActiveLot(), false);
    renderCellarLots(); renderRealVineyards();
    window.ScadaDispatcher?.syncCloudConfig(curPr, curArea, window.curLotCode, TERROIRS);
  }

  function applyScenario(sc) {
    const d = window.ScadaDispatcher?.getScenarioValues(sc, curPr, PRESETS) || [15.8, 68, 9];
    setSimBase(d[0], d[1], d[2], sc);
    updateHardwarePlaque(sim.t, sim.h, sim.l, true, "sc:" + sc);
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, PRESETS[curPr], getActiveLot(), true);
    renderCellarLots(); renderRealVineyards();
    window.ScadaDispatcher?.syncCloudConfig(curPr, curArea, window.curLotCode, TERROIRS);
  }

  let isScrolling = false, scrollTimeout = null;
  window.addEventListener("scroll", () => {
    isScrolling = true;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => { isScrolling = false; }, 140);
  }, { passive: true });

  const renderRealVineyards = () => window.renderRealVineyards?.(curArea, onAreaTerroirChange);
  const renderCellarLots = () => window.renderCellarLots?.(curPr, sim.t, sim.h, sim.l, onLotSelect, window.curLotCode);

  function fetchLiveTicker() {
    if (document.hidden) return;
    const ph = Date.now() / 2000;
    if (curArea !== "wokwi_esp32") {
      sim.t = +(sim.baseT + Math.sin(ph) * 0.25).toFixed(1);
      sim.h = Math.max(20, Math.min(99, Math.round(sim.baseH + Math.cos(ph * 0.75) * 1.2)));
      sim.l = Math.max(0, Math.min(100, Math.round(sim.baseL + Math.sin(ph * 0.5) * 0.6)));
    }
    updateHardwarePlaque(sim.t, sim.h, sim.l, false);
    if (!isScrolling) window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, PRESETS[curPr], getActiveLot(), false);
    renderCellarLots(); renderRealVineyards();
  }

  function bootScada() {
    if (!document.getElementById("wine-style-pills") && !document.getElementById("wokwi-lcd-l1")) return;
    window.ScadaUIController?.syncPresetControls(PRESETS[curPr] || {}, curPr);
    renderCellarLots(); renderRealVineyards();
    updateHardwarePlaque(sim.t, sim.h, sim.l, true);
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, PRESETS[curPr], getActiveLot(), true);
    window.ScadaDispatcher?.syncCloudConfig(curPr, curArea, window.curLotCode, TERROIRS);
    window.ScadaMQTT?.init?.((d) => {
      if (curArea !== "wokwi_esp32") return;
      if (d.t !== undefined) sim.baseT = sim.t = d.t;
      if (d.h !== undefined) sim.baseH = sim.h = d.h;
      if (d.l !== undefined) sim.baseL = sim.l = d.l;
      updateHardwarePlaque(sim.t, sim.h, sim.l, false);
      if (!isScrolling) window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, PRESETS[curPr], getActiveLot(), false);
      renderCellarLots(); renderRealVineyards();
    });
    window.startSatelliteLiveLoop?.(() => curArea, onAreaTerroirChange);
    window.ScadaUIController?.bindScadaEvents({
      onWinePresetChange, onLotSelect, onAreaTerroirChange, onThresholdInputChange, applyScenario,
      onThemeChanged: () => window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, PRESETS[curPr], getActiveLot(), false)
    });
    setInterval(fetchLiveTicker, 2200);
  }
  window.onLotSelect = onLotSelect; window.onWinePresetChange = onWinePresetChange; window.onAreaTerroirChange = onAreaTerroirChange;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootScada); else bootScada();
})();
