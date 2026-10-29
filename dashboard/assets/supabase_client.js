/**
 * Cliente REST Bidirecional para o Supabase Cloud (PostgreSQL PostgREST) — Vinheria Agnello
 * Responsável pelo sincronismo em nuvem de telemetria, configurações e dados dos terroirs/lotes.
 */
(function (root) {
  const SUPABASE_URL = "https://slqozouuqzxwmfswyroo.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscW96b3V1cXp4d21mc3d5cm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDkxOTMsImV4cCI6MjEwNzc4NTE5M30.spwyPsi31yzG6rvh2FsSHWM8Fkv2CPLHpUx9Us8aRo4";

  let lastSupaTelemetryTs = 0;
  let lastSupaBulkTs = 0;
  let supaConnected = false;

  function supaHeaders(prefer = "return=minimal") {
    return {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": prefer
    };
  }

  function updateSupabaseBadgeUI(ok, detail = "") {
    supaConnected = ok;
    const el = document.getElementById("supabase-sync-pill");
    if (el) {
      el.className = ok ? "status-pill status-pill-live text-decoration-none" : "status-pill text-decoration-none";
      el.innerHTML = `<span class="status-dot ${ok ? "status-dot-live" : ""}"></span><span>Supabase SQL: ${ok ? ("SYNC" + (detail ? " · " + detail : "")) : "CONECTANDO..."}</span>`;
    }
  }

  function syncTelemetryToSupabase({ t = 15.8, h = 68, l = 9, cmd = "normal", score = 100, source = "SCADA Web & Wokwi", force = false } = {}) {
    const now = Date.now();
    if (!force && now - lastSupaTelemetryTs < 5000) return;
    lastSupaTelemetryTs = now;
    fetch(`${SUPABASE_URL}/rest/v1/vine_telemetry`, {
      method: "POST",
      headers: supaHeaders("return=minimal"),
      body: JSON.stringify({
        device_id: "vine001",
        temperature: +Number(t).toFixed(2),
        humidity: +Number(h).toFixed(2),
        luminosity: +Number(l).toFixed(2),
        alert_mode: cmd || "normal",
        cellar_health_score: Math.round(score || 100),
        source: source
      })
    }).then(r => {
      if (r.ok) updateSupabaseBadgeUI(true, `${Number(t).toFixed(1)}°C`);
    }).catch(() => {});
  }

  function syncLotsAndAreasToSupabase(activeWineKey = "tinto", force = false) {
    const now = Date.now();
    if (!force && now - lastSupaBulkTs < 15000) return;
    lastSupaBulkTs = now;

    const PRESETS = root.PRESETS || {};
    const TERROIRS = root.TERROIRS || {};
    const CANONICAL_LOTS = root.CANONICAL_LOTS || [];

    const triggerRows = Object.values(PRESETS).map(pr => ({
      preset_key: pr.key, name: pr.name, description: pr.desc,
      temp_min: pr.tMin, temp_max: pr.tMax, hum_min: pr.hMin, hum_max: pr.hMax,
      lum_min: pr.lMin || 0, lum_max: pr.lMax, updated_at: new Date().toISOString()
    }));
    fetch(`${SUPABASE_URL}/rest/v1/vine_trigger_configs`, {
      method: "POST", headers: supaHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(triggerRows)
    }).then(r => {
      if (r.ok) updateSupabaseBadgeUI(true, (PRESETS[activeWineKey]?.name || "Ativo"));
    }).catch(() => {});

    const terroirRows = Object.values(TERROIRS).filter(v => v.id !== "wokwi_esp32").map(v => {
      const rh = Math.max(1, Math.min(100, v.h || 68));
      const a = ((17.27 * v.t) / (237.7 + v.t)) + Math.log(rh / 100);
      const dew = +((237.7 * a) / (17.27 - a)).toFixed(2);
      return {
        vineyard_id: v.id, name: v.name, region: v.reg, country: v.country,
        latitude: v.lat, longitude: v.lon, temperature_c: +Number(v.t).toFixed(2),
        humidity_pct: +Number(v.h).toFixed(2), luminosity_pct: +Number(v.l).toFixed(2),
        solar_wm2: +(Number(v.l) * 10).toFixed(1), dew_point_c: dew, is_day: true,
        local_time: v.local_time || new Date().toLocaleTimeString().slice(0, 5),
        updated_at: new Date().toISOString()
      };
    });
    fetch(`${SUPABASE_URL}/rest/v1/real_vineyards_status`, {
      method: "POST", headers: supaHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(terroirRows)
    }).catch(() => {});

    const lotRows = CANONICAL_LOTS.map(lot => {
      const ev = root.evaluateLotPreservation ? root.evaluateLotPreservation(lot, lot.liveT, lot.liveH, lot.liveL) : { score: 100, verdict: "IDEAL (95–100%)" };
      return {
        lot_code: lot.code, winery_name: lot.winery, wine_name: lot.wine,
        style: lot.style, country: lot.country, region: lot.region, vintage: lot.vintage,
        bottling_date: `${lot.vintage + 2}-06`, expiration_date: lot.apogee,
        barrel_type: lot.barrel, soil_type: lot.soil,
        target_temp_min: lot.temp[0], target_temp_max: lot.temp[1],
        target_hum_min: lot.hum[0], target_hum_max: lot.hum[1],
        target_lum_max: lot.lum, health_score: ev.score, verdict: ev.verdict,
        updated_at: new Date().toISOString()
      };
    });
    fetch(`${SUPABASE_URL}/rest/v1/cellar_lots`, {
      method: "POST", headers: supaHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(lotRows)
    }).catch(() => {});
  }

  async function fetchLiveFromSupabase() {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/vine_devices?select=device_id,entity_name,wokwi_project_url&limit=1`, {
        headers: supaHeaders("return=representation")
      });
      if (r.ok) {
        updateSupabaseBadgeUI(true, "PostgreSQL 17");
        return await r.json();
      }
    } catch (_) {}
    return null;
  }

  root.SupabaseCloud = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    isConnected: () => supaConnected,
    syncTelemetry: syncTelemetryToSupabase,
    syncLotsAndAreas: syncLotsAndAreasToSupabase,
    fetchLive: fetchLiveFromSupabase
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => fetchLiveFromSupabase());
  } else {
    fetchLiveFromSupabase();
  }
})(typeof window !== "undefined" ? window : globalThis);
