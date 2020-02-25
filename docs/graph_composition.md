# Graph Composition Model

Stitch's registry is our attempt to tackle graphql in a microservice-oriented organization.

The underlying assumption of the project is that team in the organization will [upload](../cli/README.md) and maintain the schemas that connect to their own services, including the parts where their service extends other services.

For the actual composition we rely on [Apollo Federation](https://www.apollographql.com/docs/apollo-server/federation/introduction/), if the syntax here is confusing, take a look at it first.

# Example

## Base services

We have three teams/services: Users, Products and Reviews. Each of them maintains their own schema in Stitch, and the connecting bits between them.

Users team goes ahead and defines their schema, which is completely independent:

```graphql
type Query {
    userById(id: ID!): User @rest(url: "http://user-service/users/{args.id}")
}

type User @key(fields: "id") {
    id: ID!
    username: String!
}
```

The products team does the same, also without any outside dependencies:

```graphql
type Product @key(fields: "upc") {
    upc: String!
    name: String!
    price: Int
}
```

The reviews team adds their `Review` data, but it's pointless without connections to `User` and `Product`, so they add the connections too. Since the actual requests being made here are to the Reviews services, it makes sense for them to maintain them.

```graphql
type Review {
    body: String
    product: Product
}

extend type User @key(fields: "id") {
    id: ID! @external
    reviews: [Review]
        @gql(url: "http://reviews/graphql", fieldName: "getUserReviews", arguments: {userId: "{source.id}"})
}

extend type Product @key(fields: "upc") {
    upc: String! @external
    reviews: [Review]
        @gql(url: "http://reviews/graphql", fieldName: "getProductReviews", arguments: {productUpc: "{source.upc}"})
}
```

## Final Stitch Graph

Stitch, using the underlying federation implementation, will then take all of these, and serve up one big graph, which will effectively look like this:

```graphql
type Query {
    userById(id: ID!): User @rest(url: "http://user-service/users/{args.id}")
}

type User @key(fields: "id") {
    id: ID!
    username: String!
    reviews: [Review]
        @gql(url: "http://reviews/graphql", fieldName: "getUserReviews", arguments: {userId: "{source.id}"})
}

type Product @key(fields: "upc") {
    upc: String!
    name: String!
    price: Int
    reviews: [Review]
        @gql(url: "http://reviews/graphql", fieldName: "getProductReviews", arguments: {productUpc: "{source.upc}"})
}

type Review {
    body: String
    product: Product
}
```

This way we use all the benefits of Federation, with it's extensibility and ownership model, but remain completely declarative.
