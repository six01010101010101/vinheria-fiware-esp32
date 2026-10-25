// CP5 Vinheria Agnello — Wokwi ESP32 LCD 16x2 (HD44780 I2C 0x27) & Painel LED de 3 Estados (Ideal | Padrão | Crítico)
(function (root) {
  function calcHealthScore(t, h, l, pr) {
    const p = pr || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    let pen = 0;
    if (t < p.tMin) pen += (p.tMin - t) * 7.5;
    else if (t > p.tMax) pen += (t - p.tMax) * 7.5;
    if (h < p.hMin) pen += (p.hMin - h) * 1.6;
    else if (h > p.hMax) pen += (h - p.hMax) * 1.6;
    if (l > p.lMax) pen += (l - p.lMax) * 1.3;
    if (pen > 0) return Math.max(15, Math.min(94, Math.round(100 - pen)));
    const tMid = (p.tMin + p.tMax) / 2, hMid = (p.hMin + p.hMax) / 2;
    const edge = (Math.abs(t - tMid) / Math.max(1, (p.tMax - p.tMin) / 2)) * 2.5 +
                 (Math.abs(h - hMid) / Math.max(1, (p.hMax - p.hMin) / 2)) * 1.8;
    return Math.max(95, Math.min(100, Math.round(100 - edge)));
  }

  function evalStatus(t, h, l, pr, isWokwi) {
    const p = pr || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    const tErr = t < p.tMin || t > p.tMax, hErr = h < p.hMin || h > p.hMax, lErr = l > p.lMax;
    const score = calcHealthScore(t, h, l, p);
    let lbl = "EQUILÍBRIO IDEAL", detail = `IDEAL ${score}%`, stateKey = "ideal", ok = true;
    if (score < 75) {
      lbl = "ESTADO CRÍTICO"; detail = `CRÍTICO ${score}% · APITO!`; stateKey = "critico"; ok = false;
    } else if (score < 95) {
      lbl = "ESTADO PADRÃO"; detail = `FAIXA 75–94% (${score}%)`; stateKey = "padrao"; ok = true;
    }
    return { ok, lbl, detail, stateKey, score, tErr, hErr, lErr };
  }

  function formatLcd16(str) {
    const chars = Array.from(str || "");
    while (chars.length < 18) chars.push(" ");
    return chars.slice(0, 19).join("");
  }

  function renderWokwiTwin(opts) {
    const { t = 15.8, h = 68, l = 9, preset = {}, terroir = {}, lot = null, isWokwi = true, mode = "normal" } = opts || {};
    const st = evalStatus(t, h, l, preset, isWokwi);
    let score = st.score;
    let stateKey = st.stateKey;
    if (mode === "multi" || mode === "critico") {
      stateKey = "critico"; score = Math.min(score, 62);
    } else if (mode === "padrao") {
      stateKey = "padrao"; if (score >= 95 || score < 75) score = 78;
    } else if (mode === "normal" && score >= 95) {
      stateKey = "ideal";
    }
    const isCrit = stateKey === "critico";
    const isIdeal = stateKey === "ideal";
    const isPadrao = stateKey === "padrao";

    const prTag = (function () {
      const nm = ((preset.key || "") + " " + (preset.name || "")).toLowerCase();
      if (nm.includes("pinot")) return "PINOT";
      if (nm.includes("porto")) return "PORTO";
      if (nm.includes("sobremesa") || nm.includes("colheita")) return "DOCE";
      if (nm.includes("laranja")) return "LARAN";
      if (nm.includes("brut") || nm.includes("espumante")) return "BRUT";
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
      crtStatus.textContent = isIdeal ? `🟢 IDEAL (95–100%: ${score}%)` : (isCrit ? `🔴 CRÍTICO (<75%: ${score}% · APITO)` : `🔵 PADRÃO (Faixa 75%: ${score}%)`);
      crtStatus.className = isIdeal ? "text-success fw-bold" : (isCrit ? "text-danger fw-bold" : "text-info fw-bold");
    }

    const crtTag = document.getElementById("crt-status-tag") || document.getElementById("crt-status-pill");
    if (crtTag) {
      crtTag.textContent = isIdeal ? "STATUS: 🟢 IDEAL (95–100%)" : (isCrit ? "STATUS: 🔴 CRÍTICO (APITO)" : "STATUS: 🔵 PADRÃO (~75%)");
      crtTag.style.color = isIdeal ? "#4ade80" : (isCrit ? "#f87171" : "#38bdf8");
    }

    const crtApogee = document.getElementById("crt-apogee-val");
    if (crtApogee) {
      crtApogee.textContent = `${score}% [${isIdeal ? "IDEAL 95–100%" : (isCrit ? "CRÍTICO <75%" : "PADRÃO 75–94%")}]`;
      crtApogee.className = isIdeal ? "text-success fw-bold" : (isCrit ? "text-danger fw-bold" : "text-info fw-bold");
    }

    // Painel de Luzes LED: APENAS 3 ESTADOS (🟢 IDEAL | 🔵 PADRÃO | 🔴 CRÍTICO)
    const stIdealEl = document.getElementById("led-state-ideal");
    const stPadraoEl = document.getElementById("led-state-padrao");
    const stCritEl = document.getElementById("led-state-critico");
    if (stIdealEl) stIdealEl.className = `led-state-pill ${isIdeal ? "active-ideal" : ""}`;
    if (stPadraoEl) stPadraoEl.className = `led-state-pill ${isPadrao ? "active-padrao" : ""}`;
    if (stCritEl) stCritEl.className = `led-state-pill ${isCrit ? "active-critico" : ""}`;

    const ledG = document.getElementById("led-green"), ledR = document.getElementById("led-red"), ledB = document.getElementById("led-blue");
    const lblG = document.getElementById("led-green-lbl"), lblR = document.getElementById("led-red-lbl"), lblB = document.getElementById("led-blue-lbl");
    if (ledG) ledG.className = isIdeal ? "led-indicator led-green-on" : "led-indicator led-green-off";
    if (lblG) lblG.textContent = isIdeal ? "D5: IDEAL" : "D5: OFF";
    if (ledB) ledB.className = isPadrao ? "led-indicator led-blue-blinking" : "led-indicator led-blue-off";
    if (lblB) lblB.textContent = isPadrao ? "D2: PADRÃO" : "D2: OFF";
    if (ledR) ledR.className = isCrit ? "led-indicator led-red-on led-red-blinking" : "led-indicator led-red-off";
    if (lblR) lblR.textContent = isCrit ? "D18: CRÍTICO!" : "D18: OFF";

    // Buzzer (D4): Apenas o CRÍTICO (Vermelho) solta o apito!
    const bzIcon = document.getElementById("buzzer-status-icon"), bzTxt = document.getElementById("buzzer-status-text");
    if (bzIcon) bzIcon.textContent = isCrit ? "🚨" : "🔇";
    if (bzTxt) bzTxt.textContent = isCrit ? "D4 APITANDO!" : "D4 Mudo";

    return { score, st: { ...st, ok: !isCrit }, stateKey, l1Text, l2Text, prTag, wineTitle, terroirTitle };
  }

  root.WokwiLCD = { calcHealthScore, evalStatus, formatLcd16, renderWokwiTwin };
})(typeof window !== "undefined" ? window : globalThis);
