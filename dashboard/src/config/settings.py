"""
Módulo de configurações centralizadas e constantes do Dashboard FIWARE & Wokwi Real-Time.
Define portas padrão (Orion 1026, IoT Agent 4041, STH-Comet 8666, MQTT 1883),
cabeçalhos FIWARE, tópicos Ultralight 2.0 e Presets de Vinho.
"""

import os
from typing import Any, Dict

# Configurações de rede padrão do servidor FIWARE e Broker MQTT Real-Time (Wokwi)
DEFAULT_FIWARE_HOST: str = os.getenv("FIWARE_HOST", "localhost")
DEFAULT_WOKWI_BROKER: str = os.getenv("WOKWI_MQTT_BROKER", "broker.hivemq.com")
WOKWI_PROJECT_URL: str = "https://wokwi.com/projects/478106752109243393"
ORION_PORT: int = int(os.getenv("ORION_PORT", "1026"))
IOT_AGENT_PORT: int = int(os.getenv("IOT_AGENT_PORT", "4041"))
STH_COMET_PORT: int = int(os.getenv("STH_COMET_PORT", "8666"))
MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))

# Intervalo de atualização otimizado em Tempo Real (1000 ms = 1 segundo)
REALTIME_INTERVAL_MS: int = 1000

# Cabeçalhos obrigatórios da arquitetura FIWARE
FIWARE_SERVICE: str = os.getenv("FIWARE_SERVICE", "smart")
FIWARE_SERVICE_PATH: str = os.getenv("FIWARE_SERVICE_PATH", "/")
DEFAULT_API_KEY: str = os.getenv("FIWARE_API_KEY", "TEF")

# Identificadores padrão de dispositivo IoT para Vinheria
DEFAULT_DEVICE_ID: str = "vine001"
DEFAULT_ENTITY_ID: str = "urn:ngsi-ld:Vine:001"
DEFAULT_ENTITY_TYPE: str = "Vine"
DEFAULT_LAST_N: int = 30
HTTP_TIMEOUT_SECONDS: int = 2

# Códigos de comando remoto enviados pelo Front-end para o ESP32 via FIWARE / MQTT Wokwi
CMD_NORMAL: str = "normal"
CMD_TEMP_ALERT: str = "temp"
CMD_HUM_ALERT: str = "hum"
CMD_LUM_ALERT: str = "lum"
CMD_MULTI_ALERT: str = "multi"

# Descrições detalhadas do padrão sonoro do Buzzer e LED Azul para cada estado
ANOMALY_SOUND_DESCRIPTIONS: Dict[str, Dict[str, str]] = {
    CMD_NORMAL: {
        "label": "Parâmetros Normais",
        "led": "LED Azul DESLIGADO",
        "buzzer": "Buzzer Silenciado (0 Hz)",
        "color": "success",
    },
    CMD_TEMP_ALERT: {
        "label": "Anomalia de Temperatura",
        "led": "LED Azul PISCANDO (Remoto Ativo)",
        "buzzer": "Alerta Sonoro Tipo 1: Bips Agudos Rápidos (2000 Hz)",
        "color": "danger",
    },
    CMD_HUM_ALERT: {
        "label": "Anomalia de Umidade",
        "led": "LED Azul PISCANDO (Remoto Ativo)",
        "buzzer": "Alerta Sonoro Tipo 2: Pulsos Graves Duplos (850 Hz)",
        "color": "warning",
    },
    CMD_LUM_ALERT: {
        "label": "Anomalia de Luminosidade",
        "led": "LED Azul PISCANDO (Remoto Ativo)",
        "buzzer": "Alerta Sonoro Tipo 3: Sirene Alternada (1200 Hz / 1700 Hz)",
        "color": "info",
    },
    CMD_MULTI_ALERT: {
        "label": "Anomalia Múltipla Crítica",
        "led": "LED Azul PISCANDO RÁPIDO (Remoto Ativo)",
        "buzzer": "Alerta Sonoro Tipo 4: Escala Tripla de Emergência (1000/1800/2500 Hz)",
        "color": "danger",
    },
}

# Presets Automáticos de Triggers por Tipo de Vinho (Diferencial - 10% da Nota)
WINE_PRESETS: Dict[str, Dict[str, Any]] = {
    "tinto": {
        "name": "Vinho Tinto Encorpado",
        "description": "Faixa ideal para maturação de tintos (Cabernet, Malbec, Tannat).",
        "temp_min": 14.0,
        "temp_max": 18.0,
        "hum_min": 60.0,
        "hum_max": 75.0,
        "lum_min": 0.0,
        "lum_max": 25.0,
    },
    "branco": {
        "name": "Vinho Branco & Rosé",
        "description": "Refrigeração controlada para preservação de acidez e aromas florais.",
        "temp_min": 8.0,
        "temp_max": 12.0,
        "hum_min": 60.0,
        "hum_max": 75.0,
        "lum_min": 0.0,
        "lum_max": 20.0,
    },
    "espumante": {
        "name": "Espumante & Champagne",
        "description": "Baixa temperatura e alta proteção luminosa para preservar o perlage.",
        "temp_min": 6.0,
        "temp_max": 9.0,
        "hum_min": 65.0,
        "hum_max": 80.0,
        "lum_min": 0.0,
        "lum_max": 15.0,
    },
    "envelhecimento": {
        "name": "Cave de Envelhecimento (Guarda)",
        "description": "Estabilidade térmica rigorosa e escuridão para proteção da rolha.",
        "temp_min": 12.0,
        "temp_max": 15.0,
        "hum_min": 65.0,
        "hum_max": 75.0,
        "lum_min": 0.0,
        "lum_max": 10.0,
    },
}
