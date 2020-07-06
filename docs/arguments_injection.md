# Arguments Injection

Some of the directives has arguments to be set when attached to field. Setting static values is not enough. Sometimes the directive should get request JWT claim as argument, sometimes it can be value of parent object.

## Argument injection mechanism

Argument injection mechanism allows to use expressions in arguments that will be evaluated at request execution time.

### Sources

The argument expression can be dependent on several sources:

- Request JWT
- Field arguments
- Parent fields
- Ancestor's fields exported higher in query result tree
- _? GraphQL query variables ?_

### Syntax

#### Static value

The value is set hardcoded.

```graphql
type Query {
  user(id: ID!): User! @myDirective(arg1: "static")
```

It can be of any type.

```graphql
type Query {
  user(id: ID!): User! @myDirective(arg1: { a: 5 })
```

#### JavaScript Expression

The argument value is string, begins with `"{` and ends with `}"`. It will be evaluated as JS expression. The type of argument will be the type of evaluated value.

```graphql
type Query {
  user(id: ID!): User! @myDirective(arg1: "{source.users[args.id]}")
```

#### String template

The argument value is the string contains one or more `{<expr>}` JS expressions (as described above). In this case each of the JS expressions is evaluated and is replaced by its value.

```graphql
type Query {
  user(id: ID!): User! @myDirective(arg1: "UserId is {args.id}")
```

> Notice: Be careful when the expression has only one token.
>
> `"{1+1 }"` will be evaluated to `2`.
>
> `"{1 + 1} "` will get value `"2 "`.

#### Escape Character

Escape characters aren't supported currently. So argument string shouldn't contain `{` and `}` characters when not as part of JS expression boundaries.
