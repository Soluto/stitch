import { print } from 'graphql';
import { gql } from 'apollo-server-core';
import { Schema } from '../../../src/modules/resource-repository';

export const schema: Schema = {
  metadata: {
    namespace: 'plugins',
    name: 'name',
  },
  schema: print(gql`
    type Query {
      pl_foo: String!
        @localResolver(value: "{globals.someUtilFn('FOO')}")
        @policy(namespace: "plugins", name: "whole-rg-policy")
      pl_bar: String!
        @localResolver(value: "{globals.inspect('BAR')}")
        @policy(namespace: "plugins", name: "whole-rg-policy")
      pl_tar: String!
        @localResolver(value: "{globals.format('TAR')}")
        @policy(namespace: "plugins", name: "whole-rg-policy")
      pl_new_foo: Point! @localResolver(value: { x: 1, y: 2 })
      pl_new_bar: String! @localResolver(value: "NEW BAR") @reverse
      pl_new_data: String! @localResolver(value: "{plugins.foo}")
    }
  `),
};

export const schemaCrashesPlugin: Schema = {
  metadata: {
    namespace: 'plugins',
    name: 'crash-plugin',
  },
  schema: print(gql`
    type Query {
      pl_crashing: String!
    }
  `),
};
