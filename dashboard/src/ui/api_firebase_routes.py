"""
Blueprint Flask com rotas de diagnóstico e sincronização da Nuvem Firebase.
Permite verificar conectividade, status de gravação e telemetria sincronizada.
"""

from datetime import datetime
from typing import Any, Dict
from flask import Blueprint, jsonify, request
from src.repositories.firebase_repository import FirebaseRepository

api_firebase_bp = Blueprint("api_firebase", __name__)


@api_firebase_bp.route("/api/v1/cloud/firebase", methods=["GET"])
def get_firebase_status() -> Any:
    """Retorna o estado operacional e metadados de sincronização do Firebase Realtime DB."""
    repo = FirebaseRepository.get_instance()
    configured = repo.is_configured()
    latest = repo.fetch_latest_telemetry("vine001") if configured else None
    return jsonify({
        "status": "healthy" if configured else "unconfigured",
        "provider": "Google Firebase Realtime Database (REST API :443)",
        "database_url": repo.database_url,
        "is_configured": configured,
        "last_sync_info": repo.last_status,
        "latest_telemetry": {
            "temperature_c": latest.temperature if latest else None,
            "humidity_pct": latest.humidity if latest else None,
            "luminosity_pct": latest.luminosity if latest else None,
            "timestamp": latest.timestamp if latest else None,
        } if latest else None,
        "server_time": datetime.now().isoformat(),
    })


@api_firebase_bp.route("/api/v1/cloud/firebase/sync", methods=["POST"])
def post_firebase_manual_sync() -> Any:
    """Dispara uma sincronização manual de telemetria ou configuração no Firebase."""
    repo = FirebaseRepository.get_instance()
    body: Dict[str, Any] = request.get_json(silent=True) or {}
    device_id = str(body.get("device_id", "vine001"))
    preset_key = str(body.get("preset_key", "tinto"))
    terroir = body.get("terroir", {"name": "Cava Central", "country": "Brasil"})

    repo.sync_preset_and_terroir_async(preset_key, terroir)
    return jsonify({
        "status": "dispatched",
        "device_id": device_id,
        "preset_key": preset_key,
        "firebase_url": repo.database_url,
        "dispatched_at": datetime.now().isoformat(),
    }), 202
