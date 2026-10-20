"""
Testes unitários para o Domínio de Lotes da Adega, Cavas e Reações em Tempo Real.
"""

from src.models.cellar_lot_models import CellarLot
from src.repositories.cellar_lots_repository import CellarLotsRepository
from src.services.cellar_lots_service import CellarLotsService


def test_repository_contains_world_lots() -> None:
    """Verifica se o repositório contém lotes da França, Itália, Brasil e outros terroirs."""
    lots = CellarLotsRepository.get_all_lots()
    assert len(lots) >= 8

    france_lots = CellarLotsRepository.filter_lots(country="França")
    assert len(france_lots) >= 2
    assert any("Margaux" in l.winery_name for l in france_lots)

    italy_lots = CellarLotsRepository.filter_lots(country="Itália")
    assert len(italy_lots) >= 2
    assert any("Antinori" in l.winery_name for l in italy_lots)

    brazil_lots = CellarLotsRepository.filter_lots(country="Brasil")
    assert len(brazil_lots) >= 2


def test_repository_filter_by_style() -> None:
    """Valida a filtragem de lotes por estilo de vinho (tinto, branco, espumante)."""
    red_lots = CellarLotsRepository.filter_lots(style="tinto")
    assert all(l.wine_style == "tinto" for l in red_lots)

    white_lots = CellarLotsRepository.filter_lots(style="branco")
    assert all(l.wine_style == "branco" for l in white_lots)

    sparkling_lots = CellarLotsRepository.filter_lots(style="espumante")
    assert all(l.wine_style == "espumante" for l in sparkling_lots)


def test_lot_attributes_and_dates() -> None:
    """Garante que cada lote possui código, safras, datas de engarrafamento e validade/guarda."""
    lot = CellarLotsRepository.get_lot_by_code("LOTE-FR-MARGAUX-01")
    assert lot is not None
    assert lot.vintage == 2015
    assert lot.bottling_date == "2017-08"
    assert "Apogeu" in lot.expiration_date
    assert lot.stock_bottles > 0
    assert lot.target_temp_min < lot.target_temp_max


def test_service_evaluate_lot_ideal_conditions() -> None:
    """Testa a avaliação em condições climáticas ideais."""
    lot = CellarLotsRepository.get_lot_by_code("LOTE-FR-MARGAUX-01")
    assert lot is not None

    # T=14.5, H=75%, L=5% (tudo na faixa ideal do Margaux)
    res = CellarLotsService.evaluate_lot(lot, cur_t=14.5, cur_h=75.0, cur_l=5.0)
    assert res.temp_status == "ideal"
    assert res.hum_status == "ideal"
    assert res.lum_status == "ideal"
    assert res.health_score == 100
    assert res.status_color == "success"
    assert "Guarda Perfeita" in res.verdict
    assert len(res.alerts) == 0


def test_service_evaluate_lot_thermal_anomaly() -> None:
    """Testa anomalia de temperatura alta acelerando oxidação."""
    lot = CellarLotsRepository.get_lot_by_code("LOTE-IT-ANTINORI-02")
    assert lot is not None

    # T=23.0°C (muito acima do máximo 16.5°C)
    res = CellarLotsService.evaluate_lot(lot, cur_t=23.0, cur_h=70.0, cur_l=5.0)
    assert res.temp_status == "critico"
    assert res.health_score < 80
    assert any("Aceleração oxidativa" in a for a in res.alerts)


def test_service_evaluate_lot_dry_humidity_anomaly() -> None:
    """Testa anomalia de baixa umidade ressecando a rolha."""
    lot = CellarLotsRepository.get_lot_by_code("LOTE-BR-MIOLO-43")
    assert lot is not None

    # H=35% (muito abaixo do mínimo 65%)
    res = CellarLotsService.evaluate_lot(lot, cur_t=15.0, cur_h=35.0, cur_l=5.0)
    assert res.hum_status == "critico"
    assert res.health_score < 80
    assert any("ressecamento" in a.lower() for a in res.alerts)
