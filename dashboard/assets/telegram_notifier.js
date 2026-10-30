/**
 * Módulo Cliente de Notificações Telegram — Vinheria Agnello (Grupo Admin Vinheira)
 * Suporta alerta geral, notificação de seleção de vinho e envio via Telegram Bot API direta ou local.
 */
(function (root) {
  const DEF_TOKEN = "8777267552:AAHG5UuhhjSk5Vionulj1wWuq1OWbyDzaww";
  const DEF_CHAT = "-5001665013";
  let lastSentMap = {}, lastWineSentMap = {};

  function getToken() {
    return (localStorage.getItem("vinheria_telegram_token") || DEF_TOKEN).trim().replace(/^['"]|['"]$/g, "");
  }
  function getChatId() {
    return (localStorage.getItem("vinheria_telegram_chat_id") || DEF_CHAT).trim().replace(/^['"]|['"]$/g, "");
  }

  async function dispatchToTelegram(text, successToast) {
    const token = getToken(), chatId = getChatId();
    let sent = false, errMsg = "";

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) sent = true;
      else errMsg = data.description || `HTTP ${res.status}`;
    } catch (e) { errMsg = e.message; }

    if (!sent && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      try {
        const local = await fetch("/api/v1/telegram/alert", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, chat_id: chatId })
        });
        if (local.ok) sent = true;
      } catch (_) {}
    }

    if (sent) showTelegramToast(true, successToast || "Mensagem enviada ao grupo Admin Vinheira no Telegram!");
    else showTelegramToast(false, `Telegram: ${errMsg || "Falha no envio"}`);
    return { ok: sent, error: errMsg };
  }

  function formatGeneralAlert(d) {
    const tr = d.terroir || "Adega Central", co = d.country || "Brasil", st = (d.wine_style || d.style || "Tinto").toUpperCase();
    const sc = Math.round(d.score ?? 100), isC = d.stateKey === "critico" || sc < 75;
    const isP = !isC && (d.stateKey === "padrao" || sc < 95);
    const header = isC ? "🚨 *ALERTA CRÍTICO — VINHERIA AGNELLO*" : (isP ? "⚠️ *STATUS PADRÃO (ATENÇÃO)*" : "🟢 *STATUS IDEAL*");
    const led = isC ? "🔴 LED Vermelho (D18/D7) + Buzzer Sonata" : (isP ? "🟡 LED Amarelo (D2/D6)" : "🟢 LED Verde (D5)");
    return `${header}\n━━━━━━━━━━━━━━━━━━━━━\n📍 *Cava:* ${tr} (${co})\n🍷 *Estilo:* ${st} · Saúde: *${sc}%*\n🌡️ *Temp:* \`${Number(d.temp || 15.8).toFixed(1)}°C\` | 💧 *Umid:* \`${Math.round(d.hum || 68)}%\` | ☀️ *Luz:* \`${Math.round(d.lum || 9)}%\`\n📟 *Hardware:* ${led}\n⏰ \`${new Date().toLocaleString("pt-BR")}\``;
  }

  async function sendTelegramAlert(data = {}) {
    const tr = data.terroir || "Adega Central", now = Date.now();
    if (!data.force && lastSentMap[tr] && (now - lastSentMap[tr] < 6000)) return { ok: true, throttled: true };
    lastSentMap[tr] = now;
    return await dispatchToTelegram(formatGeneralAlert(data));
  }

  async function sendWineSelectionNotification(lot, evalResult, pr) {
    if (!lot) return { ok: false };
    const now = Date.now(), c = lot.code || "LOTE";
    if (lastWineSentMap[c] && (now - lastWineSentMap[c] < 4000)) return { ok: true, throttled: true };
    lastWineSentMap[c] = now;
    const ev = evalResult || { score: 100, verdict: "IDEAL", stateKey: "ideal" };
    const isC = ev.stateKey === "critico";
    const led = isC ? "🔴 LED Vermelho + Buzzer Sonata" : (ev.stateKey === "padrao" ? "🟡 LED Amarelo" : "🟢 LED Verde");
    const msg = `🍷 *SELEÇÃO DE VINHO · VINHERIA AGNELLO*\n━━━━━━━━━━━━━━━━━━━━━\n🏷️ *Lote:* \`${lot.code}\`\n🍇 *Vinho:* *${lot.winery} — ${lot.wine}*\n✨ *Estilo:* ${lot.styleLabel || "Vinho Fino"} (${lot.vintage || 2020})\n📍 *Origem:* ${lot.region || "Cava"}, ${lot.country || "Mundo"}\n📊 *Preservação:* *${ev.score}%* (${ev.verdict})\n🌡️ *T:* \`${(lot.liveT ?? 15.6).toFixed(1)}°C\` | 💧 *U:* \`${Math.round(lot.liveH ?? 68)}%\`\n📟 *Hardware:* ${led}\n━━━━━━━━━━━━━━━━━━━━━`;
    return await dispatchToTelegram(msg, `🍷 ${lot.winery} selecionado! Enviado ao Telegram.`);
  }

  function showTelegramToast(ok, text) {
    let b = document.getElementById("telegram-live-toast");
    if (!b) {
      b = document.createElement("div");
      b.id = "telegram-live-toast";
      b.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:99999;padding:12px 18px;border-radius:10px;font-size:0.85rem;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.5);transition:all 0.3s ease;display:flex;align-items:center;gap:10px;";
      document.body.appendChild(b);
    }
    b.style.background = ok ? "#0c4a6e" : "#881337";
    b.style.color = "#ffffff";
    b.style.border = ok ? "2px solid #38bdf8" : "2px solid #fb7185";
    b.innerHTML = `<span>${ok ? "📲" : "⚠️"}</span><span>${text}</span>`;
    b.style.opacity = "1";
    b.style.transform = "translateY(0)";
    clearTimeout(b._t);
    b._t = setTimeout(() => { b.style.opacity = "0"; b.style.transform = "translateY(20px)"; }, 5000);
  }

  root.TelegramNotifier = { sendTelegramAlert, sendWineSelectionNotification, dispatchToTelegram, showTelegramToast };
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-telegram-alert")?.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const nTok = prompt("Token do Bot Telegram:", getToken());
      if (nTok?.trim()) localStorage.setItem("vinheria_telegram_token", nTok.trim());
      const nChat = prompt("Chat ID do Grupo:", getChatId());
      if (nChat?.trim()) localStorage.setItem("vinheria_telegram_chat_id", nChat.trim());
      showTelegramToast(true, "Configurações do Telegram salvas!");
    });
  });
})(typeof window !== "undefined" ? window : globalThis);
