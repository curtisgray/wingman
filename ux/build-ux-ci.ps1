param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("windows", "linux", "macos")]
    [string]$BuildPlatform
)

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue out
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .next
npm install
npm run build
Copy-Item ".next/static" ".next/standalone/.next" -Recurse -Force

# Determine architecture based on platform
$arch = switch ($BuildPlatform) {
    "windows" {
        "x64" 
    }
    "linux" {
        "x64" 
    }
    "macos" {
        "universal" 
    } # For universal macOS build
    default {
        throw "Unsupported platform: $BuildPlatform" 
    }
}

electron-forge make --platform=$BuildPlatform --arch=$arch
