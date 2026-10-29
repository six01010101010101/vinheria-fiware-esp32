// CHECK POINT 5 - VINHERIA AGNELLO (PROTÓTIPO FÍSICO BARRIL ESP32 COM DHT11 & SUPABASE)
#include <WiFi.h>
#include <Wire.h>
#include <math.h>
#include "wine_presets.h"
#include "supabase_client.h"

// ============================================================================
// CREDENCIAIS SUPABASE CLOUD & WI-FI (ALTERE AQUI AO MUDAR DE MÁQUINA/CONTA)
// ============================================================================
const char* WIFI_SSID_PRIMARY = "FIAP-IOT";
const char* WIFI_PASS_PRIMARY = "senha_wifi_lab";
const char* SUPABASE_URL = "https://slqozouuqzxwmfswyroo.supabase.co";
const char* SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscW96b3V1cXp4d21mc3d5cm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDkxOTMsImV4cCI6MjEwNzc4NTE5M30.spwyPsi31yzG6rvh2FsSHWM8Fkv2CPLHpUx9Us8aRo4";
const char* DEVICE_ID = "vine001";
const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT = 1883;

#define PIN_LED_YELLOW 2
#define PIN_BUZZER     4
#define PIN_LED_GREEN  5
#define PIN_DHT        15
#define PIN_LED_RED    18
#define PIN_LDR        34
#define LCD_ADDR       0x27

WiFiClient espClient;
String curMode = "normal", curPreset = "TINTO", lastR0 = "", lastR1 = "";
unsigned long lastDhtMs = 0, lastLdrMs = 0, lastPubMs = 0, lastBlinkMs = 0;
unsigned long lastRetryMs = 0, lastSupaMs = 0;
float validTemp = 16.0f, validHum = 68.0f, validLum = 12.0f;
int curHealth = 100, soundStep = 0;
bool ledState = false;

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
  String tag = (curMode == "normal") ? "OK" : ((curMode == "padrao") ? "PAD" : "CRT");
  String r1 = "L:" + String((int)validLum) + "% " + curPreset.substring(0, 4) + ":" + tag;
  if (r0 != lastR0) { lastR0 = r0; lcdPrintRow(0, r0); }
  if (r1 != lastR1) { lastR1 = r1; lcdPrintRow(1, r1); }
}

void selfTestLedsAndBuzzer() {
  digitalWrite(PIN_LED_GREEN, HIGH); tone(PIN_BUZZER, 1319, 120); delay(180); digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, HIGH); tone(PIN_BUZZER, 784, 120); delay(180); digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, HIGH); tone(PIN_BUZZER, 1480, 120); delay(180); digitalWrite(PIN_LED_RED, LOW);
  noTone(PIN_BUZZER);
}

void applyWineStatusTransition(String newMode, int newHealth) {
  if (newMode == curMode && newHealth == curHealth) return;
  curMode = newMode; curHealth = newHealth;
  if (curMode == "normal") {
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, LOW);
    tone(PIN_BUZZER, 1319, 90);
  } else if (curMode == "padrao") {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, HIGH); digitalWrite(PIN_LED_RED, LOW);
    tone(PIN_BUZZER, 784, 70); delay(80); tone(PIN_BUZZER, 784, 70);
  } else {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, HIGH);
    tone(PIN_BUZZER, 1480, 100); delay(110); tone(PIN_BUZZER, 1760, 120);
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
    return;
  }
  unsigned long now = millis(), iv = (curMode == "padrao") ? 350 : 160;
  if (lastBlinkMs == 0 || (now - lastBlinkMs >= iv)) {
    lastBlinkMs = (now == 0) ? 1 : now; ledState = !ledState;
    if (curMode == "padrao") {
      digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_RED, LOW);
      digitalWrite(PIN_LED_YELLOW, ledState ? HIGH : LOW); noTone(PIN_BUZZER);
    } else {
      digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, LOW);
      digitalWrite(PIN_LED_RED, ledState ? HIGH : LOW);
      soundStep = (soundStep + 1) % 4;
      if (ledState) { int f[4] = {880, 1175, 1480, 1760}; tone(PIN_BUZZER, f[soundStep], 110); } else noTone(PIN_BUZZER);
    }
  }
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
  lcdInit(); selfTestLedsAndBuzzer();
  digitalWrite(PIN_LED_GREEN, HIGH); updateDisplay();
  WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID_PRIMARY, WIFI_PASS_PRIMARY);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - t0) < 5000) delay(100);
  if (WiFi.status() != WL_CONNECTED) WiFi.begin("Wokwi-GUEST", "", 6);
}

void loop() { handleActuators(); readAndPubSensors(); delay(5); }
