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
from src.ui.components.cellar_lots_panel import render_cellar_lots_panel
from src.ui.components.charts_and_status import render_charts_and_status
from src.ui.components.device_management import render_device_management
from src.ui.components.header_and_triggers import render_header_and_triggers
from src.ui.components.navbar import render_navbar
from src.ui.components.real_vineyards_panel import render_real_vineyards_panel
from src.ui.components.wokwi_hub_panel import register_wokwi_hub_callbacks


def create_app() -> Dash:
    """Instancia e configura a aplicação Dash com layout modular limpo, API REST e callbacks reativos."""
    app = Dash(
        __name__,
        external_stylesheets=[
            dbc.themes.FLATLY,
            "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
        ],
        title="Vinheria Agnello · Gestão de Adega, Lotes & Terroirs IoT",
        meta_tags=[
            {"name": "viewport", "content": "width=device-width, initial-scale=1"},
            {"name": "theme-color", "content": "#110d0e"},
        ],
    )

    app.layout = html.Div(
        [
            render_navbar(),
            dbc.Container(
                [
                    render_header_and_triggers(),
                    render_cellar_lots_panel(),
                    render_real_vineyards_panel(),
                    render_charts_and_status(),
                    render_device_management(),
                    html.Footer(
                        [
                            html.Span("Check Point 5 — Vinheria Agnello • FIWARE STH-Comet (:8666) & IoT Agent (:4041) • ESP32 Wokwi MQTT (:1883) • Open-Meteo & Supabase"),
                        ],
                        className="text-center text-muted small py-3 border-top mt-4",
                        style={"fontSize": "0.76rem"},
                    ),
                ],
                fluid=True,
                className="px-3 px-md-4",
            ),
        ]
    )

    register_api_routes(app.server)  # type: ignore[arg-type]
    register_dashboard_callbacks(app)
    register_wokwi_hub_callbacks(app)
    return app


app = create_app()
server = app.server

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", "8050"))
    app.run(host="0.0.0.0", port=port, debug=False)
