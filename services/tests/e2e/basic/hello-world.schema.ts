import { print } from 'graphql';
import { gql } from 'apollo-server-core';

export const schema1 = {
  metadata: {
    namespace: 'hello_world',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      foo: String! @localResolver(value: "BAR")
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
      foo: String! @localResolver(value: "BAZ")
    }
  `),
};

export const schema3 = {
  metadata: {
    namespace: 'hello_world',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      foo: String! @localResolver(value: "TAZ")
    }
  `),
};

export const invalidSchema = {
  metadata: {
    namespace: 'hello_world',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      foo: HLFoo!
    }
  `),
};
