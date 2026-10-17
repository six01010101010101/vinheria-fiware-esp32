/*
 * ============================================================================
 * CHECK POINT 5 - MONITORAMENTO GLOBAL DE VINHERIAS (HANDS-ON FÍSICO - DHT11)
 * Hardware Bancada: ESP32 + DHT11 (GPIO 15) + LDR (GPIO 34) + LED Azul (GPIO 2) + Buzzer (GPIO 4)
 * Protocolo: FIWARE Ultralight 2.0 sobre MQTT (IoT Agent / Orion / STH-Comet)
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// --- Credenciais de Rede Wi-Fi do Laboratório / Hotspot ---
const char* WIFI_SSID     = "FIAP-IOT";       // Altere para o SSID da bancada
const char* WIFI_PASSWORD = "senha_wifi_lab"; // Altere para a senha do Wi-Fi

// --- Endereço do Servidor FIWARE (Broker MQTT Porta 1883) ---
const char* MQTT_BROKER    = "20.206.204.100"; // IP da instância FIWARE
const int   MQTT_PORT      = 1883;
const char* MQTT_CLIENT_ID = "fiware_vine001_handson";

// --- Tópicos Ultralight 2.0 (Device ID: vine001 | API Key: TEF) ---
const char* TOPIC_PUBLISH_ATTRS  = "/TEF/vine001/attrs";
const char* TOPIC_SUBSCRIBE_CMD  = "/TEF/vine001/cmd";
const char* TOPIC_PUBLISH_CMDEXE = "/TEF/vine001/cmdexe";

// --- Pinos Físicos no ESP32 DevKit V1 ---
#define PIN_LED_BLUE 2    // LED Azul Onboard do ESP32 (GPIO 2)
#define PIN_BUZZER   4    // Buzzer conectado ao GPIO 4 e GND
#define PIN_DHT      15   // Sinal de dados do DHT-11 conectado ao GPIO 15
#define PIN_LDR      34   // Divisor de tensão do LDR conectado ao GPIO 34 (ADC1_CH6)
#define DHT_TYPE     DHT11

DHT dht(PIN_DHT, DHT_TYPE);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// --- Estado de Alerta Controlado Remotamente pelo Front-end ---
String currentAlertMode = "normal"; // "normal", "temp", "hum", "lum", "multi"
unsigned long lastPublishMs = 0;
unsigned long lastBlinkMs   = 0;
bool ledState               = false;
int soundStep               = 0;

void setupWifi() {
  Serial.print("[WiFi] Conectando a rede: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Conectado com sucesso! IP: " + WiFi.localIP().toString());
}

// --- Callback MQTT: Processa comandos enviados pelo Front-end via FIWARE ---
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("[MQTT CMD] Payload recebido: " + message);

  // Formato esperado do IoT Agent: "vine001@alert|<tipo_anomalia>"
  int pipeIndex = message.indexOf('|');
  if (pipeIndex != -1) {
    String cmdValue = message.substring(pipeIndex + 1);
    cmdValue.trim();
    currentAlertMode = cmdValue;
    Serial.println("[ALERTA REMOTO] Estado alterado para: " + currentAlertMode);

    // Envia confirmação de execução (cmdexe) ao IoT Agent
    String ackPayload = "vine001@alert|OK_" + currentAlertMode;
    mqttClient.publish(TOPIC_PUBLISH_CMDEXE, ackPayload.c_str());
  }
}

void reconnectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Conectando ao Broker FIWARE...");
    if (mqttClient.connect(MQTT_CLIENT_ID)) {
      Serial.println("Conectado!");
      mqttClient.subscribe(TOPIC_SUBSCRIBE_CMD);
    } else {
      Serial.print("Erro rc=");
      Serial.print(mqttClient.state());
      Serial.println(" tentando novamente em 3s...");
      delay(3000);
    }
  }
}

// --- Atuadores de Alerta: LED Azul Piscando + Som Específico por Anomalia ---
void handleRemoteAlertActuators() {
  if (currentAlertMode == "normal") {
    digitalWrite(PIN_LED_BLUE, LOW);
    noTone(PIN_BUZZER);
    ledState = false;
    return;
  }

  unsigned long now = millis();
  unsigned long interval = (currentAlertMode == "multi") ? 200 : 400;

  if (now - lastBlinkMs >= interval) {
    lastBlinkMs = now;
    ledState = !ledState;
    digitalWrite(PIN_LED_BLUE, ledState ? HIGH : LOW);
    soundStep = (soundStep + 1) % 3;

    if (!ledState) {
      noTone(PIN_BUZZER);
      return;
    }

    // Cada anomalia emite uma assinatura sonora distinta no Buzzer:
    if (currentAlertMode == "temp") {
      tone(PIN_BUZZER, 2000, 180); // Anomalia Temperatura: Bip Agudo Rápido (2000 Hz)
    } else if (currentAlertMode == "hum") {
      tone(PIN_BUZZER, 850, 280);  // Anomalia Umidade: Pulso Grave (850 Hz)
    } else if (currentAlertMode == "lum") {
      int freq = (soundStep % 2 == 0) ? 1200 : 1700;
      tone(PIN_BUZZER, freq, 220); // Anomalia Luminosidade: Sirene Dupla (1200/1700 Hz)
    } else if (currentAlertMode == "multi") {
      int multiFreqs[3] = {1000, 1800, 2500};
      tone(PIN_BUZZER, multiFreqs[soundStep], 150); // Múltiplas Anomalias: Escala Tripla
    }
  }
}

// --- Leitura Física (DHT-11 + LDR) e Envio ao FIWARE ---
void publishSensorsToFiware() {
  unsigned long now = millis();
  if (now - lastPublishMs < 4000) return;
  lastPublishMs = now;

  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  int rawLdr        = analogRead(PIN_LDR);
  float luminosity  = map(rawLdr, 0, 4095, 0, 100); // Calibrado para divisor LDR físico

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("[AVISO] Falha na leitura do DHT-11 físico. Verifique o pino GPIO 15.");
    return;
  }

  String payload = "t|" + String(temperature, 1) +
                   "|h|" + String(humidity, 1) +
                   "|l|" + String(luminosity, 1);

  mqttClient.publish(TOPIC_PUBLISH_ATTRS, payload.c_str());
  Serial.println("[FIWARE PUB] " + payload + " | Modo Alerta: " + currentAlertMode);
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
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMqtt();
  }
  mqttClient.loop();
  publishSensorsToFiware();
  handleRemoteAlertActuators();
}
