@echo off
chcp 65001 >nul
title Vinheria Agnello - Encerrar Servidor

echo ============================================================================
echo   VINHERIA AGNELLO · PARANDO SERVIDOR LOCAL (PORTA 8050)
echo ============================================================================

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8050 ^| findstr LISTENING') do (
    echo Encerrando processo PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [OK] Servidor da Vinheria Agnello finalizado com sucesso.
timeout /t 3
