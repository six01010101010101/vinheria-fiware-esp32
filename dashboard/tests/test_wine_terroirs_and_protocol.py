"""
Testes unitários dos novos serviços de Terroirs, Guarda dos Vinhos,
Saúde da Adega e Protocolo Ultralight 2.0 Wokwi ESP32.
"""

from src.models.iot_models import SensorSnapshot, TriggerConfig
from src.repositories.wine_catalog_data import get_profile
from src.repositories.wine_terroirs_repository import WineTerroirsRepository
from src.repositories.wokwi_protocol import (
    build_alert,
    build_diag,
    build_live,
    build_sync,
    parse_ultralight_kv,
    snapshot_from_kv,
)
from src.services.cellar_health_service import compute_health, verdict_for


def test_dynamic_wine_profile_by_style_and_country():
    p_bordeaux_tinto = get_profile("margaux_fr", "tinto")
    assert "Cabernet" in p_bordeaux_tinto.grapes
    assert p_bordeaux_tinto.style == "tinto"

    p_bordeaux_rose = get_profile("margaux_fr", "rose")
    assert "Cabernet" in p_bordeaux_rose.grapes
    assert p_bordeaux_rose.style == "rose"

    p_italy_tinto = get_profile("antinori_it", "tinto")
    assert "Sangiovese" in p_italy_tinto.grapes

    p_italy_branco = get_profile("antinori_it", "branco")
    assert "Chardonnay" in p_italy_branco.grapes


def test_wine_aging_and_window():
    prof = get_profile("antinori_it", "tinto")
    aging = WineTerroirsRepository.get_aging(prof)
    assert aging.years >= 3
    assert aging.total_days > 1000
    assert 0 <= aging.progress_pct <= 100

    info = WineTerroirsRepository.get_wine_aging_info("antinori_it", "tinto")
    assert "Tignanello" in info["icon_wine"]
    assert "Carvalho" in info["wood_type"]


def test_wine_reaction_evaluation():
    rx_ideal = WineTerroirsRepository.evaluate_wine_reaction(
        temp=15.0, hum=70.0, lum=10.0,
        t_min=14.0, t_max=18.0, h_min=60.0, h_max=75.0, l_max=25.0,
    )
    assert rx_ideal["status"] == "ideal"
    assert rx_ideal["color"] == "success"
    assert "Perfeito" in rx_ideal["phenolic_state"]

    rx_hot = WineTerroirsRepository.evaluate_wine_reaction(
        temp=25.0, hum=40.0, lum=60.0,
        t_min=14.0, t_max=18.0, h_min=60.0, h_max=75.0, l_max=25.0,
    )
    assert rx_hot["status"] == "critico"
    assert rx_hot["color"] == "danger"
    assert "oxidativa" in rx_hot["summary"].lower()


def test_cellar_health_service_scores_and_verdicts():
    triggers = TriggerConfig(temp_min=14.0, temp_max=18.0, hum_min=60.0, hum_max=75.0, lum_min=0.0, lum_max=25.0)

    snap_perfect = SensorSnapshot(temperature=16.0, humidity=68.0, luminosity=10.0, timestamp="12:00:00")
    h_perfect = compute_health(snap_perfect, triggers)
    assert h_perfect is not None
    assert h_perfect >= 95

    v_code, v_text, badge_color = verdict_for(h_perfect, is_anomalous=False)
    assert v_code == "OK"
    assert "EXCELENTE" in v_text

    snap_bad = SensorSnapshot(temperature=30.0, humidity=30.0, luminosity=80.0, timestamp="12:00:00")
    h_bad = compute_health(snap_bad, triggers)
    assert h_bad is not None
    assert h_bad < 60

    v_bad_code, _, _ = verdict_for(h_bad, is_anomalous=True)
    assert v_bad_code in ("ALR", "CRT")


def test_wokwi_protocol_builders_and_parsers():
    assert build_alert("vine001", "temp") == "vine001@alert|temp"
    assert build_diag("vine001", "normal", 100, "EXC", "TINTO") == "vine001@diag|normal|100|EXC|TINTO"
    assert build_sync("vine001", 15.5, 68.0, 12.0) == "vine001@sync|15.5|68.0|12.0"
    assert build_live("vine001") == "vine001@live|1"

    kv = parse_ultralight_kv("t|15.5|h|68.0|l|12.0|r|0")
    assert kv == {"t": 15.5, "h": 68.0, "l": 12.0, "r": 0.0}

    snap = snapshot_from_kv(kv, "12:34:56")
    assert snap is not None
    assert snap.temperature == 15.5
    assert snap.humidity == 68.0
    assert snap.luminosity == 12.0
