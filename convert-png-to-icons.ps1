param (
    [string]$InputFilePath
)

# Verify the input file exists
if (-Not (Test-Path -Path $InputFilePath)) {
    Write-Error "File not found: $InputFilePath"
    exit 1
}

# Extract the file base name and directory for output
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($InputFilePath)
$outputDirectory = [System.IO.Path]::GetDirectoryName($InputFilePath)

# Windows icon sizes
$winSizes = @(256, 512)
$winIconPath = "$outputDirectory\$baseName.ico"

# MacOS icon sizes (considering up to 1024 for best support, adjust as needed)
$macSizes = @(512, 1024)
$macIconPath = "$outputDirectory\$baseName.icns"

# Generate Windows .ico file
$winCommands = $winSizes -join ","
magick convert $InputFilePath -define icon:auto-resize=$winCommands $winIconPath

# Check if running on macOS
if ($IsMacOS) {
    # Generate MacOS .icns file
    $iconSetPath = "$outputDirectory\$baseName.iconset"
    New-Item -ItemType Directory -Force -Path $iconSetPath

    $macSizes | ForEach-Object {
        $size = $_
        $tempPng = "$outputDirectory\temp_${size}x${size}.png"
        magick convert $InputFilePath -resize ${size}x${size} $tempPng
        $destPng = "$iconSetPath\icon_${size}x${size}.png"
        Move-Item -Path $tempPng -Destination $destPng
    }

    # Use iconutil to create the .icns file
    & iconutil -c icns $iconSetPath
    Remove-Item -Recurse -Force $iconSetPath
}
else {
    # For non-macOS systems, just prepare the PNG files
    $macSizes | ForEach-Object {
        $size = $_
        $tempPng = "$outputDirectory\temp_${size}x${size}.png"
        magick convert $InputFilePath -resize ${size}x${size} $tempPng
    }
}

# Cleanup temp files (if any remain)
Get-ChildItem $outputDirectory -Filter "temp_*.png" | Remove-Item

Write-Host "Icon generation complete. Windows icon: $winIconPath"
if ($IsMacOS) {
    Write-Host "MacOS icon created: $macIconPath"
}
else {
    Write-Host "MacOS icon preparation done. Please run 'iconutil' on a MacOS system to create the .icns file."
}
