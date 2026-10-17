"""
Componente de Controle de Cenários em Tempo Real (Wokwi #478106752109243393 & Automação).
Permite receber os sensores ao vivo do Wokwi, usar controle manual ou selecionar anomalias
com 1 clique para acionar remotamente os 3 LEDs, a Tela Verde LCD 16x2 e o Buzzer no Wokwi.
"""

from typing import Dict, Tuple
from dash import Dash, Input, Output, State, ctx, no_update
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
        "label": "Operação Normal (15.5°C | 68% | 12% Lum) — LED Verde ON / Azul e Buzzer OFF",
        "temp": 15.5,
        "hum": 68.0,
        "lum": 12.0,
    },
    "temp": {
        "icon": "/assets/icons/temperature.png",
        "label": "Anomalia de Temperatura (24.5°C) — LED Vermelho ON + Azul Pisca + Buzzer 2000 Hz",
        "temp": 24.5,
        "hum": 68.0,
        "lum": 12.0,
    },
    "hum": {
        "icon": "/assets/icons/humidity.png",
        "label": "Anomalia de Umidade (42.0%) — LED Vermelho ON + Azul Pisca + Buzzer 850 Hz",
        "temp": 15.5,
        "hum": 42.0,
        "lum": 12.0,
    },
    "lum": {
        "icon": "/assets/icons/luminosity.png",
        "label": "Anomalia de Luminosidade (78.0%) — LED Vermelho ON + Azul Pisca + Sirene 1200/1700 Hz",
        "temp": 15.5,
        "hum": 68.0,
        "lum": 78.0,
    },
    "multi": {
        "icon": "/assets/icons/temperature.png",
        "label": "Anomalia Múltipla (26.0°C | 38% | 85% Lum) — Alerta Crítico Triplo no Wokwi",
        "temp": 26.0,
        "hum": 38.0,
        "lum": 85.0,
    },
    "custom": {
        "icon": "/assets/icons/wine.png",
        "label": "Controle Manual (Usar Valores de Temp / Umid / Lum Digitados Abaixo)",
        "temp": None,
        "hum": None,
        "lum": None,
    },
}


def register_wokwi_hub_callbacks(app: Dash) -> None:
    """Registra o callback de seleção de cenário e envio manual sem conflito com o modo ao vivo."""

    @app.callback(
        Output("sim-temp-input", "value"),
        Output("sim-hum-input", "value"),
        Output("sim-lum-input", "value"),
        Output("radio-wokwi-scenario", "value"),
        Output("dropdown-real-vineyard", "value"),
        Input("radio-wokwi-scenario", "value"),
        Input("btn-publish-mqtt-test", "n_clicks"),
        State("sim-temp-input", "value"),
        State("sim-hum-input", "value"),
        State("sim-lum-input", "value"),
        prevent_initial_call=True,
    )
    def apply_wokwi_scenario(
        scenario_key: str, _pub_clicks: int, cur_t: float, cur_h: float, cur_l: float
    ) -> Tuple[object, object, object, object, object]:
        """Aplica cenários ou publica valores manuais garantindo sincronia com o Wokwi."""
        wokwi_repo = WokwiMqttRepository.get_instance()

        if ctx.triggered_id == "btn-publish-mqtt-test":
            t_v = float(cur_t if cur_t is not None else 15.5)
            h_v = float(cur_h if cur_h is not None else 68.0)
            l_v = float(cur_l if cur_l is not None else 12.0)
            wokwi_repo.publish_test_telemetry(t_v, h_v, l_v)
            next_mode = "custom" if scenario_key == "wokwi_live" else no_update
            return no_update, no_update, no_update, next_mode, "wokwi_only"

        preset = SCENARIO_PRESETS.get(scenario_key, SCENARIO_PRESETS["wokwi_live"])
        if preset["temp"] is None:
            if scenario_key == "wokwi_live":
                wokwi_repo.publish_alert_command("normal", force=True)
            return no_update, no_update, no_update, no_update, "wokwi_only"

        t_val = float(preset["temp"])  # type: ignore[arg-type]
        h_val = float(preset["hum"])   # type: ignore[arg-type]
        l_val = float(preset["lum"])   # type: ignore[arg-type]

        wokwi_repo.publish_test_telemetry(t_val, h_val, l_val)
        wokwi_repo.publish_alert_command(scenario_key, force=True)
        return t_val, h_val, l_val, no_update, "wokwi_only"

