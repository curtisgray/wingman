param (
    [switch]$Push,
    [switch]$Rebuild,
    [string]$Tag = 'wingman',
    [string]$DockerExtension = ''
)

try {
    $secretsPath = "./.secrets"
    $dockerRootPath = "./docker"

    Copy-Item ~/.ssh/id_rsa_azuredevops.pub (Join-Path $secretsPath .ssh/authorized_keys)
    Copy-Item ~/.ssh/id_rsa_azuredevops (Join-Path $secretsPath .ssh/id_rsa)
    # git clone "https://github.com/curtisgray/wingman.git" (Join-Path $dockerRootPath wingman) --recurse-submodules

    Push-Location $dockerRootPath
    # Get all files in the current directory
    $files = Get-ChildItem -File
    foreach ($file in $files) {
        # Check if the file contains '\r'
        if (Select-String -Pattern "\r" -Path $file.FullName -Quiet) {
            # Get content of file before running sed
            $contentBefore = Get-Content $file.FullName -Raw
            
            # Remove '\r' from the file
            sed -i 's/\r$//' $file.FullName
            
            # Get content of file after running sed
            $contentAfter = Get-Content $file.FullName -Raw
            
            # Check if content has changed
            if ($contentBefore -eq $contentAfter) {
                Write-Error "sed command failed to make changes to the file: $($file.FullName)"
            }
            else {
                Write-Host "sed command succeeded in modifying the file: $($file.FullName)"
            }
        }
    }
    Pop-Location

    # Determine Dockerfile name based on DockerExtension
    $dockerfile = 'Dockerfile'
    if (![string]::IsNullOrWhiteSpace($DockerExtension)) {
        if (!$DockerExtension.StartsWith('.')) {
            $DockerExtension = ".$DockerExtension"
        }
        $dockerfile += $DockerExtension
    }

    # Determine whether to use cache or not in the build
    if ($Rebuild) {
        docker build --no-cache -t carverlab/cloud:$Tag -f $dockerfile .
    }
    else {
        docker build -t carverlab/cloud:$Tag -f $dockerfile .
    }

    # Check if docker build was successful
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker build failed with exit code $LASTEXITCODE"
        exit 1
    }

    # Conditionally push the built image if -Push argument is provided
    if ($Push) {
        docker push carverlab/cloud:$Tag
    }

    # Cleanup - Remove SSH files
    Remove-Item (Join-Path $secretsPath .ssh/authorized_keys)
    Remove-Item (Join-Path $secretsPath .ssh/id_rsa)
    # Cleanup - Remove cloned repository
    # Remove-Item -Recurse -Force (Join-Path $dockerRootPath wingman)
} 
catch {
    Write-Host "An error occurred: $_"
    exit 1
}
