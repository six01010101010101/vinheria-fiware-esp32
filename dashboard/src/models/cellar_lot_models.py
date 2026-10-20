"""
Modelos tipados para Lotes de Vinho, Cavas e Setores da Adega.
Representa a divisão física da adega, safras, validades e telemetria em tempo real.
"""

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class CellarLot:
    """Representa um lote real de vinho em uma cava/setor da adega."""

    lot_code: str
    name: str
    winery_name: str
    country: str
    region: str
    wine_style: str
    wine_name: str
    barrel_type: str
    soil: str
    vintage: int
    bottling_date: str
    expiration_date: str
    target_temp_min: float
    target_temp_max: float
    target_hum_min: float
    target_hum_max: float
    target_lum_max: float
    stock_bottles: int


@dataclass(frozen=True)
class LotStatusEvaluation:
    """Avaliação físico-química e de conformidade de um lote em tempo real."""

    lot: CellarLot
    current_temp: float
    current_hum: float
    current_lum: float
    temp_status: str
    hum_status: str
    lum_status: str
    health_score: int
    verdict: str
    status_color: str
    alerts: List[str]
