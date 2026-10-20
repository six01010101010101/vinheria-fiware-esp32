"""
Repositório de Lotes Reais da Adega Vinheria Agnello.
Registra lotes autênticos de grandes terroirs da França, Itália, Brasil e mundo,
com safras, datas de engarrafamento, apogeu/validade de guarda e especificações térmicas.
"""

from typing import Dict, List, Optional
from src.models.cellar_lot_models import CellarLot

CELLAR_LOTS: Dict[str, CellarLot] = {
    "LOTE-FR-MARGAUX-01": CellarLot(
        lot_code="LOTE-FR-MARGAUX-01",
        name="Lote 1er Grand Cru · Cava Subterrânea",
        winery_name="Château Margaux",
        country="França",
        region="Médoc, Bordeaux",
        wine_style="tinto",
        wine_name="Château Margaux Grand Vin",
        barrel_type="Carvalho Francês Allier 225L (24m)",
        soil="Cascalho Günziense & Calcário",
        vintage=2015,
        bottling_date="2017-08",
        expiration_date="2050 (Apogeu: 2025–2045)",
        target_temp_min=13.0,
        target_temp_max=16.0,
        target_hum_min=70.0,
        target_hum_max=80.0,
        target_lum_max=10.0,
        stock_bottles=1200,
    ),
    "LOTE-IT-ANTINORI-02": CellarLot(
        lot_code="LOTE-IT-ANTINORI-02",
        name="Lote Tignanello · Cripta Galestro",
        winery_name="Marchesi Antinori",
        country="Itália",
        region="Chianti Classico, Toscana",
        wine_style="tinto",
        wine_name="Tignanello IGT Toscana",
        barrel_type="Barricas Troncais & Allier (16m)",
        soil="Galestro (Xisto) & Alberese",
        vintage=2016,
        bottling_date="2018-09",
        expiration_date="2042 (Apogeu: 2023–2038)",
        target_temp_min=13.0,
        target_temp_max=16.5,
        target_hum_min=68.0,
        target_hum_max=78.0,
        target_lum_max=10.0,
        stock_bottles=2400,
    ),
    "LOTE-BR-MIOLO-43": CellarLot(
        lot_code="LOTE-BR-MIOLO-43",
        name="Lote 43 D.O. · Cave de Pedra Vale dos Vinhedos",
        winery_name="Vinícola Miolo",
        country="Brasil",
        region="Serra Gaúcha, RS",
        wine_style="tinto",
        wine_name="Miolo Lote 43 Merlot-Cabernet",
        barrel_type="Carvalho Francês Novo (12m)",
        soil="Basáltico-Argiloso com Cascalho",
        vintage=2018,
        bottling_date="2020-03",
        expiration_date="2035 (Apogeu: 2024–2032)",
        target_temp_min=13.5,
        target_temp_max=16.5,
        target_hum_min=65.0,
        target_hum_max=78.0,
        target_lum_max=12.0,
        stock_bottles=3200,
    ),
    "LOTE-FR-BLANC-04": CellarLot(
        lot_code="LOTE-FR-BLANC-04",
        name="Lote Pavillon Blanc · Setor Climatizado",
        winery_name="Château Margaux",
        country="França",
        region="Bordeaux",
        wine_style="branco",
        wine_name="Pavillon Blanc de Margaux",
        barrel_type="Carvalho Francês Neutro (8m)",
        soil="Argilo-Calcário Fino",
        vintage=2020,
        bottling_date="2021-06",
        expiration_date="2038 (Apogeu: 2023–2033)",
        target_temp_min=9.0,
        target_temp_max=12.5,
        target_hum_min=60.0,
        target_hum_max=72.0,
        target_lum_max=12.0,
        stock_bottles=850,
    ),
    "LOTE-IT-CERVARO-05": CellarLot(
        lot_code="LOTE-IT-CERVARO-05",
        name="Lote Cervaro della Sala · Cava Úmida",
        winery_name="Marchesi Antinori",
        country="Itália",
        region="Úmbria / Toscana",
        wine_style="branco",
        wine_name="Cervaro della Sala IGT",
        barrel_type="Barricas Francesas e Inox (5m)",
        soil="Calcário com Fósseis Marinhos",
        vintage=2021,
        bottling_date="2022-04",
        expiration_date="2036 (Apogeu: 2024–2032)",
        target_temp_min=9.5,
        target_temp_max=13.0,
        target_hum_min=62.0,
        target_hum_max=75.0,
        target_lum_max=10.0,
        stock_bottles=1100,
    ),
    "LOTE-PT-CRASTO-06": CellarLot(
        lot_code="LOTE-PT-CRASTO-06",
        name="Lote Vinha Maria Teresa · Socalcos do Douro",
        winery_name="Quinta do Crasto",
        country="Portugal",
        region="Vale do Douro",
        wine_style="tinto",
        wine_name="Crasto Vinha Maria Teresa",
        barrel_type="Carvalho Francês 225L (20m)",
        soil="Xisto Pré-Cambriano em Socalcos",
        vintage=2017,
        bottling_date="2019-10",
        expiration_date="2048 (Apogeu: 2026–2042)",
        target_temp_min=13.0,
        target_temp_max=16.0,
        target_hum_min=68.0,
        target_hum_max=78.0,
        target_lum_max=8.0,
        stock_bottles=900,
    ),
    "LOTE-AR-CATENA-07": CellarLot(
        lot_code="LOTE-AR-CATENA-07",
        name="Lote Nicolás Zapata · Cava Andina de Altitude",
        winery_name="Catena Zapata",
        country="Argentina",
        region="Gualtallary, Mendoza",
        wine_style="tinto",
        wine_name="Nicolás Catena Zapata",
        barrel_type="Carvalho Francês de 1º Uso (18m)",
        soil="Aluvial Andino Calcário e Areia",
        vintage=2018,
        bottling_date="2020-05",
        expiration_date="2044 (Apogeu: 2025–2040)",
        target_temp_min=12.5,
        target_temp_max=16.0,
        target_hum_min=65.0,
        target_hum_max=75.0,
        target_lum_max=10.0,
        stock_bottles=1800,
    ),
    "LOTE-BR-EPICO-08": CellarLot(
        lot_code="LOTE-BR-EPICO-08",
        name="Lote Pupitre Champenoise · Cripta Fria",
        winery_name="Villa Francioni",
        country="Brasil",
        region="São Joaquim, SC (1280m)",
        wine_style="espumante",
        wine_name="VF Épico Brut Tradicional",
        barrel_type="Maturação em Pupitres (36m sur lie)",
        soil="Vulcânico Pedregoso de Altitude",
        vintage=2018,
        bottling_date="2019-02",
        expiration_date="2032 (Apogeu: 2022–2030)",
        target_temp_min=6.5,
        target_temp_max=10.0,
        target_hum_min=72.0,
        target_hum_max=85.0,
        target_lum_max=5.0,
        stock_bottles=1450,
    ),
}


class CellarLotsRepository:
    """Repositório de consulta e filtragem de Lotes de Vinho da Adega."""

    @staticmethod
    def get_all_lots() -> List[CellarLot]:
        """Retorna todos os lotes cadastrados na adega."""
        return list(CELLAR_LOTS.values())

    @staticmethod
    def get_lot_by_code(lot_code: str) -> Optional[CellarLot]:
        """Busca um lote específico pelo código de identificação."""
        return CELLAR_LOTS.get(lot_code)

    @staticmethod
    def filter_lots(style: Optional[str] = None, country: Optional[str] = None) -> List[CellarLot]:
        """Filtra lotes por estilo de vinho ou país de origem."""
        lots = list(CELLAR_LOTS.values())
        if style:
            lots = [l for l in lots if l.wine_style.lower() == style.lower()]
        if country:
            lots = [l for l in lots if l.country.lower() == country.lower()]
        return lots
