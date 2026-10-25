"""
Endpoints REST API de Última Geração (Porta 8050) para integração híbrida em Tempo Real
entre o Dashboard Web, o Simulador Wokwi ESP32, o Protótipo Físico em Caixa (ESP32),
as 9 Vinícolas Reais do Mundo (Open-Meteo), FIWARE (1026, 4041, 8666, 1883) e Supabase SQL.
"""

import os
from datetime import datetime
from flask import Flask, jsonify, request
from src.config.settings import (
    DEFAULT_API_KEY, DEFAULT_DEVICE_ID, DEFAULT_ENTITY_ID, DEFAULT_FIWARE_HOST,
    DEFAULT_WOKWI_BROKER, IOT_AGENT_PORT, MQTT_PORT, ORION_PORT,
    STH_COMET_PORT, WOKWI_PROJECT_URL,
)
from src.models.iot_models import SensorSnapshot, TimeSeriesPoint, TriggerConfig
from src.repositories.real_vineyards_repository import REAL_VINEYARDS, RealVineyardsRepository
from src.repositories.supabase_repository import SupabaseRepository
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository
from src.services.trigger_alert_service import TriggerAlertService
from src.ui.api_cloud_routes import register_cloud_routes
from src.ui.api_html_view import render_api_status_html
from src.ui.api_lots_routes import register_lots_routes
from src.ui.api_openapi import register_openapi_routes

GITHUB_REPO_URL = "https://github.com/six01010101010101/vinheria-fiware-esp32"


def register_api_routes(server: Flask) -> None:
    """Registra rotas REST JSON de baixa latência no servidor Flask subjacente ao Dash."""
    register_lots_routes(server)
    register_openapi_routes(server)
    register_cloud_routes(server)

    @server.route("/api/v1/status", methods=["GET"])
    def get_system_status():  # type: ignore[no-untyped-def]
        """Retorna o diagnóstico completo em tempo real de portas, links, sensores e atuadores."""
        wokwi_repo = WokwiMqttRepository.get_instance()
        wokwi_repo.ensure_connected()
        _, snap, meta = wokwi_repo.get_realtime_series_and_snapshot(last_n=10)
        active_snap = snap or SensorSnapshot(15.5, 68.0, 12.0, datetime.now().strftime("%H:%M:%S"))
        evaluation = TriggerAlertService.evaluate_snapshot(active_snap, TriggerConfig())
        supa = SupabaseRepository.get_instance()

        base_url = request.host_url.rstrip("/") if request else "http://127.0.0.1:8050"
        server_port = int(request.environ.get("SERVER_PORT", os.getenv("PORT", "8050"))) if request else 8050
        payload = {
            "status": "online",
            "timestamp": datetime.now().isoformat(),
            "links": {
                "dashboard": f"{base_url}/", "api_status": f"{base_url}/api/v1/status",
                "api_cellar_lots": f"{base_url}/api/v1/lots", "api_real_vineyards": f"{base_url}/api/v1/vineyards",
                "api_cloud_info": f"{base_url}/api/v1/cloud/info", "api_openapi_spec": f"{base_url}/api/v1/openapi.json",
                "wokwi_simulation": WOKWI_PROJECT_URL, "github_repository": GITHUB_REPO_URL,
                "supabase_cloud": supa.project_url or "https://slqozouuqzxwmfswyroo.supabase.co",
            },
            "ports_and_protocols": {
                "dashboard_http_port": server_port,
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
        accept_hdr = request.headers.get("Accept", "")
        if "text/html" in accept_hdr and "application/json" not in accept_hdr and request.args.get("format") != "json":
            return render_api_status_html(payload), 200, {"Content-Type": "text/html; charset=utf-8"}
        return jsonify(payload)

    @server.route("/api/v1/vineyards", methods=["GET"])
    def get_real_vineyards():  # type: ignore[no-untyped-def]
        """Retorna telemetria ao vivo das 9 vinícolas reais ou série 24h de uma vinícola (?id=miolo_br)."""
        repo = RealVineyardsRepository.get_instance()
        vid = str(request.args.get("id", "")).strip()
        if vid and vid in REAL_VINEYARDS:
            last_n = max(6, min(48, int(request.args.get("last_n", 24))))
            series, _, info = repo.fetch_vineyard_telemetry(vid, last_n=last_n)
            return jsonify(
                {
                    "vineyard_id": vid,
                    "current": info.__dict__ if info else None,
                    "history_24h": {
                        "temperature": [p.__dict__ for p in series.temperature],
                        "humidity": [p.__dict__ for p in series.humidity],
                        "luminosity": [p.__dict__ for p in series.luminosity],
                    },
                }
            )

        items = repo.fetch_all_vineyards_overview()
        return jsonify(
            {
                "source": "Open-Meteo Satellite & Weather Stations (Real-Time)",
                "count": len(items),
                "vineyards": [
                    {
                        "vineyard_id": v.vineyard_id,
                        "name": v.name,
                        "region": v.region,
                        "country": v.country,
                        "latitude": v.latitude,
                        "longitude": v.longitude,
                        "temperature_c": v.temperature,
                        "humidity_pct": v.humidity,
                        "luminosity_pct": v.luminosity,
                        "solar_radiation_wm2": v.solar_wm2,
                        "dew_point_c": v.dew_point,
                        "is_day": v.is_day,
                        "local_time": v.local_time,
                    }
                    for v in items
                ],
            }
        )

    @server.route("/api/v1/telemetry", methods=["POST"])
    def ingest_hardware_telemetry():  # type: ignore[no-untyped-def]
        """Recebe telemetria direta via HTTP POST do ESP32 Físico ou Wokwi e devolve o alerta ativo."""
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
            host=DEFAULT_FIWARE_HOST, entity_id=DEFAULT_ENTITY_ID,
            snapshot=snap, triggers=TriggerConfig(), force=True,
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
        """Envia comando, preset enológico, diagnóstico e telemetria ao ESP32 Wokwi."""
        data = request.get_json(silent=True) or {}
        raw_cmd = str(data.get("command", "normal")).strip().lower()
        cmd = raw_cmd if raw_cmd in ("normal", "padrao", "temp", "hum", "lum", "multi") else "normal"
        pr = str(data.get("preset", data.get("wine", "TINTO"))).strip().upper()[:5]
        health = int(data.get("health", 100))
        verdict = str(data.get("verdict", "OK")).strip().upper()[:3]
        wokwi = WokwiMqttRepository.get_instance()
        wokwi.ensure_connected()
        if "temperature" in data:
            try:
                wokwi.publish_sync(float(data["temperature"]), float(data.get("humidity", 68)), float(data.get("luminosity", 12)))
            except (ValueError, TypeError):
                pass
        ok, msg = wokwi.publish_diagnostic(cmd, health, verdict, pr, force=True)
        wokwi.publish_alert_command(cmd, force=True)
        return jsonify({"ok": ok, "command": cmd, "preset": pr, "health": health, "topic": f"/{DEFAULT_API_KEY}/{DEFAULT_DEVICE_ID}/cmd", "detail": msg})
