# Parameter Injection

Just static data sources isn't enough, they need to be parameterized with data from the request itself and from parent resolvers.
For this, stitch supports a parameter injection syntax. It looks like `{injectionSource.keyName}`.

## Injection Sources

### `args`

Represents arguments available to the current field. Any argument available on the `args` parameter in a [classic GraphQL resolver](https://graphql.org/learn/execution/#root-fields-resolvers) is accessible through this source.

Here `{args.id}` Will resolve to the value of the "id" argument:

```graphql
type Query {
    getUser(id: ID!): User @stub(value: "{args.id}")
}
```

### `source`

Represents fields fetched in the parent resolver. Any field accessible on the first/`parent` argument in a [classic GraphQL resolver](https://graphql.org/learn/execution/#root-fields-resolvers) is available on this source.

For example, here the `{source.id}` will resolve to the `id` field of the user containing it:

```graphql
type User {
    id: ID!
    name: String
    books: [Book!] @rest(url: "http://book-service/byUser/{source.id})
}
```

### `exports`

This source represents a field exported in some previous ancestor resolver using `@export`.

In this example, when querying `Query.organizations`, each employee's `organizationId` field will resolve to the containing organization'd `id` field.

Note that this source has a lot of edge cases since it's inherently un-GraphQL-ish and relies on things more than one level up than itself, avoid using it if possible. Consider what happens in the following example, if `employee` is not fetched from `Query.organization` but from `Query.employeeById` - The `organizationId` field will resolve to `null`.

```graphql
type Query {
    organizations: [Organization!]
    employeeById(id: ID!): Employee
}

type Organization {
    id: ID! @export(key: "organizationId")
    teams: [Team!]!
}

type Team {
    id: ID!
    employees: [Employee!]!
}

type Employee {
    id: ID!
    name: String
    organizationId: ID! @stub(value: "{exports.organizationId})
}
```
