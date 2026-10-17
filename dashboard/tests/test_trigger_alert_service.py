"""
Testes unitários (TDD) para o serviço de avaliação de Triggers e geração de alertas
sonoros/visuais distintos enviados remotamente para o ESP32.
"""

from src.config.settings import (
    CMD_HUM_ALERT,
    CMD_LUM_ALERT,
    CMD_MULTI_ALERT,
    CMD_NORMAL,
    CMD_TEMP_ALERT,
)
from src.models.iot_models import SensorSnapshot, TriggerConfig
from src.services.trigger_alert_service import TriggerAlertService


def test_normal_readings_return_normal_command() -> None:
    """Quando temperatura, umidade e luminosidade estão na faixa ideal, envia comando normal."""
    triggers = TriggerConfig(
        temp_min=12.0,
        temp_max=18.0,
        hum_min=60.0,
        hum_max=75.0,
        lum_min=0.0,
        lum_max=25.0,
    )
    snapshot = SensorSnapshot(
        temperature=15.0,
        humidity=68.0,
        luminosity=10.0,
        timestamp="2026-10-16T15:00:00Z",
    )
    evaluation = TriggerAlertService.evaluate_snapshot(snapshot, triggers)

    assert evaluation.is_anomalous is False
    assert evaluation.command_code == CMD_NORMAL
    assert evaluation.cellar_health_score == 100
    assert len(evaluation.active_anomalies) == 0


def test_temperature_out_of_bounds_triggers_temp_alert() -> None:
    """Anomalia exclusiva de temperatura deve acionar comando 'temp' (Buzzer Tipo 1 + LED Azul)."""
    triggers = TriggerConfig(temp_min=14.0, temp_max=18.0)
    snapshot = SensorSnapshot(
        temperature=23.5,
        humidity=65.0,
        luminosity=12.0,
        timestamp="2026-10-16T15:01:00Z",
    )
    evaluation = TriggerAlertService.evaluate_snapshot(snapshot, triggers)

    assert evaluation.is_anomalous is True
    assert evaluation.command_code == CMD_TEMP_ALERT
    assert "Temperatura" in evaluation.active_anomalies
    assert "2000 Hz" in evaluation.buzzer_pattern_text
    assert "PISCANDO" in evaluation.led_status_text


def test_humidity_out_of_bounds_triggers_hum_alert() -> None:
    """Anomalia exclusiva de umidade deve acionar comando 'hum' (Buzzer Tipo 2 + LED Azul)."""
    triggers = TriggerConfig(hum_min=60.0, hum_max=75.0)
    snapshot = SensorSnapshot(
        temperature=15.0,
        humidity=42.0,
        luminosity=10.0,
        timestamp="2026-10-16T15:02:00Z",
    )
    evaluation = TriggerAlertService.evaluate_snapshot(snapshot, triggers)

    assert evaluation.is_anomalous is True
    assert evaluation.command_code == CMD_HUM_ALERT
    assert "Umidade" in evaluation.active_anomalies
    assert "850 Hz" in evaluation.buzzer_pattern_text


def test_luminosity_out_of_bounds_triggers_lum_alert() -> None:
    """Anomalia exclusiva de luminosidade deve acionar comando 'lum' (Buzzer Tipo 3 + LED Azul)."""
    triggers = TriggerConfig(lum_min=0.0, lum_max=20.0)
    snapshot = SensorSnapshot(
        temperature=15.0,
        humidity=68.0,
        luminosity=55.0,
        timestamp="2026-10-16T15:03:00Z",
    )
    evaluation = TriggerAlertService.evaluate_snapshot(snapshot, triggers)

    assert evaluation.is_anomalous is True
    assert evaluation.command_code == CMD_LUM_ALERT
    assert "Luminosidade" in evaluation.active_anomalies
    assert "1200 Hz" in evaluation.buzzer_pattern_text


def test_multiple_anomalies_trigger_multi_alert() -> None:
    """Mais de um parâmetro fora dos triggers deve acionar comando 'multi' (Buzzer Tipo 4)."""
    triggers = TriggerConfig(
        temp_min=14.0,
        temp_max=18.0,
        hum_min=60.0,
        hum_max=75.0,
        lum_min=0.0,
        lum_max=20.0,
    )
    snapshot = SensorSnapshot(
        temperature=24.0,
        humidity=45.0,
        luminosity=80.0,
        timestamp="2026-10-16T15:04:00Z",
    )
    evaluation = TriggerAlertService.evaluate_snapshot(snapshot, triggers)

    assert evaluation.is_anomalous is True
    assert evaluation.command_code == CMD_MULTI_ALERT
    assert len(evaluation.active_anomalies) == 3
    assert evaluation.cellar_health_score < 50
