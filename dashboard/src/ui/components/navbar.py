"""
Componente de UI: Barra de Navegação Superior (Navbar) Moderna e Clean.
Apresenta identidade visual da Vinheria Agnello, logo, status do Wokwi ESP32
e links rápidos para API REST, Vinícolas Mundiais e Repositório GitHub.
"""

import dash_bootstrap_components as dbc
from dash import html
from src.config.settings import WOKWI_PROJECT_URL


def render_navbar() -> dbc.Navbar:
    """Renderiza a barra de navegação superior fixa/clean com logo e controles."""
    brand = dbc.Row(
        [
            dbc.Col(
                html.Img(src="/assets/icons/wine.png", className="navbar-brand-logo"),
                width="auto",
            ),
            dbc.Col(
                [
                    html.Div(
                        "VINHERIA AGNELLO",
                        className="navbar-brand-title fw-bold text-dark lh-1",
                    ),
                    html.Small(
                        "Monitoramento IoT • FIWARE & ESP32 Wokwi",
                        className="navbar-brand-sub text-muted",
                    ),
                ],
                width="auto",
            ),
        ],
        align="center",
        className="g-2",
    )

    return dbc.Navbar(
        dbc.Container(
            [
                html.A(
                    brand,
                    href="/",
                    className="text-decoration-none d-flex align-items-center",
                ),
                html.Div(
                    id="wokwi-live-status-bar",
                    className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-md-0",
                ),
            ],
            fluid=True,
            className="px-3 py-1",
        ),
        color="white",
        className="clean-navbar mb-3 shadow-sm sticky-top",
    )
