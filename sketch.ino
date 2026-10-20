// CP5 VINHERIA AGNELLO · ESP32 WOKWI MQTT ULTRA-FLUIDO (:1883)
#include <WiFi.h>
#include <Wire.h>
#include <math.h>

const char *WIFI_SSID = "Wokwi-GUEST", *WIFI_PASSWORD = "", *MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char *TOPIC_ATTRS = "/TEF/vine001/attrs", *TOPIC_CMD = "/TEF/vine001/cmd", *TOPIC_CMDEXE = "/TEF/vine001/cmdexe";

enum Pins { PIN_LED_BLUE = 2, PIN_BUZZER = 4, PIN_LED_GREEN = 5, PIN_DHT = 15, PIN_LED_RED = 18, PIN_LDR = 34, LCD_ADDR = 0x27 };

WiFiClient espClient;
String curMode = "normal", curPreset = "TINTO", curVerdict = "OK", lastR0 = "", lastR1 = "";
int curHealth = 100, soundStep = 0;
bool ledState = false, remoteSync = false;
unsigned long lastDhtMs = 0, lastLdrMs = 0, lastPubMs = 0, lastBlinkMs = 0, lastPingMs = 0, lastRetryMs = 0;
float validTemp = 15.5f, validHum = 68.0f, validLum = 12.0f, hwTemp = 15.5f, hwHum = 68.0f, hwLum = 12.0f;

