# Build-Setup.ps1

# Ensure script execution stops on error
$ErrorActionPreference = "Continue"

# Determine the OS-specific vcpkg list file
if ($IsWindows) {
    $vcpkgListPath = "vcpkg-list-windows.json"
}
elseif ($IsLinux) {
    $vcpkgListPath = "vcpkg-list-linux.json"
}
elseif ($IsMacOS) {
    $vcpkgListPath = "vcpkg-list-macos.json"
}
else {
    throw "Unsupported OS"
}

# Read the vcpkg package list from the determined JSON file
$vcpkgList = Get-Content -Path $vcpkgListPath -Raw | ConvertFrom-Json

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
    try {
        Install-VcpkgPackage $pkg.package_name
    }
    catch {
        Write-Host "Failed to install $pkg.package_name, continue with other packages..."
    }
}

Write-Host "All specified packages have been installed using the default triplets, duplicates skipped."
