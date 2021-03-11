import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { Schema } from '../../../src/modules/resource-repository/types';

export const schema: Schema = {
  metadata: {
    namespace: 'verify_jwt',
    name: 'Schema',
  },
  schema: print(gql`
    type Query {
      jwt_foo(foo: String!): String! @localResolver(value: "{args.foo}")
    }
  `),
};

export const query = print(gql`
  query($foo: String!) {
    jwt_foo(foo: $foo)
  }
`);

export const variables = { foo: 'FOO' };
