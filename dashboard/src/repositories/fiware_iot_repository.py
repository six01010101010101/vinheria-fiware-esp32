"""
Repositório de comunicação com o IoT Agent MQTT (Porta 4041) e Orion Context Broker (Porta 1026).
Responsável pelo cadastro/gerenciamento de IoT Devices, subscrição histórica no STH-Comet
e envio de comandos remotos para acionar o LED Azul piscante e o Buzzer do ESP32.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import requests
from src.config.settings import (
    DEFAULT_FIWARE_HOST,
    FIWARE_SERVICE,
    FIWARE_SERVICE_PATH,
    HTTP_TIMEOUT_SECONDS,
    IOT_AGENT_PORT,
    ORION_PORT,
    STH_COMET_PORT,
)
from src.models.iot_models import DeviceProvisionSpec, RegisteredDeviceInfo, SensorSnapshot


class FiwareIotRepository:
    """Cliente de integração com IoT Agent (4041) e Orion Context Broker (1026)."""

    def __init__(
        self,
        host: str = DEFAULT_FIWARE_HOST,
        iot_port: int = IOT_AGENT_PORT,
        orion_port: int = ORION_PORT,
        fiware_service: str = FIWARE_SERVICE,
        fiware_service_path: str = FIWARE_SERVICE_PATH,
    ) -> None:
        self.host = host.strip() or DEFAULT_FIWARE_HOST
        self.iot_base = f"http://{self.host}:{iot_port}"
        self.orion_base = f"http://{self.host}:{orion_port}"
        self.headers: Dict[str, str] = {
            "fiware-service": fiware_service,
            "fiware-servicepath": fiware_service_path,
        }
        self.json_headers: Dict[str, str] = {**self.headers, "Content-Type": "application/json"}

    @staticmethod
    def build_device_payload(spec: DeviceProvisionSpec) -> Dict[str, Any]:
        """Monta o payload oficial do IoT Agent com sensores t, h, l e comando remoto alert."""
        return {
            "devices": [
                {
                    "device_id": spec.device_id,
                    "entity_name": spec.entity_name,
                    "entity_type": spec.entity_type,
                    "protocol": "PDI-IoTA-UltraLight",
                    "transport": "MQTT",
                    "commands": [{"name": "alert", "type": "command"}],
                    "attributes": [
                        {"object_id": "t", "name": "temperature", "type": "float"},
                        {"object_id": "h", "name": "humidity", "type": "float"},
                        {"object_id": "l", "name": "luminosity", "type": "float"},
                    ],
                }
            ]
        }

    def ensure_service_group(self, api_key: str = "TEF") -> Tuple[bool, str]:
        """Garante que o Service Group MQTT (Ultralight 2.0) esteja provisionado no IoT Agent."""
        payload = {
            "services": [
                {"apikey": api_key, "cbroker": "http://orion:1026", "entity_type": "Vine", "resource": ""}
            ]
        }
        try:
            resp = requests.post(
                f"{self.iot_base}/iot/services", json=payload, headers=self.json_headers, timeout=HTTP_TIMEOUT_SECONDS
            )
            if resp.status_code in (201, 409):
                return True, "Service Group MQTT provisionado/confirmado."
            return False, f"Status IoT Agent Services: {resp.status_code}"
        except requests.RequestException as exc:
            return False, f"Falha de conexão com IoT Agent ({self.iot_base}): {exc}"

    def register_device(self, spec: DeviceProvisionSpec) -> Tuple[bool, str]:
        """Cadastra um novo IoT Device (ESP32) no IoT Agent e cria subscrição no STH-Comet."""
        self.ensure_service_group(spec.api_key)
        payload = self.build_device_payload(spec)
        try:
            resp = requests.post(
                f"{self.iot_base}/iot/devices", json=payload, headers=self.json_headers, timeout=HTTP_TIMEOUT_SECONDS
            )
            if resp.status_code in (201, 409):
                self.create_sth_subscription(spec.entity_name, spec.entity_type)
                return True, f"Dispositivo '{spec.device_id}' ({spec.entity_name}) cadastrado!"
            return False, f"Erro ao cadastrar device (HTTP {resp.status_code}): {resp.text}"
        except requests.RequestException as exc:
            return False, f"Erro de conexão com IoT Agent (4041): {exc}"

    def create_sth_subscription(self, entity_id: str, entity_type: str = "Vine") -> bool:
        """Cria a subscrição no Orion (1026) para gravar histórico no STH-Comet (8666)."""
        payload = {
            "description": f"Subscricao Historico STH-Comet para {entity_id}",
            "subject": {
                "entities": [{"id": entity_id, "type": entity_type}],
                "condition": {"attrs": ["temperature", "humidity", "luminosity"]},
            },
            "notification": {
                "http": {"url": f"http://sth-comet:{STH_COMET_PORT}/notify"},
                "attrs": ["temperature", "humidity", "luminosity"],
                "attrsFormat": "legacy",
            },
        }
        try:
            resp = requests.post(
                f"{self.orion_base}/v2/subscriptions",
                json=payload,
                headers=self.json_headers,
                timeout=HTTP_TIMEOUT_SECONDS,
            )
            return resp.status_code in (201, 204)
        except requests.RequestException:
            return False

    def list_devices(self) -> List[RegisteredDeviceInfo]:
        """Lista todos os IoT Devices cadastrados no IoT Agent (Porta 4041)."""
        try:
            resp = requests.get(f"{self.iot_base}/iot/devices", headers=self.headers, timeout=HTTP_TIMEOUT_SECONDS)
            if resp.status_code == 200:
                return [
                    RegisteredDeviceInfo(
                        device_id=str(d.get("device_id", "")),
                        entity_name=str(d.get("entity_name", "")),
                        entity_type=str(d.get("entity_type", "Vine")),
                        transport=str(d.get("transport", "MQTT")),
                        protocol=str(d.get("protocol", "PDI-IoTA-UltraLight")),
                    )
                    for d in resp.json().get("devices", [])
                ]
        except requests.RequestException:
            return []
        return []

    def delete_device(self, device_id: str) -> Tuple[bool, str]:
        """Remove um IoT Device cadastrado do IoT Agent (Porta 4041)."""
        try:
            resp = requests.delete(
                f"{self.iot_base}/iot/devices/{device_id}", headers=self.headers, timeout=HTTP_TIMEOUT_SECONDS
            )
            if resp.status_code in (204, 200):
                return True, f"Dispositivo '{device_id}' removido com sucesso."
            return False, f"Não foi possível remover '{device_id}' (HTTP {resp.status_code})."
        except requests.RequestException as exc:
            return False, f"Erro ao conectar ao IoT Agent: {exc}"

    def fetch_realtime_snapshot(self, entity_id: str) -> Optional[SensorSnapshot]:
        """Lê os valores instantâneos de temperatura, umidade e luminosidade no Orion (1026)."""
        try:
            resp = requests.get(
                f"{self.orion_base}/v2/entities/{entity_id}", headers=self.headers, timeout=HTTP_TIMEOUT_SECONDS
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            return SensorSnapshot(
                temperature=self._safe_float(data.get("temperature", {}).get("value")),
                humidity=self._safe_float(data.get("humidity", {}).get("value")),
                luminosity=self._safe_float(data.get("luminosity", {}).get("value")),
                timestamp=datetime.now().strftime("%H:%M:%S"),
            )
        except requests.RequestException:
            return None

    def send_alert_command(self, entity_id: str, command_value: str) -> Tuple[bool, str]:
        """Envia o comando remoto 'alert' ao Orion (1026) para acionar LED Azul + Buzzer no ESP32."""
        payload = {"alert": {"type": "command", "value": command_value}}
        try:
            resp = requests.patch(
                f"{self.orion_base}/v2/entities/{entity_id}/attrs",
                json=payload,
                headers=self.json_headers,
                timeout=HTTP_TIMEOUT_SECONDS,
            )
            if resp.status_code in (200, 204):
                return True, f"Comando remoto 'alert|{command_value}' enviado ao ESP32 ({entity_id})."
            return False, f"Orion retornou HTTP {resp.status_code} ao enviar comando '{command_value}'."
        except requests.RequestException as exc:
            return False, f"Broker FIWARE offline ao enviar comando 'alert|{command_value}': {exc}"

    @staticmethod
    def _safe_float(val: Any) -> Optional[float]:
        try:
            return float(val) if val is not None else None
        except (ValueError, TypeError):
            return None
