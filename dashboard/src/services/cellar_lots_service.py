"""
Serviço de Avaliação em Tempo Real dos Lotes da Adega.
Calcula desvios térmicos, higrométricos e lumínicos para cada lote,
gerando score de saúde (0-100%) e veredito enológico de guarda.
"""

from typing import List, Tuple
from src.models.cellar_lot_models import CellarLot, LotStatusEvaluation
from src.repositories.cellar_lots_repository import CellarLotsRepository


class CellarLotsService:
    """Aplica regras enológicas de conservação a cada lote em tempo real."""

    @classmethod
    def evaluate_lot(cls, lot: CellarLot, cur_t: float, cur_h: float, cur_l: float) -> LotStatusEvaluation:
        """Avalia um lote individual frente à telemetria ao vivo."""
        alerts: List[str] = []
        score = 100

        # Temperatura
        t_st = "ideal"
        if cur_t < lot.target_temp_min:
            diff = lot.target_temp_min - cur_t
            t_st = "critico" if diff > 3.0 else "alerta"
            score -= 35 if t_st == "critico" else 15
            alerts.append(f"Temperatura baixa ({cur_t:.1f}°C < {lot.target_temp_min:.1f}°C)")
        elif cur_t > lot.target_temp_max:
            diff = cur_t - lot.target_temp_max
            t_st = "critico" if diff > 2.5 else "alerta"
            score -= 40 if t_st == "critico" else 20
            alerts.append(f"Aceleração oxidativa ({cur_t:.1f}°C > {lot.target_temp_max:.1f}°C)")

        # Umidade
        h_st = "ideal"
        if cur_h < lot.target_hum_min:
            h_st = "critico" if (lot.target_hum_min - cur_h) > 15.0 else "alerta"
            score -= 30 if h_st == "critico" else 15
            alerts.append(f"Risco de ressecamento da rolha ({cur_h:.0f}% < {lot.target_hum_min:.0f}%)")
        elif cur_h > lot.target_hum_max:
            h_st = "alerta"
            score -= 10
            alerts.append(f"Saturação de umidade ({cur_h:.0f}% > {lot.target_hum_max:.0f}%)")

        # Luminosidade
        l_st = "ideal"
        if cur_l > lot.target_lum_max:
            l_st = "critico" if (cur_l - lot.target_lum_max) > 20.0 else "alerta"
            score -= 25 if l_st == "critico" else 10
            alerts.append(f"Exposição excessiva a luz ({cur_l:.1f}% > {lot.target_lum_max:.1f}%)")

        score = max(0, min(100, score))

        if score >= 88:
            verdict, color = "Guarda Perfeita (Apogeu Preservado)", "success"
        elif score >= 65:
            verdict, color = "Atenção Térmica/Higrométrica", "warning"
        else:
            verdict, color = "Risco Enológico Ativo", "danger"

        return LotStatusEvaluation(
            lot=lot,
            current_temp=cur_t,
            current_hum=cur_h,
            current_lum=cur_l,
            temp_status=t_st,
            hum_status=h_st,
            lum_status=l_st,
            health_score=score,
            verdict=verdict,
            status_color=color,
            alerts=alerts,
        )

    @classmethod
    def evaluate_all_lots(
        cls, cur_t: float, cur_h: float, cur_l: float, style: str = "", country: str = ""
    ) -> List[LotStatusEvaluation]:
        """Avalia todos os lotes cadastrados sob as condições vigentes."""
        lots = CellarLotsRepository.filter_lots(
            style=style if style else None, country=country if country else None
        )
        return [cls.evaluate_lot(lot, cur_t, cur_h, cur_l) for lot in lots]
