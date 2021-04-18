import * as fs from 'fs/promises';
import * as nock from 'nock';
import { graphqlSync, print } from 'graphql';
import { gql, GraphQLRequest } from 'apollo-server-core';
import { FastifyInstance } from 'fastify';
import { makeExecutableSchema } from 'graphql-tools';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { createServer as createRegistry } from '../../../src/registry';
import { ResourceGroup, Schema, Upstream } from '../../../src/modules/resource-repository';
import { getInvalidToken } from '../../helpers/get-token';

describe('Upstream for gql introspection query', () => {
  const remoteServer = 'http://remote-server';
  const xApiClient = 'frontend-app';
  const jwtIssuer = 'https://oidc-provider';

  let app: FastifyInstance;

  let remoteServerScope: nock.Scope;

  let token: string;

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

    token = await getInvalidToken({ issuer: jwtIssuer });

    const remoteSchema = makeExecutableSchema({
      typeDefs: gql`
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'FOO',
        },
      },
    });

    remoteServerScope = nock(remoteServer)
      .post('/graphql')
      .matchHeader('x-jwt-issuer', jwtIssuer)
      .matchHeader('x-api-client', xApiClient)
      .reply(200, (_, body: any) =>
        graphqlSync({
          schema: remoteSchema,
          source: body.query,
          variableValues: body.variables,
          operationName: body.operationName,
        })
      );

    const upstream: Upstream = {
      metadata: {
        namespace: 'blackbox',
        name: 'upstream-gql-introspect',
      },
      sourceHosts: [new URL(remoteServer).host],
      headers: [
        {
          name: 'x-api-client',
          value: '{incomingRequest?.headers?.["x-api-client"]}',
        },
        {
          name: 'x-jwt-issuer',
          value: '{jwt?.payload?.iss}',
        },
      ],
    };

    const resources: ResourceGroup = {
      schemas: [],
      upstreams: [upstream],
      upstreamClientCredentials: [],
      policies: [],
      remoteSchemas: [],
    };

    await fs.writeFile(process.env.FS_REGISTRY_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));

    app = await createRegistry();
  });

  afterAll(async () => {
    await app.close();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
    nock.cleanAll();
  });

  test('should add headers from incoming request headers and jwt claims to outgoing request', async () => {
    const schema: Schema = {
      metadata: {
        namespace: 'blackbox',
        name: 'upstream-gql-introspect',
      },
      schema: print(gql`
        type Query {
          foo: String! @gql(url: "${remoteServer}/graphql", fieldName: "foo")
        }
      `),
    };

    const payload: GraphQLRequest = {
      query: print(gql`
        mutation UpdateSchemas($input: [SchemaInput!]!) {
          updateSchemas(input: $input) {
            success
          }
        }
      `),
      variables: {
        input: [schema],
      },
    };

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload,
      headers: {
        authorization: `Bearer ${token}`,
        ['x-api-client']: xApiClient,
      },
    });

    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();

    expect(remoteServerScope.isDone()).toBeTruthy();
  });
});
