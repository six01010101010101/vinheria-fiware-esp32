"""
Protocolo Ultralight 2.0 entre o Site e o ESP32 (Wokwi) — funções puras e testáveis.

ESP32 -> Site  (/TEF/vine001/attrs):  t|15.5|h|68.0|l|12.0|r|0
    r = 1 quando o LCD está espelhando valores enviados pelo Site (vinícola/cenário).
Site  -> ESP32 (/TEF/vine001/cmd):
    vine001@alert|<modo>                        comando remoto (compatível com IoT Agent FIWARE)
    vine001@diag|<modo>|<saude>|<veredito>|<PRESET>  diagnóstico completo (LEDs + LCD)
    vine001@sync|<t>|<h>|<l>                    espelha valores no LCD por alguns segundos
    vine001@live|1                              volta imediatamente para os sensores físicos
"""

from typing import Dict, Optional
from src.models.iot_models import SensorSnapshot

VALID_MODES = ("normal", "temp", "hum", "lum", "multi")
PHYSICAL_LIMITS = {"t": (-40.0, 80.0), "h": (0.0, 100.0), "l": (0.0, 100.0)}


def build_alert(device_id: str, mode: str) -> str:
    """Comando remoto simples de atuadores."""
    return f"{device_id}@alert|{mode}"


def build_diag(device_id: str, mode: str, health: int, verdict_code: str, preset_lcd: str) -> str:
    """Diagnóstico completo do Site para LEDs, Buzzer e LCD do ESP32."""
    clean_preset = "".join(ch for ch in preset_lcd.upper() if ch.isalnum())[:5] or "VINHO"
    return f"{device_id}@diag|{mode}|{max(0, min(100, int(health)))}|{verdict_code[:3]}|{clean_preset}"


def build_sync(device_id: str, temp: float, hum: float, lum: float) -> str:
    """Espelhamento de valores (vinícola real ou cenário) no LCD do Wokwi."""
    return f"{device_id}@sync|{temp:.1f}|{hum:.1f}|{lum:.1f}"


def build_live(device_id: str) -> str:
    """Libera o espelhamento e retorna aos sensores físicos do Wokwi."""
    return f"{device_id}@live|1"


def parse_ultralight_kv(payload: str) -> Optional[Dict[str, float]]:
    """Converte 'k|v|k|v' em dicionário numérico; None se malformado."""
    parts = [p.strip() for p in payload.strip().split("|") if p.strip()]
    if len(parts) < 2 or len(parts) % 2 != 0:
        return None
    try:
        return {parts[i].lower(): float(parts[i + 1]) for i in range(0, len(parts), 2)}
    except ValueError:
        return None


def snapshot_from_kv(kv: Dict[str, float], timestamp: str) -> Optional[SensorSnapshot]:
    """Valida limites físicos (DHT22/LDR) e monta o snapshot; None se inválido ou vazio."""
    values: Dict[str, Optional[float]] = {}
    for key, (low, high) in PHYSICAL_LIMITS.items():
        val = kv.get(key)
        if val is not None and not (low <= val <= high):
            return None
        values[key] = val
    if all(v is None for v in values.values()):
        return None
    return SensorSnapshot(values["t"], values["h"], values["l"], timestamp)
