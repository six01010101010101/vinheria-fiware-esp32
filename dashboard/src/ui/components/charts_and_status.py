"""
Componente de UI: Painel de Status dos Atuadores Remotos e Gráficos SCADA/Telemetry Plotly
Otimizados em Tempo Real (1s) com Faixa Ideal Sombreada, Destaque de Anomalias,
Estatísticas Ao Vivo (Atual / Média / Mín-Máx), Linha de Média e Crosshair Unificado.
"""

from typing import List
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
from dash import dcc, html
from src.config.settings import REALTIME_INTERVAL_MS
from src.models.iot_models import TimeSeriesPoint


def _graph_col(graph_id: str, icon_src: str, header_title: str, accent_cls: str) -> dbc.Col:
    """Envolve cada gráfico Plotly em um subpainel estilo SCADA com cabeçalho e borda dedicada."""
    return dbc.Col(
        html.Div(
            [
                html.Div(
                    [
                        html.Img(src=icon_src, className="custom-icon-sm"),
                        html.Span(header_title, className=f"small fw-bold {accent_cls}"),
                    ],
                    className="d-flex align-items-center px-2 pt-2 pb-1 border-bottom border-secondary border-opacity-25",
                ),
                dcc.Graph(
                    id=graph_id,
                    config={"displayModeBar": False, "responsive": True},
                    style={"height": "295px"},
                ),
            ],
            className="chart-panel-box h-100",
        ),
        lg=4,
        md=12,
        className="mb-2 mb-lg-0",
    )


