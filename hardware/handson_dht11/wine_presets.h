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

// Avalia desvios e determina o modo ('normal', 'padrao', 'critico') e saúde (%)
inline void evaluateWineStatus(
  float temp, float hum, float lum, const String& preset,
  String& outMode, int& outHealth
) {
  WineLimit lim = findWineLimit(preset);
  int deviations = 0;

  if (temp < lim.tMin || temp > lim.tMax) deviations++;
  if (hum < lim.hMin || hum > lim.hMax) deviations++;
  if (lum > lim.lMax) deviations++;

  if (deviations == 0) {
    outMode = "normal";
    outHealth = 100;
  } else if (deviations == 1) {
    outMode = "padrao";
    outHealth = 85;
  } else {
    outMode = "critico";
    outHealth = 40;
  }
}

#endif // WINE_PRESETS_H
