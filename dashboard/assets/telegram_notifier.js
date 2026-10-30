/**
 * Módulo Cliente de Notificações Telegram — Vinheria Agnello (Grupo Admin Vinheira)
 * Centralizado exclusivamente no envio do Boletim Detalhado da Rede e feedback visual ao operador.
 */
(function (root) {
  const DEF_TOKEN = "8777267552:AAHG5UuhhjSk5Vionulj1wWuq1OWbyDzaww";
  const DEF_CHAT = "-5001665013";

  function getToken() {
    return (localStorage.getItem("vinheria_telegram_token") || DEF_TOKEN).trim().replace(/^['"]|['"]$/g, "");
  }
  function getChatId() {
    return (localStorage.getItem("vinheria_telegram_chat_id") || DEF_CHAT).trim().replace(/^['"]|['"]$/g, "");
  }

  async function triggerDetailedBulletin() {
    let sent = false, errMsg = "";
    try {
      const res = await fetch("/api/v1/telegram/broadcast", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) sent = true;
      else errMsg = data.message || `HTTP ${res.status}`;
    } catch (e) {
      errMsg = e.message;
    }

    if (sent) {
      showTelegramToast(true, "Boletim Detalhado da Rede enviado ao Telegram!");
    } else {
      showTelegramToast(false, `Telegram: ${errMsg || "Falha ao despachar boletim"}`);
    }
    return { ok: sent, error: errMsg };
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

  // Compatibilidade: qualquer chamada de alerta redireciona exclusivamente para o Boletim Detalhado
  root.TelegramNotifier = {
    sendTelegramAlert: () => triggerDetailedBulletin(),
    sendWineSelectionNotification: () => Promise.resolve({ ok: true, ignored: true }),
    dispatchToTelegram: () => triggerDetailedBulletin(),
    triggerDetailedBulletin,
    showTelegramToast
  };

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
