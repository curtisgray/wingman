#!/usr/bin/env bash

# Script Name: initialize_server.sh
# Description: This script is used to set up the environment by updating the system, installing packages,
#              and cloning or updating repositories.
# Usage:       ./initialize_server.sh [--python] [--cuda]

set -e
trap 'echo "Error encountered. Exiting." | logger -t initialize_server; exit 1' ERR

log_file="/var/log/initialize_server.log"
completion_file="/tmp/initialize_server_complete"

install_cuda=false

log() {
    local message="$(date +'%Y-%m-%d %H:%M:%S') - $1"
    echo "$message" | tee -a "$log_file" | logger -t initialize_server
    echo "$message"
}

clone_or_update_repository() {
    local repository_url=$1
    local repository_name=${2:-$(basename "${repository_url}")}

    if [[ -d "${repository_name}" ]]; then
        log "Repository ${repository_name} exists. Fetching and pulling latest changes..."
        pushd "${repository_name}" >/dev/null
        GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no" git fetch --all
        GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no" git pull --recurse-submodules
        popd >/dev/null
    else
        log "Cloning repository ${repository_name}..."
        GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no" git clone "${repository_url}" "${repository_name}" --recurse-submodules
    fi
}

main() {
    # Check if completion file exists
    if [ -f "${completion_file}" ]; then
        log "Completion file found at ${completion_file}. Script has already been run."
        exit 0
    fi
    
    pushd /root >/dev/null

    if $install_cuda; then
        install_cuda_env
    fi

    # tar -xvzf cmake.tar.gz

    # log "Create and activate .venv environment..."
    # python3 -m venv .venv
    # source .venv/bin/activate
    # log "Installing python packages..."

    # pip install transformers torch einops accelerate bitsandbytes xformers

    # log "Deactivate .venv environment..."
    # deactivate

    # log "Cloning or updating repositories..."
    # pushd ~ >/dev/null
    # clone_or_update_repository "git@ssh.dev.azure.com:v3/carverlab/curtis/cassk"
    # clone_or_update_repository "git@ssh.dev.azure.com:v3/carverlab/curtis/chatgpt"
    # clone_or_update_repository "git@ssh.dev.azure.com:v3/carverlab/curtis/gamestory"
    # clone_or_update_repository "https://github.com/ggerganov/llama.cpp"
    # clone_or_update_repository "https://github.com/ggerganov/llama.cpp"
    # popd >/dev/null
    # log "Downloading Stable Diffusion..."
    # bash <(wget -qO- https://raw.githubusercontent.com/AUTOMATIC1111/stable-diffusion-webui/master/webui.sh)
    log "Cloning Wingman..."
    clone_or_update_repository "https://github.com/curtisgray/wingman" "wingman"
    pushd wingman >/dev/null
    log "Building Wingman..."
    export VCPKG_ROOT=/opt/microsoft/vcpkg
    export VCPKG_INSTALLATION_ROOT=${VCPKG_ROOT}
    export VCPKG_DEFAULT_TRIPLET=x64-linux
    export CMAKE_TOOLCHAIN_FILE='${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake'
    # add cmake to path
    export PATH=$PATH:/opt/kitware/cmake/bin
    pwsh -File ./build.ps1 -BuildPlatform linux-cublas -SkipDeployment

    log "Installing Wingman..."
    # Define path to the executable
    EXECUTABLE_PATH="/root/wingman/services/wingman.cpp/out/build/linux-cublas/bin/wingman"

    # Create systemd service file
    cat <<EOF | sudo tee /etc/systemd/system/wingman.service
[Unit]
Description=Wingman Service
After=network.target

[Service]
Type=simple
ExecStart=$EXECUTABLE_PATH
WorkingDirectory=$(dirname $EXECUTABLE_PATH)
#Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd to recognize the new service
    sudo systemctl daemon-reload

    # Enable the service
    sudo systemctl enable wingman.service

    # Start the service
    sudo systemctl start wingman.service

    echo "Service wingman has been installed and started."

    popd >/dev/null
    popd >/dev/null

    log "Script finished."

    # Touch file to indicate script has finished successfully
    touch "${completion_file}"
    log "Completion file created at ${completion_file}"
}

main "$@"
