"""
Componente de UI: Monitoramento Verídico em Tempo Real de Vinhas e Vinícolas Reais do Mundo.
Exibe status ao vivo de Temperatura (°C), Umidade Relativa (%), Luminosidade Solar (% / W/m²)
e Ponto de Orvalho (°C) de 9 vinícolas autênticas via satélite e estações Open-Meteo.
"""

from typing import List
import dash_bootstrap_components as dbc
from dash import dcc, html
from src.models.iot_models import RealVineyardTelemetry, TriggerConfig
from src.repositories.real_vineyards_repository import REAL_VINEYARDS
from src.repositories.wine_terroirs_repository import WineTerroirsRepository

COUNTRY_FLAGS = {
    "Brasil": "🇧🇷",
    "Argentina": "🇦🇷",
    "Chile": "🇨🇱",
    "França": "🇫🇷",
    "Itália": "🇮🇹",
    "Portugal": "🇵🇹",
    "EUA": "🇺🇸",
}


def render_real_vineyards_panel() -> dbc.Card:
    """Renderiza o seletor de vinícolas reais e a grade global de telemetria verídica ao vivo."""
    options = [
        {
            "label": "⚡ Sincronização Direta Wokwi ESP32 (#478106752109243393) ↔ Site & API em Tempo Real",
            "value": "wokwi_only",
        }
    ] + [
        {
            "label": (
                f"{COUNTRY_FLAGS.get(str(meta['country']), '🌍')} "
                f"{meta['name']} — {meta['region']} ({meta['country']}) "
                f"[GPS: {meta['lat']:.2f}, {meta['lon']:.2f}]"
            ),
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
                                html.Div(
                                    "🌍 Telemetria Verídica em Tempo Real — Vinhas e Vinícolas Originais do Mundo (Satélite & Estações)",
                                    className="section-title mb-1 pb-1",
                                ),
                                html.Small(
                                    "Monitoramento climático e solar autêntico por coordenadas GPS reais das vinícolas + Ponto de Orvalho (Magnus-Tetens).",
                                    className="text-muted d-block mb-2",
                                    style={"fontSize": "0.78rem"},
                                ),
                            ],
                            lg=7,
                            md=12,
                        ),
                        dbc.Col(
                            [
                                dbc.Label(
                                    "Fonte Ativa na Telinha Verde, Gráficos & Wokwi ESP32:",
                                    className="small fw-semibold text-dark mb-1",
                                ),
                                dcc.Dropdown(
                                    id="dropdown-real-vineyard",
                                    options=options,
                                    value="wokwi_only",
                                    clearable=False,
                                    className="text-dark small custom-dropdown",
                                ),
                            ],
                            lg=5,
                            md=12,
                        ),
                    ],
                    align="center",
                    className="mb-3",
                ),
                html.Div(id="real-vineyards-global-grid"),
            ],
            className="p-3",
        ),
        className="clean-card mb-3 shadow-sm",
    )


def build_real_vineyards_grid(
    vineyards: List[RealVineyardTelemetry], active_vineyard_id: str, triggers: TriggerConfig
) -> html.Div:
    """Constrói os cartões compactos em tempo real das 9 vinícolas reais do mundo."""
    if not vineyards:
        return html.Div("Consultando satélite e estações meteorológicas das vinícolas mundiais...", className="text-muted small py-2")

    cols: List[dbc.Col] = []
    for v in vineyards:
        flag = COUNTRY_FLAGS.get(v.country, "🌍")
        is_selected = v.vineyard_id == active_vineyard_id
        t_alert = v.temperature < triggers.temp_min or v.temperature > triggers.temp_max
        h_alert = v.humidity < triggers.hum_min or v.humidity > triggers.hum_max
        l_alert = v.luminosity < triggers.lum_min or v.luminosity > triggers.lum_max
        any_alert = t_alert or h_alert or l_alert

        card_cls = "vineyard-card vineyard-card-active h-100" if is_selected else "vineyard-card h-100"
        day_label = "☀️ Dia" if v.is_day else "🌙 Noite"
        t_info = WineTerroirsRepository.get_wine_aging_info(v.vineyard_id)
        rx = WineTerroirsRepository.evaluate_wine_reaction(
            v.temperature, v.humidity, v.luminosity,
            triggers.temp_min, triggers.temp_max, triggers.hum_min, triggers.hum_max, triggers.lum_max,
        )

        cols.append(
            dbc.Col(
                html.Div(
                    [
                        html.Div(
                            [
                                html.Span(f"{flag} {v.name}", className="fw-bold text-dark small text-truncate"),
                                dbc.Badge(
                                    "NO PAINEL" if is_selected else ("FORA TRIGGER" if any_alert else "FAIXA IDEAL"),
                                    color="success" if is_selected else ("warning" if any_alert else "secondary"),
                                    className="ms-1",
                                    style={"fontSize": "0.62rem"},
                                ),
                            ],
                            className="d-flex justify-content-between align-items-center mb-1",
                        ),
                        html.Div(
                            f"🌱 Solo: {t_info['soil']} ({t_info['altitude']}) • {day_label}",
                            className="text-muted text-truncate",
                            style={"fontSize": "0.69rem"},
                        ),
                        html.Div(
                            f"🍷 {t_info['icon_wine']} • Guarda: {t_info['total_aging_display']}",
                            className="text-dark fw-semibold text-truncate mb-1",
                            style={"fontSize": "0.71rem"},
                        ),
                        html.Div(
                            [
                                html.Span(f"🌡️ {v.temperature:.1f}°C", className="text-danger fw-bold me-2" if t_alert else "text-secondary fw-semibold me-2", style={"fontSize": "0.74rem"}),
                                html.Span(f"💧 {v.humidity:.0f}%", className="text-info fw-bold me-2" if h_alert else "text-secondary fw-semibold me-2", style={"fontSize": "0.74rem"}),
                                html.Span(f"☀️ {v.luminosity:.1f}%", className="text-warning fw-bold" if l_alert else "text-secondary fw-semibold", style={"fontSize": "0.74rem"}),
                                dbc.Badge(rx["phenolic_state"], color=rx["color"], className="ms-auto", style={"fontSize": "0.62rem"}),
                            ],
                            className="d-flex flex-wrap align-items-center justify-content-between",
                        ),
                    ],
                    className=card_cls,
                ),
                lg=4,
                md=6,
                sm=12,
                className="mb-2",
            )
        )

    return dbc.Row(cols, className="g-3")
