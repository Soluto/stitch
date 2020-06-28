# Stitch Authorization (alpha)

## Goals

-   Create building blocks for authorization that can satisfy common scenarios.
-   It should be easy to build, validate and test authorization schemes.
-   It should be possible to create high level authorization schemes on top of these building blocks.

## Non-Goals

-   Specify mechanisms regarding authentication or jwt validation.
-   Create conventions or high-level abstractions for authorization. (although this document should show that such things can be implemented on top of this implementation)

## Policy Spec

Create a new object policy that describes an access logic that can be attached to a graphql field.
Some examples:

### Policy that always allows access:

```yaml
kind: Policy
metadata:
    namespace: some-ns
    name: public
Spec:
    type: js-expression
    code: {'result': 'allow'}
```

### Policy that allows access only if the issuer is "abc.com":

```yaml
kind: Policy
metadata:
  namespace: some-ns
  name: abc-user
Spec:
  type: js-expression
  code: { "result": (input.args.issuer === "abc.com") ? "allow" : "deny" }
  args:
    issuer: String!
```

The `args` are available to use on the input object.
`jwt` is available for parameter injection in args using `issuer: "{jwt.issuer}"`

### Policy that allows access only if the subject matches the provided userId argument:

```yaml
kind: Policy
metadata:
  namespace: some-ns
  name: my-user
Spec:
  type: js-expression
  code: { "result": (input.args.sub === input.args.userId) ? "allow" : "deny"}
  args:
    userId: ID!
    sub: ID!
```

_Note the js-expression type is an example of a possible type and not planned to be implemented at this time._

### Policy that uses a graphql query to fetch additional data and allows based on the results and an argument:

```yaml
kind: Policy
metadata:
    namespace: some-ns
    name: my-user-family
Spec:
    type: opa
    code: |
        allow = false
        allow = {
          input.args.userId == input.queries.familyQuery.family.members[_].id
        }
    args:
        userId: ID!
    queries:
        - type: graphql
          name: familyQuery
          graphql:
              query: |
                  {
                    user({jwt.sub}) {
                      family {
                        members {
                          id
                        }
                      }
                    }
                  }
```

Queries support the standard Stitch parameter injection syntax, but only support the `jwt` and `args` objects for injection

### Same as the previous policy, but evaluates the query while opa is running:

```yaml
kind: Policy
metadata:
    namespace: some-ns
    name: my-user-family
Spec:
    type: opa
    code: |
        query = sprintf(“graphql { user(%s) {family { members { id} } } }”, input.args.sub)
        allow = false
        allow = {
          input.args.userId == input.query.family.members[_].id
        }
    args:
        userId: ID!
        sub: ID!
```

This example will always evaluate the graphql query, but generally this approach should be used when conditional side effect evaluation is needed

### Policy that uses a policy query and allows based on the results:

```yaml
kind: Policy
metadata:
    namespace: some-ns
    name: my-user-by-policy
Spec:
    type: opa
    code: |
        allow = false
        allow = {
          input.queries.myUserPolicy == true
        }
    args:
        userId: ID!
    queries:
        - type: policy
          name: myUserPolicy
          policy:
              policyName: my-user
              args:
                  userId: '{args.userId}'
```

`args` for query policy can use parameter injection from the `jwt` and `args` objects, similarly to the graphql query

### Attach policy to fields:

```
type User {
  ID: ID!
  Picture: String @policy-some-ns-public
  Friends: [User] @policy-some-ns-abc-user
  Email: String @policy-some-ns-my-user(userId: "{source.UserId}", sub: "{jwt.sub}")
  NickName: @policy-some-ns-my-user-family(userId: "{source.UserId}")
}
```

## Code Generation

Adding args support to policies can ease memoization and remove hidden dependencies (Principle of Least Surprise) as we don’t need to pass the whole graphql context.

Initially, we will support a single `@policy` directive that gets an array of policy names and their args:

```
type User {
  Picture: String @policy(policies: [
    { namespace: "some-ns", name: “my-user”, args: { userId: “{source.UserId}” } },
    { namespace: "some-ns", name: “my-user-family”, args: { userId: “{source.UserId}” } }
  ])
}
```

Later on, for convenience and type safety, we will add an alternative syntax or syntactic sugar (removed in transform step) by generating each policy into a directive (which will look like the example in `Attach policy to fields`).

## Control Flow

1. Client requests a graphql query that includes a field that has a `@policy` directive.
2. Server activates the policy resolver and reads the arguments with parameter injection.
3. The resolver passes the args to a policy executor.
   The policy executor invokes the right binding (see policy implementation contract) and manages the queries for the policy.
4. The policy executor should return true/false if the user has access or a string describing the failure.
5. If the user has access, return the field value. Otherwise, return an error.

## Policy implementation contract

The naive js contract can be implemented with a generator, that has a result of true/false and can yield queries.
All queries and policy evaluation itself are memoized for a request context for same query/policy arguments.

```typescript
type Policy = Generator<PolicyQuery, PolicyResult, any>;
type FailureReason = string;
type PolicyResult = true | false | FailureReason;
type PolicyQuery = GraphQLQuery | PolicyEvaluationQuery;
type GraphQLQuery = {
    type: 'graphql';
    query: string;
};

type PolicyEvaluationQuery = {
    type: 'policy';
    policy: string;
    args: any[];
};
```

### Supported Queries

-   GraphQL - run an internal graphql query in an unconstrained context
-   Policy Evaluation - run an additional policy

## OPA Policy

Opa policy can be implemented by exporting several documents in rego file:

-   policies - for additional policies we want to evaluate (an object `{ [policyName]: args }`)
-   query - for a graphql query we want to evaluate (string)
-   allow - return the end result (boolean)

Since our implementation of stitch is based on Apollo and node.js runtime, we’ll need to run opa either by compiling opa-policies to wasm and using @open-policy-agent/opa-wasm package, or use additional process. Compilation should run by the registry using opa cli (opa build).

A naive opa-binding implementation:

```javascript
async function createOpaBinding(policy_data) {
    const rego = new Rego();
    const policy = await rego.load_policy(policy_data);
    return function* opaBinding(jwt: any, args: any) {
        let {policies, query} = policy.evaluate({jwt, args});
        let data: any = {};
        if (policies) {
            let arr = Object.entries(policies);
            let results = [
                ...(yield* arr.map(([name, args]) => ({
                    type: 'policy-evaluation',
                    policy: name,
                    args: args,
                }))),
            ];
            data.policies = Object.fromEntries(arr.map(([name, _], i) => [name, i]));
        }
        if (query) {
            data.query = yield {
                type: 'graphql',
                query: data.query,
            };
        }
        policy.set_data(data);
        let {allow, reason} = policy.evaluate({jwt, args});
        return allow || reason || false;
    };
}
```

It can be possible to requery policies and query until they return null/empty, but it might make it more difficult and prone to errors.
Alternatively, we can check if the query/policies have changed between executions.

## Examples

### "Generic" Policies

```yaml
kind: Policy
metadata:
    namespace: some-ns
    name: has-claims
Spec:
    type: opa
    code: |
        allow = false
        allow {
          input.args.jwtClaims[input.args.claims[i]] == input.args.values[i]
        }
    args:
        claims: [String]
        values: [String]
        jwtClaims: JSONObject
```

Usage:

```
type User {
  ID: ID!
  Picture: String @policy-some-ns-has-claims(claims:["issuer", "sub"], values: ["soluto.com", "{source.UserId}"], jwtClaims: "{jwt.claims}")
}
```
