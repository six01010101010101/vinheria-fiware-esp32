"""
Modelos tipados do domínio enológico: perfil do vinho por terroir e estilo,
tempo de guarda calculado e reação físico-química frente ao ambiente atual.
"""

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class WineProfile:
    """Vinho de referência de um terroir para um estilo (tinto, rosé, branco ou espumante)."""

    vineyard_key: str
    style: str
    label: str
    grapes: str
    soil: str
    altitude_m: int
    vintage: int
    harvest_month: int
    barrel_months: int
    aging_potential_years: int
    serving_temp: str
    aromas: str


@dataclass(frozen=True)
class WineAging:
    """Tempo decorrido desde a colheita e posição do vinho na janela de consumo."""

    years: int
    months: int
    days: int
    total_days: int
    window_start: int
    window_end: int
    window_status: str
    window_color: str
    progress_pct: int


@dataclass(frozen=True)
class WineReaction:
    """Reação físico-química ativa do vinho sob a temperatura, umidade e luz atuais."""

    state: str
    color: str
    reactions: List[str]
