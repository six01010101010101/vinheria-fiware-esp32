"""
Testes automatizados (TDD) para os repositórios STH-Comet (Porta 8666),
FIWARE IoT Agent / Orion (Portas 4041 e 1026) e Ponte Wokwi MQTT Real-Time (Porta 1883).
"""

from unittest.mock import MagicMock, patch
from src.models.iot_models import DeviceProvisionSpec
from src.repositories.fiware_iot_repository import FiwareIotRepository
from src.repositories.sth_comet_repository import SthCometRepository
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository


def test_sth_comet_parse_response_values() -> None:
    """Valida a extração dos pontos históricos da resposta JSON padrão da API 8666 do STH-Comet."""
    sample_payload = {
        "contextResponses": [
            {
                "contextElement": {
                    "attributes": [
                        {
                            "name": "temperature",
                            "values": [
                                {"recvTime": "2026-10-16T14:00:00.000Z", "attrValue": "15.4"},
                                {"recvTime": "2026-10-16T14:01:00.000Z", "attrValue": 16.1},
                            ],
                        }
                    ]
                }
            }
        ]
    }
    points = SthCometRepository.parse_sth_payload(sample_payload)

    assert len(points) == 2
    assert points[0].value == 15.4
    assert points[0].timestamp == "14:00:00"
    assert points[1].value == 16.1


@patch("src.repositories.sth_comet_repository.requests.get")
def test_sth_comet_fetch_attribute_history_calls_port_8666(mock_get: MagicMock) -> None:
    """Garante que a consulta ao STH-Comet utiliza o endpoint oficial na porta 8666."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "contextResponses": [
            {
                "contextElement": {
                    "attributes": [
                        {
                            "name": "humidity",
                            "values": [
                                {"recvTime": "2026-10-16T14:05:00.000Z", "attrValue": "67.5"}
                            ],
                        }
                    ]
                }
            }
        ]
    }
    mock_get.return_value = mock_resp

    repo = SthCometRepository(host="20.206.204.100")
    points = repo.fetch_attribute_history(
        entity_type="Vine",
        entity_id="urn:ngsi-ld:Vine:001",
        attribute="humidity",
        last_n=20,
    )

    assert len(points) == 1
    assert points[0].value == 67.5
    called_url = mock_get.call_args[0][0]
    assert ":8666/STH/v1/contextEntities/type/Vine/id/urn:ngsi-ld:Vine:001/attributes/humidity" in called_url


@patch("src.repositories.fiware_iot_repository.requests.patch")
def test_send_remote_alert_command_patches_orion(mock_patch: MagicMock) -> None:
    """Garante que o comando de alerta do LED Azul + Buzzer é enviado via PATCH ao Orion (1026)."""
    mock_resp = MagicMock()
    mock_resp.status_code = 204
    mock_patch.return_value = mock_resp

    repo = FiwareIotRepository(host="localhost")
    ok, msg = repo.send_alert_command(entity_id="urn:ngsi-ld:Vine:001", command_value="temp")

    assert ok is True
    assert "temp" in msg
    called_url = mock_patch.call_args[0][0]
    assert ":1026/v2/entities/urn:ngsi-ld:Vine:001/attrs" in called_url


def test_build_device_provision_payload_includes_sensors_and_alert_cmd() -> None:
    """Verifica se o payload de cadastro do IoT Device contém t, h, l e o comando alert."""
    spec = DeviceProvisionSpec(
        device_id="vine001",
        entity_name="urn:ngsi-ld:Vine:001",
        entity_type="Vine",
        api_key="TEF",
    )
    payload = FiwareIotRepository.build_device_payload(spec)
    device_entry = payload["devices"][0]
    attr_names = [a["name"] for a in device_entry["attributes"]]
    cmd_names = [c["name"] for c in device_entry["commands"]]

    assert "temperature" in attr_names
    assert "humidity" in attr_names
    assert "luminosity" in attr_names
    assert "alert" in cmd_names


def test_wokwi_mqtt_parse_ultralight_payload() -> None:
    """Valida a decodificação em tempo real do pacote Ultralight 2.0 enviado pelo ESP32 no Wokwi."""
    snap = WokwiMqttRepository.parse_ultralight_payload("t|19.4|h|64.2|l|18.0", "15:30:00")
    assert snap is not None
    assert snap.temperature == 19.4
    assert snap.humidity == 64.2
    assert snap.luminosity == 18.0
    assert snap.timestamp == "15:30:00"


def test_wokwi_mqtt_rejects_malformed_payload() -> None:
    """Garante segurança contra pacotes MQTT malformados."""
    assert WokwiMqttRepository.parse_ultralight_payload("invalido", "15:30:00") is None
    assert WokwiMqttRepository.parse_ultralight_payload("x|10|y|20", "15:30:00") is None
