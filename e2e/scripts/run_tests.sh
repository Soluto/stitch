#!/usr/bin/env bash
set -o

install_kind() {
    KIND_VERSION=$1
    echo "Installing kind (v$KIND_VERSION)..."
    curl -sfSLo kind "https://github.com/kubernetes-sigs/kind/releases/download/v$KIND_VERSION/kind-linux-amd64"
    chmod +x kind
    sudo mv kind /usr/local/bin/kind
}

install_kubectl() {
    KUBECTL_VERSION=$2
    echo "Installing kubectl (v$KUBECTL_VERSION)..."
    curl -sfSLO "https://storage.googleapis.com/kubernetes-release/release/$KUBECTL_VERSION/bin/linux/amd64/kubectl"
    chmod +x kubectl
}

create_cluster() {
    CLUSTER_NAME=$3
    kind create cluster --name "$CLUSTER_NAME"
}

main() {
    install_kind
    install_kubectl
}

main "$@"