"""
Repositório de acesso à API 8666 do STH-Comet (Short Time Historic).
Responsável exclusivamente por buscar e converter as séries temporais históricas
de Temperatura, Umidade e Luminosidade armazenadas no FIWARE/MongoDB.
"""

from typing import Any, Dict, List
import requests
from src.config.settings import (
    DEFAULT_FIWARE_HOST,
    DEFAULT_LAST_N,
    FIWARE_SERVICE,
    FIWARE_SERVICE_PATH,
    HTTP_TIMEOUT_SECONDS,
    STH_COMET_PORT,
)
from src.models.iot_models import HistoricalSeries, TimeSeriesPoint


class SthCometRepository:
    """Cliente HTTP para consulta de séries históricas na porta 8666 do STH-Comet."""

    def __init__(
        self,
        host: str = DEFAULT_FIWARE_HOST,
        port: int = STH_COMET_PORT,
        fiware_service: str = FIWARE_SERVICE,
        fiware_service_path: str = FIWARE_SERVICE_PATH,
    ) -> None:
        self.host = host.strip() or DEFAULT_FIWARE_HOST
        self.port = port
        self.headers: Dict[str, str] = {
            "fiware-service": fiware_service,
            "fiware-servicepath": fiware_service_path,
        }

    def _build_url(self, entity_type: str, entity_id: str, attribute: str, last_n: int) -> str:
        """Monta a URL oficial da API v1 do STH-Comet na porta 8666."""
        return (
            f"http://{self.host}:{self.port}/STH/v1/contextEntities/"
            f"type/{entity_type}/id/{entity_id}/attributes/{attribute}?lastN={last_n}"
        )

    @staticmethod
    def parse_sth_payload(payload: Dict[str, Any]) -> List[TimeSeriesPoint]:
        """Extrai a lista de pontos (timestamp HH:MM:SS e valor float) do JSON do STH-Comet."""
        points: List[TimeSeriesPoint] = []
        try:
            responses = payload.get("contextResponses", [])
            if not responses:
                return points
            attributes = responses[0].get("contextElement", {}).get("attributes", [])
            if not attributes:
                return points
            raw_values = attributes[0].get("values", [])
            for entry in raw_values:
                raw_time = str(entry.get("recvTime", ""))
                # Formata ISO 8601 (ex: 2026-10-16T14:00:00.000Z) para HH:MM:SS
                formatted_time = (
                    raw_time.split("T")[1][:8] if "T" in raw_time else raw_time[:19]
                )
                val = float(entry.get("attrValue", 0.0))
                points.append(TimeSeriesPoint(timestamp=formatted_time, value=val))
        except (ValueError, KeyError, IndexError, TypeError):
            return points
        return points

    def fetch_attribute_history(
        self,
        entity_type: str,
        entity_id: str,
        attribute: str,
        last_n: int = DEFAULT_LAST_N,
    ) -> List[TimeSeriesPoint]:
        """Consulta os últimos N registros históricos de um atributo específico no STH-Comet."""
        url = self._build_url(entity_type, entity_id, attribute, last_n)
        try:
            response = requests.get(
                url, headers=self.headers, timeout=HTTP_TIMEOUT_SECONDS
            )
            if response.status_code == 200:
                return self.parse_sth_payload(response.json())
        except requests.RequestException:
            return []
        return []

    def fetch_all_vine_series(
        self,
        entity_type: str,
        entity_id: str,
        last_n: int = DEFAULT_LAST_N,
    ) -> HistoricalSeries:
        """Retorna as 3 séries temporais (temperature, humidity, luminosity) do dispositivo."""
        return HistoricalSeries(
            temperature=self.fetch_attribute_history(
                entity_type, entity_id, "temperature", last_n
            ),
            humidity=self.fetch_attribute_history(
                entity_type, entity_id, "humidity", last_n
            ),
            luminosity=self.fetch_attribute_history(
                entity_type, entity_id, "luminosity", last_n
            ),
        )
