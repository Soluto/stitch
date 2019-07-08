#!/usr/bin/env bash
set -o

install_kind() {
    echo "Installing kind (v$KIND_VERSION)..."
    curl -sfSLo kind "https://github.com/kubernetes-sigs/kind/releases/download/v$KIND_VERSION/kind-linux-amd64"
    chmod +x kind
    sudo mv kind /usr/local/bin/kind
}

install_kubectl() {
    echo "Installing kubectl (v$KUBECTL_VERSION)..."
    curl -sfSLO "https://storage.googleapis.com/kubernetes-release/release/v$KUBECTL_VERSION/bin/linux/amd64/kubectl"
    chmod +x kubectl
    sudo mv kubectl /usr/local/bin/kubectl
}

create_cluster() {
    echo "Creating cluster $CLUSTER_NAME..."
    kind create cluster --name "$CLUSTER_NAME"
}

delete_cluster() {
    clustername=`kind get clusters | grep $CLUSTER_NAME`
    if [[ ! -z "$clustername" ]]
    then
        echo "Deleting cluster $clustername..."
        kind delete cluster --name "$clustername"
    fi
}

report_error_and_exit() {
    echo "Error on line $1 with error code $2"
    exit $2
}

build_images() {
    echo "Building images..."
    docker build -t soluto/agogos-graphql-gateway '../services/graphql-server'
    docker build -t soluto/agogos-registry '../services/registry'
    docker build -t soluto/agogos-gql-controller '../remote-sources/kubernetes'
    docker build -t e2e '.'
}

load_images() {
    echo "Loading images to cluster..."
    kind load docker-image --name "$CLUSTER_NAME" soluto/agogos-graphql-gateway
    kind load docker-image --name "$CLUSTER_NAME" soluto/agogos-registry
    kind load docker-image --name "$CLUSTER_NAME" soluto/agogos-gql-controller
    kind load docker-image --name "$CLUSTER_NAME" e2e
}

execute_tests() {
    echo "Configuring kubectl..."
    local oldKUBECONFIG="$KUBECONFIG"
    KUBECONFIG="$(kind get kubeconfig-path --name=$CLUSTER_NAME)"
    export KUBECONFIG

    echo "Creating kubernetes objects..."
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

    # running e2e
    echo "Waiting for things to get ready...($STARTUP_DELAY seconds)"
    sleep $STARTUP_DELAY
    echo "Running e2e tests job..."
    kubectl apply -f ./e2e.k8s.yaml

    echo "Waiting for e2e test job to start...(30 seconds at most)"
    kubectl -n agogos wait pod -l job-name=e2e --for condition=Ready --timeout 30s
    echo "E2E job is running..."
    kubectl -n agogos logs -l job-name=e2e -f
    echo "Waiting for e2e test job to complete...($TEST_TIMEOUT seconds at most)"
    kubectl -n agogos wait --for condition=complete --timeout "$TEST_TIMEOUT"s jobs/e2e
    exitCode=$(kubectl -n agogos get pods -l job-name=e2e -o jsonpath='{.items[*].status.containerStatuses[*].state.terminated.exitCode}')
    reason=$(kubectl -n agogos get pods -l job-name=e2e -o jsonpath='{.items[*].status.containerStatuses[*].state.terminated.Reason}')

    echo "The tests finished with exit code $exitCode and message: $reason"

    KUBECONFIG="$oldKUBECONFIG"
    export KUBECONFIG
    exit $exitCode
}

parse_options() {
    # parse command line options
    for i in "$@"
    do
    case $i in
        --kind-version=*)
        KIND_VERSION="${i#*=}"
        shift
        ;;

        --kubectl-version=*)
        KUBECTL_VERSION="${i#*=}"
        shift
        ;;

        --cluster-name=*)
        CLUSTER_NAME="${i#*=}"
        shift
        ;;

        --startup-delay=*)
        STARTUP_DELAY="${i#*=}"
        shift
        ;;

        --test-time=*)
        TEST_TIMEOUT="${i#*=}"
        shift
        ;;

        *)
        echo "Unknown argument $i"
        exit 1
        ;;
    esac
    done

    if [[ -z "$KIND_VERSION" ]]
    then
        KIND_VERSION="0.3.0"
    fi

    if [[ -z "$KUBECTL_VERSION" ]]
    then
        KUBECTL_VERSION="1.14.3"
    fi

    if [[ -z "$CLUSTER_NAME" ]]
    then
        CLUSTER_NAME="e2e"
    fi

    if [[ -z "$STARTUP_DELAY" ]]
    then
        STARTUP_DELAY=60
    fi

    if [[ -z "$TEST_TIMEOUT" ]]
    then
        TEST_TIMEOUT=60
    fi
}

main() {
    trap delete_cluster EXIT
    trap 'report_error_and_exit $LINENO $?' ERR
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