void lcdExpanderWrite(uint8_t d) { Wire.beginTransmission(LCD_ADDR); Wire.write(d | 0x08); Wire.endTransmission(); }
void lcdWrite4(uint8_t v) { lcdExpanderWrite(v); lcdExpanderWrite(v | 0x04); delayMicroseconds(2); lcdExpanderWrite(v & ~0x04); delayMicroseconds(40); }
void lcdSend(uint8_t v, uint8_t m) { lcdWrite4((v & 0xF0) | m); lcdWrite4(((v << 4) & 0xF0) | m); }
void lcdInit() {
  Wire.begin(21, 22); Wire.setClock(400000); delay(40); lcdExpanderWrite(0x00); delay(15);
  lcdWrite4(0x30); delayMicroseconds(4500); lcdWrite4(0x30); delayMicroseconds(4500);
  lcdWrite4(0x30); delayMicroseconds(150);  lcdWrite4(0x20); delayMicroseconds(150);
  lcdSend(0x28, 0); lcdSend(0x0C, 0); lcdSend(0x06, 0); lcdSend(0x01, 0); delay(3);
}
void lcdPrint(uint8_t row, String txt) {
  lcdSend((row == 0) ? 0x80 : 0xC0, 0);
  while (txt.length() < 16) txt += " ";
  if (txt.length() > 16) txt = txt.substring(0, 16);
  for (int i = 0; i < 16; i++) lcdSend((uint8_t)txt[i], 1);
}
void updateLcd() {
  String r0 = "T:" + String(validTemp, 1) + "C U:" + String(validHum, 0) + "%" + (remoteSync ? " *" : "");
  String r1 = "L:" + String((int)validLum) + "% ";
  if (curMode == "normal") {
    r1 += curPreset + " " + String(curHealth) + "%";
  } else {
    r1 += "ALR:" + curMode.substring(0, 4) + " " + String(curHealth) + "%";
  }
  if (r0 != lastR0) { lastR0 = r0; lcdPrint(0, r0); }
  if (r1 != lastR1) { lastR1 = r1; lcdPrint(1, r1); }
}
bool readDht22(float &tOut, float &hOut) {
  uint8_t d[5] = {0, 0, 0, 0, 0};
  pinMode(PIN_DHT, OUTPUT); digitalWrite(PIN_DHT, LOW); delayMicroseconds(1100);
  pinMode(PIN_DHT, INPUT_PULLUP);
  unsigned long t0 = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 180) return false; }
  t0 = micros(); while (digitalRead(PIN_DHT) == LOW)  { if (micros() - t0 > 180) return false; }
  t0 = micros(); while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 180) return false; }
  for (int i = 0; i < 40; i++) {
    t0 = micros(); while (digitalRead(PIN_DHT) == LOW) { if (micros() - t0 > 120) return false; }
    unsigned long hStart = micros();
    while (digitalRead(PIN_DHT) == HIGH) { if (micros() - hStart > 130) return false; }
    if ((micros() - hStart) > 40) d[i / 8] |= (1 << (7 - (i % 8)));
  }
  uint8_t sum = (d[0] + d[1] + d[2] + d[3]) & 0xFF;
  if (sum != d[4] || (d[0] == 0 && d[1] == 0 && d[2] == 0 && d[3] == 0)) return false;
  float h = ((uint16_t)(d[0] << 8) | d[1]) * 0.1f, t = ((uint16_t)((d[2] & 0x7F) << 8) | d[3]) * 0.1f;
  if (d[2] & 0x80) t = -t;
  if (isnan(t) || isnan(h) || t < -40.0f || t > 80.0f || h < 0.0f || h > 100.0f) return false;
  tOut = t; hOut = h; return true;
}
void mqttPub(const char* top, const String &pl) {
  if (!espClient.connected()) return;
  uint16_t tl = strlen(top), plLen = pl.length(); uint32_t rem = 2 + tl + plLen;
  espClient.write((uint8_t)0x30);
  do { uint8_t enc = rem % 128; rem /= 128; if (rem > 0) enc |= 128; espClient.write(enc); } while (rem > 0);
  espClient.write((uint8_t)(tl >> 8)); espClient.write((uint8_t)(tl & 0xFF));
  espClient.print(top); espClient.print(pl);
}
void mqttSub(const char* top) {
  uint16_t tl = strlen(top);
  uint8_t pkt[6] = {0x82, (uint8_t)(5 + tl), 0x00, 0x01, (uint8_t)(tl >> 8), (uint8_t)(tl & 0xFF)};
  espClient.write(pkt, 6); espClient.print(top); espClient.write((uint8_t)0x00);
}
void applyCommand(String msg) {
  int at = msg.indexOf('@'); if (at != -1) msg = msg.substring(at + 1);
  int sep = msg.indexOf('|'); if (sep == -1) return;
  String cmd = msg.substring(0, sep), args = msg.substring(sep + 1), prev = curMode;
  if (cmd == "live") {
    remoteSync = false; validTemp = hwTemp; validHum = hwHum; validLum = hwLum;
  } else if (cmd == "sync") {
    int p1 = args.indexOf('|'), p2 = args.lastIndexOf('|');
    if (p1 != -1 && p2 > p1) {
      validTemp = args.substring(0, p1).toFloat();
      validHum  = args.substring(p1 + 1, p2).toFloat();
      validLum  = args.substring(p2 + 1).toFloat();
      remoteSync = true;
    }
  } else if (cmd == "diag") {
    int p1 = args.indexOf('|');
    if (p1 != -1) {
      curMode = args.substring(0, p1); String rest = args.substring(p1 + 1);
      int p2 = rest.indexOf('|');
      if (p2 != -1) {
        curHealth = rest.substring(0, p2).toInt(); String rest2 = rest.substring(p2 + 1);
        int p3 = rest2.indexOf('|');
        if (p3 != -1) { curVerdict = rest2.substring(0, p3); curPreset = rest2.substring(p3 + 1); }
      }
    }
  } else if (cmd == "alert") {
    int p1 = args.indexOf('|'); curMode = (p1 != -1) ? args.substring(0, p1) : args;
  }
  curMode.trim(); if (curMode.length() == 0) curMode = "normal";
  if (curMode == "normal") {
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_BLUE, LOW); noTone(PIN_BUZZER); ledState = false;
    if (prev != "normal") { tone(PIN_BUZZER, 1046, 80); }
  } else {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_RED, HIGH);
  }
  updateLcd();
}
void checkMqtt() {
  if (espClient.connected()) return;
  unsigned long now = millis(); if (now - lastRetryMs < 2000) return; lastRetryMs = now;
  if (!espClient.connect(MQTT_BROKER, MQTT_PORT)) return;
  espClient.setNoDelay(true);
  String cid = "wokwi_v_" + String(random(10000, 99999)); uint16_t cLen = cid.length();
  uint8_t hdr[12] = {0x10, (uint8_t)(12 + cLen), 0x00, 0x04, 'M', 'Q', 'T', 'T', 0x04, 0x02, 0x00, 0x1E};
  espClient.write(hdr, 12); espClient.write((uint8_t)(cLen >> 8)); espClient.write((uint8_t)(cLen & 0xFF)); espClient.print(cid);
  unsigned long t0 = millis(); while (espClient.available() < 4 && (millis() - t0) < 800) yield();
  for (int i = 0; i < 4 && espClient.available(); i++) espClient.read();
  mqttSub(TOPIC_CMD);
}
void mqttLoop() {
  if (!espClient.connected()) return;
  if (millis() - lastPingMs > 8000) { lastPingMs = millis(); uint8_t p[2] = {0xC0, 0x00}; espClient.write(p, 2); }
  while (espClient.available() >= 2) {
    uint8_t hdr = espClient.read(), enc = 0; uint32_t rem = 0, mult = 1;
    do {
      if (!espClient.available()) return;
      enc = espClient.read(); rem += (enc & 127) * mult; mult *= 128;
    } while ((enc & 128) != 0);
    uint8_t pkt[256]; uint16_t idx = 0;
    while (idx < rem && idx < 255 && espClient.available()) {
      pkt[idx++] = espClient.read();
    }
    pkt[idx] = 0;
    if ((hdr & 0xF0) == 0x30 && idx > 2) {
      uint16_t tl = ((uint16_t)pkt[0] << 8) | pkt[1];
      if (idx >= (uint16_t)(2 + tl)) {
        applyCommand(String((char*)(pkt + 2 + tl)));
        mqttPub(TOPIC_CMDEXE, "vine001@ack|OK");
      }
    }
  }
}
void handleActuators() {
  if (curMode == "normal") {
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_RED, LOW);
    if (ledState) { digitalWrite(PIN_LED_BLUE, LOW); noTone(PIN_BUZZER); ledState = false; }
    return;
  }
  digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_RED, HIGH);
  unsigned long now = millis(), iv = (curMode == "multi") ? 160 : 300;
  if (lastBlinkMs == 0 || (now - lastBlinkMs >= iv)) {
    lastBlinkMs = (now == 0) ? 1 : now; ledState = !ledState;
    digitalWrite(PIN_LED_BLUE, ledState ? HIGH : LOW); soundStep = (soundStep + 1) % 4;
    if (!ledState) { noTone(PIN_BUZZER); return; }
    if (curMode == "temp") tone(PIN_BUZZER, (soundStep % 2 == 0) ? 2200 : 1800, 130);
    else if (curMode == "hum") tone(PIN_BUZZER, (soundStep % 2 == 0) ? 740 : 880, 180);
    else if (curMode == "lum") tone(PIN_BUZZER, (soundStep % 2 == 0) ? 1320 : 1650, 140);
    else if (curMode == "multi") { int f[4] = {880, 1320, 1760, 2200}; tone(PIN_BUZZER, f[soundStep], 110); }
  }
}
void readAndPubSensors() {
  unsigned long now = millis(); float t = hwTemp, h = hwHum, l = hwLum;
  if (now - lastDhtMs >= 1400) { lastDhtMs = now; readDht22(t, h); }
  if (now - lastLdrMs >= 200) {
    lastLdrMs = now; float rl = map(analogRead(PIN_LDR), 0, 4095, 100, 0);
    if (rl >= 0.0f && rl <= 100.0f) l = rl;
  }
  bool moved = (fabs(t - hwTemp) >= 0.2f) || (fabs(h - hwHum) >= 0.5f) || (fabs(l - hwLum) >= 1.0f);
  if (moved) { hwTemp = t; hwHum = h; hwLum = l; remoteSync = false; }
  if (!remoteSync) { validTemp = hwTemp; validHum = hwHum; validLum = hwLum; }
  if (moved || (now - lastPubMs >= 1500)) {
    lastPubMs = now;
    String rFlag = remoteSync ? "|r|1" : "|r|0";
    mqttPub(TOPIC_ATTRS, "t|" + String(validTemp, 1) + "|h|" + String(validHum, 1) + "|l|" + String(validLum, 1) + rFlag);
    updateLcd();
  }
}
void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_GREEN, OUTPUT); pinMode(PIN_LED_RED, OUTPUT); pinMode(PIN_LED_BLUE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT); pinMode(PIN_LDR, INPUT);
  digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_RED, LOW); digitalWrite(PIN_LED_BLUE, LOW);
  lcdInit(); updateLcd(); WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  tone(PIN_BUZZER, 523, 70); delay(80); tone(PIN_BUZZER, 659, 70); delay(80); tone(PIN_BUZZER, 784, 100);
  while (WiFi.status() != WL_CONNECTED) delay(60);
}
void loop() { checkMqtt(); mqttLoop(); handleActuators(); readAndPubSensors(); delay(2); }
