param(
    [string]$tag
)

function IsValidSemanticVersion($checkTag) {
    return $checkTag -match '^v?\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$'
}

# Fetch the latest tag if not provided or if the provided tag is not valid
if (-not (IsValidSemanticVersion $tag)) {
    $latestRelease = gh release list | Select-Object -First 1 | ForEach-Object { ($_ -split '\s+')[0] }
    if (-not [string]::IsNullOrWhiteSpace($latestRelease)) {
        $tag = $latestRelease
    }
    else {
        Write-Error "No valid tag provided and unable to find the latest release."
        exit 1
    }
}

# Fetch release assets
$json = gh release view $tag --json assets
if (-not $json) {
    Write-Error "Failed to fetch release assets."
    exit 1
}
$assets = $json | ConvertFrom-Json

# Initialize markdown sections
$markdownWindows = "### Download for Windows 7+`n`n| Architecture | Format | Download Link | Size |`n|--------------|--------|---------------|------|"
$markdownMacOS = "### Download for MacOS (Apple Silicon and Intel)`n`n| Architecture | Format | Download Link | Size |`n|--------------|--------|---------------|------|"

# Process Windows downloads
foreach ($asset in $assets.assets | Where-Object { $_.contentType -match "application/x-msdos-program" }) {
    $format = "Installer (.exe)"
    $architecture = "Intel x64" # Simplified assumption for Windows
    $size = [math]::Round($asset.size / 1MB, 2)
    $downloadUrl = $asset.url
    $markdownWindows += "`n| $architecture | $format | [Download]($downloadUrl) | ${size} MB |"
}

# Process MacOS downloads
foreach ($asset in $assets.assets | Where-Object { $_.contentType -match "application/x-apple-diskimage" }) {
    $format = "Disk Image (.dmg)"
    $architecture = if ($asset.name -match 'arm64') {
        "Apple Silicon" 
    }
    else {
        "Intel" 
    }
    $size = [math]::Round($asset.size / 1MB, 2)
    $downloadUrl = $asset.url
    $markdownMacOS += "`n| $architecture | $format | [Download]($downloadUrl) | ${size} MB |"
}

# Combine the markdown sections
# $markdown = @"
# ## Download Wingman $tag

# $markdownWindows

# $markdownMacOS
# "@
$markdown = @"
$markdownWindows

$markdownMacOS
"@

# Output the markdown content
$markdown
