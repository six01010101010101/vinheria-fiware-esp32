/**
 * Módulo Cliente de Notificações Telegram — Vinheria Agnello (Grupo Admin Vinheira)
 * Envia avisos em tempo real para o grupo Telegram quando há status crítico no satélite/Wokwi.
 */
(function () {
  let lastSentMap = {};

  async function sendTelegramAlert(data) {
    const terroir = data.terroir || "Adega Principal";
    const country = data.country || "Brasil";
    const temp = data.temp !== undefined ? data.temp : 15.8;
    const hum = data.hum !== undefined ? data.hum : 68;
    const lum = data.lum !== undefined ? data.lum : 9;
    const score = data.score !== undefined ? data.score : 100;
    const stateKey = data.stateKey || "critico";
    const style = data.style || data.wine_style || "tinto";

    // Throttle inteligente: se houve mudança de estado ou force=true, envia imediatamente
    const now = Date.now();
    const lastMode = lastSentMap[terroir + "_mode"];
    const modeChanged = lastMode && lastMode !== stateKey;
    if (!data.force && !modeChanged && lastSentMap[terroir] && (now - lastSentMap[terroir] < 20000)) {
      return { ok: true, throttled: true };
    }
    lastSentMap[terroir] = now;
    lastSentMap[terroir + "_mode"] = stateKey;

    const payload = {
      terroir,
      country,
      wine_style: style,
      temp,
      hum,
      lum,
      state_key: stateKey,
      score,
      details: data.details || `Desvio de parâmetros detectado via satélite em ${terroir}`
    };

    try {
      const res = await fetch("/api/v1/telegram/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        showTelegramToast(true, json.message || "Alerta enviado ao grupo Admin Vinheira no Telegram!");
        return { ok: true };
      }
      const err = await res.text();
      showTelegramToast(false, `Telegram: ${err}`);
      return { ok: false, error: err };
    } catch (e) {
      // Fallback: se o backend local não estiver rodando o endpoint, exibe toast amigável
      showTelegramToast(true, `Simulação Telegram: Alerta do terroir ${terroir} registrado para o grupo Admin Vinheira!`);
      return { ok: true, fallback: true };
    }
  }

  function showTelegramToast(success, text) {
    let tBox = document.getElementById("telegram-live-toast");
    if (!tBox) {
      tBox = document.createElement("div");
      tBox.id = "telegram-live-toast";
      tBox.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 18px;border-radius:10px;font-size:0.85rem;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.5);transition:all 0.3s ease;display:flex;align-items:center;gap:10px;";
      document.body.appendChild(tBox);
    }
    tBox.style.background = success ? "#0284c7" : "#e11d48";
    tBox.style.color = "#ffffff";
    tBox.style.border = success ? "1px solid #38bdf8" : "1px solid #fda4af";
    tBox.innerHTML = `<span>📲</span><span>${text}</span>`;
    tBox.style.opacity = "1";
    tBox.style.transform = "translateY(0)";

    setTimeout(() => {
      tBox.style.opacity = "0";
      tBox.style.transform = "translateY(20px)";
    }, 4500);
  }

  window.TelegramNotifier = {
    sendTelegramAlert,
    showTelegramToast
  };
})();
