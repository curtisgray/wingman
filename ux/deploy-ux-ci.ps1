param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("windows", "windows-cublas", "linux", "linux-cublas", "macos", "macos-metal")]
    [string]$BuildPlatform,

    [Parameter(Mandatory = $false)]
    [switch]$Force,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory = $false)]
    [switch]$SkipDeployment
)

try {
    Write-Host "Starting UX build for Wingman on platform $BuildPlatform"

    if ($SkipBuild) {
        Write-Warning "Skipping UX build..."
    }
    else {
        # Call `build-ux-ci.ps1` to build the UX
        .\build-ux-ci.ps1 -BuildPlatform $BuildPlatform -Force:$Force

        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed" 
        }
    }

    # Conditional appdmg installation for macOS builds
    if ($BuildPlatform -eq "macos-metal") {
        Write-Host "Installing appdmg for macOS..."
        npm install appdmg --save-dev
        if ($LASTEXITCODE -ne 0) {
            throw "npm install appdmg failed"
        }
    }

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
    }
    else {
        Write-Warning "Skipping Electron app build for Linux platform..."
    }

    Write-Host "DEPLOY $command completed successfully."
}
catch {
    Write-Error "An error occurred during the UX build process: $_"
    exit 1
}
