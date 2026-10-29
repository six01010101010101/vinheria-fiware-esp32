// CP5 Vinheria Agnello — Wokwi ESP32 LCD 16x2 (HD44780 I2C 0x27) & Painel LED de 3 Estados (Ideal | Padrão | Crítico)
(function (root) {
  function calcHealthScore(t, h, l, pr) {
    const p = pr || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    const tMid = (p.tMin + p.tMax) / 2, tHalf = Math.max(1, (p.tMax - p.tMin) / 2);
    const hMid = (p.hMin + p.hMax) / 2, hHalf = Math.max(1, (p.hMax - p.hMin) / 2);
    let pen = 0;
    if (t < p.tMin) pen += (p.tMin - t) * 8.5;
    else if (t > p.tMax) pen += (t - p.tMax) * 8.5;
    if (h < p.hMin) pen += (p.hMin - h) * 1.5;
    else if (h > p.hMax) pen += (h - p.hMax) * 1.5;
    if (l > p.lMax) pen += (l - p.lMax) * 1.0;
    const tEdge = Math.abs(t - tMid) / tHalf, hEdge = Math.abs(h - hMid) / hHalf;
    const edgePen = Math.max(0, (tEdge - 0.5) * 10.0) + Math.max(0, (hEdge - 0.6) * 5.0);
    return Math.max(9, Math.min(100, Math.round(100 - pen - edgePen)));
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
    let score = opts.score !== undefined ? opts.score : st.score;
    let stateKey = opts.stateKey || (score < 75 ? "critico" : (score < 95 ? "padrao" : "ideal"));
    const isCrit = stateKey === "critico" || score < 75;
    const isIdeal = stateKey === "ideal" || score >= 95;
    const isPadrao = !isCrit && !isIdeal;
    stateKey = isCrit ? "critico" : (isIdeal ? "ideal" : "padrao");

    const prTag = (function () {
      const nm = ((preset.key || "") + " " + (preset.name || "")).toLowerCase();
      if (nm.includes("pinot")) return "PINOT";
      if (nm.includes("porto")) return "PORTO";
      if (nm.includes("sobremesa") || nm.includes("colheita")) return "DOCE";
      if (nm.includes("laranja")) return "LARAN";
      if (nm.includes("brut") || nm.includes("espumante")) return "BRUT";
      if (nm.includes("rose") || nm.includes("rosé")) return "ROSE";
      if (nm.includes("branco")) return "BRANC";
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
      crtStatus.textContent = isIdeal ? `🟢 IDEAL (95–100%: ${score}%)` : (isCrit ? `🔴 CRÍTICO (<75%: ${score}% · APITO)` : `🟡 PADRÃO (Faixa 75–94%: ${score}%)`);
      crtStatus.className = isIdeal ? "text-success fw-bold" : (isCrit ? "text-danger fw-bold" : "text-warning fw-bold");
    }

    const crtTag = document.getElementById("crt-status-tag") || document.getElementById("crt-status-pill");
    if (crtTag) {
      crtTag.textContent = isIdeal ? "STATUS: 🟢 IDEAL (95–100%)" : (isCrit ? "STATUS: 🔴 CRÍTICO (APITO)" : "STATUS: 🟡 PADRÃO (75–94%)");
      crtTag.style.color = isIdeal ? "#4ade80" : (isCrit ? "#f87171" : "#eab308");
    }

    const crtApogee = document.getElementById("crt-apogee-val");
    if (crtApogee) {
      crtApogee.textContent = `${score}% [${isIdeal ? "IDEAL 95–100%" : (isCrit ? "CRÍTICO <75%" : "PADRÃO 75–94%")}]`;
      crtApogee.className = isIdeal ? "text-success fw-bold" : (isCrit ? "text-danger fw-bold" : "text-warning fw-bold");
    }

    [["led-state-ideal", isIdeal, "active-ideal"], ["led-state-padrao", isPadrao, "active-padrao"], ["led-state-critico", isCrit, "active-critico"]].forEach(([elId, on, activeCls]) => {
      const pill = document.getElementById(elId);
      if (!pill) return;
      pill.className = on ? `led-state-pill ${activeCls}` : "led-state-pill";
      pill.setAttribute("aria-pressed", String(on));
    });

    const ledG = document.getElementById("led-green"), ledR = document.getElementById("led-red"), ledB = document.getElementById("led-yellow") || document.getElementById("led-blue");
    const lblG = document.getElementById("led-green-lbl"), lblR = document.getElementById("led-red-lbl"), lblB = document.getElementById("led-yellow-lbl") || document.getElementById("led-blue-lbl");
    if (ledG) ledG.className = !isCrit ? "led-indicator led-green-on" : "led-indicator led-green-off";
    if (lblG) lblG.textContent = !isCrit ? "D5: OK (PADRÃO)" : "D5: OFF";
    if (ledB) ledB.className = isCrit ? "led-indicator led-yellow-on led-yellow-blinking" : "led-indicator led-yellow-off";
    if (lblB) lblB.textContent = isCrit ? "D2: BUZZER INCÊNDIO" : "D2: MUDO";
    if (ledR) ledR.className = isCrit ? "led-indicator led-red-on" : "led-indicator led-red-off";
    if (lblR) lblR.textContent = isCrit ? "D18: CRÍTICO (ACESO)" : "D18: OFF";

    const bzIcon = document.getElementById("buzzer-status-icon"), bzTxt = document.getElementById("buzzer-status-text");
    if (bzIcon) bzIcon.textContent = isCrit ? "🚨" : "🔇";
    if (bzTxt) bzTxt.textContent = isCrit ? "D2/D4 SIRENE ATIVA" : "D2/D4 Mudo";

    return { score, st: { ...st, ok: !isCrit }, stateKey, l1Text, l2Text, prTag, wineTitle, terroirTitle };
  }

  root.WokwiLCD = { calcHealthScore, evalStatus, formatLcd16, renderWokwiTwin };
})(typeof window !== "undefined" ? window : globalThis);
