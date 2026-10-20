"""Repositório de Nuvem no Supabase (PostgreSQL via PostgREST API) com Pool HTTP Keep-Alive."""

from datetime import datetime
import os
from pathlib import Path
import threading
import time
from typing import Dict, List, Optional
import requests
from requests.adapters import HTTPAdapter
from src.config.settings import DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL
from src.models.iot_models import (
    AnomalyEvaluation, DeviceProvisionSpec, RealVineyardTelemetry, SensorSnapshot
)


def _load_env_vars() -> Dict[str, str]:
    """Lê variáveis de ambiente do sistema ou do arquivo .env (com fallback nativo embutido)."""
    values: Dict[str, str] = {}
    env_file = Path(__file__).resolve().parents[3] / ".env"
    if env_file.exists():
        try:
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    values[k.strip()] = v.strip().strip("\"'")
        except OSError:
            pass
    return values


class SupabaseRepository:
    """Cliente assíncrono com Connection Pool para sincronia Cloud entre Site e Wokwi."""

    _instance: Optional["SupabaseRepository"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        env_map = _load_env_vars()
        self.project_url = os.getenv("SUPABASE_URL", env_map.get("SUPABASE_URL", DEFAULT_SUPABASE_URL)).rstrip("/")
        self.api_key = os.getenv("SUPABASE_ANON_KEY", env_map.get("SUPABASE_ANON_KEY", DEFAULT_SUPABASE_ANON_KEY))
        self.last_sync_ts = self.last_vineyards_sync_ts = self.last_lots_sync_ts = 0.0
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
        """Persiste telemetria no Supabase em thread background quando há mudança de estado ou a cada 8s."""
        if not self.is_configured():
            return
        if snapshot.temperature is None or snapshot.humidity is None or snapshot.luminosity is None:
            return

        now = time.time()
        mode_changed = evaluation.command_code != self.last_alert_mode
        if not mode_changed and (now - self.last_sync_ts) < 8.0:
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
                "vineyard_id": v.vineyard_id, "name": v.name, "region": v.region, "country": v.country,
                "latitude": v.latitude, "longitude": v.longitude, "temperature_c": v.temperature,
                "humidity_pct": v.humidity, "luminosity_pct": v.luminosity, "solar_wm2": v.solar_wm2,
                "dew_point_c": v.dew_point, "is_day": v.is_day, "local_time": v.local_time,
            }
            for v in vineyards
        ]
        prefer = "resolution=merge-duplicates,return=minimal"
        threading.Thread(target=self._post_json, args=("real_vineyards_status", rows, prefer), daemon=True).start()

    def sync_cellar_lots_async(self, evaluations: List[object]) -> None:
        """Sincroniza os lotes e notas organolépticas no Supabase Cloud a cada 60s."""
        if not self.is_configured() or not evaluations:
            return
        now = time.time()
        if (now - self.last_lots_sync_ts) < 60.0:
            return
        self.last_lots_sync_ts = now
        rows = []
        for e in evaluations:
            lt = getattr(e, "lot", None)
            if not lt:
                continue
            rows.append({
                "lot_code": getattr(lt, "lot_code", ""), "winery_name": getattr(lt, "winery_name", ""),
                "wine_name": getattr(lt, "wine_name", ""), "style": getattr(lt, "style", ""),
                "country": getattr(lt, "country", ""), "region": getattr(lt, "region", ""),
                "vintage": getattr(lt, "vintage", 2020), "bottling_date": getattr(lt, "bottling_date", ""),
                "expiration_date": getattr(lt, "expiration_date", ""), "barrel_type": getattr(lt, "barrel_type", ""),
                "soil_type": getattr(lt, "soil_type", ""), "health_score": getattr(e, "health_score", 100),
                "target_temp_min": getattr(lt, "target_temp_min", 13.0),
                "target_temp_max": getattr(lt, "target_temp_max", 18.0),
                "target_hum_min": getattr(lt, "target_hum_min", 60.0),
                "target_hum_max": getattr(lt, "target_hum_max", 75.0),
                "target_lum_max": getattr(lt, "target_lum_max", 20.0),
                "verdict": getattr(e, "verdict", "Equilíbrio Ideal"),
            })
        if rows:
            threading.Thread(target=self._post_json, args=("cellar_lots", rows, "resolution=merge-duplicates,return=minimal"), daemon=True).start()

    def register_device_async(self, spec: DeviceProvisionSpec) -> None:
        """Persiste ou atualiza um IoT Device na tabela public.vine_devices do Supabase."""
        if not self.is_configured():
            return
        payload = {
            "device_id": spec.device_id, "entity_name": spec.entity_name,
            "entity_type": spec.entity_type, "api_key": spec.api_key, "transport": "MQTT",
        }
        prefer = "resolution=merge-duplicates,return=minimal"
        threading.Thread(target=self._post_json, args=("vine_devices", payload, prefer), daemon=True).start()

    def fetch_latest_cloud_telemetry(self, device_id: str = "vine001") -> Optional[SensorSnapshot]:
        """Lê a última leitura sincronizada na nuvem Supabase (HTTPS :443) para contingência de rede."""
        if not self.is_configured():
            return None
        try:
            url = (
                f"{self.project_url}/rest/v1/vine_telemetry"
                f"?device_id=eq.{device_id}&select=temperature,humidity,luminosity,recorded_at"
                f"&order=recorded_at.desc&limit=1"
            )
            resp = self._session.get(url, headers=self._headers("return=representation"), timeout=2.0)
            rows = resp.json() if resp.status_code == 200 else []
            if rows and isinstance(rows, list):
                r = rows[0]
                raw_ts = str(r.get("recorded_at", ""))
                ts = raw_ts.split("T")[1][:8] if "T" in raw_ts else datetime.now().strftime("%H:%M:%S")
                return SensorSnapshot(float(r["temperature"]), float(r["humidity"]), float(r["luminosity"]), ts)
        except (requests.RequestException, ValueError, KeyError, TypeError):
            return None
        return None

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
