#!/usr/bin/env pwsh
# Pull latest database schema from Supabase
# Usage: .\scripts\pull-schema.ps1

Write-Host "Pulling latest schema from Supabase..." -ForegroundColor Green

# Read .env.local for database URL
$envContent = Get-Content .env.local -Raw
$dbUrl = [regex]::Match($envContent, 'DATABASE_URL="([^"]+)"').Groups[1].Value

if (-not $dbUrl) {
    Write-Host "ERROR: DATABASE_URL not found in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "Database URL found" -ForegroundColor Yellow

# Create database directory if not exists
New-Item -ItemType Directory -Force -Path "database" | Out-Null

# Pull schema using pg_dump
Write-Host "Running pg_dump..." -ForegroundColor Yellow

$schemaFile = "database/full_schema_latest.sql"

# Use npx supabase if installed, otherwise use pg_dump directly
if (Get-Command "npx" -ErrorAction SilentlyContinue) {
    npx supabase db dump --db-url $dbUrl --schema public -f $schemaFile
} else {
    Write-Host "npx not found. Using pg_dump directly..." -ForegroundColor Yellow
    pg_dump -h puzvrlojtgneihgvevcx.supabase.co `
            -U postgres `
            --schema=public `
            --schema-only `
            --no-owner `
            --no-acl `
            -f $schemaFile
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Schema pulled successfully to $schemaFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review the schema file" -ForegroundColor White
    Write-Host "2. Update database/SCHEMA.md documentation" -ForegroundColor White
    Write-Host "3. Commit changes to git" -ForegroundColor White
} else {
    Write-Host "✗ Failed to pull schema" -ForegroundColor Red
    exit 1
}
