"""
Componente do Barril Físico 3D (Corpo_Barril.STL + Tampa_Display_LCD16x2.STL)
com a Telinha Verde de Informática (só escrita) encaixada exatamente no buraco retangular
da tampa, em total sintonia com o Wokwi ESP32 e os sensores/LEDs.
"""

from typing import Optional
import dash_bootstrap_components as dbc
from dash import html
from src.models.iot_models import AnomalyEvaluation, SensorSnapshot, TriggerConfig


def _sensor_status_text(val: Optional[float], min_lim: float, max_lim: float) -> str:
    """Retorna apenas o texto de status do sensor para a telinha verde."""
    if val is None:
        return "AGUARDANDO"
    if val < min_lim:
        return "ABAIXO MIN!"
    if val > max_lim:
        return "ACIMA MAX!"
    return "NORMAL [OK]"


def build_green_hardware_plaque(
    snapshot: SensorSnapshot,
    triggers: TriggerConfig,
    evaluation: AnomalyEvaluation,
    dispatch_msg: str,
    source_label: str,
) -> dbc.Card:
    """Renderiza o Barril 3D + Tampa com a Telinha Verde encaixada no recorte retangular + Terminal Verde."""
    t_txt = _sensor_status_text(snapshot.temperature, triggers.temp_min, triggers.temp_max)
    h_txt = _sensor_status_text(snapshot.humidity, triggers.hum_min, triggers.hum_max)
    l_txt = _sensor_status_text(snapshot.luminosity, triggers.lum_min, triggers.lum_max)

    t_v = f"{snapshot.temperature:4.1f}C" if snapshot.temperature is not None else "--.-C"
    h_v = f"{snapshot.humidity:2.0f}%" if snapshot.humidity is not None else "--%"
    l_v = f"{snapshot.luminosity:2.0f}%" if snapshot.luminosity is not None else "--%"

    # Escrita de 2 linhas (16x2) encaixada exatamente dentro do buraco retangular da Tampa_Display_LCD16x2.STL
    lcd16x2_row1 = f"T:{t_v} U:{h_v} L:{l_v}"
    lcd16x2_row2 = (
        f"ALERTA:{evaluation.command_code.upper():<5} [!] "
        if evaluation.is_anomalous
        else "STATUS:ADEGA OK "
    )

    # Escrita completa da Telinha de Informática Verde (somente escrita) ao lado da tampa
    led_g = "APAGADO (FORA DO TRIGGER)" if evaluation.is_anomalous else "ACESO   (OPERACAO NORMAL)"
    led_r = "ACESO   (ALERTA CRITICO!)" if evaluation.is_anomalous else "APAGADO (SEM ANOMALIA)"
    led_b = "PISCANDO REMOTAMENTE     " if evaluation.is_anomalous else "APAGADO (EM ESPERA)"

    crt_lines = [
        "======================================================================",
        " TELINHA VERDE DO PRODUTO (DISPLAY LCD 16x2 NA TAMPA DO BARRIL 3D)    ",
        "======================================================================",
        f" FONTE : {source_label:<36} HORA: {snapshot.timestamp}",
        f" SAUDE : {evaluation.cellar_health_score}%  |  COMANDO FIWARE: vine001@alert|{evaluation.command_code}",
        "----------------------------------------------------------------------",
        f" TEMPERATURA  (6 Furos DHT - GPIO 15) : {t_v:<6} [{triggers.temp_min:.0f}-{triggers.temp_max:.0f}C] -> {t_txt}",
        f" UMIDADE      (6 Furos DHT - GPIO 15) : {h_v:<6} [{triggers.hum_min:.0f}-{triggers.hum_max:.0f}%] -> {h_txt}",
        f" LUMINOSIDADE (Furo LDR    - GPIO 34) : {l_v:<6} [{triggers.lum_min:.0f}-{triggers.lum_max:.0f}%] -> {l_txt}",
        "----------------------------------------------------------------------",
        f" LED VERDE    (GPIO 05) : {led_g}",
        f" LED VERMELHO (GPIO 18) : {led_r}",
        f" LED AZUL     (GPIO 02) : {led_b}",
        f" BUZZER 7FUROS(GPIO 04) : {evaluation.buzzer_pattern_text}",
        f" SINCRONIA WOKWI/CAIXA  : {dispatch_msg}",
        "======================================================================",
    ]

    return dbc.Card(
        dbc.CardBody(
            [
                html.Div(
                    "Protótipo Físico 3D (Corpo_Barril.STL + Tampa_Display_LCD16x2.STL) — Telinha Verde Encaixada na Tampa",
                    className="section-title",
                ),
                dbc.Row(
                    [
                        # Coluna 1: Tampa_Display_LCD16x2.STL com a Telinha Verde encaixada no buraco retangular
                        dbc.Col(
                            [
                                html.Div(
                                    [
                                        html.Img(
                                            src="/assets/icons/tampa_barril_lcd.png",
                                            className="barrel-lid-img",
                                        ),
                                        # Telinha verde (só escrita) encaixada exatamente no buraco retangular da tampa
                                        html.Div(
                                            [
                                                html.Div(lcd16x2_row1, className="barrel-lcd-line"),
                                                html.Div(lcd16x2_row2, className="barrel-lcd-line"),
                                            ],
                                            className="barrel-lcd-slot",
                                        ),
                                    ],
                                    className="barrel-lid-wrapper",
                                ),
                                html.Div(
                                    "Tampa_Display_LCD16x2.STL (Ø 112mm) • Buraco Retangular 66x26mm com Telinha Verde Ao Vivo",
                                    className="text-center small text-muted mt-2",
                                ),
                            ],
                            lg=4,
                            md=6,
                            className="mb-3 mb-lg-0 d-flex flex-column align-items-center justify-content-center",
                        ),
                        # Coluna 2: Corpo_Barril.STL + Montagem 3D
                        dbc.Col(
                            [
                                html.Div(
                                    html.Img(
                                        src="/assets/icons/corpo_barril_3d.png",
                                        style={"width": "100%", "maxWidth": "230px", "objectFit": "contain"},
                                    ),
                                    className="text-center",
                                ),
                                html.Div(
                                    "Corpo_Barril.STL (Ø 127.3 x 121.5mm) + Tampa Encaixada",
                                    className="text-center small text-muted mt-1",
                                ),
                            ],
                            lg=3,
                            md=6,
                            className="mb-3 mb-lg-0 d-flex flex-column align-items-center justify-content-center",
                        ),
                        # Coluna 3: Telinha de Informática Verde (Somente Escrita) em Tempo Real
                        dbc.Col(
                            html.Div(
                                html.Pre("\n".join(crt_lines), className="green-crt-text mb-0"),
                                className="green-crt-screen h-100 d-flex align-items-center",
                            ),
                            lg=5,
                            md=12,
                        ),
                    ],
                    align="center",
                ),
            ]
        ),
        className="clean-card mb-3 shadow-sm",
    )
