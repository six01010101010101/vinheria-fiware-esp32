"""
Endpoints REST API de Última Geração (Porta 8050) para integração híbrida em Tempo Real
entre o Dashboard Web, o Simulador Wokwi ESP32, o Protótipo Físico em Caixa (ESP32),
FIWARE (Portas 1026, 4041, 8666, 1883) e Supabase Cloud.
"""

from datetime import datetime
from flask import Flask, jsonify, request
from src.config.settings import (
    DEFAULT_API_KEY,
    DEFAULT_DEVICE_ID,
    DEFAULT_ENTITY_ID,
    DEFAULT_FIWARE_HOST,
    DEFAULT_WOKWI_BROKER,
    IOT_AGENT_PORT,
    MQTT_PORT,
    ORION_PORT,
    STH_COMET_PORT,
    WOKWI_PROJECT_URL,
)
from src.models.iot_models import SensorSnapshot, TimeSeriesPoint, TriggerConfig
from src.repositories.supabase_repository import SupabaseRepository
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository
from src.services.trigger_alert_service import TriggerAlertService

GITHUB_REPO_URL = "https://github.com/six01010101010101/checkpoint5-vinheria-fiware-esp32"


def register_api_routes(server: Flask) -> None:
    """Registra rotas REST JSON de baixa latência no servidor Flask subjacente ao Dash."""

    @server.route("/api/v1/status", methods=["GET"])
    def get_system_status():  # type: ignore[no-untyped-def]
        """Retorna o diagnóstico completo em tempo real de portas, links, sensores e atuadores."""
        wokwi_repo = WokwiMqttRepository.get_instance()
        wokwi_repo.ensure_connected()
        _, snap, meta = wokwi_repo.get_realtime_series_and_snapshot(last_n=10)
        active_snap = snap or SensorSnapshot(15.5, 68.0, 12.0, datetime.now().strftime("%H:%M:%S"))
        evaluation = TriggerAlertService.evaluate_snapshot(active_snap, TriggerConfig())
        supa = SupabaseRepository.get_instance()

        return jsonify(
            {
                "status": "online",
                "timestamp": datetime.now().isoformat(),
                "links": {
                    "dashboard_local": "http://127.0.0.1:8050",
                    "api_status": "http://127.0.0.1:8050/api/v1/status",
                    "wokwi_simulation": WOKWI_PROJECT_URL,
                    "github_repository": GITHUB_REPO_URL,
                    "supabase_cloud": supa.project_url or "https://slqozouuqzxwmfswyroo.supabase.co",
                },
                "ports_and_protocols": {
                    "dashboard_http_port": 8050,
                    "mqtt_broker_host": DEFAULT_WOKWI_BROKER,
                    "mqtt_port": MQTT_PORT,
                    "fiware_host": DEFAULT_FIWARE_HOST,
                    "fiware_orion_port": ORION_PORT,
                    "fiware_iot_agent_port": IOT_AGENT_PORT,
                    "fiware_sth_comet_port": STH_COMET_PORT,
                },
                "mqtt_realtime": meta,
                "telemetry": {
                    "device_id": DEFAULT_DEVICE_ID,
                    "entity_id": DEFAULT_ENTITY_ID,
                    "temperature_c": active_snap.temperature,
                    "humidity_pct": active_snap.humidity,
                    "luminosity_pct": active_snap.luminosity,
                    "last_sample_time": active_snap.timestamp,
                },
                "actuators_esp32": {
                    "command_code": evaluation.command_code,
                    "ultralight_cmd": f"{DEFAULT_DEVICE_ID}@alert|{evaluation.command_code}",
                    "led_blue_gpio2": evaluation.led_status_text,
                    "buzzer_gpio4": evaluation.buzzer_pattern_text,
                    "cellar_health_score": evaluation.cellar_health_score,
                    "anomalies": evaluation.active_anomalies,
                },
            }
        )

    @server.route("/api/v1/telemetry", methods=["POST"])
    def ingest_hardware_telemetry():  # type: ignore[no-untyped-def]
        """
        Recebe telemetria direta via HTTP POST do ESP32 Físico ou Wokwi
        (JSON {'temperature': 15.5, 'humidity': 68.0, 'luminosity': 12.0})
        e devolve imediatamente o comando de alerta ativo para o LED Azul e Buzzer.
        """
        data = request.get_json(silent=True) or {}
        try:
            temp = float(data.get("temperature", data.get("t", 15.5)))
            hum = float(data.get("humidity", data.get("h", 68.0)))
            lum = float(data.get("luminosity", data.get("l", 12.0)))
        except (TypeError, ValueError):
            return jsonify({"ok": False, "error": "Valores numéricos inválidos"}), 400

        if not (-40.0 <= temp <= 80.0 and 0.0 <= hum <= 100.0 and 0.0 <= lum <= 100.0):
            return jsonify({"ok": False, "error": "Leitura fora da escala física dos sensores"}), 422

        now_str = datetime.now().strftime("%H:%M:%S")
        snap = SensorSnapshot(temp, hum, lum, now_str)
        wokwi_repo = WokwiMqttRepository.get_instance()
        wokwi_repo.ensure_connected()

        with wokwi_repo.data_lock:
            wokwi_repo.latest_snapshot = snap
            wokwi_repo.last_packet_time = now_str
            wokwi_repo.packets_received += 1
            wokwi_repo.temp_buffer.append(TimeSeriesPoint(now_str, temp))
            wokwi_repo.hum_buffer.append(TimeSeriesPoint(now_str, hum))
            wokwi_repo.lum_buffer.append(TimeSeriesPoint(now_str, lum))

        wokwi_repo.publish_test_telemetry(temp, hum, lum)
        evaluation, ok, msg = TriggerAlertService.evaluate_and_dispatch_remote_alert(
            host=DEFAULT_FIWARE_HOST,
            entity_id=DEFAULT_ENTITY_ID,
            snapshot=snap,
            triggers=TriggerConfig(),
            force=True,
        )

        return jsonify(
            {
                "ok": ok,
                "command_code": evaluation.command_code,
                "ultralight_cmd": f"{DEFAULT_DEVICE_ID}@alert|{evaluation.command_code}",
                "led_blue": evaluation.led_status_text,
                "buzzer": evaluation.buzzer_pattern_text,
                "cellar_health_score": evaluation.cellar_health_score,
                "sync_message": msg,
            }
        )

    @server.route("/api/v1/command", methods=["POST"])
    def dispatch_direct_command():  # type: ignore[no-untyped-def]
        """Envia imediatamente um comando ('normal', 'temp', 'hum', 'lum', 'multi') ao ESP32."""
        data = request.get_json(silent=True) or {}
        cmd = str(data.get("command", "normal")).strip().lower()
        if cmd not in ("normal", "temp", "hum", "lum", "multi"):
            return jsonify({"ok": False, "error": "Comando inválido. Use: normal, temp, hum, lum, multi"}), 400

        wokwi_repo = WokwiMqttRepository.get_instance()
        wokwi_repo.ensure_connected()
        ok, msg = wokwi_repo.publish_alert_command(cmd, force=True)
        return jsonify({"ok": ok, "command": cmd, "topic": f"/{DEFAULT_API_KEY}/{DEFAULT_DEVICE_ID}/cmd", "detail": msg})
