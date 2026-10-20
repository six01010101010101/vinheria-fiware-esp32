"""
Construtor de cartões visuais limpos e profissionais:
- Banner de Status Wokwi / FIWARE para Navbar
- Banner de Alerta dos Atuadores (LEDs e Buzzer)
- Cartões KPI Instantâneos (Temperatura, Umidade e Luminosidade)
- Tabela de Dispositivos FIWARE IoT Agent.
"""

from typing import Dict, List, Optional
import dash_bootstrap_components as dbc
from dash import html
from src.config.settings import WOKWI_PROJECT_URL
from src.models.iot_models import AnomalyEvaluation, RegisteredDeviceInfo, SensorSnapshot, TriggerConfig


def build_wokwi_status_bar(meta: Dict[str, object]) -> html.Div:
    """Status consolidado do Wokwi e links essenciais em formato minimalista e limpo."""
    connected = bool(meta.get("connected", False))
    is_live = bool(meta.get("live", False))
    last_time = str(meta.get("last_packet_time", "--:--:--"))

    if is_live:
        dot_cls = "status-dot status-dot-live"
        status_txt = f"Wokwi Ao Vivo ({last_time})"
        pill_cls = "status-pill status-pill-live text-decoration-none"
    elif connected:
        dot_cls = "status-dot status-dot-ready"
        status_txt = "MQTT Conectado"
        pill_cls = "status-pill status-pill-ready text-decoration-none"
    else:
        dot_cls = "status-dot status-dot-idle"
        status_txt = "Wokwi Aguardando..."
        pill_cls = "status-pill status-pill-idle text-decoration-none"

    return html.Div(
        [
            html.A(
                [html.Span(className=dot_cls), html.Span(status_txt)],
                href=WOKWI_PROJECT_URL,
                target="_blank",
                className=pill_cls,
                title="Simulador Wokwi ESP32 (#478106752109243393)",
            ),
            html.A("API", href="/api/v1/status", target="_blank", className="nav-ghost-link ms-2"),
            html.A("GitHub", href="https://github.com/six01010101010101/checkpoint5-vinheria-fiware-esp32", target="_blank", className="nav-ghost-link ms-2"),
        ],
        className="d-flex align-items-center",
    )


def build_remote_alert_banner(
    evaluation: AnomalyEvaluation, _dispatch_ok: bool, dispatch_msg: str, source_label: str
) -> dbc.Card:
    """Exibe de forma limpa e direta o estado dos 3 LEDs (Verde, Vermelho e Azul) e do Buzzer no ESP32."""
    led_green_cls = "led-indicator led-green-off" if evaluation.is_anomalous else "led-indicator led-green-on"
    led_red_cls = "led-indicator led-red-on" if evaluation.is_anomalous else "led-indicator led-red-off"
    led_blue_cls = "led-indicator led-blue-blinking" if evaluation.is_anomalous else "led-indicator led-blue-off"
    border_cls = "border-danger" if evaluation.is_anomalous else "border-success"

    return dbc.Card(
        dbc.CardBody(
            dbc.Row(
                [
                    dbc.Col(
                        [
                            html.Div("CENTRAL DE ALERTA & CLIMATIZAÇÃO DA CAVA (ESP32)", className="section-title"),
                            html.Div(
                                [
                                    html.Span([html.Span(className=led_green_cls), html.Strong("Verde (GPIO 5): Normal OK" if not evaluation.is_anomalous else "Verde (GPIO 5): OFF", className="text-dark me-3")]),
                                    html.Span([html.Span(className=led_red_cls), html.Strong("Vermelho (GPIO 18): ALERTA" if evaluation.is_anomalous else "Vermelho (GPIO 18): OFF", className="text-dark me-3")]),
                                    html.Span([html.Span(className=led_blue_cls), html.Strong(evaluation.led_status_text, className="text-info me-3")]),
                                    dbc.Badge(f"CMD: alert|{evaluation.command_code}", color=evaluation.badge_color, className="p-2 me-2"),
                                    dbc.Badge(source_label, color="secondary", className="p-2 border border-secondary bg-transparent text-secondary"),
                                ],
                                className="mb-2 d-flex align-items-center flex-wrap gap-1",
                            ),
                            html.Div(f"Buzzer: {evaluation.buzzer_pattern_text}", className="fw-semibold text-warning mb-1"),
                            html.Div(" • ".join(evaluation.details_messages), className="small text-dark mb-1"),
                            html.Small(f"Sincronização: {dispatch_msg}", className="text-muted"),
                        ],
                        md=9,
                    ),
                    dbc.Col(
                        html.Div(
                            [
                                html.Div("APOGEU & CONSERVAÇÃO", className="small text-muted fw-bold"),
                                html.Div(
                                    f"{evaluation.cellar_health_score}%",
                                    className="kpi-value text-success" if evaluation.cellar_health_score >= 85 else "kpi-value text-danger",
                                ),
                                html.Small(
                                    "Equilíbrio Enológico (Cava Preservada)" if not evaluation.is_anomalous else "Risco Organoléptico (Alerta Ativo)",
                                    className="text-secondary small",
                                ),
                            ],
                            className="cellar-score-box text-center p-3 rounded",
                        ),
                        md=3,
                    ),
                ],
                align="center",
            )
        ),
        className=f"clean-card mb-3 shadow-sm {border_cls}",
    )


