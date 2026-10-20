"""
Rotas REST da API para Sincronização em Nuvem (Render.com, GitHub & Supabase).
Fornece metadados de deploy contínuo, conectividade mútua e acionamento de redeploy.
"""

from datetime import datetime
import os
from flask import Flask, jsonify
import requests
from src.repositories.supabase_repository import SupabaseRepository

GITHUB_REPO_URL = "https://github.com/six01010101010101/vinheria-fiware-esp32"
RENDER_DEFAULT_URL = "https://vinheria-agnello-iot.onrender.com"


def register_cloud_routes(server: Flask) -> None:
    """Registra endpoints de metadados e sincronia da nuvem Render.com e Supabase."""

    @server.route("/portal", methods=["GET"])
    @server.route("/html5", methods=["GET"])
    def serve_portal_html5():  # type: ignore[no-untyped-def]
        """Serve a interface pura HTML5 do Portal Sommelier Vinheria Agnello."""
        from pathlib import Path
        root_html = Path(__file__).resolve().parents[3] / "index.html"
        if root_html.exists():
            return root_html.read_text(encoding="utf-8"), 200, {"Content-Type": "text/html; charset=utf-8"}
        return "Portal HTML5 em preparação.", 404

    @server.route("/api/v1/cloud/info", methods=["GET"])
    def get_cloud_info():  # type: ignore[no-untyped-def]
        """Retorna o estado da sincronização em nuvem (Render.com + GitHub + Supabase)."""
        deploy_hook = os.getenv("RENDER_DEPLOY_HOOK_URL", "")
        supa = SupabaseRepository.get_instance()
        return jsonify(
            {
                "status": "online",
                "service_name": "vinheria-agnello-iot",
                "platform": "Render.com Web Service",
                "cloud_url": os.getenv("RENDER_EXTERNAL_URL", RENDER_DEFAULT_URL),
                "github_repository": GITHUB_REPO_URL,
                "git_branch": "main",
                "auto_deploy_enabled": True,
                "deploy_hook_configured": bool(deploy_hook),
                "supabase_cloud": {
                    "configured": supa.is_configured(),
                    "url": supa.project_url,
                },
                "timestamp": datetime.now().isoformat(),
            }
        )

    @server.route("/api/v1/health", methods=["GET"])
    @server.route("/healthz", methods=["GET"])
    def get_health_check():  # type: ignore[no-untyped-def]
        """Health-check oficial para monitoramento do Render.com e orquestradores de nuvem."""
        supa = SupabaseRepository.get_instance()
        return jsonify({
            "status": "healthy",
            "service": "vinheria-agnello-iot",
            "timestamp": datetime.now().isoformat(),
            "cloud_provider": "Render.com",
            "database_connected": supa.is_configured(),
        }), 200

    @server.route("/api/v1/cloud/trigger-deploy", methods=["POST"])
    def trigger_cloud_deploy():  # type: ignore[no-untyped-def]
        """Dispara imediatamente o Deploy Hook do Render.com caso configurado em ambiente."""
        hook_url = os.getenv("RENDER_DEPLOY_HOOK_URL", "")
        if not hook_url:
            return jsonify({
                "ok": True,
                "message": "Auto-Deploy via GitHub ativado nativamente no Render ao fazer push para 'main'.",
                "github_branch": "main",
            }), 200
        try:
            resp = requests.post(hook_url, timeout=5.0)
            return jsonify({"ok": resp.status_code in (200, 201), "status_code": resp.status_code}), resp.status_code
        except requests.RequestException as err:
            return jsonify({"ok": False, "error": str(err)}), 502
