import { gql } from 'apollo-server-core';
import { print } from 'graphql';
import { PolicyType, PolicyDefinition, Schema } from '../../../src/modules/resource-repository';

export const policies: PolicyDefinition[] = [
  {
    metadata: {
      name: 'alwaysDeny',
      namespace: 'auth_replace_error',
    },
    type: PolicyType.opa,
    code: `
      default allow = false
    `,
  },
];

export const schema: Schema = {
  metadata: {
    name: 'Schema',
    namespace: 'auth_directives_order',
  },
  schema: print(gql`
    type Query {
      are_foo: String!
        @localResolver(value: "FOO")
        @policy(namespace: "auth_replace_error", name: "alwaysDeny")
        @errorHandler(
          catchError: {
            condition: "{ error.name === 'UnauthorizedByPolicyError' }"
            returnValue: "__inner__throw_not_found___"
          }
          throwError: { condition: "{ result === '__inner__throw_not_found___' }", errorToThrow: "404: Not found" }
        )
      are_bar: Bar
        @localResolver(value: {})
        @policy(namespace: "auth_replace_error", name: "alwaysDeny")
        @errorHandler(
          catchError: {
            condition: "{ error.name === 'UnauthorizedByPolicyError' }"
            returnValue: "__inner__throw_not_found___"
          }
          throwError: { condition: "{ result === '__inner__throw_not_found___' }", errorToThrow: "404: Not found" }
        )
    }

    type Bar {
      baz: String! @localResolver(value: "BAZ")
    }
  `),
};
