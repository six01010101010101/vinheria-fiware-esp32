@echo off
chcp 65001 >nul
title Vinheria Agnello - Inicializacao em Segundo Plano (Sem Antigravity)

echo ============================================================================
echo   VINHERIA AGNELLO · INICIANDO SERVIDOR EM SEGUNDO PLANO
echo   (Nao precisa do Antigravity ou janela aberta para continuar rodando)
echo ============================================================================

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%dashboard"

:: Localiza o executavel pythonw.exe (modo silencioso sem janela preta)
set "PY_EXE="
if exist "C:\Users\s6x12\anaconda3\pythonw.exe" (
    set "PY_EXE=C:\Users\s6x12\anaconda3\pythonw.exe"
) else (
    where pythonw.exe >nul 2>&1
    if not errorlevel 1 (
        set "PY_EXE=pythonw.exe"
    ) else (
        where python.exe >nul 2>&1
        if not errorlevel 1 set "PY_EXE=python.exe"
    )
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
    timeout /t 2 /nobreak >nul
)

echo [2/2] Abrindo navegador em http://127.0.0.1:8050...
start "" "http://127.0.0.1:8050"

echo.
echo ============================================================================
echo   SUCESSO! O site esta rodando em segundo plano.
echo   Voce pode fechar esta janela e o Antigravity que o site continuara ativo.
echo   Para parar o site quando quiser, execute PARAR_SERVIDOR.bat
echo ============================================================================
timeout /t 5
