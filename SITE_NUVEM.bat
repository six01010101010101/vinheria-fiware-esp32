@echo off
chcp 65001 >nul
title Vinheria Agnello - Acesso Externo (Site Nuvem)

echo ============================================================================
echo   VINHERIA AGNELLO · LINK DO SITE NA NUVEM (ACESSO EXTERNO SEGURO)
echo ============================================================================
echo.

:: 1. Garante que o servidor local esta rodando
netstat -ano | findstr :8050 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo [1/3] Servidor local nao detectado. Iniciando em segundo plano...
    call "%~dp0INICIAR_EM_SEGUNDO_PLANO.bat" >nul 2>&1
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] Servidor local ja esta ativo na porta 8050.
)

:: 2. Obtem o IP publico (senha do localtunnel)
echo [2/3] Identificando credencial de acesso seguro...
set "TUNNEL_PWD="
for /f "delims=" %%i in ('curl.exe -s https://loca.lt/mytunnelpassword 2^>nul') do set "TUNNEL_PWD=%%i"
if "%TUNNEL_PWD%"=="" (
    for /f "delims=" %%i in ('curl.exe -s https://api.ipify.org 2^>nul') do set "TUNNEL_PWD=%%i"
)

echo.
echo ============================================================================
echo   INSTRUCOES PARA ACESSO EXTERNO AO SITE NUVEM:
echo ============================================================================
echo   1. Acesse ou compartilhe o link seguro gerado abaixo (celular ou computador).
echo   2. Se a tela solicitar "Tunnel Password" ou "Click to Submit":
echo      Basta preencher o IP da credencial: %TUNNEL_PWD% e clicar no botao azul.
echo   3. Pronto! O site completo da adega estara acessivel em tempo real.
echo.
echo   IMPORTANTE: Mantenha esta janela aberta enquanto o acesso estiver em uso.
echo ============================================================================
echo.
echo [3/3] Criando conexao publica segura HTTPS...
echo.

call "C:\Program Files\nodejs\npx.cmd" --yes localtunnel --port 8050
pause
