import { concatAST } from 'graphql';
import { gql, ApolloServerBase } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { policiesSdl } from '../directives/policy';
import { sdl, resolvers } from './scalars';

const testCases: [string, unknown][] = [
  ['JSON', ['bar', 'baz']],
  ['JSONObject', { bar: 1, baz: true }],
  ['Date', new Date(Date.UTC(2020, 11, 24))],
  ['Time', new Date(Date.UTC(2017, 0, 10, 14, 30))],
  ['DateTime', new Date(Date.UTC(2017, 0, 10, 21, 33, 15, 233))],
  ['PhoneNumber', '+12225555'],
  ['EmailAddress', 'stitch@email.com'],
  ['PolicyDetails', { namespace: 'ns', name: 'my-policy', args: { foo: '{source.foo}' } }],
];

const createTestSchema = (scalar: string) => gql`
    type Query {
      foo: ${scalar}!
    }
  `;

const createTestResolver = <T>(data: T) => ({
  Query: {
    foo: () => data,
  },
});

const query = gql`
  query {
    foo
  }
`;

describe('Scalars', () => {
  let server: ApolloServerBase;

  test.each(testCases)('%s is declared', async (scalarName, scalarValue) => {
    server = new ApolloServer({
      typeDefs: concatAST([createTestSchema(scalarName), sdl, policiesSdl]),
      resolvers: [createTestResolver(scalarValue), resolvers],
    });
    const { data, errors } = await server.executeOperation({ query });
    expect({ data, errors }).toMatchSnapshot();
  });
});
