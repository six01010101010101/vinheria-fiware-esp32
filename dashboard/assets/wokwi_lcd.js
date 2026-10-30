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
    const edgePen = Math.max(0, (tEdge - 0.5) * 10.0) + Math.max(0, (hEdge - 0.5) * 6.0);
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
    while (chars.length < 16) chars.push(" ");
    return chars.slice(0, 16).join("");
  }

  function renderWokwiTwin(opts) {
    const { t = 18.0, h = 60, l = 9, preset = {}, terroir = {}, lot = null, isWokwi = true } = opts || {};
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
    const activeLot = lot || (window.CANONICAL_LOTS || []).find(l => l.code === window.curLotCode && l.style === preset.key) || (window.CANONICAL_LOTS || []).find(l => l.code === window.curLotCode) || (window.CANONICAL_LOTS || []).find(l => l.style === preset.key);
    const lotCode = activeLot?.code || (preset.defaultLot || "LOTE-BR-MIOLO-01");
    const lotShort = lotCode.replace("LOTE-", "");
    const lotVintage = activeLot?.vintage || 2020;

    let wShort = "MIOLO 43", regShort = "V.VINHEDOS";
    if (lotCode.includes("MIOLO-01")) { wShort = "MIOLO 43"; regShort = "V.VINHEDOS"; }
    else if (lotCode.includes("MIOLO-02")) { wShort = "MIOLO CH"; regShort = "V.VINHEDOS"; }
    else if (lotCode.includes("MIOLO-03")) { wShort = "MIOLO RS"; regShort = "CAMPANHA"; }
    else if (lotCode.includes("MIOLO-04")) { wShort = "MIOLO BR"; regShort = "V.VINHEDOS"; }
    else if (lotCode.includes("MARGAUX-01")) { wShort = "MARGAUX"; regShort = "BORDEAUX"; }
    else if (lotCode.includes("BLANC-01")) { wShort = "PAV.BLNC"; regShort = "BORDEAUX"; }
    else if (lotCode.includes("CATENA")) { wShort = "CATENA"; regShort = "MENDOZA"; }
    else if (lotCode.includes("ANTINORI")) { wShort = "TIGNANEL"; regShort = "TOSCANA"; }
    else if (lotCode.includes("VEGA")) { wShort = "VEGA SIC"; regShort = "R.DUERO"; }
    else if (lotCode.includes("CONCHA")) { wShort = "DON MELC"; regShort = "V.MAIPO"; }
    else if (lotCode.includes("BAROSSA")) { wShort = "PENFOLDS"; regShort = "BAROSSA"; }
    else if (lotCode.includes("KANONKOP")) { wShort = "KANONKOP"; regShort = "STELLENB"; }
    else if (lotCode.includes("PRUM")) { wShort = "PRUM RSL"; regShort = "MOSEL"; }
    else if (lotCode.includes("CLOUDY")) { wShort = "CLOUDY B"; regShort = "MARLBORO"; }
    else if (activeLot) {
      wShort = (activeLot.winery.replace("Vinícola ", "").replace("Château ", "").split(" ")[0] || prTag).slice(0, 8).toUpperCase();
      regShort = (activeLot.region ? activeLot.region.split("(")[0].split(",")[0].trim() : "ADEGA").slice(0, 10).toUpperCase();
    }

    const trName = terroir.name || activeLot?.winery || "Vale dos Vinhedos";
    const trCountry = terroir.country || activeLot?.country || "Brasil";
    const trFlag = terroir.flag || activeLot?.flag || "🇧🇷";

    const l1Text = `${t.toFixed(1)}°C ${h.toFixed(0)}% L:${l.toFixed(0)}%`;
    const cycle = Math.floor((Date.now() / 3000)) % 3;
    let l2Text = `${wShort.padEnd(8, " ").slice(0, 8)} ${statTag}:${score}%`;
    if (cycle === 1) l2Text = `${regShort.padEnd(10, " ").slice(0, 10)} ${prTag.slice(0, 5)}`;
    else if (cycle === 2) l2Text = `LT:${lotShort}`;

    const elL1 = document.getElementById("wokwi-lcd-l1"), elL2 = document.getElementById("wokwi-lcd-l2");
    if (elL1) elL1.textContent = formatLcd16(l1Text);
    if (elL2) elL2.textContent = formatLcd16(l2Text);

    const t1 = document.getElementById("barrel-mini-t1"), t2 = document.getElementById("barrel-mini-t2"), t3 = document.getElementById("barrel-mini-t3");
    if (t1) t1.textContent = `T:${t.toFixed(1)}°C U:${h.toFixed(0)}% L:${l.toFixed(0)}%`;
    if (t2) t2.textContent = `${wShort} · ${statTag}:${score}%`;
    if (t3) t3.textContent = `LT:${lotShort} · ${regShort}`;

    const wineTitle = activeLot ? `${activeLot.winery} — ${activeLot.wine} (${activeLot.vintage})` : (preset.wine || preset.name || "Vinícola Miolo — Lote 43 Gran Reserva");
    const terroirTitle = `${trFlag} ${trName} (${trCountry})`;

    const crtTerroir = document.getElementById("crt-terroir-val");
    if (crtTerroir) crtTerroir.textContent = terroirTitle;
    const crtLot = document.getElementById("crt-lot-val");
    if (crtLot) crtLot.textContent = `${lotCode} (${lotVintage})`;
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
    if (ledG) ledG.className = isIdeal ? "led-indicator led-green-on" : "led-indicator led-green-off";
    if (lblG) lblG.textContent = isIdeal ? "D5: IDEAL (ACESO)" : "D5: OFF";
    if (ledB) ledB.className = isPadrao ? "led-indicator led-yellow-on" : (isCrit ? "led-indicator led-yellow-on led-yellow-blinking" : "led-indicator led-yellow-off");
    if (lblB) lblB.textContent = isPadrao ? "D2: PADRÃO (ACESO)" : (isCrit ? "D2: ALERTA (PISCANDO)" : "D2: OFF");
    if (ledR) ledR.className = isCrit ? "led-indicator led-red-on" : "led-indicator led-red-off";
    if (lblR) lblR.textContent = isCrit ? "D18: CRÍTICO (ACESO)" : "D18: OFF";

    const bzIcon = document.getElementById("buzzer-status-icon"), bzTxt = document.getElementById("buzzer-status-text");
    if (bzIcon) bzIcon.textContent = isCrit ? "🚨" : "🔇";
    if (bzTxt) bzTxt.textContent = isCrit ? "D2/D4 SIRENE ATIVA" : "D2/D4 Mudo";

    return { score, st: { ...st, ok: !isCrit }, stateKey, l1Text, l2Text, prTag, wineTitle, terroirTitle };
  }

  root.WokwiLCD = { calcHealthScore, evalStatus, formatLcd16, renderWokwiTwin };
})(typeof window !== "undefined" ? window : globalThis);
