"""
Componente de UI: Painel de Triggers e Presets de Vinho (Diferencial).
Permite configurar os limites ideais de Temperatura, Umidade e Luminosidade,
com carregamento instantâneo de perfis enológicos para vinhos finos.
"""

import dash_bootstrap_components as dbc
from dash import dcc, html
from src.config.settings import WINE_PRESETS


def _build_trigger_input_group(
    icon_src: str, label: str, min_id: str, max_id: str, min_val: float, max_val: float, step: float
) -> dbc.Col:
    """Constrói um grupo de inputs Mínimo e Máximo para cada Trigger com ícone e rótulo clean."""
    return dbc.Col(
        [
            dbc.Label(
                [
                    html.Img(src=icon_src, className="custom-icon me-2"),
                    html.Span(label, className="fw-semibold text-dark"),
                ],
                className="small mb-1 d-flex align-items-center",
            ),
            dbc.InputGroup(
                [
                    dbc.InputGroupText("Mín", className="trigger-addon-label"),
                    dbc.Input(id=min_id, type="number", step=step, value=min_val, className="trigger-input-field"),
                    dbc.InputGroupText("Máx", className="trigger-addon-label"),
                    dbc.Input(id=max_id, type="number", step=step, value=max_val, className="trigger-input-field"),
                ],
                size="sm",
                className="trigger-input-group shadow-none",
            ),
        ],
        lg=3,
        md=6,
        sm=12,
        className="mb-2 mb-lg-0",
    )


def render_header_and_triggers() -> html.Div:
    """Renderiza a seção de Triggers e Presets Enológicos com visual moderno e clean."""
    preset_options = [{"label": meta["name"], "value": key} for key, meta in WINE_PRESETS.items()]
    default_preset = WINE_PRESETS["tinto"]

    return html.Div(
        [
            dbc.Card(
                dbc.CardBody(
                    [
                        html.Div(
                            [
                                html.Div(
                                    [
                                        html.Span("CARTA DE PRESETS ENOLÓGICOS & CONTROLE DO SOMMELIER"),
                                        html.Small(
                                            "Calibração de faixas térmicas, higrometria de cortiça e penumbra por casta e estilo.",
                                            className="text-muted fw-normal d-block mt-1",
                                            style={"fontSize": "0.78rem", "textTransform": "none"},
                                        ),
                                    ],
                                    className="section-title mb-3 pb-2 border-bottom",
                                ),
                            ]
                        ),
                        dbc.Row(
                            [
                                dbc.Col(
                                    [
                                        dbc.Label(
                                            [
                                                html.Img(src="/assets/icons/wine.png", className="custom-icon me-2"),
                                                html.Span("Estilo de Vinho & Casta", className="fw-semibold text-wine"),
                                            ],
                                            className="small mb-1 d-flex align-items-center",
                                        ),
                                        dcc.Dropdown(
                                            id="dropdown-wine-preset",
                                            options=preset_options,
                                            value="tinto",
                                            clearable=False,
                                            searchable=True,
                                            className="small custom-dropdown wine-search-bar",
                                            placeholder="Buscar estilo de vinho ou casta...",
                                        ),
                                        html.Div(
                                            default_preset["description"],
                                            id="preset-description-text",
                                            className="small text-muted mt-1 text-truncate",
                                            style={"fontSize": "0.74rem"},
                                        ),
                                    ],
                                    lg=3,
                                    md=6,
                                    sm=12,
                                    className="mb-2 mb-lg-0",
                                ),
                                _build_trigger_input_group(
                                    "/assets/icons/temperature.png",
                                    "Temperatura da Cava (°C)",
                                    "trigger-temp-min",
                                    "trigger-temp-max",
                                    default_preset["temp_min"],
                                    default_preset["temp_max"],
                                    0.5,
                                ),
                                _build_trigger_input_group(
                                    "/assets/icons/humidity.png",
                                    "Higrometria da Rolha (%)",
                                    "trigger-hum-min",
                                    "trigger-hum-max",
                                    default_preset["hum_min"],
                                    default_preset["hum_max"],
                                    1.0,
                                ),
                                _build_trigger_input_group(
                                    "/assets/icons/luminosity.png",
                                    "Penumbra da Adega (%)",
                                    "trigger-lum-min",
                                    "trigger-lum-max",
                                    default_preset["lum_min"],
                                    default_preset["lum_max"],
                                    1.0,
                                ),
                            ],
                            align="start",
                            className="g-3",
                        ),
                    ],
                    className="p-3",
                ),
                className="clean-card mb-3 shadow-sm",
            ),
        ]
    )
