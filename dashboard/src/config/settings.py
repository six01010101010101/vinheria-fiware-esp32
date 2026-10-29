"""
Módulo de configurações centralizadas e constantes do Dashboard FIWARE & Wokwi Real-Time.
Define portas padrão (Orion 1026, IoT Agent 4041, STH-Comet 8666, MQTT 1883),
cabeçalhos FIWARE, tópicos Ultralight 2.0 e Presets de Vinho (8 estilos enológicos).
"""

import os
from typing import Any, Dict

# Configurações de rede padrão do servidor FIWARE, Broker MQTT Wokwi e APIs em Nuvem (Plug-and-Play)
DEFAULT_FIWARE_HOST: str = os.getenv("FIWARE_HOST", "localhost")
DEFAULT_WOKWI_BROKER: str = os.getenv("WOKWI_MQTT_BROKER", "broker.hivemq.com")
WOKWI_PROJECT_URL: str = "https://wokwi.com/projects/478106752109243393"
OPEN_METEO_API_URL: str = "https://api.open-meteo.com/v1/forecast"
DEFAULT_SUPABASE_URL: str = os.getenv(
    "SUPABASE_URL", "https://slqozouuqzxwmfswyroo.supabase.co"
)
DEFAULT_SUPABASE_ANON_KEY: str = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscW96b3V1cXp4d21mc3d5cm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDkxOTMsImV4cCI6MjEwNzc4NTE5M30.spwyPsi31yzG6rvh2FsSHWM8Fkv2CPLHpUx9Us8aRo4",
)
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

# Descrições detalhadas do padrão sonoro do Buzzer e LEDs (Verde, Amarelo e Vermelho)
ANOMALY_SOUND_DESCRIPTIONS: Dict[str, Dict[str, str]] = {
    CMD_NORMAL: {
        "label": "Parâmetros Normais (Ideal)",
        "led": "LED Verde ON (Amarelo/Vermelho OFF)",
        "buzzer": "Buzzer Silenciado (0 Hz)",
        "color": "success",
    },
    CMD_TEMP_ALERT: {
        "label": "Anomalia de Temperatura",
        "led": "LED Amarelo PISCANDO (Atenção / Desvio)",
        "buzzer": "Alerta Sonoro Tipo 1: Bips Agudos Rápidos (2000 Hz)",
        "color": "warning",
    },
    CMD_HUM_ALERT: {
        "label": "Anomalia de Umidade",
        "led": "LED Amarelo PISCANDO (Atenção / Desvio)",
        "buzzer": "Alerta Sonoro Tipo 2: Pulsos Graves Duplos (850 Hz)",
        "color": "warning",
    },
    CMD_LUM_ALERT: {
        "label": "Anomalia de Luminosidade",
        "led": "LED Amarelo PISCANDO (Atenção / Desvio)",
        "buzzer": "Alerta Sonoro Tipo 3: Sirene Alternada (1200 Hz / 1700 Hz)",
        "color": "info",
    },
    CMD_MULTI_ALERT: {
        "label": "Anomalia Múltipla Crítica",
        "led": "LED Vermelho PISCANDO RÁPIDO (Crítico Ativo)",
        "buzzer": "Alerta Sonoro Tipo 4: Escala Tripla de Emergência (1000/1800/2500 Hz)",
        "color": "danger",
    },
}

# Tempo máximo sem pacotes do Wokwi para considerá-lo AO VIVO e keepalive do diagnóstico enviado ao ESP32
WOKWI_LIVE_TIMEOUT_S: float = float(os.getenv("WOKWI_LIVE_TIMEOUT_S", "6"))
DIAG_KEEPALIVE_S: float = 3.0
SYNC_PUSH_EVERY_S: float = 5.0

