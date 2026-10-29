// CP5 VINHERIA AGNELLO · ESP32 SOMMELIER IOT & SUPABASE CLOUD ENGINE
#include <WiFi.h>
#include <Wire.h>
#include <math.h>
#include "wine_presets.h"
#include "supabase_client.h"

const char *WIFI_SSID = "Wokwi-GUEST", *WIFI_PASS = "";
const char *SUPABASE_URL = "https://slqozouuqzxwmfswyroo.supabase.co";
const char *SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscW96b3V1cXp4d21mc3d5cm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDkxOTMsImV4cCI6MjEwNzc4NTE5M30.spwyPsi31yzG6rvh2FsSHWM8Fkv2CPLHpUx9Us8aRo4";
const char *DEVICE_ID = "vine001", *MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;

// Pinagem: LED Amarelo (D2), Buzzer (D4), LED Verde (D5), DHT22 (D15), LED Vermelho (D18), LDR (D34)
enum Pins { PIN_LED_YELLOW = 2, PIN_BUZZER = 4, PIN_LED_GREEN = 5, PIN_DHT = 15, PIN_LED_RED = 18, PIN_LDR = 34, LCD_ADDR = 0x27 };

WiFiClient espClient;
String curMode = "normal", curPreset = "TINTO";
int curHealth = 100, bthvIdx = 0;
bool remoteSync = false, noteToneActive = false;
unsigned long lastDhtMs = 0, lastLdrMs = 0, lastPubMs = 0, noteStartMs = 0, lastPingMs = 0, lastRetryMs = 0, lastSupaMs = 0;
float validTemp = 15.8f, validHum = 68.0f, validLum = 9.0f, hwTemp = 15.8f, hwHum = 68.0f, hwLum = 9.0f;

// Beethoven: Sonata ao Luar (Moonlight Sonata, Op. 27 No. 2 em Do sustenido menor)
const uint16_t BTHV_MELODY[][2] = {
  {208,160},{277,160},{330,160},{208,160},{277,160},{330,160},{208,160},{277,160},{330,160},{208,160},{277,160},{330,160},
  {247,170},{294,170},{370,170},{220,170},{277,170},{330,170},{208,170},{262,170},
  {415,360},{415,180},{415,180},{440,420},{415,260},{392,220},{415,480},{330,300},{277,300},{208,480},
  {330,240},{415,240},{494,360},{494,200},{554,420},{494,260},{466,220},{494,480},{415,300},{330,300},{247,480},
  {370,260},{440,260},{587,420},{554,320},{494,260},{440,260},{415,460},{277,320},{330,320},{139,600},{0,250}
};
const int BTHV_TOTAL = sizeof(BTHV_MELODY) / sizeof(BTHV_MELODY[0]);

void playToneAlert(int f, int d = 0) { digitalWrite(PIN_LED_YELLOW, HIGH); if (f > 0) { if (d > 0) tone(PIN_BUZZER, f, d); else tone(PIN_BUZZER, f); } }
void stopToneAlert() { digitalWrite(PIN_LED_YELLOW, LOW); noTone(PIN_BUZZER); }
void lcdExpWrite(uint8_t d) { Wire.beginTransmission(LCD_ADDR); Wire.write(d | 0x08); Wire.endTransmission(); }
void lcdWrite4(uint8_t v) { lcdExpWrite(v); lcdExpWrite(v | 0x04); delayMicroseconds(2); lcdExpWrite(v & ~0x04); delayMicroseconds(40); }
void lcdSend(uint8_t v, uint8_t m) { lcdWrite4((v & 0xF0) | m); lcdWrite4(((v << 4) & 0xF0) | m); }
void lcdInit() {
  Wire.begin(21, 22); Wire.setClock(400000); delay(40); lcdExpWrite(0x00); delay(15);
  lcdWrite4(0x30); delayMicroseconds(4500); lcdWrite4(0x30); delayMicroseconds(4500); lcdWrite4(0x30); delayMicroseconds(150); lcdWrite4(0x20); delayMicroseconds(150);
  lcdSend(0x28, 0); lcdSend(0x0C, 0); lcdSend(0x06, 0); lcdSend(0x01, 0); delay(3);
}
void updateLcd() {
  lcdSend(0x80, 0); String tStr = "T:" + String(validTemp, 1) + (char)223 + "C U:" + String((int)validHum) + "%" + (remoteSync ? "*" : " ");
  while (tStr.length() < 16) tStr += " "; for (int i = 0; i < 16; i++) lcdSend((uint8_t)tStr[i], 1);
  lcdSend(0xC0, 0); String bStr = "L:" + String((int)validLum) + "% " + curPreset.substring(0, 4) + " " + ((curMode == "critico") ? "CRT:" : "OK:") + String(curHealth) + "%";
  while (bStr.length() < 16) bStr += " "; for (int i = 0; i < 16; i++) lcdSend((uint8_t)bStr[i], 1);
}
void selfTestLedsAndBuzzer() {
  digitalWrite(PIN_LED_GREEN, HIGH); tone(PIN_BUZZER, 880, 100); delay(140); digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, HIGH); tone(PIN_BUZZER, 1040, 100); delay(140); digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, HIGH); tone(PIN_BUZZER, 1175, 100); delay(140); digitalWrite(PIN_LED_RED, LOW); stopToneAlert();
}

