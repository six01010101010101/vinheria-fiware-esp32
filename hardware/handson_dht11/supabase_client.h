#ifndef SUPABASE_CLIENT_H
#define SUPABASE_CLIENT_H

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// Envia telemetria diretamente à API REST do Supabase Cloud (PostgREST)
inline bool postTelemetryToSupabase(
  const char* url, const char* apiKey, const char* deviceId,
  float temp, float hum, float lum, const String& mode, int health, const String& preset
) {
  if (WiFi.status() != WL_CONNECTED || strlen(url) < 10) return false;

  WiFiClientSecure client;
  client.setInsecure(); // Sem necessidade de certificado raiz que expira

  HTTPClient https;
  https.setTimeout(2500);

  String endpoint = String(url) + "/rest/v1/vine_telemetry";
  if (!https.begin(client, endpoint)) return false;

  https.addHeader("Content-Type", "application/json");
  https.addHeader("apikey", apiKey);
  https.addHeader("Authorization", String("Bearer ") + apiKey);
  https.addHeader("Prefer", "return=minimal");

  String payload = "{\"device_id\":\"" + String(deviceId) + "\""
                 + ",\"temperature\":" + String(temp, 1)
                 + ",\"humidity\":" + String(hum, 1)
                 + ",\"luminosity\":" + String(lum, 1)
                 + ",\"alert_mode\":\"" + mode + "\""
                 + ",\"cellar_health_score\":" + String(health)
                 + ",\"source\":\"ESP32 " + preset + "\"}";

  int code = https.POST(payload);
  https.end();
  return (code == 200 || code == 201 || code == 204);
}

#endif // SUPABASE_CLIENT_H
