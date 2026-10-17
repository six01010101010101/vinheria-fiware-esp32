"""
Callbacks reativos do Dashboard Dash Otimizados em Tempo Real (1s).
Conecta Vinícolas Reais do Mundo (Open-Meteo Satélite), Presets, Triggers,
Gerenciamento de Devices e Telemetria Automática Wokwi MQTT aos serviços de domínio.
"""

from datetime import datetime
import math
from typing import Any, Dict, List, Tuple
import dash_bootstrap_components as dbc
from dash import Dash, Input, Output, State, ctx
from src.config.settings import DEFAULT_FIWARE_HOST, DEFAULT_WOKWI_BROKER, WINE_PRESETS
from src.models.iot_models import SensorSnapshot, TimeSeriesPoint, TriggerConfig
from src.repositories.real_vineyards_repository import REAL_VINEYARDS
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository
from src.services.device_manager_service import DeviceManagerService
from src.services.trigger_alert_service import TriggerAlertService
from src.ui.components.charts_and_status import build_sensor_figure
from src.ui.components.hardware_plaque import build_green_hardware_plaque
from src.ui.components.real_vineyards_panel import build_real_vineyards_grid
from src.ui.components.status_cards_builder import (
    build_devices_table,
    build_kpi_cards,
    build_wokwi_status_bar,
)


def _safe_range(v_min: Any, v_max: Any, def_min: float, def_max: float) -> Tuple[float, float]:
    """Garante que os limites de Trigger nunca fiquem nulos ou invertidos (min > max)."""
    try:
        a = float(v_min) if v_min is not None else def_min
    except (ValueError, TypeError):
        a = def_min
    try:
        b = float(v_max) if v_max is not None else def_max
    except (ValueError, TypeError):
        b = def_max
    return (a, b) if a <= b else (b, a)


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
        Output("real-vineyards-global-grid", "children"),
        Input("interval-auto-refresh", "n_intervals"),
        Input("dropdown-real-vineyard", "value"),
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
        n_intervals: int, real_vineyard_id: str, t_min: float, t_max: float, h_min: float, h_max: float,
        l_min: float, l_max: float, source_mode: str, sim_temp: float, sim_hum: float, sim_lum: float,
        _pub_clicks: int, scenario_mode: str, wokwi_broker: str, device_id: str, api_key: str, host: str,
        entity_id: str, entity_type: str, last_n: int, local_store: Dict[str, List[Dict[str, Any]]],
    ) -> Tuple[Any, Any, Any, Any, Any, Dict[str, List[Dict[str, Any]]], Any, Any]:
        """Atualiza telemetria em Tempo Real (Vinícolas Reais / Wokwi / STH-Comet 8666) e dispara alertas ao ESP32."""
        clean_host = (host or DEFAULT_FIWARE_HOST).strip()
        clean_broker = (wokwi_broker or DEFAULT_WOKWI_BROKER).strip()
        clean_entity = (entity_id or "urn:ngsi-ld:Vine:001").strip()
        clean_type = (entity_type or "Vine").strip()
        n_samples = max(5, min(100, int(last_n or 30)))

        t_lo, t_hi = _safe_range(t_min, t_max, 12.0, 18.0)
        h_lo, h_hi = _safe_range(h_min, h_max, 60.0, 75.0)
        l_lo, l_hi = _safe_range(l_min, l_max, 0.0, 25.0)
        triggers = TriggerConfig(t_lo, t_hi, h_lo, h_hi, l_lo, l_hi)

        tick = int(n_intervals or 0)
        wave = math.sin(tick * 0.55)
        cur_t = round(max(-40.0, min(80.0, float(sim_temp if sim_temp is not None else 15.5))) + wave * 0.2, 1)
        cur_h = round(max(0.0, min(100.0, float(sim_hum if sim_hum is not None else 68.0))) + math.cos(tick * 0.45) * 0.5, 1)
        cur_l = round(max(0.0, min(100.0, float(sim_lum if sim_lum is not None else 12.0) + wave * 0.4)), 1)

        wokwi_series, wokwi_snap, wokwi_meta = DeviceManagerService.get_wokwi_realtime_data(
            broker_host=clean_broker, device_id=device_id, api_key=api_key, last_n=n_samples
        )
        now_str = datetime.now().strftime("%H:%M:%S")
        store = local_store or {"temperature": [], "humidity": [], "luminosity": []}

        if source_mode == "sth":
            sth_series, fiware_snap, _ = DeviceManagerService.get_historical_and_latest_data(
                host=clean_host, entity_type=clean_type, entity_id=clean_entity, last_n=n_samples
            )
            active_snapshot = fiware_snap
            temp_pts, hum_pts, lum_pts = sth_series.temperature, sth_series.humidity, sth_series.luminosity
            source_label = f"STH-Comet ({clean_host}:8666)"
        elif real_vineyard_id in REAL_VINEYARDS:
            v_series, v_snap, v_info = DeviceManagerService.get_real_vineyard_data(real_vineyard_id, last_n=n_samples)
            if v_snap is not None and v_info is not None:
                active_snapshot = v_snap
                temp_pts, hum_pts, lum_pts = v_series.temperature, v_series.humidity, v_series.luminosity
                source_label = f"🌍 {v_info.name} ({v_info.region} - {v_info.country})"
                if ctx.triggered_id == "dropdown-real-vineyard" or (tick % 15 == 0 and v_snap.temperature is not None):
                    WokwiMqttRepository.get_instance().publish_test_telemetry(
                        float(v_snap.temperature or 16.0), float(v_snap.humidity or 65.0), float(v_snap.luminosity or 15.0)
                    )
            else:
                active_snapshot = SensorSnapshot(cur_t, cur_h, cur_l, now_str)
                temp_pts, hum_pts, lum_pts = wokwi_series.temperature, wokwi_series.humidity, wokwi_series.luminosity
                source_label = "Wokwi #478106752109243393 Ao Vivo"
        elif scenario_mode == "wokwi_live" and wokwi_snap is not None:
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
        evaluation, _, dispatch_msg = TriggerAlertService.evaluate_and_dispatch_remote_alert(
            host=clean_host, entity_id=clean_entity, snapshot=active_snapshot,
            triggers=triggers, use_fiware_http=(source_mode == "sth"), force=is_user_action,
        )

        banner = build_green_hardware_plaque(active_snapshot, triggers, evaluation, dispatch_msg, source_label)
        kpis = build_kpi_cards(active_snapshot, triggers)
        fig_t = build_sensor_figure("Temperatura", "°C", temp_pts, triggers.temp_min, triggers.temp_max, "#ff7875")
        fig_h = build_sensor_figure("Umidade Relativa", "%", hum_pts, triggers.hum_min, triggers.hum_max, "#40a9ff")
        fig_l = build_sensor_figure("Luminosidade (LDR / Solar)", "%", lum_pts, triggers.lum_min, triggers.lum_max, "#ffd666")
        vine_grid = build_real_vineyards_grid(DeviceManagerService.get_all_real_vineyards_overview(), real_vineyard_id, triggers)

        return banner, kpis, fig_t, fig_h, fig_l, store, build_wokwi_status_bar(wokwi_meta), vine_grid
