"""
Componente Visual da Plaquinha Verde (PCB + Display LCD 20x4 I2C da Caixa Física & Wokwi).
Espelha em tempo real os status de Temperatura, Umidade, Luminosidade, LED Verde (GPIO 5),
LED Vermelho (GPIO 18), LED Azul Remoto (GPIO 2), Buzzer (GPIO 4) e Saúde da Adega.
"""

from typing import Optional
import dash_bootstrap_components as dbc
from dash import html
from src.models.iot_models import AnomalyEvaluation, SensorSnapshot, TriggerConfig


def _sensor_state(val: Optional[float], min_lim: float, max_lim: float) -> tuple[bool, str]:
    """Retorna (is_alert, label_curto) para exibição no LCD e nos chips da placa verde."""
    if val is None:
        return False, "AGUARDANDO"
    if val < min_lim:
        return True, "ABAIXO MIN!"
    if val > max_lim:
        return True, "ACIMA MAX!"
    return False, "NORMAL [OK]"


def _build_pcb_sensor_chip(
    icon_src: str, title: str, pin_label: str, val: Optional[float], unit: str, min_lim: float, max_lim: float, val_color: str
) -> dbc.Col:
    """Constrói um módulo de sensor montado sobre a Plaquinha Verde (PCB)."""
    is_alert, state_txt = _sensor_state(val, min_lim, max_lim)
    val_str = f"{val:.1f} {unit}" if val is not None else f"-- {unit}"
    chip_cls = "pcb-sensor-chip pcb-sensor-chip-alert" if is_alert else "pcb-sensor-chip"
    badge_color = "danger" if is_alert else "success"

    return dbc.Col(
        html.Div(
            [
                html.Div(
                    [
                        html.Span(
                            [html.Img(src=icon_src, className="custom-icon"), html.Span(title)],
                            className="small fw-bold text-light d-flex align-items-center",
                        ),
                        dbc.Badge(state_txt, color=badge_color, className="px-2 py-1"),
                    ],
                    className="d-flex justify-content-between align-items-center mb-1",
                ),
                html.Div(val_str, className=f"kpi-value {val_color} my-1"),
                html.Div(
                    [
                        html.Small(f"Trigger: {min_lim:.1f} a {max_lim:.1f}{unit}", className="text-light opacity-75"),
                        html.Small(pin_label, className="text-warning fw-semibold font-monospace"),
                    ],
                    className="d-flex justify-content-between align-items-center mt-1",
                ),
            ],
            className=chip_cls,
        ),
        md=4,
        className="mb-2 mb-md-0",
    )


