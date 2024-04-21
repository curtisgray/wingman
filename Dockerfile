# Use a specific version for the base image for better reproducibility.
# FROM ubuntu:22.04
FROM nvidia/cuda:12.4.1-devel-ubuntu22.04

# Optional build arguments to enable/disable features
ARG INSTALL_CPP_DEV_ENV=true
ARG INSTALL_PYTHON=false
ARG INSTALL_PYTHON_3_10=true
ARG INSTALL_POWERSHELL=true
ARG CLONE_GIT_REPOS=true

# Label metadata to describe the image.
LABEL maintainer="Electric Pipelines <mailbox@electricpipelines.com>" \
    version="1.0" \
    description="Docker image with optional C/C++ development environment, Python 3.10, CUDA 12.4.1 and PowerShell."

# Update the package list and install some basic utilities.
RUN apt-get update
RUN apt-get install -y wget apt-transport-https software-properties-common sudo git curl vim nano zip unzip

# Install C/C++ development environment
RUN if [ "${INSTALL_CPP_DEV_ENV}" = "true" ]; then \
    apt-get update && \
    apt-get install -y build-essential pkg-config && \
    wget -qO vcpkg.tar.gz https://github.com/microsoft/vcpkg/archive/master.tar.gz && \
    mkdir -p /opt/microsoft/vcpkg && \
    tar -xzf vcpkg.tar.gz -C /opt/microsoft/vcpkg --strip-components=1 && \
    /opt/microsoft/vcpkg/bootstrap-vcpkg.sh && \
    ln -s /opt/microsoft/vcpkg/vcpkg /usr/local/bin/vcpkg && \
    rm -rf vcpkg.tar.gz && \
    wget -qO cmake.tar.gz https://github.com/Kitware/CMake/releases/download/v3.29.2/cmake-3.29.2-linux-x86_64.tar.gz && \
    mkdir -p /opt/kitware/cmake && \
    tar -xvzf cmake.tar.gz -C /opt/kitware/cmake --strip-components=1 && \
    ln -s /opt/kitware/cmake/bin/cmake /usr/local/bin/cmake && \
    rm -rf cmake.tar.gz && \
    rm -rf /var/lib/apt/lists/*; \
    fi

# Install Node.js
RUN if [ "${INSTALL_NODEJS}" = "true" ]; then \
    # curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get update && \
    apt-get install -y nodejs npm; \
    fi

# Clone git repos
RUN if [ "${CLONE_GIT_REPOS}" = "true" ]; then \
    apt-get update && \
    apt-get install -y git ca-certificates --no-install-recommends && \
    update-ca-certificates && \
    git -c http.sslVerify=false clone --recurse-submodules https://github.com/curtisgray/wingman.git /root/wingman && \
    rm -rf /var/lib/apt/lists/*; \
    fi

# Install Python 3.10
RUN if [ "${INSTALL_PYTHON_3_10}" = "true" ]; then \
    apt-get update && \
    apt-get install -y python3.10 python3.10-dev python3.10-distutils python3.10-venv python3-pip; \
    fi

# Install Python latest
RUN if [ "${INSTALL_PYTHON}" = "true" ]; then \
    apt-get update && \
    apt-get install -y python3 python3-dev python3-distutils python3-venv python3-pip; \
    fi

# Install PowerShell
RUN if [ "${INSTALL_POWERSHELL}" = "true" ]; then \
    wget -q https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y powershell; \
    fi

# Copy root, docker and ssh files.
COPY docker/ /root/
COPY .secrets/ /root/
COPY .secrets/.ssh/ /root/.ssh/

RUN chmod 700 /root/.ssh
RUN chmod 600 /root/.ssh/id_rsa
RUN chmod 644 /root/.ssh/authorized_keys
RUN chmod +x /root/initialize_server.sh
RUN touch /root/.no_auto_tmux

# Modify .bashrc
RUN sed -i "s|alias ls='ls --color=auto'|alias ls='ls -la --color=auto'|" ~/.bashrc

# RUN /root/initialize_server.sh
EXPOSE 6567
EXPOSE 6568
