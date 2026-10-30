@echo off
chcp 65001 >nul
title Vinheria Agnello - Inicializacao em Segundo Plano

echo ============================================================================
echo   VINHERIA AGNELLO - INICIANDO SERVIDOR EM SEGUNDO PLANO
echo   (O servidor continuara ativo mesmo apos fechar esta janela)
echo ============================================================================

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

:: 1. Verifica se a porta 8050 ja esta ativa
netstat -ano | findstr :8050 | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo [OK] O servidor ja esta rodando na porta 8050!
    goto :ABRIR_NAVEGADOR
)

:: 2. Identifica Node.js ou Python
set "NODE_EXE="
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
) else (
    where node >nul 2>&1
    if not errorlevel 1 set "NODE_EXE=node"
)

if not "%NODE_EXE%"=="" (
    echo [1/2] Iniciando servidor em segundo plano com Node.js...
    start /B "" "%NODE_EXE%" server.js >nul 2>&1
    ping -n 3 127.0.0.1 >nul
    goto :ABRIR_NAVEGADOR
)

:: Fallback para python
where pythonw.exe >nul 2>&1
if not errorlevel 1 (
    cd /d "%PROJECT_DIR%dashboard"
    start "" pythonw.exe app.py
    ping -n 3 127.0.0.1 >nul
    goto :ABRIR_NAVEGADOR
)

:ABRIR_NAVEGADOR
echo [2/2] Abrindo navegador...
start "" "https://ninixzzs.github.io/vinheria-agnello-cp5-nicolly-vilela/dashboard.html"
start "" "http://127.0.0.1:8050/dashboard.html"

echo.
echo ============================================================================
echo   SUCESSO! O site esta rodando.
echo   Link Local:  http://127.0.0.1:8050/dashboard.html
echo   Link Nuvem:  https://ninixzzs.github.io/vinheria-agnello-cp5-nicolly-vilela/dashboard.html
echo   Para parar o servidor local quando quiser, execute PARAR_SERVIDOR.bat
echo ============================================================================
ping -n 4 127.0.0.1 >nul
