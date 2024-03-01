param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("windows", "linux", "macos")]
    [string]$BuildPlatform
)

Push-Location -Path $PSScriptRoot

Write-Host "Building Wingman"

# Build Wingman.cpp

Write-Host "Building Wingman.cpp"
Push-Location -Path "./services/wingman.cpp"
./build-wingman-ci.ps1 -BuildPlatform $BuildPlatform -Force
Pop-Location

# Build Wingman UX

Write-Host "Building Wingman UX"
Push-Location -Path "./ux"
./build-ux-ci.ps1 -BuildPlatform $BuildPlatform
Pop-Location

Write-Host "Build complete"
Pop-Location
