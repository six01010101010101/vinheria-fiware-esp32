"""
Componente de UI: Cabeçalho Profissional, Status da Conexão em Tempo Real,
Presets de Vinho (Diferencial) e Ajuste dos Triggers (Temperatura, Umidade e Luminosidade).
"""

import dash_bootstrap_components as dbc
from dash import dcc, html
from src.config.settings import WINE_PRESETS


def _build_trigger_input_group(
    icon_src: str, label: str, min_id: str, max_id: str, min_val: float, max_val: float, step: float
) -> dbc.Col:
    """Constrói um grupo limpo de inputs Mínimo e Máximo para cada Trigger com ícone customizado."""
    return dbc.Col(
        [
            dbc.Label(
                [html.Img(src=icon_src, className="custom-icon"), html.Span(label)],
                className="small fw-bold text-secondary mb-1 d-flex align-items-center",
            ),
            dbc.InputGroup(
                [
                    dbc.InputGroupText("Mín"),
                    dbc.Input(id=min_id, type="number", step=step, value=min_val),
                    dbc.InputGroupText("Máx"),
                    dbc.Input(id=max_id, type="number", step=step, value=max_val),
                ],
                size="sm",
            ),
        ],
        md=3,
    )


def render_header_and_triggers() -> html.Div:
    """Renderiza o cabeçalho limpo e a barra de configuração dos Triggers e Presets."""
    preset_options = [{"label": meta["name"], "value": key} for key, meta in WINE_PRESETS.items()]
    default_preset = WINE_PRESETS["tinto"]

    return html.Div(
        [
            # Cabeçalho Principal Limpo e Direto com Ícone Customizado de Taça de Vinho
            dbc.Card(
                dbc.CardBody(
                    dbc.Row(
                        [
                            dbc.Col(
                                [
                                    html.H4(
                                        [
                                            html.Img(src="/assets/icons/wine.png", className="custom-icon-lg"),
                                            html.Span("Monitoramento Global de Vinherias — FIWARE & ESP32"),
                                        ],
                                        className="mb-1 fw-bold text-dark d-flex align-items-center",
                                    ),
                                    html.Div(
                                        "Check Point 5 • Controle de Temperatura, Umidade e Luminosidade com Alerta Remoto (LED Azul + Buzzer)",
                                        className="text-muted small",
                                    ),
                                ],
                                md=7,
                            ),
                            dbc.Col(
                                html.Div(
                                    id="wokwi-live-status-bar",
                                    className="d-flex justify-content-md-end mt-2 mt-md-0",
                                ),
                                md=5,
                            ),
                        ],
                        align="center",
                    ),
                    className="py-3",
                ),
                className="clean-card mb-3 shadow-sm",
            ),
            # Seção de Ajustes dos Triggers + Presets por Tipo de Vinho (Diferencial)
            dbc.Card(
                dbc.CardBody(
                    [
                        html.Div(
                            "1. Configuração de Triggers e Perfil de Conservação (Diferencial)",
                            className="section-title",
                        ),
                        dbc.Row(
                            [
                                dbc.Col(
                                    [
                                        dbc.Label(
                                            [
                                                html.Img(src="/assets/icons/wine.png", className="custom-icon"),
                                                html.Span("Preset por Tipo de Vinho"),
                                            ],
                                            className="small fw-bold text-warning mb-1 d-flex align-items-center",
                                        ),
                                        dcc.Dropdown(
                                            id="dropdown-wine-preset",
                                            options=preset_options,
                                            value="tinto",
                                            clearable=False,
                                            className="text-dark small",
                                        ),
                                        html.Div(
                                            default_preset["description"],
                                            id="preset-description-text",
                                            className="small text-muted mt-1",
                                        ),
                                    ],
                                    md=3,
                                ),
                                _build_trigger_input_group(
                                    "/assets/icons/temperature.png",
                                    "Temperatura (°C)",
                                    "trigger-temp-min",
                                    "trigger-temp-max",
                                    default_preset["temp_min"],
                                    default_preset["temp_max"],
                                    0.5,
                                ),
                                _build_trigger_input_group(
                                    "/assets/icons/humidity.png",
                                    "Umidade Relativa (%)",
                                    "trigger-hum-min",
                                    "trigger-hum-max",
                                    default_preset["hum_min"],
                                    default_preset["hum_max"],
                                    1.0,
                                ),
                                _build_trigger_input_group(
                                    "/assets/icons/luminosity.png",
                                    "Luminosidade (%)",
                                    "trigger-lum-min",
                                    "trigger-lum-max",
                                    default_preset["lum_min"],
                                    default_preset["lum_max"],
                                    1.0,
                                ),
                            ],
                            align="start",
                        ),
                    ]
                ),
                className="clean-card mb-3 shadow-sm",
            ),
        ]
    )
