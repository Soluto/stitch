# Data Source Directives

All of these use Stitch's [parameter injection](./parameter_injection.md) syntax.

## `@rest`

`@rest` fetches data from a REST/HTTP endpoint. Usage examples:

```graphql
type Query {
    allUsers: [User!] @rest(url: "http://user-service/users")

    userById(userId: ID!): User @rest(url: "https://user-service/users/{args.userId}")

    userById(userId: ID!): User
        @rest(url: "https://old-user-service/getUser", query: [{key: "id", value: "{args.userId}"}])
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
}

directive @rest(
    url: String!
    method: String      # Defaults to GET
    bodyArg: String     # Defaults to "input"
    query: [KeyValue!]
    headers: [KeyValue!]
    timeoutMs: Int      # Defaults to 10 seconds
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

## @stub

`@stub` lets you create a stub resolver, but make no mistake - this can be used with full parameter injection syntax to create complex resolvers. Examples:

```graphql
type Query {
    isAlive: Boolean @stub(value: true)
    jsonEcho(input: JSON!): JSON @stub(value: {wrapper: "{args.input}"})
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

## @export

See [Parameter Injection](./parameter_injection.md#exports) for details
