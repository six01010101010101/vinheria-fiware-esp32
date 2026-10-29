"""
Script de Verificação e Validação da Conexão Supabase Cloud (PostgREST API).
Permite testar em qualquer máquina se a URL e a Anon Key estão funcionando,
se as tabelas foram criadas pelo script SQL e se o ESP32 consegue gravar dados.
"""

import os
from pathlib import Path
import sys
from typing import Dict, Tuple
import requests

DEFAULT_URL = "https://slqozouuqzxwmfswyroo.supabase.co"
DEFAULT_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscW96b3V1cXp4d21mc3d5cm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDkxOTMsImV4cCI6MjEwNzc4NTE5M30."
    "spwyPsi31yzG6rvh2FsSHWM8Fkv2CPLHpUx9Us8aRo4"
)

REQUIRED_TABLES = [
    "vine_devices",
    "vine_trigger_configs",
    "vine_telemetry",
    "real_vineyards_status",
    "cellar_lots",
]


def load_env_credentials() -> Tuple[str, str]:
    """Carrega credenciais do arquivo .env ou variáveis de ambiente."""
    env_file = Path(__file__).resolve().parents[1] / ".env"
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_ANON_KEY", "")

    if env_file.exists() and (not url or not key):
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("\"'")
                if k == "SUPABASE_URL" and not url:
                    url = v
                elif k == "SUPABASE_ANON_KEY" and not key:
                    key = v

    return url or DEFAULT_URL, key or DEFAULT_KEY


def check_table_access(base_url: str, headers: Dict[str, str], table: str) -> bool:
    """Valida leitura da tabela via PostgREST."""
    try:
        resp = requests.get(f"{base_url}/rest/v1/{table}?select=*&limit=1", headers=headers, timeout=5)
        if resp.status_code == 200:
            count = len(resp.json())
            print(f"  [OK] Tabela '{table}': Acesso confirmado ({count} registros na amostra)")
            return True
        print(f"  [ERRO] Tabela '{table}': HTTP {resp.status_code} - {resp.text}")
        return False
    except requests.RequestException as exc:
        print(f"  [FALHA] Tabela '{table}': Falha de rede ({exc})")
        return False


def test_insert_telemetry(base_url: str, headers: Dict[str, str]) -> bool:
    """Testa se o ESP32 consegue inserir uma leitura na tabela vine_telemetry."""
    payload = {
        "device_id": "vine001",
        "temperature": 15.8,
        "humidity": 68.0,
        "luminosity": 9.0,
        "alert_mode": "normal",
        "cellar_health_score": 100,
        "source": "Teste Integracao Python CLI",
    }
    insert_headers = {**headers, "Prefer": "return=representation"}
    try:
        resp = requests.post(f"{base_url}/rest/v1/vine_telemetry", json=payload, headers=insert_headers, timeout=5)
        if resp.status_code in (200, 201):
            created = resp.json()
            row_id = created[0].get("id") if isinstance(created, list) and created else "OK"
            print(f"  [OK] Inserção de Telemetria (ESP32): Sucesso! ID gerado: {row_id}")
            return True
        print(f"  [ERRO] Falha ao inserir telemetria: HTTP {resp.status_code} - {resp.text}")
        return False
    except requests.RequestException as exc:
        print(f"  [FALHA] Inserção de telemetria falhou por rede: {exc}")
        return False


def main() -> int:
    """Executa a rotina completa de diagnóstico Supabase."""
    url, key = load_env_credentials()
    clean_url = url.rstrip("/")
    print("================================================================")
    print("  VINHERIA AGNELLO · TESTE DE CONEXÃO AO SUPABASE CLOUD")
    print("================================================================")
    print(f"Endpoint: {clean_url}")
    print(f"Chave Anon: {key[:20]}...{key[-10:]}")
    print("----------------------------------------------------------------")

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    all_ok = True
    print("[1/2] Verificando tabelas obrigatórias:")
    for table in REQUIRED_TABLES:
        if not check_table_access(clean_url, headers, table):
            all_ok = False

    print("\n[2/2] Testando permissão de escrita do ESP32 (RLS Insert):")
    if not test_insert_telemetry(clean_url, headers):
        all_ok = False

    print("================================================================")
    if all_ok:
        print(">> SUCESSO TOTAL! O Banco de Dados Supabase está 100% pronto!")
        print("   O ESP32 físico e o Dashboard web se conectarão perfeitamente.")
        return 0
    print(">> ATENÇÃO: Houve erros de conexão ou permissão RLS.")
    print("   Execute o script 'supabase_schema.sql' no SQL Editor do Supabase.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
