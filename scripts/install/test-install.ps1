# INSTALL-001: test the actual Windows installer against a local release fixture.
param([Parameter(Mandatory = $true)][string]$Binary)
$ErrorActionPreference = 'Stop'
$sourceBinary = (Resolve-Path $Binary).Path
$installer = Join-Path $PSScriptRoot 'install.ps1'
$root = Join-Path ([IO.Path]::GetTempPath()) ([IO.Path]::GetRandomFileName())
$oldUserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$oldProcessPath = $env:Path
$script:badChecksum = $false
$script:networkFailure = $false
function Invoke-WebRequest {
    param([switch]$UseBasicParsing, [string]$Uri, [string]$OutFile)
    if ($script:networkFailure) { throw 'Simulated network failure' }
    if ($Uri.EndsWith('/SHA256SUMS')) {
        $hash = (Get-FileHash -Algorithm SHA256 $sourceBinary).Hash.ToLowerInvariant()
        if ($script:badChecksum) { $hash = '0' * 64 }
        Set-Content -Path $OutFile -Value "$hash  ltm-win32-x64.exe"
        return
    }
    Copy-Item $sourceBinary $OutFile
}
try {
    New-Item -ItemType Directory -Path $root | Out-Null
    Push-Location $root
    try {
        & $installer -InstallDir 'relative path'
        if (-not (Test-Path -LiteralPath 'relative path/ltm.exe')) { throw 'Relative install failed' }
    } finally {
        Pop-Location
    }
    $destination = Join-Path $root 'path with spaces'
    & $installer -InstallDir $destination
    $installed = Join-Path $destination 'ltm.exe'
    if ((Get-FileHash $installed).Hash -ne (Get-FileHash $sourceBinary).Hash) { throw 'Install failed' }
    & $installer -InstallDir $destination
    foreach ($failure in @('checksum', 'network')) {
        $script:badChecksum = $failure -eq 'checksum'
        $script:networkFailure = $failure -eq 'network'
        $rejected = $false
        try { & $installer -InstallDir $destination } catch { $rejected = $true }
        if (-not $rejected) { throw "Expected $failure rejection" }
        if ((Get-FileHash $installed).Hash -ne (Get-FileHash $sourceBinary).Hash) { throw 'Existing installation changed' }
        if (@(Get-ChildItem $destination).Count -ne 1) { throw 'Temporary files remain' }
    }
    Write-Host 'INSTALL-001 Windows installer tests passed'
} finally {
    [Environment]::SetEnvironmentVariable('Path', $oldUserPath, 'User')
    $env:Path = $oldProcessPath
    Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
}
