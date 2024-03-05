param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("windows", "linux", "macos")]
    [string]$BuildPlatform,

    [Parameter(Mandatory = $false)]
    [switch]$Force
)

try {
    # Clean up the previous build artifacts

    if ($Force) {
        Write-Host "Cleaning previous build artifacts..."
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue out
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .next
    }

    # Install dependencies
    Write-Host "Installing Node dependencies..."
    # npm ci --cache .npm --prefer-offline
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed" 
    }

    # Build the project
    Write-Host "Building the project..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed" 
    }

    # Copy static files needed by Electron
    Write-Host "Copying static files for Electron..."
    Copy-Item ".next/static" ".next/standalone/.next" -Recurse -Force

    # Determine architecture based on platform
    $arch = "x64"
    $platform = ""
    switch ($BuildPlatform) {
        "windows" {
            $platform = "win32"
        }
        "linux" {
            $platform = "linux"
        }
        "macos" {
        } # For universal macOS build
        default {
            throw "Unsupported platform: $BuildPlatform" 
        }
    }

    # Build the Electron app
    Write-Host "Build and Publish Electron app..."
    if ($BuildPlatform -eq "macos") {
        # build x64 and arm64
        # ./node_modules/.bin/electron-forge publish --platform=darwin --arch="x64,arm64"
        ./node_modules/.bin/electron-forge publish --platform=darwin --arch=x64
        ./node_modules/.bin/electron-forge publish --platform=darwin --arch=arm64
    } else {
        ./node_modules/.bin/electron-forge publish --platform=$platform --arch=$arch 
    }
    if ($LASTEXITCODE -ne 0) {
        throw "electron-forge publish failed" 
    }

    Write-Host "UX build completed successfully."
}
catch {
    Write-Error "An error occurred during the UX build process: $_"
    exit 1
}
