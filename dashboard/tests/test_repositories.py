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
    """Garante segurança contra pacotes MQTT malformados ou fora da escala física (ex.: 235°C)."""
    assert WokwiMqttRepository.parse_ultralight_payload("invalido", "15:30:00") is None
    assert WokwiMqttRepository.parse_ultralight_payload("x|10|y|20", "15:30:00") is None
    assert WokwiMqttRepository.parse_ultralight_payload("t|235.0|h|68.0|l|12.0", "15:30:00") is None
    assert WokwiMqttRepository.parse_ultralight_payload("t|15.5|h|180.0|l|12.0", "15:30:00") is None


def test_rest_api_status_and_telemetry_endpoints() -> None:
    """Valida os endpoints REST API (/api/v1/status e /api/v1/telemetry) da porta 8050."""
    from flask import Flask
    from src.ui.api_routes import register_api_routes

    flask_app = Flask(__name__)
    register_api_routes(flask_app)
    client = flask_app.test_client()

    res_status = client.get("/api/v1/status")
    assert res_status.status_code == 200
    body = res_status.get_json()
    assert body["status"] == "online"
    assert body["ports_and_protocols"]["mqtt_port"] == 1883
    assert body["ports_and_protocols"]["fiware_sth_comet_port"] == 8666

    res_bad = client.post("/api/v1/telemetry", json={"temperature": 235.0, "humidity": 68.0, "luminosity": 12.0})
    assert res_bad.status_code == 422

    res_ok = client.post("/api/v1/telemetry", json={"temperature": 24.5, "humidity": 68.0, "luminosity": 12.0})
    assert res_ok.status_code == 200
    assert res_ok.get_json()["command_code"] == "temp"


@patch("src.repositories.real_vineyards_repository.requests.get")
def test_real_vineyards_radiation_and_fetch(mock_get: MagicMock) -> None:
    """Valida a conversão de radiação solar (W/m²), Ponto de Orvalho (Magnus-Tetens) e busca de vinícola real."""
    from src.repositories.real_vineyards_repository import (
        RealVineyardsRepository,
        calculate_dew_point_c,
        radiation_to_luminosity_pct,
    )

    assert radiation_to_luminosity_pct(812.0) == 81.2
    assert radiation_to_luminosity_pct(1450.0) == 100.0
    assert radiation_to_luminosity_pct(0.0) == 0.0
    assert 5.5 <= calculate_dew_point_c(16.6, 49.0) <= 6.2

    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "current": {
            "time": "2026-10-17T13:15",
            "temperature_2m": 16.6,
            "relative_humidity_2m": 49.0,
            "shortwave_radiation": 812.0,
            "is_day": 1,
        },
        "hourly": {
            "time": ["2026-10-17T12:00", "2026-10-17T13:00"],
            "temperature_2m": [15.8, 16.4],
            "relative_humidity_2m": [52.0, 50.0],
            "shortwave_radiation": [740.0, 800.0],
        },
    }
    mock_get.return_value = mock_resp

    repo = RealVineyardsRepository()
    series, snap, info = repo.fetch_vineyard_telemetry("miolo_br", last_n=10)
    assert snap is not None
    assert snap.temperature == 16.6
    assert snap.humidity == 49.0
    assert snap.luminosity == 81.2
    assert info is not None and info.name == "Vinícola Miolo" and info.dew_point > 0
    assert len(series.temperature) == 2


