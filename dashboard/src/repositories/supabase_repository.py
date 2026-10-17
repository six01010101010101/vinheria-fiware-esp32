"""
Repositório de persistência em nuvem no Supabase (PostgreSQL via PostgREST API).
Sincroniza leituras de telemetria (Temperatura, Umidade, Luminosidade), alertas remotos
e dispositivos IoT cadastrados no projeto 'Vinheria Agnello CP5'.
"""

import os
from pathlib import Path
import threading
import time
from typing import Dict, Optional
import requests
from src.models.iot_models import AnomalyEvaluation, DeviceProvisionSpec, SensorSnapshot


def _load_env_vars() -> Dict[str, str]:
    """Lê variáveis de ambiente do sistema ou do arquivo .env na raiz do projeto."""
    values: Dict[str, str] = {}
    env_file = Path(__file__).resolve().parents[3] / ".env"
    if env_file.exists():
        try:
            for line in env_file.read_text(encoding="utf-8").splitlines():
                clean = line.strip()
                if clean and not clean.startswith("#") and "=" in clean:
                    k, v = clean.split("=", 1)
                    values[k.strip()] = v.strip().strip('"').strip("'")
        except OSError:
            pass
    return values


class SupabaseRepository:
    """Cliente assíncrono não-bloqueante para persistência de telemetria e devices no Supabase."""

    _instance: Optional["SupabaseRepository"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        env_map = _load_env_vars()
        self.project_url: str = os.getenv("SUPABASE_URL", env_map.get("SUPABASE_URL", "")).rstrip("/")
        self.api_key: str = os.getenv("SUPABASE_ANON_KEY", env_map.get("SUPABASE_ANON_KEY", ""))
        self.last_sync_ts: float = 0.0
        self.last_alert_mode: str = ""

    @classmethod
    def get_instance(cls) -> "SupabaseRepository":
        """Retorna a instância Singleton do repositório Supabase."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def is_configured(self) -> bool:
        """Verifica se URL e chave do projeto Supabase estão disponíveis."""
        return bool(self.project_url and self.api_key)

    def _headers(self) -> Dict[str, str]:
        return {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

    def sync_telemetry_async(
        self,
        device_id: str,
        snapshot: SensorSnapshot,
        evaluation: AnomalyEvaluation,
        source: str = "Wokwi #478106752109243393",
    ) -> None:
        """Persiste telemetria no Supabase em thread background quando há mudança de estado ou a cada 10s."""
        if not self.is_configured():
            return
        if snapshot.temperature is None or snapshot.humidity is None or snapshot.luminosity is None:
            return

        now = time.time()
        mode_changed = evaluation.command_code != self.last_alert_mode
        if not mode_changed and (now - self.last_sync_ts) < 10.0:
            return

        self.last_sync_ts = now
        self.last_alert_mode = evaluation.command_code

        payload = {
            "device_id": device_id or "vine001",
            "temperature": round(float(snapshot.temperature), 2),
            "humidity": round(float(snapshot.humidity), 2),
            "luminosity": round(float(snapshot.luminosity), 2),
            "alert_mode": evaluation.command_code,
            "cellar_health_score": evaluation.cellar_health_score,
            "source": source,
        }
        threading.Thread(target=self._post_row, args=("vine_telemetry", payload), daemon=True).start()

    def register_device_async(self, spec: DeviceProvisionSpec) -> None:
        """Persiste ou atualiza um IoT Device na tabela public.vine_devices do Supabase."""
        if not self.is_configured():
            return
        payload = {
            "device_id": spec.device_id,
            "entity_name": spec.entity_name,
            "entity_type": spec.entity_type,
            "api_key": spec.api_key,
            "transport": "MQTT",
        }
        threading.Thread(target=self._upsert_device, args=(payload,), daemon=True).start()

    def _post_row(self, table: str, payload: Dict[str, object]) -> None:
        try:
            requests.post(
                f"{self.project_url}/rest/v1/{table}",
                headers=self._headers(),
                json=payload,
                timeout=2,
            )
        except requests.RequestException:
            pass

    def _upsert_device(self, payload: Dict[str, object]) -> None:
        headers = self._headers()
        headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
        try:
            requests.post(
                f"{self.project_url}/rest/v1/vine_devices",
                headers=headers,
                json=payload,
                timeout=2,
            )
        except requests.RequestException:
            pass
