// SCADA MQTT Transport — HiveMQ WebSockets client for browser direct bridge
(function() {
  let pahoClient = null;
  let onTelemetryCallback = null;

  function initMqtt(onTelemetry) {
    if (typeof Paho === "undefined" || pahoClient) return;
    onTelemetryCallback = onTelemetry;
    try {
      pahoClient = new Paho.MQTT.Client(
        "broker.hivemq.com",
        8884,
        "/mqtt",
        "web_" + Math.random().toString(16).slice(2, 8)
      );
      pahoClient.connect({
        useSSL: true,
        timeout: 4,
        onSuccess: () => {
          try { pahoClient.subscribe("/TEF/vine001/attrs"); } catch (_) {}
        }
      });
      pahoClient.onMessageArrived = (m) => {
        const p = (m.payloadString || "").split("|");
        const data = {};
        for (let i = 0; i < p.length - 1; i += 2) {
          if (p[i] === "t") data.t = parseFloat(p[i + 1]);
          if (p[i] === "h") data.h = parseFloat(p[i + 1]);
          if (p[i] === "l") data.l = parseFloat(p[i + 1]);
        }
        if (onTelemetryCallback && (data.t !== undefined || data.h !== undefined || data.l !== undefined)) {
          onTelemetryCallback(data);
        }
      };
    } catch (_) {}
  }

  function publishMqtt(topic, payload) {
    if (pahoClient && pahoClient.isConnected()) {
      try {
        const m = new Paho.MQTT.Message(payload);
        m.destinationName = topic;
        pahoClient.send(m);
      } catch (_) {}
    }
  }

  function publishScadaState(state) {
    const { t, h, l, cmd, score, verdict, tag } = state;
    publishMqtt("/TEF/vine001/cmd", `vine001@sync|${t.toFixed(1)}|${h.toFixed(1)}|${l.toFixed(1)}`);
    publishMqtt("/TEF/vine001/cmd", `vine001@diag|${cmd}|${score}|${verdict}|${tag}`);
    publishMqtt("/TEF/vine001/cmd", `vine001@alert|${cmd}`);
  }

  window.ScadaMQTT = {
    init: initMqtt,
    publish: publishMqtt,
    publishState: publishScadaState,
    isConnected: () => !!(pahoClient && pahoClient.isConnected())
  };
})();
