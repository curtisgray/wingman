# Build-Setup.ps1

# Ensure script execution stops on error
$ErrorActionPreference = "Continue"

# Read the vcpkg package list from the JSON file
$vcpkgList = Get-Content -Path "vcpkg-list.json" -Raw | ConvertFrom-Json

# Hashtable to keep track of installed packages
$installedPackages = @{}

# Function to install packages using vcpkg without specifying triplet, avoiding duplicates
function Install-VcpkgPackage {
    param (
        [string]$packageName
    )
    if (-not $installedPackages.ContainsKey($packageName)) {
        Write-Host "Installing $packageName using the default triplet..."
        # Use VCPKG_INSTALLATION_ROOT environment variable to specify the vcpkg root directory
        # & ./vcpkg install $packageName
        & $env:VCPKG_INSTALLATION_ROOT\vcpkg install $packageName
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install $packageName"
        }
        $installedPackages[$packageName] = $true
    }
    else {
        Write-Host "Skipping $packageName, already installed."
    }
}

# Install packages, skipping duplicates
foreach ($key in $vcpkgList.PSObject.Properties.Name) {
    $pkg = $vcpkgList.$key
    Install-VcpkgPackage $pkg.package_name
}

Write-Host "All specified packages have been installed using the default triplets, duplicates skipped."
