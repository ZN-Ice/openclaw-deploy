# Aliyunpan CLI Installer for Windows
# Supports: Windows 10/11, Windows Server
# Architectures: x86, x64, ARM64

#Requires -RunAsAdministrator

param(
    [switch]$SkipNodeCheck,
    [switch]$Force
)

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Header {
    Write-ColorOutput "╔════════════════════════════════════════════════════════════╗" "Cyan"
    Write-ColorOutput "║          Aliyunpan CLI Installer for Windows             ║" "Cyan"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝" "Cyan"
    Write-Host ""
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" "Blue"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
}

function Write-Warn {
    param([string]$Message)
    Write-ColorOutput "[WARN] $Message" "Yellow"
}

# Detect system architecture
function Get-SystemArch {
    $arch = [System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture
    switch ($arch) {
        "X64" { return "x64" }
        "X86" { return "x86" }
        "Arm64" { return "arm64" }
        default { return "unknown" }
    }
}

# Check if Node.js is installed
function Test-NodeJs {
    try {
        $nodeVersion = node --version
        if ($nodeVersion) {
            Write-Success "Node.js found: $nodeVersion"
            return $true
        }
    } catch {
        # Node not found
    }
    return $false
}

# Install Node.js
function Install-NodeJs {
    Write-Info "Installing Node.js..."

    # Check if winget is available
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Info "Installing Node.js via winget..."
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements

        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        if (Test-NodeJs) {
            return
        }
    }

    # Fallback to downloading installer
    Write-Info "Downloading Node.js installer..."
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $nodeInstaller = "$env:TEMP\node-installer.msi"

    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        Write-Info "Installing Node.js..."
        Start-Process msiexec.exe -ArgumentList "/i $nodeInstaller /quiet /norestart" -Wait
        Remove-Item $nodeInstaller

        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        Write-Success "Node.js installed successfully!"
    } catch {
        Write-Error "Failed to install Node.js automatically."
        Write-Info "Please install Node.js manually from: https://nodejs.org/"
        exit 1
    }
}

# Add to PATH
function Add-ToPath {
    param([string]$PathToAdd)

    $pathParts = [System.Environment]::GetEnvironmentVariable("Path", "User") -split ';'
    if ($PathToAdd -notin $pathParts) {
        Write-Info "Adding to PATH: $PathToAdd"
        $newPath = ($pathParts + $PathToAdd) -join ';'
        [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Success "Added to PATH (restart terminal required)"
    } else {
        Write-Info "Already in PATH: $PathToAdd"
    }
}

# Main installation function
function Install-Aliyunpan {
    Write-Header

    # Detect architecture
    $arch = Get-SystemArch
    Write-Info "Detected Architecture: $arch"

    # Get script directory
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $installerDir = Join-Path $scriptDir "aliyunpan-installer"

    # Check if installer directory exists
    if (-not (Test-Path $installerDir)) {
        Write-Error "Installer directory not found: $installerDir"
        Write-Info "Please ensure aliyunpan-installer folder exists in the same directory as this script."
        exit 1
    }

    # Check Node.js
    if (-not $SkipNodeCheck -and -not (Test-NodeJs)) {
        Install-NodeJs
    }

    # Change to installer directory
    Set-Location $installerDir

    # Install dependencies
    Write-Info "Installing dependencies..."
    try {
        npm install --production --no-fund --no-audit 2>$null
    } catch {
        Write-Warn "No npm dependencies found or npm install failed"
    }

    # Run the installer
    Write-Info "Starting aliyunpan installation..."
    Write-Host ""

    try {
        node index.js

        Write-Host ""
        Write-Success "═════════════════════════════════════════════════════"
        Write-Success "Installation completed successfully!"
        Write-Success "═════════════════════════════════════════════════════"
        Write-Host ""

        # Get install location
        $installDir = Join-Path $env:USERPROFILE "aliyunpan"
        Write-Info "Installation directory: $installDir"

        # Add to PATH
        if (Test-Path $installDir) {
            Add-ToPath $installDir
        }

        Write-Host ""
        Write-Info "To use aliyunpan:"
        Write-Host "  1. Restart your terminal (or refresh PATH)"
        Write-Host "  2. Run: " -NoNewline
        Write-Host "aliyunpan" -ForegroundColor Green
        Write-Host ""
        Write-Info "For more commands, run: aliyunpan help"
        Write-Host ""

    } catch {
        Write-Error "Installation failed: $_"
        exit 1
    }
}

# Run installation
try {
    Install-Aliyunpan
} catch {
    Write-Error "An error occurred: $_"
    exit 1
}
