/*
 * ============================================================================
 * CHECK POINT 5 - MONITORAMENTO GLOBAL DE VINHERIAS (WOKWI ESP32 - ZERO LIBS)
 * Compila nativamente no Wokwi SEM precisar instalar bibliotecas externas!
 * Hardware: ESP32 + DHT22 (GPIO 15) + LDR (GPIO 34) + LED Azul (GPIO 2) + Buzzer (GPIO 4)
 * Protocolo: FIWARE Ultralight 2.0 sobre MQTT 3.1.1 Nativo (WiFiClient)
 * ============================================================================
 */

#include <WiFi.h>
#include <math.h>

// --- Rede Wi-Fi Virtual do Simulador Wokwi ---
const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// --- Broker MQTT em Tempo Real (Sincronizado com o Dashboard) ---
const char* MQTT_BROKER   = "broker.hivemq.com";
const int   MQTT_PORT     = 1883;

// --- Tópicos Ultralight 2.0 (Device ID: vine001 | API Key: TEF) ---
const char* TOPIC_PUBLISH_ATTRS  = "/TEF/vine001/attrs";
const char* TOPIC_SUBSCRIBE_CMD  = "/TEF/vine001/cmd";
const char* TOPIC_PUBLISH_CMDEXE = "/TEF/vine001/cmdexe";

// --- Pinos no ESP32 ---
#define PIN_LED_BLUE 2    // LED Azul (Pisca remotamente em anomalia)
#define PIN_BUZZER   4    // Buzzer (Alerta sonoro diferente para cada anomalia)
#define PIN_DHT      15   // Sensor DHT-22 (Temperatura e Umidade)
#define PIN_LDR      34   // Sensor LDR (Luminosidade 0-100%)

WiFiClient espClient;

String currentAlertMode     = "normal"; // "normal", "temp", "hum", "lum", "multi"
unsigned long lastSampleMs  = 0;
unsigned long lastPublishMs = 0;
unsigned long lastBlinkMs   = 0;
unsigned long lastPingMs    = 0;
unsigned long lastRetryMs   = 0;
float prevTemp              = 15.5;
float prevHum               = 68.0;
float prevLum               = -999.0;
bool ledState               = false;
int soundStep               = 0;

// --- Leitor Nativo DHT-22 (Dispensa biblioteca externa DHT.h) ---
bool readDht22Native(float &temperature, float &humidity) {
  uint8_t data[5] = {0, 0, 0, 0, 0};
  pinMode(PIN_DHT, OUTPUT);
  digitalWrite(PIN_DHT, LOW);
  delayMicroseconds(1200);
  digitalWrite(PIN_DHT, HIGH);
  delayMicroseconds(30);
  pinMode(PIN_DHT, INPUT_PULLUP);

  unsigned long t0 = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 200) return false; }
  t0 = micros();
  while (digitalRead(PIN_DHT) == LOW)  { if (micros() - t0 > 200) return false; }
  t0 = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 200) return false; }

  for (int i = 0; i < 40; i++) {
    t0 = micros();
    while (digitalRead(PIN_DHT) == LOW) { if (micros() - t0 > 150) return false; }
    unsigned long highStart = micros();
    while (digitalRead(PIN_DHT) == HIGH) { if (micros() - highStart > 150) break; }
    if ((micros() - highStart) > 40) {
      data[i / 8] |= (1 << (7 - (i % 8)));
    }
  }

  humidity = ((data[0] << 8) | data[1]) * 0.1f;
  temperature = (((data[2] & 0x7F) << 8) | data[3]) * 0.1f;
  if (data[2] & 0x80) temperature = -temperature;
  return true;
}

// --- Publicação MQTT 3.1.1 Nativa sobre WiFiClient (Dispensa PubSubClient.h) ---
void mqttPublish(const char* topic, const String &payload) {
  if (!espClient.connected()) return;
  uint16_t tLen = strlen(topic);
  uint16_t pLen = payload.length();
  uint32_t remLen = 2 + tLen + pLen;

  espClient.write((uint8_t)0x30); // MQTT PUBLISH QoS 0
  do {
    uint8_t enc = remLen % 128;
    remLen /= 128;
    if (remLen > 0) enc |= 128;
    espClient.write(enc);
  } while (remLen > 0);

  espClient.write((uint8_t)(tLen >> 8));
  espClient.write((uint8_t)(tLen & 0xFF));
  espClient.print(topic);
  espClient.print(payload);
}

void mqttSubscribe(const char* topic) {
  uint16_t tLen = strlen(topic);
  uint8_t remLen = 2 + 2 + tLen + 1;
  espClient.write((uint8_t)0x82); // MQTT SUBSCRIBE
  espClient.write(remLen);
  espClient.write((uint8_t)0x00);
  espClient.write((uint8_t)0x01);
  espClient.write((uint8_t)(tLen >> 8));
  espClient.write((uint8_t)(tLen & 0xFF));
  espClient.print(topic);
  espClient.write((uint8_t)0x00); // QoS 0
}

