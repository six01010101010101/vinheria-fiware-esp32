"""
Serviço de domínio responsável por avaliar os parâmetros da Vinheria frente aos
Triggers definidos no Front-end e acionar remotamente o LED Azul + Buzzer do ESP32
tanto via Broker MQTT Real-Time (Wokwi) quanto via FIWARE Orion Context Broker (:1026).
"""

from typing import List, Tuple
from src.config.settings import (
    ANOMALY_SOUND_DESCRIPTIONS,
    CMD_HUM_ALERT,
    CMD_LUM_ALERT,
    CMD_MULTI_ALERT,
    CMD_NORMAL,
    CMD_TEMP_ALERT,
)
from src.models.iot_models import AnomalyEvaluation, SensorSnapshot, TriggerConfig
from src.repositories.fiware_iot_repository import FiwareIotRepository
from src.repositories.supabase_repository import SupabaseRepository
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository
from src.services.cellar_health_service import compute_health, verdict_for


class TriggerAlertService:
    """Motor de regras para verificação de triggers de Temperatura, Umidade e Luminosidade."""

    @staticmethod
    def evaluate_snapshot(
        snapshot: SensorSnapshot,
        triggers: TriggerConfig,
    ) -> AnomalyEvaluation:
        """Compara a leitura atual dos sensores com os limites e calcula saúde e veredito contínuos."""
        active_anomalies: List[str] = []
        details: List[str] = []

        if snapshot.temperature is not None:
            if snapshot.temperature < triggers.temp_min:
                active_anomalies.append("Temperatura")
                details.append(f"Temperatura ABAIXO do trigger ({snapshot.temperature:.1f}°C < {triggers.temp_min:.1f}°C)")
            elif snapshot.temperature > triggers.temp_max:
                active_anomalies.append("Temperatura")
                details.append(f"Temperatura ACIMA do trigger ({snapshot.temperature:.1f}°C > {triggers.temp_max:.1f}°C)")

        if snapshot.humidity is not None:
            if snapshot.humidity < triggers.hum_min:
                active_anomalies.append("Umidade")
                details.append(f"Umidade ABAIXO do trigger ({snapshot.humidity:.1f}% < {triggers.hum_min:.1f}%)")
            elif snapshot.humidity > triggers.hum_max:
                active_anomalies.append("Umidade")
                details.append(f"Umidade ACIMA do trigger ({snapshot.humidity:.1f}% > {triggers.hum_max:.1f}%)")

        if snapshot.luminosity is not None:
            if snapshot.luminosity < triggers.lum_min:
                active_anomalies.append("Luminosidade")
                details.append(f"Luminosidade ABAIXO do trigger ({snapshot.luminosity:.1f}% < {triggers.lum_min:.1f}%)")
            elif snapshot.luminosity > triggers.lum_max:
                active_anomalies.append("Luminosidade")
                details.append(f"Luminosidade ACIMA do trigger ({snapshot.luminosity:.1f}% > {triggers.lum_max:.1f}%)")

        if not active_anomalies:
            cmd = CMD_NORMAL
            details.append("Todos os parâmetros dentro dos triggers ideais da vinheria.")
        elif len(active_anomalies) > 1:
            cmd = CMD_MULTI_ALERT
        elif active_anomalies[0] == "Temperatura":
            cmd = CMD_TEMP_ALERT
        elif active_anomalies[0] == "Umidade":
            cmd = CMD_HUM_ALERT
        else:
            cmd = CMD_LUM_ALERT

        sound_meta = ANOMALY_SOUND_DESCRIPTIONS[cmd]
        has_any_data = any(v is not None for v in (snapshot.temperature, snapshot.humidity, snapshot.luminosity))
        calc_health = compute_health(snapshot, triggers)
        health_score = calc_health if calc_health is not None else 0
        v_code, v_text, _ = verdict_for(calc_health, len(active_anomalies) > 0)

        return AnomalyEvaluation(
            is_anomalous=len(active_anomalies) > 0,
            command_code=cmd,
            active_anomalies=active_anomalies,
            details_messages=details,
            cellar_health_score=health_score,
            led_status_text=sound_meta["led"],
            buzzer_pattern_text=sound_meta["buzzer"],
            badge_color=sound_meta["color"],
            verdict=v_text,
            verdict_code=v_code,
            has_data=has_any_data,
        )

    @classmethod
    def evaluate_and_dispatch_remote_alert(
        cls,
        host: str,
        entity_id: str,
        snapshot: SensorSnapshot,
        triggers: TriggerConfig,
        use_fiware_http: bool = False,
        force: bool = False,
        preset_lcd: str = "TINTO",
    ) -> Tuple[AnomalyEvaluation, bool, str]:
        """Avalia os triggers, envia diagnóstico com keepalive e espelha no Wokwi."""
        evaluation = cls.evaluate_snapshot(snapshot, triggers)
        wokwi_repo = WokwiMqttRepository.get_instance()
        mqtt_ok, mqtt_msg = wokwi_repo.publish_diagnostic(
            evaluation.command_code, evaluation.cellar_health_score, evaluation.verdict_code, preset_lcd, force=force
        )
        SupabaseRepository.get_instance().sync_telemetry_async(
            device_id=wokwi_repo.device_id,
            snapshot=snapshot,
            evaluation=evaluation,
        )

        if use_fiware_http:
            fiware_repo = FiwareIotRepository(host=host)
            orion_ok, orion_msg = fiware_repo.send_alert_command(entity_id=entity_id, command_value=evaluation.command_code)
            return evaluation, (mqtt_ok or orion_ok), f"{mqtt_msg} | {orion_msg}"

        return evaluation, mqtt_ok, mqtt_msg
