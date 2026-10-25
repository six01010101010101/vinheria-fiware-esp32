/**
 * Módulo de Gráficos SCADA & Status Enológico em Tempo Real — Vinheria Agnello
 * Renderiza curvas temporais interativas de Temperatura, Higrometria e Penumbra com diagnóstico por ponto.
 */
(function () {
  let hTime = [], hT = [], hH = [], hL = [];
  let lastT = 15.2, lastH = 71, lastL = 9;

  function reseedSeries(t, h, l) {
    const now = Date.now();
    hTime = []; hT = []; hH = []; hL = [];
    for (let i = 14; i >= 1; i--) {
      const wave = Math.sin(i * 0.65);
      hTime.push(new Date(now - i * 2000).toLocaleTimeString());
      hT.push(+(t + wave * 0.35).toFixed(1));
      hH.push(Math.max(15, Math.min(100, +(h + Math.cos(i * 0.55) * 0.8).toFixed(0))));
      hL.push(Math.max(0, Math.min(100, +(l + wave * 0.5).toFixed(0))));
    }
    hTime.push(new Date(now).toLocaleTimeString());
    hT.push(+t.toFixed(1)); hH.push(+h.toFixed(0)); hL.push(+l.toFixed(0));
  }

  function pushPoint(t, h, l) {
    if (hTime.length === 0) { reseedSeries(t, h, l); return; }
    hTime.push(new Date().toLocaleTimeString());
    hT.push(+t.toFixed(1)); hH.push(+h.toFixed(0)); hL.push(+l.toFixed(0));
    if (hTime.length > 18) { hTime.shift(); hT.shift(); hH.shift(); hL.shift(); }
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
      const lotTxt = lot ? `${lot.winery} (${lot.wine})` : (p.wine || p.name);
      hdrWine.innerHTML = `${p.badge || "🍷 VINHO"} · <strong>${lotTxt}</strong>`;
    }
  }

  function renderAllCharts(t, h, l, pr, lot, shouldReseed = false) {
    if (shouldReseed || hTime.length === 0) reseedSeries(t, h, l);
    else pushPoint(t, h, l);

    const p = pr || { name: "Vinho Tinto", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25 };
    updateChartBadges(t, h, l, p, lot);

    const isDark = document.documentElement.getAttribute("data-bs-theme") !== "light";
    const pal = { bg: isDark ? "#121215" : "#ffffff", text: isDark ? "#e4e4e7" : "#111827", grid: isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb" };

    const makeFig = (id, title, stroke, fill, unit, vals, low, high, pad) => {
      const el = document.getElementById(id);
      if (!el || typeof Plotly === "undefined") return;
      const allV = vals.concat([low, high]);
      const yMin = Math.max(unit === "°C" ? -5 : 0, Math.min(...allV) - pad);
      const yMax = Math.min(unit === "°C" ? 45 : 100, Math.max(...allV) + pad);
      const mColors = vals.map(v => (v < low || v > high) ? "#ef4444" : "#22c55e");
      const mSizes = vals.map((v, i) => i === vals.length - 1 ? 10 : ((v < low || v > high) ? 8 : 5));
      const curV = vals[vals.length - 1];
      const isOk = curV >= low && curV <= high;

      const data = [{
        x: hTime, y: vals, type: "scatter", mode: "lines+markers", fill: "tozeroy", fillcolor: fill,
        line: { color: stroke, width: 2.8, shape: "spline", smoothing: 1.0 },
        marker: { color: mColors, size: mSizes, line: { color: "#ffffff", width: 1.2 } },
        hovertemplate: `<b>${title}: %{y:.1f}${unit}</b><br>Faixa Ideal: ${low}–${high}${unit}<br><span style="font-size:0.70rem;color:#a1a1aa">Horário: %{x}</span><extra></extra>`
      }];

      const layout = {
        title: {
          text: `<span style="font-size:10.5px;color:${isOk ? "#4ade80" : "#f87171"}">● ${isOk ? "DENTRO DA FAIXA IDEAL" : "DESVIO DETECTADO"} (${p.name || "Vinho"}) · Alvo: ${low}–${high}${unit}</span>`,
          x: 0.03, y: 0.96, xanchor: "left"
        },
        paper_bgcolor: pal.bg, plot_bgcolor: pal.bg,
        font: { color: pal.text, family: "Plus Jakarta Sans", size: 10 },
        margin: { t: 28, r: 16, l: 38, b: 26 },
        xaxis: { gridcolor: pal.grid, zeroline: false, nticks: 5, tickangle: 0, showline: false },
        yaxis: { gridcolor: pal.grid, range: [yMin, yMax], zeroline: false, nticks: 5 },
        shapes: [
          { type: "rect", xref: "paper", x0: 0, x1: 1, y0: low, y1: high, fillcolor: "rgba(34,197,94,0.14)", line: { width: 0 } },
          { type: "line", xref: "paper", x0: 0, x1: 1, y0: high, line: { color: "rgba(239,68,68,0.65)", width: 1.3, dash: "dash" } },
          { type: "line", xref: "paper", x0: 0, x1: 1, y0: low, line: { color: "rgba(56,189,248,0.65)", width: 1.3, dash: "dot" } }
        ]
      };
      try { Plotly.react(id, data, layout, { responsive: true, displayModeBar: false }); } catch (_) {}
    };

    makeFig("graph-temperature", "Temperatura", "#ef4444", "rgba(239,68,68,0.10)", "°C", hT, p.tMin, p.tMax, 3.0);
    makeFig("graph-humidity", "Umidade", "#0284c7", "rgba(2,132,199,0.10)", "%", hH, p.hMin, p.hMax, 8.0);
    makeFig("graph-luminosity", "Luminosidade", "#d4af62", "rgba(212,175,98,0.10)", "%", hL, p.lMin, p.lMax, 6.0);
  }

  window.ScadaCharts = { renderAllCharts, reseedSeries, updateChartBadges };
})();
