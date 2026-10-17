/*
 * CHECK POINT 5 - MONITORAMENTO GLOBAL DE VINHERIAS (PROTOTIPO FISICO BARRIL 3D - ESP32)
 * Hardware Barril: ESP32 + Tela Verde LCD 16x2 I2C (21/22) + DHT11/22 (15) + LDR (34) + 3 LEDs + Buzzer (4)
 */
#include <WiFi.h>
#include <Wire.h>
#include <math.h>

const char* WIFI_SSID_PRIMARY    = "FIAP-IOT";
const char* WIFI_PASS_PRIMARY    = "senha_wifi_lab";
const char* MQTT_BROKER          = "broker.hivemq.com";
const int   MQTT_PORT            = 1883;
const char* TOPIC_PUBLISH_ATTRS  = "/TEF/vine001/attrs";
const char* TOPIC_SUBSCRIBE_CMD  = "/TEF/vine001/cmd";
const char* TOPIC_PUBLISH_CMDEXE = "/TEF/vine001/cmdexe";

#define PIN_LED_BLUE  2
#define PIN_BUZZER    4
#define PIN_LED_GREEN 5
#define PIN_DHT       15
#define PIN_LED_RED   18
#define PIN_LDR       34
#define USE_DHT11     1
#define LCD_ADDR      0x27

WiFiClient espClient;
String currentAlertMode = "normal", lastRow0 = "", lastRow1 = "";
unsigned long lastDhtMs = 0, lastLdrMs = 0, lastPublishMs = 0, lastBlinkMs = 0, lastPingMs = 0, lastRetryMs = 0;
float validTemp = 15.5f, validHum = 68.0f, validLum = 12.0f;
float pubTemp = -999.0f, pubHum = -999.0f, pubLum = -999.0f;
bool ledState = false;
int soundStep = 0;

