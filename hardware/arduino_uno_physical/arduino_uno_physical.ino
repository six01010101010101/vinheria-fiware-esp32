// CP5 VINHERIA AGNELLO — ARDUINO UNO / NANO / MEGA PONTE FÍSICA USB SERIAL
// Conecta via cabo USB ao computador (Node.js server.js) ou funciona standalone com DHT11 e LDR.
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define PIN_DHT        2
#define PIN_LED_GREEN  5
#define PIN_LED_YELLOW 6
#define PIN_LED_RED    7
#define PIN_BUZZER     8
#define PIN_LDR        A0

LiquidCrystal_I2C lcd(0x27, 16, 2);

String curMode = "normal", curPreset = "TINTO";
int curHealth = 100, bthvIdx = 0;
unsigned long noteStartMs = 0;
bool noteActive = false;

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
  if (curMode != "critico") { noTone(PIN_BUZZER); bthvIdx = 0; noteActive = false; return; }
  uint16_t freq = BTHV_MELODY[bthvIdx][0], dur = BTHV_MELODY[bthvIdx][1];
  if (!noteActive) {
    if (freq > 0) tone(PIN_BUZZER, freq); else noTone(PIN_BUZZER);
    noteActive = true; noteStartMs = now;
  } else if (now - noteStartMs >= dur) {
    noTone(PIN_BUZZER); noteActive = false;
    bthvIdx = (bthvIdx + 1) % BTHV_TOTAL;
  }
}

void updateLcd(String line1, String line2) {
  lcd.setCursor(0, 0); lcd.print(line1);
  for (int i = line1.length(); i < 16; i++) lcd.print(" ");
  lcd.setCursor(0, 1); lcd.print(line2);
  for (int i = line2.length(); i < 16; i++) lcd.print(" ");
}

void applyState(String mode, int health, String l1 = "", String l2 = "") {
  curMode = mode; curHealth = health;
  if (curMode == "normal") {
    digitalWrite(PIN_LED_GREEN, HIGH); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, LOW);
    noTone(PIN_BUZZER);
    if (l1 == "") l1 = "T:15.8C U:68%";
    if (l2 == "") l2 = curPreset + " 1UP:" + String(health) + "%";
  } else if (curMode == "padrao") {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, HIGH); digitalWrite(PIN_LED_RED, LOW);
    noTone(PIN_BUZZER);
    if (l1 == "") l1 = "T:17.5C U:63%";
    if (l2 == "") l2 = curPreset + " PAD:" + String(health) + "%";
  } else {
    digitalWrite(PIN_LED_GREEN, LOW); digitalWrite(PIN_LED_YELLOW, LOW); digitalWrite(PIN_LED_RED, HIGH);
    if (l1 == "") l1 = "T:22.5C U:40%";
    if (l2 == "") l2 = curPreset + " CRT:" + String(health) + "%";
  }
  updateLcd(l1, l2);
}

void parseSerialCommand(String line) {
  line.trim();
  if (line.length() == 0) return;
  String l1 = "", l2 = "";
  int idxL1 = line.indexOf("LCD1:"), idxL2 = line.indexOf("LCD2:");
  if (idxL1 >= 0) {
    int endL1 = (idxL2 > idxL1) ? idxL2 - 1 : line.length();
    l1 = line.substring(idxL1 + 5, endL1); l1.replace(";", "");
  }
  if (idxL2 >= 0) { l2 = line.substring(idxL2 + 5); l2.replace(";", ""); }

  if (line.indexOf("CMD:CRITICO") >= 0 || line.indexOf("R:1") >= 0) applyState("critico", 9, l1, l2);
  else if (line.indexOf("CMD:PADRAO") >= 0 || line.indexOf("Y:1") >= 0) applyState("padrao", 82, l1, l2);
  else if (line.indexOf("CMD:IDEAL") >= 0 || line.indexOf("CMD:NORMAL") >= 0 || line.indexOf("G:1") >= 0) applyState("normal", 100, l1, l2);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_GREEN, OUTPUT); pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT); pinMode(PIN_BUZZER, OUTPUT);
  lcd.init(); lcd.backlight();
  applyState("normal", 100, "VINHERIA AGNELLO", "PRONTO SERIAL");
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    parseSerialCommand(line);
  }
  playBthvNonBlock();
  delay(5);
}
