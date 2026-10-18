"""
Componente de UI: Controle de Operação em Tempo Real (Wokwi MQTT / Simulação Automática)
e Cadastro/Gerenciamento de IoT Devices no FIWARE (IoT Agent :4041 e STH-Comet :8666).
"""

import dash_bootstrap_components as dbc
from dash import html
from src.config.settings import (
    DEFAULT_API_KEY,
    DEFAULT_DEVICE_ID,
    DEFAULT_ENTITY_ID,
    DEFAULT_ENTITY_TYPE,
    DEFAULT_FIWARE_HOST,
    DEFAULT_LAST_N,
    DEFAULT_WOKWI_BROKER,
    WOKWI_PROJECT_URL,
)
from src.ui.components.wokwi_hub_panel import SCENARIO_PRESETS


def _input_col(
    label: object, comp_id: str, val: object, md: int = 3, inp_type: str = "text", step: float = 1.0
) -> dbc.Col:
    """Auxiliar reutilizável para colunas de input limpas e alinhadas."""
    return dbc.Col(
        [
            dbc.Label(label, className="small text-muted mb-1 d-flex align-items-center"),
            dbc.Input(id=comp_id, type=inp_type, value=val, step=step, size="sm"),
        ],
        md=md,
    )


def render_device_management() -> html.Div:
    """Renderiza os dois painéis inferiores: Operação em Tempo Real e Gestão de Devices FIWARE."""
    scenario_options = [
        {
            "label": html.Span(
                [
                    html.Img(src=str(meta["icon"]), className="custom-icon-sm") if meta.get("icon") else None,
                    html.Span(str(meta["label"])),
                ],
                className="d-inline-flex align-items-center",
            ),
            "value": key,
        }
        for key, meta in SCENARIO_PRESETS.items()
    ]

    return html.Div(
        [
            dbc.Row(
                [
                    dbc.Col(
                        dbc.Card(
                            dbc.CardBody(
                                [
                                    html.Div(
                                        [
                                            html.Span("4. Operação em Tempo Real & Cenários Wokwi (MQTT :1883)"),
                                            html.A(
                                                "🔗 Wokwi #478106752109243393",
                                                href=WOKWI_PROJECT_URL,
                                                target="_blank",
                                                className="text-info text-decoration-none small ms-2",
                                            ),
                                        ],
                                        className="section-title d-flex justify-content-between align-items-center",
                                    ),
                                    dbc.RadioItems(
                                        id="radio-wokwi-scenario",
                                        options=scenario_options,
                                        value="wokwi_live",
                                        className="small text-dark mb-3",
                                    ),
                                    dbc.Row(
                                        [
                                            _input_col([html.Img(src="/assets/icons/temperature.png", className="custom-icon-sm"), "Temp. Base (°C)"], "sim-temp-input", 15.5, md=3, inp_type="number", step=0.5),
                                            _input_col([html.Img(src="/assets/icons/humidity.png", className="custom-icon-sm"), "Umid. Base (%)"], "sim-hum-input", 68.0, md=3, inp_type="number", step=1.0),
                                            _input_col([html.Img(src="/assets/icons/luminosity.png", className="custom-icon-sm"), "Lum. Base (%)"], "sim-lum-input", 12.0, md=3, inp_type="number", step=1.0),
                                            dbc.Col(
                                                [
                                                    dbc.Label("Sincronizar", className="small text-muted mb-1 d-block"),
                                                    dbc.Button("📤 Enviar ao Wokwi", id="btn-publish-mqtt-test", color="warning", size="sm", className="w-100 fw-semibold", n_clicks=0),
                                                ],
                                                md=3,
                                            ),
                                        ],
                                        className="mb-3",
                                    ),
                                    dbc.Row(
                                        [
                                            _input_col("Broker MQTT (Wokwi)", "input-wokwi-broker", DEFAULT_WOKWI_BROKER, md=5),
                                            _input_col("Amostras Gráfico", "input-last-n", DEFAULT_LAST_N, md=3, inp_type="number", step=5),
                                            dbc.Col(
                                                [
                                                    dbc.Label("Fonte dos Dados", className="small text-muted mb-1"),
                                                    dbc.Select(
                                                        id="switch-interactive-mode",
                                                        options=[
                                                            {"label": "⚡ Automático + Wokwi MQTT", "value": "wokwi"},
                                                            {"label": "🏛️ STH-Comet (:8666)", "value": "sth"},
                                                        ],
                                                        value="wokwi",
                                                        size="sm",
                                                    ),
                                                ],
                                                md=4,
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            className="clean-card h-100 shadow-sm",
                        ),
                        md=6,
                    ),
                    dbc.Col(
                        dbc.Card(
                            dbc.CardBody(
                                [
                                    html.Div("5. Cadastro e Gerenciamento de IoT Devices (FIWARE :4041 / :8666)", className="section-title"),
                                    dbc.Row(
                                        [
                                            _input_col("Host / IP FIWARE", "input-fiware-host", DEFAULT_FIWARE_HOST, md=4),
                                            _input_col("Device ID (ESP32)", "reg-device-id", DEFAULT_DEVICE_ID, md=4),
                                            _input_col("API Key", "reg-api-key", DEFAULT_API_KEY, md=4),
                                        ],
                                        className="mb-2",
                                    ),
                                    dbc.Row(
                                        [
                                            _input_col("Entity Name (Orion / STH)", "reg-entity-name", DEFAULT_ENTITY_ID, md=6),
                                            _input_col("Entity Type", "reg-entity-type", DEFAULT_ENTITY_TYPE, md=3),
                                            dbc.Col(
                                                [
                                                    dbc.Input(id="input-entity-id", value=DEFAULT_ENTITY_ID, style={"display": "none"}),
                                                    dbc.Input(id="input-entity-type", value=DEFAULT_ENTITY_TYPE, style={"display": "none"}),
                                                ],
                                                md=3,
                                            ),
                                        ],
                                        className="mb-3",
                                    ),
                                    html.Div(
                                        [
                                            dbc.Button("➕ Cadastrar Device + STH-Comet", id="btn-register-device", color="success", size="sm", className="me-2", n_clicks=0),
                                            dbc.Button("🔄 Atualizar Lista", id="btn-refresh-devices", color="info", outline=True, size="sm", className="me-2", n_clicks=0),
                                            dbc.Button("🗑️ Remover Device", id="btn-delete-device", color="danger", outline=True, size="sm", n_clicks=0),
                                        ],
                                        className="mb-2",
                                    ),
                                    html.Div(id="device-feedback-banner", className="mt-2"),
                                    html.Div(id="device-table-container", className="mt-2 small"),
                                ]
                            ),
                            className="clean-card h-100 shadow-sm",
                        ),
                        md=6,
                    ),
                ],
                className="mb-3",
            )
        ]
    )
