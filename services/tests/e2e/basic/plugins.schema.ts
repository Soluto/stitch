import { print } from 'graphql';
import { gql } from 'apollo-server-core';

export const schema = {
  metadata: {
    namespace: 'plugins',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      pl_foo: String!
        @localResolver(value: "{globals.someUtilFn('FOO')}")
        @policy(namespace: "plugins", name: "rg-update-policy")
      pl_bar: String!
        @localResolver(value: "{globals.someUtilFn('BAR')}")
        @policy(namespace: "plugins", name: "whole-rg-policy")
    }
  `),
};
