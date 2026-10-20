@echo off
chcp 65001 >nul
title Vinheria Agnello - Gerador de Link Publico (Compartilhar com Namorada)

echo ============================================================================
echo   VINHERIA AGNELLO · GERADOR DE LINK PUBLICO INSTANTANEO
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
echo   INSTRUCOES PARA ENVIAR A SUA NAMORADA:
echo ============================================================================
echo   1. Envie o link gerado abaixo para ela (funciona no celular ou computador).
echo   2. Se a tela pedir "Tunnel Password" ou "Click to Submit":
echo      Basta ela digitar o IP: %TUNNEL_PWD% e clicar no botao azul.
echo   3. Pronto! Ela vera o site completo da adega em tempo real.
echo.
echo   IMPORTANTE: Mantenha esta janela aberta enquanto ela estiver acessando.
echo ============================================================================
echo.
echo [3/3] Criando conexao publica segura HTTPS...
echo.

call "C:\Program Files\nodejs\npx.cmd" --yes localtunnel --port 8050
pause
