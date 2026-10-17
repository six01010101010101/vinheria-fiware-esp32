"""
Repositório Otimizado de Persistência em Nuvem no Supabase (PostgreSQL via PostgREST API).
Utiliza Pool de Conexões HTTP Keep-Alive, Upsert em Lote das 9 Vinícolas Reais do Mundo
e consulta à View Analítica Otimizada (public.v_vine_telemetry_summary).
"""

import os
from pathlib import Path
import threading
import time
from typing import Dict, List, Optional
import requests
from requests.adapters import HTTPAdapter
from src.models.iot_models import (
    AnomalyEvaluation,
    DeviceProvisionSpec,
    RealVineyardTelemetry,
    SensorSnapshot,
)


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
    """Cliente assíncrono com Connection Pool para persistência de telemetria e vinícolas no Supabase."""

    _instance: Optional["SupabaseRepository"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        env_map = _load_env_vars()
        self.project_url: str = os.getenv("SUPABASE_URL", env_map.get("SUPABASE_URL", "")).rstrip("/")
        self.api_key: str = os.getenv("SUPABASE_ANON_KEY", env_map.get("SUPABASE_ANON_KEY", ""))
        self.last_sync_ts: float = 0.0
        self.last_vineyards_sync_ts: float = 0.0
        self.last_alert_mode: str = ""
        self._session = requests.Session()
        adapter = HTTPAdapter(pool_connections=8, pool_maxsize=16)
        self._session.mount("https://", adapter)
        self._session.mount("http://", adapter)

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

    def _headers(self, prefer: str = "return=minimal") -> Dict[str, str]:
        return {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Prefer": prefer,
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
        threading.Thread(target=self._post_json, args=("vine_telemetry", payload, "return=minimal"), daemon=True).start()

    def sync_real_vineyards_async(self, vineyards: List[RealVineyardTelemetry]) -> None:
        """Faz upsert em lote (Batch SQL) das 9 vinícolas reais na tabela public.real_vineyards_status."""
        if not self.is_configured() or not vineyards:
            return
        now = time.time()
        if (now - self.last_vineyards_sync_ts) < 45.0:
            return
        self.last_vineyards_sync_ts = now
        rows = [
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
                "solar_wm2": v.solar_wm2,
                "dew_point_c": v.dew_point,
                "is_day": v.is_day,
                "local_time": v.local_time,
            }
            for v in vineyards
        ]
        prefer = "resolution=merge-duplicates,return=minimal"
        threading.Thread(target=self._post_json, args=("real_vineyards_status", rows, prefer), daemon=True).start()

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
        prefer = "resolution=merge-duplicates,return=minimal"
        threading.Thread(target=self._post_json, args=("vine_devices", payload, prefer), daemon=True).start()

    def fetch_telemetry_summary(self) -> List[Dict[str, object]]:
        """Consulta a View SQL otimizada public.v_vine_telemetry_summary no Supabase."""
        if not self.is_configured():
            return []
        try:
            resp = self._session.get(
                f"{self.project_url}/rest/v1/v_vine_telemetry_summary?limit=10",
                headers=self._headers("return=representation"),
                timeout=2.0,
            )
            return resp.json() if resp.status_code == 200 and isinstance(resp.json(), list) else []
        except (requests.RequestException, ValueError):
            return []

    def _post_json(self, table: str, payload: object, prefer: str) -> None:
        try:
            self._session.post(
                f"{self.project_url}/rest/v1/{table}",
                headers=self._headers(prefer),
                json=payload,
                timeout=2.5,
            )
        except requests.RequestException:
            pass
