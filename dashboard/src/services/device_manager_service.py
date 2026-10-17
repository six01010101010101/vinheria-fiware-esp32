"""
Serviço de gerenciamento de IoT Devices e consolidação de dados históricos/tempo real.
Integra o WokwiMqttRepository (MQTT Real-Time :1883), o SthCometRepository (Porta 8666)
e o FiwareIotRepository (Portas 4041 e 1026).
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple
from src.config.settings import DEFAULT_API_KEY, DEFAULT_DEVICE_ID, DEFAULT_WOKWI_BROKER
from src.models.iot_models import (
    DeviceProvisionSpec,
    HistoricalSeries,
    RegisteredDeviceInfo,
    SensorSnapshot,
)
from src.repositories.fiware_iot_repository import FiwareIotRepository
from src.repositories.sth_comet_repository import SthCometRepository
from src.repositories.wokwi_mqtt_repository import WokwiMqttRepository


class DeviceManagerService:
    """Orquestrador de dispositivos IoT, telemetria Wokwi em Tempo Real e séries STH-Comet."""

    @staticmethod
    def register_new_device(
        host: str,
        device_id: str,
        entity_name: str,
        entity_type: str = "Vine",
        api_key: str = "TEF",
    ) -> Tuple[bool, str]:
        """Valida os campos de entrada e cadastra o dispositivo + subscrição STH-Comet."""
        clean_id = (device_id or "").strip()
        clean_entity = (entity_name or "").strip()
        clean_type = (entity_type or "Vine").strip()
        clean_key = (api_key or "TEF").strip()

        if not clean_id or not clean_entity:
            return False, "Informe o Device ID (ex: vine001) e o Entity ID (ex: urn:ngsi-ld:Vine:001)."

        spec = DeviceProvisionSpec(
            device_id=clean_id,
            entity_name=clean_entity,
            entity_type=clean_type,
            api_key=clean_key,
        )
        repo = FiwareIotRepository(host=host)
        return repo.register_device(spec)

    @staticmethod
    def list_registered_devices(host: str) -> List[RegisteredDeviceInfo]:
        """Retorna a lista de IoT Devices cadastrados no IoT Agent (4041)."""
        repo = FiwareIotRepository(host=host)
        return repo.list_devices()

    @staticmethod
    def remove_device(host: str, device_id: str) -> Tuple[bool, str]:
        """Remove um IoT Device pelo seu device_id."""
        clean_id = (device_id or "").strip()
        if not clean_id:
            return False, "Selecione ou informe um Device ID válido para remover."
        repo = FiwareIotRepository(host=host)
        return repo.delete_device(clean_id)

    @staticmethod
    def get_wokwi_realtime_data(
        broker_host: str = DEFAULT_WOKWI_BROKER,
        device_id: str = DEFAULT_DEVICE_ID,
        api_key: str = DEFAULT_API_KEY,
        last_n: int = 30,
    ) -> Tuple[HistoricalSeries, Optional[SensorSnapshot], Dict[str, object]]:
        """Garante a conexão MQTT Real-Time com o Wokwi e retorna séries e último pacote."""
        wokwi_repo = WokwiMqttRepository.get_instance()
        wokwi_repo.ensure_connected(broker_host=broker_host, device_id=device_id, api_key=api_key)
        return wokwi_repo.get_realtime_series_and_snapshot(last_n=last_n)

    @staticmethod
    def get_historical_and_latest_data(
        host: str,
        entity_type: str,
        entity_id: str,
        last_n: int = 30,
    ) -> Tuple[HistoricalSeries, SensorSnapshot, bool]:
        """Consulta as séries históricas na API 8666 do STH-Comet e o estado atual no Orion (1026)."""
        sth_repo = SthCometRepository(host=host)
        iot_repo = FiwareIotRepository(host=host)

        series = sth_repo.fetch_all_vine_series(
            entity_type=entity_type,
            entity_id=entity_id,
            last_n=last_n,
        )
        snapshot = iot_repo.fetch_realtime_snapshot(entity_id=entity_id)

        if snapshot is not None:
            return series, snapshot, True

        latest_temp = series.temperature[-1].value if series.temperature else None
        latest_hum = series.humidity[-1].value if series.humidity else None
        latest_lum = series.luminosity[-1].value if series.luminosity else None
        has_sth_data = any([latest_temp is not None, latest_hum is not None, latest_lum is not None])

        fallback_snapshot = SensorSnapshot(
            temperature=latest_temp,
            humidity=latest_hum,
            luminosity=latest_lum,
            timestamp=datetime.now().strftime("%H:%M:%S"),
        )
        return series, fallback_snapshot, has_sth_data
