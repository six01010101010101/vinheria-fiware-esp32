"""
Testes unitários automatizados para os Endpoints REST da API (/api/v1/lots, openapi, status).
"""

from flask import Flask
from src.ui.api_routes import register_api_routes


def _create_test_client():
    """Instancia um test client Flask com as rotas registradas."""
    app = Flask(__name__)
    register_api_routes(app)
    return app.test_client()


def test_api_v1_lots_list_and_filters() -> None:
    """Verifica se /api/v1/lots lista lotes e aplica filtros por estilo e país."""
    client = _create_test_client()

    # Todos os lotes
    res = client.get("/api/v1/lots")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] >= 8
    first = data["lots"][0]
    assert "lot_code" in first
    assert "realtime_telemetry" in first
    assert "evaluation" in first
    assert "expiration_date" in first

    # Filtro por estilo tinto
    res_tinto = client.get("/api/v1/lots?style=tinto")
    assert res_tinto.status_code == 200
    data_tinto = res_tinto.get_json()
    assert data_tinto["count"] >= 4
    assert all(l["wine_style"] == "tinto" for l in data_tinto["lots"])

    # Filtro por país França
    res_fr = client.get("/api/v1/lots?country=França")
    assert res_fr.status_code == 200
    data_fr = res_fr.get_json()
    assert data_fr["count"] >= 2
    assert all(l["country"] == "França" for l in data_fr["lots"])


def test_api_v1_single_lot_and_404() -> None:
    """Verifica recuperação de lote individual e tratamento de código inexistente."""
    client = _create_test_client()

    res_ok = client.get("/api/v1/lots/LOTE-FR-MARGAUX-01")
    assert res_ok.status_code == 200
    body = res_ok.get_json()
    assert body["ok"] is True
    assert body["lot"]["lot_code"] == "LOTE-FR-MARGAUX-01"
    assert body["lot"]["winery_name"] == "Château Margaux"

    res_404 = client.get("/api/v1/lots/LOTE-INEXISTENTE-99")
    assert res_404.status_code == 404
    assert res_404.get_json()["ok"] is False


def test_api_v1_openapi_json() -> None:
    """Valida se /api/v1/openapi.json fornece especificação OpenAPI 3.0 válida."""
    client = _create_test_client()

    res = client.get("/api/v1/openapi.json")
    assert res.status_code == 200
    spec = res.get_json()
    assert spec["openapi"] == "3.0.0"
    assert "/api/v1/lots" in spec["paths"]
    assert "/api/v1/status" in spec["paths"]
    assert "/api/v1/vineyards" in spec["paths"]


def test_api_v1_status_contains_new_links() -> None:
    """Verifica se /api/v1/status inclui os novos links de lotes e openapi."""
    client = _create_test_client()

    res = client.get("/api/v1/status")
    assert res.status_code == 200
    links = res.get_json()["links"]
    assert "api_cellar_lots" in links
    assert "api_openapi_spec" in links
    assert "api_cloud_info" in links


def test_api_v1_cloud_info_and_deploy_routes() -> None:
    """Verifica metadados de sincronia em nuvem e endpoint de auto-deploy."""
    client = _create_test_client()

    res_info = client.get("/api/v1/cloud/info")
    assert res_info.status_code == 200
    info = res_info.get_json()
    assert info["status"] == "online"
    assert info["platform"] == "Render.com Web Service"
    assert info["git_branch"] == "main"
    assert info["auto_deploy_enabled"] is True

    res_deploy = client.post("/api/v1/cloud/trigger-deploy")
    assert res_deploy.status_code in (200, 201)
    body = res_deploy.get_json()
    assert body["ok"] is True


def test_portal_html5_route() -> None:
    """Valida se as rotas /portal e /html5 entregam o portal HTML5 semântico com status 200."""
    client = _create_test_client()

    for path in ["/portal", "/html5"]:
        res = client.get(path)
        assert res.status_code == 200
        assert "text/html" in res.content_type
        text = res.get_data(as_text=True)
        assert "<!DOCTYPE html>" in text
        assert "Vinheria Agnello" in text
        assert "lots-container" in text

