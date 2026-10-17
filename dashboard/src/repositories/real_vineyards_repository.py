"""
Repositório de Telemetria Meteorológica e Solar em Tempo Real de Vinícolas Reais do Mundo.
Consulta coordenadas GPS autênticas de vinhedos reais via API Open-Meteo (Satélite + Estações),
retornando Temperatura (°C), Umidade Relativa (%) e Luminosidade Solar (%) ao vivo e histórico 24h.
"""

from datetime import datetime
import threading
import time
from typing import Any, Dict, List, Optional, Tuple
import requests
from src.models.iot_models import (
    HistoricalSeries,
    RealVineyardTelemetry,
    SensorSnapshot,
    TimeSeriesPoint,
)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_SECONDS = 60.0

REAL_VINEYARDS: Dict[str, Dict[str, Any]] = {
    "miolo_br": {"name": "Vinícola Miolo", "region": "Vale dos Vinhedos, Bento Gonçalves - RS", "country": "Brasil", "lat": -29.1864, "lon": -51.5567},
    "francioni_br": {"name": "Villa Francioni", "region": "São Joaquim, Serra Catarinense - SC", "country": "Brasil", "lat": -28.2936, "lon": -49.9319},
    "guaspari_br": {"name": "Vinícola Guaspari", "region": "Espírito Santo do Pinhal - SP", "country": "Brasil", "lat": -22.1819, "lon": -46.7408},
    "catena_ar": {"name": "Bodega Catena Zapata", "region": "Agrelo, Luján de Cuyo, Mendoza", "country": "Argentina", "lat": -33.1667, "lon": -68.9167},
    "concha_cl": {"name": "Viña Concha y Toro", "region": "Vale do Maipo, Pirque", "country": "Chile", "lat": -33.6433, "lon": -70.5789},
    "margaux_fr": {"name": "Château Margaux", "region": "Médoc, Bordeaux", "country": "França", "lat": 45.0444, "lon": -0.6686},
    "antinori_it": {"name": "Marchesi Antinori", "region": "Chianti Classico, Bargino, Toscana", "country": "Itália", "lat": 43.6158, "lon": 11.2136},
    "crasto_pt": {"name": "Quinta do Crasto", "region": "Vale do Douro, Gouvinhas, Sabrosa", "country": "Portugal", "lat": 41.1681, "lon": -7.6308},
    "opus_us": {"name": "Opus One Winery", "region": "Oakville, Napa Valley, Califórnia", "country": "EUA", "lat": 38.4367, "lon": -122.4017},
}


def radiation_to_luminosity_pct(shortwave_wm2: Any) -> float:
    """Converte radiação solar de ondas curtas (0-1000 W/m²) em Luminosidade percentual (0-100%)."""
    try:
        rad = float(shortwave_wm2 or 0.0)
    except (TypeError, ValueError):
        rad = 0.0
    return round(min(100.0, max(0.0, rad / 10.0)), 1)


