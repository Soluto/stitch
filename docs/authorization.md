# Authorization

Stitch provides ability manage access to data using authorization policies. These policies are attached to schema fields that require authorized access.

## Policy definition

Policy is Stitch resource like schema. It can be created, altered or removed using Registry API.

The policy object has the following properties:

| property | description                                                                                                                                     | mandatory |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| metadata | Contains two fields name and namespace.</br> Namespace is a logical group of policies.</br> Namespace and name pair is policy unique identifier | true      |
| type     | Policy type.</br> Currently only [OPA](https://www.openpolicyagent.org) policies are supported                                                  | true      |
| code     | Policy body.</br>Currently only [Rego](https://www.openpolicyagent.org/docs/latest/policy-language) language is supported.</br>                 | true      |
| args     | Argument definitions.</br> These arguments is available in the policy body.                                                                     | false     |
| query    | Graphql query to provide additional data to policy.</br> Its result is available in the policy body.                                            | false     |

Example of policy definition:

```yaml
metadata:
  namespace: my_namespace
  name: policy1
type: opa
code: |
  default allow = false
  allow {
    input.query.policy.my_namespace___policy2.allow
    input.query.someQuery.someData = input.args.someArg
  }
args:
  argForQuery: '{source.someField[jwt.someClaim]}'
  argForAnotherPolicy: '{args.someArgFromAttachedField}'
  someArg: '{exports.someExportedKey}'
query:
  gql: |
    query($varForAnotherPolicy: String!, $varForQuery: String) {
      someQuery(arg1: $varForQuery) {
        someData
      },
      policy {
        my_namespace___policy2(arg2: $varForAnotherPolicy) {
          allow
        }
      }
    }
  variables:
    varForQuery: '{args.argForQuery}'
    varForAnotherPolicy: '{args.argForAnotherPolicy}'
```

Explanation:

- **_metadata_**: The policy name and namespace.

- **_type_**: Policy type

- **_code_**: The [Rego](https://www.openpolicyagent.org/docs/latest/policy-language) language code block. The `input` variable has 2 optional fields.

  - `args`: derived from `@policy` directive arguments evaluation.
  - `query`: the result of `query` policy property execution. The query is executed on the Stitch schema without effect of authorization policies (a.k.a. admin privileges).

- **_args_**: Arguments mapping. The key is argument name. The value is argument Graphql type.

- **_query_**: Graphql query definition. It has 2 properties:

  - `gql`: the [query](https://graphql.org/learn/queries) itself.
  - `variables`: [variables](https://graphql.org/learn/queries/#variables) that are injected to the Graphql request. The values of variables can be either hardcoded or derived from `args`. In the last case the syntax is `"{args.someArg}"` (See example above)

  Each policy is also available for evaluation as graphql query. It can be tested while debugging.
  If one policy is dependent on another the `query` property can include the following fragment:

  ```graphql
  {
    policy.another_policy_namespace___another_policy_name(<another_policy_args>) {
      allow # As mentioned above the policy result is always object with the single boolean field "allow"
    }
  }
  ```

  The policy arguments should be set as the query arguments.

  In the example above the query has 2 parts: the first one fetches `someData` field from `someQuery` and the second part evaluates `policy2`.

## Policy directive

The policies are set using graphql directives. In order to attach policy to field the `@policy` directive should be set on the field.
So if in type `User` there is field `phone` that should be accessible for user with admin role only the type definition should be as following:

```graphql
type User {
  id: ID!
  name: String!
  phone: String @policy(namespace: "admin_ns", name: "admin_only", args: { roles: "{jwt.roles}" })
}
```

And the policy is defined as following:

```yaml
metadata:
  namespace: admin_ns
  name: admin_only
type: opa
code: |
  default allow = false
  allow {
    input.args.roles[_] == "admin"
  }
args:
  roles: [String!]
```

In the example above the `roles` argument value is received using Argument Injection mechanism. In this case it is got from `roles` claim from request JWT.

> Note: See [Arguments Injection](./arguments_injection.md) for more information about configuration of policy arguments.

## Limitations

Currently only the access to Query type and it subtypes can be restricted by policies.
