// SCADA MQTT Transport — Ponte WebSocket Direta de Ultra-Baixa Latência Browser <-> Wokwi ESP32 (#478106752109243393)
(function () {
  let pahoClient = null;
  let isConnecting = false;
  let useSslMode = true; // WSS (8884) funciona em https://, http:// e file:// sem bloqueio de firewall
  let onTelemetryCallback = null;
  let lastState = null;
  let syncTimer = null;

  try {
    const saved = localStorage.getItem("vinheria_scada_state");
    if (saved) lastState = JSON.parse(saved);
  } catch (_) {}

  function sendPacket(topic, payload) {
    if (!pahoClient || !pahoClient.isConnected()) return false;
    try {
      const m = new Paho.MQTT.Message(payload);
      m.destinationName = topic;
      m.qos = 0;
      m.retained = false;
      pahoClient.send(m);
      return true;
    } catch (_) {
      return false;
    }
  }

  function flushState(st) {
    if (!st || !pahoClient || !pahoClient.isConnected()) return false;
    const t = typeof st.t === "number" ? st.t : 15.8;
    const h = typeof st.h === "number" ? st.h : 68.0;
    const l = typeof st.l === "number" ? st.l : 9.0;
    const wokwiMode = (st.stateKey === "critico" || st.cmd === "multi" || st.cmd === "critico")
      ? "critico"
      : ((st.stateKey === "padrao" || st.cmd === "padrao") ? "padrao" : "normal");
    const score = typeof st.score === "number" ? Math.round(st.score) : 100;
    const verdict = (st.verdict || "OK").toString().slice(0, 3).toUpperCase();
    const tag = (st.tag || "TINTO").toString().trim().toUpperCase().slice(0, 5);

    // 1. Envia comando 'diag' compreendido pelo Wokwi #478106752109243393 para trocar curPreset, curHealth e curMode
    const okDiag = sendPacket(
      "/TEF/vine001/cmd",
      `vine001@diag|${wokwiMode}|${score}|${verdict}|${tag}`
    );

    // 2. Envia comando 'sync' com 90ms de intervalo para evitar coalescência TCP no buffer de 256 bytes do ESP32
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      sendPacket(
        "/TEF/vine001/cmd",
        `vine001@sync|${t.toFixed(1)}|${h.toFixed(1)}|${l.toFixed(1)}`
      );
    }, 90);

    return okDiag;
  }

  function initMqtt(onTelemetry) {
    if (onTelemetry) onTelemetryCallback = onTelemetry;
    if (pahoClient && pahoClient.isConnected()) return;
    if (isConnecting) return;
    if (typeof Paho === "undefined" || !Paho.MQTT) {
      setTimeout(() => initMqtt(onTelemetryCallback), 100);
      return;
    }
    isConnecting = true;
    const port = useSslMode ? 8884 : 8000;
    try {
      const clientId = "agnello_" + Math.random().toString(16).slice(2, 10);
      pahoClient = new Paho.MQTT.Client("broker.hivemq.com", port, "/mqtt", clientId);
      pahoClient.onConnectionLost = () => {
        isConnecting = false;
        pahoClient = null;
        setTimeout(() => initMqtt(onTelemetryCallback), 800);
      };
      pahoClient.onMessageArrived = (m) => {
        const topic = m.destinationName || "";
        const raw = m.payloadString || "";
        if (topic.endsWith("/cmdexe")) {
          if (lastState) {
            const tgLbl = (lastState.tag || "TINTO").toUpperCase();
            window.ScadaUIController?.renderCommandBadge(lastState.stateKey, "WOKWI SINCRONIZADO", ` (${tgLbl})`);
          }
          return;
        }
        const p = raw.split("|");
        const data = {};
        for (let i = 0; i < p.length - 1; i += 2) {
          if (p[i] === "t") data.t = parseFloat(p[i + 1]);
          if (p[i] === "h") data.h = parseFloat(p[i + 1]);
          if (p[i] === "l") data.l = parseFloat(p[i + 1]);
          if (p[i] === "r") data.r = parseFloat(p[i + 1]);
        }
        if (onTelemetryCallback && data.r !== 1 && (data.t !== undefined || data.h !== undefined || data.l !== undefined)) {
          onTelemetryCallback(data);
        }
      };

      // Paho MQTT 1.0.1 não aceita 'reconnect: true' em connectOptions
      pahoClient.connect({
        useSSL: useSslMode,
        timeout: 4,
        keepAliveInterval: 15,
        cleanSession: true,
        onSuccess: () => {
          isConnecting = false;
          try {
            pahoClient.subscribe("/TEF/vine001/attrs");
            pahoClient.subscribe("/TEF/vine001/cmdexe");
            if (lastState) flushState(lastState);
          } catch (_) {}
        },
        onFailure: () => {
          isConnecting = false;
          pahoClient = null;
          if (window.location.protocol !== "https:") {
            useSslMode = !useSslMode;
          }
          setTimeout(() => initMqtt(onTelemetryCallback), 900);
        }
      });
    } catch (_) {
      isConnecting = false;
      pahoClient = null;
    }
  }

  function publishScadaState(state) {
    lastState = { ...state, ts: Date.now() };
    try {
      localStorage.setItem("vinheria_scada_state", JSON.stringify(lastState));
    } catch (_) {}
    if (!flushState(lastState)) {
      initMqtt(onTelemetryCallback);
    }
  }

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", (e) => {
      if (e.key === "vinheria_scada_state" && e.newValue) {
        try {
          lastState = JSON.parse(e.newValue);
        } catch (_) {}
      }
    });
  }

  // Keepalive a cada 2.0s para manter o Wokwi sincronizado 100% com o site (mesmo em aba de fundo)
  setInterval(() => {
    if (lastState && pahoClient && pahoClient.isConnected()) {
      flushState(lastState);
    }
  }, 2000);

  initMqtt();

  window.ScadaMQTT = {
    init: initMqtt,
    publish: sendPacket,
    publishState: publishScadaState,
    isConnected: () => !!(pahoClient && pahoClient.isConnected())
  };
})();
