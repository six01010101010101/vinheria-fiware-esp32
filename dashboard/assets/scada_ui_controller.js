/**
 * SCADA UI Controller — Vinheria Agnello & Wokwi Twin
 * Responsável pela sincronização da interface, formulários, badges e eventos do usuário.
 */
(function (root) {
  function updateWineProfileBanner(pr, lot, res) {
    const badgeEl = document.getElementById("active-wine-banner-badge");
    const castaEl = document.getElementById("active-wine-banner-casta");
    const rangeEl = document.getElementById("active-wine-banner-range");
    const stateEl = document.getElementById("active-wine-banner-state");
    if (badgeEl) badgeEl.textContent = pr.badge || "🍷 VINHO TINTO";
    if (castaEl) {
      castaEl.textContent = lot
        ? `${lot.winery} — ${lot.wine} (${lot.vintage}) · ${lot.casta || pr.casta || ""}`
        : (pr.casta || pr.desc || "");
    }
    if (rangeEl) rangeEl.textContent = `Alvo: ${pr.tMin}–${pr.tMax}°C | ${pr.hMin}–${pr.hMax}% UR | ≤${pr.lMax}% Luz`;
    if (stateEl && res) {
      const isId = res.stateKey === "ideal", isCr = res.stateKey === "critico";
      stateEl.textContent = isId ? `🟢 IDEAL 95–100% (${res.score}%)` : (isCr ? `🔴 CRÍTICO <75% (${res.score}% · APITO)` : `🟡 PADRÃO 75–94% (${res.score}%)`);
      stateEl.className = `badge font-monospace ${isId ? "bg-success bg-opacity-25 text-success border border-success" : (isCr ? "bg-danger bg-opacity-25 text-danger border border-danger" : "bg-warning bg-opacity-25 text-warning border border-warning")}`;
    }
  }

  function syncPresetControls(p, curPr) {
    try { localStorage.setItem("vinheria_preset", curPr); } catch (_) {}
    const sel = document.getElementById("dropdown-wine-preset");
    if (sel && sel.value !== curPr) sel.value = curPr;
    document.querySelectorAll(".wine-pill-btn").forEach(b => b.classList.toggle("active", b.dataset.wine === curPr));
    ["temp-min", "temp-max", "hum-min", "hum-max", "lum-min", "lum-max"].forEach((k, i) => {
      const el = document.getElementById(`trigger-${k}`);
      if (el) el.value = [p.tMin, p.tMax, p.hMin, p.hMax, p.lMin, p.lMax][i];
    });
    const descEl = document.getElementById("preset-description-text");
    if (descEl) descEl.textContent = p.desc || "";
  }

  function handleWineSearch(q, { onWinePresetChange, onLotSelect }) {
    const s = (q || "").trim().toLowerCase();
    if (!s) return;
    const lotMatch = (window.CANONICAL_LOTS || []).find(l =>
      (l.winery + " " + l.wine + " " + l.code + " " + l.country + " " + (l.casta || "")).toLowerCase().includes(s)
    );
    if (lotMatch) {
      onLotSelect(lotMatch.style, lotMatch.terroirId, lotMatch.code);
      return;
    }
    if (s.includes("pinot") || s.includes("borg") || s.includes("roman")) onWinePresetChange("pinot");
    else if (s.includes("port") || s.includes("fortif") || s.includes("taylor")) onWinePresetChange("porto");
    else if (s.includes("colheit") || s.includes("sobrem") || s.includes("sautern") || s.includes("doce")) onWinePresetChange("sobremesa");
    else if (s.includes("laranj") || s.includes("anfor") || s.includes("ânfor") || s.includes("gravner")) onWinePresetChange("laranja");
    else if (s.includes("branc") || s.includes("chard") || s.includes("sauv") || s.includes("riesl") || s.includes("koshu")) onWinePresetChange("branco");
    else if (s.includes("ros") || s.includes("prov")) onWinePresetChange("rose");
    else if (s.includes("brut") || s.includes("espum") || s.includes("champ")) onWinePresetChange("espumante");
    else if (s.includes("tint") || s.includes("caber") || s.includes("merl") || s.includes("malb") || s.includes("shiraz")) onWinePresetChange("tinto");
  }

  const STATE_META = {
    ideal: { label: "IDEAL", tone: "success" },
    padrao: { label: "PADRÃO", tone: "warning" },
    critico: { label: "CRÍTICO", tone: "danger" }
  };

  function renderCommandBadge(stateKey, prefix, suffix = "") {
    const el = document.getElementById("mqtt-cmd-badge");
    if (!el) return;
    const { label, tone } = STATE_META[stateKey] || STATE_META.ideal;
    el.className = `badge bg-${tone} bg-opacity-25 text-${tone} border border-${tone} border-opacity-50 font-monospace`;
    const dot = document.createElement("span");
    dot.className = "status-dot";
    el.replaceChildren(dot, document.createTextNode(`${prefix}: ${label}${suffix}`));
  }

  function bindStatePill(id, scenario, h) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => h.applyScenario(scenario));
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      h.applyScenario(scenario);
    });
  }

  function bindScadaEvents(h) {
    document.getElementById("input-wine-search")?.addEventListener("input", e => handleWineSearch(e.target.value, h));
    document.getElementById("dropdown-wine-preset")?.addEventListener("change", e => h.onWinePresetChange(e.target.value));
    document.getElementById("dropdown-area-terroir")?.addEventListener("change", e => h.onAreaTerroirChange(e.target.value));
    ["temp-min", "temp-max", "hum-min", "hum-max", "lum-min", "lum-max"].forEach(k => {
      document.getElementById(`trigger-${k}`)?.addEventListener("input", h.onThresholdInputChange);
    });
    document.querySelectorAll(".wine-pill-btn").forEach(b => b.addEventListener("click", () => h.onWinePresetChange(b.dataset.wine)));
    document.querySelectorAll(".sc-btn").forEach(b => b.addEventListener("click", () => h.applyScenario(b.dataset.sc)));
    bindStatePill("led-state-ideal", "normal", h);
    bindStatePill("led-state-padrao", "padrao", h);
    bindStatePill("led-state-critico", "multi", h);
    window.addEventListener("themeChanged", () => h.onThemeChanged());
  }

  function readThresholdInputs(p) {
    const getVal = (id, def) => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? def : v; };
    p.tMin = getVal("trigger-temp-min", p.tMin); p.tMax = getVal("trigger-temp-max", p.tMax);
    p.hMin = getVal("trigger-hum-min", p.hMin); p.hMax = getVal("trigger-hum-max", p.hMax);
    p.lMin = getVal("trigger-lum-min", p.lMin); p.lMax = getVal("trigger-lum-max", p.lMax);
    return p;
  }

  root.ScadaUIController = {
    updateWineProfileBanner,
    syncPresetControls,
    handleWineSearch,
    readThresholdInputs,
    renderCommandBadge,
    bindScadaEvents
  };
})(typeof window !== "undefined" ? window : globalThis);
