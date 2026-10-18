"""
Visualizador HTML Clean e Moderno para os Endpoints REST da API.
Exibe diagnósticos de portas, telemetria em tempo real e visualizador JSON
formatado quando o endpoint é acessado diretamente pelo navegador web.
"""

import json
from typing import Any, Dict


def render_api_status_html(data: Dict[str, Any]) -> str:
    """Gera página HTML com visual moderno em tons brancos e cinzas para o status da API."""
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
  <title>API Status • Vinheria Agnello FIWARE</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <style>
    body {{ background-color: #f8fafc; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
    .api-card {{ background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(15,23,42,0.04); }}
    .json-box {{ background: #0f172a; color: #38bdf8; border-radius: 8px; font-family: "Consolas", monospace; font-size: 0.82rem; padding: 16px; overflow-x: auto; max-height: 480px; }}
  </style>
</head>
<body class="py-4">
  <div class="container" style="max-width: 900px;">
    <div class="api-card p-4 mb-3">
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-3 border-bottom">
        <div>
          <span class="badge bg-success me-2">● {status_str}</span>
          <span class="badge bg-light text-dark border">Porta 8050 REST API</span>
          <h4 class="fw-bold mt-2 mb-0">⚡ Vinheria Agnello — REST API Diagnostic</h4>
          <small class="text-muted">Endpoint para integrações com ESP32, Wokwi, FIWARE e Supabase.</small>
        </div>
        <a href="/" class="btn btn-primary fw-semibold mt-2 mt-md-0">⬅ Voltar ao Dashboard Visual</a>
      </div>
      <div class="row g-2 mb-3">
        <div class="col-md-4">
          <div class="p-2 border rounded bg-light text-center">
            <small class="text-muted d-block">Temperatura Atual</small>
            <strong class="text-danger fs-5">{t_val}</strong>
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-2 border rounded bg-light text-center">
            <small class="text-muted d-block">Umidade Relativa</small>
            <strong class="text-info fs-5">{h_val}</strong>
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-2 border rounded bg-light text-center">
            <small class="text-muted d-block">Luminosidade (LDR)</small>
            <strong class="text-warning fs-5">{l_val}</strong>
          </div>
        </div>
      </div>
      <div class="alert alert-info py-2 px-3 small mb-3">
        ℹ️ <strong>Você está na interface da API REST:</strong> Para ver os <strong>gráficos em tempo real, protótipos 3D, telinha verde e controle dos 3 LEDs</strong>, acesse o <a href="/" class="fw-bold alert-link">Dashboard Principal</a>.
      </div>
      <h6 class="fw-bold text-secondary mb-2">Payload JSON Retornado para Dispositivos e Sistemas:</h6>
      <pre class="json-box mb-0"><code>{formatted_json}</code></pre>
    </div>
  </div>
</body>
</html>"""
