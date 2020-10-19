import { print } from 'graphql';
import { gql } from 'apollo-server-core';

export const schema1 = {
  metadata: {
    namespace: 'hello_world',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      m_foo: MetricsFoo! @localResolver(value: { bar: "BAR", baz: "BAZ" })
    }

    type MetricsFoo {
      bar: String!
      baz: String! @localResolver(value: "{source.baz.toLowerCase()}")
      # TODO: Fix registry to accept Apollo Federation directives
      # taz: String! @requires(fields: "baz")
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
      m_foo: MetricsFoo! @localResolver(value: { bar: "BAR_NEW", baz: "BAZ_NEW" })
    }

    type MetricsFoo {
      bar: String!
      baz: String! @localResolver(value: "{source.baz.toLowerCase()}")
      # TODO: Fix registry to accept Apollo Federation directives
      # taz: String! @requires(fields: "baz")
    }
  `),
};
