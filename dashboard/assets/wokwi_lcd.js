// CP5 Vinheria Agnello — Wokwi ESP32 LCD 16x2 (HD44780 I2C 0x27) Hardware Twin Module
(function (root) {
  function calcHealthScore(t, h, l, pr) {
    const p = pr || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    let sc = 100 - (t < p.tMin || t > p.tMax ? Math.min(45, Math.abs(t - (p.tMin + p.tMax) / 2) * 8) : 0);
    sc -= (h < p.hMin || h > p.hMax ? Math.min(35, Math.abs(h - (p.hMin + p.hMax) / 2) * 2) : 0);
    sc -= (l > p.lMax ? Math.min(30, (l - p.lMax) * 2) : 0);
    return Math.max(15, Math.min(100, Math.round(sc)));
  }

  function evalStatus(t, h, l, pr, isWokwi) {
    const p = pr || { tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    const ok = t >= p.tMin && t <= p.tMax && h >= p.hMin && h <= p.hMax && l <= p.lMax;
    let lbl = isWokwi ? "CAVA PRESERVADA" : "TERROIR ADEQUADO", detail = "1UP: 100%";
    if (!ok) {
      if (t < p.tMin || t > p.tMax) { lbl = "ALERTA TÉRMICO"; detail = `${t.toFixed(1)}°C`; }
      else if (h < p.hMin || h > p.hMax) { lbl = "ALERTA HIGRO"; detail = `${h.toFixed(0)}%`; }
      else { lbl = "ALERTA LUZ/LDR"; detail = `${l.toFixed(0)}%`; }
    }
    return { ok, lbl, detail };
  }

  function formatLcd16(str) {
    return (str || "").padEnd(16, " ").substring(0, 16);
  }

  function renderWokwiTwin(opts) {
    const { t = 15.5, h = 68, l = 12, preset = {}, terroir = {}, isWokwi = true, mode = "normal" } = opts || {};
    const score = calcHealthScore(t, h, l, preset);
    const st = evalStatus(t, h, l, preset, isWokwi);
    const prTag = preset.name ? preset.name.substring(6, 11).toUpperCase().trim() : "TINTO";

    const l1Text = `🪙 ${t.toFixed(1)}°C 💧${h.toFixed(0)}%${!isWokwi ? " *" : ""}`;
    const statPart = mode === "normal" ? `${prTag} 1UP:${score}%` : `ALR:${mode.substring(0, 3).toUpperCase()} HP:${score}%`;
    const l2Text = `⭐ ${l.toFixed(0)}% ${statPart}`;

    const elL1 = document.getElementById("wokwi-lcd-l1"), elL2 = document.getElementById("wokwi-lcd-l2");
    if (elL1) elL1.textContent = formatLcd16(l1Text);
    if (elL2) elL2.textContent = formatLcd16(l2Text);

    const t1 = document.getElementById("barrel-mini-t1"), t2 = document.getElementById("barrel-mini-t2");
    if (t1) t1.textContent = `T:${t.toFixed(1)}°C U:${h.toFixed(0)}%`;
    if (t2) t2.textContent = `${prTag} ${st.ok ? "1UP" : "ALR"}:${score}%`;

    const crtTerroir = document.getElementById("crt-terroir-val");
    if (crtTerroir) crtTerroir.textContent = `${terroir.flag || "📟"} ${terroir.name || "ESP32 Wokwi"}`;

    const crtWine = document.getElementById("crt-wine-val");
    if (crtWine) crtWine.textContent = preset.wine || "Vinho Tinto Grand Cru";

    const crtStatus = document.getElementById("crt-status-val");
    if (crtStatus) {
      crtStatus.textContent = st.ok ? `🟢 ${st.lbl}` : `🔴 ${st.lbl} (${st.detail})`;
      crtStatus.className = st.ok ? "text-success fw-bold" : "text-danger fw-bold";
    }

    const crtTag = document.getElementById("crt-status-tag") || document.getElementById("crt-status-pill");
    if (crtTag) {
      crtTag.textContent = st.ok ? "STATUS: PRESERVADO" : "STATUS: ALERTA";
      crtTag.style.color = st.ok ? "#4ade80" : "#f87171";
    }

    const crtApogee = document.getElementById("crt-apogee-val");
    if (crtApogee) {
      crtApogee.textContent = `${score}% [${st.ok ? "PRESERVADO" : "ANOMALIA"}]`;
      crtApogee.className = st.ok ? "text-success fw-bold" : "text-danger fw-bold";
    }

    const crt = document.getElementById("green-crt-text");
    if (crt) {
      crt.textContent = `+--------------------------------+\n| TERROIR: ${(terroir.name || "ESP32 Wokwi").padEnd(20, " ").substring(0, 20)}|\n| VINHO: ${(preset.wine || "Vinho Tinto").padEnd(23, " ").substring(0, 23)}|\n| T: ${t.toFixed(1).padStart(4, " ")}°C  U: ${h.toFixed(0).padStart(2, " ")}%  L: ${l.toFixed(0).padStart(2, " ")}%       |\n| STATUS: ${st.lbl.padEnd(23, " ")}|\n| APOGEU: ${score}% [${st.ok ? "PRESERVADO" : "ANOMALIA"}]       |\n+--------------------------------+`;
    }

    const ledG = document.getElementById("led-green"), ledR = document.getElementById("led-red"), ledB = document.getElementById("led-blue");
    if (ledG) ledG.className = st.ok ? "led-indicator led-green-on" : "led-indicator led-green-off";
    if (ledR) ledR.className = st.ok ? "led-indicator led-red-off" : "led-indicator led-red-on";
    if (ledB) ledB.className = !isWokwi ? "led-indicator led-blue-blinking" : "led-indicator led-blue-off";

    return { score, st, l1Text, l2Text };
  }

  root.WokwiLCD = { calcHealthScore, evalStatus, formatLcd16, renderWokwiTwin };
})(typeof window !== "undefined" ? window : globalThis);