void lcdExpanderWrite(uint8_t data) {
  Wire.beginTransmission(LCD_ADDR); Wire.write(data | 0x08); Wire.endTransmission();
}
void lcdWrite4Bits(uint8_t val) {
  lcdExpanderWrite(val); lcdExpanderWrite(val | 0x04); delayMicroseconds(2);
  lcdExpanderWrite(val & ~0x04); delayMicroseconds(45);
}
void lcdSend(uint8_t val, uint8_t mode) {
  lcdWrite4Bits((val & 0xF0) | mode); lcdWrite4Bits(((val << 4) & 0xF0) | mode);
}
void lcdInit() {
  Wire.begin(21, 22); Wire.setClock(400000); delay(50);
  lcdExpanderWrite(0x00); delay(20);
  lcdWrite4Bits(0x30); delayMicroseconds(4500);
  lcdWrite4Bits(0x30); delayMicroseconds(4500);
  lcdWrite4Bits(0x30); delayMicroseconds(150);
  lcdWrite4Bits(0x20); delayMicroseconds(150);
  lcdSend(0x28, 0); lcdSend(0x0C, 0); lcdSend(0x06, 0); lcdSend(0x01, 0); delay(3);
}
void lcdPrintRow16(uint8_t row, String txt) {
  lcdSend((row == 0) ? 0x80 : 0xC0, 0);
  while (txt.length() < 16) txt += " ";
  if (txt.length() > 16) txt = txt.substring(0, 16);
  for (int i = 0; i < 16; i++) lcdSend((uint8_t)txt[i], 1);
}
void updateGreenScreen() {
  String r0 = "T:" + String(validTemp, 1) + "C U:" + String(validHum, 0) + "%";
  String r1 = "L:" + String(validLum, 0) + "% " + ((currentAlertMode == "normal") ? "ADEGA:OK" : ("ALR:" + currentAlertMode));
  if (r0 != lastRow0) { lastRow0 = r0; lcdPrintRow16(0, r0); }
  if (r1 != lastRow1) { lastRow1 = r1; lcdPrintRow16(1, r1); }
}
bool readDhtPhysicalSafe(float &outTemp, float &outHum) {
  uint8_t data[5] = {0, 0, 0, 0, 0};
  pinMode(PIN_DHT, OUTPUT); digitalWrite(PIN_DHT, LOW); delay(USE_DHT11 ? 18 : 2);
  pinMode(PIN_DHT, INPUT_PULLUP);
  unsigned long t0 = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 200) return false; }
  t0 = micros(); while (digitalRead(PIN_DHT) == LOW)  { if (micros() - t0 > 200) return false; }
  t0 = micros(); while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 200) return false; }
  for (int i = 0; i < 40; i++) {
    t0 = micros(); while (digitalRead(PIN_DHT) == LOW) { if (micros() - t0 > 130) return false; }
    unsigned long highStart = micros();
    while (digitalRead(PIN_DHT) == HIGH) { if (micros() - highStart > 140) return false; }
    if ((micros() - highStart) > 42) data[i / 8] |= (1 << (7 - (i % 8)));
  }
  uint8_t sum = (data[0] + data[1] + data[2] + data[3]) & 0xFF;
  if (sum != data[4] || (data[0] == 0 && data[1] == 0 && data[2] == 0 && data[3] == 0)) return false;
  float h = USE_DHT11 ? ((float)data[0] + (float)data[1] * 0.1f) : (((uint16_t)(data[0] << 8) | data[1]) * 0.1f);
  float t = USE_DHT11 ? ((float)data[2] + (float)(data[3] & 0x7F) * 0.1f) : (((uint16_t)((data[2] & 0x7F) << 8) | data[3]) * 0.1f);
  if (!USE_DHT11 && (data[2] & 0x80)) t = -t;
  if (isnan(t) || isnan(h) || t < -40.0f || t > 80.0f || h < 0.0f || h > 100.0f) return false;
  outTemp = t; outHum = h; return true;
}
void mqttPublish(const char* topic, const String &payload) {
  if (!espClient.connected()) return;
  uint16_t tLen = strlen(topic), pLen = payload.length(); uint32_t remLen = 2 + tLen + pLen;
  espClient.write((uint8_t)0x30);
  do { uint8_t enc = remLen % 128; remLen /= 128; if (remLen > 0) enc |= 128; espClient.write(enc); } while (remLen > 0);
  espClient.write((uint8_t)(tLen >> 8)); espClient.write((uint8_t)(tLen & 0xFF));
  espClient.print(topic); espClient.print(payload);
}
void mqttSubscribe(const char* topic) {
  uint16_t tLen = strlen(topic);
  uint8_t pkt[6] = {0x82, (uint8_t)(5 + tLen), 0x00, 0x01, (uint8_t)(tLen >> 8), (uint8_t)(tLen & 0xFF)};
  espClient.write(pkt, 6); espClient.print(topic); espClient.write((uint8_t)0x00);
}
void applyAlertMode(String mode) {
  mode.trim(); if (mode.length() == 0) return;
  bool changed = (mode != currentAlertMode); currentAlertMode = mode;
  if (currentAlertMode == "normal") {
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_BLUE, LOW);   noTone(PIN_BUZZER); ledState = false;
  } else {
    digitalWrite(PIN_LED_GREEN, LOW);  digitalWrite(PIN_LED_RED, HIGH);
    if (changed) { ledState = false; lastBlinkMs = 0; }
  }
  updateGreenScreen();
}
void ensureMqttConnected() {
  if (WiFi.status() != WL_CONNECTED || espClient.connected()) return;
  unsigned long now = millis(); if (now - lastRetryMs < 1500) return; lastRetryMs = now;
  if (!espClient.connect(MQTT_BROKER, MQTT_PORT)) return;
  espClient.setNoDelay(true);
  String cid = "esp32_box_vine_" + String(random(10000, 99999)); uint16_t cLen = cid.length();
  uint8_t connHdr[12] = {0x10, (uint8_t)(12 + cLen), 0x00, 0x04, 'M', 'Q', 'T', 'T', 0x04, 0x02, 0x00, 0x1E};
  espClient.write(connHdr, 12); espClient.write((uint8_t)(cLen >> 8)); espClient.write((uint8_t)(cLen & 0xFF)); espClient.print(cid);
  unsigned long t0 = millis(); while (espClient.available() < 4 && (millis() - t0) < 1200) { delay(5); }
  for (int i = 0; i < 4 && espClient.available(); i++) espClient.read();
  mqttSubscribe(TOPIC_SUBSCRIBE_CMD);
}
void mqttLoop() {
  if (!espClient.connected()) return;
  if (millis() - lastPingMs > 8000) { lastPingMs = millis(); uint8_t ping[2] = {0xC0, 0x00}; espClient.write(ping, 2); }
  while (espClient.available() >= 2) {
    uint8_t hdr = espClient.read(), enc = 0; uint32_t remLen = 0, mult = 1;
    do {
      unsigned long t0 = millis(); while (!espClient.available() && (millis() - t0) < 150) { delay(1); }
      if (!espClient.available()) return;
      enc = espClient.read(); remLen += (enc & 127) * mult; mult *= 128;
    } while ((enc & 128) != 0);
    uint8_t pkt[256]; uint16_t idx = 0;
    for (uint32_t i = 0; i < remLen; i++) {
      unsigned long t0 = millis(); while (!espClient.available() && (millis() - t0) < 150) { delay(1); }
      if (espClient.available()) { uint8_t b = espClient.read(); if (idx < 255) pkt[idx++] = b; }
    }
    pkt[idx] = 0;
    if ((hdr & 0xF0) == 0x30 && idx > 2) {
      uint16_t tLen = ((uint16_t)pkt[0] << 8) | pkt[1];
      if (idx >= (uint16_t)(2 + tLen)) {
        String msg = String((char*)(pkt + 2 + tLen)); int pipeIdx = msg.indexOf('|');
        applyAlertMode((pipeIdx != -1) ? msg.substring(pipeIdx + 1) : msg);
        mqttPublish(TOPIC_PUBLISH_CMDEXE, "vine001@alert|OK_" + currentAlertMode);
      }
    }
  }
}
void handleRemoteAlertActuators() {
  if (currentAlertMode == "normal") {
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_RED, LOW);
    if (ledState) { digitalWrite(PIN_LED_BLUE, LOW); noTone(PIN_BUZZER); ledState = false; }
    return;
  }
  digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_RED, HIGH);
  unsigned long now = millis(), interval = (currentAlertMode == "multi") ? 180 : 320;
  if (lastBlinkMs == 0 || (now - lastBlinkMs >= interval)) {
    lastBlinkMs = (now == 0) ? 1 : now; ledState = !ledState;
    digitalWrite(PIN_LED_BLUE, ledState ? HIGH : LOW); soundStep = (soundStep + 1) % 3;
    if (!ledState) { noTone(PIN_BUZZER); return; }
    if (currentAlertMode == "temp")       tone(PIN_BUZZER, 2000, 150);
    else if (currentAlertMode == "hum")   tone(PIN_BUZZER, 850, 220);
    else if (currentAlertMode == "lum")   tone(PIN_BUZZER, (soundStep % 2 == 0) ? 1200 : 1700, 180);
    else if (currentAlertMode == "multi") { int f[3] = {1000, 1800, 2500}; tone(PIN_BUZZER, f[soundStep], 130); }
  }
}
void publishSensorsRealTime() {
  unsigned long now = millis();
  if (now - lastDhtMs >= 1500) { lastDhtMs = now; readDhtPhysicalSafe(validTemp, validHum); }
  if (now - lastLdrMs >= 250) {
    lastLdrMs = now; float rawLum = map(analogRead(PIN_LDR), 0, 4095, 0, 100);
    if (rawLum >= 0.0f && rawLum <= 100.0f) validLum = rawLum;
  }
  bool changed = (fabs(validTemp - pubTemp) >= 0.2f) || (fabs(validHum - pubHum) >= 0.5f) || (fabs(validLum - pubLum) >= 1.0f);
  if (changed || (now - lastPublishMs >= 1500)) {
    pubTemp = validTemp; pubHum = validHum; pubLum = validLum; lastPublishMs = now;
    mqttPublish(TOPIC_PUBLISH_ATTRS, "t|" + String(validTemp, 1) + "|h|" + String(validHum, 1) + "|l|" + String(validLum, 1));
    updateGreenScreen();
  }
}
void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_GREEN, OUTPUT); pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);  pinMode(PIN_BUZZER, OUTPUT); pinMode(PIN_LDR, INPUT);
  digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_RED, LOW); digitalWrite(PIN_LED_BLUE, LOW);
  lcdInit(); updateGreenScreen();
  WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID_PRIMARY, WIFI_PASS_PRIMARY);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - t0) < 8000) { delay(100); }
  if (WiFi.status() != WL_CONNECTED) WiFi.begin("Wokwi-GUEST", "", 6);
  while (WiFi.status() != WL_CONNECTED) { delay(100); }
}
void loop() {
  ensureMqttConnected(); mqttLoop(); handleRemoteAlertActuators(); publishSensorsRealTime(); delay(10);
}
