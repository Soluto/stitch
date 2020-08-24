import { print } from 'graphql';
import { gql } from 'apollo-server-core';

export const schema1 = {
  metadata: {
    namespace: 'hello_world',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      m_foo: String! @stub(value: "BAR")
    }
  `),
};

export const schema2 = {
  metadata: {
    namespace: 'hello_world',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      m_foo: String! @stub(value: "BAZ")
    }
  `),
};
