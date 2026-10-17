"""
Modelos de dados tipados (Dataclasses) da aplicação de Monitoramento de Vinherias.
Garante contratos claros entre as camadas UI, Service e Repository.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class TriggerConfig:
    """Limites mínimos e máximos configurados no Front-end para geração de alertas."""

    temp_min: float = 12.0
    temp_max: float = 18.0
    hum_min: float = 60.0
    hum_max: float = 75.0
    lum_min: float = 0.0
    lum_max: float = 25.0


@dataclass(frozen=True)
class TimeSeriesPoint:
    """Ponto individual de série temporal retornado pelo STH-Comet (Porta 8666)."""

    timestamp: str
    value: float


@dataclass
class HistoricalSeries:
    """Séries históricas consolidadas de Temperatura, Umidade e Luminosidade."""

    temperature: List[TimeSeriesPoint] = field(default_factory=list)
    humidity: List[TimeSeriesPoint] = field(default_factory=list)
    luminosity: List[TimeSeriesPoint] = field(default_factory=list)


@dataclass(frozen=True)
class SensorSnapshot:
    """Leitura instantânea consolidada dos três sensores do ESP32."""

    temperature: Optional[float]
    humidity: Optional[float]
    luminosity: Optional[float]
    timestamp: str


@dataclass(frozen=True)
class DeviceProvisionSpec:
    """Dados para cadastro e provisionamento de um novo IoT Device no FIWARE."""

    device_id: str
    entity_name: str
    entity_type: str = "Vine"
    api_key: str = "TEF"


@dataclass(frozen=True)
class RegisteredDeviceInfo:
    """Representação resumida de um dispositivo cadastrado no IoT Agent."""

    device_id: str
    entity_name: str
    entity_type: str
    transport: str
    protocol: str


@dataclass(frozen=True)
class AnomalyEvaluation:
    """Resultado da avaliação dos parâmetros frente aos triggers definidos no Front-end."""

    is_anomalous: bool
    command_code: str
    active_anomalies: List[str]
    details_messages: List[str]
    cellar_health_score: int
    led_status_text: str
    buzzer_pattern_text: str
    badge_color: str
