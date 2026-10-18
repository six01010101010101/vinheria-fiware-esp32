"""
Ponto de entrada (Entrypoint) do Dashboard Dinâmico de Monitoramento Global de Vinherias.
Executa o servidor web Dash/Plotly integrado em Tempo Real ao Wokwi (MQTT :1883) e FIWARE:
- STH-Comet (Porta 8666 - Séries Históricas)
- IoT Agent MQTT (Porta 4041 - Cadastro e Gerenciamento de Dispositivos)
- Orion Context Broker (Porta 1026 - Leitura em Tempo Real e Comandos Remotos LED Azul + Buzzer)
"""

import dash_bootstrap_components as dbc
from dash import Dash, html
from src.ui.api_routes import register_api_routes
from src.ui.callbacks.dashboard_callbacks import register_dashboard_callbacks
from src.ui.components.charts_and_status import render_charts_and_status
from src.ui.components.device_management import render_device_management
from src.ui.components.header_and_triggers import render_header_and_triggers
from src.ui.components.real_vineyards_panel import render_real_vineyards_panel
from src.ui.components.wokwi_hub_panel import register_wokwi_hub_callbacks


def create_app() -> Dash:
    """Instancia e configura a aplicação Dash com layout modular limpo, API REST e callbacks reativos."""
    app = Dash(
        __name__,
        external_stylesheets=[dbc.themes.FLATLY],
        title="Vinheria Agnello | Monitoramento Global IoT & FIWARE",
    )

    app.layout = dbc.Container(
        [
            render_header_and_triggers(),
            render_real_vineyards_panel(),
            render_charts_and_status(),
            render_device_management(),
            html.Footer(
                "Check Point 5 — Monitoramento Global de Vinherias (ESP32 + DHT-11/22 + LDR + Buzzer + FIWARE STH-Comet + Open-Meteo + Supabase)",
                className="text-center text-muted small py-2",
            ),
        ],
        fluid=True,
        className="py-3 px-4",
    )

    register_api_routes(app.server)  # type: ignore[arg-type]
    register_dashboard_callbacks(app)
    register_wokwi_hub_callbacks(app)
    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8050, debug=True)
