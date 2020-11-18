# Data Source Directives

All of these use Stitch's [parameter injection](./parameter_injection.md) syntax.

## `@rest`

`@rest` fetches data from a REST/HTTP endpoint. Usage examples:

```graphql
type Query {
  allUsers: [User!] @rest(url: "http://user-service/users")

  userById(userId: ID!): User @rest(url: "https://user-service/users/{args.userId}")

  userById(userId: ID!): User
    @rest(url: "https://old-user-service/getUser", query: [{ key: "id", value: "{args.userId}" }])
}

type Mutation {
  createUser(body: UserInput!): User @rest(url: "https://user-service/users", method: "POST", bodyArg: "body")
}
```

Full parameters:

```graphql
input KeyValue {
    key: String!
    value: String!
    required: Boolean # Defaults to false
}

directive @rest(
    url: String!
    method: String      # Defaults to GET
    body: String
    bodyArg: String     # Defaults to "input"
    query: [KeyValue!]
    headers: [KeyValue!]
    timeoutMs: Int      # Defaults to 10 seconds
    notFoundAsNull: Boolean # Defaults to isNullableType of field type
)
```

## @gql

`@gql` lets you "embed" a query on a remote GraphQL server into a Stitch resolver. It's not a full federation solution (coming soon!), but it let's you do most things you'd want to with a remote GraphQL endpoint.

Standard GraphQL subselections, aliases, variables, etc are all fully supported (relies on `graphql-tools`'s [Remote Schemas](https://www.apollographql.com/docs/graphql-tools/remote-schemas/))

Examples:

```graphql
# Remote graphql server
type User {
    id: ID!
    name: String!
}

type Query {
    getUsersNamed(name: String!): [User]
}


# Stitch
type Query {
    allUsersNamedAviv: @gql(
        url: "http://remote-user-service/graphql",
        fieldName: "getUsersNamed",
        arguments: {name: "aviv"})

    getUsersByName(userName: String!): @gql(
        url: "http://remote-user-service/graphql",
        fieldName: "getUsersNamed",
        arguments: {name: "{args.userName}"})
}
```

Full parameters:

```graphql
enum GraphQLOperationType {
    Query
    Mutation
}

directive @gql(
    url: String!
    fieldName: String!
    operationType: GraphQLOperationType
    arguments: JSONObject
)
```

## @localResolver

`@localResolver` lets you create a stub resolver, but make no mistake - this can be used with full parameter injection syntax to create complex resolvers.

The optional `mergeStrategy` parameter allows choosing between replacing/merging/deep merging with the existing resolver value for the field. The `Replace` strategy is used by default.

Example of replacing the existing resolver value:

```graphql
type Query {
  isAlive: Boolean @localResolver(value: true)
  jsonEcho(input: JSON!): JSON @localResolver(value: { wrapper: "{args.input}" })
}

type User {
  firstName: String!
  lastName: String!
  fullName: String! @localResolver(value: "{source.firstName} {source.lastName}")
}
```

Example of merging with the existing resolver value:

```graphql
type User {
    firstName: String!
    lastName: String!
    fullName: String // not supplied by the resolver
}

type Query {
    getUser: User! @localResolver(value: { fullName: "${source.firstName} ${source.lastName}" }, mergeStrategy: Merge)
}
```

Full parameters:

```graphql
enum LocalResolverMergeStrategy {
    Replace
    Merge
    MergeDeep
}

directive @localResolver(
    value: JSON!
    mergeStrategy: LocalResolverMergeStrategy = Replace
)
```

The optional `enabledIf` parameter allows ignore the `value` if its content is evaluated to `false`.
For example:

```graphql
type Foo {
  bar: String! @localResolver(enabledIf: "{!source.bar}", value: "N/A")
}
```

In this case if the `source` object doesn't have `bar` property or it's null or undefined the field value will be `"N/A"`. Otherwise it will be the result of the original field resolver.
When the `mergeStrategy` is set to `Merge` or `MergeDeep` the original resolver result and the `value` parameter evaluation will be merged only if the `enabledIf` is true. Otherwise the field value will be the result of the original field resolver.

## @export

See [Parameter Injection](./parameter_injection.md#exports) for details

## @stub (Deprecated, use @localResolver instead)

`@stub` lets you create a stub resolver, but make no mistake - this can be used with full parameter injection syntax to create complex resolvers. Examples:

```graphql
type Query {
  isAlive: Boolean @stub(value: true)
  jsonEcho(input: JSON!): JSON @stub(value: { wrapper: "{args.input}" })
}

type User {
  firstName: String!
  lastName: String!
  fullName: String! @stub(value: "{source.firstName} {source.lastName}")
}
```

Full parameters:

```graphql
directive @stub(value: JSON!)
```
