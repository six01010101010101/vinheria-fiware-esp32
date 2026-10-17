"""
Repositório MQTT Real-Time para integração direta e de baixa latência com o Wokwi (ESP32)
e Broker FIWARE (Protocolo Ultralight 2.0 sobre MQTT na porta 1883).
"""

from collections import deque
from datetime import datetime
import os
from pathlib import Path
import socket
import threading
import time
from typing import Deque, Dict, Optional, Tuple
import paho.mqtt.client as mqtt
from src.config.settings import DEFAULT_API_KEY, DEFAULT_DEVICE_ID, DEFAULT_WOKWI_BROKER, MQTT_PORT
from src.models.iot_models import HistoricalSeries, SensorSnapshot, TimeSeriesPoint


def _detect_wokwi_token() -> bool:
    """Verifica se o WOKWI_CLI_TOKEN está configurado no ambiente Windows ou arquivo .env."""
    if os.getenv("WOKWI_CLI_TOKEN"):
        return True
    env_file = Path(__file__).resolve().parents[3] / ".env"
    try:
        return env_file.exists() and "WOKWI_CLI_TOKEN=" in env_file.read_text(encoding="utf-8")
    except OSError:
        return False


class WokwiMqttRepository:
    """Gerenciador Singleton Thread-Safe de conexão MQTT Real-Time com o Wokwi ESP32."""

    _instance: Optional["WokwiMqttRepository"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        self.data_lock = threading.Lock()
        self.broker_host: str = DEFAULT_WOKWI_BROKER
        self.broker_port: int = MQTT_PORT
        self.api_key: str = DEFAULT_API_KEY
        self.device_id: str = DEFAULT_DEVICE_ID
        self.is_connected: bool = False
        self.has_token: bool = _detect_wokwi_token()
        self.last_ack_message: str = "Wokwi Sincronizado"
        self.last_packet_time: str = "--:--:--"
        self.packets_received: int = 0
        self.last_sent_cmd: str = ""
        self.last_sent_ts: float = 0.0

        self.temp_buffer: Deque[TimeSeriesPoint] = deque(maxlen=100)
        self.hum_buffer: Deque[TimeSeriesPoint] = deque(maxlen=100)
        self.lum_buffer: Deque[TimeSeriesPoint] = deque(maxlen=100)
        self.latest_snapshot: Optional[SensorSnapshot] = None
        self.client: Optional[mqtt.Client] = None

    @classmethod
    def get_instance(cls) -> "WokwiMqttRepository":
        """Retorna a instância única do cliente MQTT Real-Time."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    @staticmethod
    def parse_ultralight_payload(payload: str, timestamp: str) -> Optional[SensorSnapshot]:
        """Converte payload Ultralight 2.0 ('t|15.5|h|68.0|l|12.0') validando limites físicos."""
        try:
            parts = [p.strip() for p in payload.strip().split("|") if p.strip()]
            if len(parts) < 2 or len(parts) % 2 != 0:
                return None
            kv: Dict[str, float] = {parts[i].lower(): float(parts[i + 1]) for i in range(0, len(parts), 2)}
            t_val, h_val, l_val = kv.get("t"), kv.get("h"), kv.get("l")
            if t_val is not None and not (-40.0 <= t_val <= 80.0):
                return None
            if h_val is not None and not (0.0 <= h_val <= 100.0):
                return None
            if l_val is not None and not (0.0 <= l_val <= 100.0):
                return None
            if t_val is None and h_val is None and l_val is None:
                return None
            return SensorSnapshot(t_val, h_val, l_val, timestamp)
        except (ValueError, IndexError):
            return None

    def ensure_connected(
        self,
        broker_host: str = DEFAULT_WOKWI_BROKER,
        device_id: str = DEFAULT_DEVICE_ID,
        api_key: str = DEFAULT_API_KEY,
    ) -> None:
        """Inicia ou reconecta o cliente MQTT em background via IPv4 direto."""
        clean_broker = (broker_host or DEFAULT_WOKWI_BROKER).strip()
        clean_dev = (device_id or DEFAULT_DEVICE_ID).strip()
        clean_key = (api_key or DEFAULT_API_KEY).strip()

        if (
            self.client is not None
            and self.broker_host == clean_broker
            and self.device_id == clean_dev
            and self.api_key == clean_key
        ):
            return

        if self.client is not None:
            try:
                self.client.loop_stop()
                self.client.disconnect()
            except Exception:
                pass

        self.broker_host, self.device_id, self.api_key = clean_broker, clean_dev, clean_key
        self.is_connected = False
        self.has_token = _detect_wokwi_token()

        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        client.on_connect = self._on_connect
        client.on_disconnect = self._on_disconnect
        client.on_message = self._on_message
        try:
            ipv4_target = socket.gethostbyname(self.broker_host)
            client.connect_async(ipv4_target, self.broker_port, keepalive=20)
            client.loop_start()
            self.client = client
        except Exception:
            self.is_connected = False

    def _on_connect(self, client: mqtt.Client, _u: object, _f: object, rc: object, _p: object = None) -> None:
        if rc == 0:
            self.is_connected = True
            client.subscribe([(f"/{self.api_key}/{self.device_id}/attrs", 0), (f"/{self.api_key}/{self.device_id}/cmdexe", 0)])

    def _on_disconnect(self, *_args: object) -> None:
        self.is_connected = False

    def _on_message(self, _client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
        raw_text = msg.payload.decode("utf-8", errors="ignore").strip()
        now_str = datetime.now().strftime("%H:%M:%S")
        if msg.topic.endswith("/cmdexe"):
            with self.data_lock:
                self.last_ack_message = f"ACK ({now_str}): {raw_text}"
            return
        snapshot = self.parse_ultralight_payload(raw_text, now_str)
        if snapshot is not None:
            with self.data_lock:
                self.latest_snapshot = snapshot
                self.last_packet_time = now_str
                self.packets_received += 1
                if snapshot.temperature is not None:
                    self.temp_buffer.append(TimeSeriesPoint(now_str, snapshot.temperature))
                if snapshot.humidity is not None:
                    self.hum_buffer.append(TimeSeriesPoint(now_str, snapshot.humidity))
                if snapshot.luminosity is not None:
                    self.lum_buffer.append(TimeSeriesPoint(now_str, snapshot.luminosity))

    def get_realtime_series_and_snapshot(
        self, last_n: int = 30
    ) -> Tuple[HistoricalSeries, Optional[SensorSnapshot], Dict[str, object]]:
        """Retorna as séries recebidas do Wokwi em tempo real e metadados da conexão."""
        with self.data_lock:
            series = HistoricalSeries(
                temperature=list(self.temp_buffer)[-last_n:],
                humidity=list(self.hum_buffer)[-last_n:],
                luminosity=list(self.lum_buffer)[-last_n:],
            )
            meta = {
                "connected": self.is_connected,
                "has_token": self.has_token,
                "broker": self.broker_host,
                "last_packet_time": self.last_packet_time,
                "packets_received": self.packets_received,
                "last_ack": self.last_ack_message,
            }
            return series, self.latest_snapshot, meta

    def publish_alert_command(self, command_code: str, force: bool = False) -> Tuple[bool, str]:
        """Publica 'vine001@alert|<cmd>' com retain=True em /TEF/vine001/cmd para sincronia imediata com o Wokwi."""
        if self.client is None or not self.is_connected:
            return False, f"Broker MQTT ({self.broker_host}) conectando..."
        now = time.time()
        if not force and command_code == self.last_sent_cmd and (now - self.last_sent_ts) < 0.85:
            return True, f"Sincronizado no Wokwi ({self.device_id}@alert|{command_code})"
        cmd_topic = f"/{self.api_key}/{self.device_id}/cmd"
        cmd_payload = f"{self.device_id}@alert|{command_code}"
        info = self.client.publish(cmd_topic, cmd_payload, qos=0, retain=True)
        if info.rc == mqtt.MQTT_ERR_SUCCESS:
            self.last_sent_cmd, self.last_sent_ts = command_code, now
            return True, f"Comando Ativo no Wokwi ({cmd_topic}): {cmd_payload}"
        return False, f"Falha ao publicar comando MQTT em {cmd_topic}"

    def publish_test_telemetry(self, temp: float, hum: float, lum: float) -> bool:
        """Publica telemetria Ultralight 2.0 real no broker MQTT em tempo real."""
        if self.client is None or not self.is_connected:
            return False
        attrs_topic = f"/{self.api_key}/{self.device_id}/attrs"
        info = self.client.publish(attrs_topic, f"t|{temp:.1f}|h|{hum:.1f}|l|{lum:.1f}", qos=0)
        return info.rc == mqtt.MQTT_ERR_SUCCESS
