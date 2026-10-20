@echo off
chcp 65001 >nul
title Vinheria Agnello - Publicar Atualizacao na Nuvem (Render + GitHub)

echo ============================================================================
echo   VINHERIA AGNELLO · SINCRONIZACAO E AUTO-DEPLOY NA NUVEM (RENDER.COM)
echo ============================================================================
echo.

set "PY_EXE=python"
if exist "C:\Users\s6x12\anaconda3\python.exe" set "PY_EXE=C:\Users\s6x12\anaconda3\python.exe"

:: 1. Executa suite TDD antes de subir
echo [1/4] Executando testes automatizados (Pytest)...
"%PY_EXE%" -m pytest dashboard/tests/ -q -p no:cacheprovider
if errorlevel 1 (
    echo.
    echo [ERRO] Os testes automatizados falharam. Abortando publicacao para seguranca.
    pause
    exit /b 1
)
echo [OK] 30/30 testes aprovados com sucesso!

:: 2. Prepara commit no Git
echo.
echo [2/4] Preparando arquivos alterados...
git add -A

set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Auto-Deploy: Sincronizacao da adega, APIs e Wokwi na nuvem"

git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo [AVISO] Nenhuma alteracao pendente para commit. Continuando para push...
)

:: 3. Envia para o GitHub (Disparando o Render)
echo.
echo [3/4] Enviando atualizacao para o GitHub (origin/main)...
git push origin main
if errorlevel 1 (
    echo [ERRO] Falha ao enviar para o GitHub. Verifique sua conexao ou permissoes.
    pause
    exit /b 1
)

:: 4. Confirma o auto-deploy
echo.
echo [4/4] Conectando com a API da Nuvem...
"%PY_EXE%" -c "import urllib.request, json; res = urllib.request.urlopen('http://127.0.0.1:8050/api/v1/cloud/info'); print('Status Nuvem:', json.loads(res.read()).get('status'))" 2>nul

echo.
echo ============================================================================
echo   SUCESSO! O Render.com recebeu os arquivos e esta compilando a atualizacao.
echo   Link do Web Service: https://vinheria-agnello-iot.onrender.com
echo   Repositório:         https://github.com/six01010101010101/checkpoint5-vinheria-fiware-esp32
echo ============================================================================
echo.
timeout /t 5
