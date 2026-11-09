param(
    [string]$TestScript = "scripts/test-meta-whatsapp.ts"
)

$proc = Start-Process -FilePath "npx.cmd" -ArgumentList "--offline", "prisma", "dev", "--db-port", "5433" -PassThru -NoNewWindow
Write-Host "Iniciando Prisma Postgres local en puerto 5433 (PID: $($proc.Id))..."

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", 5433)
        if ($tcp.Connected) {
            $tcp.Close()
            $ready = $true
            Write-Host "Postgres listo en 127.0.0.1:5433!"
            break
        }
    } catch {
        # Puerto an no abierto
    }
}

if (-not $ready) {
    Write-Host "Error: No se pudo levantar el servidor Postgres en 30 segundos."
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

try {
    Write-Host "Ejecutando: $TestScript..."
    & npx.cmd tsx $TestScript
}
finally {
    Write-Host "Deteniendo servidor Postgres local..."
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Get-Process -Name "*postgres*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
