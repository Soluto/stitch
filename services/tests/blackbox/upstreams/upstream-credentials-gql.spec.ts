import * as fs from 'fs/promises';
import * as nock from 'nock';
import { graphqlSync, print, printSchema } from 'graphql';
import { gql, GraphQLRequest } from 'apollo-server-core';
import { FastifyInstance } from 'fastify';
import { makeExecutableSchema } from '@graphql-tools/schema';
import GraphQLErrorSerializer from '../../utils/graphql-error-serializer';
import { createServer as createGateway } from '../../../src/gateway';
import { ResourceGroup, Schema, Upstream, UpstreamClientCredentials } from '../../../src/modules/resource-repository';
import { RemoteSchema } from '../../../src/modules/directives/gql';
import { AuthType } from '../../../src/modules/registry-schema';

describe('UpstreamCredentials for @gql directive', () => {
  const remoteServer = 'http://remote-server';
  const oidcProvider = 'http://oidc-provider';
  const tokenEndpointPath = '/oauth2/token';
  const access_token = `JWT for ${remoteServer}`;

  const clientId = 'stitch-client-id';
  const clientSecret = 'stitch-client-secret';

  let app: FastifyInstance;

  let remoteServerScope: nock.Scope;

  let oidcProviderDiscoveryScope: nock.Scope;
  let oidcProviderTokenScope: nock.Scope;

  beforeAll(async () => {
    expect.addSnapshotSerializer(GraphQLErrorSerializer);

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

    const basicAuthBase64 = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    oidcProviderDiscoveryScope = nock(oidcProvider)
      .get('/.well-known/oauth-authorization-server')
      .reply(200, { token_endpoint: `${oidcProvider}${tokenEndpointPath}` });

    oidcProviderTokenScope = nock(oidcProvider)
      .post(tokenEndpointPath)
      .matchHeader('authorization', `Basic ${basicAuthBase64}`)
      .reply(200, { access_token });

    remoteServerScope = nock(remoteServer)
      .post('/graphql')
      .matchHeader('authorization', `Bearer ${access_token}`)
      .reply(200, (_, body: any) =>
        graphqlSync({
          schema: remoteSchema,
          source: body.query,
          variableValues: body.variables,
          operationName: body.operationName,
        })
      );

    const schema: Schema = {
      metadata: {
        namespace: 'blackbox',
        name: 'upstream-credentials-gql',
      },
      schema: print(gql`
        type Query {
          foo: String! @gql(url: "${remoteServer}/graphql", fieldName: "foo")
        }
      `),
    };

    const upstream: Upstream = {
      metadata: {
        namespace: 'blackbox',
        name: 'upstream-credentials-gql',
      },
      sourceHosts: [new URL(remoteServer).host],
      auth: {
        type: AuthType.ActiveDirectory,
        activeDirectory: {
          authority: oidcProvider,
          resource: 'remote-graphql-service-scope',
        },
      },
    };

    const upstreamCredentials: UpstreamClientCredentials = {
      metadata: {
        namespace: 'blackbox',
        name: 'upstream-credentials-gql',
      },
      authType: AuthType.ActiveDirectory,
      activeDirectory: {
        authority: oidcProvider,
        clientId,
        clientSecret,
      },
    };

    const remoteSchemaResource: RemoteSchema = {
      url: `${remoteServer}/graphql`,
      schema: printSchema(remoteSchema),
    };

    const resources: ResourceGroup = {
      schemas: [schema],
      upstreams: [upstream],
      upstreamClientCredentials: [upstreamCredentials],
      policies: [],
      remoteSchemas: [remoteSchemaResource],
    };

    await fs.writeFile(process.env.FS_RESOURCE_REPOSITORY_PATH!, JSON.stringify(resources));

    app = await createGateway();
  });

  afterAll(async () => {
    await app.close();
    await fs.unlink(process.env.FS_RESOURCE_REPOSITORY_PATH!);
    nock.cleanAll();
  });

  test('should add headers from incoming request headers and jwt claims to outgoing request', async () => {
    const payload: GraphQLRequest = {
      query: print(gql`
        query {
          foo
        }
      `),
    };

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload,
    });

    expect(response.statusCode).toEqual(200);
    expect(response.json().data).toMatchSnapshot();

    expect(oidcProviderDiscoveryScope.isDone()).toBeTruthy();
    expect(oidcProviderTokenScope.isDone()).toBeTruthy();
    expect(remoteServerScope.isDone()).toBeTruthy();
  });
});
