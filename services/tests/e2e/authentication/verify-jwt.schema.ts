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
      jwt_foo: String @localResolver(value: "FOO")
    }
  `),
};

export const query = print(gql`
  query {
    jwt_foo
  }
`);
