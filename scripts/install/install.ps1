# INSTALL-001: compatible with built-in Windows PowerShell 5.1.
param(
    [string]$Version = '0.1.0',
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'listenee-ltm\bin')
)
$ErrorActionPreference = 'Stop'
if ($Version -notmatch '^[0-9A-Za-z.-]+$') { throw 'Invalid version' }
$architecture = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
if ($architecture -ne 'AMD64') { throw 'Supported Windows architecture: x64' }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = "https://github.com/pollux-o4/listeneeLTM/releases/download/v$Version"
$asset = 'ltm-win32-x64.exe'
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$InstallDir = (Resolve-Path -LiteralPath $InstallDir).Path
$stage = Join-Path $InstallDir ([IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $stage | Out-Null
try {
    $binary = Join-Path $stage 'ltm.exe'
    Invoke-WebRequest -UseBasicParsing -Uri "$base/$asset" -OutFile $binary
    $checksumFile = Join-Path $stage 'SHA256SUMS'
    Invoke-WebRequest -UseBasicParsing -Uri "$base/SHA256SUMS" -OutFile $checksumFile
    $checksums = Get-Content -Raw $checksumFile
    $matches = @([regex]::Matches($checksums, "(?m)^([0-9a-fA-F]{64})  $([regex]::Escape($asset))\r?$") )
    if ($matches.Count -ne 1) { throw 'Invalid release checksum' }
    if ((Get-FileHash -Algorithm SHA256 $binary).Hash -ne $matches[0].Groups[1].Value) {
        throw 'Checksum mismatch; existing installation preserved.'
    }
    & $binary --version
    if ($LASTEXITCODE -ne 0) { throw 'Downloaded binary cannot run' }
    $destination = Join-Path $InstallDir 'ltm.exe'
    if (Test-Path $destination) {
        if ((Get-Item $destination).PSIsContainer) { throw 'Destination is a directory' }
        [IO.File]::Replace($binary, $destination, $null)
    } else {
        [IO.File]::Move($binary, $destination)
    }
    $userPath = [string][Environment]::GetEnvironmentVariable('Path', 'User')
    if ($InstallDir -notin ($userPath -split ';')) {
        [Environment]::SetEnvironmentVariable('Path', (($userPath.TrimEnd(';') + ';' + $InstallDir).TrimStart(';')), 'User')
    }
    if ($InstallDir -notin ($env:Path -split ';')) { $env:Path += ";$InstallDir" }
    Write-Host "Installed $destination. Run ltm init, then ltm ui. Restart your AI app to load PATH."
} finally {
    Remove-Item -Recurse -Force $stage
}