void applyWineStatusTransition(String newMode, int newHealth) {
  if (newMode == curMode && newHealth == curHealth) return;
  bool modeChanged = (newMode != curMode);
  curMode = newMode; curHealth = newHealth;
  if (modeChanged) {
    bthvIdx = 0; noteStartMs = 0; noteToneActive = false;
    if (curMode != "critico") { digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_RED, LOW); stopToneAlert(); }
    else { digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_RED, HIGH); }
  }
  updateLcd();
}

bool readDht22(float &tOut, float &hOut) {
  uint8_t d[5] = {0,0,0,0,0}; pinMode(PIN_DHT, OUTPUT); digitalWrite(PIN_DHT, LOW); delayMicroseconds(1100);
  pinMode(PIN_DHT, INPUT_PULLUP); unsigned long t0 = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 180) return false; }
  t0 = micros(); while (digitalRead(PIN_DHT) == LOW)  { if (micros() - t0 > 180) return false; }
  t0 = micros(); while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 180) return false; }
  for (int i = 0; i < 40; i++) {
    t0 = micros(); while (digitalRead(PIN_DHT) == LOW) { if (micros() - t0 > 120) return false; }
    unsigned long hs = micros(); while (digitalRead(PIN_DHT) == HIGH) { if (micros() - hs > 130) return false; }
    if ((micros() - hs) > 40) d[i / 8] |= (1 << (7 - (i % 8)));
  }
  if (((d[0] + d[1] + d[2] + d[3]) & 0xFF) != d[4] || (d[0] == 0 && d[2] == 0)) return false;
  float h = ((uint16_t)(d[0] << 8) | d[1]) * 0.1f, t = ((uint16_t)((d[2] & 0x7F) << 8) | d[3]) * 0.1f;
  if (d[2] & 0x80) t = -t;
  if (isnan(t) || isnan(h) || t < -40.0f || t > 80.0f || h < 0.0f || h > 100.0f) return false;
  tOut = t; hOut = h; return true;
}

void mqttPub(const char* top, const String &pl) {
  if (!espClient.connected()) return;
  uint16_t tl = strlen(top), plLen = pl.length(); uint32_t rem = 2 + tl + plLen; espClient.write((uint8_t)0x30);
  do { uint8_t enc = rem % 128; rem /= 128; if (rem > 0) enc |= 128; espClient.write(enc); } while (rem > 0);
  espClient.write((uint8_t)(tl >> 8)); espClient.write((uint8_t)(tl & 0xFF)); espClient.print(top); espClient.print(pl);
}

void checkMqtt() {
  if (WiFi.status() != WL_CONNECTED || espClient.connected()) return;
  unsigned long now = millis(); if (now - lastRetryMs < 2500) return; lastRetryMs = now;
  if (!espClient.connect(MQTT_BROKER, MQTT_PORT)) return;
  String cid = "esp32_v_" + String(random(10000, 99999)); uint16_t cLen = cid.length();
  uint8_t hdr[12] = {0x10, (uint8_t)(12 + cLen), 0x00, 0x04, 'M', 'Q', 'T', 'T', 0x04, 0x02, 0x00, 0x1E};
  espClient.write(hdr, 12); espClient.write((uint8_t)(cLen >> 8)); espClient.write((uint8_t)(cLen & 0xFF)); espClient.print(cid);
  unsigned long t0 = millis(); while (espClient.available() < 4 && (millis() - t0) < 600) yield();
  for (int i = 0; i < 4 && espClient.available(); i++) espClient.read();
  uint8_t pkt[6] = {0x82, (uint8_t)(5 + strlen("/TEF/vine001/cmd")), 0x00, 0x01, 0x00, (uint8_t)strlen("/TEF/vine001/cmd")};
  espClient.write(pkt, 6); espClient.print("/TEF/vine001/cmd"); espClient.write((uint8_t)0x00);
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
        String msg = String((char*)(pkt + 2 + tl));
        if (msg.indexOf("diag|") != -1) {
          String s = msg.substring(msg.indexOf("diag|") + 5); int p1 = s.indexOf('|');
          if (p1 != -1) {
            String m = s.substring(0, p1); int p2 = s.indexOf('|', p1 + 1), p3 = (p2 != -1) ? s.indexOf('|', p2 + 1) : -1;
            int h = (p2 != -1) ? s.substring(p1 + 1, p2).toInt() : 100;
            if (p3 != -1) { curPreset = s.substring(p3 + 1); curPreset.trim(); curPreset.toUpperCase(); }
            applyWineStatusTransition(m, h); remoteSync = true; mqttPub("/TEF/vine001/cmdexe", "diag|OK");
          }
        } else if (msg.indexOf("sync|") != -1) {
          String s = msg.substring(msg.indexOf("sync|") + 5); int p1 = s.indexOf('|'), p2 = (p1 != -1) ? s.indexOf('|', p1 + 1) : -1;
          if (p1 != -1 && p2 != -1) {
            validTemp = s.substring(0, p1).toFloat(); validHum = s.substring(p1 + 1, p2).toFloat(); validLum = s.substring(p2 + 1).toFloat();
            remoteSync = true; updateLcd(); mqttPub("/TEF/vine001/cmdexe", "sync|OK");
          }
        } else if (msg.indexOf("preset|") != -1) {
          curPreset = msg.substring(msg.indexOf('|') + 1); curPreset.trim(); curPreset.toUpperCase();
        }
      }
    }
  }
}

