"""
Repositório de Telemetria Meteorológica de Vinícolas Reais (Open-Meteo WMO).
Conversão Física (Radiação Solar -> Luz %, Ponto de Orvalho Magnus-Tetens) e Supabase.
"""

from datetime import datetime
import math, threading, time
from typing import Any, Dict, List, Optional, Tuple
import requests
from requests.adapters import HTTPAdapter
from src.models.iot_models import HistoricalSeries, RealVineyardTelemetry, SensorSnapshot, TimeSeriesPoint
from src.repositories.supabase_repository import SupabaseRepository

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_SECONDS = 45.0

REAL_VINEYARDS: Dict[str, Dict[str, Any]] = {
    "miolo_br": {"name": "Vinícola Miolo", "region": "Vale dos Vinhedos - RS", "country": "Brasil", "lat": -29.1864, "lon": -51.5567},
    "francioni_br": {"name": "Villa Francioni", "region": "São Joaquim - SC", "country": "Brasil", "lat": -28.2936, "lon": -49.9319},
    "guaspari_br": {"name": "Vinícola Guaspari", "region": "Espírito Santo do Pinhal - SP", "country": "Brasil", "lat": -22.1819, "lon": -46.7408},
    "catena_ar": {"name": "Bodega Catena Zapata", "region": "Mendoza", "country": "Argentina", "lat": -33.1667, "lon": -68.9167},
    "concha_cl": {"name": "Viña Concha y Toro", "region": "Vale do Maipo", "country": "Chile", "lat": -33.6433, "lon": -70.5789},
    "margaux_fr": {"name": "Château Margaux", "region": "Médoc, Bordeaux", "country": "França", "lat": 45.0444, "lon": -0.6686},
    "antinori_it": {"name": "Marchesi Antinori", "region": "Chianti Classico, Toscana", "country": "Itália", "lat": 43.6158, "lon": 11.2136},
    "crasto_pt": {"name": "Quinta do Crasto", "region": "Vale do Douro", "country": "Portugal", "lat": 41.1681, "lon": -7.6308},
    "opus_us": {"name": "Opus One Winery", "region": "Oakville, Napa Valley", "country": "EUA", "lat": 38.4367, "lon": -122.4017},
    "abrau_ru": {"name": "Vinícola Abrau-Durso", "region": "Krai de Krasnodar, Mar Negro", "country": "Rússia", "lat": 44.7000, "lon": 37.6000},
    "okanagan_ca": {"name": "Mission Hill Winery", "region": "Okanagan Valley, BC", "country": "Canadá", "lat": 49.8880, "lon": -119.4960},
    "barossa_au": {"name": "Penfolds Grange", "region": "Barossa Valley, SA", "country": "Austrália", "lat": -34.4820, "lon": 138.9890},
    "koshu_jp": {"name": "Grace Wine", "region": "Koshu, Yamanashi (Fuji)", "country": "Japão", "lat": 35.7000, "lon": 138.7300},
}


def radiation_to_luminosity_pct(shortwave_wm2: Any) -> float:
    """Converte radiação solar de ondas curtas (0-1000 W/m²) em Luminosidade % (0-100%)."""
    try:
        rad = float(shortwave_wm2 if shortwave_wm2 is not None else 0.0)
        rad = 0.0 if not math.isfinite(rad) else rad
    except (TypeError, ValueError):
        rad = 0.0
    return round(min(100.0, max(0.0, rad / 10.0)), 1)


def calculate_dew_point_c(temp_c: float, rh_pct: float) -> float:
    """Calcula Ponto de Orvalho (°C) pela equação de Magnus-Tetens."""
    clamped_rh = max(1.0, min(100.0, float(rh_pct)))
    alpha = ((17.27 * float(temp_c)) / (237.7 + float(temp_c))) + math.log(clamped_rh / 100.0)
    return round((237.7 * alpha) / (17.27 - alpha), 1)


