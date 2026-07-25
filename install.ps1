# CSP Installer for Windows (PowerShell 5.1+)
# Usage: .\install.ps1 [-Platform <name>] [-Target <path>] [-Uninstall] [-List]
#
# Supports: claude-code, cursor, windsurf, vscode
# Mirrors install.sh functionality for Windows users.

[CmdletBinding()]
param(
    [string]$Platform = "",
    [string]$Target = ".",
    [switch]$Uninstall,
    [switch]$List
)

$ErrorActionPreference = "Stop"
$Version = "0.7.1"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CspLayers = @("csp-router", "csp-meta", "csp-workflow", "csp-patterns", "csp-runtime")
$SentinelBegin = "<!-- csp-begin (do not edit between these markers) -->"
$SentinelEnd = "<!-- csp-end -->"

# Platform metadata
$PlatformDirs = @{
    "claude-code" = ".claude\skills"
    "cursor"      = ".cursor\skills"
    "windsurf"    = ".windsurf\skills"
    "vscode"      = ".github\skills"
}

$BootstrapFiles = @{
    "claude-code" = "CLAUDE.md"
    "cursor"      = ".cursorrules"
    "windsurf"    = ".windsurfrules"
    "vscode"      = ".github\copilot-instructions.md"
}

$PlatformNames = @{
    "claude-code" = "Claude Code"
    "cursor"      = "Cursor"
    "windsurf"    = "Windsurf"
    "vscode"      = "VS Code (Copilot)"
}

function Write-Status($msg) { Write-Host "  CSP: $msg" -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg)   { Write-Host "  [!] $msg" -ForegroundColor Yellow }

# --- List mode ---
if ($List) {
    Write-Host "CSP Installer v$Version - Supported platforms (Windows):"
    foreach ($p in $PlatformNames.Keys | Sort-Object) {
        Write-Host "  $p  ($($PlatformNames[$p]))"
    }
    exit 0
}

# --- Resolve platform ---
if (-not $Platform) {
    # Auto-detect from target directory
    $targetPath = Resolve-Path $Target -ErrorAction SilentlyContinue
    if ($targetPath) {
        if (Test-Path (Join-Path $targetPath ".claude")) { $Platform = "claude-code" }
        elseif (Test-Path (Join-Path $targetPath ".cursor")) { $Platform = "cursor" }
        elseif (Test-Path (Join-Path $targetPath ".windsurf")) { $Platform = "windsurf" }
        elseif (Test-Path (Join-Path $targetPath ".github")) { $Platform = "vscode" }
    }
    if (-not $Platform) {
        Write-Warn "No platform detected. Use -Platform <name>. Run with -List to see options."
        exit 1
    }
}

$Platform = $Platform.ToLower()
if (-not $PlatformDirs.ContainsKey($Platform)) {
    Write-Warn "Unsupported platform: $Platform. Supported: $($PlatformDirs.Keys -join ', ')"
    exit 1
}

$targetPath = Resolve-Path $Target -ErrorAction SilentlyContinue
if (-not $targetPath) {
    New-Item -ItemType Directory -Path $Target -Force | Out-Null
    $targetPath = Resolve-Path $Target
}

# --- Uninstall ---
if ($Uninstall) {
    Write-Status "Uninstalling CSP from $targetPath ..."
    $skillsDir = Join-Path $targetPath $PlatformDirs[$Platform]
    if (Test-Path $skillsDir) {
        Remove-Item -Recurse -Force $skillsDir
        Write-Ok "Removed $skillsDir"
    }
    $bootstrapFile = Join-Path $targetPath $BootstrapFiles[$Platform]
    if (Test-Path $bootstrapFile) {
        $content = Get-Content $bootstrapFile -Raw
        if ($content -match [regex]::Escape($SentinelBegin)) {
            $before = $content.Substring(0, $content.IndexOf($SentinelBegin)).TrimEnd()
            $afterIdx = $content.IndexOf($SentinelEnd)
            $after = ""
            if ($afterIdx -ge 0) {
                $after = $content.Substring($afterIdx + $SentinelEnd.Length).TrimStart()
            }
            $remaining = "$before`n$after".Trim()
            if ($remaining) {
                Set-Content -Path $bootstrapFile -Value $remaining -NoNewline
                Write-Ok "Cleaned CSP section from $($BootstrapFiles[$Platform])"
            } else {
                Remove-Item $bootstrapFile
                Write-Ok "Removed $($BootstrapFiles[$Platform])"
            }
        }
    }
    Write-Ok "Uninstall complete."
    exit 0
}

# --- Install ---
Write-Status "Installing CSP v$Version for $($PlatformNames[$Platform]) -> $targetPath"

# Verify layer directories exist
$missingLayers = @()
foreach ($layer in $CspLayers) {
    if (-not (Test-Path (Join-Path $ScriptDir $layer))) { $missingLayers += $layer }
}
if ($missingLayers.Count -gt 0) {
    Write-Warn "Missing layer directories: $($missingLayers -join ', '). Run from CSP repo root."
    exit 1
}

# Copy layers
$destSkills = Join-Path $targetPath $PlatformDirs[$Platform]
foreach ($layer in $CspLayers) {
    $src = Join-Path $ScriptDir $layer
    $dest = Join-Path $destSkills $layer
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    Copy-Item -Recurse -Force $src $dest
    Write-Ok "Copied $layer"
}

# Generate bootstrap content
$skillCount = (Get-ChildItem -Recurse -Filter "SKILL.md" -Path $destSkills).Count
$bootstrapContent = @"
# CSP (Code Skills Package)

This project has CSP installed ($skillCount skills, 5-layer architecture).

## Usage

When given a task, route through csp-router first to select the appropriate skill combination.

## Core Rules

1. Route through csp-router before starting any task
2. Design before code - brainstorm and plan for feature work
3. Tests before implementation - TDD workflow
4. Verify before done - run validation commands

## Available Skills

Skills are in ``$($PlatformDirs[$Platform])`` organized by 5-layer architecture.
"@

# Write bootstrap file with sentinels
$bootstrapFile = Join-Path $targetPath $BootstrapFiles[$Platform]
$bootstrapDir = Split-Path $bootstrapFile -Parent
if (-not (Test-Path $bootstrapDir)) { New-Item -ItemType Directory -Path $bootstrapDir -Force | Out-Null }

$wrappedContent = "$SentinelBegin`n$bootstrapContent`n$SentinelEnd"

if (Test-Path $bootstrapFile) {
    $existing = Get-Content $bootstrapFile -Raw
    if ($existing -match [regex]::Escape($SentinelBegin)) {
        # Replace existing CSP section
        $before = $existing.Substring(0, $existing.IndexOf($SentinelBegin)).TrimEnd()
        $afterIdx = $existing.IndexOf($SentinelEnd)
        $after = ""
        if ($afterIdx -ge 0) { $after = $existing.Substring($afterIdx + $SentinelEnd.Length).TrimStart() }
        Set-Content -Path $bootstrapFile -Value "$before`n`n$wrappedContent`n$after" -NoNewline
    } else {
        Add-Content -Path $bootstrapFile -Value "`n`n$wrappedContent"
    }
    Write-Ok "Updated $($BootstrapFiles[$Platform])"
} else {
    Set-Content -Path $bootstrapFile -Value $wrappedContent -NoNewline
    Write-Ok "Created $($BootstrapFiles[$Platform])"
}

Write-Host ""
Write-Ok "CSP installed successfully for $($PlatformNames[$Platform]) ($skillCount skills)"
Write-Status "To uninstall: .\install.ps1 -Platform $Platform -Target `"$Target`" -Uninstall"
