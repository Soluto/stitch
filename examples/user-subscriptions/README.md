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