def render_charts_and_status() -> html.Div:
    """Renderiza o painel de alertas remotos (3 LEDs + Buzzer), KPIs e os 3 gráficos dinâmicos."""
    return html.Div(
        [
            html.Div(id="remote-alert-status-banner", className="mb-3"),
            html.Div(id="realtime-kpi-cards", className="mb-3"),
            dbc.Card(
                dbc.CardBody(
                    [
                        html.Div(
                            [
                                html.Span("3. Gráficos Analíticos em Tempo Real (Curva Ao Vivo • Faixa Ideal • Detecção de Anomalias)"),
                                html.Small(
                                    "🟢 Zona Verde = Faixa Ideal do Vinho | ◆ Diamante Vermelho = Leitura Fora do Trigger | — Linha Tracejada = Média",
                                    className="text-muted fw-normal d-none d-xl-inline",
                                    style={"fontSize": "0.72rem", "textTransform": "none"},
                                ),
                            ],
                            className="section-title d-flex justify-content-between align-items-center",
                        ),
                        dbc.Row(
                            [
                                _graph_col("graph-temperature", "/assets/icons/temperature.png", "TEMPERATURA (°C)", "text-danger"),
                                _graph_col("graph-humidity", "/assets/icons/humidity.png", "UMIDADE RELATIVA (%)", "text-info"),
                                _graph_col("graph-luminosity", "/assets/icons/luminosity.png", "LUMINOSIDADE (LDR / SOLAR %)", "text-warning"),
                            ],
                            className="g-2",
                        ),
                    ],
                    className="py-2 px-3",
                ),
                className="clean-card mb-3 shadow-sm",
            ),
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
    """Constrói um gráfico analítico Plotly de alta precisão com marcadores de anomalia e estatísticas."""
    low_bound = -40.0 if unit == "°C" else 0.0
    high_bound = 80.0 if unit == "°C" else 100.0
    clean_pts = [p for p in points if low_bound <= p.value <= high_bound]
    timestamps = [p.timestamp for p in clean_pts]
    values = [p.value for p in clean_pts]

    ref_vals = values + [min_trigger, max_trigger]
    pad = 3.2 if unit == "°C" else 8.5
    y_min = max(low_bound, min(ref_vals) - pad)
    y_max = min(high_bound, max(ref_vals) + pad)

    fill_map = {
        "#ff7875": "rgba(255, 120, 117, 0.15)",
        "#40a9ff": "rgba(64, 169, 255, 0.15)",
        "#ffd666": "rgba(255, 214, 102, 0.15)",
    }

    fig = go.Figure()

    # 1. Faixa Verde Sombreada da Zona de Conservação Ideal (entre Mín e Máx)
    fig.add_hrect(
        y0=min_trigger,
        y1=max_trigger,
        fillcolor="rgba(34, 197, 94, 0.10)",
        line_width=1,
        line_color="rgba(34, 197, 94, 0.22)",
        annotation_text="ZONA IDEAL",
        annotation_position="top left",
        annotation_font={"size": 9, "color": "rgba(134, 239, 172, 0.75)"},
    )

    if values:
        avg_val = sum(values) / len(values)
        min_v, max_v, cur_v = min(values), max(values), values[-1]
        is_cur_out = cur_v < min_trigger or cur_v > max_trigger
        cur_color = "#ff4d4f" if is_cur_out else "#22c55e"
        subtitle_html = (
            f"<span style='font-size:11px;color:#9bb0c9'>"
            f"Atual: <b style='color:{cur_color}'>{cur_v:.1f}{unit}</b>  •  "
            f"Média: <b>{avg_val:.1f}{unit}</b>  •  "
            f"Faixa: {min_v:.1f}–{max_v:.1f}{unit}</span>"
        )
        m_colors = ["#ff4d4f" if (v < min_trigger or v > max_trigger) else line_color for v in values]
        m_sizes = [9 if (v < min_trigger or v > max_trigger) else 6 for v in values]
        m_symbols = ["diamond" if (v < min_trigger or v > max_trigger) else "circle" for v in values]
        m_sizes[-1] = 11
    else:
        avg_val = (min_trigger + max_trigger) / 2.0
        subtitle_html = f"<span style='font-size:11px;color:#9bb0c9'>Aguardando amostras ({unit})...</span>"
        m_colors, m_sizes, m_symbols = line_color, 6, "circle"

    # 2. Curva Principal Suavizada + Marcadores Inteligentes (Diamante Vermelho em Anomalia)
    fig.add_trace(
        go.Scatter(
            x=timestamps,
            y=values,
            mode="lines+markers",
            name=title,
            fill="tozeroy",
            fillcolor=fill_map.get(line_color, "rgba(255,255,255,0.10)"),
            line={"color": line_color, "width": 2.8, "shape": "spline", "smoothing": 0.55},
            marker={
                "size": m_sizes,
                "color": m_colors,
                "symbol": m_symbols,
                "line": {"width": 1.5, "color": "#0d1219"},
            },
            hovertemplate=(
                f"<b>{title}</b><br>Horário: %{{x}}<br>"
                f"Leitura: <b>%{{y:.1f}}{unit}</b><br>"
                f"Trigger: {min_trigger:.1f} a {max_trigger:.1f}{unit}<extra></extra>"
            ),
        )
    )

    if timestamps:
        # 3. Linhas de Limite Superior (Máx), Limite Inferior (Mín) e Média da Série
        fig.add_hline(
            y=max_trigger, line_dash="dash", line_color="#ff4d4f", line_width=1.4,
            annotation_text=f"Máx {max_trigger:.1f}{unit}", annotation_position="top right",
            annotation_font={"size": 10, "color": "#ff7875"},
        )
        fig.add_hline(
            y=min_trigger, line_dash="dot", line_color="#38bdf8", line_width=1.4,
            annotation_text=f"Mín {min_trigger:.1f}{unit}", annotation_position="bottom right",
            annotation_font={"size": 10, "color": "#7dd3fc"},
        )
        fig.add_hline(
            y=avg_val, line_dash="dashdot", line_color="rgba(255,255,255,0.22)", line_width=1.0,
        )

    fig.update_layout(
        title={"text": subtitle_html, "x": 0.02, "y": 0.96, "xanchor": "left"},
        uirevision=f"{title}_{min_trigger}_{max_trigger}",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(11,16,23,0.90)",
        font={"color": "#9bb0c9", "size": 10.5},
        margin={"l": 40, "r": 14, "t": 30, "b": 30},
        hovermode="x unified",
        hoverlabel={"bgcolor": "#161f2c", "bordercolor": "#38bdf8", "font": {"color": "#e6edf3", "size": 11}},
        xaxis={
            "gridcolor": "rgba(255,255,255,0.05)",
            "nticks": 6,
            "showspikes": True,
            "spikemode": "across",
            "spikecolor": "rgba(255,255,255,0.20)",
            "spikethickness": 1,
        },
        yaxis={
            "title": unit,
            "gridcolor": "rgba(255,255,255,0.06)",
            "zeroline": False,
            "range": [y_min, y_max],
        },
        showlegend=False,
    )
    return fig
