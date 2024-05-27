param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("windows", "windows-cublas", "linux", "linux-cublas", "macos", "macos-metal")]
    [string]$BuildPlatform,

    [Parameter(Mandatory = $false)]
    [switch]$Force,

    [Parameter(Mandatory = $false)]
    [switch]$SkipCopyTo,

    [Parameter(Mandatory = $false)]
    [switch]$SkipNpmInstall
)

try {
    # Clean up the previous build artifacts

    if ($Force) {
        Write-Host "Cleaning previous build artifacts..."
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist
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
        # # Conditional appdmg installation for macOS builds
        # # if ($BuildPlatform -eq "macos" -or $BuildPlatform -eq "macos-metal") {
        # if ($BuildPlatform -eq "macos-metal") {
        #     Write-Host "Installing appdmg for macOS..."
        #     npm install appdmg --save-dev
        #     if ($LASTEXITCODE -ne 0) {
        #         throw "npm install appdmg failed"
        #     }
        # }
    }
    # Build the project
    Write-Host "Building the project..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed" 
    }

    if ($SkipCopyTo) {
        Write-Warning "Skipping copy to destination..."
    }
    else {
        # Copy the dist folder to wingman.cpp if the ../services/wingman.cpp/wingman folder exists
        $distRoot = "../services/wingman.cpp/wingman"
        $newDestination = Join-Path $distRoot "distadmin"
        if (Test-Path $distRoot) {
            Write-Host "Copying dist [admin] folder to wingman.cpp..."    
            if (Test-Path $newDestination) {
                Remove-Item -Recurse -Force $newDestination # Delete the entire folder if it exists
            }
            Copy-Item -Recurse -Force -ErrorAction SilentlyContinue -Path ./dist -Destination $newDestination
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
