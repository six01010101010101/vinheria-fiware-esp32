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
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository


class TriggerAlertService:
    """Motor de regras para verificação de triggers de Temperatura, Umidade e Luminosidade."""

    @staticmethod
    def evaluate_snapshot(
        snapshot: SensorSnapshot,
        triggers: TriggerConfig,
    ) -> AnomalyEvaluation:
        """
        Compara a leitura atual dos sensores com os limites configurados pelo usuário.
        Retorna o código de comando ('normal', 'temp', 'hum', 'lum' ou 'multi')
        e o descritivo do comportamento do LED Azul e Buzzer no ESP32.
        """
        active_anomalies: List[str] = []
        details: List[str] = []
        penalty: int = 0

        # 1. Verificação de Temperatura (°C)
        if snapshot.temperature is not None:
            if snapshot.temperature < triggers.temp_min:
                active_anomalies.append("Temperatura")
                details.append(
                    f"Temperatura ABAIXO do trigger ({snapshot.temperature:.1f}°C < {triggers.temp_min:.1f}°C)"
                )
                penalty += 35
            elif snapshot.temperature > triggers.temp_max:
                active_anomalies.append("Temperatura")
                details.append(
                    f"Temperatura ACIMA do trigger ({snapshot.temperature:.1f}°C > {triggers.temp_max:.1f}°C)"
                )
                penalty += 35

        # 2. Verificação de Umidade (%)
        if snapshot.humidity is not None:
            if snapshot.humidity < triggers.hum_min:
                active_anomalies.append("Umidade")
                details.append(
                    f"Umidade ABAIXO do trigger ({snapshot.humidity:.1f}% < {triggers.hum_min:.1f}%)"
                )
                penalty += 35
            elif snapshot.humidity > triggers.hum_max:
                active_anomalies.append("Umidade")
                details.append(
                    f"Umidade ACIMA do trigger ({snapshot.humidity:.1f}% > {triggers.hum_max:.1f}%)"
                )
                penalty += 35

        # 3. Verificação de Luminosidade (%)
        if snapshot.luminosity is not None:
            if snapshot.luminosity < triggers.lum_min:
                active_anomalies.append("Luminosidade")
                details.append(
                    f"Luminosidade ABAIXO do trigger ({snapshot.luminosity:.1f}% < {triggers.lum_min:.1f}%)"
                )
                penalty += 30
            elif snapshot.luminosity > triggers.lum_max:
                active_anomalies.append("Luminosidade")
                details.append(
                    f"Luminosidade ACIMA do trigger ({snapshot.luminosity:.1f}% > {triggers.lum_max:.1f}%)"
                )
                penalty += 30

        # Determina qual comando remoto (padrão sonoro do Buzzer + LED Azul) deve ser ativado
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
        health_score = max(0, 100 - penalty)

        return AnomalyEvaluation(
            is_anomalous=len(active_anomalies) > 0,
            command_code=cmd,
            active_anomalies=active_anomalies,
            details_messages=details,
            cellar_health_score=health_score,
            led_status_text=sound_meta["led"],
            buzzer_pattern_text=sound_meta["buzzer"],
            badge_color=sound_meta["color"],
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
    ) -> Tuple[AnomalyEvaluation, bool, str]:
        """
        Avalia os triggers e envia o comando remoto instantaneamente via MQTT Real-Time (Wokwi)
        e, quando selecionado o modo FIWARE HTTP, também via PATCH no Orion (:1026).
        """
        evaluation = cls.evaluate_snapshot(snapshot, triggers)
        wokwi_repo = WokwiMqttRepository.get_instance()
        mqtt_ok, mqtt_msg = wokwi_repo.publish_alert_command(evaluation.command_code, force=force)

        if use_fiware_http:
            fiware_repo = FiwareIotRepository(host=host)
            orion_ok, orion_msg = fiware_repo.send_alert_command(
                entity_id=entity_id,
                command_value=evaluation.command_code,
            )
            combined_msg = f"{mqtt_msg} | {orion_msg}"
            return evaluation, (mqtt_ok or orion_ok), combined_msg

        return evaluation, mqtt_ok, mqtt_msg
