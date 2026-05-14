param(
    [string]$AddonDir = "addon",
    [string]$OutputDir = "dist"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot $AddonDir
if (-not (Test-Path -LiteralPath $source)) {
    throw "Addon directory not found: $source"
}

$manifestPath = Join-Path $source "manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json

function Resolve-ManifestMessage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    if ($Value -notmatch '^__MSG_(.+)__$') {
        return $Value
    }

    $messageKey = $Matches[1]
    $locales = @()
    if ($manifest.default_locale) {
        $locales += $manifest.default_locale
    }
    $locales += @("en_US", "zh_CN")

    foreach ($locale in ($locales | Select-Object -Unique)) {
        $messagesPath = Join-Path $source "_locales\$locale\messages.json"
        if (-not (Test-Path -LiteralPath $messagesPath)) {
            continue
        }
        try {
            $messages = Get-Content -LiteralPath $messagesPath -Raw | ConvertFrom-Json
        }
        catch {
            continue
        }
        $entry = $messages.PSObject.Properties[$messageKey].Value
        if ($entry -and $entry.message) {
            return $entry.message
        }
    }

    return $messageKey
}

$packageName = Resolve-ManifestMessage -Value $manifest.name
$safeName = ($packageName -replace '[^A-Za-z0-9._-]+', '-').Trim('-').ToLowerInvariant()
$version = $manifest.version
$dist = Join-Path $repoRoot $OutputDir
New-Item -ItemType Directory -Force -Path $dist | Out-Null

$xpiPath = Join-Path $dist "$safeName-$version.xpi"
if (Test-Path -LiteralPath $xpiPath) {
    Remove-Item -LiteralPath $xpiPath
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($xpiPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $sourcePrefix = $source.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    Get-ChildItem -LiteralPath $source -Recurse -File | Sort-Object FullName | ForEach-Object {
        $relative = $_.FullName.Substring($sourcePrefix.Length)
        $entryName = $relative -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip,
            $_.FullName,
            $entryName,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
}
finally {
    $zip.Dispose()
}

Write-Host "Created $xpiPath"
