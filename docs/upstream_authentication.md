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

An Upstream resource answers the question "How to modify outgoing request before sending?". It can be adding authentication or setting different origin for each environment.

Example:

```yaml
kind: Upstream
metadata:
  name: organization-api
  namespace: organizations-team
host: 'organizations.example.com'
origin: 'http://some-real-origin'
auth:
  type: ActiveDirectory
  activeDirectory:
    authority: <active directory authority url>
    resource: <active directory resource id>
```

At runtime, `host` works as a selector - with this upstream applied, stitch knows that any request going out to `organizations.example.com` needs a `Bearer` token from the specified authority, for the specified resource.

`origin` is the OPTIONAL property. If it is set its value replaces the `url` origin. It can be useful to use the same schema in different environments.
So the `url` in schema can have some logical name of the service (it still should be valid URL) and in each environment differen `Upstream` resource can be used.

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