void handleActuators() {
  if (curMode != "critico") {
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, LOW);
    stopToneAlert(); bthvIdx = 0; noteStartMs = 0; noteToneActive = false; return;
  }
  digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_RED, HIGH);
  unsigned long now = millis();
  uint16_t curFreq = BTHV_MELODY[bthvIdx][0], curDur = BTHV_MELODY[bthvIdx][1];
  uint16_t activeDur = (curDur > 60) ? (curDur * 78) / 100 : curDur;
  if (noteStartMs == 0) {
    noteStartMs = (now == 0) ? 1 : now;
    if (curFreq > 0) { tone(PIN_BUZZER, curFreq); digitalWrite(PIN_LED_YELLOW, HIGH); noteToneActive = true; }
    else { noTone(PIN_BUZZER); digitalWrite(PIN_LED_YELLOW, LOW); noteToneActive = false; }
  }
  if (noteToneActive && (now - noteStartMs >= activeDur)) {
    noTone(PIN_BUZZER); digitalWrite(PIN_LED_YELLOW, LOW); noteToneActive = false;
  }
  if (now - noteStartMs >= curDur) { bthvIdx = (bthvIdx + 1) % BTHV_TOTAL; noteStartMs = 0; }
}

void readAndPubSensors() {
  unsigned long now = millis(); float t = hwTemp, h = hwHum, l = hwLum;
  if (now - lastDhtMs >= 1200) { lastDhtMs = now; readDht22(t, h); }
  if (now - lastLdrMs >= 150) {
    lastLdrMs = now; float rl = map(analogRead(PIN_LDR), 0, 4095, 100, 0);
    if (rl >= 0.0f && rl <= 100.0f) l = (hwLum * 0.7f) + (rl * 0.3f);
  }
  bool physMoved = (fabs(t - hwTemp) >= 1.5f) || (fabs(h - hwHum) >= 4.0f);
  if (physMoved) {
    hwTemp = t; hwHum = h; hwLum = l;
    if (!remoteSync) { validTemp = hwTemp; validHum = hwHum; validLum = hwLum; }
  }
  if (!remoteSync) {
    String evalMode; int evalHealth;
    evaluateWineStatus(validTemp, validHum, validLum, curPreset, evalMode, evalHealth);
    applyWineStatusTransition(evalMode, evalHealth);
  }
  if (now - lastPubMs >= 1500) {
    lastPubMs = now;
    mqttPub("/TEF/vine001/attrs", "t|" + String(validTemp, 1) + "|h|" + String(validHum, 1) + "|l|" + String(validLum, 1));
    updateLcd();
  }
  if (now - lastSupaMs >= 15000) {
    lastSupaMs = now;
    if (curMode != "critico") postTelemetryToSupabase(SUPABASE_URL, SUPABASE_KEY, DEVICE_ID, validTemp, validHum, validLum, curMode, curHealth, curPreset);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_GREEN, OUTPUT); pinMode(PIN_LED_YELLOW, OUTPUT); pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT); pinMode(PIN_LDR, INPUT);
  lcdInit(); selfTestLedsAndBuzzer(); digitalWrite(PIN_LED_GREEN, HIGH); updateLcd();
  WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.setAutoReconnect(true); WiFi.begin(WIFI_SSID, WIFI_PASS, 6);
  unsigned long t0 = millis(); while (WiFi.status() != WL_CONNECTED && (millis() - t0) < 4000) delay(50);
}

void loop() { checkMqtt(); mqttLoop(); handleActuators(); readAndPubSensors(); delay(1); }
