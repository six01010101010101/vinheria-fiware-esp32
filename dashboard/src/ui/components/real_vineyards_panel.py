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
        {"label": "Simulador ESP32 Wokwi (Sincronização Direta)", "value": "wokwi_only"}
    ] + [
        {
            "label": f"{meta['name']} — {meta['region']}, {meta['country']} [GPS: {meta['lat']:.2f}, {meta['lon']:.2f}]",
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
                                    "Telemetria climática autêntica por coordenadas GPS reais das vinícolas + Ponto de Orvalho (Magnus-Tetens).",
                                    className="text-muted d-block mb-2", style={"fontSize": "0.78rem"},
                                ),
                            ],
                            lg=7, md=12,
                        ),
                        dbc.Col(
                            [
                                dbc.Label("Fonte Ativa na Telinha Verde, Gráficos & Wokwi ESP32:", className="small fw-semibold text-dark mb-1"),
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
        className="card-clean mb-3 shadow-sm",
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
        h_alert = v.humidity < triggers.hum_min or v.humidity > triggers.hum_max
        l_alert = v.luminosity < triggers.lum_min or v.luminosity > triggers.lum_max
        any_alert = t_alert or h_alert or l_alert

        t_info = WineTerroirsRepository.get_wine_aging_info(v.vineyard_id, style=wine_style)
        rx = WineTerroirsRepository.evaluate_reaction(v.vineyard_id, v.temperature, v.humidity, v.luminosity, style=wine_style)
        day_label = "Dia Solar ☀️" if v.is_day else "Noite Estrelada 🌙"

        cols.append(
            dbc.Col(
                html.Div(
                    [
                        html.Div(
                            [
                                html.Span(f"{flag} {v.name}", className="lot-wine-title text-truncate"),
                                dbc.Badge(
                                    "Painel Ativo" if is_selected else ("Desvio" if any_alert else "Faixa Ideal"),
                                    color="success" if is_selected else ("warning" if any_alert else "secondary"),
                                    className="ms-1", style={"fontSize": "0.62rem"},
                                ),
                            ],
                            className="d-flex justify-content-between align-items-center mb-1",
                        ),
                        html.Div(f"Solo: {t_info['soil']} ({t_info['altitude']}) · {day_label}", className="text-muted text-truncate", style={"fontSize": "0.69rem"}),
                        html.Div(f"{t_info['icon_wine']} · Guarda: {t_info['total_aging_display']}", className="text-dark fw-semibold text-truncate mb-1", style={"fontSize": "0.71rem"}),
                        html.Div(
                            [
                                html.Span(f"T: {v.temperature:.1f}°C", className="text-danger fw-bold me-2" if t_alert else "text-secondary fw-semibold me-2", style={"fontSize": "0.74rem"}),
                                html.Span(f"U: {v.humidity:.0f}%", className="text-info fw-bold me-2" if h_alert else "text-secondary fw-semibold me-2", style={"fontSize": "0.74rem"}),
                                html.Span(f"L: {v.luminosity:.1f}%", className="text-warning fw-bold" if l_alert else "text-secondary fw-semibold", style={"fontSize": "0.74rem"}),
                                dbc.Badge(rx["phenolic_state"], color=rx["color"], className="ms-auto", style={"fontSize": "0.62rem"}),
                            ],
                            className="d-flex flex-wrap align-items-center justify-content-between",
                        ),
                    ],
                    className=card_cls,
                ),
                lg=4, md=6, sm=12, className="mb-2",
            )
        )

    return dbc.Row(cols, className="g-3")
