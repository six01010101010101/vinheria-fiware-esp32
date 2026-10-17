"""
Componente da Telinha Verde de Informática (Display Terminal Verde somente com escrita).
Exibe em tempo real apenas a escrita (texto puro monoespaçado) com os status de
Temperatura, Umidade, Luminosidade, LED Verde, LED Vermelho, LED Azul, Buzzer e Rede.
"""

from typing import Optional
from dash import html
from src.models.iot_models import AnomalyEvaluation, SensorSnapshot, TriggerConfig


def _sensor_status_text(val: Optional[float], min_lim: float, max_lim: float) -> str:
    """Retorna apenas o texto de status do sensor para a telinha verde."""
    if val is None:
        return "AGUARDANDO LEITURA"
    if val < min_lim:
        return "ALERTA: ABAIXO DO MINIMO!"
    if val > max_lim:
        return "ALERTA: ACIMA DO MAXIMO!"
    return "NORMAL [OK]"


def build_green_hardware_plaque(
    snapshot: SensorSnapshot,
    triggers: TriggerConfig,
    evaluation: AnomalyEvaluation,
    dispatch_msg: str,
    source_label: str,
) -> html.Div:
    """Renderiza a Telinha de Informática Verde onde aparece somente a escrita ao vivo."""
    t_txt = _sensor_status_text(snapshot.temperature, triggers.temp_min, triggers.temp_max)
    h_txt = _sensor_status_text(snapshot.humidity, triggers.hum_min, triggers.hum_max)
    l_txt = _sensor_status_text(snapshot.luminosity, triggers.lum_min, triggers.lum_max)

    t_val = f"{snapshot.temperature:5.1f} C" if snapshot.temperature is not None else " --.- C"
    h_val = f"{snapshot.humidity:5.1f} %" if snapshot.humidity is not None else " --.- %"
    l_val = f"{snapshot.luminosity:5.1f} %" if snapshot.luminosity is not None else " --.- %"

    state_header = (
        f"SAUDE DA ADEGA : {evaluation.cellar_health_score}% [!! ALERTA CRITICO DETECTADO NA ADEGA !!]"
        if evaluation.is_anomalous
        else f"SAUDE DA ADEGA : {evaluation.cellar_health_score}% [OPERACAO NORMAL - SAFRA PROTEGIDA]"
    )
    led_green_line = "APAGADO [FORA DA FAIXA IDEAL]" if evaluation.is_anomalous else "ACESO   [OK - PARAMETROS NORMAIS]"
    led_red_line = "ACESO   [ALERTA CRITICO NA CAIXA]" if evaluation.is_anomalous else "APAGADO [SEM ANOMALIA]"
    led_blue_line = "PISCANDO REMOTAMENTE [ACIONADO PELO SITE]" if evaluation.is_anomalous else "APAGADO [EM ESPERA]"

    lines = [
        "================================================================================",
        " VINHERIA AGNELLO - TELA DE MONITORAMENTO EM TEMPO REAL (CAIXA FISICA & WOKWI)  ",
        "================================================================================",
        f" FONTE ATIVA    : {source_label:<42} HORA : {snapshot.timestamp}",
        f" {state_header}",
        "--------------------------------------------------------------------------------",
        f" > TEMPERATURA  (DHT GPIO 15) : {t_val}  | Limite: {triggers.temp_min:4.1f} a {triggers.temp_max:4.1f} C | {t_txt}",
        f" > UMIDADE      (DHT GPIO 15) : {h_val}  | Limite: {triggers.hum_min:4.1f} a {triggers.hum_max:4.1f} % | {h_txt}",
        f" > LUMINOSIDADE (LDR GPIO 34) : {l_val}  | Limite: {triggers.lum_min:4.1f} a {triggers.lum_max:4.1f} % | {l_txt}",
        "--------------------------------------------------------------------------------",
        f" > LED VERDE    (GPIO 05)     : {led_green_line}",
        f" > LED VERMELHO (GPIO 18)     : {led_red_line}",
        f" > LED AZUL     (GPIO 02)     : {led_blue_line}",
        f" > BUZZER       (GPIO 04)     : {evaluation.buzzer_pattern_text}",
        f" > COMANDO FIWARE / MQTT      : vine001@alert|{evaluation.command_code} ({dispatch_msg})",
        f" > DIAGNOSTICO                : {' | '.join(evaluation.details_messages)}",
        "================================================================================",
    ]

    return html.Div(
        html.Pre("\n".join(lines), className="green-crt-text mb-0"),
        className="green-crt-screen mb-3",
    )
