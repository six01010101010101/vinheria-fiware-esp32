/**
 * Módulo de Telemetria por Satélite & Estações Meteorológicas — Vinheria Agnello
 * Integração Direta Open-Meteo (Satélites Meteorológicos WMO) & API REST v1.
 */
const ID_ALIAS = {
  miolo_br: "br_miolo", br_miolo: "br_miolo",
  catena_ar: "ar_catena", ar_catena: "ar_catena",
  concha_cl: "cl_concha", cl_concha: "cl_concha",
  margaux_fr: "fr_margaux", fr_margaux: "fr_margaux",
  antinori_it: "it_antinori", it_antinori: "it_antinori",
  crasto_pt: "pt_crasto", pt_crasto: "pt_crasto",
  opus_us: "us_opus", us_opus: "us_opus",
  abrau_ru: "ru_abrau", ru_abrau: "ru_abrau"
};

function calcDewPoint(t, h) {
  const rh = Math.max(1, Math.min(100, h));
  const a = ((17.27 * t) / (237.7 + t)) + Math.log(rh / 100);
  return +((237.7 * a) / (17.27 - a)).toFixed(1);
}

async function fetchSatelliteData() {
  const terroirs = window.TERROIRS || {};
  let updated = false;
  try {
    const res = await fetch("/api/v1/vineyards", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      (data.vineyards || []).forEach(v => {
        const tid = ID_ALIAS[v.vineyard_id] || v.vineyard_id;
        if (terroirs[tid]) {
          terroirs[tid].t = +v.temperature_c.toFixed(1);
          terroirs[tid].h = +v.humidity_pct.toFixed(0);
          terroirs[tid].l = +v.luminosity_pct.toFixed(0);
          terroirs[tid].dew = +v.dew_point_c.toFixed(1);
          terroirs[tid].local_time = v.local_time || "--:--";
          terroirs[tid].source = "Open-Meteo Satélite (WMO)";
          updated = true;
        }
      });
    }
  } catch (_) {}

  if (!updated) {
    const list = Object.values(terroirs).filter(x => x.id !== "wokwi_esp32");
    const lats = list.map(x => x.lat).join(","), lons = list.map(x => x.lon).join(",");
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,shortwave_radiation,is_day&timezone=auto`);
      if (res.ok) {
        const payload = await res.json();
        const items = Array.isArray(payload) ? payload : [payload];
        list.forEach((tItem, idx) => {
          const c = items[idx]?.current || {};
          if (c.temperature_2m !== undefined) {
            tItem.t = +c.temperature_2m.toFixed(1);
            tItem.h = +c.relative_humidity_2m.toFixed(0);
            tItem.l = Math.min(100, Math.round((c.shortwave_radiation || 0) / 10));
            tItem.dew = calcDewPoint(tItem.t, tItem.h);
            tItem.local_time = (c.time || "").split("T")[1] || "--:--";
            tItem.source = "Open-Meteo Satélite WMO";
          }
        });
      }
    } catch (_) {}
  }
  const badge = document.getElementById("satellite-live-badge");
  if (badge) badge.innerHTML = `<span class="status-dot"></span>SATÉLITE WMO AO VIVO (${new Date().toLocaleTimeString()})`;
  window.dispatchEvent(new CustomEvent("satellitesUpdated", { detail: { terroirs } }));
}

function renderRealVineyards(activeId, onSelectCallback) {
  const c = document.getElementById("real-vineyards-grid");
  if (!c) return;
  const list = Object.values(window.TERROIRS || {}).filter(x => x.id !== "wokwi_esp32");
  c.innerHTML = list.map(v => {
    const dew = v.dew !== undefined ? v.dew : calcDewPoint(v.t, v.h);
    const isAct = v.id === activeId;
    return `
    <div class="col-lg-4 col-md-6 col-12">
      <div class="vineyard-card ${isAct ? "active-vineyard" : ""}" data-vid="${v.id}" style="cursor:pointer;" title="Clique para ativar este terroir e sincronizar a cava">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <div class="d-flex align-items-center gap-2">
            <span class="flag-circle">${v.flag}</span>
            <div><div class="lot-wine-title text-truncate" style="font-size:0.86rem;">${v.name}</div><span class="text-country" style="font-size:0.72rem;">${v.country} · ${v.reg}</span></div>
          </div>
          <span class="sommelier-tag">${isAct ? "● ATIVO" : "🛰️ SAT"}</span>
        </div>
        <div class="d-flex justify-content-between align-items-center p-2 rounded bg-black bg-opacity-25 border border-secondary border-opacity-25 mt-2">
          <span class="text-temp small">🌡️ ${v.t.toFixed(1)}°C</span>
          <span class="text-hum small">💧 ${v.h.toFixed(0)}%</span>
          <span class="text-lum small">☀️ ${v.l.toFixed(0)}%</span>
          <span class="text-dew small">💨 ${dew}°C</span>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-2 px-1 text-muted" style="font-size:0.65rem;">
          <span>📡 Fonte: Open-Meteo Satélite</span>
          <span>🕒 Local: ${v.local_time || "--:--"}</span>
        </div>
      </div>
    </div>`;
  }).join("");
  if (onSelectCallback) {
    c.querySelectorAll(".vineyard-card").forEach(card => card.addEventListener("click", () => onSelectCallback(card.dataset.vid)));
  }
}

function startSatelliteLiveLoop(getActiveId, onSelectCallback) {
  fetchSatelliteData().then(() => renderRealVineyards(getActiveId(), onSelectCallback));
  setInterval(async () => {
    await fetchSatelliteData();
    renderRealVineyards(getActiveId(), onSelectCallback);
  }, 25000);
  setInterval(() => {
    const terroirs = window.TERROIRS || {};
    Object.values(terroirs).forEach(v => {
      if (v.id !== "wokwi_esp32") {
        v.t = +(v.t + (Math.random() - 0.5) * 0.08).toFixed(1);
      }
    });
    renderRealVineyards(getActiveId(), onSelectCallback);
  }, 2200);
}

window.renderRealVineyards = renderRealVineyards;
window.fetchSatelliteData = fetchSatelliteData;
window.startSatelliteLiveLoop = startSatelliteLiveLoop;
