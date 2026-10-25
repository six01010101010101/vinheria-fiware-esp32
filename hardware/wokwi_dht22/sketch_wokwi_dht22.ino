// CP5 VINHERIA AGNELLO · ESP32 WOKWI SOMMELIER IOT ARCADE (:1883) — ULTRA-LOW LATENCY 3-STATE ENGINE
#include <WiFi.h>
#include <Wire.h>
#include <math.h>

const char *WIFI_SSID = "Wokwi-GUEST", *WIFI_PASS = "", *MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char *TOPIC_ATTRS = "/TEF/vine001/attrs", *TOPIC_CMD = "/TEF/vine001/cmd", *TOPIC_CMDEXE = "/TEF/vine001/cmdexe";

enum Pins { PIN_LED_BLUE = 2, PIN_BUZZER = 4, PIN_LED_GREEN = 5, PIN_DHT = 15, PIN_LED_RED = 18, PIN_LDR = 34, LCD_ADDR = 0x27 };

const uint8_t CHAR_COIN[8]={0x0E,0x1F,0x15,0x15,0x15,0x1F,0x0E,0x00}, CHAR_DROP[8]={0x04,0x04,0x0A,0x11,0x11,0x11,0x0E,0x00}, CHAR_STAR[8]={0x04,0x15,0x0E,0x1F,0x0E,0x15,0x04,0x00};

WiFiClient espClient;
String curMode = "normal", curPreset = "TINTO", curVerdict = "OK";
int curHealth = 100, soundStep = 0;
bool ledState = false, remoteSync = false;
unsigned long lastDhtMs = 0, lastLdrMs = 0, lastPubMs = 0, lastBlinkMs = 0, lastPingMs = 0, lastRetryMs = 0;
float validTemp = 15.8f, validHum = 68.0f, validLum = 9.0f, hwTemp = 15.8f, hwHum = 68.0f, hwLum = 9.0f;

