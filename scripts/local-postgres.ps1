param(
  [ValidateSet("setup", "start", "stop", "status")]
  [string]$Action = "start"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot ".local"
$archiveDirectory = Join-Path $localRoot "downloads"
$archivePath = Join-Path $archiveDirectory "postgresql-17.11-1-windows-x64-binaries.zip"
$postgresRoot = Join-Path $localRoot "pgsql"
$dataDirectory = Join-Path $localRoot "postgres-data"
$logPath = Join-Path $localRoot "postgres.log"
$passwordPath = Join-Path $localRoot "pg-password.txt"
$pgCtl = Join-Path $postgresRoot "bin\pg_ctl.exe"
$initDb = Join-Path $postgresRoot "bin\initdb.exe"
$createdb = Join-Path $postgresRoot "bin\createdb.exe"
$psql = Join-Path $postgresRoot "bin\psql.exe"
$postgres = Join-Path $postgresRoot "bin\postgres.exe"
$downloadUrl = "https://get.enterprisedb.com/postgresql/postgresql-17.11-1-windows-x64-binaries.zip"
$expectedSha256 = "6EABDF00D2893713B75DB4336A23C3FDF505F056E217EC6E2E95D901750CFEA3"

function Assert-PortablePostgres {
  if (-not (Test-Path -LiteralPath $pgCtl)) {
    throw "Portable PostgreSQL is not prepared. Run: npm run db:local:setup"
  }
}

function Get-ServerStatus {
  if (-not (Test-Path -LiteralPath $psql) -or -not (Test-Path -LiteralPath $dataDirectory)) {
    return $false
  }
  $env:PGPASSWORD = "tactlex"
  $probe = Start-Process -FilePath $psql -ArgumentList "-h", "127.0.0.1", "-p", "5432", "-U", "tactlex", "-d", "postgres", "-tAc", "SELECT/**/1" -WindowStyle Hidden -Wait -PassThru
  return $probe.ExitCode -eq 0
}

function Start-LocalPostgres {
  Assert-PortablePostgres
  if (Get-ServerStatus) {
    Write-Host "TactLex PostgreSQL is already running on 127.0.0.1:5432."
    return
  }
  $standardOutputPath = Join-Path $localRoot "postgres.stdout.log"
  Start-Process -FilePath $postgres -ArgumentList "-D", "`"$dataDirectory`"" -WindowStyle Hidden -RedirectStandardError $logPath -RedirectStandardOutput $standardOutputPath | Out-Null
  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    Start-Sleep -Milliseconds 250
    if (Get-ServerStatus) {
      Write-Host "TactLex PostgreSQL started on 127.0.0.1:5432."
      return
    }
  }
  throw "PostgreSQL did not start. Inspect $logPath"
}

function Ensure-Database([string]$databaseName) {
  $env:PGPASSWORD = "tactlex"
  $exists = & $psql -h "127.0.0.1" -p "5432" -U "tactlex" -d "postgres" -tAc "SELECT 1 FROM pg_database WHERE datname = '$databaseName'"
  if ($LASTEXITCODE -ne 0) {
    throw "Could not inspect local PostgreSQL databases."
  }
  if ($exists.Trim() -ne "1") {
    & $createdb -h "127.0.0.1" -p "5432" -U "tactlex" $databaseName
    if ($LASTEXITCODE -ne 0) {
      throw "Could not create database $databaseName."
    }
  }
}

if ($Action -eq "setup") {
  New-Item -ItemType Directory -Path $localRoot, $archiveDirectory -Force | Out-Null

  if (-not (Test-Path -LiteralPath $pgCtl)) {
    if (-not (Test-Path -LiteralPath $archivePath)) {
      Write-Host "Downloading PostgreSQL 17.11 portable binaries from EDB..."
      Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath -UseBasicParsing
    }
    $actualSha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
    if ($actualSha256 -ne $expectedSha256) {
      throw "PostgreSQL archive checksum mismatch. The archive was retained for inspection."
    }
    Expand-Archive -LiteralPath $archivePath -DestinationPath $localRoot
  }

  if (-not (Test-Path -LiteralPath $dataDirectory)) {
    Set-Content -LiteralPath $passwordPath -Value "tactlex" -NoNewline
    & $initDb -D $dataDirectory -U "tactlex" --pwfile=$passwordPath --auth-host="scram-sha-256" --auth-local="trust" --encoding="UTF8" --locale="C"
    if ($LASTEXITCODE -ne 0) {
      throw "PostgreSQL cluster initialization failed."
    }
    $configurationPath = Join-Path $dataDirectory "postgresql.conf"
    $configuration = Get-Content -LiteralPath $configurationPath -Raw
    $configuration = $configuration -replace "(?m)^#listen_addresses\s*=.*$", "listen_addresses = '127.0.0.1'"
    $configuration = $configuration -replace "(?m)^#port\s*=.*$", "port = 5432"
    Set-Content -LiteralPath $configurationPath -Value $configuration -NoNewline
  }

  $environmentPath = Join-Path $projectRoot ".env"
  if (-not (Test-Path -LiteralPath $environmentPath)) {
    Copy-Item -LiteralPath (Join-Path $projectRoot ".env.example") -Destination $environmentPath
  }

  Start-LocalPostgres
  Ensure-Database "tactlex"
  Ensure-Database "tactlex_test"
  Write-Host "Portable PostgreSQL is ready. Next run migrations and seed."
  exit 0
}

if ($Action -eq "start") {
  Start-LocalPostgres
  exit 0
}

if ($Action -eq "stop") {
  Assert-PortablePostgres
  if (Get-ServerStatus) {
    & $pgCtl -D $dataDirectory stop
  } else {
    Write-Host "TactLex PostgreSQL is not running."
  }
  exit $LASTEXITCODE
}

Assert-PortablePostgres
if (Get-ServerStatus) {
  Write-Host "TactLex PostgreSQL is running on 127.0.0.1:5432."
  exit 0
}
Write-Host "TactLex PostgreSQL is stopped."
exit 1
