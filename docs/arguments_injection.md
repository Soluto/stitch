# Arguments Injection

Some of the directives has arguments to be set when attached to field. Setting static values is not enough. Sometimes the directive should get request JWT claim as argument, sometimes it can be value of parent object.

## Argument injection mechanism

Argument injection mechanism allows to use expressions in arguments that will be evaluated at request execution time.

### Sources

The argument expression can be dependent on several sources:

- Request JWT
- Request headers
- Field arguments
- Parent fields
- Resolver info param
- Ancestor's fields exported higher in query result tree
- GraphQL query variables
- `isAnonymousAccess()` method that returns `true` if the HTTP request has no `Authorization` header. Otherwise returns `false`.
- [Plugins' exported data](./plugins.md#pluginsData)

### Syntax

#### Static values

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

### Examples

Here there are some examples to for injection of different sources

#### Static value

```graphql
# Schema
type Query {
  foo: String! @localResolver(value: "bar")
}

#Query
query {
  foo
}
```

> Result: `{ foo: 'bar' }`

#### Argument

```graphql
# Schema
type Query {
  foo(arg1: String): String! @localResolver(value: "{args.arg1}")
}

#Query
query {
  foo(arg1: "bar")
}
```

> Result: `{ foo: 'bar' }`

#### Source

```graphql
# Schema
type Query {
  foo: String! @localResolver(value: "{source.bar}")
}

#Query
query {
  foo
}
```

> rootValue: `{ bar: 'bar' }`
> Result: `{ foo: 'bar' }`

#### Info

```graphql
# Schema
type Query {
  foo: String! @localResolver(value: "{info.path.key}")
}

#Query
query {
  foo
}
```

> Result: `{ foo: 'foo' }`

#### Variable

```graphql
# Schema
type Query {
  foo: String! @localResolver(value: "{vars.var1}")
}

#Query
query($var1: String!) {
  foo @keepStringVariable(var: $var1)
}
```

> variables: `{ var1: 'bar' }`
> Result: `{ foo: 'bar' }`

#### Export

```graphql
# Schema
type Country {
  name: String!
  code: String! @export(key: "countryCode")
  regions: [Regions!]
}

type Region {
  name: String!
  cities: [City!]
}

type City {
  name: String!
  countryCode: String! @localResolver(value: "{exports.countryCode}")
}

type Query {
  country(id: ID!): Country!
}

#Query
query {
  country {
    code
    regions {
      cities {
        name
        countryCode
      }
    }
  }
}
```

#### JWT

```graphql
# Schema
type Query {
  foo: String! @localResolver(value: "{jwt?.roles}") # foo field will be resolved to roles claim of the request JWT.
}

#Query
query {
  foo
}
```

#### Headers

```graphql
# Schema
type Query {
  foo: String! @localResolver(value: "{headers['x-api-client']}") # foo field will be resolved to the request x-api-client header.
}

#Query
query {
  foo
}
```

#### Plugins data

```graphql
# Schema
type Query {
  foo: String! @localResolver(value: "{plugins.foo}") # The foo field was populated by a plugin.
}

#Query
query {
  foo
}
```

#### Returning a JSON Object with injection

```graphql
# Schema
type SomeType {
  foo: String!
  baz: String!
}

type Query {
  someType(arg1: String): SomeType! @localResolver(value: "{{ foo: source.bar, baz: args.arg1 }}")
}

#Query
query {
  someType(arg1: "qux") {
    foo
    baz
  }
}
```

> rootValue: `{ bar: 'bar' }`
> Result: `{ foo: 'bar', baz: 'qux' }`
