param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("windows", "windows-cublas", "linux", "linux-cublas", "macos", "macos-metal")]
    [string]$BuildPlatform,

    [Parameter(Mandatory = $false)]
    [switch]$Force,

    [Parameter(Mandatory = $false)]
    [switch]$SkipDeployment
)

try {
    # Clean up the previous build artifacts

    if ($Force) {
        Write-Host "Cleaning previous build artifacts..."
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue out
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .next
    }

    # Determine architecture based on platform
    $arch = "x64"
    $platform = ""
    switch ($BuildPlatform) {
        "windows" {
            $platform = "win32"
        }
        "windows-cublas" {
            $platform = "win32"
        }
        "linux" {
            $platform = "linux"
        }
        "linux-cublas" {
            $platform = "linux"
        }
        "macos" {
        } # For universal macOS build
        "macos-metal" {
        } # For universal macOS build
        default {
            throw "Unsupported platform: $BuildPlatform" 
        }
    }

    # Install dependencies
    Write-Host "Installing Node dependencies..."
    # npm ci --cache .npm --prefer-offline
    # skip dev dependencies on linux platform
    if ($platform -eq "linux") {
        npm ci --cache .npm --prefer-offline --production
    } else {
        npm ci --cache .npm --prefer-offline
    }

    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed" 
    }
    # Conditional appdmg installation for macOS builds
    # if ($BuildPlatform -eq "macos" -or $BuildPlatform -eq "macos-metal") {
    if ($BuildPlatform -eq "macos-metal") {
        Write-Host "Installing appdmg for macOS..."
        npm install appdmg --save-dev
        if ($LASTEXITCODE -ne 0) {
            throw "npm install appdmg failed"
        }
    }

    # Build the project
    Write-Host "Building the project..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed" 
    }

    # Copy static files needed by Electron
    Write-Host "Copying static files for Electron..."
    # Copy-Item ".next/static" ".next/standalone/.next" -Recurse -Force

    # Do not build the Electron app if platform is linux
    if ($platform -ne "linux") {
        # Build the Electron app
        Write-Host "Build and Publish Electron app..."
        # set environment variable DEBUG=* to see verbose output
        $oldDebug = $env:DEBUG
        $command = "publish"

        if ($SkipDeployment) {
            $command = "make"
        }

        # $env:DEBUG="*"
        # $env:DEBUG="electron-packager,squirrel"
        if ($BuildPlatform -eq "macos") {
            ./node_modules/.bin/electron-forge $command --platform=darwin --arch=x64
        }
        elseif ($BuildPlatform -eq "macos-metal") {
            ./node_modules/.bin/electron-forge $command --platform=darwin --arch=arm64
        }
        else {
            ./node_modules/.bin/electron-forge $command --platform=$platform --arch=$arch 
        }
        $env:DEBUG = $oldDebug
        if ($LASTEXITCODE -ne 0) {
            throw "electron-forge $command failed" 
        }
    } else {
        Write-Host "Skipping Electron app build for Linux platform..."
    }

    Write-Host "UX $command completed successfully."
}
catch {
    Write-Error "An error occurred during the UX build process: $_"
    exit 1
}
