// CHECK POINT 5 - VINHERIA AGNELLO (PROTÓTIPO FÍSICO ESP32/ARDUINO COM DHT11 & SUPABASE)
#include <WiFi.h>
#include <Wire.h>
#include <math.h>
#include "wine_presets.h"
#include "supabase_client.h"

const char* WIFI_SSID_PRIMARY = "FIAP-IOT";
const char* WIFI_PASS_PRIMARY = "senha_wifi_lab";
const char* SUPABASE_URL = "https://slqozouuqzxwmfswyroo.supabase.co";
const char* SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscW96b3V1cXp4d21mc3d5cm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDkxOTMsImV4cCI6MjEwNzc4NTE5M30.spwyPsi31yzG6rvh2FsSHWM8Fkv2CPLHpUx9Us8aRo4";
const char* DEVICE_ID = "vine001", *MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;

#define PIN_LED_YELLOW 2
#define PIN_BUZZER     4
#define PIN_LED_GREEN  5
#define PIN_DHT        15
#define PIN_LED_RED    18
#define PIN_LDR        34
#define LCD_ADDR       0x27

WiFiClient espClient;
String curMode = "normal", curPreset = "TINTO", lastR0 = "", lastR1 = "";
unsigned long lastDhtMs = 0, lastLdrMs = 0, lastPubMs = 0, lastBlinkMs = 0, lastSupaMs = 0, noteStartMs = 0;
float validTemp = 15.8f, validHum = 68.0f, validLum = 9.0f;
int curHealth = 100, bthvIdx = 0;
bool ledState = false, noteToneActive = false;

// Beethoven: Sonata ao Luar (Moonlight Sonata, Op. 27 No. 2 em Dó sustenido menor)
const uint16_t BTHV_MELODY[][2] = {
  {208,160},{277,160},{330,160},{208,160},{277,160},{330,160},{208,160},{277,160},{330,160},{208,160},{277,160},{330,160},
  {247,170},{294,170},{370,170},{220,170},{277,170},{330,170},{208,170},{262,170},
  {415,360},{415,180},{415,180},{440,420},{415,260},{392,220},{415,480},{330,300},{277,300},{208,480},
  {330,240},{415,240},{494,360},{494,200},{554,420},{494,260},{466,220},{494,480},{415,300},{330,300},{247,480},
  {370,260},{440,260},{587,420},{554,320},{494,260},{440,260},{415,460},{277,320},{330,320},{139,600},{0,250}
};
const int BTHV_TOTAL = sizeof(BTHV_MELODY) / sizeof(BTHV_MELODY[0]);

void playBthvNonBlock() {
  unsigned long now = millis();
  if (curMode != "critico") { noTone(PIN_BUZZER); bthvIdx = 0; noteToneActive = false; return; }
  uint16_t freq = BTHV_MELODY[bthvIdx][0], dur = BTHV_MELODY[bthvIdx][1];
  if (!noteToneActive) {
    if (freq > 0) tone(PIN_BUZZER, freq); else noTone(PIN_BUZZER);
    noteToneActive = true; noteStartMs = now;
  } else if (now - noteStartMs >= dur) {
    noTone(PIN_BUZZER); noteToneActive = false;
    bthvIdx = (bthvIdx + 1) % BTHV_TOTAL;
  }
}

void lcdExpWrite(uint8_t d) { Wire.beginTransmission(LCD_ADDR); Wire.write(d | 0x08); Wire.endTransmission(); }
void lcdWrite4Bits(uint8_t v) { lcdExpWrite(v); lcdExpWrite(v | 0x04); delayMicroseconds(2); lcdExpWrite(v & ~0x04); delayMicroseconds(45); }
void lcdSend(uint8_t v, uint8_t m) { lcdWrite4Bits((v & 0xF0) | m); lcdWrite4Bits(((v << 4) & 0xF0) | m); }
void lcdInit() {
  Wire.begin(21, 22); Wire.setClock(400000); delay(50); lcdExpWrite(0x00); delay(20);
  lcdWrite4Bits(0x30); delayMicroseconds(4500); lcdWrite4Bits(0x30); delayMicroseconds(4500);
  lcdWrite4Bits(0x30); delayMicroseconds(150);  lcdWrite4Bits(0x20); delayMicroseconds(150);
  lcdSend(0x28, 0); lcdSend(0x0C, 0); lcdSend(0x06, 0); lcdSend(0x01, 0); delay(3);
}
void lcdPrintRow(uint8_t row, String txt) {
  lcdSend((row == 0) ? 0x80 : 0xC0, 0);
  while (txt.length() < 16) txt += " ";
  if (txt.length() > 16) txt = txt.substring(0, 16);
  for (int i = 0; i < 16; i++) lcdSend((uint8_t)txt[i], 1);
}
void updateDisplay() {
  String r0 = "T:" + String(validTemp, 1) + "C U:" + String((int)validHum) + "%";
  String tag = (curMode == "normal") ? "1UP" : ((curMode == "padrao") ? "PAD" : "CRT");
  String r1 = "L:" + String((int)validLum) + "% " + curPreset.substring(0, 4) + " " + tag + ":" + String(curHealth) + "%";
  if (r0 != lastR0) { lastR0 = r0; lcdPrintRow(0, r0); }
  if (r1 != lastR1) { lastR1 = r1; lcdPrintRow(1, r1); }
}

