/*
 * ============================================================================
 * CHECK POINT 5 - MONITORAMENTO GLOBAL DE VINHERIAS (WOKWI + GITHUB INTEGRADO)
 * Hardware: ESP32 + DHT22 (GPIO 15) + LDR (GPIO 34) + LED Azul (GPIO 2) + Buzzer (GPIO 4)
 * Otimização Real-Time: Publicação instantânea por variação (Delta) + Heartbeat 1.5s
 * Protocolo: FIWARE Ultralight 2.0 sobre MQTT (Compatível com Bridge Wokwi & FIWARE)
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <math.h>

// --- Rede Wi-Fi Virtual do Simulador Wokwi ---
const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// --- Broker MQTT Real-Time (Acessível diretamente pelo navegador Wokwi e Dashboard) ---
// Para VM FIWARE dedicada, basta substituir pelo IP da VM (ex: "20.206.204.100")
const char* MQTT_BROKER   = "broker.hivemq.com";
const int   MQTT_PORT     = 1883;

// --- Tópicos Ultralight 2.0 (Device ID: vine001 | API Key: TEF) ---
const char* TOPIC_PUBLISH_ATTRS  = "/TEF/vine001/attrs";
const char* TOPIC_SUBSCRIBE_CMD  = "/TEF/vine001/cmd";
const char* TOPIC_PUBLISH_CMDEXE = "/TEF/vine001/cmdexe";

// --- Mapeamento de Pinos no ESP32 ---
#define PIN_LED_BLUE 2    // LED Azul Onboard/Externo (Pisca remotamente em anomalia)
#define PIN_BUZZER   4    // Buzzer para alerta sonoro distinto por tipo de anomalia
#define PIN_DHT      15   // Sensor DHT-22 (Temperatura e Umidade no Wokwi)
#define PIN_LDR      34   // Sensor LDR no ADC1_CH6 (Luminosidade 0-100%)
#define DHT_TYPE     DHT22

DHT dht(PIN_DHT, DHT_TYPE);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// --- Controle de Estado em Tempo Real (Não-Bloqueante) ---
String currentAlertMode     = "normal"; // "normal", "temp", "hum", "lum", "multi"
unsigned long lastSampleMs  = 0;
unsigned long lastPublishMs = 0;
unsigned long lastBlinkMs   = 0;
unsigned long lastRetryMs   = 0;
float prevTemp              = -999.0;
float prevHum               = -999.0;
float prevLum               = -999.0;
bool ledState               = false;
int soundStep               = 0;

void setupWifi() {
  Serial.print("[WiFi] Conectando ao Wokwi-GUEST");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Conectado em tempo real! IP: " + WiFi.localIP().toString());
}

// --- Callback MQTT: Recebe comandos remotos do Front-end em Tempo Real ---
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("[MQTT CMD] Recebido: " + message);

  // Formato Ultralight 2.0: "vine001@alert|<modo>"
  int pipeIndex = message.indexOf('|');
  if (pipeIndex != -1) {
    String cmdValue = message.substring(pipeIndex + 1);
    cmdValue.trim();
    currentAlertMode = cmdValue;
    Serial.println("[ALERTA REMOTO] Estado atualizado pelo Front-end: " + currentAlertMode);

    // Envia ACK imediato de execução para o Dashboard / IoT Agent
    String ackPayload = "vine001@alert|OK_" + currentAlertMode;
    mqttClient.publish(TOPIC_PUBLISH_CMDEXE, ackPayload.c_str());
  }
}

void ensureMqttConnected() {
  if (mqttClient.connected()) return;
  unsigned long now = millis();
  if (now - lastRetryMs < 1500) return;
  lastRetryMs = now;

  String clientId = "fiware_vine001_wokwi_" + String(random(1000, 9999));
  Serial.print("[MQTT] Conectando ao Broker Real-Time (" + String(MQTT_BROKER) + ")...");
  if (mqttClient.connect(clientId.c_str())) {
    Serial.println("Conectado!");
    mqttClient.subscribe(TOPIC_SUBSCRIBE_CMD);
  } else {
    Serial.println("Falha rc=" + String(mqttClient.state()));
  }
}

// --- Atuadores de Alerta Remoto: LED Azul Piscando + Som por Anomalia ---
void handleRemoteAlertActuators() {
  if (currentAlertMode == "normal") {
    if (ledState) {
      digitalWrite(PIN_LED_BLUE, LOW);
      noTone(PIN_BUZZER);
      ledState = false;
    }
    return;
  }

  unsigned long now = millis();
  unsigned long interval = (currentAlertMode == "multi") ? 180 : 350;

  if (now - lastBlinkMs >= interval) {
    lastBlinkMs = now;
    ledState = !ledState;
    digitalWrite(PIN_LED_BLUE, ledState ? HIGH : LOW);
    soundStep = (soundStep + 1) % 3;

    if (!ledState) {
      noTone(PIN_BUZZER);
      return;
    }

    // Assinatura sonora distinta no Buzzer para cada anomalia detectada no Front-end
    if (currentAlertMode == "temp") {
      tone(PIN_BUZZER, 2000, 160); // Tipo 1 (Temperatura): Bip Agudo 2000 Hz
    } else if (currentAlertMode == "hum") {
      tone(PIN_BUZZER, 850, 240);  // Tipo 2 (Umidade): Pulso Grave 850 Hz
    } else if (currentAlertMode == "lum") {
      int freq = (soundStep % 2 == 0) ? 1200 : 1700;
      tone(PIN_BUZZER, freq, 200); // Tipo 3 (Luminosidade): Sirene Alternada
    } else if (currentAlertMode == "multi") {
      int multiFreqs[3] = {1000, 1800, 2500};
      tone(PIN_BUZZER, multiFreqs[soundStep], 140); // Tipo 4 (Múltipla): Escala Tripla
    }
  }
}

// --- Telemetria Otimizada: Envio Instantâneo por Delta + Heartbeat 1.5s ---
void publishSensorsRealTime() {
  unsigned long now = millis();
  if (now - lastSampleMs < 250) return;
  lastSampleMs = now;

  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  int rawLdr        = analogRead(PIN_LDR);
  float luminosity  = map(rawLdr, 0, 4095, 100, 0);

  if (isnan(temperature) || isnan(humidity)) return;

  bool changed = (fabs(temperature - prevTemp) >= 0.2) ||
                 (fabs(humidity - prevHum) >= 0.5) ||
                 (fabs(luminosity - prevLum) >= 1.0);
  bool heartbeatDue = (now - lastPublishMs >= 1500);

  if (changed || heartbeatDue) {
    prevTemp = temperature;
    prevHum  = humidity;
    prevLum  = luminosity;
    lastPublishMs = now;

    String payload = "t|" + String(temperature, 1) +
                     "|h|" + String(humidity, 1) +
                     "|l|" + String(luminosity, 1);

    mqttClient.publish(TOPIC_PUBLISH_ATTRS, payload.c_str());
    Serial.println("[WOKWI REAL-TIME PUB] " + payload + " | Alerta: " + currentAlertMode);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_BLUE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LDR, INPUT);
  digitalWrite(PIN_LED_BLUE, LOW);

  dht.begin();
  setupWifi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(15);
}

void loop() {
  ensureMqttConnected();
  mqttClient.loop();
  publishSensorsRealTime();
  handleRemoteAlertActuators();
}
