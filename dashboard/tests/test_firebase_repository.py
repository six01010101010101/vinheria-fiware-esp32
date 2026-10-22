"""
Testes Unitários TDD para o Repositório de Nuvem Firebase Realtime Database.
Verifica instanciação Singleton, formatação de URLs, serialização e tolerância a falhas.
"""

from unittest.mock import MagicMock, patch
import pytest
from src.models.iot_models import SensorSnapshot, TriggerConfig
from src.repositories.firebase_repository import FirebaseRepository
from src.services.trigger_alert_service import TriggerAlertService


def test_firebase_repository_singleton():
    """Garante que FirebaseRepository respeita o padrão Singleton thread-safe."""
    r1 = FirebaseRepository.get_instance()
    r2 = FirebaseRepository.get_instance()
    assert r1 is r2
    assert "firebaseio.com" in r1.database_url


def test_firebase_url_generation():
    """Valida a formação correta de endpoints REST JSON do Firebase."""
    repo = FirebaseRepository.get_instance()
    url = repo._url("vinheria/telemetry/vine001")
    assert url.endswith("/vinheria/telemetry/vine001.json")
    assert url.startswith("https://")


def test_firebase_sync_telemetry_async_does_not_raise():
    """Valida disparo de persistência assíncrona com thread background sem travar o loop."""
    repo = FirebaseRepository.get_instance()
    snap = SensorSnapshot(14.8, 67.0, 11.0, "12:00:00")
    eval_res = TriggerAlertService.evaluate_snapshot(snap, TriggerConfig())
    with patch.object(repo._session, "put") as mock_put:
        mock_put.return_value = MagicMock(ok=True, status_code=200)
        repo.sync_telemetry_async("vine001", snap, eval_res)
        assert repo.last_sync_ts > 0


def test_firebase_fetch_latest_telemetry_handles_network_error():
    """Garante resiliência total contra quedas de rede ou timeouts."""
    repo = FirebaseRepository.get_instance()
    with patch.object(repo._session, "get", side_effect=Exception("Timeout no gateway")):
        result = repo.fetch_latest_telemetry("vine001")
        assert result is None
