#ifndef WINE_PRESETS_H
#define WINE_PRESETS_H

#include <Arduino.h>

// Estrutura de Limites Ideais por Estilo de Vinho
struct WineLimit {
  const char* key;
  float tMin;
  float tMax;
  float hMin;
  float hMax;
  float lMax;
};

// 8 Presets Enológicos Oficiais da Vinheria Agnello
static const WineLimit WINE_PRESETS[8] = {
  {"TINTO", 14.0f, 18.0f, 60.0f, 75.0f, 25.0f},
  {"BRANC",  8.0f, 12.0f, 60.0f, 75.0f, 15.0f},
  {"ROSE",  10.0f, 13.0f, 60.0f, 75.0f, 12.0f},
  {"BRUT",   6.0f,  9.0f, 65.0f, 80.0f, 10.0f},
  {"PINOT", 12.0f, 15.0f, 65.0f, 75.0f, 15.0f},
  {"PORTO", 14.0f, 18.0f, 60.0f, 75.0f, 20.0f},
  {"DOCE",   9.0f, 12.0f, 65.0f, 78.0f, 12.0f},
  {"LARAN", 11.0f, 14.0f, 60.0f, 72.0f, 15.0f}
};

// Localiza o preset ativo pelo nome
inline WineLimit findWineLimit(const String& presetName) {
  for (int i = 0; i < 8; i++) {
    if (presetName.indexOf(WINE_PRESETS[i].key) != -1) {
      return WINE_PRESETS[i];
    }
  }
  return WINE_PRESETS[0];
}

// Avalia desvios e determina o modo ('normal', 'padrao', 'critico') e saude (%)
inline void evaluateWineStatus(
  float temp, float hum, float lum, const String& preset,
  String& outMode, int& outHealth
) {
  WineLimit lim = findWineLimit(preset);
  float tDiff = (temp < lim.tMin) ? (lim.tMin - temp) : ((temp > lim.tMax) ? (temp - lim.tMax) : 0.0f);
  float hDiff = (hum < lim.hMin) ? (lim.hMin - hum) : ((hum > lim.hMax) ? (hum - lim.hMax) : 0.0f);
  float lDiff = (lum > lim.lMax) ? (lum - lim.lMax) : 0.0f;

  int deviations = 0;
  if (tDiff > 0.0f) deviations++;
  if (hDiff > 0.0f) deviations++;
  if (lDiff > 0.0f) deviations++;

  if (deviations == 0) {
    outMode = "normal";
    outHealth = 100;
  } else if (deviations == 1 && tDiff < 4.0f && hDiff < 12.0f && lDiff < 15.0f) {
    outMode = "padrao";
    outHealth = 85;
  } else {
    outMode = "critico";
    if (deviations == 1) outHealth = 65;       // Pouco critico (desvio unico severo)
    else if (deviations == 2) outHealth = 45;  // Medio critico (dois parametros violados)
    else outHealth = 25;                       // Muito critico (temperatura, umidade e luz fora)
  }
}

#endif // WINE_PRESETS_H
