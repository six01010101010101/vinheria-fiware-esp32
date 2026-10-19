"""
Painel Integrado Compacto (Grid Perfeito):
- Coluna 1 (lg=3): Miniaturas pequenas da Tampa (Tampa_Display_LCD16x2.STL) e do Barril (Corpo_Barril.STL)
- Coluna 2 (lg=5): Telinha Verde Retangular na proporção do buraco retangular da tampa (66x26mm), só com a escrita
- Coluna 3 (lg=4): Status ao vivo dos 3 LEDs (Verde GPIO 5, Vermelho GPIO 18, Azul GPIO 2) + Buzzer + Saúde da Adega
"""

from typing import Optional
import dash_bootstrap_components as dbc
from dash import html
from src.models.iot_models import AnomalyEvaluation, SensorSnapshot, TriggerConfig


def _sensor_short_status(val: Optional[float], min_lim: float, max_lim: float) -> str:
    """Retorna texto curto de status para a escrita da telinha verde."""
    if val is None:
        return "AGUARD."
    if val < min_lim:
        return "BAIXO! "
    if val > max_lim:
        return "ALTO!  "
    return "OK     "


def build_green_hardware_plaque(
    snapshot: SensorSnapshot,
    triggers: TriggerConfig,
    evaluation: AnomalyEvaluation,
    dispatch_msg: str,
    source_label: str,
) -> dbc.Card:
    """Renderiza o painel compacto com protótipos pequenos, telinha verde no formato do recorte e 3 LEDs."""
    t_st = _sensor_short_status(snapshot.temperature, triggers.temp_min, triggers.temp_max)
    h_st = _sensor_short_status(snapshot.humidity, triggers.hum_min, triggers.hum_max)
    l_st = _sensor_short_status(snapshot.luminosity, triggers.lum_min, triggers.lum_max)

    t_v = f"{snapshot.temperature:4.1f}C" if snapshot.temperature is not None else "--.-C"
    h_v = f"{snapshot.humidity:4.1f}%" if snapshot.humidity is not None else "--.-%"
    l_v = f"{snapshot.luminosity:4.1f}%" if snapshot.luminosity is not None else "--.-%"

    # Escrita compacta dentro da miniatura da tampa (112px)
    mini_row1 = f"T:{t_v} U:{snapshot.humidity or 0:2.0f}%"
    mini_row2 = "STATUS: OK" if not evaluation.is_anomalous else f"ALERTA:{evaluation.command_code.upper()}"

    # Escrita pura dentro da Telinha Verde Retangular (proporção do buraco retangular 66x26mm da tampa)
    led_line = (
        "LED_VERDE:OFF | LED_VERM:ON  | LED_AZUL:PISCANDO"
        if evaluation.is_anomalous
        else "LED_VERDE:ON  | LED_VERM:OFF | LED_AZUL:OFF     "
    )
    state_line = (
        f"ESTADO: ALERTA ATIVO (CMD: alert|{evaluation.command_code}) [{snapshot.timestamp}]"
        if evaluation.is_anomalous
        else f"ESTADO: OPERACAO NORMAL - ADEGA 100% OK [{snapshot.timestamp}]"
    )

    screen_lines = [
        f"TEMP (DHT) : {t_v} ({triggers.temp_min:.0f}-{triggers.temp_max:.0f}C) [{t_st}] | UMID: {h_v} [{h_st}]",
        f"LUMI (LDR) : {l_v} ({triggers.lum_min:.0f}-{triggers.lum_max:.0f}%) [{l_st}] | SAUDE ADEGA: {evaluation.cellar_health_score}%",
        "--------------------------------------------------------",
        led_line,
        state_line,
    ]

    led_green_cls = "led-indicator led-green-off" if evaluation.is_anomalous else "led-indicator led-green-on"
    led_red_cls = "led-indicator led-red-on" if evaluation.is_anomalous else "led-indicator led-red-off"
    led_blue_cls = "led-indicator led-blue-blinking" if evaluation.is_anomalous else "led-indicator led-blue-off"
    border_cls = "border-danger" if evaluation.is_anomalous else "border-success"

    return dbc.Card(
        dbc.CardBody(
            [
                html.Div(
                    "2. Protótipo 3D • Telinha Verde (66×26mm) • Diagnóstico 100% ao Vivo (LEDs & Buzzer)",
                    className="section-title",
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
                                            html.Span([html.Span(className=led_red_cls), html.Strong("Vermelho (GPIO 18)", className="small text-dark me-2")]),
                                            html.Span([html.Span(className=led_blue_cls), html.Strong("Azul (GPIO 2)", className="small text-info")]),
                                        ],
                                        className="d-flex flex-wrap align-items-center gap-1 mb-2",
                                    ),
                                    html.Div(
                                        f"🔊 {evaluation.buzzer_pattern_text}",
                                        className="small fw-semibold text-warning mb-1",
                                    ),
                                    html.Div(
                                        [
                                            dbc.Badge("⚡ DIAGNÓSTICO 100% AO VIVO", color="danger" if evaluation.is_anomalous else "success", className="me-2 py-1 px-2"),
                                            dbc.Badge(f"Saúde: {evaluation.cellar_health_score}%", color="success" if not evaluation.is_anomalous else "danger"),
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
