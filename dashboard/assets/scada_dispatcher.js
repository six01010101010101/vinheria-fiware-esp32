/**
 * SCADA Dispatcher & Hardware Bridge — Vinheria Agnello & Wokwi Twin
 * Responsável pelo despacho MQTT, sincronização de placa Wokwi, telemetria Supabase e áudio.
 */
(function (root) {
  function getScenarioValues(sc, presetKey, PRESETS) {
    const p = (PRESETS && PRESETS[presetKey]) || { defT: 15.8, defH: 68, defL: 9, tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    if (sc === "padrao") return [+(p.tMax + 2.2).toFixed(1), Math.max(30, +(p.hMin - 3).toFixed(0)), p.defL];
    if (sc === "critico" || sc === "multi") return [+(p.tMax + 5.6).toFixed(1), Math.max(22, +(p.hMin - 18).toFixed(0)), Math.min(98, +(p.lMax + 32).toFixed(0))];
    return [p.defT, p.defH, p.defL];
  }

  function syncCloudConfig(curPr, curArea, curLotCode, TERROIRS) {
    const tr = (TERROIRS && TERROIRS[curArea]) || {};
    window.SupabaseCloud?.syncLotsAndAreas?.(curPr, false);
    fetch("/api/v1/cloud/firebase/sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: "vine001", preset_key: curPr, lot_code: curLotCode, terroir: { id: curArea, name: tr.name, country: tr.country } })
    }).catch(() => {});
  }

  function dispatchHardwarePlaque(opts) {
    const { t, h, l, curPr, curArea, simMode, userTriggered, soundType, PRESETS, TERROIRS, lot, score: explicitScore, stateKey: explicitStateKey } = opts;
    const pr = (PRESETS && PRESETS[curPr]) || { key: "tinto", name: "Vinho Tinto", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    const tr = (TERROIRS && TERROIRS[curArea]) || { name: "ESP32 Wokwi", flag: "📟", country: "Wokwi" };
    if (!window.WokwiLCD) return { score: 99, stateKey: "ideal" };

    const res = window.WokwiLCD.renderWokwiTwin({
      t, h, l, preset: pr, terroir: tr, lot, isWokwi: curArea === "wokwi_esp32", mode: simMode,
      score: explicitScore, stateKey: explicitStateKey
    });
    window.ScadaUIController?.updateWineProfileBanner(pr, lot, res);

    const stKey = res?.stateKey || explicitStateKey || "ideal";
    const cmd = stKey === "critico" ? "multi" : (stKey === "padrao" ? "padrao" : "normal");
    const tag = res?.prTag || "TINTO", sc = res?.score ?? explicitScore ?? 99, v = stKey === "critico" ? "CRT" : (stKey === "padrao" ? "PAD" : "OK");

    window.ScadaUIController?.renderCommandBadge(stKey, "WOKWI /cmd", ` (${tag} · ${sc}%)`);
    document.querySelectorAll(".sc-btn").forEach(b => b.classList.toggle("active", b.dataset.sc === cmd));

    const activeLot = lot || (window.CANONICAL_LOTS || []).find(l => l.code === window.curLotCode);
    const lotCode = activeLot?.code || window.curLotCode || "LOTE-FR-MARGAUX-01";
    let wineShort = "TINTO", regShort = "BORDEAUX";
    if (activeLot) {
      const c = activeLot.code || "";
      if (c.includes("MIOLO-01")) { wineShort = "MIOLO 43"; regShort = "V.VINHEDOS"; }
      else if (c.includes("MIOLO-02")) { wineShort = "MIOLO CH"; regShort = "V.VINHEDOS"; }
      else if (c.includes("MIOLO-03")) { wineShort = "MIOLO RS"; regShort = "CAMPANHA"; }
      else if (c.includes("MIOLO-04")) { wineShort = "MIOLO BR"; regShort = "V.VINHEDOS"; }
      else if (c.includes("MARGAUX-01")) { wineShort = "MARGAUX"; regShort = "BORDEAUX"; }
      else if (c.includes("BLANC-01")) { wineShort = "PAV.BLNC"; regShort = "BORDEAUX"; }
      else if (c.includes("CATENA")) { wineShort = "CATENA"; regShort = "MENDOZA"; }
      else if (c.includes("ANTINORI-01")) { wineShort = "TIGNANEL"; regShort = "TOSCANA"; }
      else if (c.includes("ANTINORI-02")) { wineShort = "CERVARO"; regShort = "TOSCANA"; }
      else if (c.includes("VEGA")) { wineShort = "VEGA SIC"; regShort = "R.DUERO"; }
      else if (c.includes("CONCHA")) { wineShort = "DON MELC"; regShort = "V.MAIPO"; }
      else if (c.includes("BAROSSA")) { wineShort = "PENFOLDS"; regShort = "BAROSSA"; }
      else if (c.includes("KANONKOP")) { wineShort = "KANONKOP"; regShort = "STELLENB"; }
      else if (c.includes("PRUM")) { wineShort = "PRUM RSL"; regShort = "MOSEL"; }
      else if (c.includes("CLOUDY")) { wineShort = "CLOUDY B"; regShort = "MARLBORO"; }
      else if (c.includes("ROSE-01") || c.includes("DOMAINE")) { wineShort = "DOM. OTT"; regShort = "PROVENCE"; }
      else if (c.includes("ABRAU")) { wineShort = "ABRAU BR"; regShort = "MAR NEGRO"; }
      else if (c.includes("ROMANEE")) { wineShort = "DRC BORG"; regShort = "BORGONHA"; }
      else if (c.includes("TAYLOR") || c.includes("CRASTO")) { wineShort = "TAYLORS"; regShort = "DOURO"; }
      else if (c.includes("YQUEM")) { wineShort = "CH.YQUEM"; regShort = "SAUTERNES"; }
      else if (c.includes("GRAVNER") || c.includes("QVEVRI")) { wineShort = "GRAVNER"; regShort = "FRIULI"; }
      else {
        wineShort = (activeLot.winery.replace("Vinícola ", "").replace("Château ", "").split(" ")[0] || tag).slice(0, 8);
        regShort = (activeLot.region ? activeLot.region.split("(")[0].split(",")[0].trim() : "ADEGA").slice(0, 10);
      }
    } else {
      wineShort = tag; regShort = (tr?.name ? tr.name.split(" ")[0] : "ADEGA").slice(0, 10);
    }
    const trName = regShort;

    window.ScadaMQTT?.publishState?.({
      t, h, l, cmd, stateKey: stKey, score: sc, verdict: v, tag, lotCode, terroirName: trName,
      wineName: wineShort, regionName: regShort
    });

    window.SupabaseCloud?.syncTelemetry?.({
      t, h, l, cmd, score: sc, source: `${tr.name || "Adega"} · ${pr.name || "Vinho"}`, force: userTriggered
    });

    if (userTriggered) {
      window.arcadeAudio?.ensureContext?.();
      if (stKey === "critico") window.ArcadeAudio?.playWineSelect?.("critico", curPr);
      else if (soundType === "wine") window.ArcadeAudio?.playWineSelect?.(stKey, curPr);
      else if (soundType === "cava") window.ArcadeAudio?.playCavaSelect?.();
      else if (soundType === "terroir") window.ArcadeAudio?.playTerroirSelect?.();
      else if (soundType && soundType.startsWith("sc:")) window.ArcadeAudio?.playScenario?.(soundType.slice(3));
      else window.ArcadeAudio?.playWineSelect?.(stKey, curPr);
      fetch("/api/v1/command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, preset: tag, preset_key: curPr, health: sc, verdict: v, temperature: t, humidity: h, luminosity: l })
      }).catch(() => {});
    }

    return res;
  }

  root.ScadaDispatcher = {
    getScenarioValues,
    syncCloudConfig,
    dispatchHardwarePlaque
  };
})(typeof window !== "undefined" ? window : globalThis);