void applyWineStatusTransition(String newMode, int newHealth) {
  if (newMode == curMode && newHealth == curHealth) return;
  curMode = newMode; curHealth = newHealth;
  if (curMode == "normal") {
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, LOW);
    noTone(PIN_BUZZER);
  } else if (curMode == "padrao") {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, HIGH); digitalWrite(PIN_LED_RED, LOW);
    noTone(PIN_BUZZER);
  } else {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, HIGH);
  }
  updateDisplay();
}

bool readDht11Safe(float &tOut, float &hOut) {
  uint8_t d[5] = {0,0,0,0,0}; pinMode(PIN_DHT, OUTPUT); digitalWrite(PIN_DHT, LOW); delay(18);
  pinMode(PIN_DHT, INPUT_PULLUP); unsigned long t0 = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 200) return false; }
  t0 = micros(); while (digitalRead(PIN_DHT) == LOW)  { if (micros() - t0 > 200) return false; }
  t0 = micros(); while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 200) return false; }
  for (int i = 0; i < 40; i++) {
    t0 = micros(); while (digitalRead(PIN_DHT) == LOW) { if (micros() - t0 > 130) return false; }
    unsigned long hs = micros(); while (digitalRead(PIN_DHT) == HIGH) { if (micros() - hs > 140) return false; }
    if ((micros() - hs) > 42) d[i / 8] |= (1 << (7 - (i % 8)));
  }
  if (((d[0] + d[1] + d[2] + d[3]) & 0xFF) != d[4] || (d[0] == 0 && d[2] == 0)) return false;
  float h = (float)d[0] + (float)d[1] * 0.1f, t = (float)d[2] + (float)(d[3] & 0x7F) * 0.1f;
  if (isnan(t) || isnan(h) || t < 0.0f || t > 60.0f || h < 10.0f || h > 95.0f) return false;
  tOut = t; hOut = h; return true;
}

void mqttPub(const char* t, const String &p) {
  if (!espClient.connected()) return;
  uint16_t tl = strlen(t), pl = p.length(); uint32_t rem = 2 + tl + pl;
  espClient.write((uint8_t)0x30);
  do { uint8_t enc = rem % 128; rem /= 128; if (rem > 0) enc |= 128; espClient.write(enc); } while (rem > 0);
  espClient.write((uint8_t)(tl >> 8)); espClient.write((uint8_t)(tl & 0xFF));
  espClient.print(t); espClient.print(p);
}

void handleActuators() {
  if (curMode == "normal") {
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, LOW);
    noTone(PIN_BUZZER);
  } else if (curMode == "padrao") {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, HIGH); digitalWrite(PIN_LED_RED, LOW);
    noTone(PIN_BUZZER);
  } else {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, HIGH);
    playBthvNonBlock();
  }
}

void handleSerialCommands() {
  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n'); line.trim();
  if (line.indexOf("CMD:CRITICO") >= 0 || line.indexOf("CMD:MULTI") >= 0) applyWineStatusTransition("critico", 9);
  else if (line.indexOf("CMD:PADRAO") >= 0) applyWineStatusTransition("padrao", 82);
  else if (line.indexOf("CMD:NORMAL") >= 0 || line.indexOf("CMD:IDEAL") >= 0) applyWineStatusTransition("normal", 100);
  else if (line.startsWith("SET:PRESET=")) { curPreset = line.substring(11); updateDisplay(); }
}

void readAndPubSensors() {
  unsigned long now = millis();
  if (now - lastDhtMs >= 1500) { lastDhtMs = now; readDht11Safe(validTemp, validHum); }
  if (now - lastLdrMs >= 250) {
    lastLdrMs = now; float rawLum = map(analogRead(PIN_LDR), 0, 4095, 0, 100);
    if (rawLum >= 0.0f && rawLum <= 100.0f) validLum = rawLum;
  }
  String evalMode; int evalHealth;
  evaluateWineStatus(validTemp, validHum, validLum, curPreset, evalMode, evalHealth);
  applyWineStatusTransition(evalMode, evalHealth);
  if (now - lastPubMs >= 1500) {
    lastPubMs = now;
    mqttPub("/TEF/vine001/attrs", "t|" + String(validTemp, 1) + "|h|" + String(validHum, 1) + "|l|" + String(validLum, 1));
    updateDisplay();
  }
  if (now - lastSupaMs >= 10000) {
    lastSupaMs = now;
    postTelemetryToSupabase(SUPABASE_URL, SUPABASE_KEY, DEVICE_ID, validTemp, validHum, validLum, curMode, curHealth, curPreset);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_GREEN, OUTPUT); pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT); pinMode(PIN_BUZZER, OUTPUT); pinMode(PIN_LDR, INPUT);
  lcdInit(); digitalWrite(PIN_LED_GREEN, HIGH); updateDisplay();
  WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID_PRIMARY, WIFI_PASS_PRIMARY);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - t0) < 5000) delay(100);
  if (WiFi.status() != WL_CONNECTED) WiFi.begin("Wokwi-GUEST", "", 6);
}

void loop() { handleActuators(); handleSerialCommands(); readAndPubSensors(); delay(5); }
