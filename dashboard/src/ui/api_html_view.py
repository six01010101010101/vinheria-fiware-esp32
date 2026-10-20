"""
Visualizador HTML Clean e Moderno para os Endpoints REST da API.
Exibe diagnósticos de portas, telemetria em tempo real e visualizador JSON
formatado quando o endpoint é acessado diretamente pelo navegador web.
"""

import json
from typing import Any, Dict


def render_api_status_html(data: Dict[str, Any]) -> str:
    """Gera página HTML responsiva com suporte a tema claro e escuro para a API REST."""
    formatted_json = json.dumps(data, indent=2, ensure_ascii=False)
    tel = data.get("telemetry", {})
    t_val = f"{tel.get('temperature_c', '--')}°C"
    h_val = f"{tel.get('humidity_pct', '--')}%"
    l_val = f"{tel.get('luminosity_pct', '--')}%"
    status_str = str(data.get("status", "online")).upper()

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API REST · Vinheria Agnello</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <style>
    :root {{ --bg: #f7f4ee; --card: #ffffff; --text: #261e1b; --border: #e8e2d8; --subtle: #efeae2; }}
    @media (prefers-color-scheme: dark) {{
      :root {{ --bg: #110d0e; --card: #181315; --text: #f3ece7; --border: #292023; --subtle: #20181b; }}
    }}
    body {{ background-color: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
    .api-card {{ background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 1px 3px rgba(38,30,27,0.04); }}
    .json-box {{ background: #151012; color: #cca76c; border: 1px solid var(--border); border-radius: 8px; font-family: "Consolas", monospace; font-size: 0.82rem; padding: 16px; overflow-x: auto; max-height: 480px; }}
    .metric-box {{ background: var(--subtle); border: 1px solid var(--border); border-radius: 8px; padding: 12px; text-align: center; }}
    .btn-wine {{ background-color: #681f2a; color: #ffffff; border: none; font-weight: 600; font-size: 0.85rem; }}
    .btn-wine:hover {{ background-color: #4d141d; color: #ffffff; }}
  </style>
</head>
<body class="py-4">
  <div class="container" style="max-width: 920px;">
    <div class="api-card p-4 mb-3">
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-3 border-bottom">
        <div>
          <span class="badge bg-success me-2">{status_str}</span>
          <span class="badge bg-secondary border">REST API Ativa</span>
          <h4 class="fw-bold mt-2 mb-0" style="color: #681f2a;">Vinheria Agnello — REST API Diagnostic</h4>
          <small class="text-muted">Endpoints para Lotes, Vinícolas, ESP32, Wokwi, FIWARE e OpenAPI 3.0.</small>
        </div>
        <div class="d-flex gap-2 mt-2 mt-md-0">
          <a href="/api/v1/lots" class="btn btn-sm btn-outline-secondary">Lotes da Adega</a>
          <a href="/api/v1/openapi.json" class="btn btn-sm btn-outline-secondary">OpenAPI Spec</a>
          <a href="/" class="btn btn-sm btn-wine">Dashboard Visual</a>
        </div>
      </div>
      <div class="row g-2 mb-3">
        <div class="col-md-4"><div class="metric-box"><small class="text-muted d-block">Temperatura Atual</small><strong class="text-danger fs-5">{t_val}</strong></div></div>
        <div class="col-md-4"><div class="metric-box"><small class="text-muted d-block">Umidade Relativa</small><strong class="text-info fs-5">{h_val}</strong></div></div>
        <div class="col-md-4"><div class="metric-box"><small class="text-muted d-block">Luminosidade (LDR)</small><strong class="text-warning fs-5">{l_val}</strong></div></div>
      </div>
      <h6 class="fw-bold text-secondary mb-2">Payload JSON Retornado para Dispositivos e Sistemas:</h6>
      <pre class="json-box mb-0"><code>{formatted_json}</code></pre>
    </div>
  </div>
</body>
</html>"""
