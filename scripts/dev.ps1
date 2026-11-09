# ASKR EV Development Startup Script
Write-Host "Starting ASKR EV Development Servers..." -ForegroundColor Cyan

# Start API in background or new terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..'; pnpm dev:api"

# Start Web in foreground
cd "$PSScriptRoot\.."
pnpm dev:web
