"""
Painel Integrado Compacto (Grid Perfeito):
- Coluna 1 (lg=3): Miniaturas pequenas da Tampa (Tampa_Display_LCD16x2.STL) e do Barril (Corpo_Barril.STL)
- Coluna 2 (lg=5): Telinha Verde Retangular na proporção do buraco retangular da tampa (66x26mm), só com a escrita
- Coluna 3 (lg=4): Status ao vivo dos 3 LEDs (Verde GPIO 5, Vermelho GPIO 18, Azul GPIO 2) + Buzzer + Saúde da Adega
"""

from typing import Optional, Tuple
import dash_bootstrap_components as dbc
from dash import html
from src.models.iot_models import AnomalyEvaluation, SensorSnapshot, TriggerConfig


def _metric_cols(val: Optional[float], unit: str, low: float, high: float) -> Tuple[str, str, str]:
    """Retorna leitura formatada, faixa alvo e status enológico limpo."""
    if val is None:
        return "--.-", f"{low:.1f} a {high:.1f} {unit}", "Aguard."
    st = "Baixo" if val < low else ("Alto" if val > high else "Ideal")
    return f"{val:4.1f} {unit}", f"{low:.1f} - {high:.1f} {unit}", st


def build_green_hardware_plaque(
    snapshot: SensorSnapshot,
    triggers: TriggerConfig,
    evaluation: AnomalyEvaluation,
    dispatch_msg: str,
    source_label: str,
) -> dbc.Card:
    """Renderiza o painel compacto com protótipos pequenos, telinha verde no formato do recorte e 3 LEDs."""
    t_v, t_rng, t_st = _metric_cols(snapshot.temperature, "°C", triggers.temp_min, triggers.temp_max)
    h_v, h_rng, h_st = _metric_cols(snapshot.humidity, "%", triggers.hum_min, triggers.hum_max)
    l_v, l_rng, l_st = _metric_cols(snapshot.luminosity, "%", triggers.lum_min, triggers.lum_max)

    # Escrita compacta dentro da miniatura da tampa (112px)
    mini_row1 = f"T:{snapshot.temperature or 0:4.1f}C U:{snapshot.humidity or 0:2.0f}%"
    mini_row2 = f"S:{evaluation.cellar_health_score}% {evaluation.verdict_code}"

    # Escrita clean dentro da Telinha Verde Retangular (66x26mm)
    v_clean = evaluation.verdict.split("—")[0].strip().title()
    ts = snapshot.timestamp or "--:--:--"

    screen_lines = [
        f"  VINHERIA AGNELLO · CAVA DO SOMMELIER         {ts}  ",
        "  ──────────────────────────────────────────────────────",
        f"  TEMPERATURA     {t_v:<9}    FAIXA: {t_rng:<12}  [{t_st}]",
        f"  UMIDADE         {h_v:<9}    FAIXA: {h_rng:<12}  [{h_st}]",
        f"  LUMINOSIDADE    {l_v:<9}    FAIXA: {l_rng:<12}  [{t_st}]",
        "  ──────────────────────────────────────────────────────",
        f"  ESTADO: {v_clean.upper():<14}      APOGEU ENOLÓGICO: {evaluation.cellar_health_score:>3}%",
    ]

    led_green_cls = "led-indicator led-green-off" if evaluation.is_anomalous else "led-indicator led-green-on"
    led_yellow_cls = "led-indicator led-yellow-blinking" if (evaluation.is_anomalous and evaluation.command_code != "multi") else "led-indicator led-yellow-off"
    led_red_cls = "led-indicator led-red-blinking" if evaluation.command_code == "multi" else "led-indicator led-red-off"
    border_cls = "border-danger" if evaluation.is_anomalous else "border-success"

    return dbc.Card(
        dbc.CardBody(
            [
                html.Div(
                    [
                        html.Span("MONITORAMENTO DA CAVA & PROTÓTIPO DO BARRIL"),
                        html.Small(
                            "Painel LCD 16x2 simulado, atuadores sensoriais de alarme e barrica inteligente.",
                            className="text-muted fw-normal d-block mt-1",
                            style={"fontSize": "0.78rem", "textTransform": "none"},
                        ),
                    ],
                    className="section-title mb-3 pb-2 border-bottom",
                ),
                dbc.Row(
                    [
                        # Coluna 1 (Compacta): Miniaturas da Tampa e do Barril lado a lado
                        dbc.Col(
                            html.Div(
                                [
                                    html.Div(
                                        [
                                            html.Div(
                                                [
                                                    html.Img(
                                                        src="/assets/icons/tampa_barril_lcd.png",
                                                        className="barrel-lid-mini-img",
                                                    ),
                                                    html.Div(
                                                        [
                                                            html.Div(mini_row1, className="barrel-lcd-mini-text"),
                                                            html.Div(mini_row2, className="barrel-lcd-mini-text"),
                                                        ],
                                                        className="barrel-lcd-mini-slot",
                                                    ),
                                                ],
                                                className="barrel-lid-mini",
                                            ),
                                            html.Img(
                                                src="/assets/icons/corpo_barril_3d.png",
                                                className="barrel-3d-mini-img",
                                            ),
                                        ],
                                        className="d-flex align-items-center justify-content-center gap-3",
                                    ),
                                    html.Div(
                                        "Tampa_Display_LCD16x2.STL & Corpo_Barril.STL",
                                        className="text-center text-muted mt-1",
                                        style={"fontSize": "0.72rem"},
                                    ),
                                ],
                                className="proto-thumb-box h-100 d-flex flex-column justify-content-center",
                            ),
                            lg=3,
                            md=12,
                            className="mb-2 mb-lg-0",
                        ),
                        # Coluna 2 (Central): Telinha Verde Retangular na medida/proporção do buraco da tampa (só escrita)
                        dbc.Col(
                            [
                                html.Div(
                                    html.Pre("\n".join(screen_lines), className="green-crt-text"),
                                    className="green-lcd-cutout-screen",
                                ),
                                html.Div(
                                    f"Telinha Verde LCD 16x2 (Recorte Retangular 66×26mm da Tampa) • {source_label}",
                                    className="text-center text-muted mt-1",
                                    style={"fontSize": "0.72rem"},
                                ),
                            ],
                            lg=5,
                            md=12,
                            className="mb-2 mb-lg-0",
                        ),
                        # Coluna 3 (Direita): Status ao Vivo dos 3 LEDs + Buzzer + Saúde da Adega
                        dbc.Col(
                            html.Div(
                                [
                                    html.Div(
                                        [
                                            html.Span([html.Span(className=led_green_cls), html.Strong("Verde (GPIO 5)", className="small text-dark me-2")]),
                                            html.Span([html.Span(className=led_yellow_cls), html.Strong("Amarelo (GPIO 2)", className="small text-warning me-2")]),
                                            html.Span([html.Span(className=led_red_cls), html.Strong("Vermelho (GPIO 18)", className="small text-danger")]),
                                        ],
                                        className="d-flex flex-wrap align-items-center gap-1 mb-2",
                                    ),
                                    html.Div(
                                        f"Buzzer: {evaluation.buzzer_pattern_text}",
                                        className="small fw-semibold text-warning mb-1",
                                    ),
                                    html.Div(
                                        [
                                            dbc.Badge("DIAGNÓSTICO AO VIVO", color="danger" if evaluation.is_anomalous else "success", className="me-2 py-1 px-2"),
                                            dbc.Badge(f"Saúde: {evaluation.cellar_health_score}%", color="success" if not evaluation.is_anomalous else "danger", className="me-2"),
                                            dbc.Badge(evaluation.verdict, color=evaluation.badge_color),
                                        ],
                                        className="mb-1",
                                    ),
                                    html.Small(
                                        f"CMD: alert|{evaluation.command_code} • {' • '.join(evaluation.details_messages)}",
                                        className="text-muted d-block",
                                        style={"fontSize": "0.73rem"},
                                    ),
                                ],
                                className="proto-thumb-box h-100 d-flex flex-column justify-content-center",
                            ),
                            lg=4,
                            md=12,
                        ),
                    ],
                    align="stretch",
                ),
            ],
            className="py-2 px-3",
        ),
        className=f"clean-card mb-3 shadow-sm {border_cls}",
    )
