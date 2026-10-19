"""
Repositório de Terroirs, Solos, Guarda dos Vinhos e Reações Físico-Químicas em Tempo Real.
Vinheria Agnello — FIWARE & ESP32 Wokwi.
"""

from datetime import datetime
from typing import Any, Dict


TERROIR_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "miolo_br": {
        "soil": "Basáltico-Argiloso com Cascalho",
        "altitude": "640m",
        "icon_wine": "Miolo Lote 43 (Merlot / Cabernet Sauvignon)",
        "vintage": 2018,
        "barrel_months": 12,
        "wood_type": "Carvalho Francês Allier",
    },
    "francioni_br": {
        "soil": "Vulcânico e Franco-Argiloso de Altitude",
        "altitude": "1280m",
        "icon_wine": "Villa Francioni Tinto D.O.",
        "vintage": 2017,
        "barrel_months": 14,
        "wood_type": "Carvalho Francês Tronçais",
    },
    "guaspari_br": {
        "soil": "Granítico de Degradação (Pedregoso)",
        "altitude": "1050m",
        "icon_wine": "Guaspari Vista da Serra Syrah",
        "vintage": 2019,
        "barrel_months": 18,
        "wood_type": "Carvalho Francês Vosges",
    },
    "catena_ar": {
        "soil": "Aluvial de Origem Andina (Calcário e Areia)",
        "altitude": "1450m",
        "icon_wine": "Nicolás Catena Zapata (Malbec / Cabernet)",
        "vintage": 2018,
        "barrel_months": 18,
        "wood_type": "Carvalho Francês Novo",
    },
    "concha_cl": {
        "soil": "Franco-Aluvial Pedregoso do Rio Maipo",
        "altitude": "650m",
        "icon_wine": "Don Melchor Cabernet Sauvignon",
        "vintage": 2019,
        "barrel_months": 15,
        "wood_type": "Carvalho Francês Nevers",
    },
    "margaux_fr": {
        "soil": "Cascalho Günziense Branco e Argila Calcária",
        "altitude": "32m",
        "icon_wine": "Château Margaux Premier Grand Cru Classé",
        "vintage": 2015,
        "barrel_months": 24,
        "wood_type": "Carvalho Francês 100% Novo",
    },
    "antinori_it": {
        "soil": "Galestro (Xisto Fendido) e Alberese (Calcário Duro)",
        "altitude": "390m",
        "icon_wine": "Tignanello IGT (Sangiovese / Cabernet)",
        "vintage": 2016,
        "barrel_months": 16,
        "wood_type": "Carvalho Francês e Húngaro",
    },
    "crasto_pt": {
        "soil": "Xisto Pré-Cambriano em Socalcos Verticais",
        "altitude": "280m",
        "icon_wine": "Quinta do Crasto Vinha Maria Teresa",
        "vintage": 2017,
        "barrel_months": 20,
        "wood_type": "Carvalho Francês",
    },
    "opus_us": {
        "soil": "Aluvial Sedimentar do Cone de Oakville",
        "altitude": "150m",
        "icon_wine": "Opus One Proprietary Red",
        "vintage": 2018,
        "barrel_months": 18,
        "wood_type": "Carvalho Francês Novo",
    },
}


class WineTerroirsRepository:
    """Calcula informações de terras, tempo de guarda e reação físico-química dos vinhos."""

    @staticmethod
    def get_wine_aging_info(vineyard_key: str) -> Dict[str, Any]:
        """Calcula o tempo decorrido da safra, envelhecimento em barrica e guarda total."""
        data = TERROIR_KNOWLEDGE_BASE.get(vineyard_key, TERROIR_KNOWLEDGE_BASE["miolo_br"])
        current_year = datetime.now().year
        vintage = int(data["vintage"])
        years = max(1, current_year - vintage)
        months = datetime.now().month

        return {
            "icon_wine": data["icon_wine"],
            "soil": data["soil"],
            "altitude": data["altitude"],
            "vintage": vintage,
            "barrel_months": data["barrel_months"],
            "wood_type": data["wood_type"],
            "total_aging_display": f"{years} anos e {months} meses ({vintage} ➔ {current_year})",
            "aging_regime": f"{data['barrel_months']}m em {data['wood_type']} + guarda climatizada",
        }

    @staticmethod
    def evaluate_wine_reaction(temp: float, hum: float, lum: float, t_min: float, t_max: float, h_min: float, h_max: float, l_max: float) -> Dict[str, Any]:
        """Determina a reação físico-química e enológica ativa do vinho frente ao ambiente atual."""
        reactions = []
        status = "ideal"
        color = "success"

        if temp > t_max:
            status = "critico"
            color = "danger"
            diff = temp - t_max
            reactions.append(f"Aceleração oxidativa (+{diff:.1f}°C): polimerização precoce de antocianinas e degradação de aromas voláteis primários.")
        elif temp < t_min:
            status = "alerta"
            color = "warning"
            reactions.append("Resfriamento excessivo: lentidão cinética extrema e risco de precipitação de cristais de tartarato.")
        else:
            reactions.append("Maturação fenólica estável: polimerização harmoniosa dos taninos e conservação integral do bouquet terciário.")

        if hum < h_min:
            status = "critico"
            color = "danger"
            reactions.append("Secamento dos poros da rolha: retração da cortiça natural gerando micro-oxigenação anômala.")
        elif hum > h_max:
            status = "alerta"
            color = "warning"
            reactions.append("Saturação de umidade: risco de fungos superficiais no lacre; taxa de transpiração da barrica reduzida a zero.")
        else:
            reactions.append("Vedação hidrofóbica intacta: elasticidade perfeita da cortiça e transpiração anual controlada (<1.8%).")

        if lum > l_max:
            status = "critico"
            color = "danger"
            reactions.append("Reação fotoquímica (Goût de Lumière): radiação solar excitando riboflavinas e degradando sulfetos.")
        else:
            reactions.append("Penumbra de preservação: ausência de degradação UV protegendo flavonoides e cor natural.")

        return {
            "status": status,
            "color": color,
            "summary": " • ".join(reactions),
            "phenolic_state": "Estável / Equilibrado" if status == "ideal" else "Em Reação de Estresse",
        }
