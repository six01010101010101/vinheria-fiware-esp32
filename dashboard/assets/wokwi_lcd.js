// CP5 Vinheria Agnello — Wokwi ESP32 LCD 16x2 (HD44780 I2C 0x27) & Painel LED de Estados
(function (root) {
  function calcHealthScore(t, h, l, pr) {
    const p = pr || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    let pen = 0;
    if (t < p.tMin) pen += (p.tMin - t) * 8.5;
    else if (t > p.tMax) pen += (t - p.tMax) * 8.5;
    if (h < p.hMin) pen += (p.hMin - h) * 1.8;
    else if (h > p.hMax) pen += (h - p.hMax) * 1.8;
    if (l > p.lMax) pen += (l - p.lMax) * 1.4;
    if (pen > 0) return Math.max(15, Math.min(92, Math.round(100 - pen)));
    const tMid = (p.tMin + p.tMax) / 2, hMid = (p.hMin + p.hMax) / 2;
    const edge = (Math.abs(t - tMid) / Math.max(1, (p.tMax - p.tMin) / 2)) * 4 +
                 (Math.abs(h - hMid) / Math.max(1, (p.hMax - p.hMin) / 2)) * 3;
    return Math.max(91, Math.min(100, Math.round(100 - edge)));
  }

  function evalStatus(t, h, l, pr, isWokwi) {
    const p = pr || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    const tErr = t < p.tMin || t > p.tMax, hErr = h < p.hMin || h > p.hMax, lErr = l > p.lMax;
    const errCount = (tErr ? 1 : 0) + (hErr ? 1 : 0) + (lErr ? 1 : 0);
    const score = calcHealthScore(t, h, l, p);
    const ok = errCount === 0;
    let lbl = "EQUILÍBRIO IDEAL", detail = "1UP: 100%", stateKey = "ideal";
    if (!ok) {
      if (errCount >= 2 || score < 75) {
        lbl = "ESTADO CRÍTICO"; detail = `${t.toFixed(1)}°C ${h.toFixed(0)}%`; stateKey = "critico";
      } else if (tErr) {
        lbl = "ALERTA TÉRMICO"; detail = `${t.toFixed(1)}°C`; stateKey = "padrao";
      } else if (hErr) {
        lbl = "ALERTA HIGRO"; detail = `${h.toFixed(0)}%`; stateKey = "padrao";
      } else {
        lbl = "ALERTA PENUMBRA"; detail = `${l.toFixed(0)}%`; stateKey = "padrao";
      }
    } else if (score < 95) {
      lbl = "ESTADO PADRÃO"; detail = `ESTÁVEL ${score}%`; stateKey = "padrao";
    }
    return { ok, lbl, detail, stateKey, score, tErr, hErr, lErr };
  }

  function formatLcd16(str) {
    const chars = Array.from(str || "");
    while (chars.length < 18) chars.push(" ");
    return chars.slice(0, 19).join("");
  }

  function renderWokwiTwin(opts) {
    const { t = 15.2, h = 71, l = 9, preset = {}, terroir = {}, lot = null, isWokwi = true, mode = "normal" } = opts || {};
    const st = evalStatus(t, h, l, preset, isWokwi);
    const score = st.score;
    const stateKey = mode === "multi" ? "critico" : (mode !== "normal" && st.stateKey === "ideal" ? "padrao" : st.stateKey);
    const isCrit = stateKey === "critico";
    const isIdeal = stateKey === "ideal";

    const prTag = (function () {
      const nm = ((preset.key || "") + " " + (preset.name || "") + " " + (preset.wine || "")).toLowerCase();
      if (nm.includes("brut") || nm.includes("espumante") || nm.includes("champ")) return "BRUT";
      if (nm.includes("rose") || nm.includes("rosé")) return "ROSE";
      if (nm.includes("branco")) return "BRANCO";
      return "TINTO";
    })();

    const statTag = isIdeal ? "1UP" : (isCrit ? "CRT" : "PAD");
    const l1Text = `🪙 ${t.toFixed(1)}°C 💧${h.toFixed(0)}%${!isWokwi ? " *" : ""}`;
    const l2Text = `⭐ ${l.toFixed(0)}% ${prTag} ${statTag}:${score}%`;

    const elL1 = document.getElementById("wokwi-lcd-l1"), elL2 = document.getElementById("wokwi-lcd-l2");
    if (elL1) elL1.textContent = formatLcd16(l1Text);
    if (elL2) elL2.textContent = formatLcd16(l2Text);

    const t1 = document.getElementById("barrel-mini-t1"), t2 = document.getElementById("barrel-mini-t2");
    if (t1) t1.textContent = `T:${t.toFixed(1)}°C U:${h.toFixed(0)}%`;
    if (t2) t2.textContent = `${prTag} ${statTag}:${score}%`;

    const wineTitle = lot ? `${lot.winery} — ${lot.wine} (${lot.vintage})` : (preset.wine || preset.name || "Château Margaux 2015");
    const terroirTitle = `${terroir.flag || "📟"} ${terroir.name || "ESP32 Wokwi"} (${terroir.country || "Cava"})`;

    const crtTerroir = document.getElementById("crt-terroir-val");
    if (crtTerroir) crtTerroir.textContent = terroirTitle;
    const crtWine = document.getElementById("crt-wine-val");
    if (crtWine) crtWine.textContent = `${preset.badge ? preset.badge.split(" ")[0] : "🍷"} ${wineTitle}`;

    const crtStatus = document.getElementById("crt-status-val");
    if (crtStatus) {
      crtStatus.textContent = isIdeal ? `🟢 EQUILÍBRIO IDEAL` : (isCrit ? `🔴 ESTADO CRÍTICO (${st.detail})` : `🔵 ${st.lbl} (${st.detail})`);
      crtStatus.className = isIdeal ? "text-success fw-bold" : (isCrit ? "text-danger fw-bold" : "text-warning fw-bold");
    }

    const crtTag = document.getElementById("crt-status-tag") || document.getElementById("crt-status-pill");
    if (crtTag) {
      crtTag.textContent = isIdeal ? "STATUS: EQUILÍBRIO IDEAL" : (isCrit ? "STATUS: ESTADO CRÍTICO" : "STATUS: ESTADO PADRÃO");
      crtTag.style.color = isIdeal ? "#4ade80" : (isCrit ? "#f87171" : "#38bdf8");
    }

    const crtApogee = document.getElementById("crt-apogee-val");
    if (crtApogee) {
      crtApogee.textContent = `${score}% [${isIdeal ? "EQUILÍBRIO IDEAL" : (isCrit ? "ESTADO CRÍTICO" : "ESTADO PADRÃO")}]`;
      crtApogee.className = isIdeal ? "text-success fw-bold" : (isCrit ? "text-danger fw-bold" : "text-info fw-bold");
    }

    // Painel de Luzes LED: Equilíbrio Ideal | Estado Padrão | Estado Crítico
    const stIdealEl = document.getElementById("led-state-ideal");
    const stPadraoEl = document.getElementById("led-state-padrao");
    const stCritEl = document.getElementById("led-state-critico");
    if (stIdealEl) stIdealEl.className = `led-state-pill ${isIdeal ? "active-ideal" : ""}`;
    if (stPadraoEl) stPadraoEl.className = `led-state-pill ${stateKey === "padrao" ? "active-padrao" : ""}`;
    if (stCritEl) stCritEl.className = `led-state-pill ${isCrit ? "active-critico" : ""}`;

    const ledG = document.getElementById("led-green"), ledR = document.getElementById("led-red"), ledB = document.getElementById("led-blue");
    const lblG = document.getElementById("led-green-lbl"), lblR = document.getElementById("led-red-lbl"), lblB = document.getElementById("led-blue-lbl");
    if (ledG) ledG.className = isIdeal ? "led-indicator led-green-on" : "led-indicator led-green-off";
    if (lblG) lblG.textContent = isIdeal ? "D5: IDEAL" : "D5: OFF";
    if (ledB) ledB.className = stateKey === "padrao" ? "led-indicator led-blue-blinking" : (isCrit ? "led-indicator led-blue-blinking" : "led-indicator led-blue-off");
    if (lblB) lblB.textContent = stateKey === "padrao" ? "D2: PADRÃO" : (isCrit ? "D2: PULSO" : "D2: OFF");
    if (ledR) ledR.className = isCrit ? "led-indicator led-red-on led-red-blinking" : (!st.ok ? "led-indicator led-red-on" : "led-indicator led-red-off");
    if (lblR) lblR.textContent = isCrit ? "D18: CRÍTICO!" : (!st.ok ? "D18: ALERTA" : "D18: OFF");

    const bzIcon = document.getElementById("buzzer-status-icon"), bzTxt = document.getElementById("buzzer-status-text");
    if (bzIcon) bzIcon.textContent = st.ok ? "🔇" : (isCrit ? "🚨" : "🔊");
    if (bzTxt) bzTxt.textContent = st.ok ? "D4 Mudo" : (isCrit ? "D4 CRÍTICO!" : "D4 Alerta");

    return { score, st, stateKey, l1Text, l2Text, prTag, wineTitle, terroirTitle };
  }

  root.WokwiLCD = { calcHealthScore, evalStatus, formatLcd16, renderWokwiTwin };
})(typeof window !== "undefined" ? window : globalThis);
