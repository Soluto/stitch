# Stitch CLI

# Resources

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

# Commands

<!-- commands -->

- [`stitch apply:resources RESOURCESPATH`](#stitch-applyresources-resourcespath)
- [`stitch help [COMMAND]`](#stitch-help-command)

## `stitch apply:resources RESOURCESPATH`

Apply resources

```
USAGE
  $ stitch apply:resources RESOURCESPATH

OPTIONS
  --authorization-header=authorization-header  Custom authorization header
  --dry-run                                    Should perform a dry run
  --registry-url=registry-url                  (required) Url of the registry

EXAMPLE
  $ stitch apply:resources schema.gql
  Uploaded successfully!
```

_See code: [src/commands/apply/resources.ts](https://github.com/Soluto/stitch/blob/v0.0.6/src/commands/apply/resources.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

<!-- commandsstop -->
