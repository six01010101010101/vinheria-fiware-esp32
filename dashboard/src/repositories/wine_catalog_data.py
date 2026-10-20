"""
Catálogo Enológico de Terroirs Reais do Mundo por Estilo de Vinho.
Cobre Tinto, Rosé, Branco e Espumante para as 9 vinícolas mundiais,
garantindo que safra, uvas, guarda e solo mudem dinamicamente ao trocar estilo ou país.
"""

from typing import Dict, Tuple
from src.models.wine_models import WineProfile

# Chave composta: (vineyard_key, style) onde style in ("tinto", "rose", "branco", "espumante")
WINE_CATALOG: Dict[Tuple[str, str], WineProfile] = {
    # 1. BRASIL - Serra Gaúcha
    ("miolo_br", "tinto"): WineProfile("miolo_br", "tinto", "Miolo Lote 43 D.O.", "Merlot & Cabernet Sauvignon", "Basáltico-Argiloso com Cascalho", 640, 2018, 3, 12, 15, "16-18°C", "Ameixa preta, trufa e tabaco"),
    ("miolo_br", "rose"): WineProfile("miolo_br", "rose", "Miolo Seleção Rosé", "Tempranillo & Touriga", "Basáltico Drenado", 640, 2023, 2, 0, 3, "10-12°C", "Morangos frescos e pitanga"),
    ("miolo_br", "branco"): WineProfile("miolo_br", "branco", "Miolo Cuvée Giuseppe", "Chardonnay", "Argilo-Basáltico Fértil", 640, 2021, 2, 6, 8, "9-11°C", "Abacaxi maduro, baunilha e manteiga"),
    ("miolo_br", "espumante"): WineProfile("miolo_br", "espumante", "Miolo Millésime Brut D.O.", "Pinot Noir & Chardonnay", "Basáltico de Encosta", 640, 2019, 1, 24, 10, "6-8°C", "Brioche, maçã verde e perlage fino"),

    # 2. BRASIL - Serra Catarinense (Altitude Fria)
    ("francioni_br", "tinto"): WineProfile("francioni_br", "tinto", "Villa Francioni D.O. Tinto", "Cabernet, Merlot & Malbec", "Vulcânico e Franco-Argiloso", 1280, 2017, 4, 14, 16, "15-17°C", "Frutas negras, cedro e especiarias"),
    ("francioni_br", "rose"): WineProfile("francioni_br", "rose", "Villa Francioni Rosé Ícone", "Cabernet, Merlot & Syrah", "Vulcânico de Alta Drenagem", 1280, 2023, 3, 0, 4, "10-12°C", "Pêssego branco, romã e floral"),
    ("francioni_br", "branco"): WineProfile("francioni_br", "branco", "VF Sauvignon Blanc Altitude", "Sauvignon Blanc", "Vulcânico Mineral", 1280, 2022, 3, 0, 5, "8-10°C", "Maracujá, folhas de tomate e lima"),
    ("francioni_br", "espumante"): WineProfile("francioni_br", "espumante", "VF Épico Brut Tradicional", "Chardonnay & Pinot Noir", "Vulcânico Pedregoso", 1280, 2018, 2, 36, 12, "6-8°C", "Amêndoas tostadas e perlage cremoso"),

    # 3. BRASIL - Serra da Mantiqueira SP (Colheita de Inverno)
    ("guaspari_br", "tinto"): WineProfile("guaspari_br", "tinto", "Guaspari Vista da Serra", "Syrah", "Granítico Pedregoso Degradado", 1050, 2019, 8, 18, 14, "16-18°C", "Amora silvestre, pimenta preta e grafite"),
    ("guaspari_br", "rose"): WineProfile("guaspari_br", "rose", "Guaspari Rosé de Inverno", "Syrah", "Granítico de Altitude", 1050, 2023, 7, 4, 3, "10-12°C", "Cereja fresca e toques florais"),
    ("guaspari_br", "branco"): WineProfile("guaspari_br", "branco", "Guaspari Vista do Lago", "Sauvignon Blanc", "Granítico com Quartzo", 1050, 2022, 7, 6, 6, "9-11°C", "Grapefruit, minerais e ervas finas"),
    ("guaspari_br", "espumante"): WineProfile("guaspari_br", "espumante", "Guaspari Nature de Inverno", "Chardonnay", "Granítico Arenoso", 1050, 2020, 6, 18, 8, "6-8°C", "Cítricos cristalizados e noz-moscada"),

    # 4. ARGENTINA - Mendoza (Alta Altitude dos Andes)
    ("catena_ar", "tinto"): WineProfile("catena_ar", "tinto", "Nicolás Catena Zapata", "Cabernet Sauvignon & Malbec", "Aluvial Andino Calcário e Areia", 1450, 2018, 4, 18, 25, "16-18°C", "Cassis, violetas, cacau e couro"),
    ("catena_ar", "rose"): WineProfile("catena_ar", "rose", "Catena D.V. Malbec Rosé", "Malbec", "Aluvial Pedregoso", 1450, 2023, 3, 0, 3, "10-12°C", "Framboesa e pétalas de rosa"),
    ("catena_ar", "branco"): WineProfile("catena_ar", "branco", "Adrianna Vineyard White Bones", "Chardonnay", "Calcário Puro Fóssil", 1450, 2020, 3, 14, 15, "10-12°C", "Pederneira, maçã assada e mineralidade"),
    ("catena_ar", "espumante"): WineProfile("catena_ar", "espumante", "D.V. Catena Nature Clássico", "Chardonnay & Pinot Noir", "Aluvial Frio de Gualtallary", 1450, 2019, 2, 30, 10, "6-8°C", "Manteiga fresca, leveduras e casca de pão"),

    # 5. CHILE - Vale do Maipo
    ("concha_cl", "tinto"): WineProfile("concha_cl", "tinto", "Don Melchor Cabernet Sauvignon", "Cabernet Sauvignon & Franc", "Franco-Aluvial Pedregoso do Maipo", 650, 2019, 4, 15, 22, "16-18°C", "Groselha negra, cedro, grafite e menta"),
    ("concha_cl", "rose"): WineProfile("concha_cl", "rose", "Marques de Casa Concha Rosé", "Cinsault & Grenache", "Aluvial Costeiro", 650, 2023, 3, 0, 3, "10-12°C", "Melancia, morangos e mineral marinho"),
    ("concha_cl", "branco"): WineProfile("concha_cl", "branco", "Amelia Limarí Chardonnay", "Chardonnay", "Argila Vermelha com Carbonato", 650, 2021, 3, 12, 10, "9-11°C", "Avelãs, lima e salinidade litorânea"),
    ("concha_cl", "espumante"): WineProfile("concha_cl", "espumante", "Subercaseaux Grande Cuvée", "Chardonnay & Pinot Noir", "Aluvial Antigo Drenado", 650, 2020, 2, 18, 8, "6-8°C", "Torrada, cítricos e maçã amarela"),

    # 6. FRANÇA - Médoc, Bordeaux
    ("margaux_fr", "tinto"): WineProfile("margaux_fr", "tinto", "Château Margaux 1er Grand Cru", "Cabernet Sauvignon & Merlot", "Cascalho Günziense Branco e Calcário", 32, 2015, 9, 24, 35, "16-18°C", "Violeta bordalesa, cassis, caixa de charuto e trufa"),
    ("margaux_fr", "rose"): WineProfile("margaux_fr", "rose", "Pavillon Rosé de Margaux", "Cabernet Sauvignon & Franc", "Cascalho Aluvial Médoc", 32, 2022, 9, 6, 6, "11-13°C", "Frutos vermelhos silvestres e especiarias doces"),
    ("margaux_fr", "branco"): WineProfile("margaux_fr", "branco", "Pavillon Blanc de Ch. Margaux", "Sauvignon Blanc", "Argilo-Calcário Fino", 32, 2020, 8, 8, 18, "10-12°C", "Flores brancas, pêssego de vinha e giz"),
    ("margaux_fr", "espumante"): WineProfile("margaux_fr", "espumante", "Crémant de Bordeaux Grand Cru", "Sémillon & Cabernet Franc", "Calcário de Encosta", 32, 2021, 8, 24, 10, "7-9°C", "Flor de laranjeira, mel e perlage fino"),

    # 7. ITÁLIA - Chianti Classico / Toscana
    ("antinori_it", "tinto"): WineProfile("antinori_it", "tinto", "Tignanello IGT Toscana", "Sangiovese & Cabernet", "Galestro (Xisto) e Alberese (Calcário)", 390, 2016, 10, 16, 25, "16-18°C", "Cereja amarga, couro toscano, alecrim e café"),
    ("antinori_it", "rose"): WineProfile("antinori_it", "rose", "Scalabrone Bolgheri Rosato DOC", "Cabernet Sauvignon & Merlot", "Arenito e Argila Marinha", 390, 2023, 9, 0, 4, "10-12°C", "Cereja marasca, tomilho e frescor mediterrâneo"),
    ("antinori_it", "branco"): WineProfile("antinori_it", "branco", "Cervaro della Sala IGT", "Chardonnay & Grechetto", "Argilo-Calcário com Fósseis Marinhos", 390, 2021, 9, 5, 14, "10-12°C", "Baunilha suave, camomila, sílex e manteiga"),
    ("antinori_it", "espumante"): WineProfile("antinori_it", "espumante", "Marchese Antinori Franciacorta", "Chardonnay & Pinot Nero", "Morenas Glaciais Pedregosas", 390, 2020, 8, 36, 12, "6-8°C", "Crosta de pão, maçã fuji e acidez vibrante"),

    # 8. PORTUGAL - Vale do Douro
    ("crasto_pt", "tinto"): WineProfile("crasto_pt", "tinto", "Quinta do Crasto Vinha M. Teresa", "Vinhas Velhas (54 castas)", "Xisto Pré-Cambriano em Socalcos", 280, 2017, 9, 20, 30, "16-18°C", "Esteva douriense, amoras maduras e resina"),
    ("crasto_pt", "rose"): WineProfile("crasto_pt", "rose", "Quinta do Crasto Rosé Superior", "Touriga Nacional", "Xisto Degradado", 280, 2023, 8, 0, 4, "10-12°C", "Violeta floral, framboesa e mineralidade seca"),
    ("crasto_pt", "branco"): WineProfile("crasto_pt", "branco", "Crasto Superior Branco", "Viosinho, Rabigato & Gouveio", "Xisto de Maior Altitude (450m)", 280, 2022, 8, 6, 10, "9-11°C", "Cítricos do Douro, flor de laranjeira e sílex"),
    ("crasto_pt", "espumante"): WineProfile("crasto_pt", "espumante", "Crasto Reserva Bruto Clássico", "Gouveio & Cercial", "Xisto com Quartzo", 280, 2019, 8, 36, 12, "6-8°C", "Brioche amanteigado, limão confitado e bolha fina"),

    # 9. EUA - Oakville, Napa Valley
    ("opus_us", "tinto"): WineProfile("opus_us", "tinto", "Opus One Proprietary Red", "Cabernet Sauvignon & Merlot", "Aluvial Sedimentar do Cone de Oakville", 150, 2018, 9, 18, 30, "16-18°C", "Mirtilo, mocha, cedro americano e baunilha"),
    ("opus_us", "rose"): WineProfile("opus_us", "rose", "Overture Rosé d'Oakville", "Cabernet Franc & Merlot", "Cascalho do Rio Napa", 150, 2022, 8, 6, 5, "11-13°C", "Cereja negra, pétalas secas e especiaria doce"),
    ("opus_us", "branco"): WineProfile("opus_us", "branco", "Opus Reserve Fumé Blanc", "Sauvignon Blanc & Sémillon", "Franco-Argiloso Drenado", 150, 2021, 8, 9, 12, "10-12°C", "Capim-limão, figo verde e carvalho sutil"),
    ("opus_us", "espumante"): WineProfile("opus_us", "espumante", "Opus Carneros Cuvée Brut", "Chardonnay & Pinot Noir", "Argila Marinha de Carneros", 150, 2019, 8, 36, 12, "6-8°C", "Torta de maçã, levedura e perlage persistente"),
}


def get_profile(vineyard_key: str, style: str) -> WineProfile:
    """Busca o perfil exato do vinho para o terroir e estilo solicitados."""
    clean_style = style.lower().strip() if style else "tinto"
    if clean_style not in ("tinto", "rose", "branco", "espumante"):
        clean_style = "tinto"
    vkey = vineyard_key if vineyard_key in [k[0] for k in WINE_CATALOG.keys()] else "miolo_br"
    return WINE_CATALOG.get((vkey, clean_style), WINE_CATALOG[(vkey, "tinto")])
