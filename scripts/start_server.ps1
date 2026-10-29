# ==============================================================================
# Script de Inicializacao Automatica em Background — Vinheria Agnello (Porta 8050)
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$HookMode
)

$port = 8050
$activeConn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if (-not $activeConn) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $rootDir = Split-Path -Parent $scriptDir
    $dashboardDir = Join-Path $rootDir "dashboard"

    $pythonExe = "python"
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) { $pythonExe = $cmd.Source }

    $logFile = Join-Path $dashboardDir "server.log"
    Start-Process -FilePath $pythonExe `
        -ArgumentList "app.py" `
        -WorkingDirectory $dashboardDir `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $logFile `
        -WindowStyle Hidden
}

if ($HookMode) {
    Write-Output "{}"
} else {
    Write-Output "Vinheria Agnello rodando na porta $port (http://localhost:$port)"
}
