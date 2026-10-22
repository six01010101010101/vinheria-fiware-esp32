"""
Componente de UI: Monitoramento Verídico em Tempo Real de Vinhas e Vinícolas Reais do Mundo.
Exibe status ao vivo de Temperatura (°C), Umidade Relativa (%), Luminosidade Solar (% / W/m²)
e Ponto de Orvalho (°C) de 10 vinícolas autênticas via satélite e estações Open-Meteo.
"""

from typing import List
import dash_bootstrap_components as dbc
from dash import dcc, html
from src.models.iot_models import RealVineyardTelemetry, TriggerConfig
from src.repositories.real_vineyards_repository import REAL_VINEYARDS
from src.repositories.wine_terroirs_repository import WineTerroirsRepository

COUNTRY_FLAGS = {
    "Brasil": "🇧🇷", "Argentina": "🇦🇷", "Chile": "🇨🇱",
    "França": "🇫🇷", "Itália": "🇮🇹", "Portugal": "🇵🇹",
    "EUA": "🇺🇸", "Rússia": "🇷🇺",
}


def render_real_vineyards_panel() -> dbc.Card:
    """Renderiza o seletor de vinícolas reais e a grade global de telemetria verídica ao vivo."""
    options = [
        {"label": "📟 Simulador ESP32 Wokwi (:1883)", "value": "wokwi_only"}
    ] + [
        {
            "label": f"{COUNTRY_FLAGS.get(meta['country'], '🍷')} {meta['name']} — {meta['region']}, {meta['country']} [GPS: {meta['lat']:.2f}, {meta['lon']:.2f}]",
            "value": key,
        }
        for key, meta in REAL_VINEYARDS.items()
    ]

    return dbc.Card(
        dbc.CardBody(
            [
                dbc.Row(
                    [
                        dbc.Col(
                            [
                                html.Div("MONITORAMENTO GLOBAL DE TERROIRS (OPEN-METEO)", className="section-title mb-1 pb-1"),
                                html.Small(
                                    "Telemetria climática autêntica por satélite e coordenadas GPS + Ponto de Orvalho (Magnus-Tetens).",
                                    className="text-muted d-block mb-2", style={"fontSize": "0.78rem"},
                                ),
                            ],
                            lg=7, md=12,
                        ),
                        dbc.Col(
                            [
                                dbc.Label("Fonte Ativa na Telinha Verde, Gráficos & Wokwi ESP32:", className="small fw-semibold text-wine mb-1"),
                                dcc.Dropdown(
                                    id="dropdown-real-vineyard", options=options, value="wokwi_only",
                                    clearable=False, searchable=True, className="small custom-dropdown wine-search-bar",
                                    placeholder="Buscar vinícola ou terroir...",
                                ),
                            ],
                            lg=5, md=12,
                        ),
                    ],
                    className="align-items-center mb-3",
                ),
                html.Div(id="real-vineyards-global-grid"),
            ]
        ),
        className="clean-card mb-3 shadow-sm",
    )


def build_real_vineyards_grid(
    vineyards: List[RealVineyardTelemetry], active_id: str, triggers: TriggerConfig, wine_style: str = "tinto"
) -> dbc.Row:
    """Renderiza os cards individuais para as 10 vinícolas mundiais calculando desvios térmicos em tempo real."""
    if not vineyards:
        return dbc.Row(dbc.Col(html.Div("Carregando telemetria global das vinícolas...", className="text-muted small py-3")))

    cols: List[dbc.Col] = []
    for v in vineyards:
        is_selected = (v.vineyard_id == active_id)
        card_cls = "vineyard-card h-100 active-vineyard" if is_selected else "vineyard-card h-100"
        flag = COUNTRY_FLAGS.get(v.country, "🍷")

        t_alert = v.temperature < triggers.temp_min or v.temperature > triggers.temp_max
        any_alert = t_alert or (v.humidity < triggers.hum_min or v.humidity > triggers.hum_max) or (v.luminosity < triggers.lum_min or v.luminosity > triggers.lum_max)
        t_info = WineTerroirsRepository.get_wine_aging_info(v.vineyard_id, style=wine_style)
        rx = WineTerroirsRepository.evaluate_reaction(v.vineyard_id, v.temperature, v.humidity, v.luminosity, style=wine_style)

        cols.append(
            dbc.Col(
                html.Div(
                    [
                        html.Div(
                            [
                                html.Div(
                                    [
                                        html.Span(flag, className="flag-circle me-2"),
                                        html.Div(
                                            [
                                                html.Span(v.name, className="lot-wine-title text-truncate d-block", style={"fontSize": "0.85rem"}),
                                                html.Span(f"{v.country} · {v.region}", className="text-country small", style={"fontSize": "0.72rem"}),
                                            ]
                                        ),
                                    ],
                                    className="d-flex align-items-center",
                                ),
                                dbc.Badge(
                                    "● ATIVO" if is_selected else ("DESVIO" if any_alert else "IDEAL"),
                                    color="success" if is_selected else ("warning" if any_alert else "secondary"),
                                    className="ms-1", style={"fontSize": "0.62rem"},
                                ),
                            ],
                            className="d-flex justify-content-between align-items-center mb-2",
                        ),
                        html.Div(f"Solo: {t_info['soil']} ({t_info['altitude']})", className="text-muted text-truncate mb-1", style={"fontSize": "0.70rem"}),
                        html.Div(
                            [
                                html.Span(f"🌡️ {v.temperature:.1f}°C", className="text-temp small me-2", style={"fontSize": "0.75rem"}),
                                html.Span(f"💧 {v.humidity:.0f}%", className="text-hum small me-2", style={"fontSize": "0.75rem"}),
                                html.Span(f"☀️ {v.luminosity:.1f}%", className="text-lum small me-2", style={"fontSize": "0.75rem"}),
                                html.Span(f"💨 {v.dew_point:.1f}°C", className="text-dew small", style={"fontSize": "0.75rem"}),
                            ],
                            className="d-flex align-items-center justify-content-between p-2 rounded bg-dark bg-opacity-25 border border-secondary border-opacity-25 mt-2",
                        ),
                    ],
                    className=card_cls,
                ),
                lg=4, md=6, sm=12, className="mb-2",
            )
        )

    return dbc.Row(cols, className="g-3")
