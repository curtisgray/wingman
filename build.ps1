param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("windows", "linux", "macos")]
    [string]$BuildPlatform
)

Push-Location -Path $PSScriptRoot

try {
    Write-Host "Starting build for Wingman on platform: $BuildPlatform"

    # Build Wingman.cpp
    Write-Host "Building Wingman.cpp"
    Push-Location -Path "./services/wingman.cpp"
    ./build-wingman-ci.ps1 -BuildPlatform $BuildPlatform -Force
    if ($LASTEXITCODE -ne 0) {
        throw "Building Wingman.cpp failed with exit code $LASTEXITCODE" 
    }
    Pop-Location

    # Build Wingman UX
    Write-Host "Building Wingman UX"
    Push-Location -Path "./ux"
    ./build-ux-ci.ps1 -BuildPlatform $BuildPlatform
    if ($LASTEXITCODE -ne 0) {
        throw "Building Wingman UX failed with exit code $LASTEXITCODE" 
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
