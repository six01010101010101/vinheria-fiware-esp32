@echo off
chcp 65001 >nul
title Vinheria Agnello - Inicializacao em Segundo Plano

echo ============================================================================
echo   VINHERIA AGNELLO - INICIANDO SERVIDOR EM SEGUNDO PLANO
echo   (O servidor continuara ativo mesmo apos fechar esta janela)
echo ============================================================================

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%dashboard"

:: Localiza o executavel pythonw.exe (modo silencioso sem janela preta)
set "PY_EXE="
where pythonw.exe >nul 2>&1
if not errorlevel 1 (
    set "PY_EXE=pythonw.exe"
) else (
    where python.exe >nul 2>&1
    if not errorlevel 1 set "PY_EXE=python.exe"
)

if "%PY_EXE%"=="" (
    echo [ERRO] Python nao foi encontrado no sistema.
    pause
    exit /b 1
)

:: Verifica se a porta 8050 ja esta ativa
netstat -ano | findstr :8050 | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo [OK] O servidor ja esta rodando na porta 8050!
) else (
    echo [1/2] Iniciando processo em segundo plano com %PY_EXE%...
    start "" "%PY_EXE%" app.py
    ping -n 3 127.0.0.1 >nul
)

echo [2/2] Abrindo navegador em http://127.0.0.1:8050...
start "" "http://127.0.0.1:8050"

echo.
echo ============================================================================
echo   SUCESSO! O site esta rodando em segundo plano.
echo   Voce pode fechar esta janela que o site continuara ativo.
echo   Para parar o site quando quiser, execute PARAR_SERVIDOR.bat
echo ============================================================================
ping -n 4 127.0.0.1 >nul
