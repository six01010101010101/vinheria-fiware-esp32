"""
Especificação OpenAPI 3.0.0 e Rota de Documentação Automática da API REST.
Permite integração direta com Swagger UI, Postman, sistemas ERP e apps parceiros.
"""

from typing import Any, Dict
from flask import Flask, jsonify


def get_openapi_spec() -> Dict[str, Any]:
    """Retorna o esquema padronizado OpenAPI 3.0.0 da API REST da Vinheria Agnello."""
    return {
        "openapi": "3.0.0",
        "info": {
            "title": "Vinheria Agnello — REST IoT & Enological API",
            "version": "1.2.0",
            "description": "API REST de alta performance para monitoramento de Adegas, Lotes de Vinho, Terroirs Globais e Integração ESP32/FIWARE.",
            "contact": {"name": "Vinheria Agnello CP5", "url": "https://github.com/six01010101010101/checkpoint5-vinheria-fiware-esp32"},
        },
        "servers": [{"url": "http://127.0.0.1:8050", "description": "Servidor Local Dash/Flask"}],
        "paths": {
            "/api/v1/health": {
                "get": {
                    "summary": "Health-check do Serviço e Conectividade de Nuvem",
                    "responses": {"200": {"description": "Status healthy e conectividade Supabase"}},
                }
            },
            "/api/v1/status": {
                "get": {
                    "summary": "Diagnóstico do Sistema e Telemetria em Tempo Real",
                    "responses": {"200": {"description": "Status de conexões MQTT, FIWARE, sensores e atuadores"}},
                }
            },
            "/api/v1/lots": {
                "get": {
                    "summary": "Lista todos os Lotes da Adega com Avaliação em Tempo Real",
                    "parameters": [
                        {"name": "style", "in": "query", "schema": {"type": "string"}, "description": "Filtro por estilo (tinto, branco, rose, espumante)"},
                        {"name": "country", "in": "query", "schema": {"type": "string"}, "description": "Filtro por país (França, Itália, Brasil, etc.)"},
                        {"name": "search", "in": "query", "schema": {"type": "string"}, "description": "Busca textual por nome ou código"},
                    ],
                    "responses": {"200": {"description": "Array de Lotes avaliados com saúde e veredito"}},
                }
            },
            "/api/v1/lots/{lot_code}": {
                "get": {
                    "summary": "Obtém Detalhes e Telemetria de um Lote Específico",
                    "parameters": [{"name": "lot_code", "in": "path", "required": True, "schema": {"type": "string"}}],
                    "responses": {"200": {"description": "Detalhes do lote e avaliação"}, "404": {"description": "Lote não encontrado"}},
                }
            },
            "/api/v1/vineyards": {
                "get": {
                    "summary": "Telemetria de Satélite das 9 Vinícolas Reais do Mundo (Open-Meteo)",
                    "parameters": [
                        {"name": "id", "in": "query", "schema": {"type": "string"}, "description": "ID da vinícola (ex.: margaux_fr, antinori_it)"},
                        {"name": "last_n", "in": "query", "schema": {"type": "integer"}, "description": "Número de amostras horárias"},
                    ],
                    "responses": {"200": {"description": "Dados climáticos GPS ao vivo ou série histórica 24h"}},
                }
            },
            "/api/v1/telemetry": {
                "post": {
                    "summary": "Ingestão Direta de Telemetria do Hardware ESP32",
                    "requestBody": {"content": {"application/json": {"schema": {"type": "object", "properties": {"temperature": {"type": "number"}, "humidity": {"type": "number"}, "luminosity": {"type": "number"}}}}}},
                    "responses": {"200": {"description": "Telemetria processada e comando de alerta retornado"}},
                }
            },
            "/api/v1/command": {
                "post": {
                    "summary": "Disparo Imediato de Comando Remoto aos Atuadores do ESP32",
                    "requestBody": {"content": {"application/json": {"schema": {"type": "object", "properties": {"command": {"type": "string", "enum": ["normal", "temp", "hum", "lum", "multi"]}}}}}},
                    "responses": {"200": {"description": "Comando enviado via MQTT"}},
                }
            },
        },
    }


def register_openapi_routes(server: Flask) -> None:
    """Registra endpoint da especificação OpenAPI 3.0 no servidor Flask."""

    @server.route("/api/v1/openapi.json", methods=["GET"])
    def get_openapi():  # type: ignore[no-untyped-def]
        """Retorna o documento de especificação OpenAPI 3.0.0 formatado em JSON."""
        return jsonify(get_openapi_spec())
