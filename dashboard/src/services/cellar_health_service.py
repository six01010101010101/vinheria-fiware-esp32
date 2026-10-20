"""
Serviço de Saúde da Adega: pontuação contínua (0-100) ponderada pelo desvio real de cada
sensor em relação à faixa ideal do preset, e veredito enológico derivado.

O Site é a autoridade do diagnóstico: a pontuação e o veredito são enviados ao ESP32
(comando MQTT "diag") e exibidos no LCD 16x2 do Wokwi, garantindo que ambos concordem.
- Dentro da faixa: 100 pontos para o sensor.
- Fora da faixa: no máximo 70 pontos, decaindo linearmente até 0 quando o desvio
  atinge a largura da própria faixa ideal.
- Pesos: Temperatura 40%, Umidade 35%, Luminosidade 25%.
"""

from typing import List, Optional, Tuple
from src.models.iot_models import SensorSnapshot, TriggerConfig

WEIGHT_TEMP, WEIGHT_HUM, WEIGHT_LUM = 0.40, 0.35, 0.25
OUT_OF_RANGE_CEILING = 70.0
MIN_TOLERANCE = 1.0

VERDICTS: Tuple[Tuple[str, str, str], ...] = (
    ("OK", "EXCELENTE — conservação ideal, vinho evoluindo sem estresse", "success"),
    ("ATN", "ATENÇÃO — desvio leve, corrigir antes de afetar o vinho", "warning"),
    ("ALR", "ALERTA — risco real à qualidade e à evolução do vinho", "danger"),
    ("CRT", "CRÍTICO — dano iminente: aromas, cor e rolha comprometidos", "danger"),
)
NO_DATA_VERDICT = ("SEM", "SEM DADOS — aguardando leitura real do Wokwi / sensores", "secondary")


def sensor_score(value: Optional[float], low: float, high: float) -> Optional[float]:
    """Pontua um sensor (0-100) pelo desvio relativo à largura da faixa ideal."""
    if value is None:
        return None
    if low <= value <= high:
        return 100.0
    tolerance = max(high - low, MIN_TOLERANCE)
    deviation = (low - value) if value < low else (value - high)
    return max(0.0, OUT_OF_RANGE_CEILING * (1.0 - min(1.0, deviation / tolerance)))


def compute_health(snapshot: SensorSnapshot, triggers: TriggerConfig) -> Optional[int]:
    """Calcula a saúde ponderada da adega; retorna None quando não há nenhuma leitura real."""
    parts: List[Tuple[Optional[float], float]] = [
        (sensor_score(snapshot.temperature, triggers.temp_min, triggers.temp_max), WEIGHT_TEMP),
        (sensor_score(snapshot.humidity, triggers.hum_min, triggers.hum_max), WEIGHT_HUM),
        (sensor_score(snapshot.luminosity, triggers.lum_min, triggers.lum_max), WEIGHT_LUM),
    ]
    valid = [(score, weight) for score, weight in parts if score is not None]
    if not valid:
        return None
    total_weight = sum(weight for _, weight in valid)
    return int(round(sum(score * weight for score, weight in valid) / total_weight))


def verdict_for(health: Optional[int], is_anomalous: bool) -> Tuple[str, str, str]:
    """Retorna (código LCD, texto do veredito, cor Bootstrap) para a saúde calculada."""
    if health is None:
        return NO_DATA_VERDICT
    if not is_anomalous:
        return VERDICTS[0]
    if health >= 75:
        return VERDICTS[1]
    if health >= 50:
        return VERDICTS[2]
    return VERDICTS[3]
