"""
Componente de Controle de Cenários em Tempo Real (Wokwi MQTT & Automação).
Permite selecionar cenários de operação normal ou anomalias específicas com 1 clique,
sincronizando automaticamente as leituras e o disparo remoto para o ESP32 no Wokwi.
"""

from typing import Dict, Tuple
from dash import Dash, Input, Output, no_update
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository

SCENARIO_PRESETS: Dict[str, Dict[str, object]] = {
    "normal": {
        "label": "🟢 Operação Normal Automática (15.5°C | 68% | 12% Lum) — LED e Buzzer Desligados",
        "temp": 15.5,
        "hum": 68.0,
        "lum": 12.0,
    },
    "temp": {
        "label": "🌡️ Anomalia de Temperatura (24.5°C) — Ativa LED Azul + Buzzer 2000 Hz",
        "temp": 24.5,
        "hum": 68.0,
        "lum": 12.0,
    },
    "hum": {
        "label": "💧 Anomalia de Umidade (42.0%) — Ativa LED Azul + Buzzer 850 Hz",
        "temp": 15.5,
        "hum": 42.0,
        "lum": 12.0,
    },
    "lum": {
        "label": "☀️ Anomalia de Luminosidade (78.0%) — Ativa LED Azul + Sirene 1200/1700 Hz",
        "temp": 15.5,
        "hum": 68.0,
        "lum": 78.0,
    },
    "multi": {
        "label": "🚨 Anomalia Múltipla (26.0°C | 38% | 85% Lum) — LED Rápido + Escala Tripla",
        "temp": 26.0,
        "hum": 38.0,
        "lum": 85.0,
    },
    "manual": {
        "label": "🎛️ Ajuste Manual Livre / Recepção Exclusiva do Wokwi",
        "temp": None,
        "hum": None,
        "lum": None,
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
        preset = SCENARIO_PRESETS.get(scenario_key, SCENARIO_PRESETS["normal"])
        if preset["temp"] is None:
            return no_update, no_update, no_update

        t_val = float(preset["temp"])  # type: ignore[arg-type]
        h_val = float(preset["hum"])   # type: ignore[arg-type]
        l_val = float(preset["lum"])   # type: ignore[arg-type]

        wokwi_repo = WokwiMqttRepository.get_instance()
        wokwi_repo.publish_test_telemetry(t_val, h_val, l_val)
        wokwi_repo.publish_alert_command(scenario_key, force=True)
        return t_val, h_val, l_val
