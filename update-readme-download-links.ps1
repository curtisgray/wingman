param(
    [string]$newTag
)

# Determine the path of the README.md file located in the same directory as this script
$scriptPath = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$readmeFilePath = Join-Path -Path $scriptPath -ChildPath "README.md"

# Check if README.md exists
if (-Not (Test-Path -Path $readmeFilePath)) {
    Write-Error "README.md file not found in the script directory."
    exit
}

# Read the content of the README.md file
$content = Get-Content $readmeFilePath -Raw

# Regular expression pattern to match the version number in the download URLs and asset names
$pattern = '(/download/v)([0-9]+\.[0-9]+\.[0-9]+)(/wingman-)([0-9]+\.[0-9]+\.[0-9]+)([^ ]*")'

# Replace the version number in the URL and asset name with the new tag
$updatedContent = $content -replace $pattern, "`$1$newTag`$3$newTag`$5"

# Write the updated content back to the README.md file
Set-Content $readmeFilePath -Value $updatedContent

Write-Host "Download links in README.md have been updated to the new tag: $newTag"
