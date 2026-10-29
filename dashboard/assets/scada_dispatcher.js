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

    window.ScadaMQTT?.publishState?.({ t, h, l, cmd, stateKey: stKey, score: sc, verdict: v, tag });

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
