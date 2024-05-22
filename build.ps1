param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("windows", "windows-cublas", "linux", "linux-cublas", "macos", "macos-metal")]
    [string]$BuildPlatform,

    [Parameter(Mandatory = $false)]
    [switch]$Force,

    [Parameter(Mandatory = $false)]
    [switch]$SkipDeployment
)

Push-Location -Path $PSScriptRoot

try {
    Write-Host "Starting build for Wingman on platform: $BuildPlatform"

    # Build Wingman UX
    Write-Host "Building Wingman UX"
    Push-Location -Path "./ux"
    ./build-ux-ci.ps1 -BuildPlatform $BuildPlatform -Force:$Force -SkipDeployment:$SkipDeployment
    if ($LASTEXITCODE -ne 0) {
        throw "Building Wingman UX failed with exit code $LASTEXITCODE" 
    }
    Pop-Location

    # Build Wingman Admin UX
    Write-Host "Building Wingman Admin UX"
    Push-Location -Path "./admin"
    ./build-ux-ci.ps1 -BuildPlatform $BuildPlatform -Force:$Force -SkipDeployment:$SkipDeployment
    if ($LASTEXITCODE -ne 0) {
        throw "Building Wingman Admin UX failed with exit code $LASTEXITCODE" 
    }
    Pop-Location

    # Build Wingman.cpp
    Write-Host "Building Wingman.cpp"
    Push-Location -Path "./services/wingman.cpp"
    ./build-wingman-ci.ps1 -BuildPlatform $BuildPlatform -Force:$Force
    if ($LASTEXITCODE -ne 0) {
        throw "Building Wingman.cpp failed with exit code $LASTEXITCODE" 
    }
    Pop-Location

    # Build Wingman UX
    Write-Host "Deploying Wingman Desktop ..."
    Push-Location -Path "./ux"
    ./deploy-ux-ci.ps1 -BuildPlatform $BuildPlatform -SkipBuild -SkipDeployment:$SkipDeployment
    if ($LASTEXITCODE -ne 0) {
        throw "Deploying Wingman failed with exit code $LASTEXITCODE" 
    }
    Pop-Location

    Write-Host "Build complete successfully"
}
catch {
    Write-Error "An error occurred during the build process: $_"
    exit 1
}
finally {
    Pop-Location
}