def _single_kpi_col(
    icon_src: str, title: str, value: Optional[float], unit: str, min_lim: float, max_lim: float, color_cls: str
) -> dbc.Col:
    """Constrói um cartão KPI individual com ícone customizado indicando se está dentro do Trigger."""
    val_str = f"{value:.1f} {unit}" if value is not None else f"-- {unit}"
    is_out = value is not None and (value < min_lim or value > max_lim)
    status_badge = dbc.Badge("Desvio Enológico" if is_out else "Equilíbrio Ideal", color="danger" if is_out else "success", className="px-2 py-1")

    return dbc.Col(
        dbc.Card(
            dbc.CardBody(
                [
                    html.Div(
                        [
                            html.Span(
                                [html.Img(src=icon_src, className="custom-icon me-2"), html.Span(title)],
                                className="text-muted small fw-semibold d-flex align-items-center",
                            ),
                            status_badge,
                        ],
                        className="d-flex justify-content-between align-items-center mb-2",
                    ),
                    html.Div(val_str, className=f"kpi-value {color_cls} mb-1"),
                    html.Div(
                        f"Alvo enológico: {min_lim:.1f}{unit} a {max_lim:.1f}{unit}",
                        className="small text-muted kpi-range-pill px-2 py-1 rounded d-inline-block",
                        style={"fontSize": "0.74rem"},
                    ),
                ]
            ),
            className="clean-card shadow-sm h-100",
        ),
        lg=4,
        md=12,
        className="mb-2 mb-lg-0",
    )


def build_kpi_cards(snapshot: SensorSnapshot, triggers: TriggerConfig) -> dbc.Row:
    """Constrói os 3 cartões de leitura instantânea comparados aos Triggers ativos com grid alinhado."""
    return dbc.Row(
        [
            _single_kpi_col("/assets/icons/temperature.png", "TEMPERATURA DA CAVA", snapshot.temperature, "°C", triggers.temp_min, triggers.temp_max, "text-danger"),
            _single_kpi_col("/assets/icons/humidity.png", "HIGROMETRIA DA ROLHA", snapshot.humidity, "%", triggers.hum_min, triggers.hum_max, "text-info"),
            _single_kpi_col("/assets/icons/luminosity.png", "PENUMBRA DA ADEGA", snapshot.luminosity, "%", triggers.lum_min, triggers.lum_max, "text-warning"),
        ],
        className="g-3",
    )


def build_devices_table(devices: List[RegisteredDeviceInfo]) -> html.Div:
    """Renderiza a tabela de IoT Devices cadastrados no IoT Agent (Porta 4041)."""
    if not devices:
        return html.Div("Dispositivo padrão ativo: vine001 (urn:ngsi-ld:Vine:001) • Protocolo Ultralight 2.0 MQTT", className="text-muted small")
    rows = [
        html.Tr([html.Td(d.device_id, className="fw-bold text-info"), html.Td(d.entity_name), html.Td(d.entity_type), html.Td(f"{d.transport} ({d.protocol})")])
        for d in devices
    ]
    return dbc.Table(
        [html.Thead(html.Tr([html.Th("Device ID"), html.Th("Entity Name"), html.Th("Type"), html.Th("Protocolo")])), html.Tbody(rows)],
        bordered=True,
        hover=True,
        size="sm",
        className="mb-0 mt-2",
    )
