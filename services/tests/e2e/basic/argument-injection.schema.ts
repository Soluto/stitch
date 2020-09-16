import { print } from 'graphql';
import { gql } from 'apollo-server-core';

export const schema = {
  metadata: {
    namespace: 'hello_world',
    name: 'argument_injection',
  },
  schema: print(gql`
    type Query {
      ai_foo(bar: String!): String! @stub(value: "{builtIns.toUpper(args.bar)}")
    }
  `),
};
