"""
Componente de UI: Painel de Status dos Atuadores Remotos (LED Azul Piscante + Buzzer)
e Gráficos Dinâmicos Plotly Otimizados em Tempo Real (1s) com faixas de Triggers.
"""

from typing import List
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
from dash import dcc, html
from src.config.settings import REALTIME_INTERVAL_MS
from src.models.iot_models import TimeSeriesPoint


def render_charts_and_status() -> html.Div:
    """Renderiza o painel de alertas remotos (LED Azul + Buzzer), KPIs e os 3 gráficos dinâmicos."""
    return html.Div(
        [
            # Seção 2: Banner de Status Remoto (LED Azul + Buzzer) + 3 KPIs em Tempo Real
            html.Div(id="remote-alert-status-banner", className="mb-3"),
            html.Div(id="realtime-kpi-cards", className="mb-3"),
            # Seção 3: Gráficos Dinâmicos (Temperatura, Umidade e Luminosidade)
            dbc.Card(
                dbc.CardBody(
                    [
                        html.Div(
                            "3. Gráficos Históricos Dinâmicos (API 8666 STH-Comet & Telemetria em Tempo Real)",
                            className="section-title",
                        ),
                        dbc.Row(
                            [
                                dbc.Col(
                                    dcc.Graph(
                                        id="graph-temperature",
                                        config={"displayModeBar": False},
                                        style={"height": "285px"},
                                    ),
                                    md=4,
                                ),
                                dbc.Col(
                                    dcc.Graph(
                                        id="graph-humidity",
                                        config={"displayModeBar": False},
                                        style={"height": "285px"},
                                    ),
                                    md=4,
                                ),
                                dbc.Col(
                                    dcc.Graph(
                                        id="graph-luminosity",
                                        config={"displayModeBar": False},
                                        style={"height": "285px"},
                                    ),
                                    md=4,
                                ),
                            ]
                        ),
                    ]
                ),
                className="clean-card mb-3 shadow-sm",
            ),
            # Intervalo de atualização otimizado em Tempo Real (1000ms = 1 segundo)
            dcc.Interval(id="interval-auto-refresh", interval=REALTIME_INTERVAL_MS, n_intervals=0),
            dcc.Store(
                id="store-local-history",
                data={"temperature": [], "humidity": [], "luminosity": []},
            ),
        ]
    )


def build_sensor_figure(
    title: str,
    unit: str,
    points: List[TimeSeriesPoint],
    min_trigger: float,
    max_trigger: float,
    line_color: str,
) -> go.Figure:
    """Constrói um gráfico dinâmico Plotly limpo com a série histórica e linhas de Trigger."""
    timestamps = [p.timestamp for p in points]
    values = [p.value for p in points]

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=timestamps,
            y=values,
            mode="lines+markers",
            name=title,
            line={"color": line_color, "width": 2.5, "shape": "spline"},
            marker={"size": 6},
        )
    )

    if timestamps:
        fig.add_hline(
            y=max_trigger,
            line_dash="dash",
            line_color="#ff4d4f",
            annotation_text=f"Máx ({max_trigger}{unit})",
            annotation_position="top right",
        )
        fig.add_hline(
            y=min_trigger,
            line_dash="dot",
            line_color="#40a9ff",
            annotation_text=f"Mín ({min_trigger}{unit})",
            annotation_position="bottom right",
        )

    fig.update_layout(
        title={"text": f"{title} ({unit})", "font": {"size": 14, "color": "#e6edf3"}},
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(16,22,31,0.7)",
        font={"color": "#9bb0c9", "size": 11},
        margin={"l": 38, "r": 16, "t": 38, "b": 32},
        xaxis={"gridcolor": "rgba(255,255,255,0.06)"},
        yaxis={"title": unit, "gridcolor": "rgba(255,255,255,0.06)"},
        uirevision="constant",
        showlegend=False,
    )
    return fig
