/**
 * Módulo Nativo de Gráficos SCADA SVG em Tempo Real — Vinheria Agnello
 * Zero dependência de CDN externo (0ms de latência): renderiza curvas de Temperatura, Umidade e Luminosidade.
 */
(function () {
  let hTime = [], hT = [], hH = [], hL = [];
  let lastT = 15.2, lastH = 71, lastL = 9;

  function reseedSeries(t, h, l) {
    const now = Date.now();
    hTime = []; hT = []; hH = []; hL = [];
    for (let i = 13; i >= 1; i--) {
      const w = Math.sin(i * 0.7);
      hTime.push(new Date(now - i * 2000).toLocaleTimeString().slice(0, 8));
      hT.push(+(t + w * 0.4).toFixed(1));
      hH.push(Math.max(15, Math.min(100, +(h + Math.cos(i * 0.6) * 0.9).toFixed(0))));
      hL.push(Math.max(0, Math.min(100, +(l + w * 0.6).toFixed(0))));
    }
    hTime.push(new Date(now).toLocaleTimeString().slice(0, 8));
    hT.push(+t.toFixed(1)); hH.push(+h.toFixed(0)); hL.push(+l.toFixed(0));
  }

  function pushPoint(t, h, l) {
    if (hTime.length === 0) { reseedSeries(t, h, l); return; }
    hTime.push(new Date().toLocaleTimeString().slice(0, 8));
    hT.push(+t.toFixed(1)); hH.push(+h.toFixed(0)); hL.push(+l.toFixed(0));
    if (hTime.length > 14) { hTime.shift(); hT.shift(); hH.shift(); hL.shift(); }
  }

  function evalMetricBadge(val, minV, maxV, prevV, unit) {
    const arr = val > prevV ? "▲ " : (val < prevV ? "▼ " : "● ");
    const out = val < minV || val > maxV;
    const dist = val < minV ? (minV - val) : (val > maxV ? (val - maxV) : 0);
    const crit = out && dist > (unit === "°C" ? 3.0 : 12);
    const stTxt = !out ? "🟢 IDEAL" : (crit ? "🔴 CRÍTICO" : "🟡 ALERTA");
    const cls = !out
      ? "bg-success bg-opacity-25 text-success border border-success border-opacity-50"
      : (crit ? "bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50" : "bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50");
    return { text: `${arr}${val.toFixed(unit === "°C" ? 1 : 0)}${unit} · ${stTxt} [${minV}–${maxV}${unit}]`, cls };
  }

  function updateChartBadges(t, h, l, pr, lot) {
    const p = pr || { name: "Vinho Tinto", badge: "🍷 TINTO", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    const vt = document.getElementById("chart-val-temp");
    const vh = document.getElementById("chart-val-hum");
    const vl = document.getElementById("chart-val-lum");
    const bT = evalMetricBadge(t, p.tMin, p.tMax, lastT, "°C");
    const bH = evalMetricBadge(h, p.hMin, p.hMax, lastH, "%");
    const bL = evalMetricBadge(l, p.lMin, p.lMax, lastL, "%");
    lastT = t; lastH = h; lastL = l;
    if (vt) { vt.textContent = bT.text; vt.className = `badge font-monospace ${bT.cls}`; }
    if (vh) { vh.textContent = bH.text; vh.className = `badge font-monospace ${bH.cls}`; }
    if (vl) { vl.textContent = bL.text; vl.className = `badge font-monospace ${bL.cls}`; }

    const hdrWine = document.getElementById("scada-active-wine-pill");
    if (hdrWine) {
      const lotTxt = lot ? `${lot.winery} — ${lot.wine}` : (p.wine || p.name);
      hdrWine.innerHTML = `${p.badge || "🍷 VINHO"} · <strong>${lotTxt}</strong>`;
    }
  }

  function buildSvgChart(id, stroke, gradId, unit, vals, low, high, pad, wineName) {
    const el = document.getElementById(id);
    if (!el || vals.length === 0) return;
    const W = 460, H = 195, L = 42, R = 16, T = 26, B = 24;
    const plotW = W - L - R, plotH = H - T - B;
    const allV = vals.concat([low, high]);
    const yMin = Math.max(unit === "°C" ? -5 : 0, Math.min(...allV) - pad);
    const yMax = Math.min(unit === "°C" ? 45 : 100, Math.max(...allV) + pad);
    const span = Math.max(1, yMax - yMin);
    const toX = (i) => L + (i / Math.max(1, vals.length - 1)) * plotW;
    const toY = (v) => T + plotH - ((v - yMin) / span) * plotH;

    const yLow = Math.max(T, Math.min(T + plotH, toY(low)));
    const yHigh = Math.max(T, Math.min(T + plotH, toY(high)));
    const rectY = Math.min(yLow, yHigh), rectH = Math.max(2, Math.abs(yLow - yHigh));

    const pts = vals.map((v, i) => [toX(i), toY(v)]);
    const linePts = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const areaPts = `${L},${T + plotH} ${linePts} ${toX(vals.length - 1).toFixed(1)},${T + plotH}`;

    const curV = vals[vals.length - 1];
    const avgV = vals.reduce((a, b) => a + b, 0) / vals.length;
    const minVal = Math.min(...vals), maxVal = Math.max(...vals);
    const isOk = curV >= low && curV <= high;
    const isDark = document.documentElement.getAttribute("data-bs-theme") !== "light";
    const txtCol = isDark ? "#a1a1aa" : "#475569";
    const gridCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

    let gridSvg = "";
    for (let g = 0; g <= 4; g++) {
      const gv = yMin + (span * g) / 4;
      const gy = toY(gv);
      gridSvg += `<line x1="${L}" y1="${gy.toFixed(1)}" x2="${W - R}" y2="${gy.toFixed(1)}" stroke="${gridCol}" stroke-dasharray="3,3"/>`;
      gridSvg += `<text x="${L - 5}" y="${(gy + 3).toFixed(1)}" fill="${txtCol}" font-size="9" font-family="monospace" text-anchor="end">${gv.toFixed(unit === "°C" ? 1 : 0)}${unit}</text>`;
    }

    const xIdx = [0, Math.floor(vals.length / 2), vals.length - 1];
    const xSvg = xIdx.map(i => `<text x="${toX(i).toFixed(1)}" y="${H - 6}" fill="${txtCol}" font-size="9" font-family="monospace" text-anchor="${i === 0 ? "start" : (i === vals.length - 1 ? "end" : "middle")}">${hTime[i] || ""}</text>`).join("");

    const dotsSvg = pts.map((pt, i) => {
      const v = vals[i];
      const ok = v >= low && v <= high;
      const c = ok ? "#22c55e" : "#ef4444";
      const r = i === vals.length - 1 ? 5.5 : (ok ? 3.2 : 4.5);
      return `<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="${r}" fill="${c}" stroke="#ffffff" stroke-width="1.2"><title>${hTime[i]}: ${v.toFixed(1)}${unit} (${ok ? "Ideal" : "Desvio"})</title></circle>`;
    }).join("");

    const lastPt = pts[pts.length - 1];
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px 0;font-size:0.69rem;font-family:monospace;">
        <span style="color:${isOk ? "#4ade80" : "#f87171"};font-weight:700;">● ${isOk ? "EQUILÍBRIO IDEAL" : "FORA DA FAIXA"} (${wineName})</span>
        <span style="color:${txtCol};">Média: <b>${avgV.toFixed(1)}${unit}</b> · Faixa: ${minVal.toFixed(1)}–${maxVal.toFixed(1)}${unit}</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="225" style="display:block;overflow:visible;">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${stroke}" stop-opacity="0.38"/>
            <stop offset="100%" stop-color="${stroke}" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        ${gridSvg}
        <rect x="${L}" y="${rectY.toFixed(1)}" width="${plotW}" height="${rectH.toFixed(1)}" fill="rgba(34,197,94,0.14)"/>
        <line x1="${L}" y1="${yHigh.toFixed(1)}" x2="${W - R}" y2="${yHigh.toFixed(1)}" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="5,3"/>
        <text x="${W - R - 3}" y="${(yHigh - 3).toFixed(1)}" fill="#f87171" font-size="8.5" font-family="monospace" text-anchor="end">Máx ${high}${unit}</text>
        <line x1="${L}" y1="${yLow.toFixed(1)}" x2="${W - R}" y2="${yLow.toFixed(1)}" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="3,3"/>
        <text x="${W - R - 3}" y="${(yLow + 10).toFixed(1)}" fill="#38bdf8" font-size="8.5" font-family="monospace" text-anchor="end">Mín ${low}${unit}</text>
        <polygon points="${areaPts}" fill="url(#${gradId})"/>
        <polyline fill="none" stroke="${stroke}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" points="${linePts}"/>
        ${dotsSvg}
        <rect x="${Math.min(W - 62, Math.max(L, lastPt[0] - 28)).toFixed(1)}" y="${Math.max(4, lastPt[1] - 22).toFixed(1)}" width="52" height="15" rx="4" fill="${isOk ? "#166534" : "#991b1b"}" stroke="${isOk ? "#4ade80" : "#f87171"}" stroke-width="0.8"/>
        <text x="${Math.min(W - 36, Math.max(L + 26, lastPt[0] - 2)).toFixed(1)}" y="${Math.max(14, lastPt[1] - 11).toFixed(1)}" fill="#ffffff" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">${curV.toFixed(unit === "°C" ? 1 : 0)}${unit}</text>
        ${xSvg}
      </svg>`;
  }

  function renderAllCharts(t, h, l, pr, lot, shouldReseed = false) {
    if (shouldReseed || hTime.length === 0) reseedSeries(t, h, l);
    else pushPoint(t, h, l);
    const p = pr || { name: "Vinho Tinto", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    updateChartBadges(t, h, l, p, lot);
    const wName = p.name || "Vinho Tinto";
    buildSvgChart("graph-temperature", "#e11d48", "grad-temp", "°C", hT, p.tMin, p.tMax, 2.5, wName);
    buildSvgChart("graph-humidity", "#0ea5e9", "grad-hum", "%", hH, p.hMin, p.hMax, 7.0, wName);
    buildSvgChart("graph-luminosity", "#e2b86b", "grad-lum", "%", hL, p.lMin, p.lMax, 5.0, wName);
  }

  window.ScadaCharts = { renderAllCharts, reseedSeries, updateChartBadges };
})();