class RealVineyardsRepository:
    """Gerencia consultas em tempo real às estações meteorológicas das vinícolas mundiais com cache TTL."""

    _instance: Optional["RealVineyardsRepository"] = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self._data_lock = threading.Lock()
        self._overview_cache: List[RealVineyardTelemetry] = []
        self._overview_ts: float = 0.0
        self._series_cache: Dict[str, Tuple[float, HistoricalSeries, SensorSnapshot, RealVineyardTelemetry]] = {}

    @classmethod
    def get_instance(cls) -> "RealVineyardsRepository":
        """Retorna a instância Singleton thread-safe do repositório de vinícolas reais."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def fetch_all_vineyards_overview(self, force: bool = False) -> List[RealVineyardTelemetry]:
        """Busca simultaneamente os dados ao vivo das 9 vinícolas reais em uma única requisição batch."""
        now = time.time()
        with self._data_lock:
            if not force and self._overview_cache and (now - self._overview_ts) < CACHE_TTL_SECONDS:
                return list(self._overview_cache)

        keys = list(REAL_VINEYARDS.keys())
        params = {
            "latitude": ",".join(str(REAL_VINEYARDS[k]["lat"]) for k in keys),
            "longitude": ",".join(str(REAL_VINEYARDS[k]["lon"]) for k in keys),
            "current": "temperature_2m,relative_humidity_2m,shortwave_radiation,is_day",
            "timezone": "auto",
        }
        try:
            resp = requests.get(OPEN_METEO_URL, params=params, timeout=4.0)
            resp.raise_for_status()
            payload = resp.json()
            items = payload if isinstance(payload, list) else [payload]
            results: List[RealVineyardTelemetry] = []
            for idx, key in enumerate(keys):
                meta = REAL_VINEYARDS[key]
                cur = items[idx].get("current", {}) if idx < len(items) else {}
                temp = round(float(cur.get("temperature_2m", 16.0)), 1)
                hum = round(float(cur.get("relative_humidity_2m", 65.0)), 1)
                rad = round(float(cur.get("shortwave_radiation", 0.0)), 1)
                lum = radiation_to_luminosity_pct(rad)
                raw_time = str(cur.get("time", ""))
                loc_time = raw_time.split("T")[-1] if "T" in raw_time else datetime.now().strftime("%H:%M")
                results.append(
                    RealVineyardTelemetry(
                        vineyard_id=key, name=str(meta["name"]), region=str(meta["region"]),
                        country=str(meta["country"]), latitude=float(meta["lat"]), longitude=float(meta["lon"]),
                        temperature=temp, humidity=hum, luminosity=lum, solar_wm2=rad,
                        is_day=bool(cur.get("is_day", 1)), local_time=loc_time,
                    )
                )
            with self._data_lock:
                self._overview_cache = results
                self._overview_ts = now
            return results
        except (requests.RequestException, ValueError, KeyError, TypeError):
            with self._data_lock:
                return list(self._overview_cache)

    def fetch_vineyard_telemetry(
        self, vineyard_id: str, last_n: int = 24
    ) -> Tuple[HistoricalSeries, Optional[SensorSnapshot], Optional[RealVineyardTelemetry]]:
        """Retorna a série histórica real das últimas 24h e a leitura atual de uma vinícola real."""
        vid = vineyard_id if vineyard_id in REAL_VINEYARDS else "miolo_br"
        now = time.time()
        with self._data_lock:
            cached = self._series_cache.get(vid)
            if cached and (now - cached[0]) < CACHE_TTL_SECONDS:
                return cached[1], cached[2], cached[3]

        meta = REAL_VINEYARDS[vid]
        params = {
            "latitude": meta["lat"], "longitude": meta["lon"],
            "current": "temperature_2m,relative_humidity_2m,shortwave_radiation,is_day",
            "hourly": "temperature_2m,relative_humidity_2m,shortwave_radiation",
            "past_days": 1, "forecast_days": 1, "timezone": "auto",
        }
        try:
            resp = requests.get(OPEN_METEO_URL, params=params, timeout=4.0)
            resp.raise_for_status()
            data = resp.json()
            cur = data.get("current", {})
            temp = round(float(cur.get("temperature_2m", 16.0)), 1)
            hum = round(float(cur.get("relative_humidity_2m", 65.0)), 1)
            rad = round(float(cur.get("shortwave_radiation", 0.0)), 1)
            lum = radiation_to_luminosity_pct(rad)
            cur_time_iso = str(cur.get("time", ""))
            loc_time = cur_time_iso.split("T")[-1] if "T" in cur_time_iso else datetime.now().strftime("%H:%M")

            hourly = data.get("hourly", {})
            times: List[str] = hourly.get("time", [])
            t_list: List[Any] = hourly.get("temperature_2m", [])
            h_list: List[Any] = hourly.get("relative_humidity_2m", [])
            r_list: List[Any] = hourly.get("shortwave_radiation", [])

            t_pts, h_pts, l_pts = [], [], []
            for idx, t_iso in enumerate(times):
                if cur_time_iso and t_iso > cur_time_iso:
                    break
                label = t_iso.split("T")[-1] if "T" in t_iso else t_iso
                if idx < len(t_list) and t_list[idx] is not None:
                    t_pts.append(TimeSeriesPoint(label, round(float(t_list[idx]), 1)))
                if idx < len(h_list) and h_list[idx] is not None:
                    h_pts.append(TimeSeriesPoint(label, round(float(h_list[idx]), 1)))
                if idx < len(r_list) and r_list[idx] is not None:
                    l_pts.append(TimeSeriesPoint(label, radiation_to_luminosity_pct(r_list[idx])))

            limit = max(6, min(48, last_n))
            series = HistoricalSeries(t_pts[-limit:], h_pts[-limit:], l_pts[-limit:])
            snap = SensorSnapshot(temp, hum, lum, f"{loc_time} ({meta['country']})")
            info = RealVineyardTelemetry(
                vineyard_id=vid, name=str(meta["name"]), region=str(meta["region"]),
                country=str(meta["country"]), latitude=float(meta["lat"]), longitude=float(meta["lon"]),
                temperature=temp, humidity=hum, luminosity=lum, solar_wm2=rad,
                is_day=bool(cur.get("is_day", 1)), local_time=loc_time,
            )
            with self._data_lock:
                self._series_cache[vid] = (now, series, snap, info)
            return series, snap, info
        except (requests.RequestException, ValueError, KeyError, TypeError):
            with self._data_lock:
                if vid in self._series_cache:
                    _, s_c, sn_c, in_c = self._series_cache[vid]
                    return s_c, sn_c, in_c
            return HistoricalSeries(), None, None
