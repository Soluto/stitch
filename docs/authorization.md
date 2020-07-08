# Authorization

Stitch provides the ability to manage access to data using authorization policies. These policies are attached to schema fields that require authorized access.

## Policy definition

Policy is Stitch a resource like schema. It can be created, altered or removed by using the Registry API.

The policy object has the following properties:

| property | description                                                                                                                                                                                                                 | mandatory |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| metadata | Contains two fields name and namespace.</br> Namespace is a logical group of policies.</br> Namespace and name pair is the policy's unique identifier                                                                       | true      |
| type     | Policy type.</br> Currently only [OPA](https://www.openpolicyagent.org) policies are supported                                                                                                                              | true      |
| code     | Policy body, with syntax based on the chosen Policy type.</br>For OPA, [Rego](https://www.openpolicyagent.org/docs/latest/policy-language) language is supported.</br>                                                      | true      |
| args     | Argument definitions.</br> These arguments are available in the policy code and query.</br> They support the Stitch [Parameter Injection](https://github.com/Soluto/stitch/blob/master/docs/arguments_injection.md) syntax. | false     |
| query    | Graphql query to provide additional data to policy.</br> The results are available in the policy code.                                                                                                                      | false     |

### Examples

#### Example 1: Simple policy with argument

```yaml
metadata:
  namespace: billing
  name: adminOnly
type: opa
code: |
  default allow = false
  allow {
    input.args.userRoles[_] == "admin"
  }
args:
  userRoles: [String]
```

Explanation:

- **_metadata_**: The policy name and namespace.

- **_type_**: Policy type

- **_code_**: The [Rego](https://www.openpolicyagent.org/docs/latest/policy-language) language code block. The `input` variable has 2 optional fields.

  - `args`: derived from `@policy` directive arguments evaluation.
  - `query`: the result of `query` policy property execution. The query is executed on the Stitch schema without effect of authorization policies (a.k.a. admin privileges). See examples below.

- **_args_**: Arguments mapping. The key is argument name. The value is argument Graphql type. In this example the `userRole` argument can get value of `roles` claim from request JWT. (See `@policy` directive definition below).

---

#### Example 2: Policy with query

```yaml
metadata:
  namespace: admin_ns
  name: adminOnly
type: opa
code: |
  default allow = false
  allow {
    input.query.user.roles[_] == "admin"
  }
args:
  userId: ID
query:
  gql: |
    query($id: ID!) {
      user(id: $id) {
        roles
      }
    }
  variables:
    id: '{args.userId}'
```

- **_query_**: Graphql query definition. It has 2 properties:

  - `gql`: the [query](https://graphql.org/learn/queries) itself.
  - `variables`: [variables](https://graphql.org/learn/queries/#variables) that are injected to the Graphql request. The values of variables can be either hardcoded or derived from `args`. In the last case the syntax is `"{args.userId}"` (See example above)

---

#### Example 3: Policy that depends on another policy

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

In the example below the query has 2 parts: the first one fetches `roles` field from `user` and the second part evaluates `userIsActive`.

```yaml
metadata:
  namespace: admin_ns
  name: adminOnly
type: opa
code: |
  default allow = false
  allow {
    input.query.user.roles[_] == "admin"
    input.query.policy.another_ns___userIsActive.allow
  }
args:
  userId: ID
query:
  gql: |
    query($id: ID!) {
      user(id: $id) {
        roles
      },
      policy {
        another_ns___userIsActive(userId: $id) {
          allow
        }
      }
    }
  variables:
    id: '{args.userId}'
```

---

## Policy directive

The policies are set using graphql directives. In order to attach policy to field the `@policy` directive should be set on the field.
So if in type `User` there is field `phone` that should be accessible for user with admin role only the type definition should be as following:

```graphql
type User {
  id: ID!
  name: String!
  phone: String @policy(namespace: "billing", name: "adminOnly", args: { userRoles: "{jwt.roles}" })
}
```

The policy is defined as in example 1 (See above).

In the example above, the `roles` argument value is received by using the Argument Injection mechanism. In this example, it is received from the `roles` claim in the request's JWT.

> Note: See [Arguments Injection](./arguments_injection.md) for more information about configuration of policy arguments.

## Directives order

**_Important!_** The [order of directives](https://github.com/graphql/graphql-spec/blob/master/spec/Section%202%20--%20Language.md#directives) does matter! In the most cases the `@policy` directive should be **the last** directive attached to the field definition.
