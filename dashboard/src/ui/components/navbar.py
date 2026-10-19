"""
Componente de UI: Barra de Navegação Superior (Navbar) Moderna e Clean.
Apresenta identidade visual da Vinheria Agnello, logo, status do Wokwi ESP32,
links rápidos e seletor de temas (☀️ Claro, 🌙 Escuro e 💻 Sistema).
"""

import dash_bootstrap_components as dbc
from dash import html


def _build_theme_switcher() -> dbc.ButtonGroup:
    """Cria os 3 botões seletores de tema: Claro (☀️), Escuro (🌙) e Sistema (💻)."""
    return dbc.ButtonGroup(
        [
            dbc.Button(
                "☀️ Claro",
                id="theme-btn-light",
                size="sm",
                outline=True,
                color="secondary",
                className="theme-btn",
            ),
            dbc.Button(
                "🌙 Escuro",
                id="theme-btn-dark",
                size="sm",
                outline=True,
                color="secondary",
                className="theme-btn",
            ),
            dbc.Button(
                "💻 Sistema",
                id="theme-btn-system",
                size="sm",
                outline=True,
                color="secondary",
                className="theme-btn active btn-wine",
            ),
        ],
        size="sm",
        className="theme-btn-group ms-md-2",
    )


def render_navbar() -> dbc.Navbar:
    """Renderiza a barra de navegação superior fixa/clean com logo, status e switcher de tema."""
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
                        className="navbar-brand-title fw-bold lh-1",
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
                    [
                        html.Div(
                            id="wokwi-live-status-bar",
                            className="d-flex flex-wrap align-items-center gap-1",
                        ),
                        _build_theme_switcher(),
                    ],
                    className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-md-0",
                ),
            ],
            fluid=True,
            className="px-3 py-1",
        ),
        className="clean-navbar mb-3 shadow-sm sticky-top",
    )

