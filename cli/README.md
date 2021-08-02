# Stitch CLI

## Resources

Commands like `apply:resources` expect resources in YAML files in a specific format:

```yaml
kind: Schema
metadata:
  name: usersApi
  namespace: users
schema: |
  type Query {
      getUser(id: ID!): String
          @rest(url: "http://users-service/users/{args.id}")
  }
```

Or the schema resource can include file patterns of gql files.

```yaml
kind: Schema
metadata:
  name: usersApi
  namespace: users
schemaFiles:
  - ./**/*.gql
```

Or both `schema` and `schemaFiles` properties can be defined. In this case `schema` property value will be considered as content of additional file.

```yaml
kind: Upstream
metadata:
  name: usersApi
  namespace: users
host: 'users-service'
auth:
  type: ActiveDirectory
  activeDirectory:
    authority: https://login.microsoftonline.com/<TENANT_ID>
    resource: http://user-service-ad-resource
```

```yaml
kind: UpstreamClientCredentials
metadata:
  name: activedirectoryTenant
  namespace: users
authType: ActiveDirectory
activeDirectory:
  authority: https://login.microsoftonline.com/<TENANT_ID>
  clientId: myAdClientId
  clientSecret: myAdClientSecret
```

```yaml
kind: Policy
metadata:
  name: usersPolicy
  namespace: users
type: opa
code: |
  default allow = false
  allow {
      input.args.role == "admin"
  }
args:
  role: String
```

## Commands

<!-- commands -->

- [`stitch apply:base-policy RESOURCEPATH`](#stitch-applybase-policy-resourcepath)
- [`stitch apply:introspection-query-policy RESOURCEPATH`](#stitch-applyintrospection-query-policy-resourcepath)
- [`stitch apply:resources RESOURCESPATH`](#stitch-applyresources-resourcespath)
- [`stitch help [COMMAND]`](#stitch-help-command)
- [`stitch refresh:remote-schema REMOTESERVERURL`](#stitch-refreshremote-schema-remoteserverurl)

## `stitch apply:base-policy RESOURCEPATH`

Apply base policy

```
USAGE
  $ stitch apply:base-policy RESOURCEPATH

OPTIONS
  --authorization-header=authorization-header  Custom authorization header
  --dry-run                                    Should perform a dry run
  --registry-url=registry-url                  (required) Url of the registry
  --timeout=timeout                            [default: 10000] Request timeout

EXAMPLE

         $ stitch apply:base-policy base-policy.yaml
         Uploaded successfully!
```

_See code: [src/commands/apply/base-policy.ts](https://github.com/Soluto/stitch/blob/v0.0.17/src/commands/apply/base-policy.ts)_

## `stitch apply:introspection-query-policy RESOURCEPATH`

Apply introspection query policy

```
USAGE
  $ stitch apply:introspection-query-policy RESOURCEPATH

OPTIONS
  --authorization-header=authorization-header  Custom authorization header
  --dry-run                                    Should perform a dry run
  --registry-url=registry-url                  (required) Url of the registry
  --timeout=timeout                            [default: 10000] Request timeout

EXAMPLE

         $ stitch apply:introspection-query-policy introspection-query-policy.yaml
         Uploaded successfully!
```

_See code: [src/commands/apply/introspection-query-policy.ts](https://github.com/Soluto/stitch/blob/v0.0.17/src/commands/apply/introspection-query-policy.ts)_

## `stitch apply:resources RESOURCESPATH`

Apply resources

```
USAGE
  $ stitch apply:resources RESOURCESPATH

OPTIONS
  --authorization-header=authorization-header  Custom authorization header
  --dry-run                                    Should perform a dry run
  --registry-url=registry-url                  (required) Url of the registry
  --skip-resource-types=skip-resource-types    Resource types to skip
  --timeout=timeout                            [default: 10000] Request timeout
  --verbose                                    Verbose mode

EXAMPLE
  $ stitch apply:resources schema.gql
  Uploaded successfully!
```

_See code: [src/commands/apply/resources.ts](https://github.com/Soluto/stitch/blob/v0.0.17/src/commands/apply/resources.ts)_

## `stitch help [COMMAND]`

display help for stitch

```
USAGE
  $ stitch help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## `stitch refresh:remote-schema REMOTESERVERURL`

Refresh remote schema

```
USAGE
  $ stitch refresh:remote-schema REMOTESERVERURL

OPTIONS
  --authorization-header=authorization-header  Custom authorization header
  --registry-url=registry-url                  (required) Url of the registry
  --timeout=timeout                            [default: 10000] Request timeout
  --verbose                                    Verbose mode

EXAMPLE
  $ stitch refresh:remote-schema http://remote-graphql-server/graphql
  Remote schema refreshed successfully!
```

_See code: [src/commands/refresh/remote-schema.ts](https://github.com/Soluto/stitch/blob/v0.0.17/src/commands/refresh/remote-schema.ts)_

<!-- commandsstop -->
