# Define the path to the vcpkg executable
$vcpkgPath = Join-Path $env:VCPKG_ROOT "vcpkg.exe"

# Execute vcpkg list and capture the output in JSON format
$vcpkgListOutput = & $vcpkgPath list --x-json | ConvertFrom-Json

# Prepare an empty list to hold the dependency objects and overrides
$dependencies = @()
$overrides = @()

# Iterate through each package in the JSON output
foreach ($key in $vcpkgListOutput.PSObject.Properties.Name) {
    $package = $vcpkgListOutput.$key

    if ($package.package_name -match "boost") {
        continue
    }

    # Skip duplicates
    if ($dependencies.name -contains $package.package_name) {
        continue
    }

    # Create an object for each dependency without specifying a version
    $depObject = [PSCustomObject]@{
        name               = $package.package_name
        features           = $package.features ?? @()
        # "default-features" = $true
    }

    # Create an override object with the version and port-version
    # $ovrObject = [PSCustomObject]@{
    #     name           = $package.package_name
    #     version        = $package.version
    #     "port-version" = $package.port_version
    # }
    
    # Add the dependency and override object to their respective lists
    $dependencies += $depObject
    # $overrides += $ovrObject
}

# Read the version from ./ux/package.json
$uxPackageJsonPath = Join-Path $PSScriptRoot "ux\package.json"
$uxPackageJson = Get-Content $uxPackageJsonPath | ConvertFrom-Json
$projectVersion = $uxPackageJson.version

# Create the vcpkg.json structure
$vcpkgJson = [ordered]@{
    '$schema'    = "https://raw.githubusercontent.com/microsoft/vcpkg-tool/main/docs/vcpkg.schema.json"
    name         = "wingman"
    version      = $projectVersion
    dependencies = $dependencies
    overrides    = $overrides
}

# Convert the structure to JSON with pretty printing
$jsonContent = $vcpkgJson | ConvertTo-Json -Depth 100

# Determine the output path based on platform
$outputPathSuffix = switch ($true) {
    $IsWindows {
        "windows" 
    }
    $IsLinux {
        "linux" 
    }
    $IsMacOS {
        "macos" 
    }
    default {
        "unknown" 
    }
}
$outputPath = Join-Path $PSScriptRoot ("vcpkg-" + $outputPathSuffix + ".json")

# Write the JSON content to the file
$jsonContent | Out-File -FilePath $outputPath -Encoding utf8
Write-Host "vcpkg manifest has been generated at $outputPath"
