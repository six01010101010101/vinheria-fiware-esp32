"""
Callbacks reativos do Dashboard Dash Otimizados em Tempo Real (1s).
Conecta Presets, Triggers, Gerenciamento de Devices e Telemetria Automática Wokwi MQTT
aos serviços de domínio (TriggerAlertService e DeviceManagerService).
"""

from datetime import datetime
import math
from typing import Any, Dict, List, Tuple
import dash_bootstrap_components as dbc
from dash import Dash, Input, Output, State, ctx
from src.config.settings import DEFAULT_FIWARE_HOST, DEFAULT_WOKWI_BROKER, WINE_PRESETS
from src.models.iot_models import SensorSnapshot, TimeSeriesPoint, TriggerConfig
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository
from src.services.device_manager_service import DeviceManagerService
from src.services.trigger_alert_service import TriggerAlertService
from src.ui.components.charts_and_status import build_sensor_figure
from src.ui.components.status_cards_builder import (
    build_devices_table,
    build_kpi_cards,
    build_remote_alert_banner,
    build_wokwi_status_bar,
)


def register_dashboard_callbacks(app: Dash) -> None:
    """Registra todos os callbacks do Dashboard Dinâmico."""

    @app.callback(
        Output("trigger-temp-min", "value"),
        Output("trigger-temp-max", "value"),
        Output("trigger-hum-min", "value"),
        Output("trigger-hum-max", "value"),
        Output("trigger-lum-min", "value"),
        Output("trigger-lum-max", "value"),
        Output("preset-description-text", "children"),
        Input("dropdown-wine-preset", "value"),
    )
    def apply_wine_preset(preset_key: str) -> Tuple[float, float, float, float, float, float, str]:
        """Aplica automaticamente os limites de Temperatura, Umidade e Luminosidade do Preset."""
        p = WINE_PRESETS.get(preset_key, WINE_PRESETS["tinto"])
        return (
            float(p["temp_min"]), float(p["temp_max"]),
            float(p["hum_min"]), float(p["hum_max"]),
            float(p["lum_min"]), float(p["lum_max"]),
            str(p["description"]),
        )

    @app.callback(
        Output("device-feedback-banner", "children"),
        Output("device-table-container", "children"),
        Input("btn-register-device", "n_clicks"),
        Input("btn-refresh-devices", "n_clicks"),
        Input("btn-delete-device", "n_clicks"),
        State("input-fiware-host", "value"),
        State("reg-device-id", "value"),
        State("reg-entity-name", "value"),
        State("reg-entity-type", "value"),
        State("reg-api-key", "value"),
        prevent_initial_call=True,
    )
    def handle_device_management(
        _reg: int, _ref: int, _del: int, host: str, device_id: str, entity_name: str, entity_type: str, api_key: str
    ) -> Tuple[Any, Any]:
        """Gerencia o cadastro, listagem e exclusão de IoT Devices no IoT Agent (4041)."""
        clean_host = (host or DEFAULT_FIWARE_HOST).strip()
        banner = None

        if ctx.triggered_id == "btn-register-device":
            ok, msg = DeviceManagerService.register_new_device(
                host=clean_host, device_id=device_id, entity_name=entity_name, entity_type=entity_type, api_key=api_key
            )
            banner = dbc.Alert(msg, color="success" if ok else "warning", dismissable=True)
        elif ctx.triggered_id == "btn-delete-device":
            ok, msg = DeviceManagerService.remove_device(host=clean_host, device_id=device_id)
            banner = dbc.Alert(msg, color="info" if ok else "warning", dismissable=True)

        return banner, build_devices_table(DeviceManagerService.list_registered_devices(host=clean_host))

    @app.callback(
        Output("remote-alert-status-banner", "children"),
        Output("realtime-kpi-cards", "children"),
        Output("graph-temperature", "figure"),
        Output("graph-humidity", "figure"),
        Output("graph-luminosity", "figure"),
        Output("store-local-history", "data"),
        Output("wokwi-live-status-bar", "children"),
        Input("interval-auto-refresh", "n_intervals"),
        Input("trigger-temp-min", "value"),
        Input("trigger-temp-max", "value"),
        Input("trigger-hum-min", "value"),
        Input("trigger-hum-max", "value"),
        Input("trigger-lum-min", "value"),
        Input("trigger-lum-max", "value"),
        Input("switch-interactive-mode", "value"),
        Input("sim-temp-input", "value"),
        Input("sim-hum-input", "value"),
        Input("sim-lum-input", "value"),
        Input("btn-publish-mqtt-test", "n_clicks"),
        Input("radio-wokwi-scenario", "value"),
        State("input-wokwi-broker", "value"),
        State("reg-device-id", "value"),
        State("reg-api-key", "value"),
        State("input-fiware-host", "value"),
        State("reg-entity-name", "value"),
        State("reg-entity-type", "value"),
        State("input-last-n", "value"),
        State("store-local-history", "data"),
    )
    def update_monitoring_and_alerts(
        n_intervals: int, t_min: float, t_max: float, h_min: float, h_max: float, l_min: float, l_max: float,
        source_mode: str, sim_temp: float, sim_hum: float, sim_lum: float, _pub_clicks: int,
        scenario_mode: str, wokwi_broker: str, device_id: str, api_key: str, host: str,
        entity_id: str, entity_type: str, last_n: int, local_store: Dict[str, List[Dict[str, Any]]],
    ) -> Tuple[Any, Any, Any, Any, Any, Dict[str, List[Dict[str, Any]]], Any]:
        """Atualiza telemetria em Tempo Real (Wokwi #478106752109243393 / STH-Comet 8666) e dispara alertas ao ESP32."""
        clean_host = (host or DEFAULT_FIWARE_HOST).strip()
        clean_broker = (wokwi_broker or DEFAULT_WOKWI_BROKER).strip()
        clean_entity = (entity_id or "urn:ngsi-ld:Vine:001").strip()
        clean_type = (entity_type or "Vine").strip()
        n_samples = int(last_n or 30)

        triggers = TriggerConfig(
            temp_min=float(t_min if t_min is not None else 14.0),
            temp_max=float(t_max if t_max is not None else 18.0),
            hum_min=float(h_min if h_min is not None else 60.0),
            hum_max=float(h_max if h_max is not None else 75.0),
            lum_min=float(l_min if l_min is not None else 0.0),
            lum_max=float(l_max if l_max is not None else 25.0),
        )

        tick = int(n_intervals or 0)
        wave = math.sin(tick * 0.55)
        base_t = float(sim_temp if sim_temp is not None else 15.5)
        base_h = float(sim_hum if sim_hum is not None else 68.0)
        base_l = float(sim_lum if sim_lum is not None else 12.0)

        cur_t = round(base_t + wave * 0.2, 1)
        cur_h = round(base_h + math.cos(tick * 0.45) * 0.5, 1)
        cur_l = round(max(0.0, base_l + wave * 0.4), 1)

        wokwi_series, wokwi_snap, wokwi_meta = DeviceManagerService.get_wokwi_realtime_data(
            broker_host=clean_broker, device_id=device_id, api_key=api_key, last_n=n_samples
        )
        is_manual_push = ctx.triggered_id in ("btn-publish-mqtt-test", "sim-temp-input", "sim-hum-input", "sim-lum-input")
        if ctx.triggered_id == "btn-publish-mqtt-test":
            WokwiMqttRepository.get_instance().publish_test_telemetry(base_t, base_h, base_l)

        now_str = datetime.now().strftime("%H:%M:%S")
        store = local_store or {"temperature": [], "humidity": [], "luminosity": []}

        if source_mode == "sth":
            sth_series, fiware_snap, _ = DeviceManagerService.get_historical_and_latest_data(
                host=clean_host, entity_type=clean_type, entity_id=clean_entity, last_n=n_samples
            )
            active_snapshot = fiware_snap
            temp_pts, hum_pts, lum_pts = sth_series.temperature, sth_series.humidity, sth_series.luminosity
            source_label = f"STH-Comet ({clean_host}:8666)"
        elif scenario_mode == "wokwi_live" and wokwi_snap is not None and not is_manual_push:
            active_snapshot = wokwi_snap
            temp_pts, hum_pts, lum_pts = wokwi_series.temperature, wokwi_series.humidity, wokwi_series.luminosity
            source_label = "Wokwi #478106752109243393 Ao Vivo"
        else:
            active_snapshot = SensorSnapshot(cur_t, cur_h, cur_l, now_str)
            store["temperature"] = (store.get("temperature", []) + [{"t": now_str, "v": cur_t}])[-n_samples:]
            store["humidity"] = (store.get("humidity", []) + [{"t": now_str, "v": cur_h}])[-n_samples:]
            store["luminosity"] = (store.get("luminosity", []) + [{"t": now_str, "v": cur_l}])[-n_samples:]
            temp_pts = [TimeSeriesPoint(d["t"], float(d["v"])) for d in store["temperature"]]
            hum_pts = [TimeSeriesPoint(d["t"], float(d["v"])) for d in store["humidity"]]
            lum_pts = [TimeSeriesPoint(d["t"], float(d["v"])) for d in store["luminosity"]]
            source_label = "Sincronizado → Wokwi #478106752109243393"

        is_user_action = ctx.triggered_id != "interval-auto-refresh"
        evaluation, dispatch_ok, dispatch_msg = TriggerAlertService.evaluate_and_dispatch_remote_alert(
            host=clean_host,
            entity_id=clean_entity,
            snapshot=active_snapshot,
            triggers=triggers,
            use_fiware_http=(source_mode == "sth"),
            force=is_user_action,
        )

        banner = build_remote_alert_banner(evaluation, dispatch_ok, dispatch_msg, source_label)
        kpis = build_kpi_cards(active_snapshot, triggers)
        fig_t = build_sensor_figure("Temperatura", "°C", temp_pts, triggers.temp_min, triggers.temp_max, "#ff7875")
        fig_h = build_sensor_figure("Umidade Relativa", "%", hum_pts, triggers.hum_min, triggers.hum_max, "#40a9ff")
        fig_l = build_sensor_figure("Luminosidade (LDR)", "%", lum_pts, triggers.lum_min, triggers.lum_max, "#ffd666")

        return banner, kpis, fig_t, fig_h, fig_l, store, build_wokwi_status_bar(wokwi_meta)
