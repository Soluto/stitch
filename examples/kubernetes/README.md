# Kubernetes Example

## General

This is example of running the **agogos** in kubernetes cluster.

## Before you begin

1. Install [Docker](https://www.docker.com/get-started).
2. Install [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/).
3. Configure `kubectl` to connect to a Kubernetes cluster.
4. Install [skaffold](https://skaffold.dev/docs/getting-started/).

You can find all related instructions [here](https://skaffold.dev/docs/getting-started/).

## Running

1. Create namespace:

    ```bash
    kubectl create namespace graphql
    ```

2. Register custom resource definitions (run from example's folder):

    ```bash
    kubectl apply -f ../../remote-sources/kubernetes/GqlSchemaCRD.yaml
    kubectl apply -f ../../remote-sources/kubernetes/GqlEndpointCRD.yaml
    kubectl apply -f ../../remote-sources/kubernetes/GqlAuthProviderCRD.yaml
    ```

3. Run skaffold in the example's folder:

    ```bash
    skaffold dev
    ```

## Playing with GraphQL

Note: If you use local kubernetes cluster you should forward local port to a port on the pod:

```bash
kubectl port-forward deployment/gateway 8011:8011
```

Now, you can open GraphQL UI and query data:
http://localhost:8011/graphql

Paste this query and see the results:
```graphql
{
  user(id: "1") {
    id
    lastName
    firstName
  }
}
```
