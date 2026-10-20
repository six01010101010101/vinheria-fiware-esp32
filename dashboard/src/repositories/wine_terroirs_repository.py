"""
Repositório de Terroirs, Solos, Guarda dos Vinhos e Reações Físico-Químicas em Tempo Real.
Vinheria Agnello — FIWARE & ESP32 Wokwi.
Integra o catálogo dinâmico de 9 Vinícolas x 4 Estilos (Tinto, Rosé, Branco, Espumante),
recalculando características de solo, safra, tempo de guarda e reação enológica ao vivo.
"""

from datetime import date, datetime
from typing import Any, Dict
from src.models.wine_models import WineAging, WineProfile, WineReaction
from src.repositories.wine_catalog_data import get_profile


class WineTerroirsRepository:
    """Calcula informações de terras, tempo de guarda e reação físico-química dos vinhos por terroir e estilo."""

    @staticmethod
    def get_profile(vineyard_key: str, style: str = "tinto") -> WineProfile:
        """Retorna o perfil tipado do vinho para a vinícola e estilo escolhidos."""
        return get_profile(vineyard_key, style)

    @classmethod
    def get_aging(cls, profile: WineProfile) -> WineAging:
        """Calcula o tempo decorrido desde a safra e a posição na curva de maturidade enológica."""
        today = date.today()
        harvest = date(profile.vintage, profile.harvest_month, 15)
        total_days = max(1, (today - harvest).days)
        years = total_days // 365
        rem_days = total_days % 365
        months = rem_days // 30
        days = rem_days % 30

        w_start = profile.vintage + (2 if profile.barrel_months > 6 else 1)
        w_end = profile.vintage + profile.aging_potential_years
        progress = int(min(100, max(0, ((today.year - profile.vintage) / max(1, profile.aging_potential_years)) * 100)))

        if today.year < w_start:
            w_status, w_color = "Jovem — Taninos e Acidez em Afinação", "info"
        elif today.year <= w_end:
            w_status, w_color = "No Apogeu da Guarda — Máxima Complexidade", "success"
        else:
            w_status, w_color = "Maturo Avançado — Consumo Imediato", "warning"

        return WineAging(years, months, days, total_days, w_start, w_end, w_status, w_color, progress)

    @classmethod
    def get_wine_aging_info(cls, vineyard_key: str, style: str = "tinto") -> Dict[str, Any]:
        """Dicionário consolidado para renderização imediata na UI."""
        prof = cls.get_profile(vineyard_key, style)
        ag = cls.get_aging(prof)
        barrel_desc = f"{prof.barrel_months}m em Carvalho" if prof.barrel_months > 0 else "Sem carvalho (Inox)"
        return {
            "icon_wine": prof.label,
            "style": prof.style,
            "grapes": prof.grapes,
            "soil": prof.soil,
            "altitude": f"{prof.altitude_m}m",
            "vintage": prof.vintage,
            "barrel_months": prof.barrel_months,
            "wood_type": barrel_desc,
            "serving_temp": prof.serving_temp,
            "aromas": prof.aromas,
            "total_aging_display": f"{ag.years}a {ag.months}m (Safra {prof.vintage})",
            "aging_regime": f"{barrel_desc} • Guarda {ag.window_start}–{ag.window_end}",
            "window_status": ag.window_status,
            "window_color": ag.window_color,
            "aging_progress_pct": ag.progress_pct,
        }

    @staticmethod
    def evaluate_wine_reaction(
        temp: float, hum: float, lum: float,
        t_min: float, t_max: float, h_min: float, h_max: float, l_max: float,
    ) -> Dict[str, Any]:
        """Determina a reação físico-química e enológica ativa do vinho frente ao ambiente atual."""
        reactions = []
        status = "ideal"
        color = "success"

        if temp > t_max:
            status, color = "critico", "danger"
            diff = temp - t_max
            reactions.append(f"Aceleração oxidativa (+{diff:.1f}°C): degradação de antocianinas e perda de frescor.")
        elif temp < t_min:
            status = "alerta" if status == "ideal" else status
            color = "warning" if color == "success" else color
            reactions.append("Lentidão cinética: inibição de bouquet e risco de precipitação de tartaratos.")
        else:
            reactions.append("Cinética perfeita: polimerização estável de taninos e proteção dos ésteres terciários.")

        if hum < h_min:
            status, color = "critico", "danger"
            reactions.append("Retração da rolha: poros ressecados provocam micro-oxigenação anômala.")
        elif hum > h_max:
            status = "alerta" if status == "ideal" else status
            color = "warning" if color == "success" else color
            reactions.append("Saturação de umidade: risco de fungos no lacre; transpiração anulada.")
        else:
            reactions.append("Vedação elástica: cortiça hidratada e transpiração anual controlada (<1.8%).")

        if lum > l_max:
            status, color = "critico", "danger"
            reactions.append("Fotólise (Goût de Lumière): radiação fotoquímica excitando riboflavinas.")
        else:
            reactions.append("Penumbra de proteção: flavonoides e cor preservados contra raios UV.")

        return {
            "status": status,
            "color": color,
            "summary": " • ".join(reactions),
            "phenolic_state": "Equilíbrio Enológico Perfeito" if status == "ideal" else "Em Reação de Estresse",
        }
