/*
 * CHECK POINT 5 - MONITORAMENTO GLOBAL DE VINHERIAS (WOKWI ESP32 - ZERO LIBS)
 * Hardware: ESP32 + DHT22 (GPIO 15) + LDR (GPIO 34) + LED Azul (GPIO 2) + Buzzer (GPIO 4)
 * Protocolo: FIWARE Ultralight 2.0 sobre MQTT 3.1.1 Binário Nativo (WiFiClient)
 */

#include <WiFi.h>
#include <math.h>

const char* WIFI_SSID            = "Wokwi-GUEST";
const char* WIFI_PASSWORD        = "";
const char* MQTT_BROKER          = "broker.hivemq.com";
const int   MQTT_PORT            = 1883;
const char* TOPIC_PUBLISH_ATTRS  = "/TEF/vine001/attrs";
const char* TOPIC_SUBSCRIBE_CMD  = "/TEF/vine001/cmd";
const char* TOPIC_PUBLISH_CMDEXE = "/TEF/vine001/cmdexe";

#define PIN_LED_BLUE 2
#define PIN_BUZZER   4
#define PIN_DHT      15
#define PIN_LDR      34

WiFiClient espClient;
String currentAlertMode = "normal";
unsigned long lastDhtMs = 0, lastLdrMs = 0, lastPublishMs = 0, lastBlinkMs = 0, lastPingMs = 0, lastRetryMs = 0;
float validTemp = 15.5f, validHum = 68.0f, validLum = 12.0f;
float pubTemp = -999.0f, pubHum = -999.0f, pubLum = -999.0f;
bool ledState = false;
int soundStep = 0;

// Leitor Nativo DHT-22 com Checksum 8-bit e Proteção contra Escala (-40..80 C / 0..100 %)
bool readDht22Safe(float &outTemp, float &outHum) {
  uint8_t data[5] = {0, 0, 0, 0, 0};
  pinMode(PIN_DHT, OUTPUT);
  digitalWrite(PIN_DHT, LOW);
  delayMicroseconds(1150);
  pinMode(PIN_DHT, INPUT_PULLUP);

  unsigned long t0 = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 200) return false; }
  t0 = micros();
  while (digitalRead(PIN_DHT) == LOW)  { if (micros() - t0 > 200) return false; }
  t0 = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 200) return false; }

  for (int i = 0; i < 40; i++) {
    t0 = micros();
    while (digitalRead(PIN_DHT) == LOW) { if (micros() - t0 > 130) return false; }
    unsigned long highStart = micros();
    while (digitalRead(PIN_DHT) == HIGH) { if (micros() - highStart > 140) return false; }
    if ((micros() - highStart) > 42) data[i / 8] |= (1 << (7 - (i % 8)));
  }

  uint8_t sum = (data[0] + data[1] + data[2] + data[3]) & 0xFF;
  if (sum != data[4] || (data[0] == 0 && data[1] == 0 && data[2] == 0 && data[3] == 0)) return false;

  float h = ((uint16_t)(data[0] << 8) | data[1]) * 0.1f;
  float t = ((uint16_t)((data[2] & 0x7F) << 8) | data[3]) * 0.1f;
  if (data[2] & 0x80) t = -t;
  if (isnan(t) || isnan(h) || t < -40.0f || t > 80.0f || h < 0.0f || h > 100.0f) return false;

  outTemp = t;
  outHum  = h;
  return true;
}

void mqttPublish(const char* topic, const String &payload) {
  if (!espClient.connected()) return;
  uint16_t tLen = strlen(topic), pLen = payload.length();
  uint32_t remLen = 2 + tLen + pLen;
  espClient.write((uint8_t)0x30);
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
  uint8_t pkt[6] = {0x82, (uint8_t)(5 + tLen), 0x00, 0x01, (uint8_t)(tLen >> 8), (uint8_t)(tLen & 0xFF)};
  espClient.write(pkt, 6);
  espClient.print(topic);
  espClient.write((uint8_t)0x00);
}

void applyAlertMode(String mode) {
  mode.trim();
  if (mode.length() == 0) return;
  bool changed = (mode != currentAlertMode);
  currentAlertMode = mode;
  if (currentAlertMode == "normal") {
    digitalWrite(PIN_LED_BLUE, LOW);
    noTone(PIN_BUZZER);
    ledState = false;
  } else if (changed) {
    ledState = false;
    lastBlinkMs = 0;
  }
}

void ensureMqttConnected() {
  if (espClient.connected()) return;
  unsigned long now = millis();
  if (now - lastRetryMs < 1500) return;
  lastRetryMs = now;
  if (!espClient.connect(MQTT_BROKER, MQTT_PORT)) return;
  espClient.setNoDelay(true);

  String cid = "wokwi_vine_" + String(random(10000, 99999));
  uint16_t cLen = cid.length();
  uint8_t connHdr[12] = {0x10, (uint8_t)(12 + cLen), 0x00, 0x04, 'M', 'Q', 'T', 'T', 0x04, 0x02, 0x00, 0x1E};
  espClient.write(connHdr, 12);
  espClient.write((uint8_t)(cLen >> 8));
  espClient.write((uint8_t)(cLen & 0xFF));
  espClient.print(cid);

  unsigned long t0 = millis();
  while (espClient.available() < 4 && (millis() - t0) < 1200) { delay(5); }
  for (int i = 0; i < 4 && espClient.available(); i++) espClient.read();
  mqttSubscribe(TOPIC_SUBSCRIBE_CMD);
  Serial.println("[MQTT] Sincronizado em " + String(TOPIC_SUBSCRIBE_CMD));
}