class RealVineyardsRepository:
    """Gerencia consultas em tempo real às estações meteorológicas com cache TTL."""

    _instance: Optional["RealVineyardsRepository"] = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self._data_lock = threading.Lock()
        self._overview_cache: List[RealVineyardTelemetry] = []
        self._overview_ts: float = 0.0
        self._refreshing_overview: bool = False
        self._series_cache: Dict[str, Tuple[float, HistoricalSeries, SensorSnapshot, RealVineyardTelemetry]] = {}
        self._session = requests.Session()
        adapter = HTTPAdapter(pool_connections=10, pool_maxsize=20)
        self._session.mount("https://", adapter)
        self._session.mount("http://", adapter)

    @classmethod
    def get_instance(cls) -> "RealVineyardsRepository":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def fetch_all_vineyards_overview(self, force: bool = False) -> List[RealVineyardTelemetry]:
        """Busca dados ao vivo das vinícolas mundiais (Stale-While-Revalidate não-bloqueante)."""
        now = time.time()
        with self._data_lock:
            if not force and self._overview_cache:
                if (now - self._overview_ts) >= CACHE_TTL_SECONDS and not self._refreshing_overview:
                    self._refreshing_overview = True
                    threading.Thread(target=self._refresh_overview_sync, daemon=True).start()
                return list(self._overview_cache)
        return self._refresh_overview_sync()

    def _refresh_overview_sync(self) -> List[RealVineyardTelemetry]:
        keys = list(REAL_VINEYARDS.keys())
        params = {
            "latitude": ",".join(str(REAL_VINEYARDS[k]["lat"]) for k in keys),
            "longitude": ",".join(str(REAL_VINEYARDS[k]["lon"]) for k in keys),
            "current": "temperature_2m,relative_humidity_2m,shortwave_radiation,is_day",
            "timezone": "auto",
        }
        try:
            resp = requests.get(OPEN_METEO_URL, params=params, timeout=3.5)
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
                dew = calculate_dew_point_c(temp, hum)
                raw_time = str(cur.get("time", ""))
                loc_time = raw_time.split("T")[-1] if "T" in raw_time else datetime.now().strftime("%H:%M")
                results.append(
                    RealVineyardTelemetry(
                        vineyard_id=key, name=str(meta["name"]), region=str(meta["region"]),
                        country=str(meta["country"]), latitude=float(meta["lat"]), longitude=float(meta["lon"]),
                        temperature=temp, humidity=hum, luminosity=radiation_to_luminosity_pct(rad),
                        solar_wm2=rad, is_day=bool(cur.get("is_day", 1)), local_time=loc_time, dew_point=dew,
                    )
                )
            with self._data_lock:
                self._overview_cache = results
                self._overview_ts = time.time()
                self._refreshing_overview = False
            SupabaseRepository.get_instance().sync_real_vineyards_async(results)
            return results
        except requests.RequestException:
            with self._data_lock:
                self._refreshing_overview = False
                return list(self._overview_cache)

    def fetch_vineyard_timeseries(
        self, vineyard_id: str, last_n: int = 24, force: bool = False
    ) -> Tuple[HistoricalSeries, Optional[SensorSnapshot], Optional[RealVineyardTelemetry]]:
        """Busca histórico e snapshot climático de uma vinícola com cache de 45 segundos."""
        vid = vineyard_id if vineyard_id in REAL_VINEYARDS else "miolo_br"
        meta = REAL_VINEYARDS[vid]
        now = time.time()
        with self._data_lock:
            if not force and vid in self._series_cache:
                cached_ts, s, snap, info = self._series_cache[vid]
                if (now - cached_ts) < CACHE_TTL_SECONDS:
                    return s, snap, info
        params = {
            "latitude": meta["lat"], "longitude": meta["lon"],
            "current": "temperature_2m,relative_humidity_2m,shortwave_radiation,is_day",
            "hourly": "temperature_2m,relative_humidity_2m,shortwave_radiation",
            "past_days": 1, "forecast_days": 1, "timezone": "auto",
        }
        try:
            resp = requests.get(OPEN_METEO_URL, params=params, timeout=3.5)
            resp.raise_for_status()
            data = resp.json()
            cur = data.get("current", {})
            temp = round(float(cur.get("temperature_2m", 16.0)), 1)
            hum = round(float(cur.get("relative_humidity_2m", 65.0)), 1)
            rad = round(float(cur.get("shortwave_radiation", 0.0)), 1)
            lum = radiation_to_luminosity_pct(rad)
            dew = calculate_dew_point_c(temp, hum)
            cur_time_iso = str(cur.get("time", ""))
            loc_time = cur_time_iso.split("T")[-1] if "T" in cur_time_iso else datetime.now().strftime("%H:%M")

            hourly = data.get("hourly", {})
            times: List[str] = hourly.get("time", [])
            t_list = hourly.get("temperature_2m", [])
            h_list = hourly.get("relative_humidity_2m", [])
            r_list = hourly.get("shortwave_radiation", [])

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
                is_day=bool(cur.get("is_day", 1)), local_time=loc_time, dew_point=dew,
            )
            with self._data_lock:
                self._series_cache[vid] = (now, series, snap, info)
            return series, snap, info
        except (requests.RequestException, ValueError, KeyError, TypeError):
            with self._data_lock:
                if vid in self._series_cache:
                    return self._series_cache[vid][1], self._series_cache[vid][2], self._series_cache[vid][3]
            return HistoricalSeries(), None, None

    fetch_vineyard_telemetry = fetch_vineyard_timeseries
