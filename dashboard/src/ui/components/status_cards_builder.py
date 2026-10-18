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
    """Exibe links rápidos (Wokwi, API REST, GitHub) e status MQTT/Portas em tempo real na Navbar."""
    connected = bool(meta.get("connected", False))
    packets = int(meta.get("packets_received", 0))
    last_time = str(meta.get("last_packet_time", "--:--:--"))

    return html.Div(
        [
            dbc.Button(
                "⚡ Wokwi ESP32 #478106752109243393",
                href=WOKWI_PROJECT_URL,
                target="_blank",
                size="sm",
                className="btn-wine fw-semibold px-2 py-1 me-1 shadow-none",
            ),
            dbc.Button(
                "API Status",
                href="/api/v1/status",
                target="_blank",
                color="secondary",
                outline=True,
                size="sm",
                className="px-2 py-1 me-1 shadow-none",
            ),
            dbc.Button(
                "🌍 Vinícolas",
                href="/api/v1/vineyards",
                target="_blank",
                color="secondary",
                outline=True,
                size="sm",
                className="px-2 py-1 me-1 shadow-none",
            ),
            dbc.Button(
                "GitHub",
                href="https://github.com/six01010101010101/checkpoint5-vinheria-fiware-esp32",
                target="_blank",
                color="dark",
                outline=True,
                size="sm",
                className="px-2 py-1 me-1 shadow-none",
            ),
            dbc.Badge(
                "🟢 MQTT :1883 Ativo" if connected else "🟡 MQTT :1883...",
                color="success" if connected else "warning",
                className="px-2 py-2 me-1 font-monospace",
            ),
            dbc.Badge(
                f"📡 {packets} pkts ({last_time})",
                color="light",
                className="px-2 py-2 border border-secondary text-dark font-monospace",
            ),
        ],
        className="d-flex flex-wrap gap-1 align-items-center",
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
                            html.Div("2. Status dos 3 LEDs Físicos & Buzzer no ESP32 (Wokwi & Caixa)", className="section-title"),
                            html.Div(
                                [
                                    html.Span([html.Span(className=led_green_cls), html.Strong("Verde (GPIO 5): Normal OK" if not evaluation.is_anomalous else "Verde (GPIO 5): OFF", className="text-dark me-3")]),
                                    html.Span([html.Span(className=led_red_cls), html.Strong("Vermelho (GPIO 18): ALERTA" if evaluation.is_anomalous else "Vermelho (GPIO 18): OFF", className="text-dark me-3")]),
                                    html.Span([html.Span(className=led_blue_cls), html.Strong(evaluation.led_status_text, className="text-info me-3")]),
                                    dbc.Badge(f"CMD: alert|{evaluation.command_code}", color=evaluation.badge_color, className="p-2 me-2"),
                                    dbc.Badge(source_label, color="light", className="p-2 border border-secondary text-dark"),
                                ],
                                className="mb-2 d-flex align-items-center flex-wrap gap-1",
                            ),
                            html.Div(f"🔊 {evaluation.buzzer_pattern_text}", className="fw-semibold text-warning mb-1"),
                            html.Div(" • ".join(evaluation.details_messages), className="small text-dark mb-1"),
                            html.Small(f"Sincronização: {dispatch_msg}", className="text-muted"),
                        ],
                        md=9,
                    ),
                    dbc.Col(
                        html.Div(
                            [
                                html.Div("QUALIDADE DA ADEGA", className="small text-muted fw-bold"),
                                html.Div(
                                    f"{evaluation.cellar_health_score}%",
                                    className="kpi-value text-success" if evaluation.cellar_health_score >= 85 else "kpi-value text-danger",
                                ),
                                html.Small(
                                    "Operação Normal (LED Verde ON)" if not evaluation.is_anomalous else "Anomalia (Vermelho ON + Azul Pisca)",
                                    className="text-secondary small",
                                ),
                            ],
                            className="text-center p-3 rounded",
                            style={"backgroundColor": "#f8fafc", "border": "1px solid #e2e8f0"},
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
    status_badge = dbc.Badge("⚠️ Fora" if is_out else "✅ Ideal", color="danger" if is_out else "success", className="px-2 py-1")

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
                        f"Faixa ideal: {min_lim:.1f}{unit} a {max_lim:.1f}{unit}",
                        className="small text-muted bg-light px-2 py-1 rounded d-inline-block",
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
            _single_kpi_col("/assets/icons/temperature.png", "TEMPERATURA (DHT)", snapshot.temperature, "°C", triggers.temp_min, triggers.temp_max, "text-danger"),
            _single_kpi_col("/assets/icons/humidity.png", "UMIDADE RELATIVA (DHT)", snapshot.humidity, "%", triggers.hum_min, triggers.hum_max, "text-info"),
            _single_kpi_col("/assets/icons/luminosity.png", "LUMINOSIDADE (LDR)", snapshot.luminosity, "%", triggers.lum_min, triggers.lum_max, "text-warning"),
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
