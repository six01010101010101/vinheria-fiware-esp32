// SCADA Orchestrator & Multi-Area Sensor Controller — Vinheria Agnello & Wokwi Twin
(function () {
  const PRESETS = window.PRESETS || {}, TERROIRS = window.TERROIRS || {};
  let curPr = "tinto", curArea = "br_miolo";
  try {
    const urlP = new URLSearchParams(window.location.search), qP = urlP.get("preset"), qA = urlP.get("terroir");
    curPr = (qP && PRESETS[qP]) ? qP : (localStorage.getItem("vinheria_preset") || "tinto");
    if (qA && TERROIRS[qA]) curArea = qA;
  } catch (_) {}

  window.curLotCode = window.curLotCode || "LOTE-BR-MIOLO-01";
  const def = PRESETS[curPr] || { defT: 18.0, defH: 60, defL: 9 };
  const sim = { baseT: 18.0, baseH: 60, baseL: 9, t: 18.0, h: 60, l: 9, mode: "padrao", score: 92 };
  sim.t = sim.baseT; sim.h = sim.baseH; sim.l = sim.baseL;
  window.curPr = curPr; window.curArea = curArea; window.curScadaMode = sim.mode;

  const getActiveLot = () => {
    const lots = window.CANONICAL_LOTS || [];
    if (window.curLotCode) {
      const byCode = lots.find(x => x.code === window.curLotCode);
      if (byCode) return byCode;
    }
    const byTerroir = window.findLotByTerroir ? window.findLotByTerroir(curArea, curPr) : null;
    if (byTerroir) return byTerroir;
    return lots.find(x => x.style === curPr) || lots[0] || null;
  };
  const setSimBase = (t, h, l, mode = "normal") => {
    sim.baseT = sim.t = +Number(t).toFixed(1); sim.baseH = sim.h = +Number(h).toFixed(0); sim.baseL = sim.l = +Number(l).toFixed(0);
    sim.mode = mode; window.curScadaMode = mode;
  };

  function updateHardwarePlaque(t, h, l, userTriggered = false, soundType = "auto", explicitScore, explicitStateKey) {
    const lot = getActiveLot();
    const res = window.ScadaDispatcher?.dispatchHardwarePlaque({
      t, h, l, curPr, curArea, simMode: sim.mode, userTriggered, soundType, PRESETS, TERROIRS, lot,
      score: explicitScore, stateKey: explicitStateKey
    });
    if (res && res.score !== undefined) sim.score = res.score;
    window.simT = sim.t; window.simH = sim.h; window.simL = sim.l; window.curHealthScore = sim.score;
  }

  function onWinePresetChange(presetKey, keepLot = false, userTriggered = true) {
    const normKey = presetKey === "brut" ? "espumante" : presetKey;
    curPr = PRESETS[normKey] ? normKey : "tinto"; window.curPr = curPr;
    const p = PRESETS[curPr] || {};
    if (!keepLot) {
      const lots = window.CANONICAL_LOTS || [];
      const match = lots.find(l => l.style === curPr && l.terroirId === curArea) || lots.find(l => l.style === curPr);
      if (match) window.curLotCode = match.code;
    }
    const actLot = getActiveLot();
    const ev = actLot ? window.evaluateLotPreservation?.(actLot, actLot.baseT, actLot.baseH, actLot.baseL, p) : null;
    const stKey = ev?.stateKey || "ideal";
    setSimBase(actLot ? actLot.baseT : p.defT, actLot ? actLot.baseH : p.defH, actLot ? actLot.baseL : p.defL, stKey);
    window.ScadaUIController?.syncPresetControls(p, curPr);
    updateHardwarePlaque(sim.t, sim.h, sim.l, userTriggered, "wine", ev?.score, stKey);
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, p, actLot, true);
    renderCellarLots(); renderRealVineyards();
    window.ScadaDispatcher?.syncCloudConfig(curPr, curArea, window.curLotCode, TERROIRS);
  }

  function onLotSelect(styleKey, terroirKey, lotCode) {
    const lots = window.CANONICAL_LOTS || [];
    const clickedLot = lots.find(x => x.code === lotCode) || null;
    if (lotCode) window.curLotCode = lotCode;
    const chosenStyle = clickedLot?.style || styleKey || curPr;
    const normStyle = chosenStyle === "brut" ? "espumante" : chosenStyle;
    curPr = PRESETS[normStyle] ? normStyle : "tinto"; window.curPr = curPr;
    const p = PRESETS[curPr] || {};
    const trKey = terroirKey || clickedLot?.terroirId;
    if (trKey && TERROIRS[trKey]) {
      curArea = trKey; window.curArea = curArea;
      const selT = document.getElementById("dropdown-area-terroir");
      if (selT) selT.value = curArea;
    }
    const lot = clickedLot || getActiveLot();
    const realT = lot?.liveT ?? lot?.baseT ?? p.defT, realH = lot?.liveH ?? lot?.baseH ?? p.defH, realL = lot?.liveL ?? lot?.baseL ?? p.defL;
    const ev = window.evaluateLotPreservation ? window.evaluateLotPreservation(lot, realT, realH, realL, p) : { score: 92, stateKey: "padrao" };
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

    const lots = window.CANONICAL_LOTS || [];
    let matchLot = lots.find(l => l.terroirId === curArea && l.style === curPr);
    if (matchLot) window.curLotCode = matchLot.code;
    else {
      const anyLot = lots.find(l => l.terroirId === curArea) || lots.find(l => l.style === curPr);
      if (anyLot) window.curLotCode = anyLot.code;
    }

    const p = PRESETS[curPr] || {};
    window.ScadaUIController?.syncPresetControls(p, curPr);
    const lot = getActiveLot();
    const realT = tr.satT ?? tr.t ?? tr.baseT ?? (lot?.liveT ?? p.defT);
    const realH = tr.satH ?? tr.h ?? tr.baseH ?? (lot?.liveH ?? p.defH);
    const realL = tr.satL ?? tr.l ?? tr.baseL ?? (lot?.liveL ?? p.defL);
    const ev = window.evalTerroirForWine ? window.evalTerroirForWine(realT, realH, realL, p) : { score: 92, stateKey: "padrao" };
    setSimBase(realT, realH, realL, ev.stateKey);
    updateHardwarePlaque(sim.t, sim.h, sim.l, true, ev.stateKey === "critico" ? "critico" : "terroir", ev.score, ev.stateKey);
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, p, lot, true);
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
    renderCellarLots(); renderRealVineyards(); window.ScadaDispatcher?.syncCloudConfig(curPr, curArea, window.curLotCode, TERROIRS);
  }

  let isScrolling = false, scrollTimeout = null;
  window.addEventListener("scroll", () => {
    isScrolling = true; if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => { isScrolling = false; }, 140);
  }, { passive: true });

  const renderRealVineyards = () => window.renderRealVineyards?.(curArea, onAreaTerroirChange);
  const renderCellarLots = () => window.renderCellarLots?.(curPr, sim.t, sim.h, sim.l, onLotSelect, window.curLotCode);

  function fetchLiveTicker() {
    if (document.hidden) return;
    if (curArea !== "wokwi_esp32") {
      sim.t = sim.baseT; sim.h = sim.baseH; sim.l = sim.baseL;
    }
    const actLot = getActiveLot(), ev = actLot ? window.evaluateLotPreservation?.(actLot, sim.t, sim.h, sim.l, PRESETS[curPr]) : null;
    updateHardwarePlaque(sim.t, sim.h, sim.l, false, "auto", ev?.score, ev?.stateKey);
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
      const actLot = getActiveLot(), ev = actLot ? window.evaluateLotPreservation?.(actLot, sim.t, sim.h, sim.l, PRESETS[curPr]) : null;
      updateHardwarePlaque(sim.t, sim.h, sim.l, false, "auto", ev?.score, ev?.stateKey);
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
