"""
Repositório de Nuvem no Firebase Realtime Database (REST API via HTTPS :443).
Garante persistência e contingência não-bloqueante entre o Site, Wokwi e Nuvem Google/Firebase.
"""

from datetime import datetime
import os
from pathlib import Path
import threading
import time
from typing import Any, Dict, Optional
import requests
from requests.adapters import HTTPAdapter
from src.models.iot_models import AnomalyEvaluation, SensorSnapshot


def _load_env_map() -> Dict[str, str]:
    """Lê variáveis do .env do projeto com fallback resiliente."""
    data: Dict[str, str] = {}
    p = Path(__file__).resolve().parents[3] / ".env"
    if p.exists():
        try:
            for line in p.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    data[k.strip()] = v.strip().strip("\"'")
        except OSError:
            pass
    return data


class FirebaseRepository:
    """Cliente assíncrono com Connection Pool HTTP para o Firebase Realtime Database."""

    _instance: Optional["FirebaseRepository"] = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        env = _load_env_map()
        raw_url = os.getenv("FIREBASE_DATABASE_URL", env.get("FIREBASE_DATABASE_URL", ""))
        if not raw_url:
            proj = os.getenv("FIREBASE_PROJECT_ID", env.get("FIREBASE_PROJECT_ID", "vinheria-agnello-cp5"))
            raw_url = f"https://{proj}-default-rtdb.firebaseio.com"
        self.database_url = raw_url.rstrip("/")
        self.auth_token = os.getenv("FIREBASE_AUTH_TOKEN", env.get("FIREBASE_AUTH_TOKEN", ""))
        self.last_sync_ts = 0.0
        self.last_status: Dict[str, Any] = {"status": "initialized", "last_write": None}
        self._session = requests.Session()
        adapter = HTTPAdapter(pool_connections=6, pool_maxsize=12)
        self._session.mount("https://", adapter)
        self._session.mount("http://", adapter)

    @classmethod
    def get_instance(cls) -> "FirebaseRepository":
        """Retorna o Singleton thread-safe do repositório Firebase."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def is_configured(self) -> bool:
        """Indica se a URL base do Firebase está configurada."""
        return bool(self.database_url and "firebaseio.com" in self.database_url)

    def _url(self, path: str) -> str:
        clean = path.strip("/").removesuffix(".json")
        auth_param = f"?auth={self.auth_token}" if self.auth_token else ""
        return f"{self.database_url}/{clean}.json{auth_param}"

    def sync_telemetry_async(
        self, device_id: str, snapshot: SensorSnapshot, evaluation: Optional[AnomalyEvaluation] = None, source: str = "Wokwi #478106752109243393"
    ) -> None:
        """Persiste a telemetria do ESP32 e status de saúde no nó /vinheria/telemetry/{device_id}."""
        if not self.is_configured() or snapshot.temperature is None:
            return
        now = time.time()
        if (now - self.last_sync_ts) < 2.0:
            return
        self.last_sync_ts = now
        payload = {
            "device_id": device_id or "vine001",
            "temperature": round(float(snapshot.temperature), 2),
            "humidity": round(float(snapshot.humidity or 0.0), 2),
            "luminosity": round(float(snapshot.luminosity or 0.0), 2),
            "alert_mode": evaluation.command_code if evaluation else "normal",
            "health_score": evaluation.cellar_health_score if evaluation else 100,
            "source": source,
            "timestamp": snapshot.timestamp or datetime.now().strftime("%H:%M:%S"),
            "updated_at": datetime.now().isoformat(),
        }
        threading.Thread(target=self._put_node, args=(f"vinheria/telemetry/{device_id}", payload), daemon=True).start()

    def sync_preset_and_terroir_async(self, preset_key: str, terroir_data: Dict[str, Any]) -> None:
        """Sincroniza o preset selecionado (Tinto/Branco/Rosé/Espumante) e a área/terroir ativo."""
        if not self.is_configured():
            return
        payload = {
            "preset_key": preset_key,
            "terroir": terroir_data,
            "updated_at": datetime.now().isoformat(),
        }
        threading.Thread(target=self._patch_node, args=("vinheria/active_config", payload), daemon=True).start()

    def fetch_latest_telemetry(self, device_id: str = "vine001") -> Optional[SensorSnapshot]:
        """Lê os últimos dados salvos no Firebase Realtime Database para contingência."""
        if not self.is_configured():
            return None
        try:
            resp = self._session.get(self._url(f"vinheria/telemetry/{device_id}"), timeout=2.0)
            if resp.status_code == 200 and resp.json():
                d = resp.json()
                return SensorSnapshot(
                    float(d.get("temperature", 15.5)),
                    float(d.get("humidity", 68.0)),
                    float(d.get("luminosity", 12.0)),
                    str(d.get("timestamp", datetime.now().strftime("%H:%M:%S"))),
                )
        except Exception:
            return None
        return None

    def _put_node(self, path: str, payload: Any) -> None:
        try:
            r = self._session.put(self._url(path), json=payload, timeout=2.5)
            self.last_status = {"status": "ok" if r.ok else "error", "code": r.status_code, "last_write": datetime.now().isoformat()}
        except Exception as e:
            self.last_status = {"status": "network_error", "error": str(e), "last_write": datetime.now().isoformat()}

    def _patch_node(self, path: str, payload: Any) -> None:
        try:
            r = self._session.patch(self._url(path), json=payload, timeout=2.5)
            self.last_status = {"status": "ok" if r.ok else "error", "code": r.status_code, "last_write": datetime.now().isoformat()}
        except Exception:
            pass
