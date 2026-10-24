"""
Repositório MQTT Real-Time Bidirecional para integração Plug-and-Play entre o Site e o Wokwi ESP32
(#478106752109243393) sobre o Broker FIWARE / HiveMQ (Protocolo Ultralight 2.0 na porta 1883).
Detecta se o Wokwi está realmente AO VIVO (pacotes recentes) e envia diagnóstico/espelhamento sem retain,
limpando mensagens retidas antigas para que o ESP32 nunca receba estados obsoletos.
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
from src.config.settings import (
    DEFAULT_API_KEY, DEFAULT_DEVICE_ID, DEFAULT_WOKWI_BROKER, DIAG_KEEPALIVE_S, MQTT_PORT, WOKWI_LIVE_TIMEOUT_S,
)
from src.models.iot_models import HistoricalSeries, SensorSnapshot, TimeSeriesPoint
from src.repositories import wokwi_protocol as proto


def _detect_wokwi_token() -> bool:
    """Verifica se o WOKWI_CLI_TOKEN está configurado no ambiente ou arquivo .env."""
    if os.getenv("WOKWI_CLI_TOKEN"):
        return True
    env_file = Path(__file__).resolve().parents[3] / ".env"
    try:
        return env_file.exists() and "WOKWI_CLI_TOKEN=" in env_file.read_text(encoding="utf-8")
    except OSError:
        return False


class WokwiMqttRepository:
    """Gerenciador Singleton Thread-Safe de conexão MQTT Bidirecional com o Wokwi ESP32."""

    _instance: Optional["WokwiMqttRepository"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        self.data_lock = threading.Lock()
        self.broker_host, self.broker_port = DEFAULT_WOKWI_BROKER, MQTT_PORT
        self.api_key, self.device_id = DEFAULT_API_KEY, DEFAULT_DEVICE_ID
        self.is_connected, self.has_token = False, _detect_wokwi_token()
        self.last_ack_message, self.last_packet_time = "Aguardando ACK do Wokwi", "--:--:--"
        self.packets_received, self.last_hw_packet_ts, self.device_mirroring = 0, 0.0, False
        self.last_diag, self.last_diag_ts = "", 0.0
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
        kv = proto.parse_ultralight_kv(payload)
        return proto.snapshot_from_kv(kv, timestamp) if kv is not None else None

    @property
    def cmd_topic(self) -> str:
        return f"/{self.api_key}/{self.device_id}/cmd"

    def ensure_connected(
        self, broker_host: str = DEFAULT_WOKWI_BROKER, device_id: str = DEFAULT_DEVICE_ID, api_key: str = DEFAULT_API_KEY
    ) -> None:
        """Inicia ou reconecta o cliente MQTT em background via IPv4 direto."""
        clean_broker = (broker_host or DEFAULT_WOKWI_BROKER).strip()
        clean_dev, clean_key = (device_id or DEFAULT_DEVICE_ID).strip(), (api_key or DEFAULT_API_KEY).strip()
        if self.client is not None and (self.broker_host, self.device_id, self.api_key) == (clean_broker, clean_dev, clean_key):
            return
        if self.client is not None:
            self.client.loop_stop()
            self.client.disconnect()
        self.broker_host, self.device_id, self.api_key = clean_broker, clean_dev, clean_key
        self.is_connected = False
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        client.on_connect, client.on_disconnect, client.on_message = self._on_connect, self._on_disconnect, self._on_message
        client.reconnect_delay_set(min_delay=1, max_delay=8)
        try:
            client.connect_async(socket.gethostbyname(self.broker_host), self.broker_port, keepalive=20)
        except OSError:
            return
        client.loop_start()
        self.client = client

    def _on_connect(self, client: mqtt.Client, _u: object, _f: object, rc: object, _p: object = None) -> None:
        if rc == 0:
            self.is_connected = True
            client.subscribe([(f"/{self.api_key}/{self.device_id}/attrs", 0), (f"/{self.api_key}/{self.device_id}/cmdexe", 0)])
            client.publish(self.cmd_topic, payload=None, qos=0, retain=True)  # limpa estados retidos antigos

    def _on_disconnect(self, *_args: object) -> None:
        self.is_connected = False

    def _on_message(self, _client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
        raw_text = msg.payload.decode("utf-8", errors="ignore").strip()
        now_str = datetime.now().strftime("%H:%M:%S")
        if msg.topic.endswith("/cmdexe"):
            with self.data_lock:
                self.last_ack_message = f"ACK ({now_str}): {raw_text}"
            return
        kv = proto.parse_ultralight_kv(raw_text)
        snapshot = proto.snapshot_from_kv(kv, now_str) if kv is not None else None
        if snapshot is not None and kv is not None:
            self._store_snapshot(snapshot, mirroring=kv.get("r", 0.0) >= 1.0)

    def _store_snapshot(self, snapshot: SensorSnapshot, mirroring: bool) -> None:
        with self.data_lock:
            self.latest_snapshot, self.last_packet_time = snapshot, snapshot.timestamp
            self.last_hw_packet_ts, self.device_mirroring = time.time(), mirroring
            self.packets_received += 1
            for buf, val in ((self.temp_buffer, snapshot.temperature), (self.hum_buffer, snapshot.humidity), (self.lum_buffer, snapshot.luminosity)):
                if val is not None:
                    buf.append(TimeSeriesPoint(snapshot.timestamp, val))

    def ingest_external_snapshot(self, snapshot: SensorSnapshot) -> None:
        """Registra leitura recebida via HTTP POST (ESP32 físico) como pacote ao vivo."""
        self._store_snapshot(snapshot, mirroring=False)

    def is_live(self) -> bool:
        """True somente se o Wokwi/ESP32 enviou pacote nos últimos WOKWI_LIVE_TIMEOUT_S segundos."""
        with self.data_lock:
            return self.last_hw_packet_ts > 0 and (time.time() - self.last_hw_packet_ts) <= WOKWI_LIVE_TIMEOUT_S

    def get_realtime_series_and_snapshot(self, last_n: int = 30) -> Tuple[HistoricalSeries, Optional[SensorSnapshot], Dict[str, object]]:
        """Retorna as séries recebidas do Wokwi, o último pacote e metadados de conexão/vivacidade."""
        live = self.is_live()
        with self.data_lock:
            series = HistoricalSeries(list(self.temp_buffer)[-last_n:], list(self.hum_buffer)[-last_n:], list(self.lum_buffer)[-last_n:])
            age = round(time.time() - self.last_hw_packet_ts, 1) if self.last_hw_packet_ts else None
            meta: Dict[str, object] = {
                "connected": self.is_connected, "live": live, "has_token": self.has_token, "broker": self.broker_host,
                "last_packet_time": self.last_packet_time, "packets_received": self.packets_received,
                "seconds_since_packet": age, "device_mirroring": self.device_mirroring, "last_ack": self.last_ack_message,
            }
            return series, (self.latest_snapshot if live else None), meta

    def _publish(self, payload: str) -> bool:
        if self.client is None or not self.is_connected:
            return False
        return self.client.publish(self.cmd_topic, payload, qos=0, retain=False).rc == mqtt.MQTT_ERR_SUCCESS

    def publish_alert_command(self, command_code: str, force: bool = False) -> Tuple[bool, str]:
        """Publica 'vine001@alert|<cmd>' (mesmo formato do IoT Agent FIWARE)."""
        payload = proto.build_alert(self.device_id, command_code)
        ok = self._publish(payload)
        return ok, (f"Comando enviado ao Wokwi: {payload}" if ok else f"Broker MQTT ({self.broker_host}) conectando...")

    def publish_diagnostic(self, mode: str, health: int, verdict_code: str, preset_lcd: str, force: bool = False) -> Tuple[bool, str]:
        """Envia o diagnóstico ao ESP32 quando muda ou a cada DIAG_KEEPALIVE_S (keepalive do LCD)."""
        payload = proto.build_diag(self.device_id, mode, health, verdict_code, preset_lcd)
        now = time.time()
        with self.data_lock:
            if not force and payload == self.last_diag and (now - self.last_diag_ts) < DIAG_KEEPALIVE_S:
                return True, f"Diagnóstico sincronizado no Wokwi ({payload})"
        if not self._publish(payload):
            return False, f"Broker MQTT ({self.broker_host}) conectando..."
        with self.data_lock:
            self.last_diag, self.last_diag_ts = payload, now
        return True, f"Diagnóstico enviado ao Wokwi ({payload})"

    def publish_sync(self, temp: float, hum: float, lum: float) -> bool:
        """Espelha valores de Temperatura, Umidade e Luminosidade no LCD do Wokwi."""
        return self._publish(proto.build_sync(self.device_id, temp, hum, lum))

    def publish_test_telemetry(self, temp: float, hum: float, lum: float, cmd_code: str = "") -> bool:
        """Compatibilidade: espelha valores de Temperatura, Umidade e Luminosidade no Wokwi."""
        return self.publish_sync(temp, hum, lum)

    def release_remote_sync(self) -> bool:
        """Faz o Wokwi voltar imediatamente para os sensores físicos (DHT22 + LDR)."""
        return self._publish(proto.build_live(self.device_id))
