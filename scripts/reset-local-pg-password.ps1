<#
    Reset the local Postgres 18 "postgres" password.

    Must run elevated: pg_hba.conf and the service are ACL-locked to the
    service account. Run it as a FILE (not pasted), from an Administrator
    PowerShell:

        powershell -ExecutionPolicy Bypass -File D:\jack\website\scripts\reset-local-pg-password.ps1

    Local auth is switched to `trust` only for as long as the ALTER USER takes,
    and is restored in a finally block so a failure part-way still puts the
    original pg_hba.conf back.
#>

param(
    [string]$Password = 'KTRSRzMDs2xruDFSVgbVqdJR',
    [string]$Service  = 'postgresql-x64-18',
    [string]$PgRoot   = 'C:\Program Files\PostgreSQL\18',
    [int]   $Port     = 5432
)

$ErrorActionPreference = 'Stop'

$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error 'Not elevated. Re-run from an Administrator PowerShell.'
    exit 1
}

$data = Join-Path $PgRoot 'data'
$hba  = Join-Path $data   'pg_hba.conf'
$psql = Join-Path $PgRoot 'bin\psql.exe'
$bak  = Join-Path $data   'pg_hba.conf.bak-reset'

foreach ($p in @($hba, $psql)) {
    if (-not (Test-Path $p)) { Write-Error "Not found: $p"; exit 1 }
}

# Never clobber an existing backup — it may be the last known-good copy from a
# previous interrupted run.
if (Test-Path $bak) {
    $bak = Join-Path $data ('pg_hba.conf.bak-reset-' + (Get-Random))
}

Write-Host "Backing up pg_hba.conf -> $bak"
Copy-Item $hba $bak -Force

try {
    Write-Host 'Setting local auth to trust (temporary)...'
    # -Encoding ascii: a BOM here stops Postgres parsing the file.
    (Get-Content $hba) `
        -replace '^(\s*host\s+all\s+all\s+(127\.0\.0\.1/32|::1/128)\s+)\S+', '$1trust' |
        Set-Content $hba -Encoding ascii

    Restart-Service $Service
    Start-Sleep -Seconds 4

    Write-Host 'Changing password...'
    $sql = "ALTER USER postgres PASSWORD '$Password'"
    & $psql -U postgres -h 127.0.0.1 -p $Port -d postgres -v ON_ERROR_STOP=1 -c $sql
    if ($LASTEXITCODE -ne 0) { throw "psql exited $LASTEXITCODE" }
}
finally {
    Write-Host 'Restoring original pg_hba.conf...'
    Copy-Item $bak $hba -Force
    Restart-Service $Service
    Start-Sleep -Seconds 4
}

# Confirm the new password works against the restored (scram) config.
Write-Host 'Verifying new password...'
$env:PGPASSWORD = $Password
$out = & $psql -U postgres -h 127.0.0.1 -p $Port -d postgres -tAc 'select version()'
$code = $LASTEXITCODE
Remove-Item Env:\PGPASSWORD

if ($code -ne 0) {
    Write-Error 'Password reset did not verify. Original pg_hba.conf has been restored.'
    exit 1
}

Write-Host ''
Write-Host 'SUCCESS - password reset and verified.'
Write-Host $out.Trim()
Write-Host "Backup retained at: $bak"
