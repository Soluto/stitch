# Authentication

## Gateway

### Authentication strategies

Gateway service supports different types of authentication.

1. Anonymous authentication: There are no credentials or token check for endpoint.

2. JWT Bearer authentication: The request should include `Authorization` header with JWT token. The token should be valid and properly-signed.

### Configuration

Gateway exposes 3 endpoints:

1. `/metrics` for Prometheus metrics
2. `/.well-known/apollo/server-health` for Apollo Server health check
3. `/graphql` for graphql requests.

Gateway reads the configuration from `AUTHENTICATION_CONFIGURATION` environment variable on startup if exists or uses default configuration.

By default all 3 endpoints are configured with anonymous strategy. See [here](../services/src/modules/config.ts).

Usually only `/graphql` endpoint should be protected by non-anonymous strategy. For example JWT strategy can be used:

```json
{
  "jwt": {
    "<<< JWT issuer >>>": {
      "jwksUri": "<<< Oidc Provider's JWKs Endpoint >>>",
      // Audience is optional field and will be validated only if defined. See below another way to validate audience using policies.
      "audience": "<<Stitch audience>>",
      "authenticatedPaths": ["/graphql"],
      "description": "Some OpenId Provider"
    }
  },
  "anonymous": {
    "publicPaths": ["/metrics", "/.well-known/apollo/server-health"]
  }
}
```

### Advanced validation

JWT strategy validates only token's expiration and signature. Also if JWT iss claim doesn't exist in configuration the access will be denied. Other checks can be implemented using [policies or base policy](./authorization.md)

In the following example base policy checks the `aud` claim:

Policy definition:

```yaml
metadata:
  namespace: infra
  name: check_audience
type: opa
code: |
  default allow = false
  allow {
    input.args.aud == input.args.allowedAudience
  }
args:
  aud:
    type: String!
    default: '{jwt?.aud}'
  allowedAudience:
    type: String!
```

Base policy:

```json
{
  "namespace": "infra",
  "name": "check_audience",
  "args": {
    "allowedAudience": "<<< my audience >>>"
  }
}
```
