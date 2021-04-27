# @errorHandler Directive

## General

This directive allows to do one or both of the following actions:

1. Catch error thrown by the field/object type resolver and return some value instead. The directives allows to catch only certain errors using `catchError.condition` argument.

2. Throw custom error instead of returning result of field/object type resolver. The directive allows to throw error only in certain cases using `throwError.condition` argument.

## Definition

```graphql
input CatchErrorInput {
  condition: String
  returnValue: JSON
}

input ThrowErrorInput {
  condition: String
  errorToThrow: String
}

directive @errorHandler(catchError: CatchErrorInput, throwError: ThrowErrorInput) on OBJECT | FIELD_DEFINITION
```

## Arguments

- `catchError`: (object, optional, default: `undefined`) This argument has 2 properties and allows to configure what errors to catch and what value to return

  - `condition`: (string, optional, default: `true`) - this expression is evaluated using [Argument injection mechanism](../arguments_injection.md). Additionally to the regular `source`, `args`, `context` and `info` variables, `error` variable is available. Its value is the error thrown by resolver.
  - `returnValue` (object, optional, default: `null`) - object or string that may be evaluated using [Argument injection mechanism](../arguments_injection.md). This value will be resolved if the error will be caught.

- `throwError` (object, optional, default: `undefined`) - This argument has 2 properties and allows to configure what error will be thrown instead of resolver value.
  - `condition`: (string, optional, default: `true`) - this expression is evaluated using [Argument injection mechanism](../arguments_injection.md). Additionally to the regular `source`, `args`, `context` and `info` variables, `result` variable is available. Its value is the resolver value or `catchError` section value. See above.
  - `errorToThrow`: (string, optional, default: empty string). String that may be evaluated using [Argument injection mechanism](../arguments_injection.md). If the evaluation result is `typeof Error` it will be thrown. If the expression cannot be evaluated or is evaluated to string `new Error(result)` will be thrown.

## Execution order

![Flow diagram](../images/error-handler-directive-flow-diagram.png 'Flow Diagram')

## Examples

### No arguments. The directive has no effect.

```graphql
type Query {
  foo: String @errorHandler
}
```

### Catches all errors and returns `null` instead

```graphql
type Query {
  foo: Foo @errorHandler(catchError: {})
}
```

### Catches only errors that has property `status` with value `404` and returns `Not found` instead

```graphql
type Query {
  foo: String @errorHandler(catchError: { condition: "{ error.status === 404 }", returnValue: "Not found" })
}
```

### Throws if the field resolver returns empty string

```graphql
type Query {
  foo: String
    @errorHandler(
      throwError: { condition: "{ result.length === 0 }", errorToThrow: "{ new Error('404: Foo not found') }" }
    )
}
```

### Catches authorization errors and throws 'not found' errors instead

```graphql
type Query {
  foo: String
    @errorHandler(
      catchError: { condition: "{ error.message.includes('Unauthorized) }", returnValue: "Not found" }
      throwError: { condition: "{ result === 'Not found }", errorToThrow: "{ new Error('404: Foo not found') }" }
    )
}
```