def build_green_hardware_plaque(
    snapshot: SensorSnapshot,
    triggers: TriggerConfig,
    evaluation: AnomalyEvaluation,
    dispatch_msg: str,
    source_label: str,
) -> html.Div:
    """Renderiza a Plaquinha Verde completa (PCB + Display LCD Verde + Sensores + 3 LEDs ao vivo)."""
    t_alert, t_txt = _sensor_state(snapshot.temperature, triggers.temp_min, triggers.temp_max)
    h_alert, h_txt = _sensor_state(snapshot.humidity, triggers.hum_min, triggers.hum_max)
    l_alert, l_txt = _sensor_state(snapshot.luminosity, triggers.lum_min, triggers.lum_max)

    t_str = f"{snapshot.temperature:5.1f} C" if snapshot.temperature is not None else " --.- C"
    h_str = f"{snapshot.humidity:5.1f} %" if snapshot.humidity is not None else " --.- %"
    l_str = f"{snapshot.luminosity:5.1f} %" if snapshot.luminosity is not None else " --.- %"

    led_green_cls = "led-indicator led-green-off" if evaluation.is_anomalous else "led-indicator led-green-on"
    led_red_cls = "led-indicator led-red-on" if evaluation.is_anomalous else "led-indicator led-red-off"
    led_blue_cls = "led-indicator led-blue-blinking" if evaluation.is_anomalous else "led-indicator led-blue-off"

    green_txt = "LED Verde (GPIO 5): OFF" if evaluation.is_anomalous else "LED Verde (GPIO 5): ACESO [OK]"
    red_txt = "LED Vermelho (GPIO 18): ACESO [ALERTA]" if evaluation.is_anomalous else "LED Vermelho (GPIO 18): OFF"
    blue_txt = "LED Azul (GPIO 2): PISCANDO REMOTO" if evaluation.is_anomalous else "LED Azul (GPIO 2): OFF"
    leds_lcd = "VERDE:OFF | VERM:ON | AZUL:PISCA" if evaluation.is_anomalous else "VERDE:ON (OK) | VERM:OFF | AZUL:OFF"
    board_cls = "green-hardware-plaque green-plaque-alert mb-3" if evaluation.is_anomalous else "green-hardware-plaque mb-3"

    return html.Div(
        [
            html.Div(
                [
                    html.Span(
                        [
                            html.Span(className="pcb-screw"),
                            html.Img(src="/assets/icons/wine.png", className="custom-icon-sm"),
                            html.Strong("PLAQUINHA VERDE — PROTÓTIPO FÍSICO DA CAIXA & WOKWI AO VIVO (PCB REV 5.0)"),
                        ],
                        className="d-flex align-items-center",
                    ),
                    html.Span(
                        [
                            "ESP32 • DHT(15) • LDR(34) • LED_VERDE(5) • LED_VERM(18) • LED_AZUL(2) • BUZZER(4)",
                            html.Span(className="pcb-screw ms-2"),
                        ]
                    ),
                ],
                className="pcb-header-bar",
            ),
            dbc.Row(
                [
                    dbc.Col(
                        html.Div(
                            [
                                html.Div(
                                    [html.Span("LCD 20x4 I2C • VINHERIA"), html.Span(f"SAUDE: {evaluation.cellar_health_score}% [{snapshot.timestamp}]")],
                                    className="lcd-row-line",
                                ),
                                html.Div([html.Span(f"TEMP: {t_str} ({triggers.temp_min:.0f}-{triggers.temp_max:.0f}C)"), html.Span(f"[{t_txt}]")], className="lcd-row-line"),
                                html.Div([html.Span(f"UMID: {h_str} ({triggers.hum_min:.0f}-{triggers.hum_max:.0f}%)"), html.Span(f"[{h_txt}]")], className="lcd-row-line"),
                                html.Div([html.Span(f"LUMI: {l_str} ({triggers.lum_min:.0f}-{triggers.lum_max:.0f}%)"), html.Span(f"[{l_txt}]")], className="lcd-row-line"),
                                html.Div([html.Span(leds_lcd), html.Span(f"CMD:{evaluation.command_code}")], className="d-flex justify-content-between pt-1"),
                            ],
                            className="lcd-screen-green h-100",
                        ),
                        lg=5,
                        className="mb-3 mb-lg-0",
                    ),
                    dbc.Col(
                        dbc.Row(
                            [
                                _build_pcb_sensor_chip("/assets/icons/temperature.png", "TEMPERATURA", "GPIO 15 (DHT)", snapshot.temperature, "°C", triggers.temp_min, triggers.temp_max, "text-danger" if t_alert else "text-white"),
                                _build_pcb_sensor_chip("/assets/icons/humidity.png", "UMIDADE", "GPIO 15 (DHT)", snapshot.humidity, "%", triggers.hum_min, triggers.hum_max, "text-warning" if h_alert else "text-info"),
                                _build_pcb_sensor_chip("/assets/icons/luminosity.png", "LUMINOSIDADE", "GPIO 34 (LDR)", snapshot.luminosity, "%", triggers.lum_min, triggers.lum_max, "text-danger" if l_alert else "text-warning"),
                            ]
                        ),
                        lg=7,
                    ),
                ],
                align="stretch",
            ),
            html.Div(
                [
                    html.Div(
                        [
                            html.Span([html.Span(className=led_green_cls), html.Strong(green_txt, className="text-light me-3 small")]),
                            html.Span([html.Span(className=led_red_cls), html.Strong(red_txt, className="text-light me-3 small")]),
                            html.Span([html.Span(className=led_blue_cls), html.Strong(blue_txt, className="text-info me-3 small")]),
                            html.Span(f"🔊 {evaluation.buzzer_pattern_text}", className="text-warning fw-semibold me-3 small"),
                            dbc.Badge(f"alert|{evaluation.command_code}", color=evaluation.badge_color, className="me-2"),
                            dbc.Badge(source_label, color="dark", className="border border-success"),
                        ],
                        className="d-flex align-items-center flex-wrap gap-1",
                    ),
                    html.Small(
                        f"Status na Caixa / Wokwi: {' • '.join(evaluation.details_messages)} ({dispatch_msg})",
                        className="text-light opacity-75 d-block mt-1",
                    ),
                ],
                className="mt-3 pt-2",
                style={"borderTop": "1px dashed rgba(126, 231, 135, 0.35)"},
            ),
        ],
        className=board_cls,
    )
