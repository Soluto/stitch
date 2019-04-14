# graphql-gateway

It allows you to create a unified GraphQL API in a microservices architecture. Each microservice contributes to a single unified schema.

graphql-gateway is composed of these components:

- **schema-registry** - Continuously collects, validates and unifies all the schema parts
- **graphql-server** - A single GraphQL API executed with the unified schema

## Disclaimer
This deployment is **NOT** intended for a production environment. It is still a reference implementation and we plan to add some production-ready features like authantication & authorization soon.

## Example

### User Service

Rest service for User details

```
GET http://user/:id
{
  id: ...,
  firstName: ...,
  lastName: ...
}

POST http://user/:id
body {
  firstName: ...,
  lastName: ...
}
```

It would also contain a GQL file declaring this schema (notice the @http directive):

```js
type User {
  id: ID!
  firstName: String
  lastName: String
}

type Query {
  user(id: ID!): User
  @http(url: "http://user/:id")
}

type Mutation {
  createUser(firstName: String!, lastName: String): String
  @http(url: "http://user/:id", method: "POST")
}
```

### User Subscription service

Rest service for User Subscription details

```
GET http://user-subscription/:id
{
  plan: ...,
  expirationDate: ...
}
```

It would also contain a GQL file declaring a Subscription extension for the User type:

```js
type SubscriptionPlan {
  plan: String!
  expirationDate: String
}

type User {
  subscription: SubscriptionPlan
  @http(url: "http://user-subscription/:id")
}
```

### A query to the unified GraphQL schema could be:

```js
query {
  user('some-id') {
    firstName
    lastName
    subscription {
      plan
      expoirationDate
    }
  }
}
```

It is actually resolved from the two separated services! Each is responsible for the schema extension and its own piece of data.

## Service support

- Rest service
- gRPC service - _planned_
- Databases - _planned_

## Platform support

- Kubernetes - _planned_
- Any platform with a custom CD