void mqttLoop() {
  if (!espClient.connected()) return;
  if (millis() - lastPingMs > 8000) {
    lastPingMs = millis();
    uint8_t ping[2] = {0xC0, 0x00};
    espClient.write(ping, 2);
  }
  while (espClient.available() >= 2) {
    uint8_t hdr = espClient.read(), enc = 0;
    uint32_t remLen = 0, mult = 1;
    do {
      unsigned long t0 = millis();
      while (!espClient.available() && (millis() - t0) < 150) { delay(1); }
      if (!espClient.available()) return;
      enc = espClient.read();
      remLen += (enc & 127) * mult;
      mult *= 128;
    } while ((enc & 128) != 0);

    uint8_t pkt[256];
    uint16_t idx = 0;
    for (uint32_t i = 0; i < remLen; i++) {
      unsigned long t0 = millis();
      while (!espClient.available() && (millis() - t0) < 150) { delay(1); }
      if (espClient.available()) {
        uint8_t b = espClient.read();
        if (idx < 255) pkt[idx++] = b;
      }
    }
    pkt[idx] = 0;

    if ((hdr & 0xF0) == 0x30 && idx > 2) {
      uint16_t tLen = ((uint16_t)pkt[0] << 8) | pkt[1];
      if (idx >= (uint16_t)(2 + tLen)) {
        String msg = String((char*)(pkt + 2 + tLen));
        int pipeIdx = msg.indexOf('|');
        String cmd = (pipeIdx != -1) ? msg.substring(pipeIdx + 1) : msg;
        applyAlertMode(cmd);
        mqttPublish(TOPIC_PUBLISH_CMDEXE, "vine001@alert|OK_" + currentAlertMode);
      }
    }
  }
}

void handleRemoteAlertActuators() {
  if (currentAlertMode == "normal") {
    if (ledState) { digitalWrite(PIN_LED_BLUE, LOW); noTone(PIN_BUZZER); ledState = false; }
    return;
  }
  unsigned long now = millis(), interval = (currentAlertMode == "multi") ? 180 : 320;
  if (lastBlinkMs == 0 || (now - lastBlinkMs >= interval)) {
    lastBlinkMs = (now == 0) ? 1 : now;
    ledState = !ledState;
    digitalWrite(PIN_LED_BLUE, ledState ? HIGH : LOW);
    soundStep = (soundStep + 1) % 3;
    if (!ledState) { noTone(PIN_BUZZER); return; }
    if (currentAlertMode == "temp")       tone(PIN_BUZZER, 2000, 150);
    else if (currentAlertMode == "hum")   tone(PIN_BUZZER, 850, 220);
    else if (currentAlertMode == "lum")   tone(PIN_BUZZER, (soundStep % 2 == 0) ? 1200 : 1700, 180);
    else if (currentAlertMode == "multi") { int f[3] = {1000, 1800, 2500}; tone(PIN_BUZZER, f[soundStep], 130); }
  }
}

void publishSensorsRealTime() {
  unsigned long now = millis();
  if (now - lastDhtMs >= 1400) { lastDhtMs = now; readDht22Safe(validTemp, validHum); }
  if (now - lastLdrMs >= 250) {
    lastLdrMs = now;
    float rawLum = map(analogRead(PIN_LDR), 0, 4095, 100, 0);
    if (rawLum >= 0.0f && rawLum <= 100.0f) validLum = rawLum;
  }
  bool changed = (fabs(validTemp - pubTemp) >= 0.2f) || (fabs(validHum - pubHum) >= 0.5f) || (fabs(validLum - pubLum) >= 1.0f);
  if (changed || (now - lastPublishMs >= 1500)) {
    pubTemp = validTemp; pubHum = validHum; pubLum = validLum; lastPublishMs = now;
    mqttPublish(TOPIC_PUBLISH_ATTRS, "t|" + String(validTemp, 1) + "|h|" + String(validHum, 1) + "|l|" + String(validLum, 1));
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_BLUE, OUTPUT); pinMode(PIN_BUZZER, OUTPUT); pinMode(PIN_LDR, INPUT);
  digitalWrite(PIN_LED_BLUE, LOW);
  WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  while (WiFi.status() != WL_CONNECTED) { delay(80); }
  Serial.println("[WiFi] Wokwi Conectado! IP: " + WiFi.localIP().toString());
}

void loop() {
  ensureMqttConnected();
  mqttLoop();
  handleRemoteAlertActuators();
  publishSensorsRealTime();
  delay(10);
}
