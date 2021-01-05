# Upstream Authentication

Stitch can, by its nature, connect to various upstream data sources and query/mutate data through them. Frequently, these data sources require authentication.

By default, stitch will forward any `Authorization` header it receives to the upstream data sources.
But frequently, more advanced solutions are needed - which is where stitch's other resources come in.

Just like the Schema object, stitch can accept more types of resources that do other things.

## Design

Stitch works with two more resources:

`Upstream` specifies how to identify requests going to some upstream data source, and what kind of authentication it requires.

`UpstreamClientCredentials` specifies how to authenticate to an authentication provider.

Combined, they allow stitch to authenticate to upstream data sources. Their separation into two distinct resources allows many upstreams to use one set of credentials, which makes it easier to ensure security for that set of credentials.

## Upstream

An Upstream resource modifies all outgoing request to particular remote host.

Example:

```yaml
kind: Upstream
metadata:
  name: organization-api
  namespace: organizations-team
host: 'organizations.example.com' # deprecated
sourceHosts:
  - 'organizations.example.com'
  - 'org.example.com'
targetOrigin: https://org.dev.example.com
auth:
  type: ActiveDirectory
  activeDirectory:
    authority: <active directory authority url>
    resource: <active directory resource id>
headers:
  - name: some-header-name
    value: '{incomingRequest?.headers?.["some-header-from-request"]'
```

Properties:

`host`: **Deprecated** Uses a selector for upstream. Use `sourceHosts` instead.

`sourceHosts`: Uses as selector for upstream. If one of the values in list suits to url host the upstream is applied. Every value in list should be unique across all upstreams.

> One (not both) of properties `host` or `sourceHosts` must be provided.

`targetOrigin`: _(optional)_ Replaces the url origin.

`auth`: _(optional)_ Allows to build `Authorization` header. For example using _Client Credentials_ flow.

`headers`: _(optional)_ Allows to add or replace headers in outgoing request. Argument injection mechanism is available. Unlike argument injection in `@rest` directive `url`, `query` or `header` parameters or `@policy` directive `args` parameter the data sources are different. There are 3 data sources available for injection:

- `incomingRequest` - the request object sent to Stitch
- `jwt` - decoded JWT from `incomingRequest`'s `Authorization` header
- `outgoingRequest` - the request object built by `@rest` or `@gql` directives before application of upstream

## Default Upstream

There is option to set one default upstream to the whole deployment. This default upstream will be applied unless specific upstream wasn't found for the request host. This can be useful to add some headers to all outgoing requests or to redirect all requests to proxy server.

If neither upstream nor default upstream is set for the `@rest` or `@gql` directive's `url`, the incoming request's `Authorization` header will be copied to outgoing request.

```yaml
targetOrigin: https://proxy-server
headers:
  - name: Host
    value: '{outgoingRequest.url.host}'
  - name: Authorization
    value: '{incomingRequest?.headers?.["authorization"]'
```

## UpstreamClientCredentials

an UpstreamClientCredentials resources answers the question "How does stitch authenticate itself?"

Example:

```yaml
kind: UpstreamClientCredentials
metadata:
  name: organization-api
  namespace: organizations-team
authType: ActiveDirectory
activeDirectory:
  authority: <active directory authority url>
  clientId: <active directory client id>
  clientSecret: <active directory client secret>
```

When stitch detects a request needs activedirectory style authentication (specified through the `Upstream` resource), it will look for an `UpstreamClientCredentials` resource with the same `authType` and `authority`, and use the credentials given in it to fetch an access token.
