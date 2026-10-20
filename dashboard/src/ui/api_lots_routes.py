"""
Endpoints REST API para Lotes da Adega (Porta 8050).
Permite consulta em tempo real de todos os lotes, filtros por estilo e país,
e detalhamento individual de safras, validades e telemetria por código do lote.
"""

from typing import Any, Dict
from flask import Flask, jsonify, request
from src.repositories.cellar_lots_repository import CellarLotsRepository
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository
from src.services.cellar_lots_service import CellarLotsService


def register_lots_routes(server: Flask) -> None:
    """Registra rotas REST para gestão de lotes da adega no servidor Flask."""

    @server.route("/api/v1/lots", methods=["GET"])
    def list_cellar_lots():  # type: ignore[no-untyped-def]
        """Retorna lista de lotes da adega avaliados em tempo real com suporte a filtros."""
        style = str(request.args.get("style", "")).strip().lower()
        country = str(request.args.get("country", "")).strip()
        search = str(request.args.get("search", "")).strip().lower()

        wokwi_repo = WokwiMqttRepository.get_instance()
        wokwi_repo.ensure_connected()
        _, snap, _ = wokwi_repo.get_realtime_series_and_snapshot(last_n=1)
        cur_t = float(snap.temperature if snap and snap.temperature is not None else 15.5)
        cur_h = float(snap.humidity if snap and snap.humidity is not None else 68.0)
        cur_l = float(snap.luminosity if snap and snap.luminosity is not None else 12.0)

        evals = CellarLotsService.evaluate_all_lots(cur_t, cur_h, cur_l, style=style, country=country)
        if search:
            evals = [e for e in evals if search in e.lot.name.lower() or search in e.lot.winery_name.lower() or search in e.lot.lot_code.lower()]

        items = [
            {
                "lot_code": e.lot.lot_code,
                "name": e.lot.name,
                "winery": e.lot.winery_name,
                "country": e.lot.country,
                "region": e.lot.region,
                "wine_style": e.lot.wine_style,
                "wine_name": e.lot.wine_name,
                "barrel_type": e.lot.barrel_type,
                "soil": e.lot.soil,
                "vintage": e.lot.vintage,
                "bottling_date": e.lot.bottling_date,
                "expiration_date": e.lot.expiration_date,
                "target_range": {
                    "temperature_c": [e.lot.target_temp_min, e.lot.target_temp_max],
                    "humidity_pct": [e.lot.target_hum_min, e.lot.target_hum_max],
                    "luminosity_max_pct": e.lot.target_lum_max,
                },
                "realtime_telemetry": {
                    "temperature_c": e.current_temp,
                    "humidity_pct": e.current_hum,
                    "luminosity_pct": e.current_lum,
                },
                "evaluation": {
                    "health_score": e.health_score,
                    "verdict": e.verdict,
                    "status_color": e.status_color,
                    "temperature_status": e.temp_status,
                    "humidity_status": e.hum_status,
                    "luminosity_status": e.lum_status,
                    "alerts": e.alerts,
                },
                "stock_bottles": e.lot.stock_bottles,
            }
            for e in evals
        ]

        return jsonify({"count": len(items), "filters": {"style": style or None, "country": country or None, "search": search or None}, "lots": items})

    @server.route("/api/v1/lots/<lot_code>", methods=["GET"])
    def get_single_lot(lot_code: str):  # type: ignore[no-untyped-def]
        """Retorna detalhes completos e status em tempo real de um lote específico."""
        lot = CellarLotsRepository.get_lot_by_code(lot_code.strip())
        if not lot:
            return jsonify({"ok": False, "error": f"Lote '{lot_code}' não encontrado"}), 404

        wokwi_repo = WokwiMqttRepository.get_instance()
        _, snap, _ = wokwi_repo.get_realtime_series_and_snapshot(last_n=1)
        cur_t = float(snap.temperature if snap and snap.temperature is not None else 15.5)
        cur_h = float(snap.humidity if snap and snap.humidity is not None else 68.0)
        cur_l = float(snap.luminosity if snap and snap.luminosity is not None else 12.0)
        ev = CellarLotsService.evaluate_lot(lot, cur_t, cur_h, cur_l)

        return jsonify({"ok": True, "lot": lot.__dict__, "current_evaluation": ev.__dict__})
