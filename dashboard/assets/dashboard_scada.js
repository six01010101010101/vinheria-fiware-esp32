// SCADA Engine & Orquestrador Reativo em Tempo Real — Vinheria Agnello & Wokwi
(function () {
  const PRESETS = window.PRESETS || {}, TERROIRS = window.TERROIRS || {};
  let curPr = "tinto", curArea = "fr_margaux";
  let sim = { t: 15.8, h: 68.0, l: 9.0, score: 99, mode: "normal" };
  window.curPr = curPr; window.curArea = curArea;

  function getActiveLot() {
    const lots = window.CANONICAL_LOTS || [];
    return lots.find(x => x.code === window.curLotCode) || lots.find(x => x.style === curPr) || lots[0] || null;
  }

  function getScenarioValues(sc, presetKey) {
    const p = PRESETS[presetKey] || PRESETS.tinto || { defT: 15.8, defH: 68, defL: 9, tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    if (sc === "padrao") return [+(p.tMax + 2.2).toFixed(1), Math.max(30, +(p.hMin - 3).toFixed(0)), p.defL];
    if (sc === "critico" || sc === "multi") return [+(p.tMax + 5.6).toFixed(1), Math.max(22, +(p.hMin - 18).toFixed(0)), Math.min(98, +(p.lMax + 32).toFixed(0))];
    return [p.defT, p.defH, p.defL];
  }

  function updateWineProfileBanner(pr, lot, res) {
    const badgeEl = document.getElementById("active-wine-banner-badge");
    const castaEl = document.getElementById("active-wine-banner-casta");
    const rangeEl = document.getElementById("active-wine-banner-range");
    const stateEl = document.getElementById("active-wine-banner-state");
    if (badgeEl) badgeEl.textContent = pr.badge || "🍷 VINHO TINTO";
    if (castaEl) castaEl.textContent = lot ? `${lot.winery} — ${lot.wine} (${lot.vintage}) · ${pr.casta || ""}` : (pr.casta || pr.desc || "");
    if (rangeEl) rangeEl.textContent = `Alvo: ${pr.tMin}–${pr.tMax}°C | ${pr.hMin}–${pr.hMax}% UR | ≤${pr.lMax}% Luz`;
    if (stateEl && res) {
      const isId = res.stateKey === "ideal", isCr = res.stateKey === "critico";
      stateEl.textContent = isId ? `🟢 IDEAL 95–100% (${res.score}%)` : (isCr ? `🔴 CRÍTICO <75% (${res.score}% · APITO)` : `🔵 PADRÃO ~75% (${res.score}%)`);
      stateEl.className = `badge font-monospace ${isId ? "bg-success bg-opacity-25 text-success border border-success" : (isCr ? "bg-danger bg-opacity-25 text-danger border border-danger" : "bg-info bg-opacity-25 text-info border border-info")}`;
    }
  }

  function updateHardwarePlaque(t, h, l, userTriggered = false, soundType = "auto") {
    const pr = PRESETS[curPr] || PRESETS.tinto || { key: "tinto", name: "Vinho Tinto", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    const tr = TERROIRS[curArea] || { name: "ESP32 Wokwi", flag: "📟", country: "Wokwi" };
    const lot = getActiveLot();
    if (!window.WokwiLCD) return;
    const res = window.WokwiLCD.renderWokwiTwin({ t, h, l, preset: pr, terroir: tr, lot, isWokwi: curArea === "wokwi_esp32", mode: sim.mode });
    if (res && res.score !== undefined) sim.score = res.score;
    updateWineProfileBanner(pr, lot, res);

    const stKey = res?.stateKey || "ideal";
    const cmd = stKey === "critico" ? "multi" : (stKey === "padrao" ? "padrao" : "normal");
    const tag = res?.prTag || "TINTO", sc = res?.score || 99, v = stKey === "critico" ? "CRT" : (stKey === "padrao" ? "PAD" : "OK");
    const bge = document.getElementById("mqtt-cmd-badge");
    if (bge) bge.innerHTML = `<span class="status-dot"></span>WOKWI /cmd: ${stKey.toUpperCase()} (${tag} · ${sc}%)`;
    document.querySelectorAll(".sc-btn").forEach(b => b.classList.toggle("active", b.dataset.sc === cmd));

    // Envio imediato via WebSocket para o Wokwi ESP32 em qualquer mudança de estado
    window.ScadaMQTT?.publishState?.({ t, h, l, cmd, stateKey: stKey, score: sc, verdict: v, tag });

    if (userTriggered) {
      window.arcadeAudio?.ensureContext?.();
      if (stKey === "critico") window.ArcadeAudio?.playCritical?.();
      else if (soundType === "wine") window.ArcadeAudio?.playWineStyle?.(curPr);
      else if (soundType === "cava") window.ArcadeAudio?.playCavaSelect?.();
      else if (soundType === "terroir") window.ArcadeAudio?.playTerroirSelect?.();
      else if (soundType && soundType.startsWith("sc:")) window.ArcadeAudio?.playScenario?.(soundType.slice(3));
      else if (stKey === "ideal") window.ArcadeAudio?.playPowerup?.();
      else window.ArcadeAudio?.playScenario?.("padrao");
      fetch("/api/v1/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: cmd, preset: tag, health: sc, verdict: v, temperature: t, humidity: h, luminosity: l }) }).catch(() => {});
    }
  }

  function syncPresetControls(p) {
    try { localStorage.setItem("vinheria_preset", curPr); } catch (_) {}
    const sel = document.getElementById("dropdown-wine-preset"); if (sel && sel.value !== curPr) sel.value = curPr;
    document.querySelectorAll(".wine-pill-btn").forEach(b => b.classList.toggle("active", b.dataset.wine === curPr));
    ["temp-min", "temp-max", "hum-min", "hum-max", "lum-min", "lum-max"].forEach((k, i) => {
      const el = document.getElementById(`trigger-${k}`); if (el) el.value = [p.tMin, p.tMax, p.hMin, p.hMax, p.lMin, p.lMax][i];
    });
    const descEl = document.getElementById("preset-description-text"); if (descEl) descEl.textContent = p.desc || "";
  }

  function onWinePresetChange(presetKey, keepLot = false) {
    const normKey = presetKey === "brut" ? "espumante" : presetKey;
    curPr = PRESETS[normKey] ? normKey : "tinto";
    window.curPr = curPr;
    const p = PRESETS[curPr] || {};
    if (!keepLot && p.defaultLot) {
      window.curLotCode = p.defaultLot;
      const defLot = getActiveLot();
      if (defLot?.terroirId) { curArea = defLot.terroirId; window.curArea = curArea; const selT = document.getElementById("dropdown-area-terroir"); if (selT) selT.value = curArea; }
      sim.mode = "normal"; sim.t = defLot ? defLot.liveT : p.defT; sim.h = defLot ? defLot.liveH : p.defH; sim.l = defLot ? defLot.liveL : p.defL;
    }
    syncPresetControls(p); updateHardwarePlaque(sim.t, sim.h, sim.l, true, "wine");
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, p, getActiveLot(), true);
    renderRealVineyards(); renderCellarLots(); syncCloudConfig();
  }

  function onWineSearchInput(q) {
    const s = (q || "").trim().toLowerCase();
    if (!s) return;
    const lotMatch = (window.CANONICAL_LOTS || []).find(l => (l.winery + " " + l.wine + " " + l.code + " " + l.country).toLowerCase().includes(s));
    if (s.includes("pinot") || s.includes("borg") || s.includes("roman")) onWinePresetChange("pinot");
    else if (s.includes("port") || s.includes("fortif") || s.includes("taylor")) onWinePresetChange("porto");
    else if (s.includes("colheit") || s.includes("sobrem") || s.includes("sautern") || s.includes("doce")) onWinePresetChange("sobremesa");
    else if (s.includes("laranj") || s.includes("anfor") || s.includes("ânfor") || s.includes("gravner")) onWinePresetChange("laranja");
    else if (s.includes("branc") || s.includes("chard") || s.includes("sauv")) onWinePresetChange("branco");
    else if (s.includes("ros") || s.includes("prov")) onWinePresetChange("rose");
    else if (s.includes("brut") || s.includes("espum") || s.includes("champ")) onWinePresetChange("espumante");
    else if (s.includes("tint") || s.includes("caber") || s.includes("merl") || s.includes("malb")) onWinePresetChange("tinto");
    else if (lotMatch) onLotSelect(lotMatch.style, lotMatch.terroirId, lotMatch.code);
  }

  function onLotSelect(styleKey, terroirKey, lotCode) {
    if (lotCode) window.curLotCode = lotCode;
    const lot = getActiveLot();
    const normStyle = (lot?.style || styleKey) === "brut" ? "espumante" : (lot?.style || styleKey || "tinto");
    curPr = PRESETS[normStyle] ? normStyle : "tinto";
    window.curPr = curPr;
    const p = PRESETS[curPr] || {};
    if (terroirKey && TERROIRS[terroirKey]) { curArea = terroirKey; window.curArea = curArea; const selT = document.getElementById("dropdown-area-terroir"); if (selT) selT.value = curArea; }
    sim.mode = "normal"; sim.t = lot ? lot.liveT : p.defT; sim.h = lot ? lot.liveH : p.defH; sim.l = lot ? lot.liveL : p.defL;
    syncPresetControls(p); updateHardwarePlaque(sim.t, sim.h, sim.l, true, "cava");
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, p, lot, true);
    renderRealVineyards(); renderCellarLots(); syncCloudConfig();
  }

  function onAreaTerroirChange(areaKey) {
    curArea = areaKey; window.curArea = curArea;
    const tr = TERROIRS[curArea] || {}, p = PRESETS[curPr] || {};
    const sel = document.getElementById("dropdown-area-terroir"); if (sel && sel.value !== curArea) sel.value = curArea;
    const desc = document.getElementById("terroir-description-text");
    if (desc) desc.textContent = curArea === "wokwi_esp32" ? "Telemetria direta do hardware físico/simulado ESP32 Wokwi." : `Clima real de ${tr.country} (${tr.name} · ${tr.reg}) via satélite Open-Meteo.`;
    sim.mode = "normal";
    if (curArea !== "wokwi_esp32" && tr.t !== undefined) { sim.t = tr.t; sim.h = tr.h; sim.l = tr.l; }
    else { const vals = getScenarioValues("normal", curPr); sim.t = vals[0]; sim.h = vals[1]; sim.l = vals[2]; }
    const matchLot = (window.CANONICAL_LOTS || []).find(l => l.terroirId === curArea && l.style === curPr) || (window.CANONICAL_LOTS || []).find(l => l.terroirId === curArea);
    if (matchLot) window.curLotCode = matchLot.code;
    updateHardwarePlaque(sim.t, sim.h, sim.l, true, "terroir");
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, p, getActiveLot(), true);
    renderRealVineyards(); renderCellarLots(); syncCloudConfig();
  }

  function onThresholdInputChange() {
    const p = PRESETS[curPr] || {};
    const getVal = (id, def) => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? def : v; };
    p.tMin = getVal("trigger-temp-min", p.tMin); p.tMax = getVal("trigger-temp-max", p.tMax);
    p.hMin = getVal("trigger-hum-min", p.hMin); p.hMax = getVal("trigger-hum-max", p.hMax);
    p.lMin = getVal("trigger-lum-min", p.lMin); p.lMax = getVal("trigger-lum-max", p.lMax);
    updateHardwarePlaque(sim.t, sim.h, sim.l, true, "auto");
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, p, getActiveLot(), false);
    renderCellarLots(); renderRealVineyards(); syncCloudConfig();
  }

  function applyScenario(sc) {
    sim.mode = sc; const d = getScenarioValues(sc, curPr); sim.t = d[0]; sim.h = d[1]; sim.l = d[2];
    updateHardwarePlaque(sim.t, sim.h, sim.l, true, "sc:" + sc);
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, PRESETS[curPr], getActiveLot(), true);
    renderCellarLots(); renderRealVineyards();
  }

  function renderRealVineyards() { window.renderRealVineyards?.(curArea, onAreaTerroirChange); }
  function renderCellarLots() { window.renderCellarLots?.(curPr, sim.t, sim.h, sim.l, onLotSelect, window.curLotCode); }
  function syncCloudConfig() {
    const tr = TERROIRS[curArea] || {};
    fetch("/api/v1/cloud/firebase/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device_id: "vine001", preset_key: curPr, lot_code: window.curLotCode, terroir: { id: curArea, name: tr.name, country: tr.country } }) }).catch(() => {});
  }

  function fetchLiveTicker() {
    sim.t = +(sim.t + (Math.random() - 0.5) * 0.06).toFixed(1);
    sim.h = Math.max(20, Math.min(99, +(sim.h + (Math.random() - 0.5) * 0.25).toFixed(0)));
    updateHardwarePlaque(sim.t, sim.h, sim.l, false);
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, PRESETS[curPr], getActiveLot(), false);
    renderCellarLots(); renderRealVineyards();
  }

  function bootScada() {
    renderCellarLots(); renderRealVineyards();
    updateHardwarePlaque(sim.t, sim.h, sim.l, false);
    window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, PRESETS[curPr], getActiveLot(), true);
    window.ScadaMQTT?.init?.((d) => {
      if (curArea !== "wokwi_esp32") return;
      if (d.t !== undefined) sim.t = d.t; if (d.h !== undefined) sim.h = d.h; if (d.l !== undefined) sim.l = d.l;
      updateHardwarePlaque(sim.t, sim.h, sim.l, false);
      window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, PRESETS[curPr], getActiveLot(), false);
    });
    window.startSatelliteLiveLoop?.(() => curArea, onAreaTerroirChange);
    document.getElementById("input-wine-search")?.addEventListener("input", e => onWineSearchInput(e.target.value));
    document.getElementById("dropdown-wine-preset")?.addEventListener("change", e => onWinePresetChange(e.target.value));
    document.getElementById("dropdown-area-terroir")?.addEventListener("change", e => onAreaTerroirChange(e.target.value));
    ["temp-min", "temp-max", "hum-min", "hum-max", "lum-min", "lum-max"].forEach(k => document.getElementById(`trigger-${k}`)?.addEventListener("input", onThresholdInputChange));
    document.querySelectorAll(".wine-pill-btn").forEach(b => b.addEventListener("click", () => onWinePresetChange(b.dataset.wine)));
    document.querySelectorAll(".sc-btn").forEach(b => b.addEventListener("click", () => applyScenario(b.dataset.sc)));
    document.getElementById("led-state-ideal")?.addEventListener("click", () => applyScenario("normal"));
    document.getElementById("led-state-padrao")?.addEventListener("click", () => applyScenario("padrao"));
    document.getElementById("led-state-critico")?.addEventListener("click", () => applyScenario("multi"));
    window.addEventListener("themeChanged", () => window.ScadaCharts?.renderAllCharts?.(sim.t, sim.h, sim.l, PRESETS[curPr], getActiveLot(), false));
    setInterval(fetchLiveTicker, 1800);
  }

  window.onLotSelect = onLotSelect; window.onWinePresetChange = onWinePresetChange; window.onAreaTerroirChange = onAreaTerroirChange;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootScada); else bootScada();
})();
