@echo off
chcp 65001 >nul
title Vinheria Agnello CP5 - Monitoramento Global IoT (Site + Wokwi + API Nuvem)
echo ============================================================================
echo   CHECK POINT 5 - MONITORAMENTO GLOBAL DE VINHERIAS (PLUG-AND-PLAY)
echo   Site Local:  http://127.0.0.1:8050
echo   API Status:  http://127.0.0.1:8050/api/v1/status
echo   API Vinhos:  http://127.0.0.1:8050/api/v1/vineyards
echo   Wokwi ESP32: https://wokwi.com/projects/478106752109243393
echo ============================================================================
echo.

cd /d "%~dp0dashboard"

set "PY_EXE=python"
if exist "C:\Users\s6x12\anaconda3\python.exe" set "PY_EXE=C:\Users\s6x12\anaconda3\python.exe"

echo [1/3] Verificando dependencias Python...
"%PY_EXE%" -m pip install -q -r requirements.txt 2>nul

echo [2/3] Abrindo Site (http://127.0.0.1:8050) e Simulador Wokwi no navegador...
start "" "http://127.0.0.1:8050"
start "" "https://wokwi.com/projects/478106752109243393"

echo [3/3] Iniciando Servidor em Tempo Real (MQTT :1883 + Supabase Cloud + Open-Meteo)...
"%PY_EXE%" app.py
pause
