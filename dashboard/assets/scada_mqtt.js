// SCADA MQTT Transport — Ponte WebSocket Direta de Ultra-Baixa Latência (<20ms) Browser <-> Wokwi ESP32
(function () {
  let pahoClient = null;
  let onTelemetryCallback = null;
  let lastState = null;

  function sendPacket(topic, payload) {
    if (!pahoClient || !pahoClient.isConnected()) return false;
    try {
      const m = new Paho.MQTT.Message(payload);
      m.destinationName = topic;
      m.qos = 0;
      pahoClient.send(m);
      return true;
    } catch (_) {
      return false;
    }
  }

  function flushState(st) {
    if (!st) return false;
    const { t = 15.8, h = 68, l = 9, cmd = "normal", score = 100, verdict = "OK", tag = "TINTO" } = st;
    // Pacote unificado instantâneo + pacotes Ultralight 2.0 compatíveis
    const ok1 = sendPacket("/TEF/vine001/cmd", `vine001@state|${t.toFixed(1)}|${h.toFixed(1)}|${l.toFixed(1)}|${cmd}|${score}|${verdict}|${tag}`);
    const ok2 = sendPacket("/TEF/vine001/cmd", `vine001@sync|${t.toFixed(1)}|${h.toFixed(1)}|${l.toFixed(1)}`);
    const ok3 = sendPacket("/TEF/vine001/cmd", `vine001@diag|${cmd}|${score}|${verdict}|${tag}`);
    return ok1 || ok2 || ok3;
  }

  function initMqtt(onTelemetry) {
    if (onTelemetry) onTelemetryCallback = onTelemetry;
    if (pahoClient) return;
    if (typeof Paho === "undefined" || !Paho.MQTT) {
      setTimeout(() => initMqtt(onTelemetryCallback), 80);
      return;
    }
    try {
      pahoClient = new Paho.MQTT.Client("broker.hivemq.com", 8884, "/mqtt", "agnello_" + Math.random().toString(16).slice(2, 10));
      pahoClient.onConnectionLost = () => {
        setTimeout(() => { pahoClient = null; initMqtt(onTelemetryCallback); }, 600);
      };
      pahoClient.onMessageArrived = (m) => {
        const topic = m.destinationName || "";
        const raw = m.payloadString || "";
        if (topic.endsWith("/cmdexe")) {
          const bge = document.getElementById("mqtt-cmd-badge");
          if (bge && lastState) {
            bge.innerHTML = `<span class="status-dot"></span>WOKWI SINCRONIZADO: ${(lastState.stateKey || lastState.cmd || "IDEAL").toUpperCase()} (${lastState.tag || "TINTO"})`;
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
        // Só sobrescreve com sensor do Wokwi se não for eco de remoteSync (r=1) ou se Wokwi estiver selecionado
        if (onTelemetryCallback && data.r !== 1 && (data.t !== undefined || data.h !== undefined || data.l !== undefined)) {
          onTelemetryCallback(data);
        }
      };
      pahoClient.connect({
        useSSL: true,
        timeout: 3,
        keepAliveInterval: 15,
        cleanSession: true,
        reconnect: true,
        onSuccess: () => {
          try {
            pahoClient.subscribe("/TEF/vine001/attrs");
            pahoClient.subscribe("/TEF/vine001/cmdexe");
            if (lastState) flushState(lastState);
          } catch (_) {}
        }
      });
    } catch (_) {}
  }

  function publishScadaState(state) {
    lastState = { ...state, ts: Date.now() };
    if (!flushState(lastState)) initMqtt(onTelemetryCallback);
  }

  // Keepalive rápido (a cada 2.5s) para manter o Wokwi sempre sincronizado em tempo real
  setInterval(() => {
    if (lastState && pahoClient && pahoClient.isConnected()) {
      flushState(lastState);
    }
  }, 2500);

  initMqtt();

  window.ScadaMQTT = {
    init: initMqtt,
    publish: sendPacket,
    publishState: publishScadaState,
    isConnected: () => !!(pahoClient && pahoClient.isConnected())
  };
})();