void lcdExpanderWrite(uint8_t d) { Wire.beginTransmission(LCD_ADDR); Wire.write(d | 0x08); Wire.endTransmission(); }
void lcdWrite4(uint8_t v) { lcdExpanderWrite(v); lcdExpanderWrite(v | 0x04); delayMicroseconds(2); lcdExpanderWrite(v & ~0x04); delayMicroseconds(40); }
void lcdSend(uint8_t v, uint8_t m) { lcdWrite4((v & 0xF0) | m); lcdWrite4(((v << 4) & 0xF0) | m); }
void lcdCreateChar(uint8_t loc, const uint8_t map[8]) { lcdSend(0x40 | ((loc & 0x7) << 3), 0); for (int i = 0; i < 8; i++) lcdSend(map[i], 1); lcdSend(0x80, 0); }
void lcdInit() {
  Wire.begin(21, 22); Wire.setClock(400000); delay(40); lcdExpanderWrite(0x00); delay(15);
  lcdWrite4(0x30); delayMicroseconds(4500); lcdWrite4(0x30); delayMicroseconds(4500);
  lcdWrite4(0x30); delayMicroseconds(150);  lcdWrite4(0x20); delayMicroseconds(150);
  lcdSend(0x28, 0); lcdSend(0x0C, 0); lcdSend(0x06, 0); lcdSend(0x01, 0); delay(3);
  lcdCreateChar(0, CHAR_COIN); lcdCreateChar(1, CHAR_DROP); lcdCreateChar(2, CHAR_STAR);
}
void updateLcd() {
  lcdSend(0x80, 0); lcdSend(0x00, 1); lcdSend(' ', 1);
  String tStr = String(validTemp, 1) + (char)223 + "C ";
  for (int i = 0; i < tStr.length(); i++) lcdSend((uint8_t)tStr[i], 1);
  lcdSend(0x01, 1); lcdSend(' ', 1);
  String hStr = String((int)validHum) + "%" + (remoteSync ? " *" : "");
  for (int i = 0; i < hStr.length(); i++) lcdSend((uint8_t)hStr[i], 1);
  for (int i = 0; i < 16 - (4 + tStr.length() + hStr.length()); i++) lcdSend(' ', 1);

  lcdSend(0xC0, 0); lcdSend(0x02, 1); lcdSend(' ', 1);
  String lStr = String((int)validLum) + "% ";
  for (int i = 0; i < lStr.length(); i++) lcdSend((uint8_t)lStr[i], 1);
  String tag = (curMode == "normal") ? "1UP:" : ((curMode == "padrao") ? "PAD:" : "CRT:");
  String stat = curPreset.substring(0, 5) + " " + tag + String(curHealth) + "%";
  if (stat.length() > 11) stat = stat.substring(0, 11);
  for (int i = 0; i < stat.length(); i++) lcdSend((uint8_t)stat[i], 1);
  for (int i = 0; i < 16 - (2 + lStr.length() + stat.length()); i++) lcdSend(' ', 1);
}
bool readDht22(float &tOut, float &hOut) {
  uint8_t d[5] = {0, 0, 0, 0, 0}; pinMode(PIN_DHT, OUTPUT); digitalWrite(PIN_DHT, LOW); delayMicroseconds(1100);
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
  uint16_t tl = strlen(top); uint8_t pkt[6] = {0x82, (uint8_t)(5 + tl), 0x00, 0x01, (uint8_t)(tl >> 8), (uint8_t)(tl & 0xFF)};
  espClient.write(pkt, 6); espClient.print(top); espClient.write((uint8_t)0x00);
}
void applyCommand(String msg) {
  int at = msg.indexOf('@'); if (at != -1) msg = msg.substring(at + 1);
  String prev = curMode, prevPr = curPreset; int sep = msg.indexOf('|');
  if (sep == -1) {
    msg.trim();
    if (msg == "normal" || msg == "padrao" || msg == "multi" || msg == "critico") curMode = (msg == "critico") ? "multi" : msg;
    else { curPreset = msg; curPreset.toUpperCase(); }
  } else {
    String cmd = msg.substring(0, sep), args = msg.substring(sep + 1);
    if (cmd == "live") { remoteSync = false; validTemp = hwTemp; validHum = hwHum; validLum = hwLum; }
    else if (cmd == "state") {
      int p1 = args.indexOf('|'), p2 = args.indexOf('|', p1 + 1), p3 = args.indexOf('|', p2 + 1);
      int p4 = args.indexOf('|', p3 + 1), p5 = args.indexOf('|', p4 + 1), p6 = args.indexOf('|', p5 + 1);
      if (p1 != -1 && p2 != -1 && p3 != -1 && p4 != -1 && p5 != -1 && p6 != -1) {
        validTemp = args.substring(0, p1).toFloat(); validHum = args.substring(p1 + 1, p2).toFloat(); validLum = args.substring(p2 + 1, p3).toFloat();
        curMode = args.substring(p3 + 1, p4); curHealth = args.substring(p4 + 1, p5).toInt();
        curVerdict = args.substring(p5 + 1, p6); curPreset = args.substring(p6 + 1); remoteSync = true;
      }
    } else if (cmd == "sync") {
      int p1 = args.indexOf('|'), p2 = args.lastIndexOf('|');
      if (p1 != -1 && p2 > p1) { validTemp = args.substring(0, p1).toFloat(); validHum = args.substring(p1 + 1, p2).toFloat(); validLum = args.substring(p2 + 1).toFloat(); remoteSync = true; }
    } else if (cmd == "diag") {
      int p1 = args.indexOf('|');
      if (p1 != -1) {
        curMode = args.substring(0, p1); String rest = args.substring(p1 + 1); int p2 = rest.indexOf('|');
        if (p2 != -1) { curHealth = rest.substring(0, p2).toInt(); String rest2 = rest.substring(p2 + 1); int p3 = rest2.indexOf('|'); if (p3 != -1) { curVerdict = rest2.substring(0, p3); curPreset = rest2.substring(p3 + 1); } }
      }
    } else if (cmd == "alert") { int p1 = args.indexOf('|'); curMode = (p1 != -1) ? args.substring(0, p1) : args; }
    else if (cmd == "preset" || cmd == "wine") { curPreset = args; curPreset.toUpperCase(); }
  }
  curMode.trim(); if (curMode == "critico") curMode = "multi"; if (curMode.length() == 0) curMode = "normal";
  bool chg = (prev != curMode) || (prevPr != curPreset);
  if (curMode == "normal") {
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_BLUE, LOW); digitalWrite(PIN_LED_RED, LOW); noTone(PIN_BUZZER);
    if (chg) tone(PIN_BUZZER, 1319, 60);
  } else if (curMode == "padrao") {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_BLUE, HIGH); digitalWrite(PIN_LED_RED, LOW); noTone(PIN_BUZZER);
    if (chg) tone(PIN_BUZZER, 784, 55);
  } else {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_BLUE, LOW); digitalWrite(PIN_LED_RED, HIGH);
    if (chg) tone(PIN_BUZZER, 1480, 120);
  }
  updateLcd();
}
void checkMqtt() {
  if (espClient.connected()) return;
  unsigned long now = millis(); if (now - lastRetryMs < 1500) return; lastRetryMs = now;
  if (!espClient.connect(MQTT_BROKER, MQTT_PORT)) return;
  espClient.setNoDelay(true);
  String cid = "wokwi_v_" + String(random(10000, 99999)); uint16_t cLen = cid.length();
  uint8_t hdr[12] = {0x10, (uint8_t)(12 + cLen), 0x00, 0x04, 'M', 'Q', 'T', 'T', 0x04, 0x02, 0x00, 0x1E};
  espClient.write(hdr, 12); espClient.write((uint8_t)(cLen >> 8)); espClient.write((uint8_t)(cLen & 0xFF)); espClient.print(cid);
  unsigned long t0 = millis(); while (espClient.available() < 4 && (millis() - t0) < 600) yield();
  for (int i = 0; i < 4 && espClient.available(); i++) espClient.read();
  mqttSub(TOPIC_CMD);
}
void mqttLoop() {
  if (!espClient.connected()) return;
  if (millis() - lastPingMs > 8000) { lastPingMs = millis(); uint8_t p[2] = {0xC0, 0x00}; espClient.write(p, 2); }
  while (espClient.available() >= 2) {
    uint8_t hdr = espClient.read(), enc = 0; uint32_t rem = 0, mult = 1;
    do { if (!espClient.available()) return; enc = espClient.read(); rem += (enc & 127) * mult; mult *= 128; } while ((enc & 128) != 0);
    uint8_t pkt[256]; uint16_t idx = 0;
    while (idx < rem && idx < 255 && espClient.available()) pkt[idx++] = espClient.read();
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
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_BLUE, LOW); digitalWrite(PIN_LED_RED, LOW);
    return;
  }
  unsigned long now = millis(), iv = (curMode == "padrao") ? 350 : 160;
  if (lastBlinkMs == 0 || (now - lastBlinkMs >= iv)) {
    lastBlinkMs = (now == 0) ? 1 : now; ledState = !ledState;
    if (curMode == "padrao") {
      digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_RED, LOW);
      digitalWrite(PIN_LED_BLUE, ledState ? HIGH : LOW); noTone(PIN_BUZZER);
    } else {
      digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_BLUE, LOW);
      digitalWrite(PIN_LED_RED, ledState ? HIGH : LOW);
      soundStep = (soundStep + 1) % 4;
      if (ledState) { int f[4] = {880, 1175, 1480, 1760}; tone(PIN_BUZZER, f[soundStep], 110); } else noTone(PIN_BUZZER);
    }
  }
}
void readAndPubSensors() {
  unsigned long now = millis(); float t = hwTemp, h = hwHum, l = hwLum;
  if (now - lastDhtMs >= 1200) { lastDhtMs = now; readDht22(t, h); }
  if (now - lastLdrMs >= 150) {
    lastLdrMs = now; float rl = map(analogRead(PIN_LDR), 0, 4095, 100, 0);
    if (rl >= 0.0f && rl <= 100.0f) l = (hwLum * 0.7f) + (rl * 0.3f);
  }
  bool moved = (fabs(t - hwTemp) >= 0.2f) || (fabs(h - hwHum) >= 0.5f) || (fabs(l - hwLum) >= 1.0f);
  if (moved) { hwTemp = t; hwHum = h; hwLum = l; remoteSync = false; }
  if (!remoteSync) { validTemp = hwTemp; validHum = hwHum; validLum = hwLum; }
  if (moved || (now - lastPubMs >= 1500)) {
    lastPubMs = now;
    mqttPub(TOPIC_ATTRS, "t|" + String(validTemp, 1) + "|h|" + String(validHum, 1) + "|l|" + String(validLum, 1) + (remoteSync ? "|r|1" : "|r|0"));
    updateLcd();
  }
}
void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_GREEN, OUTPUT); pinMode(PIN_LED_RED, OUTPUT); pinMode(PIN_LED_BLUE, OUTPUT); pinMode(PIN_BUZZER, OUTPUT); pinMode(PIN_LDR, INPUT);
  digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_RED, LOW); digitalWrite(PIN_LED_BLUE, LOW);
  lcdInit(); updateLcd();
  WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.begin(WIFI_SSID, WIFI_PASS, 6);
  while (WiFi.status() != WL_CONNECTED) delay(30);
}
void loop() { checkMqtt(); mqttLoop(); handleActuators(); readAndPubSensors(); delay(1); }
