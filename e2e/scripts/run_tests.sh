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
    curl -sfSLO "https://storage.googleapis.com/kubernetes-release/release/v$KUBECTL_VERSION/bin/linux/amd64/kubectl"
    chmod +x kubectl
}

create_cluster() {
    CLUSTER_NAME=$3
    kind create cluster --name "$CLUSTER_NAME"
}

build_images() {
    docker build -t graphql-gateway '../services/graphql-server'
    docker build -t registry '../services/registry'
    docker build -t gql-controller '../remote-sources/kubernetes'
    docker build -t e2e '.'
}

load_images() {
    kind load docker-image graphql-gateway
    kind load docker-image registry
    kind load docker-image gql-controller
    kind load docker-image e2e
}

execute_tests() {
    local oldKUBECONFIG="$KUBECONFIG"
    KUBECONFIG=$(kind get kubeconfig-path)
    export KUBECONFIG

    # namespace
    kubectl apply -f ../examples/kubernetes/deployments/infra/namespace.yaml

    # CRDs
    kubectl apply -f ../remote-sources/kubernetes/src/GqlSchemaCrd.yaml
    kubectl apply -f ../remote-sources/kubernetes/src/GqlEndpointCrd.yaml
    kubectl apply -f ../remote-sources/kubernetes/src/GqlAuthProviderCrd.yaml

    # mocks
    kubectl apply -f ../examples/kubernetes/deployments/mocks/oidc-server-mock.yaml

    # agogos deployments, roles & secrets
    kubectl apply -f ../examples/kubernetes/deployments/infra/rbac.yaml
    kubectl apply -f ../examples/kubernetes/deployments/infra/gql-controller.yaml
    kubectl apply -f ../examples/kubernetes/deployments/infra/admission-tls-secret.yaml
    kubectl apply -f ../examples/kubernetes/deployments/infra/agogos-credentials.yaml

    kubectl apply -f ../examples/kubernetes/deployments/infra/registry.yaml
    kubectl apply -f ../examples/kubernetes/deployments/infra/gateway.yaml

    kubectl apply -f ../examples/kubernetes/deployments/infra/webhook.yaml

    # user namespace & services
    kubectl apply -f ../examples/kubernetes/deployments/services/user-namespace.yaml
    kubectl apply -f ../examples/kubernetes/deployments/services/user-service.yaml
    kubectl apply -f ../examples/kubernetes/deployments/services/user-subscription-service.yaml

    # agogos objects
    kubectl apply -f ../examples/kubernetes/deployments/crds/schemas/user-service.gql.yaml
    kubectl apply -f ../examples/kubernetes/deployments/crds/schemas/user-subscription-service.gql.yaml
    kubectl apply -f ../examples/kubernetes/deployments/crds/endpoints/user-service.endpoint.yaml
    kubectl apply -f ../examples/kubernetes/deployments/crds/authProviders/user-service.authProvider.yaml
    KUBECONFIG="$oldKUBECONFIG"
    export KUBECONFIG
}

parse_options() {
    # parse command line options
    for i in "$@"
    do
    case $i in
        --kind-version=*)
        KIND_VERSION="${i#*=}"
        if [[ -z "$KIND_VERSION" ]]
        then
            KIND_VERSION="0.3.0"
        fi
        shift
        ;;

        --kubectl-version=*)
        KUBECTL_VERSION="${i#*=}"
        if [[ -z "$KUBECTL_VERSION" ]]
        then
            KUBECTL_VERSION="1.14.3"
        fi
        shift
        ;;

        --cluster-name=*)
        CLUSTER_NAME="${i#*=}"
        if [[ -z "$CLUSTER_NAME" ]]
        then
            CLUSTER_NAME="e2e"
        fi
        shift
        ;;

        *)
        echo "Unknown argument $i"
        exit 1
        ;;
    esac
    done
}

main() {
    parse_options

    if [[ ! -z "$CI" ]]
    then
        install_kind
        install_kubectl
    else
        build_images
    fi

    create_cluster
    load_images
    execute_tests
}

main "$@"
