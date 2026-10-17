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
    """Constrói um gráfico dinâmico Plotly com escala protegida e linhas de Trigger."""
    low_bound = -40.0 if unit == "°C" else 0.0
    high_bound = 80.0 if unit == "°C" else 100.0
    clean_pts = [p for p in points if low_bound <= p.value <= high_bound]
    timestamps = [p.timestamp for p in clean_pts]
    values = [p.value for p in clean_pts]

    ref_vals = values + [min_trigger, max_trigger]
    pad = 3.0 if unit == "°C" else 8.0
    y_min = max(low_bound, min(ref_vals) - pad)
    y_max = min(high_bound, max(ref_vals) + pad)

    fig = go.Figure()

    fill_map = {
        "#ff7875": "rgba(255, 120, 117, 0.12)",
        "#40a9ff": "rgba(64, 169, 255, 0.12)",
        "#ffd666": "rgba(255, 214, 102, 0.12)",
    }

    fig.add_hrect(
        y0=min_trigger,
        y1=max_trigger,
        fillcolor="rgba(34, 197, 94, 0.07)",
        line_width=0,
    )

    fig.add_trace(
        go.Scatter(
            x=timestamps,
            y=values,
            mode="lines+markers",
            name=title,
            fill="tozeroy",
            fillcolor=fill_map.get(line_color, "rgba(255,255,255,0.08)"),
            line={"color": line_color, "width": 2.6, "shape": "spline", "smoothing": 0.55},
            marker={"size": 6, "line": {"width": 1, "color": "#0f141c"}},
            hovertemplate=f"%{{x}} → <b>%{{y:.1f}}{unit}</b><extra></extra>",
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
        plot_bgcolor="rgba(13,18,26,0.82)",
        font={"color": "#9bb0c9", "size": 11},
        margin={"l": 42, "r": 16, "t": 38, "b": 32},
        xaxis={"gridcolor": "rgba(255,255,255,0.05)"},
        yaxis={"title": unit, "gridcolor": "rgba(255,255,255,0.05)", "range": [y_min, y_max]},
        showlegend=False,
    )
    return fig

