"""
Componente de Controle de Cenários em Tempo Real (Wokwi #478106752109243393 & Automação).
Permite receber os sensores ao vivo do Wokwi ou selecionar anomalias com 1 clique
para acionar remotamente o LED Azul e o Buzzer no projeto Wokwi.
"""

from typing import Dict, Tuple
from dash import Dash, Input, Output, no_update
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository

SCENARIO_PRESETS: Dict[str, Dict[str, object]] = {
    "wokwi_live": {
        "icon": "/assets/icons/wine.png",
        "label": "Receber Sensores Ao Vivo do Wokwi (#478106752109243393)",
        "temp": None,
        "hum": None,
        "lum": None,
    },
    "normal": {
        "icon": "/assets/icons/wine.png",
        "label": "Operação Normal (15.5°C | 68% | 12% Lum) — Desliga LED e Buzzer no Wokwi",
        "temp": 15.5,
        "hum": 68.0,
        "lum": 12.0,
    },
    "temp": {
        "icon": "/assets/icons/temperature.png",
        "label": "Anomalia de Temperatura (24.5°C) — Ativa LED Azul + Buzzer 2000 Hz no Wokwi",
        "temp": 24.5,
        "hum": 68.0,
        "lum": 12.0,
    },
    "hum": {
        "icon": "/assets/icons/humidity.png",
        "label": "Anomalia de Umidade (42.0%) — Ativa LED Azul + Buzzer 850 Hz no Wokwi",
        "temp": 15.5,
        "hum": 42.0,
        "lum": 12.0,
    },
    "lum": {
        "icon": "/assets/icons/luminosity.png",
        "label": "Anomalia de Luminosidade (78.0%) — Ativa LED Azul + Sirene 1200/1700 Hz no Wokwi",
        "temp": 15.5,
        "hum": 68.0,
        "lum": 78.0,
    },
    "multi": {
        "icon": "/assets/icons/temperature.png",
        "label": "Anomalia Múltipla (26.0°C | 38% | 85% Lum) — LED Rápido + Escala Tripla no Wokwi",
        "temp": 26.0,
        "hum": 38.0,
        "lum": 85.0,
    },
}


def register_wokwi_hub_callbacks(app: Dash) -> None:
    """Registra o callback de seleção de cenário em tempo real."""

    @app.callback(
        Output("sim-temp-input", "value"),
        Output("sim-hum-input", "value"),
        Output("sim-lum-input", "value"),
        Input("radio-wokwi-scenario", "value"),
        prevent_initial_call=True,
    )
    def apply_wokwi_scenario(scenario_key: str) -> Tuple[object, object, object]:
        """Aplica os valores do cenário selecionado e publica imediatamente via MQTT para o Wokwi."""
        preset = SCENARIO_PRESETS.get(scenario_key, SCENARIO_PRESETS["wokwi_live"])
        if preset["temp"] is None:
            return no_update, no_update, no_update

        t_val = float(preset["temp"])  # type: ignore[arg-type]
        h_val = float(preset["hum"])   # type: ignore[arg-type]
        l_val = float(preset["lum"])   # type: ignore[arg-type]

        wokwi_repo = WokwiMqttRepository.get_instance()
        wokwi_repo.publish_test_telemetry(t_val, h_val, l_val)
        wokwi_repo.publish_alert_command(scenario_key, force=True)
        return t_val, h_val, l_val
