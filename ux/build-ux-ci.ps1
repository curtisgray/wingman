param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("windows", "windows-cublas", "linux", "linux-cublas", "macos", "macos-metal")]
    [string]$BuildPlatform,

    [Parameter(Mandatory = $false)]
    [switch]$Force,

    [Parameter(Mandatory = $false)]
    [switch]$SkipDeployment,

    [Parameter(Mandatory = $false)]
    [switch]$SkipNpmInstall
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

    if (-not $SkipNpmInstall) {
        
        # Install dependencies
        Write-Host "Installing Node dependencies..."
        # skip dev dependencies on linux platform
        if ($platform -eq "linux") {
            npm ci --cache .npm --prefer-offline --production
        }
        else {
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
    }
    # Build the project
    Write-Host "Building the project..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed" 
    }

    if ($SkipDeployment) {
        Write-Warning "Skipping deployment..."
    }
    else {
        # Copy the dist folder to wingman.cpp if the ../services/wingman.cpp/wingman folder exists
        $distRoot = "../services/wingman.cpp/wingman"
        if (Test-Path $distRoot) {
            Write-Host "Copying dist folder to wingman.cpp..."    
            Copy-Item -Recurse -Force -ErrorAction SilentlyContinue ./dist ../services/wingman.cpp/wingman/
        }
        else {
            Write-Warning "wingman.cpp folder not found. Skipping copy of dist folder..."
        }
    }
    
    Write-Host "UX $command completed successfully."
}
catch {
    Write-Error "An error occurred during the UX build process: $_"
    exit 1
}