# Presets Automáticos de Triggers por Tipo de Vinho (8 Estilos + Cave de Guarda)
WINE_PRESETS: Dict[str, Dict[str, Any]] = {
    "tinto": {
        "name": "🍷 Vinho Tinto Encorpado", "style": "tinto", "lcd": "TINTO",
        "description": "Maturação de tintos (Cabernet, Malbec, Tannat): taninos estáveis e oxidação lenta.",
        "temp_min": 14.0, "temp_max": 18.0, "hum_min": 60.0, "hum_max": 75.0, "lum_min": 0.0, "lum_max": 25.0,
        "def_temp": 15.8, "def_hum": 68.0, "def_lum": 9.0,
    },
    "branco": {
        "name": "🥂 Vinho Branco Reserva", "style": "branco", "lcd": "BRANC",
        "description": "Refrigeração controlada para preservar acidez, aromas florais e evitar acastanhamento.",
        "temp_min": 8.0, "temp_max": 12.0, "hum_min": 60.0, "hum_max": 75.0, "lum_min": 0.0, "lum_max": 15.0,
        "def_temp": 10.0, "def_hum": 68.0, "def_lum": 7.0,
    },
    "rose": {
        "name": "🌸 Vinho Rosé de Provence", "style": "rose", "lcd": "ROSE",
        "description": "Garrafa clara e baixa extração: frio moderado e mínima luz preservam cor e frescor.",
        "temp_min": 10.0, "temp_max": 13.0, "hum_min": 60.0, "hum_max": 75.0, "lum_min": 0.0, "lum_max": 12.0,
        "def_temp": 11.5, "def_hum": 67.0, "def_lum": 6.0,
    },
    "espumante": {
        "name": "🍾 Espumante Brut & Champagne", "style": "espumante", "lcd": "BRUT",
        "description": "Baixa temperatura e escuridão para manter a pressão de CO2 e a finesse do perlage.",
        "temp_min": 6.0, "temp_max": 9.0, "hum_min": 65.0, "hum_max": 80.0, "lum_min": 0.0, "lum_max": 10.0,
        "def_temp": 7.5, "def_hum": 72.0, "def_lum": 5.0,
    },
    "pinot": {
        "name": "🍒 Pinot Noir (Borgonha Cru)", "style": "pinot", "lcd": "PINOT",
        "description": "Guarda delicada de Pinot Noir: proteção de aromas terciários de trufa e cereja.",
        "temp_min": 12.0, "temp_max": 15.0, "hum_min": 65.0, "hum_max": 75.0, "lum_min": 0.0, "lum_max": 15.0,
        "def_temp": 13.4, "def_hum": 70.0, "def_lum": 8.0,
    },
    "porto": {
        "name": "🏺 Vinho do Porto (Vintage)", "style": "porto", "lcd": "PORTO",
        "description": "Longevidade secular de fortificados do Douro: estabilidade alcoólica e taninos.",
        "temp_min": 15.0, "temp_max": 18.0, "hum_min": 65.0, "hum_max": 75.0, "lum_min": 0.0, "lum_max": 20.0,
        "def_temp": 16.4, "def_hum": 69.0, "def_lum": 10.0,
    },
    "fortificado": {
        "name": "🏺 Vinho do Porto & Madeira", "style": "fortificado", "lcd": "PORTO",
        "description": "Estágio oxidativo controlado para vinhos fortificados de guarda secular.",
        "temp_min": 14.0, "temp_max": 18.0, "hum_min": 60.0, "hum_max": 75.0, "lum_min": 0.0, "lum_max": 20.0,
        "def_temp": 16.0, "def_hum": 68.0, "def_lum": 10.0,
    },
    "sobremesa": {
        "name": "🍯 Colheita Tardia (Sauternes)", "style": "sobremesa", "lcd": "DOCE",
        "description": "Preservação de vinhos nobres de sobremesa: equilíbrio entre doçura botritizada e acidez.",
        "temp_min": 9.0, "temp_max": 12.0, "hum_min": 65.0, "hum_max": 78.0, "lum_min": 0.0, "lum_max": 12.0,
        "def_temp": 10.4, "def_hum": 72.0, "def_lum": 6.0,
    },
    "laranja": {
        "name": "🍊 Vinho Laranja (Ânfora)", "style": "laranja", "lcd": "LARAN",
        "description": "Afinação em ânfora de terracota: preservação fenólica e textura gastronômica.",
        "temp_min": 11.0, "temp_max": 14.0, "hum_min": 60.0, "hum_max": 72.0, "lum_min": 0.0, "lum_max": 15.0,
        "def_temp": 12.6, "def_hum": 66.0, "def_lum": 8.0,
    },
    "envelhecimento": {
        "name": "Cave de Envelhecimento (Guarda)", "style": "tinto", "lcd": "GUARD",
        "description": "Estabilidade térmica rigorosa e escuridão para proteção da rolha em guarda longa.",
        "temp_min": 12.0, "temp_max": 15.0, "hum_min": 65.0, "hum_max": 75.0, "lum_min": 0.0, "lum_max": 10.0,
        "def_temp": 13.5, "def_hum": 70.0, "def_lum": 8.0,
    },
}
