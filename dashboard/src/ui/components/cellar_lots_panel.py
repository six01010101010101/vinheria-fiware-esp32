"""
Componente de UI: Painel Executivo de Gestão de Lotes da Adega e Terroirs Mundiais.
Exibe em tempo real o status de Temperatura, Umidade e Luminosidade para cada Lote,
com dados de Safra, Data de Engarrafamento, Apogeu/Validade de Guarda e Saúde da Cava.
"""

from typing import List
import dash_bootstrap_components as dbc
from dash import dcc, html
from src.models.cellar_lot_models import LotStatusEvaluation
from src.repositories.cellar_lots_repository import CellarLotsRepository


def render_cellar_lots_panel() -> dbc.Card:
    """Renderiza a estrutura base do painel de lotes com seletores e container reativo."""
    lots = CellarLotsRepository.get_all_lots()
    options = [{"label": "Todos os Lotes da Adega (Visão Global)", "value": "all"}] + [
        {
            "label": f"{l.lot_code} — {l.winery_name} ({l.country}) · Safra {l.vintage} [Apogeu: {l.expiration_date.split('(')[0].strip()}]",
            "value": l.lot_code,
        }
        for l in lots
    ]

    return dbc.Card(
        dbc.CardBody(
            [
                dbc.Row(
                    [
                        dbc.Col(
                            [
                                html.Div(
                                    "CAVAS DE GUARDA & LOTES DO SOMMELIER (TERROIRS MUNDIAIS)",
                                    className="section-title mb-1 pb-1",
                                ),
                                html.Small(
                                    "Acompanhamento organoléptico contínuo, safras históricas, apogeu de guarda e afinamento em barricas.",
                                    className="text-muted d-block mb-2",
                                    style={"fontSize": "0.78rem"},
                                ),
                            ],
                            lg=7,
                            md=12,
                        ),
                        dbc.Col(
                            [
                                dbc.Label("Filtrar ou Selecionar Lote Específico:", className="small fw-semibold text-dark mb-1"),
                                dcc.Dropdown(
                                    id="dropdown-cellar-lot",
                                    options=options,
                                    value="all",
                                    clearable=False,
                                    searchable=True,
                                    className="small custom-dropdown wine-search-bar",
                                    placeholder="Buscar por lote, vinícola ou safra...",
                                ),
                            ],
                            lg=5,
                            md=12,
                        ),
                    ],
                    align="center",
                    className="mb-3",
                ),
                html.Div(id="cellar-lots-reactive-grid"),
            ],
            className="p-3",
        ),
        className="clean-card mb-3 shadow-sm",
    )


def build_cellar_lots_grid(evaluations: List[LotStatusEvaluation], active_lot_code: str = "all") -> html.Div:
    """Gera o grid responsivo de cartões com a telemetria ao vivo de cada lote da adega."""
    if not evaluations:
        return html.Div("Nenhum lote selecionado para exibição.", className="text-muted small py-2")

    filtered = evaluations if active_lot_code == "all" else [e for e in evaluations if e.lot.lot_code == active_lot_code]
    if not filtered:
        filtered = evaluations

    cols: List[dbc.Col] = []
    for ev in filtered:
        l = ev.lot
        is_sel = l.lot_code == active_lot_code
        card_cls = "vineyard-card vineyard-card-active h-100" if is_sel else "vineyard-card h-100"

        badge_t = "danger" if ev.temp_status == "critico" else ("warning" if ev.temp_status == "alerta" else "success")
        badge_h = "danger" if ev.hum_status == "critico" else ("warning" if ev.hum_status == "alerta" else "info")
        badge_l = "danger" if ev.lum_status == "critico" else ("warning" if ev.lum_status == "alerta" else "secondary")

        cols.append(
            dbc.Col(
                html.Div(
                    [
                        html.Div(
                            [
                                html.Span(l.lot_code, className="sommelier-tag"),
                                html.Div(
                                    [
                                        dbc.Badge(f"Apogeu: {ev.health_score}%", color=ev.status_color, className="me-1", style={"fontSize": "0.62rem"}),
                                        dbc.Badge(l.country, color="secondary", style={"fontSize": "0.62rem"}),
                                    ]
                                ),
                            ],
                            className="d-flex justify-content-between align-items-center mb-1",
                        ),
                        html.Div(
                            f"{l.name} — {l.winery_name} ({l.region})",
                            className="lot-wine-title text-truncate mb-1",
                        ),
                        dbc.Progress(
                            value=ev.health_score,
                            color=ev.status_color,
                            style={"height": "3px"},
                            className="mb-1 rounded-pill",
                        ),
                        html.Div(
                            f"Terroir: {l.soil} · {l.barrel_type}",
                            className="text-muted text-truncate mb-1",
                            style={"fontSize": "0.68rem"},
                        ),
                        html.Div(
                            [
                                html.Span(f"Safra {l.vintage} (Engarrafado: {l.bottling_date})", className="text-muted me-2"),
                                html.Span(f"Guarda: {l.expiration_date}", className="text-wine fw-semibold"),
                            ],
                            className="d-flex flex-wrap align-items-center small mb-2",
                            style={"fontSize": "0.69rem"},
                        ),
                        html.Div(
                            [
                                html.Span(f"T: {ev.current_temp:.1f}°C [{l.target_temp_min}-{l.target_temp_max}°C]", className=f"text-{badge_t} fw-bold me-2", style={"fontSize": "0.73rem"}),
                                html.Span(f"U: {ev.current_hum:.0f}% [{l.target_hum_min}-{l.target_hum_max}%]", className=f"text-{badge_h} fw-bold me-2", style={"fontSize": "0.73rem"}),
                                html.Span(f"L: {ev.current_lum:.1f}% [≤{l.target_lum_max}%]", className=f"text-{badge_l} fw-bold", style={"fontSize": "0.73rem"}),
                            ],
                            className="d-flex flex-wrap align-items-center mb-1",
                        ),
                        html.Div(
                            ev.verdict,
                            className=f"small text-{ev.status_color} fw-semibold text-truncate",
                            style={"fontSize": "0.70rem"},
                        ),
                    ],
                    className=card_cls,
                ),
                lg=6,
                xl=3,
                md=6,
                sm=12,
                className="mb-2",
            )
        )

    return dbc.Row(cols, className="g-3")
