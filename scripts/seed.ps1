# ASKR EV Database Seed Script
Write-Host "Seeding ASKR EV Database..." -ForegroundColor Cyan
cd "$PSScriptRoot\.."
pnpm db:push
pnpm db:seed
Write-Host "Database Seeding Completed!" -ForegroundColor Green
