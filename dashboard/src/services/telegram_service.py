"""
Serviço de Notificação via Telegram Bot API para a Vinheria Agnello.
Envia alertas instantâneos de status crítico/anomalia e resumos para o grupo 'Admin Vinheira'.
"""

from datetime import datetime
import os
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import requests

DEFAULT_GROUP_NAME = "Admin Vinheira"
DEFAULT_ADMIN_PHONE = "11981237033"


def _load_env_credentials() -> Tuple[str, str]:
    """Carrega TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID do .env ou do ambiente."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if token and chat_id:
        return token, chat_id

    env_path = Path(__file__).resolve().parents[3] / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip("\"'")
                if k == "TELEGRAM_BOT_TOKEN" and not token:
                    token = v
                elif k == "TELEGRAM_CHAT_ID" and not chat_id:
                    chat_id = v
    return token, chat_id


class TelegramService:
    """Gerenciador de envio de alertas formatados para o Telegram."""

    _instance: Optional["TelegramService"] = None

    def __init__(self) -> None:
        self.bot_token, self.chat_id = _load_env_credentials()
        self.group_name = os.getenv("TELEGRAM_GROUP_NAME", DEFAULT_GROUP_NAME)
        self.admin_phone = os.getenv("TELEGRAM_ADMIN_PHONE", DEFAULT_ADMIN_PHONE)
        self.last_sent_ts: float = 0.0

    @classmethod
    def get_instance(cls) -> "TelegramService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def is_configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    def send_raw_message(self, text: str) -> Tuple[bool, str]:
        """Dispara mensagem Markdown para o Chat/Grupo configurado."""
        if not self.is_configured():
            return False, "Telegram Bot Token ou Chat ID não configurados no .env"

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True,
        }
        try:
            resp = requests.post(url, json=payload, timeout=4.0)
            if resp.status_code == 200:
                return True, "Mensagem enviada com sucesso ao grupo Admin Vinheira"
            return False, f"HTTP {resp.status_code}: {resp.text}"
        except requests.RequestException as exc:
            return False, f"Falha de rede ao conectar com Telegram: {exc}"

    def send_terroir_alert(
        self,
        terroir_name: str,
        country: str,
        wine_style: str,
        temp: float,
        hum: float,
        lum: float,
        state_key: str,
        score: int,
        details: str = ""
    ) -> Tuple[bool, str]:
        """Formata e envia alerta enológico detalhado para o grupo."""
        icon = "🚨 *ALERTA CRÍTICO DE ADEGA*" if state_key == "critico" else "⚠️ *AVISO DE DESVIO ENOLÓGICO*"
        status_tag = "🔴 CRÍTICO (<75%)" if state_key == "critico" else "🟡 PADRÃO / ATENÇÃO"

        msg = (
            f"{icon}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🍇 *Vinheria Agnello · Admin Vinheira*\n"
            f"📍 *Terroir:* {terroir_name} ({country})\n"
            f"🍷 *Estilo:* {wine_style.upper()} · Saúde: *{score}%*\n"
            f"📊 *Status:* {status_tag}\n\n"
            f"🌡️ *Temperatura:* `{temp:.1f}°C`\n"
            f"💧 *Umidade:* `{hum:.0f}%`\n"
            f"☀️ *Luminosidade:* `{lum:.0f}%`\n"
            f"🔊 *Atuador:* Buzzer Acionado & LEDs em Alerta\n"
            f"🛰️ *Fonte:* Satélite Open-Meteo & ESP32 IoT\n"
            f"⏰ *Horário:* `{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}`\n"
        )
        if details:
            msg += f"\nℹ️ *Diagnóstico:* _{details}_\n"
        msg += "━━━━━━━━━━━━━━━━━━━━━━\n📲 _Monitoramento Global de Vinherias_"

        return self.send_raw_message(msg)