void ensureMqttConnected() {
  if (espClient.connected()) return;
  unsigned long now = millis();
  if (now - lastRetryMs < 2000) return;
  lastRetryMs = now;

  Serial.print("[MQTT] Conectando a " + String(MQTT_BROKER) + "...");
  if (!espClient.connect(MQTT_BROKER, MQTT_PORT)) {
    Serial.println("Falha TCP.");
    return;
  }

  String cid = "wokwi_vine_" + String(random(1000, 9999));
  uint16_t cLen = cid.length();
  uint8_t remLen = 10 + 2 + cLen;
  uint8_t connHdr[12] = {0x10, remLen, 0x00, 0x04, 'M', 'Q', 'T', 'T', 0x04, 0x02, 0x00, 0x1E};
  espClient.write(connHdr, 12);
  espClient.write((uint8_t)(cLen >> 8));
  espClient.write((uint8_t)(cLen & 0xFF));
  espClient.print(cid);

  unsigned long waitStart = millis();
  while (espClient.available() < 4 && (millis() - waitStart) < 1500) { delay(10); }
  while (espClient.available()) { espClient.read(); }

  mqttSubscribe(TOPIC_SUBSCRIBE_CMD);
  Serial.println("Conectado e inscrito em " + String(TOPIC_SUBSCRIBE_CMD));
}

void mqttLoop() {
  if (!espClient.connected()) return;
  if (millis() - lastPingMs > 10000) {
    lastPingMs = millis();
    uint8_t ping[2] = {0xC0, 0x00};
    espClient.write(ping, 2);
  }

  while (espClient.available() >= 2) {
    uint8_t hdr = espClient.read();
    uint32_t remLen = 0;
    uint32_t mult = 1;
    uint8_t enc;
    do {
      if (!espClient.available()) return;
      enc = espClient.read();
      remLen += (enc & 127) * mult;
      mult *= 128;
    } while ((enc & 128) != 0);

    String pkt = "";
    for (uint32_t i = 0; i < remLen; i++) {
      unsigned long t = millis();
      while (!espClient.available() && (millis() - t) < 200) {}
      if (espClient.available()) pkt += (char)espClient.read();
    }

    if ((hdr & 0xF0) == 0x30 && pkt.length() > 2) {
      uint16_t tLen = ((uint8_t)pkt[0] << 8) | (uint8_t)pkt[1];
      if (pkt.length() >= (unsigned int)(2 + tLen)) {
        String message = pkt.substring(2 + tLen);
        Serial.println("[MQTT CMD] Recebido: " + message);
        int pipeIdx = message.indexOf('|');
        if (pipeIdx != -1) {
          currentAlertMode = message.substring(pipeIdx + 1);
          currentAlertMode.trim();
          Serial.println("[ALERTA REMOTO] Modo: " + currentAlertMode);
          mqttPublish(TOPIC_PUBLISH_CMDEXE, "vine001@alert|OK_" + currentAlertMode);
        }
      }
    }
  }
}

void handleRemoteAlertActuators() {
  if (currentAlertMode == "normal") {
    if (ledState) { digitalWrite(PIN_LED_BLUE, LOW); noTone(PIN_BUZZER); ledState = false; }
    return;
  }
  unsigned long now = millis();
  unsigned long interval = (currentAlertMode == "multi") ? 180 : 350;
  if (now - lastBlinkMs >= interval) {
    lastBlinkMs = now;
    ledState = !ledState;
    digitalWrite(PIN_LED_BLUE, ledState ? HIGH : LOW);
    soundStep = (soundStep + 1) % 3;
    if (!ledState) { noTone(PIN_BUZZER); return; }

    if (currentAlertMode == "temp")      tone(PIN_BUZZER, 2000, 160);
    else if (currentAlertMode == "hum")  tone(PIN_BUZZER, 850, 240);
    else if (currentAlertMode == "lum")  tone(PIN_BUZZER, (soundStep % 2 == 0) ? 1200 : 1700, 200);
    else if (currentAlertMode == "multi") {
      int f[3] = {1000, 1800, 2500};
      tone(PIN_BUZZER, f[soundStep], 140);
    }
  }
}

void publishSensorsRealTime() {
  unsigned long now = millis();
  if (now - lastSampleMs < 350) return;
  lastSampleMs = now;

  float temperature = prevTemp, humidity = prevHum;
  readDht22Native(temperature, humidity);
  float luminosity = map(analogRead(PIN_LDR), 0, 4095, 100, 0);

  bool changed = (fabs(temperature - prevTemp) >= 0.2) ||
                 (fabs(humidity - prevHum) >= 0.5) ||
                 (fabs(luminosity - prevLum) >= 1.0);
  if (changed || (now - lastPublishMs >= 1500)) {
    prevTemp = temperature; prevHum = humidity; prevLum = luminosity;
    lastPublishMs = now;
    String payload = "t|" + String(temperature, 1) + "|h|" + String(humidity, 1) + "|l|" + String(luminosity, 1);
    mqttPublish(TOPIC_PUBLISH_ATTRS, payload);
    Serial.println("[WOKWI PUB] " + payload + " | Alerta: " + currentAlertMode);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_BLUE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LDR, INPUT);
  digitalWrite(PIN_LED_BLUE, LOW);

  Serial.print("[WiFi] Conectando ao Wokwi-GUEST");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  while (WiFi.status() != WL_CONNECTED) { delay(100); Serial.print("."); }
  Serial.println("\n[WiFi] Conectado! IP: " + WiFi.localIP().toString());
}

void loop() {
  ensureMqttConnected();
  mqttLoop();
  publishSensorsRealTime();
  handleRemoteAlertActuators();
}
